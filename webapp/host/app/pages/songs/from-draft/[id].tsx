import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ZSongDraft, type SongDraft } from "../../../lib/schemas/songDraft";

const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export default function DraftReview() {
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [validation, setValidation] = useState<string | null>(null);
  const [draft, setDraft] = useState<SongDraft | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await fetch(`${apiBase}/drafts/${id}/songdoc`);
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        const parsed = ZSongDraft.safeParse(data);
        if (!parsed.success) {
          setValidation(parsed.error.errors.map((e) => e.message).join("; "));
        } else {
          setValidation(null);
          setDraft(parsed.data);
        }
      } catch (e: any) {
        setErr(String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function createSong() {
    if (!id) return;
    const res = await fetch(`${apiBase}/songs/from-draft`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ draftId: Number(id) }),
    });
    if (!res.ok) {
      alert(await res.text());
      return;
    }
    const song = await res.json();
    router.push(`/songs/${song.id}`);
  }

  if (loading) return <main className="p-6">Loading draft…</main>;
  if (err) return <main className="p-6 text-[#ef4444]">Error: {err}</main>;

  const meta = draft?.meta || {};
  const sections = draft?.sections || [];
  const lyricsList = draft?.lyrics || [];

  return (
    <main className="p-6 grid gap-4 grid-cols-2">
      <section>
        <h2>Waveform</h2>
        <div className="h-[240px] border border-[#1f2937] bg-[#0f172a] rounded-[6px]" />
        <p className="text-[#9aa3af]">Beat grid coming soon.</p>
      </section>
      <section className="grid gap-3">
        <div>
          <h3>Meta</h3>
          <div className="text-[#e5e7eb]">
            <div>Title: {meta.title || "(none)"}</div>
            <div>Artist: {meta.artist || "(none)"}</div>
            {meta.timeSig && <div>Time Sig: {meta.timeSig}</div>}
            {meta.bpm?.value && <div>BPM: {meta.bpm.value}</div>}
          </div>
        </div>
        <div>
          <h3>Sections</h3>
          <pre className="whitespace-pre-wrap bg-[#0f172a] text-[#e5e7eb] p-3 rounded-[6px] border border-[#1f2937]">
            {JSON.stringify(sections, null, 2)}
          </pre>
        </div>
        <div>
          <h3>Lyrics</h3>
          <div className="min-h-[160px] bg-[#0f172a] text-[#e5e7eb] p-3 rounded-[6px] border border-[#1f2937]">
            {lyricsList.length > 0
              ? lyricsList.map((l, i) => <div key={i}>{l.text}</div>)
              : "(none)"}
          </div>
        </div>
        {validation && <div className="text-[#f59e0b]">Schema warnings: {validation}</div>}
        <div className="flex gap-2">
          <button className="btn mr-2" onClick={createSong}>Create Song</button>
          <Link href="/library" className="btn">Back to Library</Link>
        </div>
      </section>
    </main>
  );
}
