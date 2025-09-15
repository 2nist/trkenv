import useSWR, { mutate } from "swr";
import Link from "next/link";
import { putJSON, del, HttpError, postJSON } from "@/lib/api";
import { useState, useEffect } from "react";
import CompactSongImport from "@/components/CompactBeatsImport";

const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

type Song = {
  id: number;
  title: string;
  artist: string;
  folder?: string | null;
  content: string
};

type FolderData = {
  name: string | null;
  count: number;
  songs: Song[];
};

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
            <span className="text-xs text-gray-500 font-typewriter">
              Last checked: {lastCheck.toLocaleTimeString()}
            </span>
          )}
        </div>
        <button
          onClick={checkServerStatus}
          className="px-3 py-1 text-xs font-typewriter border border-black/20 rounded hover:bg-gray-50 transition-colors"
          disabled={backendStatus === 'checking'}
        >
          {backendStatus === 'checking' ? 'Checking...' : 'Check Now'}
        </button>
      </div>
    </div>
  );
}

function FolderManager({ onRefresh }: { onRefresh: () => void }) {
  const [newFolderName, setNewFolderName] = useState('');
  const [showCreateFolder, setShowCreateFolder] = useState(false);

  const createFolder = async () => {
    if (!newFolderName.trim()) return;

    // For now, we'll just create a folder by importing a placeholder song
    // In a full implementation, you'd have a dedicated folder creation endpoint
    try {
      await postJSON(`${apiBase}/songs`, {
        title: `_folder_placeholder_${Date.now()}`,
        artist: 'System',
        folder: newFolderName.trim(),
        content: 'This is a placeholder song to create the folder. Delete this after adding real songs.'
      });
      setNewFolderName('');
      setShowCreateFolder(false);
      onRefresh();
    } catch (error) {
      console.error('Error creating folder:', error);
    }
  };

  return (
    <div className="mb-4 p-3 bg-white border border-black/15 rounded-[6px] shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-typewriter text-sm font-medium">📁 Folder Management</h3>
        <button
          onClick={() => setShowCreateFolder(!showCreateFolder)}
          className="px-3 py-1 text-xs font-typewriter border border-black/20 rounded hover:bg-gray-50 transition-colors"
        >
          {showCreateFolder ? 'Cancel' : 'New Folder'}
        </button>
      </div>

      {showCreateFolder && (
        <div className="flex gap-2">
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Enter folder name (e.g., Beatles, Rock, Jazz)"
            className="flex-1 px-3 py-2 text-sm font-typewriter border border-black/20 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyDown={(e) => e.key === 'Enter' && createFolder()}
          />
          <button
            onClick={createFolder}
            disabled={!newFolderName.trim()}
            className="px-4 py-2 text-xs font-typewriter bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 transition-colors"
          >
            Create
          </button>
        </div>
      )}
    </div>
  );
}

