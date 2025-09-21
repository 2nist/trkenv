'use client'

import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import SimpleImport from '../components/FileImportButton'
import { registerMp3Encoder } from '@mediabunny/mp3-encoder'

const SongSearch = dynamic(
  () => import('@/src/components/SongSearch').then(m => m.SongSearch),
  { ssr: false }
)

export default function SongsPage(){
  const [exported, setExported] = useState<any | null>(null)
  const [streamingFile, setStreamingFile] = useState<File | null>(null)
  const [streamingStatus, setStreamingStatus] = useState<string>('')
  const [isRecording, setIsRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDevice, setSelectedDevice] = useState<string>('')
  const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'

  useEffect(() => {
    // Register MP3 encoder for MediaRecorder
    registerMp3Encoder()
  }, [])

  useEffect(() => {
    const loadDevices = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true })
        const deviceList = await navigator.mediaDevices.enumerateDevices()
        setDevices(deviceList.filter(d => d.kind === 'audioinput'))
      } catch (error) {
        console.error('Error loading audio devices:', error)
      }
    }
    loadDevices()
  }, [])

  async function doExport(){
    const r = await fetch(`${API}/admin/export`)
    const data = await r.json()
    setExported(data)
  }

  function downloadDb(){
    // use direct navigation so browser will download the DB
    window.location.href = `${API}/admin/db/download`
  }

  async function doStream(){
    if (!streamingFile) return
    setStreamingStatus('Uploading...')
    try {
      const formData = new FormData()
      formData.append('file', streamingFile)
      const r = await fetch(`${API}/recordings/upload`, {
        method: 'POST',
        body: formData
      })
      if (r.ok) {
        const { jobId } = await r.json()
        setStreamingStatus('Processing...')
        
        // Poll for job completion
        const pollJob = async (): Promise<string> => {
          const statusRes = await fetch(`${API}/jobs/${jobId}`)
          if (!statusRes.ok) {
            throw new Error(`Job status check failed: ${statusRes.status}`)
          }
          const status = await statusRes.json()
          if (status.status === "done") {
            return status.draftId
          } else if (status.status === "error") {
            throw new Error("File processing failed")
          } else {
            // Still running, wait and retry
            await new Promise(resolve => setTimeout(resolve, 1000))
            return pollJob()
          }
        }

        const draftId = await pollJob()
        // Create song from draft
        const songRes = await fetch(`${API}/songs/from-draft`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ draftId }),
        })
        if (songRes.ok) {
          const { id } = await songRes.json()
          setStreamingStatus(`Song created: ${id}`)
        } else {
          setStreamingStatus(`Song creation failed: ${songRes.status}`)
        }
      } else {
        setStreamingStatus(`Upload failed: ${r.status}`)
      }
    } catch (e) {
      setStreamingStatus(`Error: ${e}`)
    }
  }

  const startRecording = async () => {
    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: selectedDevice ? { exact: selectedDevice } : undefined,
          sampleRate: 44100,
          channelCount: 2,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleSize: 16
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)

      // Check for supported mime types, preferring MP3
      let mimeType = 'audio/mpeg'
      let contentType = 'audio/mpeg'
      let fileExtension = 'mp3'

      if (!MediaRecorder.isTypeSupported(mimeType)) {
        // Fallback to WebM if MP3 not supported
        mimeType = 'audio/webm'
        contentType = 'audio/webm'
        fileExtension = 'webm'
        console.log('MP3 not supported, falling back to WebM')
      }

      const recorder = new MediaRecorder(stream, { mimeType })
      const chunks: Blob[] = []
      recorder.ondataavailable = (e) => chunks.push(e.data)
      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: contentType })
        await streamToSong(audioBlob, fileExtension)
        stream.getTracks().forEach(track => track.stop())
      }
      recorder.start()
      setMediaRecorder(recorder)
      setIsRecording(true)
    } catch (e) {
      console.error('Recording failed:', e)
    }
  }

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop()
      setIsRecording(false)
    }
  }

  const streamToSong = async (audioBlob: Blob, fileExtension: string = 'mp3') => {
    const formData = new FormData()
    formData.append('file', audioBlob, `recording.${fileExtension}`)
    try {
      const r = await fetch(`${API}/recordings/upload`, {
        method: 'POST',
        body: formData
      })
      if (r.ok) {
        const { jobId } = await r.json()
        
        // Poll for job completion
        const pollJob = async (): Promise<string> => {
          const statusRes = await fetch(`${API}/jobs/${jobId}`)
          if (!statusRes.ok) {
            throw new Error(`Job status check failed: ${statusRes.status}`)
          }
          const status = await statusRes.json()
          if (status.status === "done") {
            return status.draftId
          } else if (status.status === "error") {
            throw new Error("Recording processing failed")
          } else {
            // Still running, wait and retry
            await new Promise(resolve => setTimeout(resolve, 1000))
            return pollJob()
          }
        }

        const draftId = await pollJob()
        // Create song from draft
        const songRes = await fetch(`${API}/songs/from-draft`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ draftId }),
        })
        if (songRes.ok) {
          const { id } = await songRes.json()
          alert(`Song created: ${id}`)
        } else {
          alert(`Song creation failed: ${songRes.status}`)
        }
      } else {
        alert(`Upload failed: ${r.status}`)
      }
    } catch (e) {
      alert(`Error: ${e}`)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="font-dymo text-2xl mb-3">Songs</h1>
      <div className="mb-4 flex items-center gap-2">
        <button className="btn-tape mr-2" onClick={doExport}>Export Songs</button>
        <button className="btn-tape" onClick={downloadDb}>Download DB</button>
        <div className="ml-auto">
          <SimpleImport onSuccess={() => { /* no-op: FileImportButton will POST and we rely on SongSearch to refresh */ }} />
        </div>
      </div>

      {/* Streaming Section */}
      <div className="mb-4 p-4 border border-[color:var(--border,#2a2d33)] rounded bg-[color:var(--surface,#0f1216)]">
        <h3 className="text-lg mb-2">Stream Audio to Song</h3>
        <div className="flex items-center gap-2 mb-2">
          <label htmlFor="stream-file" className="text-sm">Select audio file:</label>
          <input
            id="stream-file"
            type="file"
            accept="audio/*"
            onChange={(e) => setStreamingFile(e.target.files?.[0] || null)}
            className="text-sm"
          />
          <button
            className="btn-tape"
            onClick={doStream}
            disabled={!streamingFile}
          >
            Stream & Create Song
          </button>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="audio-device" className="text-sm">Audio Device:</label>
          <select
            id="audio-device"
            value={selectedDevice}
            onChange={(e) => setSelectedDevice(e.target.value)}
            className="text-sm bg-[color:var(--surface,#0f1216)] border border-[color:var(--border,#2a2d33)] rounded px-2 py-1"
          >
            <option value="">Default</option>
            {devices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Device ${device.deviceId.slice(0, 8)}`}
              </option>
            ))}
          </select>
          <button
            className={`btn-tape ${isRecording ? 'bg-red-500' : ''}`}
            onClick={isRecording ? stopRecording : startRecording}
          >
            {isRecording ? 'Stop Recording' : 'Record from Microphone'}
          </button>
        </div>
        {streamingStatus && <p className="text-sm mt-2">{streamingStatus}</p>}
      </div>

      {exported && (
        <div className="mb-4 p-2 border border-[color:var(--border,#2a2d33)] rounded bg-[color:var(--surface,#0f1216)] text-[color:var(--text,#f5f5f5)]">
          <h3>Exported {exported.exported} songs</h3>
          <pre className="text-xs">{JSON.stringify(exported.songs.slice(0,20), null, 2)}</pre>
        </div>
      )}

      <SongSearch />
    </div>
  )
}
