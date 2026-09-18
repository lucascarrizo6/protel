"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type {
  MaintenanceSeverity,
  MaintenanceStatus,
} from "@/generated/prisma/enums";
import { Card } from "@/components/ui/card";
import {
  MAINTENANCE_SEVERITIES,
  SEVERITY_DOT,
  SEVERITY_MEANING,
  SEVERITY_ORDER,
  formatSeverity,
} from "@/lib/maintenance";
import { cn } from "@/lib/utils";
import { NewIssueDialog } from "./new-issue-dialog";
import { CloseIssueDialog } from "./close-issue-dialog";
import { OpenIssuesList } from "./open-issues-list";
import { ResolvedIssuesList } from "./resolved-issues-list";

export type MaintenanceIssueDTO = {
  id: string;
  titulo: string;
  detalle: string | null;
  severity: MaintenanceSeverity;
  status: MaintenanceStatus;
  reportadoPor: string | null;
  resueltoPor: string | null;
  createdAt: string;
  resolvedAt: string | null;
  roomNumber: string;
  roomFloor: number;
};

export type RoomOption = { id: string; number: string; floor: number };

export type RoomGroup = {
  key: string;
  roomNumber: string;
  roomFloor: number;
  worstOrder: number;
  worstSeverity: MaintenanceSeverity;
  issues: MaintenanceIssueDTO[];
};

type CloseType = "ANULAR" | "COMPROBANTE";

export function MaintenanceView({
  openIssues,
  resolvedIssues,
  rooms,
  currentUserName,
}: {
  openIssues: MaintenanceIssueDTO[];
  resolvedIssues: MaintenanceIssueDTO[];
  rooms: RoomOption[];
  currentUserName: string;
}) {
  const router = useRouter();

  const [closingIssue, setClosingIssue] = useState<MaintenanceIssueDTO | null>(
    null
  );
  const [closeType, setCloseType] = useState<CloseType | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const roomGroups = useMemo<RoomGroup[]>(() => {
    const map = new Map<string, RoomGroup>();
    for (const issue of openIssues) {
      const key = `${issue.roomFloor}-${issue.roomNumber}`;
      const order = SEVERITY_ORDER[issue.severity];
      const existing = map.get(key);
      if (existing) {
        existing.issues.push(issue);
        if (order < existing.worstOrder) {
          existing.worstOrder = order;
          existing.worstSeverity = issue.severity;
        }
      } else {
        map.set(key, {
          key,
          roomNumber: issue.roomNumber,
          roomFloor: issue.roomFloor,
          worstOrder: order,
          worstSeverity: issue.severity,
          issues: [issue],
        });
      }
    }
    return Array.from(map.values()).sort(
      (a, b) =>
        a.worstOrder - b.worstOrder ||
        a.roomNumber.localeCompare(b.roomNumber, "es", { numeric: true })
    );
  }, [openIssues]);

  const handleCloseIssue = useCallback(
    (issue: MaintenanceIssueDTO, type: CloseType) => {
      setClosingIssue(issue);
      setCloseType(type);
    },
    []
  );

  const closeCloseDialog = useCallback((open: boolean) => {
    if (!open) {
      setClosingIssue(null);
      setCloseType(null);
    }
  }, []);

  const handleClosed = useCallback(() => {
    setClosingIssue(null);
    setCloseType(null);
    router.refresh();
  }, [router]);

  const reopenIssue = useCallback(
    async (id: string) => {
      setBusyId(id);
      try {
        const response = await fetch(`/api/maintenance/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "PENDIENTE" }),
        });
        if (!response.ok) throw new Error("No se pudo reabrir.");

        toast.success("Ticket reabierto.");
        router.refresh();
      } catch {
        toast.error("No se pudo actualizar.");
      } finally {
        setBusyId(null);
      }
    },
    [router]
  );

  return (
    <div className="flex flex-col gap-6">
      <CloseIssueDialog
        key={closingIssue?.id ?? "close-closed"}
        issue={closingIssue}
        closeType={closeType}
        onOpenChange={closeCloseDialog}
        onSaved={handleClosed}
      />

      <Card className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Cómo se usan los colores</h2>
          <NewIssueDialog rooms={rooms} currentUserName={currentUserName} />
        </div>

        <ul className="flex flex-col gap-1.5 text-sm">
          {MAINTENANCE_SEVERITIES.map((sev) => (
            <li key={sev} className="flex items-start gap-2">
              <span
                className={cn(
                  "mt-1 size-2.5 shrink-0 rounded-full",
                  SEVERITY_DOT[sev]
                )}
              />
              <span>
                <span className="font-medium">{formatSeverity(sev)}:</span>{" "}
                <span className="text-muted-foreground">
                  {SEVERITY_MEANING[sev]}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <OpenIssuesList
        openIssuesCount={openIssues.length}
        roomGroups={roomGroups}
        onCloseIssue={handleCloseIssue}
      />

      <ResolvedIssuesList
        resolvedIssues={resolvedIssues}
        busyId={busyId}
        onReopen={reopenIssue}
      />
    </div>
  );
}
