import { prisma } from "@/lib/prisma";

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  "hotel.creado": "Creó el hotel",
  "hotel.activado": "Activó el hotel",
  "hotel.desactivado": "Desactivó el hotel",
  "modulo.activado": "Activó un módulo",
  "modulo.desactivado": "Desactivó un módulo",
  "facturacion.actualizada": "Actualizó la facturación",
  "facturacion.pago_registrado": "Registró un pago",
  "usuario.creado": "Creó un usuario",
  "usuario.rol_cambiado": "Cambió el rol de un usuario",
  "usuario.password_reseteada": "Reseteó una contraseña",
  "usuario.eliminado": "Eliminó un usuario",
};

export function formatAuditAction(accion: string): string {
  return AUDIT_ACTION_LABELS[accion] ?? accion;
}

export async function logAudit(params: {
  actorId: string;
  actorName: string;
  accion: string;
  hotelId?: string | null;
  hotelName?: string | null;
  detalle?: string | null;
}) {
  await prisma.auditLog.create({
    data: {
      actorId: params.actorId,
      actorName: params.actorName,
      accion: params.accion,
      hotelId: params.hotelId ?? null,
      hotelName: params.hotelName ?? null,
      detalle: params.detalle ?? null,
    },
  });
}
