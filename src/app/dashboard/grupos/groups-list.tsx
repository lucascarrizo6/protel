"use client";

import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate } from "@/lib/format-date";
import type { GroupWithMembers } from "./groups-view";

function checkedInCount(group: GroupWithMembers): number {
  return group.members.filter(
    (member) =>
      member.reservation?.status === "CONFIRMADA" ||
      member.reservation?.status === "COMPLETADA"
  ).length;
}

type GroupsListProps = {
  groups: GroupWithMembers[];
};

function GroupsListImpl({ groups }: GroupsListProps) {
  if (groups.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Aún no hay grupos</CardTitle>
          <CardDescription>
            Los grupos que crees aparecerán aquí con su estado de check-in.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {groups.map((group) => {
        const checkedIn = checkedInCount(group);
        return (
          <Card key={group.id}>
            <CardHeader>
              <CardTitle className="text-lg">{group.nombre}</CardTitle>
              <CardDescription>
                {formatDate(new Date(group.fechaEntrada))} –{" "}
                {formatDate(new Date(group.fechaSalida))}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">
                {group.cantidadPersonas} personas · {group.members.length}{" "}
                integrantes cargados
              </p>
              <Badge
                className={
                  checkedIn === group.members.length
                    ? "w-fit border-transparent bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400"
                    : "w-fit border-transparent bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-400"
                }
              >
                {checkedIn} de {group.members.length} hicieron check-in
              </Badge>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export const GroupsList = memo(GroupsListImpl);
