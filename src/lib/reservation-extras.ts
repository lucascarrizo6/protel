export type ExtraCharge = {
  nombre: string;
  monto: number;
};

export function parseExtras(value: unknown): ExtraCharge[] {
  if (!Array.isArray(value)) return [];

  return value.filter(
    (item): item is ExtraCharge =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as ExtraCharge).nombre === "string" &&
      typeof (item as ExtraCharge).monto === "number"
  );
}

export function sumExtras(extras: ExtraCharge[]): number {
  return extras.reduce((sum, extra) => sum + extra.monto, 0);
}
