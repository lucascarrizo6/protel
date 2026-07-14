import type { BedArrangement } from "@/generated/prisma/enums";

export const BED_ARRANGEMENTS = [
  "SIMPLE",
  "DOBLE",
  "TWIN",
  "TRIPLE",
  "FAMILIAR",
] as const satisfies readonly BedArrangement[];

const BED_ARRANGEMENT_LABELS: Record<BedArrangement, string> = {
  SIMPLE: "Simple",
  DOBLE: "Doble",
  TWIN: "Twin",
  TRIPLE: "Triple",
  FAMILIAR: "Familiar",
};

export function formatBedArrangement(value: BedArrangement): string {
  return BED_ARRANGEMENT_LABELS[value];
}

const BED_ARRANGEMENT_CAPACITY: Record<BedArrangement, number> = {
  SIMPLE: 1,
  DOBLE: 2,
  TWIN: 2,
  TRIPLE: 3,
  FAMILIAR: 4,
};

export function bedArrangementCapacity(value: BedArrangement): number {
  return BED_ARRANGEMENT_CAPACITY[value];
}
