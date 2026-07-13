import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { SignOutButton } from "@/components/dashboard/sign-out-button";

export function DashboardHeader({
  hotelName,
  roleLabel,
}: {
  hotelName: string;
  roleLabel: string;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b bg-background px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-5" />
        <span className="text-sm font-semibold tracking-tight">{hotelName}</span>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant="secondary">{roleLabel}</Badge>
        <SignOutButton />
      </div>
    </header>
  );
}