function FolderView({ folder, onRefresh }: { folder: FolderData; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(true);
  const folderName = folder.name || "📂 Uncategorized";
  const icon = folder.name ? "📁" : "📂";

  return (
    <div className="mb-4 bg-white border border-black/15 rounded-[6px] shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 text-left font-typewriter text-sm font-medium bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
      >
        <span className="flex items-center gap-2">
          {icon} {folderName}
          <span className="text-xs text-gray-500">({folder.count} songs)</span>
        </span>
        <span className="text-xs">{expanded ? '▼' : '▶'}</span>
      </button>

      {expanded && (
        <div className="p-4">
          {folder.songs.length === 0 ? (
            <p className="text-gray-500 font-typewriter text-sm italic">No songs in this folder</p>
          ) : (
            <ul className="space-y-2">
              {folder.songs.map((song) => (
                <LibraryItem
                  key={song.id}
                  song={song}
                  apiBase={apiBase}
                  onChanged={onRefresh}
                />
              ))}
            </ul>
          )}
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
    return res.json();
  });

  const songs = data || [];

  // Group songs by folder
  const folders: FolderData[] = [];
  const songsByFolder: { [key: string]: Song[] } = {};

  // Group songs
  songs.forEach(song => {
    const folderKey = song.folder || '_uncategorized';
    if (!songsByFolder[folderKey]) {
      songsByFolder[folderKey] = [];
    }
    songsByFolder[folderKey].push(song);
  });

  // Convert to folder objects
  Object.entries(songsByFolder).forEach(([folderKey, folderSongs]) => {
    folders.push({
      name: folderKey === '_uncategorized' ? null : folderKey,
      count: folderSongs.length,
      songs: folderSongs
    });
  });

  // Sort folders: named folders first, then uncategorized
  folders.sort((a, b) => {
    if (a.name === null) return 1;
    if (b.name === null) return -1;
    return a.name.localeCompare(b.name);
  });

  const refreshData = () => {
    mutate(url);
  };

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
      <div className="max-w-4xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-typewriter font-bold mb-2 text-[#3a3a3a]">Song Library</h1>
          <p className="text-gray-600 font-typewriter">
            Organize your songs into folders for better management
          </p>
        </header>

        <ServerStatus />
        <FolderManager onRefresh={refreshData} />
        <CompactSongImport onSuccess={refreshData} />

        {isLoading && (
          <div className="text-center py-8">
            <p className="font-typewriter text-gray-600">Loading your song library...</p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-[6px]">
            <p className="font-typewriter text-red-700 text-sm">
              Error loading songs: {String(error)}
            </p>
          </div>
        )}

        {!isLoading && !error && (
          <div className="space-y-4">
            {folders.length === 0 ? (
              <div className="text-center py-12 bg-white border border-black/15 rounded-[6px]">
                <p className="font-typewriter text-gray-500 mb-4">
                  No songs in your library yet.
                </p>
                <p className="font-typewriter text-sm text-gray-400">
                  Import some songs using the area above to get started!
                </p>
              </div>
            ) : (
              folders.map((folder, index) => (
                <FolderView
                  key={folder.name || 'uncategorized'}
                  folder={folder}
                  onRefresh={refreshData}
                />
              ))
            )}
          </div>
        )}
      </div>
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
  const [showMoveToFolder, setShowMoveToFolder] = useState(false);
  const [newFolder, setNewFolder] = useState(song.folder || '');

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

  const onMoveToFolder = async () => {
    setBusy(true);
    setErrMsg(null);
    try {
      await putJSON(`${apiBase}/songs/${song.id}/folder`, {
        folder: newFolder.trim() || null
      });
      setShowMoveToFolder(false);
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

  return (
    <li className="border border-black/15 rounded-[6px] bg-white shadow-sm overflow-hidden">
      <div className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs font-typewriter px-2 py-1 border border-black/20 rounded hover:bg-gray-50 transition-colors"
            >
              {expanded ? "▼" : "▶"}
            </button>

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Link
                  href={`/timeline?song=${song.id}`}
                  className="font-typewriter font-medium hover:text-blue-600 transition-colors"
                >
                  {song.title}
                </Link>
                {song.folder && (
                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded font-typewriter">
                    📁 {song.folder}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 font-typewriter">{song.artist}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMoveToFolder(!showMoveToFolder)}
              className="text-xs font-typewriter px-3 py-1 border border-black/20 rounded hover:bg-gray-50 transition-colors"
              title="Move to folder"
            >
              📁 Move
            </button>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="text-xs font-typewriter px-3 py-1 border border-black/20 rounded hover:bg-gray-50 transition-colors"
            >
              {isEditing ? "Cancel" : "Edit"}
            </button>
            <button
              onClick={onDelete}
              disabled={busy}
              className="text-xs font-typewriter px-3 py-1 border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        </div>

        {showMoveToFolder && (
          <div className="mt-3 p-3 bg-gray-50 rounded">
            <div className="flex gap-2">
              <input
                type="text"
                value={newFolder}
                onChange={(e) => setNewFolder(e.target.value)}
                placeholder="Enter folder name (leave empty for no folder)"
                className="flex-1 px-3 py-2 text-sm font-typewriter border border-black/20 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={(e) => e.key === 'Enter' && onMoveToFolder()}
              />
              <button
                onClick={onMoveToFolder}
                disabled={busy}
                className="px-4 py-2 text-xs font-typewriter bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 transition-colors"
              >
                Move
              </button>
            </div>
          </div>
        )}

        {errMsg && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700 font-typewriter">
            {errMsg}
          </div>
        )}
      </div>

      {expanded && (
        <div className="border-t border-black/10 p-3 bg-gray-50">
          {!isEditing ? (
            <pre className="text-xs font-typewriter text-gray-700 whitespace-pre-wrap max-h-64 overflow-y-auto">
              {song.content}
            </pre>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-typewriter font-medium mb-1">Title:</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-typewriter border border-black/20 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-typewriter font-medium mb-1">Artist:</label>
                <input
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-typewriter border border-black/20 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-typewriter font-medium mb-1">Content:</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 text-sm font-typewriter border border-black/20 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setIsEditing(false)}
                  disabled={busy}
                  className="px-4 py-2 text-xs font-typewriter border border-black/20 rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={onSave}
                  disabled={busy}
                  className="px-4 py-2 text-xs font-typewriter bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 transition-colors"
                >
                  {busy ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </li>
  );
}
