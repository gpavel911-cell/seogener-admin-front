import type { DistributionOrderRowDto, DistributionSummaryDto } from "@entities/distribution/types";

export const UNAVAILABLE_PLACEHOLDER = "—";

export const formatNullable = (value?: string | null) =>
  value?.trim() ? value : UNAVAILABLE_PLACEHOLDER;

export const formatMoney = (value: number) => `${value.toLocaleString("ru-RU")} ₽`;

export const formatPercent = (value: number | null) =>
  value === null ? UNAVAILABLE_PLACEHOLDER : `${value.toLocaleString("ru-RU")}%`;

export const formatDateTime = (value?: string | null) => {
  if (!value) {
    return UNAVAILABLE_PLACEHOLDER;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("ru-RU");
};

export const formatSummaryValue = (
  key: keyof DistributionSummaryDto,
  summary: DistributionSummaryDto,
) => {
  const value = summary[key];
  return key === "confirmedFeeAmount" ? formatMoney(value) : value.toLocaleString("ru-RU");
};

const parseCreatedAt = (value?: string | null) => {
  if (!value) {
    return 0;
  }
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

export const sortDistributionOrders = (orders: DistributionOrderRowDto[]) =>
  [...orders].sort((left, right) => {
    const leftTime = parseCreatedAt(left.createdAt);
    const rightTime = parseCreatedAt(right.createdAt);
    if (leftTime !== rightTime) {
      return rightTime - leftTime;
    }
    return left.partnerOrderId.localeCompare(right.partnerOrderId, "ru");
  });
