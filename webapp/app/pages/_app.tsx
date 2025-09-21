import React, { Suspense } from 'react';
import type { AppProps } from "next/app";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import localFont from "next/font/local";
import "../src/styles/globals.css";
import "../src/styles/app.css";
import { AppLayout } from '../src/components/AppLayout';

// Sharpie handwritten style for header tabs and buttons
const handwritten = localFont({
  src: "../public/fonts/Sharpie-Regular.ttf",
  display: "swap",
  variable: "--font-handwritten",
});

// Typewriter style for main content
const typewriter = localFont({
  src: "../public/fonts/Tox Typewriter.ttf",
  display: "swap",
  variable: "--font-typewriter",
});

// DYMO label style for bracket labels
const dymo = localFont({
  src: "../public/fonts/Dymo.ttf",
  display: "swap",
  variable: "--font-dymo",
});

// The site's top navigation is provided by the TopNav component

export default function App({ Component, pageProps }: AppProps) {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8000';

  return (
    <div className={`min-h-screen bg-[color:var(--bg,#0b0b0b)] text-[color:var(--text,#f5f5f5)] ${handwritten.variable} ${typewriter.variable} ${dymo.variable}`}>
      {/* Top Navigation Bar */}
      <div className="bg-[color:var(--surface,#0f1216)] border-b border-[color:var(--border,#2a2d33)] px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-[var(--text)] font-dymo">TRK Lab</h1>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/" className="text-[color:var(--muted,#9aa2ad)] hover:text-[color:var(--text,#f5f5f5)] transition-colors">
                Home
              </Link>
              <Link href="/design" className="text-[color:var(--muted,#9aa2ad)] hover:text-[color:var(--text,#f5f5f5)] transition-colors">
                Design
              </Link>
              <Link href="/songs" className="text-[color:var(--muted,#9aa2ad)] hover:text-[color:var(--text,#f5f5f5)] transition-colors">
                Songs
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {/* Theme editor and theme switcher removed in this build */}
          </div>
        </div>
      </div>

      {/* Main App Layout with Theme Editor Sidebar */}
      <Suspense fallback={<div className="min-h-screen bg-[color:var(--bg,#0b0b0b)] text-[color:var(--text,#f5f5f5)] flex items-center justify-center">Loading...</div>}>
        <AppLayout showThemeEditor={false} onToggleThemeEditor={() => {}}>
          <div className="p-6">
            <Component {...pageProps} />
          </div>
        </AppLayout>
      </Suspense>
    </div>
  );
}
