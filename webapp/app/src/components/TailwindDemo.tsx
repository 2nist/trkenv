import React from 'react'

export default function TailwindDemo() {
  return (
    <div className="rounded-lg p-6 shadow-lg bg-[color:var(--surface,#fff)]">
      <h2 className="text-xl font-handwritten mb-2">Tailwind + Tokens Demo</h2>
      <p className="text-sm mb-4">This demo shows mixing Tailwind utilities with CSS variable tokens.</p>
      <div className="flex gap-3">
        <button className="px-4 py-2 rounded-md" style={{ background: 'var(--tape-bg)', color: 'var(--tape-color)', fontFamily: 'var(--font-handwritten)' }}>
          Token Button
        </button>
        <button className="px-4 py-2 rounded-md bg-brand text-white">Tailwind Button</button>
      </div>
    </div>
  )
}
