import React from 'react';
import { ThemeSelector } from '../src/theme/ThemeProvider';

export default function DesignSystem() {
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="app-header">
        <div className="mx-auto max-w-6xl h-14 flex items-center justify-between px-4">
          <h1 className="text-xl font-semibold">TRK</h1>
          <nav className="flex items-center gap-3">
            <button className="btn">primary</button>
            <button className="tape-btn hidden [html.theme-sharpie_&]:inline-flex">new track</button>
            <button className="btn-funky hidden [html.theme-funky_&]:inline-flex">funky</button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-4 grid lg:grid-cols-[280px_1fr] gap-6">
        <aside className="app-sidebar card">
          <ThemeSelector />
        </aside>

        <section className="space-y-6">
          <div className="card">
            <h2 className="text-lg font-semibold">Cards use semantic tokens</h2>
            <p className="text-sm opacity-80">Swap themes above to see it re-skin instantly.</p>
          </div>
          <div className="card">
            <h3 className="text-base font-semibold">Folder panel (Sharpie only)</h3>
            <div className="folder-panel p-4 mt-3">Looks like a manila folder.</div>
          </div>
        </section>
      </main>
    </div>
  );
}
