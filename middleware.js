 
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
 
const ADMIN_PATHS = ["/"]; // In futuro aggiungi qui altre route protette (es: "/admin")
const PROFILE_PATH = "/profilo";

export async function middleware(request) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  // Se si prova ad accedere a una pagina protetta (dashboard)
  if (ADMIN_PATHS.includes(request.nextUrl.pathname)) {
    if (!token || token.role !== "admin") {
      // Redirect a profilo se NON admin
      const url = request.nextUrl.clone();
      url.pathname = PROFILE_PATH;
      return NextResponse.redirect(url);
    }
  }
  // In futuro: aggiungi altre protezioni qui per altre route
  return NextResponse.next();
}

// Applica il middleware solo a queste route
export const config = {
  matcher: ["/"], // In futuro: aggiungi "/admin", "/impostazioni" ecc.
};