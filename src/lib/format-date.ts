const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function formatDate(date: Date): string {
  return dateFormatter.format(date);
}
