"use client"
import React from 'react'
import Link from 'next/link'
import styles from './Sidebar.module.css'

export default function Sidebar(){
  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>TRK</div>
      <nav>
        <ul>
          <li><Link href="/palettes">Palettes</Link></li>
          <li><Link href="/mockup">Mockup</Link></li>
        </ul>
      </nav>
    </aside>
  )
}
