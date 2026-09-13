import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// Configured directly (rather than importing authOptions) so this stays
// edge-runtime safe: authOptions pulls in the Prisma adapter, which needs Node APIs.
export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // 1. Bloqueo estricto para Mantenimiento
    if (token?.role === "MAINTENANCE") {
      if (!path.startsWith("/dashboard/mantenimiento")) {
        return NextResponse.redirect(new URL("/dashboard/mantenimiento", req.url));
      }
    }

    // 2. Bloqueo estricto para Mucamas
    if (token?.role === "HOUSEKEEPING") {
      if (!path.startsWith("/dashboard/mucama")) {
        return NextResponse.redirect(new URL("/dashboard/mucama", req.url));
      }
    }
  },
  {
    pages: {
      signIn: "/login",
    },
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*"],
};