import type { DashboardAnalyticsSeriesDto } from "@entities/dashboard/types";

export const getNearestDashboardChartIndex = ({
  dateCount,
  pointerX,
  plotWidth,
  paddingLeft,
}: {
  dateCount: number;
  pointerX: number;
  plotWidth: number;
  paddingLeft: number;
}) => {
  if (dateCount <= 1) {
    return 0;
  }

  const clampedX = Math.min(Math.max(pointerX, paddingLeft), paddingLeft + plotWidth);
  const ratio = (clampedX - paddingLeft) / plotWidth;
  return Math.round(ratio * (dateCount - 1));
};

export const buildDashboardBarGroups = (series: DashboardAnalyticsSeriesDto[]) => {
  const valuesBySeries = Object.fromEntries(
    series.map((item) => [item.key, new Map(item.points.map((point) => [point.date, point.value]))]),
  ) as Record<DashboardAnalyticsSeriesDto["key"], Map<string, number>>;

  const dates = Array.from(new Set(series.flatMap((item) => item.points.map((point) => point.date)))).sort();
  return dates.map((date) => ({
    date,
    added: valuesBySeries.added?.get(date) ?? 0,
    removed: valuesBySeries.removed?.get(date) ?? 0,
  }));
};
