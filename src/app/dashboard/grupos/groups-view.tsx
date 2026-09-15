"use client";

import { useCallback, useState } from "react";
import type { Prisma, Room } from "@/generated/prisma/client";
import { GroupsList } from "./groups-list";
import { NewGroupWizard } from "./new-group-wizard";

export type GroupWithMembers = Prisma.GroupGetPayload<{
  include: {
    members: {
      include: { reservation: { select: { status: true } } };
    };
  };
}>;

export type ReservationSlim = {
  roomId: string;
  checkIn: Date;
  checkOut: Date;
};

export function GroupsView({
  initialGroups,
  rooms,
  existingReservations,
}: {
  initialGroups: GroupWithMembers[];
  rooms: Room[];
  existingReservations: ReservationSlim[];
}) {
  const [groups, setGroups] = useState(initialGroups);

  const handleCreated = useCallback((group: GroupWithMembers) => {
    setGroups((prev) => [group, ...prev]);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <NewGroupWizard
          rooms={rooms}
          existingReservations={existingReservations}
          onCreated={handleCreated}
        />
      </div>

      <GroupsList groups={groups} />
    </div>
  );
}
