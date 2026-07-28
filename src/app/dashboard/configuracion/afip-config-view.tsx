"use client";

import { useRef, useState, type FormEvent } from "react";
import { CheckCircle2, FileText, Upload } from "lucide-react";
import type { AfipAmbiente, TipoFacturaAfip } from "@/generated/prisma/enums";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TIPOS_FACTURA_AFIP,
  AFIP_AMBIENTES,
  formatTipoFacturaAfip,
  formatAfipAmbiente,
  isValidCuit,
} from "@/lib/afip-config";

type AfipConfigSummary = {
  cuit: string;
  puntoVenta: number;
  tipoFacturaDefault: TipoFacturaAfip;
  ambiente: AfipAmbiente;
};

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export function AfipConfigView({
  initialConfig,
}: {
  initialConfig: AfipConfigSummary | null;
}) {
  const [config, setConfig] = useState(initialConfig);
  const [isEditing, setIsEditing] = useState(!initialConfig);

  const [cuit, setCuit] = useState(initialConfig?.cuit ?? "");
  const [puntoVenta, setPuntoVenta] = useState(
    initialConfig ? String(initialConfig.puntoVenta) : ""
  );
  const [tipoFacturaDefault, setTipoFacturaDefault] = useState<TipoFacturaAfip>(
    initialConfig?.tipoFacturaDefault ?? "B"
  );
  const [ambiente, setAmbiente] = useState<AfipAmbiente>(
    initialConfig?.ambiente ?? "SANDBOX"
  );
  const [certificadoNombre, setCertificadoNombre] = useState<string | null>(
    null
  );
  const [certificadoTexto, setCertificadoTexto] = useState("");
  const [clavePrivadaNombre, setClavePrivadaNombre] = useState<string | null>(
    null
  );
  const [clavePrivadaTexto, setClavePrivadaTexto] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const certificadoInputRef = useRef<HTMLInputElement>(null);
  const clavePrivadaInputRef = useRef<HTMLInputElement>(null);

  function resetForm() {
    setCuit(config?.cuit ?? "");
    setPuntoVenta(config ? String(config.puntoVenta) : "");
    setTipoFacturaDefault(config?.tipoFacturaDefault ?? "B");
    setAmbiente(config?.ambiente ?? "SANDBOX");
    setCertificadoNombre(null);
    setCertificadoTexto("");
    setClavePrivadaNombre(null);
    setClavePrivadaTexto("");
    setError(null);
    if (certificadoInputRef.current) certificadoInputRef.current.value = "";
    if (clavePrivadaInputRef.current) clavePrivadaInputRef.current.value = "";
  }

  async function handleCertificadoChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    if (!file) return;
    setCertificadoTexto(await readFileAsText(file));
    setCertificadoNombre(file.name);
  }

  async function handleClavePrivadaChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    if (!file) return;
    setClavePrivadaTexto(await readFileAsText(file));
    setClavePrivadaNombre(file.name);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!isValidCuit(cuit)) {
      setError("Ingresa un CUIT válido (11 números, sin guiones).");
      return;
    }

    const puntoVentaValue = Number(puntoVenta);
    if (!Number.isInteger(puntoVentaValue) || puntoVentaValue <= 0) {
      setError("Ingresa un punto de venta válido.");
      return;
    }

    if (!certificadoTexto || !clavePrivadaTexto) {
      setError("Subí el certificado (.crt) y la clave privada (.key).");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/afip-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cuit,
          certificado: certificadoTexto,
          clavePrivada: clavePrivadaTexto,
          puntoVenta: puntoVentaValue,
          tipoFacturaDefault,
          ambiente,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error ?? "No se pudo guardar la configuración.");
      }

      setConfig(data as AfipConfigSummary);
      setIsEditing(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo guardar la configuración."
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (!isEditing && config) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-green-600 dark:text-green-400" />
            AFIP conectado
          </CardTitle>
          <CardDescription>
            Tus credenciales de AFIP están configuradas.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-6 text-sm">
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground">CUIT</span>
              <span className="font-medium">{config.cuit}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground">Punto de venta</span>
              <span className="font-medium">{config.puntoVenta}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground">
                Tipo de factura por defecto
              </span>
              <span className="font-medium">
                {formatTipoFacturaAfip(config.tipoFacturaDefault)}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground">Ambiente</span>
              <Badge
                variant={
                  config.ambiente === "PRODUCCION" ? "default" : "secondary"
                }
                className="w-fit"
              >
                {formatAfipAmbiente(config.ambiente)}
              </Badge>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-fit"
            onClick={() => {
              resetForm();
              setIsEditing(true);
            }}
          >
            Editar
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {!config ? (
        <Card>
          <CardHeader>
            <CardTitle>AFIP no está configurado</CardTitle>
            <CardDescription>
              Para emitir facturas electrónicas necesitás tu CUIT y el
              certificado digital de AFIP asociado a tu punto de venta.{" "}
              <a
                href="https://www.afip.gob.ar"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground underline underline-offset-4"
              >
                Ver el sitio de AFIP
              </a>{" "}
              para generar tu certificado si todavía no lo tenés.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>
            {config ? "Editar credenciales de AFIP" : "Configurar AFIP"}
          </CardTitle>
          <CardDescription>
            {config
              ? "Al editar tenés que volver a subir el certificado y la clave privada."
              : "Completa los datos para conectar tu cuenta de AFIP."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cuit">CUIT (sin guiones)</Label>
                <Input
                  id="cuit"
                  inputMode="numeric"
                  placeholder="20123456789"
                  required
                  value={cuit}
                  onChange={(event) =>
                    setCuit(event.target.value.replace(/\D/g, ""))
                  }
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="puntoVenta">Punto de venta</Label>
                <Input
                  id="puntoVenta"
                  type="number"
                  min="1"
                  placeholder="1"
                  required
                  value={puntoVenta}
                  onChange={(event) => setPuntoVenta(event.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="certificado">Certificado digital (.crt)</Label>
                <input
                  ref={certificadoInputRef}
                  id="certificado"
                  type="file"
                  accept=".crt,.pem,.txt"
                  className="hidden"
                  onChange={handleCertificadoChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="justify-start"
                  onClick={() => certificadoInputRef.current?.click()}
                >
                  {certificadoNombre ? (
                    <>
                      <FileText className="size-4" />
                      {certificadoNombre}
                    </>
                  ) : (
                    <>
                      <Upload className="size-4" />
                      Subir certificado
                    </>
                  )}
                </Button>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="clavePrivada">Clave privada (.key)</Label>
                <input
                  ref={clavePrivadaInputRef}
                  id="clavePrivada"
                  type="file"
                  accept=".key,.pem,.txt"
                  className="hidden"
                  onChange={handleClavePrivadaChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="justify-start"
                  onClick={() => clavePrivadaInputRef.current?.click()}
                >
                  {clavePrivadaNombre ? (
                    <>
                      <FileText className="size-4" />
                      {clavePrivadaNombre}
                    </>
                  ) : (
                    <>
                      <Upload className="size-4" />
                      Subir clave privada
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tipoFacturaDefault">
                  Tipo de factura por defecto
                </Label>
                <Select
                  value={tipoFacturaDefault}
                  onValueChange={(value) =>
                    setTipoFacturaDefault(
                      (value as TipoFacturaAfip | null) ?? "B"
                    )
                  }
                >
                  <SelectTrigger id="tipoFacturaDefault" className="w-full">
                    <SelectValue>
                      {(value: TipoFacturaAfip | null) =>
                        value ? formatTipoFacturaAfip(value) : ""
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_FACTURA_AFIP.map((tipo) => (
                      <SelectItem key={tipo} value={tipo}>
                        {formatTipoFacturaAfip(tipo)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ambiente">Ambiente</Label>
                <Select
                  value={ambiente}
                  onValueChange={(value) =>
                    setAmbiente((value as AfipAmbiente | null) ?? "SANDBOX")
                  }
                >
                  <SelectTrigger id="ambiente" className="w-full">
                    <SelectValue>
                      {(value: AfipAmbiente | null) =>
                        value ? formatAfipAmbiente(value) : ""
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {AFIP_AMBIENTES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {formatAfipAmbiente(value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <div className="flex justify-end gap-2">
              {config ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSaving}
                  onClick={() => {
                    resetForm();
                    setIsEditing(false);
                  }}
                >
                  Cancelar
                </Button>
              ) : null}
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Guardando…" : "Guardar"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
