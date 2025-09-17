import React, { useState } from 'react'
import dynamic from 'next/dynamic'
import SimpleImport from '../components/FileImportButton'

const SongSearch = dynamic(
  () => import('@/src/components/SongSearch').then(m => m.SongSearch),
  { ssr: false }
)

export default function SongsPage(){
  const [exported, setExported] = useState<any | null>(null)
  const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'

  async function doExport(){
    const r = await fetch(`${API}/admin/export`)
    const data = await r.json()
    setExported(data)
  }

  function downloadDb(){
    // use direct navigation so browser will download the DB
    window.location.href = `${API}/admin/db/download`
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

      {exported && (
        <div className="mb-4 p-2 border rounded bg-white">
          <h3>Exported {exported.exported} songs</h3>
          <pre className="text-xs">{JSON.stringify(exported.songs.slice(0,20), null, 2)}</pre>
        </div>
      )}

      <SongSearch />
    </div>
  )
}
