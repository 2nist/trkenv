import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  // Allow everything except gating /legacy when disabled
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/legacy")) {
    const enabled =
      process.env.NEXT_PUBLIC_ENABLE_LEGACY === "true" ||
      process.env.ENABLE_LEGACY === "true";
    if (!enabled) {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/legacy/:path*"],
};
