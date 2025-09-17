import React from 'react';
import type { AppProps } from "next/app";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import localFont from "next/font/local";
import "../src/styles/globals.css";
import { ThemeSwitcher } from '../src/ui/theme-switcher';
import TopNav from '../src/components/nav/TopNav';
import SideNav from '../src/components/nav/SideNav';

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
      <TopNav>
        <ThemeSwitcher themes={themes} onSet={(t) => {
          if (typeof (window as any).trkSetTheme === 'function') (window as any).trkSetTheme(t);
          else {
            // try dynamic import fallback
                        import(window.location.origin + '/theme/theme-api.mjs').then((m: any) => m.trkSetTheme && m.trkSetTheme(t)).catch(()=>{});
          }
        }} />
      </TopNav>

      <div className="flex min-h-[calc(100vh-4rem)]">
        <SideNav />
        <main className="flex-1 bg-gray-50 p-6 overflow-auto">
          <Component {...pageProps} />
        </main>
      </div>
    </div>
  );
}
