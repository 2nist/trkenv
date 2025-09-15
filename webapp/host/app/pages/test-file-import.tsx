import { useState, useRef } from "react";

export default function TestFileImport() {
  const [status, setStatus] = useState<'idle' | 'importing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const testImportFunction = async () => {
    console.log('=== Test Import Debug ===');

    // Simulate file data like the FileImportButton does
    const testSongData = {
      title: "Manual Test Song",
      artist: "Test Artist",
      content: JSON.stringify({ test: "data", imported: true })
    };

    setStatus('importing');
    setMessage('Importing...');

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';
      console.log('API Base:', apiBase);
      console.log('Sending to:', `${apiBase}/songs`);
      console.log('Data:', testSongData);
      console.log('Starting fetch...');

      const response = await fetch(`${apiBase}/songs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testSongData)
      });

      console.log('Response received:', response);
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to import: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log('Success result:', result);

      setStatus('success');
      setMessage(`✓ Imported "${testSongData.title}"`);

      // Reset after 2 seconds like the real component
      setTimeout(() => {
        setStatus('idle');
        setMessage('');
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log('=== Real File Import Test ===');
    console.log('File:', file.name, file.size, file.type);

    setStatus('importing');
    setMessage('Importing...');

    try {
      // Read the file like the real component
      const text = await file.text();
      console.log('File content:', text.substring(0, 200) + '...');

      let songData: any = {};

      // Try to parse JSON files like the real component
      if (file.name.endsWith('.json') || file.name.endsWith('.jcrd')) {
        try {
          const parsed = JSON.parse(text);
          songData = {
            title: parsed.title || parsed.name || file.name.replace(/\.[^/.]+$/, ''),
            artist: parsed.artist || 'Unknown',
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

      // Send to backend using exact same code as FileImportButton
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';
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

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to import: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log('Success result:', result);

      setStatus('success');
      setMessage(`✓ Imported "${songData.title}"`);

      // Reset after 2 seconds
      setTimeout(() => {
        setStatus('idle');
        setMessage('');
        if (fileInputRef.current) fileInputRef.current.value = '';
      }, 2000);

    } catch (error) {
      console.log('=== File Import Error ===');
      console.error('Error details:', error);
      setStatus('error');
      setMessage('Import failed: ' + error?.message);
      setTimeout(() => {
        setStatus('idle');
        setMessage('');
      }, 3000);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test File Import Component</h1>

      <div className="space-y-4">
        <button
          onClick={testImportFunction}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Test Import Function (No File)
        </button>

        <div>
          <label className={`
            px-3 py-1 text-xs rounded cursor-pointer transition-colors inline-block
            ${status === 'importing' ? 'bg-blue-100 text-blue-700' :
              status === 'success' ? 'bg-green-100 text-green-700' :
              status === 'error' ? 'bg-red-100 text-red-700' :
              'bg-gray-100 hover:bg-gray-200 text-gray-700'}
          `}>
            Choose File to Import
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              accept=".json,.jcrd,.txt"
              className="hidden"
            />
          </label>
        </div>

        {message && (
          <div className="mt-2 text-sm">
            Status: <span className="font-mono">{message}</span>
          </div>
        )}
      </div>
    </div>
  );
}
