import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export default function RecordPage() {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string | undefined>(undefined);
  const [recording, setRecording] = useState(false);
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

  async function start() {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: deviceId ? { deviceId: { exact: deviceId } } : true,
    });
    const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
    mr.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    mr.onstop = onStop; // finalize
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

  async function onStop() {
    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    const form = new FormData();
    form.append("file", blob, "recording.webm");
    const res = await fetch(`${apiBase}/recordings/upload`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      alert(`Upload failed: ${await res.text()}`);
      return;
    }
    const { jobId } = await res.json();
    // poll job
    const id = setInterval(async () => {
      const jr = await fetch(`${apiBase}/jobs/${jobId}`);
      if (!jr.ok) return;
      const data = await jr.json();
      if (data.status === "done" && data.draftId) {
        clearInterval(id);
        window.location.href = `/songs/from-draft/${data.draftId}`;
      }
    }, 1500);
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
