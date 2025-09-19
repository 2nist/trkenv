import { useRouter } from "next/router";
import React from "react";

// Redirect legacy /songs/[id]/timeline to the new cylindrical timeline page
export default function SongTimelineRedirect() {
  const router = useRouter();
  React.useEffect(() => {
    const { id } = router.query as { id?: string | string[] };
    const sid = Array.isArray(id) ? id?.[0] : id;
    if (sid) router.replace(`/cylindrical?song=${encodeURIComponent(sid)}`);
  }, [router]);
  return (
    <main className="p-6">
      <h1 className="m-0">Timeline</h1>
      <p>Redirecting to Cylindrical Timeline…</p>
    </main>
  );
}
