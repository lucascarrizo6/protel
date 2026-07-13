import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SignOutButton } from "@/components/dashboard/sign-out-button";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b bg-background px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-foreground text-sm font-semibold text-background">
            P
          </div>
          <span className="text-sm font-semibold tracking-tight">
            Protel · Panel de Super Administrador
          </span>
        </div>
        <SignOutButton />
      </header>
      <main className="flex flex-1 flex-col gap-6 p-6">{children}</main>
    </div>
  );
}
