"use client";

import { useEffect, useState } from "react";
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
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import type { UserRole } from "@/generated/prisma/enums";
import type { HotelModuleKey } from "@/lib/super-admin";
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
  { title: "Inicio", href: "/dashboard", icon: Home, moduleKey: null },
  { title: "Habitaciones", href: "/dashboard/habitaciones", icon: BedDouble, moduleKey: null },
  {
    title: "Reservas",
    href: "/dashboard/reservas",
    icon: CalendarCheck,
    moduleKey: null,
  },
  {
    title: "Calendario",
    href: "/dashboard/calendario",
    icon: CalendarDays,
    moduleKey: "calendario",
  },
  {
    title: "Grupos",
    href: "/dashboard/grupos",
    icon: Users,
    moduleKey: "grupos",
  },
  {
    title: "Mucama",
    href: "/dashboard/mucama",
    icon: Sparkles,
    moduleKey: "mucama",
  },
  {
    title: "Facturación",
    href: "/dashboard/facturacion",
    icon: Receipt,
    moduleKey: null,
  },
  {
    title: "Huéspedes",
    href: "/dashboard/huespedes",
    icon: Users,
    moduleKey: null,
  },
  {
    title: "Reportes",
    href: "/dashboard/reportes",
    icon: BarChart3,
    moduleKey: null,
  },
  {
    title: "Facturación AFIP",
    href: "/dashboard/configuracion",
    icon: FileCog,
    moduleKey: "afip",
    roles: ["HOTEL_ADMIN"],
  },
  {
    title: "Super Admin",
    href: "/dashboard/super-admin",
    icon: ShieldCheck,
    moduleKey: null,
    roles: ["SUPER_ADMIN"],
  },
] as const;

type HotelModulesState = Record<HotelModuleKey, boolean> | null;

export function AppSidebar({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [hotelModules, setHotelModules] = useState<HotelModulesState>(null);

  useEffect(() => {
    if (role === "SUPER_ADMIN") return;

    let cancelled = false;

    fetch("/api/hotel/modules")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled && data) setHotelModules(data);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [role]);

  const visibleNavItems = navItems.filter((item) => {
    if ("roles" in item && !(item.roles as readonly string[]).includes(role)) {
      return false;
    }
    if (role === "SUPER_ADMIN") return true;
    if (item.moduleKey && hotelModules?.[item.moduleKey as HotelModuleKey] === false) {
      return false;
    }
    return true;
  });

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
