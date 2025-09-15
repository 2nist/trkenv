import type { AppProps } from "next/app";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import localFont from "next/font/local";
import "../src/styles/globals.css";

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

function ViewTab() {
  const router = useRouter();
  const items: Array<{ label: string; href: string; functional: boolean }> = [
    { label: "Library", href: "/library", functional: true },
    { label: "Timeline", href: "/timeline", functional: true },
    { label: "Design", href: "/design", functional: true },
    { label: "Record", href: "/record", functional: true },
    { label: "Editor", href: "/editor", functional: true },
  ];
  return (
    <div className="w-full sticky top-0 z-40 bg-white border-b border-black/15 py-2">
      <div className="max-w-6xl mx-auto px-3 flex items-center justify-between h-16">
        {/* Logo on the left */}
        <div className="flex items-center w-32">
          <Link href="/" className="flex items-center">
            <Image
              src="/logo.png"
              alt="Track Logo"
              width={80}
              height={80}
              className="object-contain"
              priority
            />
          </Link>
        </div>

        {/* Tabs justified to the right */}
        <div className="flex items-center gap-0">
          {items.map((it) => {
            const isRecord = it.label === "Record";
            const active =
              router.pathname === it.href ||
              router.pathname.startsWith(it.href + "/");

            let dymoClass = "dymo-tab";
            if (active) dymoClass += " active";
            if (isRecord) dymoClass += " record";
            if (!it.functional) dymoClass += " opacity-60 cursor-not-allowed";

            return (
              <Link key={it.label} href={it.href} legacyBehavior>
                <a
                  className={dymoClass}
                  aria-disabled={!it.functional}
                  onClick={(e) => {
                    if (!it.functional) e.preventDefault();
                  }}
                  title={it.functional ? it.label : `${it.label} (coming soon)`}
                >
                  {it.label}
                </a>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className={`min-h-screen bg-[#B79F7C] text-black ${handwritten.variable} ${typewriter.variable} ${dymo.variable}`}>
      <ViewTab />
      <div className="max-w-6xl mx-auto px-3 py-3">
        <Component {...pageProps} />
      </div>
    </div>
  );
}
