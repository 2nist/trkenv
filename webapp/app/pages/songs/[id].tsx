import { useRouter } from "next/router";
import React from "react";

// Make cylindrical timeline the default view for a song: redirect /songs/[id]
// to /cylindrical?song=<id>
export default function SongDefaultRedirect() {
  const router = useRouter();
  React.useEffect(() => {
    const { id } = router.query as { id?: string | string[] };
    const sid = Array.isArray(id) ? id?.[0] : id;
    if (sid) router.replace(`/cylindrical?song=${encodeURIComponent(sid)}`);
  }, [router]);
  return (
    <main className="p-6">
      <h1 className="m-0">Song</h1>
      <p>Redirecting to Cylindrical Timeline…</p>
    </main>
  );
}
