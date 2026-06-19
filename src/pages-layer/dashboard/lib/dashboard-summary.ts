import type { DashboardSummaryCardDto } from "@entities/dashboard/types";

const DASHBOARD_SUMMARY_CARD_ORDER: Record<DashboardSummaryCardDto["key"], number> = {
  "total-pages": 0,
  "recrawl-completed": 1,
  "in-search": 2,
  "out-of-index": 3,
};

const DASHBOARD_SUMMARY_CARD_DOT_COLORS: Partial<Record<DashboardSummaryCardDto["key"], string>> = {
  "recrawl-completed": "#eab308",
  "in-search": "#22c55e",
  "out-of-index": "#ef4444",
};

export const orderDashboardSummaryCards = (cards: DashboardSummaryCardDto[]) =>
  [...cards].sort((left, right) => DASHBOARD_SUMMARY_CARD_ORDER[left.key] - DASHBOARD_SUMMARY_CARD_ORDER[right.key]);

export const getDashboardSummaryCardDotColor = (card: DashboardSummaryCardDto) => DASHBOARD_SUMMARY_CARD_DOT_COLORS[card.key];

export const shouldRenderDashboardSummaryDelta = (card: DashboardSummaryCardDto) => {
  switch (card.key) {
    case "total-pages":
    case "recrawl-completed":
      return false;
    case "in-search":
    case "out-of-index":
      return card.deltaValue !== null && card.deltaValue !== undefined;
  }
};

export const formatDashboardSummaryDelta = (value: number) => {
  const sign = value < 0 ? "-" : "+";
  return `${sign}${Math.abs(value).toLocaleString("ru-RU")} за сегодня`;
};

export const getDashboardSummaryDeltaTone = (value: number) => {
  if (value > 0) {
    return "positive" as const;
  }
  if (value < 0) {
    return "negative" as const;
  }
  return "neutral" as const;
};
