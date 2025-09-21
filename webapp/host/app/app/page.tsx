"use client"
import React, {useEffect, useState} from 'react'
import AppShell from 'src/components/AppShell'
import HealthIndicator from 'src/components/HealthIndicator'
import styles from './page.module.css'
import Link from 'next/link'

export default function Page() {
  const [status, setStatus] = useState<{ok: boolean; version?: string} | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    // Default to the local backend in dev so Next's own routes don't get fetched
    const defaultBase = 'http://127.0.0.1:8000'
    const base = process.env.NEXT_PUBLIC_API_BASE || defaultBase
    const url = `${base.replace(/\/$/, '')}/api/health`
    fetch(url)
      .then((r) => r.json())
      .then((j) => setStatus(j))
      .catch((e) => setError(String(e)))
  }, [])

  return (
    <AppShell>
      <main className={styles.root}>
        <h1>Welcome to TRK Host</h1>
        <p className={styles.lead}>Use this interface to explore the theme & palette tools.</p>

        <section className={styles.section}>
          <h2>Quick links</h2>
          <ul>
            <li><Link href="/palettes">Palettes</Link></li>
            <li><Link href="/mockup">Mockup</Link></li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Backend status <small className={styles.statusHeaderSmall}><HealthIndicator ok={!!status?.ok} /></small></h2>
          {error && <div className={styles.error}>Error: {error}</div>}
          {status ? (
            <pre className={styles.statusBox}>{JSON.stringify(status, null, 2)}</pre>
          ) : (
            <div>Loading...</div>
          )}
        </section>
      </main>
    </AppShell>
  )
}
