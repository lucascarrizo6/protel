import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function SectionPlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Próximamente</CardTitle>
          <CardDescription>
            Esta sección aún no está disponible.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Vuelve más tarde cuando esta parte de Protel esté lista.
        </CardContent>
      </Card>
    </div>
  );
}
