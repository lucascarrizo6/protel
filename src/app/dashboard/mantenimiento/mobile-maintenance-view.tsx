"use client";

import { useMemo, useState, useEffect } from "react";
import { CheckCircle2, AlertTriangle, Wrench, Clock, ArrowRightLeft } from "lucide-react";
import type { MaintenanceIssue, Room } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type IssueWithRoom = MaintenanceIssue & {
  room: Room;
};

export function MobileMaintenanceView({
  initialIssues,
  currentUserId,
}: {
  initialIssues: IssueWithRoom[];
  currentUserId?: string;
}) {
  // Puente de reactividad con el servidor
  const [issues, setIssues] = useState(initialIssues);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    setIssues(initialIssues);
  }, [initialIssues]);

  // Filtramos los que ya están resueltos
  const activeIssues = useMemo(() => {
    return issues.filter((issue) => issue.status !== "RESUELTO");
  }, [issues]);

  // Agrupamos por gravedad para que el técnico priorice lo urgente (ROJO)
  const groupedIssues = useMemo(() => {
    const groups: Record<string, IssueWithRoom[]> = {
      ROJO: [],
      NARANJA: [],
      AMARILLO: [],
    };
    for (const issue of activeIssues) {
      if (groups[issue.severity]) {
        groups[issue.severity].push(issue);
      }
    }
    return groups;
  }, [activeIssues]);

  async function updateStatus(issueId: string, newStatus: string) {
    setUpdatingId(issueId);
    try {
      const response = await fetch(`/api/maintenance/${issueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) throw new Error("Error al actualizar ticket");
      
      const updatedIssue = await response.json();
      setIssues((prev) =>
        prev.map((i) => (i.id === issueId ? { ...i, status: updatedIssue.status } : i))
      );
    } catch {
      alert("Error de conexión al actualizar.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function updateNote(issueId: string, noteValue: string) {
    try {
      await fetch(`/api/maintenance/${issueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionNote: noteValue }),
      });
    } catch {
      // Falla silenciosa si pierde internet al tipear
    }
  }

  function getSeverityColor(severity: string) {
    switch (severity) {
      case "ROJO": return "bg-red-100 text-red-800 border-red-200";
      case "NARANJA": return "bg-orange-100 text-orange-800 border-orange-200";
      case "AMARILLO": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default: return "bg-gray-100 text-gray-800";
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "PENDIENTE": return <Badge variant="destructive">Pendiente</Badge>;
      case "EN_REVISION": return <Badge className="bg-blue-500 hover:bg-blue-600">En Revisión</Badge>;
      case "DERIVADO": return <Badge variant="outline" className="text-purple-600 border-purple-300 bg-purple-50">Derivado</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  }

  if (activeIssues.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CheckCircle2 className="size-16 text-green-500 mb-4" />
        <h2 className="text-2xl font-bold tracking-tight">¡Mantenimiento al día!</h2>
        <p className="text-muted-foreground mt-2">
          No hay fallas reportadas en este momento.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-20">
      {(["ROJO", "NARANJA", "AMARILLO"] as const).map((severity) => {
        const severityIssues = groupedIssues[severity];
        if (severityIssues.length === 0) return null;

        return (
          <div key={severity} className="flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b pb-2">
              <AlertTriangle className={`size-5 ${severity === 'ROJO' ? 'text-red-500' : severity === 'NARANJA' ? 'text-orange-500' : 'text-yellow-500'}`} />
              <h3 className="text-xl font-bold tracking-tight capitalize">
                Prioridad {severity.toLowerCase()}
              </h3>
              <Badge variant="secondary" className="rounded-full">{severityIssues.length}</Badge>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              {severityIssues.map((issue) => {
                const currentNote = notes[issue.id] ?? "";

                return (
                  <Card key={issue.id} className={`flex flex-col border-l-4 ${severity === 'ROJO' ? 'border-l-red-500' : severity === 'NARANJA' ? 'border-l-orange-500' : 'border-l-yellow-500'}`}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                            Hab. {issue.room.number}
                          </p>
                          <CardTitle className="text-xl leading-tight mt-1">{issue.titulo}</CardTitle>
                        </div>
                        {getStatusBadge(issue.status)}
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pb-4 flex-grow flex flex-col gap-3">
                      {issue.detalle && (
                        <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded-md">
                          {issue.detalle}
                        </p>
                      )}
                      
                      <div className="mt-2 flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Novedades / Repuestos
                        </label>
                        <Input
                          className="h-9 bg-muted/20"
                          placeholder="Ej: Faltan cueritos, compro a la tarde..."
                          value={currentNote}
                          onChange={(e) => setNotes(prev => ({ ...prev, [issue.id]: e.target.value }))}
                          onBlur={(e) => updateNote(issue.id, e.target.value)}
                        />
                      </div>
                    </CardContent>

                    <CardFooter className="flex flex-col gap-2">
                      {issue.status === "PENDIENTE" && (
                        <Button 
                          className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-md" 
                          onClick={() => updateStatus(issue.id, "EN_REVISION")}
                          disabled={updatingId === issue.id}
                        >
                          <Wrench className="mr-2 size-5" />
                          Empezar a revisar
                        </Button>
                      )}

                      {(issue.status === "EN_REVISION" || issue.status === "DERIVADO") && (
                        <div className="flex w-full gap-2">
                          {issue.status === "EN_REVISION" && (
                            <Button 
                              variant="outline"
                              className="flex-1 h-12 text-purple-700 border-purple-200 hover:bg-purple-50"
                              onClick={() => updateStatus(issue.id, "DERIVADO")}
                              disabled={updatingId === issue.id}
                            >
                              <ArrowRightLeft className="mr-2 size-4" />
                              Derivar
                            </Button>
                          )}
                          <Button 
                            className="flex-1 h-12 bg-green-600 hover:bg-green-700"
                            onClick={() => updateStatus(issue.id, "RESUELTO")}
                            disabled={updatingId === issue.id}
                          >
                            <CheckCircle2 className="mr-2 size-5" />
                            Resuelto
                          </Button>
                        </div>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}