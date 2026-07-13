import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Iniciar sesión · Protel",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-11 items-center justify-center rounded-xl bg-foreground text-lg font-semibold text-background">
            P
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-lg font-semibold tracking-tight">Protel</span>
            <span className="text-sm text-muted-foreground">
              Plataforma de gestión hotelera
            </span>
          </div>
        </div>

        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Bienvenido</CardTitle>
            <CardDescription>
              Inicia sesión con tu cuenta de Protel para continuar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Protel. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
}
