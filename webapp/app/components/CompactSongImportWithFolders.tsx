import React, { useState, useRef } from 'react';
import { useRouter } from 'next/router';

interface CompactSongImportProps {
  onSuccess?: () => void;
  defaultFolder?: string;
}

export default function CompactSongImport({ onSuccess, defaultFolder }: CompactSongImportProps) {
  const [status, setStatus] = useState<'idle' | 'importing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState(defaultFolder || '');
  const [showFolderInput, setShowFolderInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileImport = async (file: File) => {
    if (!file.name.endsWith('.json') && !file.name.endsWith('.jcrd')) {
      setStatus('error');
      setMessage('Please select a .json or .jcrd file');
      setTimeout(() => { setStatus('idle'); setMessage(''); }, 3000);
      return;
    }

    setStatus('importing');
    setMessage(`Importing ${file.name}${selectedFolder ? ` to ${selectedFolder}` : ''}...`);

    try {
      const fileContent = await file.text();

      let songData;
      let songTitle = file.name;

      try {
        songData = JSON.parse(fileContent);
        songTitle = songData.metadata?.title || songData.title || file.name;

        // Add folder to the song data if selected
        if (selectedFolder.trim()) {
          songData.folder = selectedFolder.trim();
        }
      } catch {
        // If JSON parsing fails, create basic song object
        songData = {
          title: file.name.replace(/\.(json|jcrd)$/, ''),
          artist: 'Unknown Artist',
          content: fileContent,
          folder: selectedFolder.trim() || null
        };
      }

      const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';
      const response = await fetch(`${apiBase}/songs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(songData)
      });

      if (!response.ok) {
        throw new Error(`Import failed: ${response.status}`);
      }

      const result = await response.json();

      setStatus('success');
      setMessage(`✅ "${songTitle}" imported successfully!${selectedFolder ? ` (📁 ${selectedFolder})` : ''}`);

      // Auto-navigate to playhead after 2 seconds
      setTimeout(() => {
        if (result.id) {
          router.push(`/playhead?song=${result.id}`);
        }
      }, 2000);

      // Call success callback
      if (onSuccess) {
        onSuccess();
      }

      // Reset form
      setTimeout(() => {
        setStatus('idle');
        setMessage('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 3000);

    } catch (error) {
      console.error('Import error:', error);
      setStatus('error');
      setMessage(`❌ Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => { setStatus('idle'); setMessage(''); }, 5000);
    }
  };

  const handleFileSelect = (files: FileList | null) => {
    if (files && files.length > 0) {
      handleFileImport(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const getBorderColor = () => {
    if (status === 'success') return 'border-green-500';
    if (status === 'error') return 'border-red-500';
    if (status === 'importing') return 'border-blue-500';
    if (isDragging) return 'border-blue-400';
    return 'border-black/15';
  };

  const getBackgroundColor = () => {
    if (status === 'success') return 'bg-green-50';
    if (status === 'error') return 'bg-red-50';
    if (status === 'importing') return 'bg-blue-50';
    if (isDragging) return 'bg-blue-50';
    return 'bg-white';
  };

  return (
    <div className="mb-6">
      {/* Folder Selection */}
      <div className="mb-3 p-3 bg-white border border-black/15 rounded-[6px] shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-typewriter text-sm font-medium">📁 Import to folder:</span>
            {!showFolderInput ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-typewriter text-gray-600">
                  {selectedFolder || 'No folder (uncategorized)'}
                </span>
                <button
                  onClick={() => setShowFolderInput(true)}
                  className="text-xs font-typewriter px-2 py-1 border border-black/20 rounded hover:bg-gray-50 transition-colors"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={selectedFolder}
                  onChange={(e) => setSelectedFolder(e.target.value)}
                  placeholder="Enter folder name (e.g., Beatles, Rock, Jazz)"
                  className="px-3 py-1 text-sm font-typewriter border border-black/20 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => e.key === 'Enter' && setShowFolderInput(false)}
                />
                <button
                  onClick={() => setShowFolderInput(false)}
                  className="text-xs font-typewriter px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  OK
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => { setSelectedFolder(''); setShowFolderInput(false); }}
            className="text-xs font-typewriter px-2 py-1 border border-black/20 rounded hover:bg-gray-50 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Import Area */}
      <div
        className={`
          p-4 border-2 border-dashed rounded-[6px] transition-all cursor-pointer
          ${getBorderColor()} ${getBackgroundColor()}
          ${status === 'importing' ? 'cursor-wait' : 'hover:border-blue-400 hover:bg-blue-50'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={status !== 'importing' ? handleClick : undefined}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.jcrd"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          disabled={status === 'importing'}
        />

        <div className="text-center">
          {status === 'importing' && (
            <div className="flex items-center justify-center gap-2">
              <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              <span className="font-typewriter text-sm text-blue-600">Importing...</span>
            </div>
          )}

          {status === 'idle' && (
            <>
              <div className="text-2xl mb-2">🎵</div>
              <p className="font-typewriter text-sm font-medium text-gray-700">
                Drop song files here or click to browse
              </p>
              <p className="font-typewriter text-xs text-gray-500 mt-1">
                Supports .json and .jcrd formats
              </p>
            </>
          )}

          {(status === 'success' || status === 'error') && (
            <p className={`font-typewriter text-sm ${
              status === 'success' ? 'text-green-600' : 'text-red-600'
            }`}>
              {message}
            </p>
          )}
        </div>
      </div>

      {message && status === 'importing' && (
        <div className="mt-2 text-center">
          <p className="font-typewriter text-xs text-blue-600">{message}</p>
        </div>
      )}
    </div>
  );
}
