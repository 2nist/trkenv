import React from "react";
import useSWR from "swr";
import { useRouter } from "next/router";
import { xOf, timeAt } from "../lib/timelineMath";
import { registerMp3Encoder } from '@mediabunny/mp3-encoder';

const API = process.env.NEXT_PUBLIC_API_BASE
  || (typeof window !== 'undefined' ? `http://${window.location.hostname}:8010` : "http://127.0.0.1:8010");
const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Beat = { t: number; bar: number; beat: number };
type Beatgrid = { beats: Beat[]; beats_per_bar?: number };
type Section = { name: string; start_s: number; end_s: number };
type SectionsIdx = { sections: Section[] };
type Chord = { t: number; symbol: string };
type ChordsIdx = { chords: Chord[] };

type Indices = { beatgrid: Beatgrid; sections: SectionsIdx; chords: ChordsIdx };
type Context = { tempo_bpm: number; time_signature: string; duration_s: number };
type LyricLine = { t: number; text: string };

export default function TimelineCPSPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const routeId = typeof router?.query?.id === 'string' ? router.query.id : undefined;
  const songId = params?.id || routeId;
  const { data: ctx, mutate: mutateCtx } = useSWR<Context>(songId ? `${API}/api/songs/${songId}/context` : null, fetcher);
  const { data: idx, mutate: mutateIdx } = useSWR<Indices>(songId ? `${API}/api/songs/${songId}/indices` : null, fetcher);
  // Fallback: use legacy v1 doc to derive basic data when indices/context are unavailable
  const { data: doc, mutate: mutateDoc } = useSWR<any>(songId ? `${API}/v1/songs/${songId}/doc` : null, fetcher);
  const { data: lyricLines, mutate: mutateLines } = useSWR<any>(songId ? `${API}/api/lyrics/lines?songId=${songId}` : null, fetcher);

  const [nowS, setNowS] = React.useState(0);
  const [pxPerS, setPxPerS] = React.useState(120); // 120 px per second default
  const [playing, setPlaying] = React.useState(false);
  const [viewportW, setViewportW] = React.useState(1024);
  const [isRecording, setIsRecording] = React.useState(false);
  const [mediaRecorder, setMediaRecorder] = React.useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = React.useState<Blob[]>([]);

  // Measure viewport width
  React.useEffect(() => {
    const onResize = () => setViewportW(window.innerWidth);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Transport
  React.useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = () => {
      const t = performance.now();
      const dt = (t - last) / 1000;
      setNowS(nowS => nowS + dt);
      last = t;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  // Register MP3 encoder
  React.useEffect(() => {
    registerMp3Encoder();
  }, []);

  // Seek on click
  const onTimelineClick = React.useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const t = timeAt(clientX, nowS, pxPerS, viewportW);
    setNowS(Math.max(0, t));
  }, [nowS, pxPerS, viewportW]);

  // Recording functions
  const startRecording = React.useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Check for supported mime types, preferring MP3
      let mimeType = 'audio/mpeg';
      let contentType = 'audio/mpeg';
      let fileExtension = 'mp3';

      if (!MediaRecorder.isTypeSupported(mimeType)) {
        // Fallback to WebM if MP3 not supported
        mimeType = 'audio/webm';
        contentType = 'audio/webm';
        fileExtension = 'webm';
        console.log('MP3 not supported, falling back to WebM');
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: contentType });
        // POST to streaming endpoint
        await streamToSong(audioBlob, fileExtension);
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };
      recorder.start();
      setMediaRecorder(recorder);
      setRecordedChunks(chunks);
      setIsRecording(true);
    } catch (e) {
      console.error('Recording failed:', e);
    }
  }, []);

  const stopRecording = React.useCallback(() => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  }, [mediaRecorder]);



  const streamToSong = async (audioBlob: Blob, fileExtension: string = 'mp3') => {
    const formData = new FormData();
    formData.append('file', audioBlob, `recording.${fileExtension}`);
    try {
      const r = await fetch(`${API}/recordings/upload`, {
        method: 'POST',
        body: formData
      });
      if (r.ok) {
        const { jobId } = await r.json();
        
        // Poll for job completion
        const pollJob = async (): Promise<string> => {
          const statusRes = await fetch(`${API}/jobs/${jobId}`);
          if (!statusRes.ok) {
            throw new Error(`Job status check failed: ${statusRes.status}`);
          }
          const status = await statusRes.json();
          if (status.status === "done") {
            return status.draftId;
          } else if (status.status === "error") {
            throw new Error("Recording processing failed");
          } else {
            // Still running, wait and retry
            await new Promise(resolve => setTimeout(resolve, 1000));
            return pollJob();
          }
        };

        const draftId = await pollJob();
        // Create song from draft
        const songRes = await fetch(`${API}/songs/from-draft`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ draftId }),
        });
        if (songRes.ok) {
          const { id } = await songRes.json();
          alert(`Song created: ${id}`);
        } else {
          alert(`Song creation failed: ${songRes.status}`);
        }
      } else {
        alert(`Upload failed: ${r.status}`);
      }
    } catch (e) {
      alert(`Error: ${e}`);
    }
  };

  // Resolve lyrics
  const resolveLyrics = React.useCallback(async () => {
    if (!songId) return;
    try {
      await fetch(`${API}/api/lyrics/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId }),
      });
      mutateLines();
    } catch (e) {
      console.error('Failed to resolve lyrics:', e);
    }
  }, [songId, mutateLines]);

  // Reindex
  const reindex = React.useCallback(async () => {
    if (!songId) return;
    try {
      await fetch(`${API}/api/songs/${songId}/indices`, { method: 'POST' });
      mutateIdx();
      mutateCtx();
    } catch (e) {
      console.error('Failed to reindex:', e);
    }
  }, [songId, mutateIdx, mutateCtx]);

  // Derive data with fallbacks
  const beatgrid = idx?.beatgrid || (doc?.beats ? { beats: doc.beats.map((b: any) => ({ t: b.t, bar: b.bar, beat: b.beat })) } : { beats: [] });
  const sections = idx?.sections?.sections || (doc?.sections ? doc.sections.map((s: any) => ({ name: s.name, start_s: s.start_s, end_s: s.end_s })) : []);
  const chords = idx?.chords?.chords || (doc?.chords ? doc.chords.map((c: any) => ({ t: c.t, symbol: c.symbol })) : []);
  const tempo = ctx?.tempo_bpm || doc?.tempo_bpm || 120;
  const timeSig = ctx?.time_signature || doc?.time_signature || '4/4';
  const duration = ctx?.duration_s || (beatgrid.beats.length > 0 ? beatgrid.beats[beatgrid.beats.length - 1].t : 0);

  // Cull for performance
  const beats = React.useMemo(() => {
    const cullDist = 200 / pxPerS; // 200px worth
    return beatgrid.beats.filter(b => Math.abs(b.t - nowS) < cullDist);
  }, [beatgrid.beats, nowS, pxPerS]);

  const culledChords = React.useMemo(() => {
    const cullDist = 300 / pxPerS;
    return chords.filter(c => Math.abs(c.t - nowS) < cullDist);
  }, [chords, nowS, pxPerS]);

  const lyrics = React.useMemo(() => {
    if (!lyricLines) return [];
    const cullDist = 300 / pxPerS;
    return lyricLines.filter((ln: LyricLine) => Math.abs(ln.t - nowS) < cullDist);
  }, [lyricLines, nowS, pxPerS]);

  return (
    <div className="flex flex-col h-screen bg-[color:var(--color-bg-primary,#dcc299)] text-[color:var(--color-text-primary,#0b0b0b)]">
      {/* Header: transport controls */}
      <div className="flex items-center justify-between px-4 h-12 border-b border-[color:var(--border,#2a2d33)] bg-[color:var(--color-bg-secondary,#f5f5dc)]">
        <div className="text-sm font-medium">CPS Timeline - {tempo} BPM {timeSig} - {duration.toFixed(1)}s</div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 rounded border" onClick={() => setPlaying(!playing)}>
            {playing ? 'Pause' : 'Play'}
          </button>
          <button className="px-3 py-1 rounded border" onClick={() => setNowS(0)}>Rewind</button>
          <button
            className={`px-3 py-1 rounded border ${isRecording ? 'bg-red-500 text-white' : ''}`}
            onClick={isRecording ? stopRecording : startRecording}
          >
            {isRecording ? 'Stop Recording' : 'Record Audio'}
          </button>
          <div className="flex items-center gap-1">
            <span className="text-xs">Zoom:</span>
            <button className="px-2 py-1 rounded border text-xs" onClick={() => setPxPerS(Math.max(30, pxPerS / 2))}>-</button>
            <span className="text-xs w-12 text-center">{pxPerS}px/s</span>
            <button className="px-2 py-1 rounded border text-xs" onClick={() => setPxPerS(Math.min(480, pxPerS * 2))}>+</button>
          </div>
        </div>
      </div>

      {/* Timeline viewport */}
      <div className="flex-1 relative overflow-hidden cursor-crosshair" onClick={onTimelineClick}>
        {/* BeatGrid Rail (top) */}
        <div className="absolute inset-x-0 top-0 h-12 bg-[color:var(--color-bg-primary,#dcc299)]/80 border-b border-[color:var(--border,#2a2d33)]">
          {beats.map((b, i) => {
            const x = xOf(b.t, nowS, pxPerS, viewportW);
            if (x < -100 || x > viewportW + 100) return null;
            const isBar = b.beat === 0;
            return (
              <div key={i} className="absolute top-0 bottom-0" style={{ left: x }}>
                <div className={`absolute bottom-0 w-px ${isBar ? 'h-5 bg-black/60' : 'h-3 bg-neutral-500/35'}`} />
                {isBar && (
                  <div className="absolute top-0 text-[10px] opacity-70 transform -translate-x-1/2">|{b.bar}</div>
                )}
              </div>
            );
          })}
          {/* Center playhead */}
          <div className="absolute top-0 bottom-0" style={{ left: viewportW / 2 }}>
            <div className="w-[2px] h-full bg-red-600 opacity-70 transform translate-x-[-1px]" />
          </div>
        </div>

        {/* Rails container */}
        <div className="relative h-[300px]">
          {/* Sections Rail */}
          <div className="absolute inset-x-0 top-0 h-16 border-b border-[color:var(--border,#2a2d33)] bg-[color:var(--surface,#0f1216)]/60">
            {sections.map((s, i) => {
              const x1 = xOf(s.start_s, nowS, pxPerS, viewportW);
              const x2 = xOf(s.end_s ?? s.start_s, nowS, pxPerS, viewportW);
              const left = Math.min(x1, x2);
              const width = Math.max(2, Math.abs(x2 - x1));
              if (left + width < -100 || left > viewportW + 100) return null;
              return (
                <div key={i} className="absolute top-2 bottom-2 rounded bg-amber-200/25 border border-amber-800/25" style={{ left, width }}>
                  <div className="absolute inset-x-0 top-1 text-[11px] text-center font-medium opacity-80 pointer-events-none">{s.name}</div>
                </div>
              );
            })}
          </div>

          {/* Chords Rail */}
          <div className="absolute inset-x-0 top-16 h-20 border-b border-[color:var(--border,#2a2d33)] bg-[color:var(--surface,#0f1216)]/50">
            {culledChords.map((c, i) => {
              const x = xOf(c.t, nowS, pxPerS, viewportW);
              if (x < -100 || x > viewportW + 100) return null;
              return (
                <div key={i} className="absolute top-2 px-1 py-0.5 text-xs rounded border bg-[color:var(--surface,#f5f5f5)]/80 text-[color:var(--text,#0b0b0b)] transform -translate-x-1/2" style={{ left: x }}>
                  {c.symbol || "?"}
                </div>
              );
            })}
          </div>

          {/* Lyrics Rail */}
          <div className="absolute inset-x-0 top-36 h-20 border-b border-[color:var(--border,#2a2d33)] bg-[color:var(--color-bg-secondary,#f5f5dc)]/60">
            {lyrics.map((ln, i) => {
              const x = xOf(ln.t, nowS, pxPerS, viewportW);
              if (x < -100 || x > viewportW + 100) return null;
              return (
                <div key={i} className="absolute top-3 px-1 py-0.5 text-xs rounded border bg-[color:var(--color-bg-secondary,#f5f5dc)] text-[color:var(--color-text-primary,#0b0b0b)] shadow-sm transform -translate-x-1/2" style={{ left: x }}>
                  {ln.text}
                </div>
              );
            })}
          </div>

          {/* BeatGrid Rail (faded duplicate for context) */}
          <div className="absolute inset-x-0 top-56 bottom-0 bg-[color:var(--color-bg-primary,#dcc299)]/30">
            {beats.map((b, i) => {
              const x = xOf(b.t, nowS, pxPerS, viewportW);
              if (x < -100 || x > viewportW + 100) return null;
              const isBar = b.beat === 0;
              return (
                <div key={`g${i}`} className="absolute top-0 bottom-0" style={{ left: x }}>
                  <div className={`absolute top-0 w-px h-full ${isBar ? 'bg-black/25' : 'bg-neutral-400/20'}`} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer: navigation + actions */}
        <div className="flex items-center justify-between px-4 h-10 border-t border-[color:var(--border,#2a2d33)] bg-[color:var(--color-bg-secondary,#f5f5dc)]">
          <div className="text-xs">Song: {doc?.title || songId}</div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 rounded border" onClick={() => router.push('/songs')}>Back to Songs</button>
            <button className="px-3 py-1 rounded border" onClick={resolveLyrics}>Resolve Lyrics</button>
            <button className="px-3 py-1 rounded border" onClick={reindex}>Reindex</button>
          </div>
        </div>
      </div>
    </div>
  );
}