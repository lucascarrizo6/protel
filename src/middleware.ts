import { withAuth } from "next-auth/middleware";

// Configured directly (rather than importing authOptions) so this stays
// edge-runtime safe: authOptions pulls in the Prisma adapter, which needs Node APIs.
export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: ["/dashboard/:path*"],
};
