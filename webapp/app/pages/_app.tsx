import React from 'react';
import type { AppProps } from "next/app";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import localFont from "next/font/local";
import "../src/styles/globals.css";
import { ThemeSwitcher } from '../src/ui/theme-switcher';
import { AppLayout, useAppLayout } from '../src/components/AppLayout';

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
  const [themes, setThemes] = React.useState<string[]>([]);
  const appLayout = useAppLayout();
  const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8000';
  const enableThemeLoader = (process.env.NEXT_PUBLIC_ENABLE_THEME_LOADER === '1');

  React.useEffect(() => {
    if (!enableThemeLoader) return;
    // Dynamically import the ESM theme API (served from /theme/theme-api.mjs)
    if (typeof window === 'undefined') return;
    (async () => {
      try {
        // try to import the module from backend at runtime
        const mod = await import(/* @vite-ignore */ `${apiBase}/theme/theme-api.mjs`);
        if (typeof mod.trkLoadCurrent === 'function') {
          try { await mod.trkLoadCurrent(); } catch (e) {}
        } else if (typeof (window as any).trkLoadCurrent === 'function') {
          try { (window as any).trkLoadCurrent(); } catch (e) {}
        }

        // get available themes from API
        try {
          const r = await fetch(`${apiBase}/api/theme/list`);
          const data = await r.json();
          const list = Array.isArray(data?.themes) ? data.themes : [];
          setThemes(list.length ? list : ['midnight']);
        } catch (e) {
          setThemes(['midnight']);
        }
      } catch (e) {
        // if dynamic import fails, try global loader
        if (typeof (window as any).trkLoadCurrent === 'function') {
          try { (window as any).trkLoadCurrent(); } catch (err) { }
        }
        setThemes(['midnight']);
      }
    })();
  }, []);

  return (
    <div className={`min-h-screen bg-[var(--bg)] text-[var(--text)] ${handwritten.variable} ${typewriter.variable} ${dymo.variable}`}>
      {/* Top Navigation Bar */}
      <div className="bg-[var(--surface)] border-b border-[color:var(--border,#2a2d33)] px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-[var(--text)] font-dymo">TRK Lab</h1>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/" className="text-[color:var(--muted)] hover:text-[var(--text)] transition-colors">
                Home
              </Link>
              <Link href="/design" className="text-[color:var(--muted)] hover:text-[var(--text)] transition-colors">
                Design
              </Link>
              <Link href="/songs" className="text-[color:var(--muted)] hover:text-[var(--text)] transition-colors">
                Songs
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {/* Theme Editor intentionally hidden in this build */}
            {/* ThemeSwitcher also disabled by default; re-enable by setting NEXT_PUBLIC_ENABLE_THEME_LOADER=1 */}
            {false && enableThemeLoader && (
              <ThemeSwitcher themes={themes} onSet={(t) => {
                if (typeof (window as any).trkSetTheme === 'function') (window as any).trkSetTheme(t);
                else {
                  import(/* @vite-ignore */ `${apiBase}/theme/theme-api.mjs`).then((m: any) => m.trkSetTheme && m.trkSetTheme(t)).catch(()=>{});
                }
              }} />
            )}
          </div>
        </div>
      </div>

      {/* Main App Layout with Theme Editor Sidebar */}
      <AppLayout showThemeEditor={false} onToggleThemeEditor={() => {}}>
        <div className="p-6">
          <Component {...pageProps} />
        </div>
      </AppLayout>
    </div>
  );
}
