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
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b bg-card px-4 md:px-6">
      <div className="flex items-center gap-3">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-6" />
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-tight">
            Bienvenido, {userName}
          </span>
          <span className="text-xs text-muted-foreground">{hotelName}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button variant="ghost" size="icon" aria-label="Notificaciones" />
            }
          >
            <Bell />
          </TooltipTrigger>
          <TooltipContent>No hay notificaciones nuevas</TooltipContent>
        </Tooltip>
        <Separator orientation="vertical" className="h-6" />
        <Badge variant="secondary">{roleLabel}</Badge>
        <SignOutButton />
      </div>
    </header>
  );
}
