import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatRole } from "@/lib/format-role";
import { DEFAULT_HOTEL_MODULES } from "@/lib/super-admin";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { CalculatorButton } from "@/components/dashboard/calculator-button";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { UserRole } from "@/generated/prisma/enums";

function fetchHotelWithModules(hotelId: string) {
  return prisma.hotel.findUnique({
    where: { id: hotelId },
    include: { modules: true },
  });
}

// `hotelPromise` no se awaitea acá arriba: se pasa sin resolver para que el
// fetching de `children` (la página) arranque en paralelo en vez de esperar
// a que esta query del hotel termine primero.
async function SidebarSection({
  role,
  hotelPromise,
}: {
  role: UserRole;
  hotelPromise: ReturnType<typeof fetchHotelWithModules> | null;
}) {
  const hotel = hotelPromise ? await hotelPromise : null;
  return (
    <AppSidebar
      role={role}
      hotelModules={hotel?.modules ?? DEFAULT_HOTEL_MODULES}
    />
  );
}

async function HeaderSection({
  userName,
  roleLabel,
  hotelPromise,
}: {
  userName: string;
  roleLabel: string;
  hotelPromise: ReturnType<typeof fetchHotelWithModules> | null;
}) {
  const hotel = hotelPromise ? await hotelPromise : null;
  return (
    <DashboardHeader
      userName={userName}
      hotelName={hotel?.name ?? "Protel"}
      roleLabel={roleLabel}
    />
  );
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const hotelPromise = session.user.hotelId
    ? fetchHotelWithModules(session.user.hotelId)
    : null;
  const userName = session.user.name ?? "Usuario";
  const roleLabel = formatRole(session.user.role);

  return (
    <TooltipProvider>
      <SidebarProvider>
        <Suspense
          fallback={
            <AppSidebar role={session.user.role} hotelModules={null} />
          }
        >
          <SidebarSection role={session.user.role} hotelPromise={hotelPromise} />
        </Suspense>
        <SidebarInset>
          <Suspense
            fallback={
              <DashboardHeader
                userName={userName}
                hotelName="Protel"
                roleLabel={roleLabel}
              />
            }
          >
            <HeaderSection
              userName={userName}
              roleLabel={roleLabel}
              hotelPromise={hotelPromise}
            />
          </Suspense>
          <main className="flex flex-1 flex-col gap-6 bg-background p-6 md:p-8">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
      <CalculatorButton />
      <Toaster />
    </TooltipProvider>
  );
}
