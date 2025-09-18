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

  React.useEffect(() => {
    // Dynamically import the ESM theme API (served from /theme/theme-api.mjs)
    if (typeof window === 'undefined') return;
    (async () => {
      try {
  // try to import the module at runtime; use an expression so bundlers don't resolve it at build time
    const mod = await import(window.location.origin + '/theme/theme-api.mjs');
        if (typeof mod.trkLoadCurrent === 'function') {
          try { await mod.trkLoadCurrent(); } catch (e) {}
        } else if (typeof (window as any).trkLoadCurrent === 'function') {
          try { (window as any).trkLoadCurrent(); } catch (e) {}
        }

        // try to fetch the themes directory listing by reading a known themes list
        // fallback: use a hard-coded list if the server doesn't provide one
        try {
          const r = await fetch('/theme/themes/list.json');
          if (r.ok) {
            const data = await r.json();
            setThemes(Array.isArray(data) ? data : []);
          } else {
            setThemes(['midnight']);
          }
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
    <div className={`min-h-screen bg-white text-gray-900 ${handwritten.variable} ${typewriter.variable} ${dymo.variable}`}>
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-gray-900 font-dymo">TRK Lab</h1>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/" className="text-gray-600 hover:text-gray-900 transition-colors">
                Home
              </Link>
              <Link href="/design" className="text-gray-600 hover:text-gray-900 transition-colors">
                Design
              </Link>
              <Link href="/songs" className="text-gray-600 hover:text-gray-900 transition-colors">
                Songs
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {/* Theme Editor Toggle Button */}
            <button
              onClick={appLayout.toggleThemeEditor}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                appLayout.showThemeEditor
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
              }`}
              title={appLayout.showThemeEditor ? 'Show Navigation' : 'Show Theme Editor'}
            >
              {appLayout.showThemeEditor ? 'Navigation' : 'Theme Editor'}
            </button>

            <ThemeSwitcher themes={themes} onSet={(t) => {
              if (typeof (window as any).trkSetTheme === 'function') (window as any).trkSetTheme(t);
              else {
                // try dynamic import fallback
                        import(window.location.origin + '/theme/theme-api.mjs').then((m: any) => m.trkSetTheme && m.trkSetTheme(t)).catch(()=>{});
              }
            }} />
          </div>
        </div>
      </div>

      {/* Main App Layout with Theme Editor Sidebar */}
      <AppLayout
        showThemeEditor={appLayout.showThemeEditor}
        onToggleThemeEditor={appLayout.toggleThemeEditor}
      >
        <div className="p-6">
          <Component {...pageProps} />
        </div>
      </AppLayout>
    </div>
  );
}
