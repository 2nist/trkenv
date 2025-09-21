"use client"
import React, {useState} from 'react'
import styles from './styles.module.css'

type Section = { id: string; title: string }

const experiments: Section[] = [
  { id: 'exp-a', title: 'Experiment A' },
  { id: 'exp-b', title: 'Experiment B' },
]
const palettes: Section[] = [
  { id: 'p1', title: 'Palette One' },
  { id: 'p2', title: 'Drums Rack' },
  { id: 'p3', title: 'Basslines' },
]
const songs: Section[] = [
  { id: 's1', title: 'Sketch 2025-09-01' },
  { id: 's2', title: 'Beat 42' },
]

function List({items, onSelect, active}:{items: Section[]; onSelect:(id:string)=>void; active?:string}){
  return (
    <ul className={styles.list} aria-label="items">
      {items.map(it => (
        <li key={it.id} className={it.id===active?styles.active:styles.item} onClick={()=>onSelect(it.id)} tabIndex={0} onKeyDown={(e)=>{ if(e.key==='Enter') onSelect(it.id)}}>
          {it.title}
        </li>
      ))}
    </ul>
  )
}

export default function Mockup(){
  const [activeSection, setActiveSection] = useState<'experiments'|'palettes'|'songs'>('palettes')
  const [selectedId, setSelectedId] = useState<string | null>(palettes[0].id)

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>TRK</div>
        <nav>
          <button className={activeSection==='experiments'?styles.tabActive:styles.tab} onClick={()=>setActiveSection('experiments')}>Experiments</button>
          <button className={activeSection==='palettes'?styles.tabActive:styles.tab} onClick={()=>setActiveSection('palettes')}>Palettes</button>
          <button className={activeSection==='songs'?styles.tabActive:styles.tab} onClick={()=>setActiveSection('songs')}>Songs</button>
        </nav>
        <div className={styles.sectionTitle}>Quick Actions</div>
        <div className={styles.actions}>
          <button className={styles.action}>New Palette</button>
          <button className={styles.action}>Upload Song</button>
        </div>
      </aside>
      <div className={styles.main}>
        <header className={styles.topbar}>
          <div>TRK Host — mockup</div>
          <div className={styles.health}><span className={styles.healthy}></span> backend:127.0.0.1:8000</div>
        </header>
        <div className={styles.content}>
          <aside className={styles.listcol}>
            {activeSection==='experiments' && <List items={experiments} onSelect={(id)=>setSelectedId(id)} active={selectedId||undefined} />}
            {activeSection==='palettes' && <List items={palettes} onSelect={(id)=>setSelectedId(id)} active={selectedId||undefined} />}
            {activeSection==='songs' && <List items={songs} onSelect={(id)=>setSelectedId(id)} active={selectedId||undefined} />}
          </aside>
          <section className={styles.detail}>
            <h2>Detail view</h2>
            {selectedId ? (
              <div>
                <p>Selected id: <code>{selectedId}</code></p>
                <p>Here we would render the palette canvas, song timeline, or experiment UI.</p>
                <div className={styles.controls}>
                  <button>Open</button>
                  <button>Snapshot</button>
                  <button>Delete</button>
                </div>
              </div>
            ) : (
              <div>No item selected</div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
