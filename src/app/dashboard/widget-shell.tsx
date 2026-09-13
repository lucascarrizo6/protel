import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Los seis puntitos que se agarran para mover el widget. Es el único
 *  elemento con la clase `widget-drag-handle`, así el resto del widget
 *  (texto, botones) sigue siendo clickeable y seleccionable. */
function DragGrip() {
  return (
    <span
      className="widget-drag-handle -mr-1 flex cursor-grab touch-none items-center rounded-md p-1 text-muted-foreground/40 transition-colors hover:bg-muted hover:text-muted-foreground active:cursor-grabbing"
      aria-label="Mover widget"
      title="Arrastrá desde acá para mover el widget"
    >
      <svg width="10" height="15" viewBox="0 0 12 18" fill="currentColor" aria-hidden>
        <circle cx="3" cy="3" r="1.5" />
        <circle cx="9" cy="3" r="1.5" />
        <circle cx="3" cy="9" r="1.5" />
        <circle cx="9" cy="9" r="1.5" />
        <circle cx="3" cy="15" r="1.5" />
        <circle cx="9" cy="15" r="1.5" />
      </svg>
    </span>
  );
}

export function WidgetShell({
  title,
  action,
  children,
  bodyClassName,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border bg-card text-card-foreground shadow-xs">
      <div className="flex items-center justify-between gap-2 border-b px-2.5 py-1">
        <span className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </span>
        <div className="flex items-center gap-0.5">
          {action}
          <DragGrip />
        </div>
      </div>
      <div className={cn("min-h-0 flex-1 overflow-auto p-2.5", bodyClassName)}>
        {children}
      </div>
    </div>
  );
}

/** Estado vacío compartido por los widgets de lista. */
export function WidgetEmpty({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center px-2 text-center text-xs text-muted-foreground">
      {children}
    </div>
  );
}
