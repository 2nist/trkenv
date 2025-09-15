import { useState } from 'react';

export default function TestApi() {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const testApiCall = async () => {
    setLoading(true);
    setResult('Testing...');

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';
      console.log('API Base:', apiBase);

      // Test GET first
      const getResponse = await fetch(`${apiBase}/songs`);
      console.log('GET Response:', getResponse);

      if (!getResponse.ok) {
        throw new Error(`GET failed: ${getResponse.status}`);
      }

      const songs = await getResponse.json();
      console.log('Songs:', songs);

      // Test POST
      const postData = {
        title: "Frontend Test",
        artist: "Frontend",
        content: "Test from frontend"
      };

      const postResponse = await fetch(`${apiBase}/songs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData)
      });

      console.log('POST Response:', postResponse);

      if (!postResponse.ok) {
        throw new Error(`POST failed: ${postResponse.status}`);
      }

      const newSong = await postResponse.json();
      console.log('New song:', newSong);

      setResult(`SUCCESS! GET returned ${songs.length} songs. POST created song with ID ${newSong.id}`);

    } catch (error) {
      console.error('API test error:', error);
      setResult(`ERROR: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">API Test Page</h1>
      <button
        onClick={testApiCall}
        disabled={loading}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Test API'}
      </button>
      <div className="mt-4 p-4 bg-gray-100 rounded">
        <h2 className="font-bold">Result:</h2>
        <pre className="mt-2 whitespace-pre-wrap">{result}</pre>
      </div>
    </div>
  );
}
