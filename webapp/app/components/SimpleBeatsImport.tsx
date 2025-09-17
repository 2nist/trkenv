import React, { useState, useRef } from 'react';
import { useRouter } from 'next/router';

interface SimpleBeatsImportProps {
  onSuccess?: () => void;
}

export default function SimpleBeatsImport({ onSuccess }: SimpleBeatsImportProps) {
  const [status, setStatus] = useState<'idle' | 'importing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [isDragging, setIsDragging] = useState(false);
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
    setMessage(`Importing ${file.name}...`);

    try {
      // Read file content
      const fileContent = await file.text();

      // Parse JSON to get title for user feedback
      let songTitle = file.name;
      try {
        const parsed = JSON.parse(fileContent);
        songTitle = parsed.metadata?.title || parsed.title || file.name;
      } catch {
        // If JSON parsing fails, just use filename
      }

      // Send to the working endpoint
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';
      const response = await fetch(`${apiBase}/songs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: fileContent
      });

      if (!response.ok) {
        throw new Error(`Import failed: ${response.status}`);
      }

      const result = await response.json();

      setStatus('success');
      setMessage(`✅ "${songTitle}" imported with lyrics!`);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Call success callback
      if (onSuccess) {
        onSuccess();
      }

      // Auto-navigate to the new song after 2 seconds
      setTimeout(() => {
        router.push(`/songs/${result.id}`);
      }, 2000);

      // Reset status after 3 seconds
      setTimeout(() => {
        setStatus('idle');
        setMessage('');
      }, 3000);

    } catch (error) {
      setStatus('error');
      setMessage(`❌ Import failed: ${error.message}`);
      setTimeout(() => {
        setStatus('idle');
        setMessage('');
      }, 5000);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileImport(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileImport(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Status Message */}
      {message && (
        <div className={`p-3 rounded border font-typewriter text-sm ${
          status === 'success' ? 'bg-green-50 border-green-300 text-green-800' :
          status === 'error' ? 'bg-red-50 border-red-300 text-red-800' :
          'bg-blue-50 border-blue-300 text-blue-800'
        }`}>
          {message}
        </div>
      )}

      {/* Drag & Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
          isDragging
            ? 'border-green-500 bg-green-50'
            : status === 'importing'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="font-typewriter text-black">
          {status === 'importing' ? (
            <>
              <div className="text-4xl mb-4">⏳</div>
              <div className="font-bold mb-2">Importing song...</div>
              <div className="text-sm">Adding automatic lyrics from LRCLIB</div>
            </>
          ) : isDragging ? (
            <>
              <div className="text-4xl mb-4">📁</div>
              <div className="font-bold mb-2 text-green-600">Drop your Beatles file here!</div>
            </>
          ) : (
            <>
              <div className="text-4xl mb-4">🎵</div>
              <div className="font-bold mb-2">Import Beatles Song</div>
              <div className="text-sm mb-4">
                Drag & drop a <strong>.jcrd.json</strong> file here<br/>
                or click to browse your References folder
              </div>
            </>
          )}
        </div>

        {/* File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.jcrd"
          onChange={handleFileSelect}
          className="hidden"
          id="beatles-file-input"
          disabled={status === 'importing'}
        />

        {status !== 'importing' && (
          <label
            htmlFor="beatles-file-input"
            className="btn-tape-sm cursor-pointer inline-block"
          >
            Browse Files
          </label>
        )}
      </div>

      <div className="text-xs text-gray-600 font-typewriter">
        💡 <strong>Tip:</strong> Import any Beatles .jcrd.json file from your References/Beatles-Chords folder.
        Lyrics will be automatically added from LRCLIB!
      </div>
    </div>
  );
}
