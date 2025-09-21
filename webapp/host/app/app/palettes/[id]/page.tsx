"use client"
import React, {useState} from 'react'
import AppShell from 'src/components/AppShell'
import { usePaletteDetail, updatePaletteName } from 'src/hooks/usePaletteDetail'
import styles from './palette.module.css'
import { useRouter } from 'next/navigation'
import ConflictDialog from 'src/components/ConflictDialog'

export default function PaletteDetail({ params }:{ params:{ id: string } }){
  const id = params.id
  const { detail, etag, mutate } = usePaletteDetail(id)
  const [name, setName] = useState(detail?.name || '')
  const [msg, setMsg] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [conflictOpen, setConflictOpen] = useState(false)
  const [lastError, setLastError] = useState<any>(null)
  const router = useRouter()

  React.useEffect(()=>{ setName(detail?.name || '') }, [detail?.name])

  async function saveName(){
    setMsg(null)
    setLastError(null)
    setSaving(true)
    // optimistic update of cached detail
    const optimistic = {...(detail||{}), name}
    try{
      await mutate(async ()=>{
        const res = await updatePaletteName(id, name, etag)
        return res || { data: optimistic, etag }
      }, { optimisticData: { data: optimistic, etag }, rollbackOnError: true })
      setMsg('Saved')
    }catch(e:any){
      // handle ETag conflict
      if(e && e.status === 409){
        setLastError(e)
        setConflictOpen(true)
      }else{
        setLastError(e)
        setMsg(String(e))
      }
    }finally{ setSaving(false) }
  }

  async function snapshot(){
    try{
      await fetch(`/api/palettes/${id}/snapshot`, { method: 'POST' })
      setMsg('Snapshot created')
      mutate()
    }catch(e:any){ setMsg(String(e)) }
  }

  return (
    <AppShell>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Palette: {id}</h1>
          <div className={styles.meta}>ETag: <code>{etag || '—'}</code></div>
        </div>
        <div className={styles.controls}>
          <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Palette name" />
          <button onClick={saveName} disabled={saving}>{saving? 'Saving...':'Rename'}</button>
          <button onClick={snapshot}>Snapshot</button>
          <button onClick={()=>router.push('/palettes')}>Back</button>
        </div>

        <pre className={styles.doc}>{JSON.stringify(detail?.doc||{}, null, 2)}</pre>
        {msg && <div className={styles.msg}>{msg}</div>}
  {lastError && <div className={`${styles.msg} ${styles.error}`}>Error: {String(lastError?.body ?? lastError?.message ?? lastError)}</div>}
        {conflictOpen && (
          <ConflictDialog
            onClose={()=>setConflictOpen(false)}
            onRefresh={async ()=>{
              await mutate()
              setConflictOpen(false)
            }}
            onOverwrite={async ()=>{
              // retry without If-Match (overwrite)
              setConflictOpen(false)
              setSaving(true)
              try{
                await mutate(async ()=>{
                  const res = await updatePaletteName(id, name, undefined)
                  return res || {...(detail||{}), name}
                }, { optimisticData: { data: {...(detail||{}), name}, etag: undefined }, rollbackOnError:true })
                setMsg('Overwrote remote')
              }catch(e:any){
                setLastError(e)
              }finally{ setSaving(false) }
            }}
          />
        )}
      </div>
    </AppShell>
  )
}
