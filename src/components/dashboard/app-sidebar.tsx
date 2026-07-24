"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BedDouble,
  CalendarCheck,
  CalendarDays,
  FileCog,
  Home,
  Receipt,
  Sparkles,
  Users,
} from "lucide-react";
import type { UserRole } from "@/generated/prisma/enums";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const navItems = [
  { title: "Inicio", href: "/dashboard", icon: Home, moduleSlug: null },
  { title: "Habitaciones", href: "/dashboard/habitaciones", icon: BedDouble, moduleSlug: null },
  {
    title: "Reservas",
    href: "/dashboard/reservas",
    icon: CalendarCheck,
    moduleSlug: "reservas",
  },
  {
    title: "Calendario",
    href: "/dashboard/calendario",
    icon: CalendarDays,
    moduleSlug: "calendario",
  },
  {
    title: "Grupos",
    href: "/dashboard/grupos",
    icon: Users,
    moduleSlug: "grupos",
  },
  {
    title: "Mucama",
    href: "/dashboard/mucama",
    icon: Sparkles,
    moduleSlug: "mucama",
  },
  {
    title: "Facturación",
    href: "/dashboard/facturacion",
    icon: Receipt,
    moduleSlug: "facturacion",
  },
  {
    title: "Huéspedes",
    href: "/dashboard/huespedes",
    icon: Users,
    moduleSlug: "huespedes",
  },
  {
    title: "Reportes",
    href: "/dashboard/reportes",
    icon: BarChart3,
    moduleSlug: "reportes",
  },
  {
    title: "Facturación AFIP",
    href: "/dashboard/configuracion",
    icon: FileCog,
    moduleSlug: null,
    roles: ["HOTEL_ADMIN"],
  },
] as const;

export function AppSidebar({
  enabledModuleSlugs,
  role,
}: {
  enabledModuleSlugs: string[];
  role: UserRole;
}) {
  const pathname = usePathname();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const visibleNavItems = navItems.filter(
    (item) =>
      (item.moduleSlug === null || enabledModuleSlugs.includes(item.moduleSlug)) &&
      (!("roles" in item) || (item.roles as readonly string[]).includes(role))
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div
          className={cn(
            "flex items-center gap-2.5 px-2 py-1.5",
            isCollapsed && "justify-center px-0"
          )}
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-foreground text-sm font-semibold text-background">
            P
          </div>
          {isCollapsed ? null : (
            <span className="text-sm font-semibold tracking-tight">
              Protel
            </span>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Propiedad</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleNavItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
