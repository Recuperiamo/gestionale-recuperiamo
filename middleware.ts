// @ts-nocheck
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

const PROFILE_PATH = "/profilo";

export async function middleware(request) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const role = token?.role ? String(token.role).toLowerCase() : "";

  const pathname = request.nextUrl.pathname;

  // Dashboard: solo admin
  if (pathname === "/") {
    if (role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = PROFILE_PATH;
      return NextResponse.redirect(url);
    }
  }

  // Storico: solo admin
  if (pathname.startsWith("/storico")) {
    if (role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = PROFILE_PATH;
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

// Applica il middleware alle rotte protette
export const config = {
  matcher: ["/", "/storico/:path*"],
};