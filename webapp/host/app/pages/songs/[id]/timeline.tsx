import { useRouter } from "next/router";
import React from "react";

// Temporary shim: redirect /songs/[id]/timeline to the existing detail page /songs/[id].
// This prevents 404s from legacy links while we wire up a dedicated timeline view.
export default function SongTimelineRedirect() {
  const router = useRouter();
  React.useEffect(() => {
    const { id } = router.query as { id?: string | string[] };
    const sid = Array.isArray(id) ? id?.[0] : id;
    if (sid) router.replace(`/songs/${sid}`);
  }, [router]);
  return (
    <main className="p-6">
      <h1 className="m-0">Timeline</h1>
      <p>Redirecting to song…</p>
    </main>
  );
}
