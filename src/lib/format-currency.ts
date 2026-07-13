const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
});

export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount);
}
