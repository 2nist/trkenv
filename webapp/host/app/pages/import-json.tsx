import { useState } from "react";

const API_URL =
  (globalThis as any).process?.env?.NEXT_PUBLIC_API_BASE ||
  "http://localhost:8000";

export default function ImportJsonPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [includeLyrics, setIncludeLyrics] = useState(true);
  const combineUrl = `${API_URL}/combine/jcrd-lyrics?save=true`;
  const combinePreviewUrl = `${API_URL}/combine/jcrd-lyrics?save=false`;

  const onSubmit = async (e: any) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!file) {
      setError("Choose a .json file first.");
      return;
    }
    setLoading(true);
    try {
      // Read the file content and parse as JSON
      const fileContent = await file.text();
      const jsonData = JSON.parse(fileContent);

      const res = await fetch(
        `${API_URL}/import/json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(jsonData),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || "Upload failed");

      // If lyrics are enabled and import was successful, fetch lyrics
      if (includeLyrics && data.success && data.song_id) {
        try {
          const lyricsRes = await fetch(
            `${API_URL}/songs/${data.song_id}/lyrics`,
            {
              method: "POST",
            }
          );
          const lyricsData = await lyricsRes.json();
          if (lyricsData.success) {
            data.lyrics_fetched = true;
            data.lyrics = lyricsData.lyrics;
          } else {
            data.lyrics_fetched = false;
            data.lyrics_error = lyricsData.message || lyricsData.error;
          }
        } catch (lyricsErr) {
          data.lyrics_fetched = false;
          data.lyrics_error = "Failed to fetch lyrics";
        }
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  async function onCombineSave() {
    try {
      setError(null);
      if (!result?.preview) throw new Error("Upload and preview JSON first.");
      const auto = result.auto_combined || null;
      const payload = {
        jcrd: result.preview,
        lyrics: { lines: (auto?.lines as any[]) || [] },
        title:
          result.summary?.title ||
          (file?.name || "Untitled").replace(/\.json$/i, ""),
        artist: result.summary?.artist || "",
        include_lyrics: includeLyrics,
      };
      const res = await fetch(combineUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || "Combine failed");
      setResult((r: any) => ({ ...(r || {}), combined_saved: data }));
    } catch (err: any) {
      setError(err.message || String(err));
    }
  }

  async function onCombinePreview() {
    try {
      setError(null);
      if (!result?.preview) throw new Error("Upload and preview JSON first.");
      const auto = result.auto_combined || null;
      const payload = {
        jcrd: result.preview,
        lyrics: { lines: (auto?.lines as any[]) || [] },
        title:
          result.summary?.title ||
          (file?.name || "Untitled").replace(/\.json$/i, ""),
        artist: result.summary?.artist || "",
        include_lyrics: includeLyrics,
      };
      const res = await fetch(combinePreviewUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || "Combine preview failed");
      setResult((r: any) => ({ ...(r || {}), combined_preview: data }));
    } catch (err: any) {
      setError(err.message || String(err));
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 text-gray-900 p-8">
      <div className="max-w-2xl mx-auto rounded-lg border border-gray-300 bg-white shadow-lg">
        <div className="p-8">
          <h1 className="text-2xl font-bold text-gray-900">Import JSON</h1>
          <p className="text-sm text-gray-600 mt-2">
            Upload a .json to test the pipeline.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <input
              type="file"
              accept=".json,application/json"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full p-2 border border-gray-300 rounded"
            />
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={includeLyrics}
                onChange={(e) => setIncludeLyrics(e.target.checked)}
                className="rounded"
              />
              Include lyrics when combining (auto-fetch if available)
            </label>
            <button
              type="submit"
              disabled={!file || loading}
              className="px-4 py-2 text-white rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Uploading…" : "Upload JSON"}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded text-red-700">
              <strong>Error:</strong> {error}
            </div>
          )}

          {result && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded">
              <h2 className="text-lg font-semibold text-gray-900">Result</h2>
              <div className="mt-2 text-sm text-gray-700">
                <div>
                  File: <code>{result.filename}</code>
                </div>
                <div>
                  Size: <code>{result.size_bytes}</code> bytes
                </div>
                {result.song_id && (
                  <div>
                    Song ID: <code>{result.song_id}</code>
                  </div>
                )}
                {result.lyrics_fetched !== undefined && (
                  <div>
                    Lyrics: {result.lyrics_fetched
                      ? <span className="text-green-600">✓ Fetched from LRCLIB</span>
                      : <span className="text-orange-600">⚠ {result.lyrics_error || 'Not available'}</span>
                    }
                  </div>
                )}
                <div className="mt-4 text-gray-900">Summary:</div>
                <pre className="mt-2 p-3 rounded-lg overflow-auto text-xs bg-gray-100 text-gray-800 border">
                  {JSON.stringify(result.summary, null, 2)}
                </pre>
                <div className="mt-4 text-gray-900">Preview (truncated client-side):</div>
                <pre className="mt-2 p-3 rounded-lg overflow-auto text-xs bg-gray-100 text-gray-800 border max-h-96">
                  {JSON.stringify(result.preview, null, 2)}
                </pre>
                <div className="mt-4 flex gap-2">
                  <button
                    className="px-4 py-2 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    onClick={onCombinePreview}
                  >
                    Preview Combined
                  </button>
                  <button
                    className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
                    onClick={onCombineSave}
                  >
                    Combine & Save
                  </button>
                </div>
                {result.combined_preview && (
                  <div className="mt-sm">
                    <div className="text-sm font-medium">Combined preview</div>
                    <pre className="mt-sm p-sm rounded-lg overflow-auto text-xs bg-muted text-fg">
                      {JSON.stringify(result.combined_preview, null, 2)}
                    </pre>
                  </div>
                )}
                {result.combined_saved && (
                  <div className="mt-sm text-sm">
                    <div className="font-medium">Saved</div>
                    <pre className="mt-sm p-sm rounded-lg overflow-auto text-xs bg-muted text-fg">
                      {JSON.stringify(result.combined_saved, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
