export type DistributionStatusVariant = "hold" | "confirmed" | "canceled" | "unknown";

const STATUS_VARIANTS: Record<string, DistributionStatusVariant> = {
  HOLD: "hold",
  CONFIRMED: "confirmed",
  CANCELED: "canceled",
  CANCELLED: "canceled",
};

const STATUS_LABELS: Record<string, string> = {
  CONFIRMED: "Подтвержден",
  HOLD: "В ожидании",
  CANCELLED: "Отменен",
  CANCELED: "Отменен",
};

const SOURCE_LABELS: Record<string, string> = {
  WEB: "Веб-портал",
  MOBILE_APP: "Приложение",
};

export const resolveDistributionStatusVariant = (state: string): DistributionStatusVariant =>
  STATUS_VARIANTS[state.toUpperCase()] ?? "unknown";

export const formatDistributionStatus = (state: string) =>
  STATUS_LABELS[state.toUpperCase()] ?? state;

export const formatDistributionSource = (value: string | null | undefined, unavailablePlaceholder: string) => {
  if (!value?.trim()) {
    return unavailablePlaceholder;
  }
  return SOURCE_LABELS[value.toUpperCase()] ?? value;
};
