'use client'

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { registerMp3Encoder } from '@mediabunny/mp3-encoder';

const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export default function RecordPage() {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string | undefined>(undefined);
  const [recording, setRecording] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [audioConstraints, setAudioConstraints] = useState({
    sampleRate: 44100,
    channelCount: 2,
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
    latency: 0.01
  });
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((list) => {
      setDevices(list.filter((d) => d.kind === "audioinput"));
    });
  }, []);

  useEffect(() => {
    // Register MP3 encoder for MediaRecorder
    registerMp3Encoder();
  }, []);

  const refreshDevices = async () => {
    try {
      // Request permission to access devices
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const list = await navigator.mediaDevices.enumerateDevices();
      setDevices(list.filter((d) => d.kind === "audioinput"));
    } catch (error) {
      console.error('Error refreshing devices:', error);
    }
  };

  useEffect(() => {
    refreshDevices();
  }, []);

  async function start() {
    // Build audio constraints for professional audio interface
    const constraints: MediaStreamConstraints = {
      audio: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        sampleRate: audioConstraints.sampleRate,
        channelCount: audioConstraints.channelCount,
        echoCancellation: audioConstraints.echoCancellation,
        noiseSuppression: audioConstraints.noiseSuppression,
        autoGainControl: audioConstraints.autoGainControl,
        sampleSize: 16
      }
    };

    console.log('Using audio constraints:', constraints);
    const stream = await navigator.mediaDevices.getUserMedia(constraints);

    // Check for supported mime types, preferring MP3
    let mimeType = "audio/mpeg";
    let fileExtension = "mp3";
    let contentType = "audio/mpeg";

    if (!MediaRecorder.isTypeSupported(mimeType)) {
      // Fallback to WebM if MP3 not supported
      mimeType = "audio/webm";
      fileExtension = "webm";
      contentType = "audio/webm";
      console.log("MP3 not supported, falling back to WebM");
    }

    const mr = new MediaRecorder(stream, { mimeType });
    mr.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    mr.onstop = () => onStop(contentType, fileExtension); // finalize
    mediaRecorderRef.current = mr;
    chunksRef.current = [];
    mr.start();
    setRecording(true);

    // setup analyser for waveform
    audioCtxRef.current = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    analyserRef.current = audioCtxRef.current.createAnalyser();
    analyserRef.current.fftSize = 2048;
    sourceRef.current = audioCtxRef.current.createMediaStreamSource(stream);
    sourceRef.current.connect(analyserRef.current);
    draw();
  }

  function stop() {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    setRecording(false);
  }

  function draw() {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext("2d")!;
    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);
    const render = () => {
      if (!analyser) return;
      analyser.getByteTimeDomainData(dataArray);
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#6ee7b7";
      ctx.beginPath();
      const sliceWidth = (canvas.width * 1.0) / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
      requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
  }

  async function onStop(contentType: string, fileExtension: string) {
    console.log('onStop called, chunks:', chunksRef.current.length);
    if (chunksRef.current.length === 0) {
      alert('No audio data recorded');
      return;
    }
    
    const blob = new Blob(chunksRef.current, { type: contentType });
    console.log('Blob created, size:', blob.size, 'type:', blob.type);
    
    const form = new FormData();
    form.append("file", blob, `recording.${fileExtension}`);
    
    try {
      console.log('Making request to:', `${apiBase}/recordings/upload`);
      const res = await fetch(`${apiBase}/recordings/upload`, {
        method: "POST",
        body: form,
      });
      
      console.log('Upload response status:', res.status);
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Upload failed:', errorText);
        alert(`Upload failed: ${res.status} - ${errorText}`);
        return;
      }
      
      const data = await res.json();
      console.log('Upload response:', data);
      const { jobId } = data;
      
      if (!jobId) {
        alert('No jobId received from upload');
        return;
      }

      // Poll for job completion
      const pollJob = async (): Promise<string> => {
        console.log('Polling job:', jobId);
        const statusRes = await fetch(`${apiBase}/jobs/${jobId}`);
        if (!statusRes.ok) {
          throw new Error(`Job status check failed: ${statusRes.status}`);
        }
        const status = await statusRes.json();
        console.log('Job status:', status);
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
      console.log('Draft created:', draftId);
      
      // Create song from draft
      const songRes = await fetch(`${apiBase}/songs/from-draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId }),
      });
      
      console.log('Song creation response status:', songRes.status);
      if (!songRes.ok) {
        const errorText = await songRes.text();
        console.error('Song creation failed:', errorText);
        alert(`Song creation failed: ${songRes.status} - ${errorText}`);
        return;
      }
      
      const songData = await songRes.json();
      console.log('Song created:', songData);
      const { id } = songData;
      
      // Redirect to the created song
      window.location.href = `/songs/${id}`;
    } catch (error) {
      console.error('Processing failed:', error);
      alert(`Processing failed: ${error}`);
    }
  }

  return (
    <main className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <span className="font-dymo bg-[#1a1a1a] text-[#efe3cc] rounded-[6px] px-2 py-0.5">[rec]</span>
        <h1 className="font-typewriter text-black font-bold">Record</h1>
      </div>

      <div className="bg-[#efe3cc] border border-black/15 rounded-[6px] p-3 shadow-[0_1px_0_rgba(0,0,0,.25)] mb-4">
        <div className="flex items-center gap-3">
          {recording && (
            <span className="font-dymo bg-[#D64541] text-white rounded-[6px] px-2 py-0.5 animate-pulse">[rec]</span>
          )}
          <label className="text-sm">
            Input:
            <select
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              className="bg-[#f6ead2] border border-black/20 rounded-sm px-2 py-1 text-sm ml-2"
            >
              <option value="">Default</option>
              {devices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || d.deviceId}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={refreshDevices}
            className="bg-[#2a2a2a] text-[#efe3cc] rounded-[4px] px-2 py-1 text-xs hover:bg-[#3a3a3a]"
            title="Refresh audio devices"
          >
            ↻
          </button>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="bg-[#2a2a2a] text-[#efe3cc] rounded-[4px] px-2 py-1 text-xs hover:bg-[#3a3a3a]"
          >
            {showAdvanced ? 'Hide' : 'Show'} Advanced
          </button>
          {!recording ? (
            <button
              onClick={start}
              className="ml-auto bg-[#1a1a1a] text-[#efe3cc] rounded-[6px] px-3 py-1 uppercase tracking-wide hover:bg-[#2a2a2a]"
            >
              [arm]
            </button>
          ) : (
            <button
              onClick={stop}
              className="ml-auto bg-[#1a1a1a] text-[#efe3cc] rounded-[6px] px-3 py-1 uppercase tracking-wide hover:bg-[#2a2a2a]"
            >
              [stop]
            </button>
          )}
          <Link href="/" className="btn-tape text-sm">Home</Link>
        </div>

        {showAdvanced && (
          <div className="mt-3 pt-3 border-t border-black/10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <label htmlFor="sampleRate" className="block text-xs font-medium mb-1">Sample Rate</label>
                <select
                  id="sampleRate"
                  value={audioConstraints.sampleRate}
                  onChange={(e) => setAudioConstraints(prev => ({ ...prev, sampleRate: Number(e.target.value) }))}
                  className="w-full bg-[#f6ead2] border border-black/20 rounded-sm px-2 py-1 text-xs"
                >
                  <option value={44100}>44.1 kHz</option>
                  <option value={48000}>48 kHz</option>
                  <option value={96000}>96 kHz</option>
                </select>
              </div>
              <div>
                <label htmlFor="channelCount" className="block text-xs font-medium mb-1">Channels</label>
                <select
                  id="channelCount"
                  value={audioConstraints.channelCount}
                  onChange={(e) => setAudioConstraints(prev => ({ ...prev, channelCount: Number(e.target.value) }))}
                  className="w-full bg-[#f6ead2] border border-black/20 rounded-sm px-2 py-1 text-xs"
                >
                  <option value={1}>Mono</option>
                  <option value={2}>Stereo</option>
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="echoCancellation"
                  checked={audioConstraints.echoCancellation}
                  onChange={(e) => setAudioConstraints(prev => ({ ...prev, echoCancellation: e.target.checked }))}
                  className="w-3 h-3"
                />
                <label htmlFor="echoCancellation" className="text-xs">Echo Cancel</label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="noiseSuppression"
                  checked={audioConstraints.noiseSuppression}
                  onChange={(e) => setAudioConstraints(prev => ({ ...prev, noiseSuppression: e.target.checked }))}
                  className="w-3 h-3"
                />
                <label htmlFor="noiseSuppression" className="text-xs">Noise Supp.</label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="autoGainControl"
                  checked={audioConstraints.autoGainControl}
                  onChange={(e) => setAudioConstraints(prev => ({ ...prev, autoGainControl: e.target.checked }))}
                  className="w-3 h-3"
                />
                <label htmlFor="autoGainControl" className="text-xs">Auto Gain</label>
              </div>
            </div>
            <div className="mt-2 text-xs text-black/60">
              Current settings: {audioConstraints.sampleRate}Hz, {audioConstraints.channelCount}ch
              {audioConstraints.echoCancellation && ', Echo Cancel ON'}
              {audioConstraints.noiseSuppression && ', Noise Supp. ON'}
              {audioConstraints.autoGainControl && ', Auto Gain ON'}
            </div>
          </div>
        )}
      </div>

      <div className="bg-[#efe3cc] border border-black/15 rounded-[6px] p-4 shadow-[0_1px_0_rgba(0,0,0,.25)]">
        <canvas
          ref={canvasRef}
          width={800}
          height={200}
          className="border border-black/20 bg-[#0f172a] rounded w-full"
        />
        <p className="mt-2 text-sm text-black/60">
          {recording ? "Recording…" : "Idle"}
        </p>
      </div>
    </main>
  );
}
