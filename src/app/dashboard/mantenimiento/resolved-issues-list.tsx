"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/format-date";
import { SEVERITY_DOT } from "@/lib/maintenance";
import { cn } from "@/lib/utils";
import type { MaintenanceIssueDTO } from "./maintenance-view";

type ResolvedIssuesListProps = {
  resolvedIssues: MaintenanceIssueDTO[];
  busyId: string | null;
  onReopen: (id: string) => void;
};

function ResolvedIssuesListImpl({
  resolvedIssues,
  busyId,
  onReopen,
}: ResolvedIssuesListProps) {
  if (resolvedIssues.length === 0) return null;

  return (
    <details className="group flex flex-col gap-3">
      <summary className="cursor-pointer text-sm font-semibold text-muted-foreground marker:content-['']">
        <span className="group-open:hidden">▸ </span>
        <span className="hidden group-open:inline">▾ </span>
        Historial de arreglos ({resolvedIssues.length})
      </summary>
      <Card className="mt-3 divide-y">
        {resolvedIssues.map((issue) => (
          <div
            key={issue.id}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm"
          >
            <span
              className={cn("size-2 shrink-0 rounded-full", SEVERITY_DOT[issue.severity])}
            />
            <span className="font-medium">Hab. {issue.roomNumber}</span>
            <span>{issue.titulo}</span>
            <span className="ml-auto text-xs text-muted-foreground">
              arreglado{" "}
              {issue.resolvedAt ? formatDate(new Date(issue.resolvedAt)) : "—"}
              {issue.resueltoPor ? ` · ${issue.resueltoPor}` : ""}
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-xs"
              disabled={busyId === issue.id}
              onClick={() => onReopen(issue.id)}
            >
              Reabrir
            </Button>
          </div>
        ))}
      </Card>
    </details>
  );
}

export const ResolvedIssuesList = memo(ResolvedIssuesListImpl);
