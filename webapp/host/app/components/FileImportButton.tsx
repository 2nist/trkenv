import { useState, useRef } from "react";

interface SimpleImportProps {
  onSuccess?: () => void;
}

export default function SimpleImport({ onSuccess }: SimpleImportProps) {
  const [status, setStatus] = useState<'idle' | 'importing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus('importing');
    setMessage('Importing...');

    try {
      // Read the file
      const text = await file.text();

      let songData: any = {};

      // Try to parse JSON files
      if (file.name.endsWith('.json') || file.name.endsWith('.jcrd')) {
        try {
          const parsed = JSON.parse(text);
          songData = {
            title: parsed.metadata?.title || parsed.title || parsed.name || file.name.replace(/\.[^/.]+$/, ''),
            artist: parsed.metadata?.artist || parsed.artist || 'Unknown',
            content: text
          };
        } catch {
          songData = {
            title: file.name.replace(/\.[^/.]+$/, ''),
            artist: 'Unknown',
            content: text
          };
        }
      } else {
        songData = {
          title: file.name.replace(/\.[^/.]+$/, ''),
          artist: 'Unknown',
          content: text
        };
      }

      // Send to backend
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';
      console.log('=== FileImportButton Debug ===');
      console.log('API Base:', apiBase);
      console.log('Sending to:', `${apiBase}/songs`);
      console.log('Data:', songData);
      console.log('Starting fetch...');

      const response = await fetch(`${apiBase}/songs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(songData)
      });

      console.log('Response received:', response);
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      console.log('Response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to import: ${response.status} ${errorText}`);
      }

      setStatus('success');
      setMessage(`✓ Imported "${songData.title}"`);

      console.log('=== Success! Calling onSuccess callback ===');
      if (onSuccess) {
        console.log('onSuccess callback exists, calling it...');
        onSuccess();
        console.log('onSuccess callback called');
      } else {
        console.log('No onSuccess callback provided');
      }

      // Reset after 2 seconds
      setTimeout(() => {
        setStatus('idle');
        setMessage('');
        if (fileInputRef.current) fileInputRef.current.value = '';
      }, 2000);

    } catch (error) {
      console.log('=== Import Error ===');
      console.error('Error details:', error);
      console.log('Error type:', typeof error);
      console.log('Error message:', error?.message);
      setStatus('error');
      setMessage('Import failed');
      setTimeout(() => {
        setStatus('idle');
        setMessage('');
      }, 3000);
    }
  };

  return (
    <div className="inline-flex items-center gap-2">
      <label className={`
        px-3 py-1 text-xs rounded cursor-pointer transition-colors
        ${status === 'importing' ? 'bg-blue-100 text-blue-700' :
          status === 'success' ? 'bg-green-100 text-green-700' :
          status === 'error' ? 'bg-red-100 text-red-700' :
          'bg-gray-100 hover:bg-gray-200 text-gray-700'}
      `}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".jcrd,.json,.mid,.txt"
          onChange={handleFileSelect}
          disabled={status === 'importing'}
          className="hidden"
        />
        {status === 'importing' ? 'Importing...' :
         status === 'success' ? 'Success!' :
         status === 'error' ? 'Failed' : 'Import File'}
      </label>

      {message && status !== 'idle' && (
        <span className="text-xs text-gray-600">{message}</span>
      )}
    </div>
  );
}
