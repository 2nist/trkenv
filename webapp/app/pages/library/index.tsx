import useSWR, { mutate } from "swr";
import Link from "next/link";
import { putJSON, del, HttpError, postJSON } from "@/lib/api";
import { useState, useEffect } from "react";
import CompactBeatsImport from "@/components/CompactBeatsImport";

const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

type Song = { id: number; title: string; artist: string; content: string };

function ServerStatus() {
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const checkServerStatus = async () => {
    setBackendStatus('checking');
    try {
      const response = await fetch(`${apiBase}/songs`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000) // 3 second timeout
      });
      if (response.ok) {
        setBackendStatus('online');
      } else {
        setBackendStatus('offline');
      }
    } catch (error) {
      setBackendStatus('offline');
    }
    setLastCheck(new Date());
  };

  useEffect(() => {
    checkServerStatus();
    const interval = setInterval(checkServerStatus, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const statusColor = backendStatus === 'online' ? 'text-green-600' :
                     backendStatus === 'offline' ? 'text-red-600' : 'text-yellow-600';

  const statusText = backendStatus === 'online' ? '🟢 Backend Online' :
                    backendStatus === 'offline' ? '🔴 Backend Offline' : '🟡 Checking...';

  return (
    <div className="mb-4 p-3 bg-white border border-black/15 rounded-[6px] shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`font-typewriter text-sm ${statusColor}`}>
            {statusText}
          </span>
          {lastCheck && (
            <span className="font-typewriter text-xs text-black/60">
              Last checked: {lastCheck.toLocaleTimeString()}
            </span>
          )}
        </div>
        <button
          onClick={checkServerStatus}
          className="btn-tape-sm text-xs"
          disabled={backendStatus === 'checking'}
        >
          {backendStatus === 'checking' ? 'Checking...' : 'Refresh'}
        </button>
      </div>
      {backendStatus === 'offline' && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs font-typewriter text-red-700">
          ⚠️ Backend server is not responding. Try running: <code>.\start-servers.ps1</code> in the webapp folder.
        </div>
      )}
    </div>
  );
}

export default function LibraryPage() {
  const url = `${apiBase}/songs`;
  const { data, error, isLoading } = useSWR<Song[]>(url, async (u) => {
    const res = await fetch(u);
    if (!res.ok) throw new Error(await res.text());
    const result = await res.json();
    console.log('API Response:', result); // Debug log

    // Handle both array response and error object response
    if (Array.isArray(result)) {
      return result;
    } else if (result && typeof result === 'object' && Array.isArray(result.songs)) {
      // If API returns {error: "...", songs: []} format
      if (result.error) {
        throw new Error(result.error);
      }
      return result.songs;
    } else {
      throw new Error('Unexpected API response format');
    }
  });

  // Defensive programming: ensure songs is always an array
  const songs = Array.isArray(data) ? data : [];
  const [showCreate, setShowCreate] = useState(false);

  // Prevent browser from opening files when dropped anywhere on the page
  useEffect(() => {
    const handleGlobalDragOver = (e: DragEvent) => e.preventDefault();
    const handleGlobalDrop = (e: DragEvent) => e.preventDefault();

    window.addEventListener('dragover', handleGlobalDragOver);
    window.addEventListener('drop', handleGlobalDrop);

    return () => {
      window.removeEventListener('dragover', handleGlobalDragOver);
      window.removeEventListener('drop', handleGlobalDrop);
    };
  }, []);

  return (
    <main className="p-6 min-h-screen bg-[#efe3cc]">
      <h1 className="font-typewriter text-black font-bold mb-4">Library</h1>

      {/* Server Status Monitor */}
      <ServerStatus />

      {/* Import Section */}
      <div className="mb-6 p-4 border border-black/15 rounded-[6px] bg-white shadow-[0_1px_0_rgba(0,0,0,.25)]">
        <h2 className="font-typewriter text-black font-bold mb-3">Import Songs</h2>
        <CompactBeatsImport onSuccess={() => { mutate(url, undefined, { revalidate: true }); }} />
      </div>

      {/* Create New Song Section */}
      <div className="mb-6 p-4 border border-black/15 rounded-[6px] bg-white shadow-[0_1px_0_rgba(0,0,0,.25)]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-typewriter text-black font-bold">Create New Song</h2>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="btn-tape-sm"
          >
            {showCreate ? "Hide Create" : "Show Create"}
          </button>
        </div>
        {showCreate && <CreateSongSection onSongCreated={() => mutate(url)} />}
      </div>

      <div className="mb-4">
        <Link href="/" className="btn-tape-sm">
          Back to Home
        </Link>
      </div>
      {isLoading && <div className="mt-3 font-typewriter text-black">Loading…</div>}
      {error && (
        <div className="mt-3 font-typewriter text-black">
          Error: {String(error)}
        </div>
      )}

      {/* Debug info */}
      <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs font-typewriter">
        <strong>Debug:</strong>
        Data type: {typeof data},
        Is Array: {Array.isArray(data)},
        Songs length: {songs.length},
        Raw data: {JSON.stringify(data)?.substring(0, 100)}...
      </div>

      <ul className="mt-4 list-none p-0 grid gap-2">
        {songs.map((s) => (
          <li
            key={s.id}
            className="p-3 rounded-lg border border-black/10 bg-[#efe3cc]"
          >
            <LibraryItem
              song={s}
              apiBase={apiBase}
              onChanged={() => mutate(url)}
            />
          </li>
        ))}
      </ul>
    </main>
  );
}

function LibraryItem({
  song,
  apiBase,
  onChanged,
}: {
  song: Song;
  apiBase: string;
  onChanged: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const [title, setTitle] = useState(song.title);
  const [artist, setArtist] = useState(song.artist);
  const [content, setContent] = useState(song.content);

  const onSave = async () => {
    setBusy(true);
    setErrMsg(null);
    try {
      await putJSON(`${apiBase}/songs/${song.id}`, { title, artist, content });
      setIsEditing(false);
      onChanged();
    } catch (err: any) {
      setErrMsg(
        err instanceof HttpError
          ? String(err.body?.detail || err.message)
          : String(err)
      );
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    if (!confirm(`Delete "${song.title}"?`)) return;
    setBusy(true);
    setErrMsg(null);
    try {
      await del(`${apiBase}/songs/${song.id}`);
      onChanged();
    } catch (err: any) {
      setErrMsg(
        err instanceof HttpError
          ? String(err.body?.detail || err.message)
          : String(err)
      );
    } finally {
      setBusy(false);
    }
  };

  if (isEditing) {
    return (
      <div className="grid gap-2">
        {errMsg && <div className="font-typewriter text-black">{errMsg}</div>}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-2 bg-white border border-black/20 rounded font-typewriter text-black"
          placeholder="Song title"
        />
        <input
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
          className="w-full p-2 bg-white border border-black/20 rounded font-typewriter text-black"
          placeholder="Artist name"
        />
        <textarea
          rows={6}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full p-3 bg-white border border-black/20 rounded font-typewriter text-black"
          placeholder="Song content"
        />
        <div className="flex gap-2">
          <button onClick={onSave} disabled={busy} className="btn-tape-sm">
            {busy ? "Saving…" : "Save"}
          </button>
          <button onClick={() => setIsEditing(false)} disabled={busy} className="btn-tape-sm">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <div className="font-typewriter text-black">
          <strong>
            <Link href={`/songs/${song.id}`} className="text-black hover:underline">{song.title}</Link>
          </strong>{" "}
          — {song.artist}
        </div>
        <div className="flex gap-2">
          <Link href={`/playhead?song=${song.id}`} className="btn-tape-sm">
            Playhead
          </Link>
          <Link href={`/songs/${song.id}`} className="btn-tape-sm">
            Details
          </Link>
          <button onClick={() => setIsEditing(true)} disabled={busy} className="btn-tape-sm">
            Edit
          </button>
          <button
            onClick={onDelete}
            disabled={busy}
            className="btn-tape-sm text-[#D64541]"
          >
            Delete
          </button>
          <button
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded ? true : false}
            aria-controls={`lib-${song.id}-content`}
            className="btn-tape-sm"
          >
            {expanded ? "Hide" : "Show"}
          </button>
        </div>
      </div>
      {expanded && (
        <pre
          id={`lib-${song.id}-content`}
          className="mt-2 p-3 bg-white border border-black/20 rounded font-typewriter text-black text-sm whitespace-pre-wrap"
        >
          {song.content}
        </pre>
      )}
      {errMsg && <div className="font-typewriter text-black">{errMsg}</div>}
    </div>
  );
}

function CreateSongSection({ onSongCreated }: { onSongCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrMsg(null);
    try {
      await postJSON(`${apiBase}/songs`, { title, artist, content });
      setTitle("");
      setArtist("");
      setContent("");
      onSongCreated();
    } catch (err: any) {
      setErrMsg(
        err instanceof HttpError
          ? String(err.body?.detail || err.message)
          : String(err)
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {errMsg && (
        <div className="font-typewriter text-[#D64541] mb-4">{errMsg}</div>
      )}
      <form onSubmit={onCreate} className="grid gap-4">
        <input
          placeholder="Song Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="p-3 border border-black/20 rounded bg-white font-typewriter text-black"
        />
        <input
          placeholder="Artist Name"
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
          className="p-3 border border-black/20 rounded bg-white font-typewriter text-black"
        />
        <textarea
          placeholder="Content (lyrics/chords)"
          rows={6}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          className="p-3 border border-black/20 rounded bg-white font-typewriter resize-none text-black"
        />
        <button type="submit" disabled={submitting} className="btn-tape-wide">
          {submitting ? "CREATING..." : "CREATE SONG"}
        </button>
      </form>
    </div>
  );
}
