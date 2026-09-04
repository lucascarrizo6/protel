import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SignOutButton } from "@/components/dashboard/sign-out-button";

export function DashboardHeader({
  userName,
  hotelName,
  roleLabel,
}: {
  userName: string;
  hotelName: string;
  roleLabel: string;
}) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b bg-card px-3 md:px-6">
      {/* flex-1 y min-w-0 obligan a esta sección a no empujar al resto de los elementos */}
      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-6" />
        <div className="flex flex-col leading-tight min-w-0">
          <span className="text-sm font-semibold tracking-tight truncate">
            {/* Acortamos a "Hola" en celular para ahorrar espacio, pero mantenemos "Bienvenido" en PC */}
            <span className="hidden sm:inline">Bienvenido, </span>
            <span className="sm:hidden">Hola, </span>
            {userName}
          </span>
          <span className="text-[10px] sm:text-xs text-muted-foreground truncate">
            {hotelName}
          </span>
        </div>
      </div>
      
      {/* shrink-0 asegura que los botones de la derecha nunca se aplasten */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button variant="ghost" size="icon" aria-label="Notificaciones" />
            }
          >
            <Bell className="size-5 sm:size-6" />
          </TooltipTrigger>
          <TooltipContent>No hay notificaciones nuevas</TooltipContent>
        </Tooltip>
        
        <Separator orientation="vertical" className="hidden sm:block h-6" />
        <Badge variant="secondary" className="hidden sm:inline-flex">
          {roleLabel}
        </Badge>
        
        <SignOutButton />
      </div>
    </header>
  );
}