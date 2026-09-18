"use client";

import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/format-date";
import {
  SEVERITY_BADGE_CLASS,
  SEVERITY_LEFT_BORDER,
  formatSeverity,
} from "@/lib/maintenance";
import { cn } from "@/lib/utils";
import type { MaintenanceIssueDTO, RoomGroup } from "./maintenance-view";

type CloseType = "ANULAR" | "COMPROBANTE";

type RoomIssueCardProps = {
  group: RoomGroup;
  onCloseIssue: (issue: MaintenanceIssueDTO, closeType: CloseType) => void;
};

function RoomIssueCardImpl({ group, onCloseIssue }: RoomIssueCardProps) {
  return (
    <Card
      className={cn(
        "flex flex-col gap-3 border-l-4 p-4",
        SEVERITY_LEFT_BORDER[group.worstSeverity]
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-base font-semibold">Hab. {group.roomNumber}</span>
        <span className="text-sm text-muted-foreground">
          Piso {group.roomFloor}
        </span>
        <span className="ml-auto text-xs text-muted-foreground">
          {group.issues.length} problema{group.issues.length === 1 ? "" : "s"}
        </span>
      </div>

      <ul className="flex flex-col divide-y rounded-md border">
        {group.issues.map((issue) => (
          <li
            key={issue.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={SEVERITY_BADGE_CLASS[issue.severity]}>
                  {formatSeverity(issue.severity)}
                </Badge>

                <Badge
                  variant="outline"
                  className={
                    issue.status === "EN_REVISION"
                      ? "border-blue-300 text-blue-700 bg-blue-50"
                      : issue.status === "DERIVADO"
                        ? "border-purple-300 text-purple-700 bg-purple-50"
                        : "border-gray-300 text-gray-700 bg-gray-50"
                  }
                >
                  {issue.status.replace("_", " ")}
                </Badge>

                <span className="text-sm font-medium">{issue.titulo}</span>
              </div>

              {issue.detalle && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {issue.detalle}
                </p>
              )}

              <p className="mt-1 text-xs text-muted-foreground">
                {formatDate(new Date(issue.createdAt))}
                {issue.reportadoPor ? ` · reportó ${issue.reportadoPor}` : ""}
              </p>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              {issue.status === "DERIVADO" ? (
                <Button
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                  onClick={() => onCloseIssue(issue, "COMPROBANTE")}
                >
                  Cargar comprobante y cerrar
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-muted-foreground hover:text-foreground hover:bg-destructive/10 hover:text-destructive border-dashed"
                  onClick={() => onCloseIssue(issue, "ANULAR")}
                >
                  Anular reporte
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

const RoomIssueCard = memo(RoomIssueCardImpl);

type OpenIssuesListProps = {
  openIssuesCount: number;
  roomGroups: RoomGroup[];
  onCloseIssue: (issue: MaintenanceIssueDTO, closeType: CloseType) => void;
};

function OpenIssuesListImpl({
  openIssuesCount,
  roomGroups,
  onCloseIssue,
}: OpenIssuesListProps) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-muted-foreground">
        Problemas abiertos ({openIssuesCount})
      </h2>
      {roomGroups.length === 0 ? (
        <Card className="px-4 py-10 text-center text-sm text-muted-foreground">
          No hay problemas abiertos. Todo en orden.
        </Card>
      ) : (
        roomGroups.map((group) => (
          <RoomIssueCard
            key={group.key}
            group={group}
            onCloseIssue={onCloseIssue}
          />
        ))
      )}
    </div>
  );
}

export const OpenIssuesList = memo(OpenIssuesListImpl);
