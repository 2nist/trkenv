import { useState, useCallback } from "react";
import { useRouter } from "next/router";

export default function UnifiedImportPage() {
  const router = useRouter();
  const [files, setFiles] = useState<FileList | null>(null);
  const [includeLyrics, setIncludeLyrics] = useState(true);
  const [saveSongs, setSaveSongs] = useState(true);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [supportedFormats, setSupportedFormats] = useState<any>(null);
  const [dragOver, setDragOver] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

  // Load supported formats on component mount
  useState(() => {
    fetch(`${API_URL}/import/formats`)
      .then(res => res.json())
      .then(data => setSupportedFormats(data))
      .catch(err => console.error("Failed to load supported formats:", err));
  });

  const handleFileSelect = useCallback((selectedFiles: FileList | null) => {
    setFiles(selectedFiles);
    setResults(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      handleFileSelect(droppedFiles);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleImport = async () => {
    if (!files || files.length === 0) {
      alert("Please select files to import");
      return;
    }

    setLoading(true);
    setResults(null);

    try {
      const formData = new FormData();

      // Add all files
      Array.from(files).forEach(file => {
        formData.append("files", file);
      });

      const response = await fetch(
        `${API_URL}/import/unified?include_lyrics=${includeLyrics}&save_songs=${saveSongs}`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();
      setResults(data);

      if (data.success && data.statistics.successful > 0) {
        // Auto-refresh song list or redirect
        setTimeout(() => {
          router.push("/songs");
        }, 3000);
      }

    } catch (error) {
      console.error("Import failed:", error);
      setResults({
        success: false,
        failed: [{ filename: "unknown", error: error.message }]
      });
    } finally {
      setLoading(false);
    }
  };

  const renderFormatList = () => {
    if (!supportedFormats) return null;

    const formats = supportedFormats.supported_formats || {};
    const readyFormats = Object.entries(formats).filter(([_, info]: [string, any]) => info.ready);
    const plannedFormats = Object.entries(formats).filter(([_, info]: [string, any]) => !info.ready);

    return (
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-3">Supported File Formats</h3>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-green-800 mb-2">✅ Ready Now ({readyFormats.length})</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              {readyFormats.map(([format, info]: [string, any]) => (
                <li key={format} className="flex items-center gap-2">
                  <span className="text-green-600">●</span>
                  <span className="font-medium">{info.name || format}</span>
                  <span className="text-gray-400">
                    {info.extensions?.join(", ") || ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-medium text-orange-800 mb-2">🚧 Coming Soon ({plannedFormats.length})</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              {plannedFormats.map(([format, info]: [string, any]) => (
                <li key={format} className="flex items-center gap-2">
                  <span className="text-orange-500">●</span>
                  <span className="font-medium">{info.name || format}</span>
                  <span className="text-gray-400">
                    {info.extensions?.join(", ") || ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  };

  const renderResults = () => {
    if (!results) return null;

    const { statistics, imported, failed, warnings } = results;

    return (
      <div className="mt-6 space-y-4">
        {/* Statistics */}
        <div className="p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">Import Results</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-blue-600 font-medium">{statistics.total_files}</div>
              <div className="text-blue-500">Total Files</div>
            </div>
            <div>
              <div className="text-green-600 font-medium">{statistics.successful}</div>
              <div className="text-green-500">Successful</div>
            </div>
            <div>
              <div className="text-red-600 font-medium">{statistics.failed}</div>
              <div className="text-red-500">Failed</div>
            </div>
            <div>
              <div className="text-purple-600 font-medium">{statistics.lyrics_found}</div>
              <div className="text-purple-500">Lyrics Found</div>
            </div>
          </div>
        </div>

        {/* Successful Imports */}
        {imported.length > 0 && (
          <div className="p-4 bg-green-50 rounded-lg">
            <h4 className="font-semibold text-green-900 mb-2">✅ Successfully Imported</h4>
            <div className="space-y-2">
              {imported.map((item: any, index: number) => (
                <div key={index} className="text-sm">
                  <div className="font-medium text-green-800">
                    {item.title} {item.artist && `by ${item.artist}`}
                  </div>
                  <div className="text-green-600 text-xs">
                    {item.filename} • {item.format} format
                    {item.lyrics?.matched && " • Lyrics found"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Failed Imports */}
        {failed.length > 0 && (
          <div className="p-4 bg-red-50 rounded-lg">
            <h4 className="font-semibold text-red-900 mb-2">❌ Failed Imports</h4>
            <div className="space-y-2">
              {failed.map((item: any, index: number) => (
                <div key={index} className="text-sm">
                  <div className="font-medium text-red-800">{item.filename}</div>
                  <div className="text-red-600 text-xs">{item.error}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="p-4 bg-yellow-50 rounded-lg">
            <h4 className="font-semibold text-yellow-900 mb-2">⚠️ Warnings</h4>
            <div className="space-y-1">
              {warnings.map((warning: string, index: number) => (
                <div key={index} className="text-xs text-yellow-700">{warning}</div>
              ))}
            </div>
          </div>
        )}

        {/* Success redirect notice */}
        {results.success && statistics.successful > 0 && (
          <div className="p-4 bg-emerald-50 rounded-lg text-center">
            <div className="text-emerald-800 font-medium">
              🎵 Import successful! Redirecting to song library...
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-gray-100 text-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg border border-gray-300 shadow-lg p-8">

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              🎵 Unified Import System
            </h1>
            <p className="text-gray-600">
              Import songs from any format with automatic lyrics integration
            </p>
          </div>

          {/* File Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragOver
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:border-gray-400"
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            {files ? (
              <div>
                <div className="text-lg font-medium text-gray-900 mb-2">
                  {files.length} file{files.length !== 1 ? 's' : ''} selected
                </div>
                <div className="text-sm text-gray-600 mb-4">
                  {Array.from(files).map(f => f.name).join(", ")}
                </div>
              </div>
            ) : (
              <div>
                <div className="text-4xl mb-4">📁</div>
                <div className="text-lg font-medium text-gray-900 mb-2">
                  Drop files here or click to browse
                </div>
                <div className="text-sm text-gray-600">
                  Supports: JSON, MIDI, Audio, ChordPro, and more
                </div>
              </div>
            )}

            <input
              type="file"
              multiple
              className="hidden"
              id="file-input"
              onChange={(e) => handleFileSelect(e.target.files)}
              accept=".json,.jcrd,.mp3,.wav,.mid,.midi,.cho,.lab,.txt,.pdf,.xml,.rpp"
            />
            <label
              htmlFor="file-input"
              className="inline-block mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
            >
              {files ? "Change Files" : "Browse Files"}
            </label>
          </div>

          {/* Options */}
          <div className="mt-6 grid md:grid-cols-2 gap-6">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={includeLyrics}
                onChange={(e) => setIncludeLyrics(e.target.checked)}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-gray-700">
                Auto-fetch lyrics from LRCLIB
              </span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={saveSongs}
                onChange={(e) => setSaveSongs(e.target.checked)}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-gray-700">
                Save songs to library
              </span>
            </label>
          </div>

          {/* Import Button */}
          <div className="mt-8 text-center">
            <button
              onClick={handleImport}
              disabled={!files || loading}
              className="px-8 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? "Importing..." : `Import ${files?.length || 0} Files`}
            </button>
          </div>

          {/* Results */}
          {renderResults()}

          {/* Supported Formats */}
          {renderFormatList()}

        </div>
      </div>
    </main>
  );
}
