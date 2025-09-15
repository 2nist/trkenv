import useSWR, { mutate } from "swr";
import { swrFetcher, postJSON, putJSON, del, HttpError } from "../lib/api";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import SimpleImport from "../components/FileImportButton";

const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
const fetcher = swrFetcher;

export default function SongsPage() {
  const router = useRouter();
  const url = `${apiBase}/songs`;
  const { data, error, isLoading } = useSWR(url, fetcher);
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
      await postJSON(url, { title, artist, content });
      setTitle("");
      setArtist("");
      setContent("");
      mutate(url);
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
    <main className="p-6 max-w-4xl mx-auto font-typewriter">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-typewriter text-black font-bold">Songs</h2>
        <SimpleImport onSuccess={() => mutate(url)} />
      </div>

      {isLoading && <div className="font-typewriter">Loading songs from the archive...</div>}
      {error && <div className="font-typewriter text-black mb-4">Error: {String(error)}</div>}

      <section className="mb-6 p-4 border border-black/15 rounded-[6px] bg-[#efe3cc] text-black shadow-[0_1px_0_rgba(0,0,0,.25)]">
        <h3 className="font-typewriter text-black font-bold mb-4 mt-0">Add New Song</h3>
        {errMsg && (
          <div className="font-typewriter text-black mb-4">{errMsg}</div>
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
            {submitting ? "SAVING..." : "CREATE SONG"}
          </button>
        </form>
      </section>

      <ul className="list-none p-0 grid gap-3">
        {Array.isArray(data) && data.length > 0 ? (
          data.map((s: any) => (
            <li key={s.id} className="border border-black/15 rounded-[6px] p-3 bg-[#efe3cc] text-black shadow-[0_1px_0_rgba(0,0,0,.25)]">
              <SongItem
                song={s}
                apiBase={apiBase!}
                onChanged={() => mutate(url)}
              />
            </li>
          ))
        ) : (
          <li className="border border-black/15 rounded-[6px] p-6 bg-[#efe3cc] text-black text-center">
            <p className="font-typewriter">No songs yet. Use the <span className="typewriter-strike">typewriter</span> form above to create your first song.</p>
          </li>
        )}
      </ul>
    </main>
  );
}

function SongItem({
  song,
  apiBase,
  onChanged,
}: {
  song: any;
  apiBase: string;
  onChanged: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [expanded, setExpanded] = useState(false); // collapsed by default
  const [title, setTitle] = useState(song.title);
  const [artist, setArtist] = useState(song.artist);
  const [content, setContent] = useState(song.content);
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const onSave = async () => {
    setBusy(true);
    setErrMsg(null);
    try {
      await putJSON(`${apiBase}/songs/${song.id}`, {
        title,
        artist,
        content,
      });
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
      <div className="grid gap-4">
        {errMsg && <div className="text-[#D64541] font-typewriter">{errMsg}</div>}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Song Title"
          className="p-3 border border-black/20 rounded bg-white font-typewriter text-black"
        />
        <input
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
          placeholder="Artist Name"
          className="p-3 border border-black/20 rounded bg-white font-typewriter text-black"
        />
        <textarea
          rows={6}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Content (lyrics/chords)"
          className="p-3 border border-black/20 rounded bg-white font-typewriter resize-none text-black"
        />
        <div className="flex gap-2">
          <button onClick={onSave} disabled={busy} className="btn-tape-sm">
            {busy ? "SAVING..." : "SAVE"}
          </button>
          <button onClick={() => setIsEditing(false)} disabled={busy} className="btn-tape-sm">
            CANCEL
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <strong className="font-typewriter">
            <Link href={`/songs/${song.id}`} className="hover:underline text-black">
              {/* Add occasional strikethrough for vintage feel */}
              {Math.random() > 0.97 ? <span className="typewriter-strike">{song.title}</span> : song.title}
            </Link>
          </strong>
          <span className="font-typewriter text-black">&nbsp;— {song.artist}</span>
        </div>
        <div className="flex gap-2">
          <Link href={`/songs/${song.id}`} className="btn-tape-sm">VIEW</Link>
          <button onClick={() => setIsEditing(true)} disabled={busy} className="btn-tape-sm">
            EDIT
          </button>
          <button
            onClick={onDelete}
            disabled={busy}
            className="btn-tape-sm text-[#D64541]"
          >
            DEL
          </button>
          <button
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-controls={`song-${song.id}-content`}
            className="btn-tape-sm"
          >
            {expanded ? "HIDE" : "SHOW"}
          </button>
        </div>
      </div>

      {expanded && (
        <pre
          id={`song-${song.id}-content`}
          className="whitespace-pre-wrap bg-[#1a1a1a] text-[#efe3cc] p-3 rounded-[6px] border border-black/20 mt-1 font-typewriter text-sm"
        >
          {song.content}
        </pre>
      )}
      {errMsg && <div className="text-[#D64541] font-typewriter">{errMsg}</div>}
    </div>
  );
}
