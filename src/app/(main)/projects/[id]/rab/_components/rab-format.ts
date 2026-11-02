export const formatCurrencyOrUnpriced = (value: number | null | undefined) =>
  value === null || value === undefined ? "Belum dihargai" : formatCurrency(value);

export const formatCurrency = (value: number | null | undefined) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value ?? 0);

export const formatShortCurrency = (value: number | null | undefined) =>
  new Intl.NumberFormat("id-ID", {
    notation: "compact",
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 1,
  }).format(value ?? 0);

export const formatDate = (value: string | null | undefined) =>
  value
    ? new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(value))
    : "-";
