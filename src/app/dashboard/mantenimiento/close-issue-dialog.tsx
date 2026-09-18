"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { MaintenanceIssueDTO } from "./maintenance-view";

type CloseType = "ANULAR" | "COMPROBANTE";

type CloseIssueDialogProps = {
  issue: MaintenanceIssueDTO | null;
  closeType: CloseType | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

export function CloseIssueDialog({
  issue,
  closeType,
  onOpenChange,
  onSaved,
}: CloseIssueDialogProps) {
  const [closeMotivo, setCloseMotivo] = useState("");
  const [closeCosto, setCloseCosto] = useState("");
  const [closeReceipt, setCloseReceipt] = useState("");
  const [saving, setSaving] = useState(false);

  async function submitCloseIssue() {
    if (!issue) return;

    if (closeType === "ANULAR" && !closeMotivo.trim()) {
      toast.error("Debes ingresar un motivo para anular el reporte.");
      return;
    }
    if (closeType === "COMPROBANTE") {
      if (!closeCosto.trim()) {
        toast.error("El costo de reparación es obligatorio.");
        return;
      }
      if (!closeReceipt.trim()) {
        toast.error("El link al comprobante es obligatorio.");
        return;
      }
    }

    setSaving(true);
    try {
      let actionNote = "";
      if (closeType === "ANULAR") {
        actionNote = `Reporte anulado: ${closeMotivo}`;
      } else {
        const costoStr = `Costo: $${closeCosto}`;
        const detalleStr = closeMotivo.trim() ? `Detalle: ${closeMotivo}` : "";
        actionNote = [costoStr, detalleStr].filter(Boolean).join(" | ");
      }

      const response = await fetch(`/api/maintenance/${issue.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "RESUELTO",
          actionNote,
          receiptUrl: closeReceipt || undefined,
        }),
      });

      if (!response.ok) throw new Error("Error al cerrar el problema");

      toast.success(
        closeType === "ANULAR"
          ? "Reporte anulado."
          : "Problema cerrado y archivado."
      );
      onSaved();
    } catch {
      toast.error("No se pudo actualizar el problema.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={issue !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {closeType === "ANULAR"
              ? "Anular Reporte"
              : "Liquidar y Cerrar Problema"}
          </DialogTitle>
          <DialogDescription>
            Hab. {issue?.roomNumber} - {issue?.titulo}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          {closeType === "ANULAR" ? (
            <div className="flex flex-col gap-2">
              <Label>Motivo de la anulación</Label>
              <Textarea
                placeholder="Ej: El huésped avisó que se solucionó solo, o fue un error al cargar la habitación..."
                value={closeMotivo}
                onChange={(e) => setCloseMotivo(e.target.value)}
              />
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <Label>Costo de reparación ($)</Label>
                <Input
                  type="number"
                  placeholder="Ej: 15000"
                  value={closeCosto}
                  onChange={(e) => setCloseCosto(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Link al Remito / Factura</Label>
                <Input
                  placeholder="https://drive.google.com/..."
                  value={closeReceipt}
                  onChange={(e) => setCloseReceipt(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Pegá un link a Google Drive con la foto del comprobante o
                  transferencia.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Detalle de lo realizado (Opcional)</Label>
                <Textarea
                  placeholder="Ej: Se cambió la plaqueta del aire acondicionado..."
                  value={closeMotivo}
                  onChange={(e) => setCloseMotivo(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            variant={closeType === "ANULAR" ? "destructive" : "default"}
            onClick={submitCloseIssue}
            disabled={saving}
          >
            {saving
              ? "Procesando..."
              : closeType === "ANULAR"
                ? "Confirmar Anulación"
                : "Confirmar Cierre"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
