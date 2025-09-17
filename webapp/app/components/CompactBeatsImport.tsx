import React, { useState, useRef } from 'react';
import { useRouter } from 'next/router';

interface CompactSongImportProps {
  onSuccess?: () => void;
}

export default function CompactBeatsImport({ onSuccess }: CompactSongImportProps) {
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
      const fileContent = await file.text();

      let songTitle = file.name;
      try {
        const parsed = JSON.parse(fileContent);
        songTitle = parsed.metadata?.title || parsed.title || file.name;
      } catch {
        // If JSON parsing fails, just use filename
      }

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
      setMessage(`✓ "${songTitle}" imported with lyrics!`);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      if (onSuccess) {
        onSuccess();
      }

      // Auto-navigate after 1.5 seconds
      setTimeout(() => {
        router.push(`/songs/${result.id}`);
      }, 1500);

      // Reset status after 2.5 seconds
      setTimeout(() => {
        setStatus('idle');
        setMessage('');
      }, 2500);

    } catch (error) {
      setStatus('error');
      setMessage(`X Import failed: ${error.message}`);
      setTimeout(() => {
        setStatus('idle');
        setMessage('');
      }, 4000);
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
    <div className="space-y-3">
      {/* Status Message */}
      {message && (
        <div className={`p-2 rounded text-xs font-typewriter ${
          status === 'success' ? 'bg-green-50 text-green-700' :
          status === 'error' ? 'bg-red-50 text-red-700' :
          'bg-blue-50 text-blue-700'
        }`}>
          {message}
        </div>
      )}

      {/* Compact Drag & Drop Zone */}
      <div
        className={`border border-dashed rounded p-4 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-green-500 bg-green-50'
            : status === 'importing'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="font-typewriter text-black">
          {status === 'importing' ? (
            <>
              <span className="text-lg">Loading...</span>
              <div className="text-sm mt-1">Importing with auto-lyrics...</div>
            </>
          ) : isDragging ? (
            <>
              <span className="text-lg">Ready</span>
              <div className="text-sm mt-1 text-green-600 font-bold">Drop song file!</div>
            </>
          ) : (
            <>
              <span className="text-lg">Import</span>
              <div className="text-sm mt-1">
                <strong>Drop .jcrd.json file</strong> or click to browse
              </div>
            </>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.jcrd"
          onChange={handleFileSelect}
          className="hidden"
          disabled={status === 'importing'}
        />
      </div>
    </div>
  );
}
