import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatRole } from "@/lib/format-role";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { CalculatorButton } from "@/components/dashboard/calculator-button";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const hotel = session.user.hotelId
    ? await prisma.hotel.findUnique({ where: { id: session.user.hotelId } })
    : null;

  const enabledHotelModules = session.user.hotelId
    ? await prisma.hotelModule.findMany({
        where: { hotelId: session.user.hotelId, enabled: true },
        include: { module: true },
      })
    : [];

  const enabledModuleSlugs = enabledHotelModules.map(
    (hotelModule) => hotelModule.module.slug
  );

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar enabledModuleSlugs={enabledModuleSlugs} />
        <SidebarInset>
          <DashboardHeader
            hotelName={hotel?.name ?? "Protel"}
            roleLabel={formatRole(session.user.role)}
          />
          <main className="flex flex-1 flex-col gap-6 p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
      <CalculatorButton />
      <Toaster />
    </TooltipProvider>
  );
}
