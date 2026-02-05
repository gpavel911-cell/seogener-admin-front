import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import type { AnalyticsGoalDailyConversionPoint, AnalyticsGoalDto } from "@entities/analytics/types";
import { formatNumber, formatPercent } from "../../lib/goal-formatters";

export const GoalInfo = ({ goal }: { goal: AnalyticsGoalDto }) => {
  const summaryRef = useRef<HTMLDivElement>(null);
  const [summaryHeight, setSummaryHeight] = useState<number | null>(null);

  useEffect(() => {
    if (!summaryRef.current || typeof ResizeObserver === "undefined") {
      return undefined;
    }
    const updateHeight = () => {
      const rect = summaryRef.current?.getBoundingClientRect();
      if (rect && rect.height) {
        setSummaryHeight(Math.round(rect.height));
      }
    };
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(summaryRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <GoalTopRow>
      <GoalSummaryBlock ref={summaryRef}>
        <GoalName>{goal.name ?? "Без названия"}</GoalName>
        <GoalSummaryItem>
          <MetricLabel>Конверсия</MetricLabel>
          <MetricValue>{formatPercent(goal.conversionRate)}</MetricValue>
        </GoalSummaryItem>
        <GoalSummaryItem>
          <MetricLabel>Достижения цели</MetricLabel>
          <MetricValue>{formatNumber(goal.goalReaches)}</MetricValue>
        </GoalSummaryItem>
        <GoalSummaryItem>
          <MetricLabel>Целевые визиты</MetricLabel>
          <MetricValue>{formatNumber(goal.goalVisits)}</MetricValue>
        </GoalSummaryItem>
      </GoalSummaryBlock>
      <ChartBlock style={summaryHeight ? { height: summaryHeight } : undefined}>
        <ChartTitle>Конверсия по дням</ChartTitle>
        <GoalConversionChart points={goal.dailyConversion ?? []} />
      </ChartBlock>
    </GoalTopRow>
  );
};

const GoalConversionChart = ({ points }: { points: AnalyticsGoalDailyConversionPoint[] }) => {
  if (!points.length) {
    return <ChartPlaceholder>Нет данных по цели</ChartPlaceholder>;
  }
  const sortedPoints = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const labels = buildAxisLabels(sortedPoints, 5, 10);
  const values = sortedPoints.map((point) => point.conversionRate ?? 0);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const yLabels = buildYAxisLabels(min, max, 2, 5);
  const range = max - min || 1;
  const width = 320;
  const height = 90;
  const padding = 8;
  const stepX = sortedPoints.length > 1 ? (width - padding * 2) / (sortedPoints.length - 1) : 0;
  const polyline = sortedPoints
    .map((point, index) => {
      const x = padding + stepX * index;
      const value = point.conversionRate ?? 0;
      const y = height - padding - ((value - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <ChartWrapper>
      <ChartCanvas>
        <ChartYAxis>
          {yLabels.map((label, index) => (
            <span key={`${label}-${index}`}>{label}</span>
          ))}
        </ChartYAxis>
        <ChartPlot>
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
          >
            <line
              x1={padding}
              y1={padding}
              x2={padding}
              y2={height - padding}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
            <line
              x1={padding}
              y1={height - padding}
              x2={width - padding}
              y2={height - padding}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
            <polyline points={polyline} fill="none" stroke="#2563eb" strokeWidth="2" />
          </svg>
          <ChartAxis>
            {labels.map((label, index) => (
              <span key={`${label}-${index}`}>{label}</span>
            ))}
          </ChartAxis>
        </ChartPlot>
      </ChartCanvas>
    </ChartWrapper>
  );
};

const buildAxisLabels = (
  points: AnalyticsGoalDailyConversionPoint[],
  minLabels: number,
  maxLabels: number,
) => {
  if (points.length === 0) {
    return [];
  }
  if (points.length <= minLabels) {
    return points.map((point) => formatChartDate(point.date));
  }
  const targetLabels = Math.min(maxLabels, Math.max(minLabels, points.length));
  const step = (points.length - 1) / (targetLabels - 1);
  const indices = new Set<number>();
  for (let i = 0; i < targetLabels; i += 1) {
    indices.add(Math.round(i * step));
  }
  indices.add(points.length - 1);
  return Array.from(indices)
    .sort((a, b) => a - b)
    .map((index) => formatChartDate(points[index].date));
};

const buildYAxisLabels = (
  min: number,
  max: number,
  minLabels: number,
  maxLabels: number,
) => {
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return [];
  }
  const normalizedMin = Math.min(min, max);
  const normalizedMax = Math.max(min, max);
  const labelCount = Math.min(maxLabels, Math.max(minLabels, 4));
  if (normalizedMax === normalizedMin) {
    return Array.from({ length: labelCount }, () => formatAxisPercent(normalizedMax));
  }
  const range = normalizedMax - normalizedMin;
  return Array.from({ length: labelCount }, (_, index) => {
    const value = normalizedMax - (range * index) / (labelCount - 1);
    return formatAxisPercent(value);
  });
};

const formatAxisPercent = (value: number) => {
  if (!Number.isFinite(value)) {
    return "—";
  }
  return `${value.toFixed(1)}%`;
};

const formatChartDate = (value: string) => {
  const parts = value.split("-");
  if (parts.length === 3) {
    return `${parts[2]}.${parts[1]}`;
  }
  return value;
};

const GoalTopRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: stretch;
`;

const GoalSummaryBlock = styled.div`
  display: flex;
  flex: 0 1 400px;
  flex-direction: column;
  gap: 8px;
  max-width: 400px;
  width: 100%;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  padding: 10px 12px;
  background: #f9fafb;
  height: 100%;
`;

const GoalSummaryItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const GoalName = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 6px;
`;

const MetricLabel = styled.div`
  font-size: 12px;
  color: #6b7280;
`;

const MetricValue = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: #111827;
`;

const ChartBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1 1 320px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  padding: 10px 12px;
  background: #f9fafb;
  overflow: hidden;
`;

const ChartTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #374151;
`;

const ChartWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: stretch;
  width: 100%;
  flex: 1;
  min-height: 0;
`;

const ChartCanvas = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 8px;
  align-items: stretch;
  flex: 1;
  min-height: 0;
`;

const ChartYAxis = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  font-size: 11px;
  color: #6b7280;
  min-width: 48px;
  text-align: right;
`;

const ChartPlot = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  flex: 1;
  min-height: 0;
`;

const ChartAxis = styled.div`
  width: 100%;
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 11px;
  color: #6b7280;
`;

const ChartPlaceholder = styled.div`
  font-size: 12px;
  color: #9ca3af;
  padding: 12px 0;
  text-align: center;
`;
