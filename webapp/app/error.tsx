import React from 'react'
import Link from 'next/link'

export default function GlobalError({ error }: { error: Error }) {
  console.error('Global app error:', error)
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="mt-2">{String(error?.message || 'An unexpected error occurred.')}</p>
      <div className="mt-4">
        <Link href="/">Return home</Link>
      </div>
    </main>
  )
}
