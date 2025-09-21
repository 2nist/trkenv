"use client"
import React from 'react'
import AppShell from 'src/components/AppShell'
import { usePalettes } from 'src/hooks/usePalettes'
import css from './styles.module.css'

export default function PalettesPage(){
  const { items, isLoading, error } = usePalettes()
  return (
    <AppShell>
      <div className={css.wrap}>
        <h1>Palettes</h1>
        {isLoading && <div>Loading...</div>}
        {error && <div className={css.error}>Error loading palettes</div>}
        <ul>
          {items.map(p => (
            <li key={p.id}>{p.name} <small className={css.itemSmall}>({p.id})</small></li>
          ))}
        </ul>
      </div>
    </AppShell>
  )
}
