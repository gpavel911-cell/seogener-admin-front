import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import type { MetricsGoalDailyConversionPoint, MetricsGoalDto } from "@entities/metrics/types";
import { buildAxisIndexes, buildYAxisLabels, formatChartDate } from "@shared/lib/charts";
import { formatNumber, formatPercent } from "../../../lib/formatters";

export const GoalInfo = ({ goal }: { goal: MetricsGoalDto }) => {
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

const GoalConversionChart = ({ points }: { points: MetricsGoalDailyConversionPoint[] }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!points.length) {
    return <ChartPlaceholder>Нет данных для отображения.</ChartPlaceholder>;
  }
  const sortedPoints = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const labels = buildAxisLabels(sortedPoints, 5, 10);
  const values = sortedPoints.map((point) => point.conversionRate ?? 0);
  const max = Math.max(0, ...values);
  const yLabels = buildYAxisLabels(0, max, 2, 5, formatAxisPercent);
  const width = 320;
  const height = 90;
  const padding = 8;
  const plotHeight = height - padding * 2;
  const plotWidth = width - padding * 2;
  const slotWidth = plotWidth / sortedPoints.length;
  const barWidth = Math.max(3, Math.min(14, slotWidth * 0.7));
  const bars = sortedPoints.map((point, index) => {
    const value = Math.max(0, point.conversionRate ?? 0);
    const barHeight = max > 0 ? (value / max) * plotHeight : 0;
    const x = padding + index * slotWidth + (slotWidth - barWidth) / 2;
    const y = height - padding - barHeight;
    return {
      x,
      y,
      width: barWidth,
      height: Math.max(barHeight, 1),
      value,
      centerX: x + barWidth / 2,
    };
  });
  const hoveredBar = hoveredIndex !== null ? bars[hoveredIndex] : null;
  const hoveredDate = hoveredIndex !== null ? formatChartDate(sortedPoints[hoveredIndex].date) : null;
  const tooltipLeftPercent = hoveredBar ? (hoveredBar.centerX / width) * 100 : 0;
  const tooltipTopPercent = hoveredBar ? (hoveredBar.y / height) * 100 : 0;

  return (
    <ChartWrapper>
      <ChartCanvas>
        <ChartYAxis>
          {yLabels.map((label, index) => (
            <span key={`${label}-${index}`}>{label}</span>
          ))}
        </ChartYAxis>
        <ChartPlot>
          <ChartSvgWrap>
            <svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${width} ${height}`}
              preserveAspectRatio="none"
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <defs>
                <linearGradient id="goalBarGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#60a5fa" />
                  <stop offset="100%" stopColor="#2563eb" />
                </linearGradient>
                <linearGradient id="goalBarGradientActive" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#93c5fd" />
                  <stop offset="100%" stopColor="#1d4ed8" />
                </linearGradient>
              </defs>
              {yLabels.map((_, index) => {
                const y = padding + ((height - padding * 2) * index) / (Math.max(yLabels.length - 1, 1));
                return (
                  <line
                    key={`grid-${index}`}
                    x1={padding}
                    y1={y}
                    x2={width - padding}
                    y2={y}
                    stroke="#e3ecfb"
                    strokeWidth="1"
                  />
                );
              })}
              <line
                x1={padding}
                y1={padding}
                x2={padding}
                y2={height - padding}
                stroke="#d7e3f8"
                strokeWidth="1"
              />
              <line
                x1={padding}
                y1={height - padding}
                x2={width - padding}
                y2={height - padding}
                stroke="#d7e3f8"
                strokeWidth="1"
              />
              {bars.map((bar, index) => (
                <rect
                  key={`${bar.x}-${index}`}
                  x={bar.x}
                  y={bar.y}
                  width={bar.width}
                  height={bar.height}
                  rx="2"
                  fill={hoveredIndex === index ? "url(#goalBarGradientActive)" : "url(#goalBarGradient)"}
                  opacity={hoveredIndex === null || hoveredIndex === index ? 1 : 0.5}
                  onMouseEnter={() => setHoveredIndex(index)}
                />
              ))}
              {hoveredBar ? (
                <g pointerEvents="none">
                  <line
                    x1={hoveredBar.centerX}
                    y1={padding}
                    x2={hoveredBar.centerX}
                    y2={height - padding}
                    stroke="#c7d9fb"
                    strokeWidth="1"
                    strokeDasharray="2 3"
                  />
                </g>
              ) : null}
            </svg>
            {hoveredBar && hoveredDate ? (
              <ChartTooltip
                style={{
                  left: `${tooltipLeftPercent}%`,
                  top: `${tooltipTopPercent}%`,
                }}
              >
                <ChartTooltipDate>{hoveredDate}</ChartTooltipDate>
                <ChartTooltipValue>{formatAxisPercent(hoveredBar.value)}</ChartTooltipValue>
              </ChartTooltip>
            ) : null}
          </ChartSvgWrap>
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
  points: MetricsGoalDailyConversionPoint[],
  minLabels: number,
  maxLabels: number,
) => {
  if (points.length === 0) {
    return [];
  }
  return Array.from(buildAxisIndexes(points.length, minLabels, maxLabels))
    .sort((a, b) => a - b)
    .map((index) => formatChartDate(points[index].date));
};

const formatAxisPercent = (value: number) => {
  if (!Number.isFinite(value)) {
    return "—";
  }
  return `${value.toFixed(1)}%`;
};

const GoalTopRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: stretch;
  min-height: 250px;
  max-height: 250px;
  overflow: hidden;
  border: 1px solid #dbe7fa;
  border-radius: 14px;
  padding: 10px;
  background: linear-gradient(180deg, #f8fbff 0%, #f2f7ff 100%);
`;

const GoalSummaryBlock = styled.div`
  display: flex;
  flex: 0 1 380px;
  flex-direction: column;
  gap: 10px;
  max-width: 380px;
  width: 100%;
  border-radius: 12px;
  border: 1px solid #dbe7fa;
  padding: 12px;
  background: #ffffff;
  box-shadow: 0 6px 18px rgba(37, 99, 235, 0.06);
  height: 100%;
`;

const GoalSummaryItem = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  border-radius: 8px;
  padding: 4px 6px;
  background: #f7faff;
`;

const GoalName = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 2px;
  line-height: 1.25;
`;

const MetricLabel = styled.div`
  font-size: 12px;
  color: #64748b;
`;

const MetricValue = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: #1d4ed8;
`;

const ChartBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1 1 320px;
  border-radius: 12px;
  border: 1px solid #dbe7fa;
  padding: 12px;
  background: #ffffff;
  box-shadow: 0 6px 18px rgba(37, 99, 235, 0.06);
  overflow: hidden;
`;

const ChartTitle = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: #1e3a8a;
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
  color: #64748b;
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

const ChartSvgWrap = styled.div`
  position: relative;
  width: 100%;
  flex: 1;
  min-height: 0;
`;

const ChartTooltip = styled.div`
  position: absolute;
  width: 96px;
  min-height: 32px;
  border-radius: 6px;
  background: rgba(15, 23, 42, 0.92);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  pointer-events: none;
  padding: 4px 6px;
  transform: translate(-50%, calc(-100% - 8px));
`;

const ChartTooltipDate = styled.div`
  color: #cbd5e1;
  font-size: 10px;
  line-height: 1.1;
  font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
`;

const ChartTooltipValue = styled.div`
  color: #ffffff;
  font-size: 11px;
  line-height: 1.2;
  font-weight: 700;
  font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
`;

const ChartAxis = styled.div`
  width: 100%;
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 11px;
  color: #64748b;
`;

const ChartPlaceholder = styled.div`
  font-size: 12px;
  color: #94a3b8;
  padding: 12px 0;
  text-align: center;
`;
