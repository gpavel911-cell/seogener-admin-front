"use client";

import { useMemo, useState } from "react";
import styled from "styled-components";
import {
  useLazyGetWebmasterSearchEventsHistoryQuery,
} from "@entities/webmaster/api";
import { useWebmasterSelectOptions } from "@entities/webmaster/select-options";
import {
  type WebmasterSearchEventHistoryPointDto,
  WebmasterProviderType,
} from "@entities/webmaster/types";
import {
  Button,
  CenteredState,
  DateInput,
  FieldLabel,
  FormActions,
  FormCard,
  FormField,
  FormFields,
  FormRow,
  FormStack,
  PlaceholderText,
  ResultLoader,
  ResultCard,
  SelectControl,
  useToast,
} from "@shared/ui";
import { buildAxisIndexes, buildYAxisLabels, formatChartDate } from "@shared/lib/charts";

const DEFAULT_PROVIDER = WebmasterProviderType.YANDEX_WEBMASTER;
const DEFAULT_RANGE_DAYS = 7;
const MAX_RANGE_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

const formatDate = (value: Date) => value.toISOString().slice(0, 10);

const buildDefaultDateRange = () => {
  const today = new Date();
  const dateTo = formatDate(today);
  const dateFrom = formatDate(new Date(today.getTime() - (DEFAULT_RANGE_DAYS - 1) * 24 * 60 * 60 * 1000));
  return { dateFrom, dateTo };
};

type ActionsSectionWebmasterSearchUrlsProps = {
  fixedProvider?: WebmasterProviderType | null;
  fixedProfile?: string | null;
};

export const SearchUrls = ({ fixedProvider, fixedProfile }: ActionsSectionWebmasterSearchUrlsProps = {}) => {
  const { showToast } = useToast();
  const { dateFrom: defaultFrom, dateTo: defaultTo } = buildDefaultDateRange();
  const [activeProfile, setActiveProfile] = useState<string | null>(null);
  const [hostId, setHostId] = useState("");
  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(defaultTo);
  const [resultByProfile, setResultByProfile] = useState<{
    profile: string;
    data: WebmasterSearchEventHistoryPointDto[];
    dateFrom: string;
    dateTo: string;
  } | null>(null);
  const provider = fixedProvider ?? DEFAULT_PROVIDER;

  const {
    resolvedProfile,
    profileOptions,
    hostOptions,
    resolvedHostId,
    isProfilesFetching,
    isHostsFetching,
  } = useWebmasterSelectOptions({
    activeProfile,
    fixedProfile: fixedProfile ?? null,
    fixedProvider: provider,
    activeHostId: hostId,
  });
  const result = useMemo(
    () => (resolvedProfile && resultByProfile?.profile === resolvedProfile ? resultByProfile : null),
    [resolvedProfile, resultByProfile],
  );
  const rows = useMemo(
    () => (result ? buildRowsWithFullRange(result.data, result.dateFrom, result.dateTo) : []),
    [result],
  );
  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => ({
          added: acc.added + (row.added ?? 0),
          removed: acc.removed + (row.removed ?? 0),
        }),
        { added: 0, removed: 0 },
      ),
    [rows],
  );

  const [loadHistory, { isFetching }] = useLazyGetWebmasterSearchEventsHistoryQuery();

  const handleLoad = async () => {
    if (!resolvedProfile) {
      showToast({ variant: "error", message: "Выберите профиль Вебмастера." });
      return;
    }
    if (!resolvedHostId) {
      showToast({ variant: "error", message: "Выберите сайт." });
      return;
    }
    if (!isValidDateRange(dateFrom, dateTo)) {
      showToast({ variant: "error", message: "Период не может превышать 30 дней." });
      return;
    }
    try {
      const response = await loadHistory({
        provider,
        profile: resolvedProfile,
        hostId: resolvedHostId,
        dateFrom,
        dateTo,
      }).unwrap();
      setResultByProfile({
        profile: resolvedProfile,
        data: response,
        dateFrom,
        dateTo,
      });
    } catch {
      showToast({ variant: "error", message: "Ошибка загрузки отчета." });
    }
  };

  return (
    <FormStack>
      <FormCard>
        <FormRow>
          <FormFields>
            {!fixedProfile && (
              <FormField>
                <FieldLabel>Профиль Вебмастера</FieldLabel>
                <SelectControl
                  value={resolvedProfile ?? ""}
                  onValueChange={setActiveProfile}
                  disabled={isProfilesFetching}
                  options={profileOptions}
                  placeholder="Выберите профиль"
                />
              </FormField>
            )}
            <FormField>
              <FieldLabel>Сайт</FieldLabel>
              <SelectControl
                value={resolvedHostId}
                onValueChange={setHostId}
                disabled={isHostsFetching}
                options={hostOptions}
                placeholder={hostOptions.length ? "Выберите сайт" : "Нет сайтов"}
              />
            </FormField>
            <FormField>
              <FieldLabel>Дата начала</FieldLabel>
              <DateInput value={dateFrom} max={dateTo} onChange={(event) => setDateFrom(event.target.value)} />
            </FormField>
            <FormField>
              <FieldLabel>Дата конца</FieldLabel>
              <DateInput value={dateTo} min={dateFrom} onChange={(event) => setDateTo(event.target.value)} />
            </FormField>
          </FormFields>
          <FormActions>
            <Button type="button" variant="primary" onClick={handleLoad} disabled={isFetching}>
              {isFetching ? "Загрузка..." : "Показать"}
            </Button>
          </FormActions>
        </FormRow>
      </FormCard>
      <ResultCard>
        {isFetching ? (
          <ResultLoader label="Загрузка отчета..." />
        ) : !result ? (
          <CenteredState>
            <PlaceholderText>Нет данных для отображения.</PlaceholderText>
          </CenteredState>
        ) : rows.length === 0 ? (
          <CenteredState>
            <PlaceholderText>Нет данных для отображения.</PlaceholderText>
          </CenteredState>
        ) : (
          <ChartWrapper>
            <SearchPagesBarsChart rows={rows} />
            <Totals>
              <TotalItem data-kind="added">Добавлено: {formatMetricValue(totals.added)}</TotalItem>
              <TotalItem data-kind="removed">Удалено: {formatMetricValue(totals.removed)}</TotalItem>
            </Totals>
          </ChartWrapper>
        )}
      </ResultCard>
    </FormStack>
  );
};

const formatDayLabel = formatChartDate;

const formatMetricValue = (value: number): string => value.toLocaleString("ru-RU");

const buildRowsWithFullRange = (
  data: WebmasterSearchEventHistoryPointDto[],
  dateFrom: string,
  dateTo: string,
): WebmasterSearchEventHistoryPointDto[] => {
  const fromDate = parseDate(dateFrom);
  const toDate = parseDate(dateTo);
  if (!fromDate || !toDate || fromDate > toDate) {
    return data;
  }

  const byDate = new Map<string, { added: number; removed: number }>();
  for (const row of data) {
    if (!row.date) {
      continue;
    }
    const existing = byDate.get(row.date) ?? { added: 0, removed: 0 };
    existing.added += row.added ?? 0;
    existing.removed += row.removed ?? 0;
    byDate.set(row.date, existing);
  }

  const rows: WebmasterSearchEventHistoryPointDto[] = [];
  for (let current = new Date(fromDate.getTime()); current <= toDate; current = new Date(current.getTime() + DAY_MS)) {
    const date = formatDate(current);
    const point = byDate.get(date);
    rows.push({
      date,
      added: point?.added ?? 0,
      removed: point?.removed ?? 0,
    });
  }
  return rows;
};

const isValidDateRange = (from: string, to: string): boolean => {
  const fromDate = parseDate(from);
  const toDate = parseDate(to);
  if (!fromDate || !toDate || fromDate > toDate) {
    return false;
  }
  const dayDiff = Math.floor((toDate.getTime() - fromDate.getTime()) / DAY_MS);
  return dayDiff <= MAX_RANGE_DAYS - 1;
};

const parseDate = (value: string): Date | null => {
  if (!value) {
    return null;
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
};

type SearchPagesBarsChartProps = {
  rows: WebmasterSearchEventHistoryPointDto[];
};

type HoveredBar = {
  rowIndex: number;
  kind: "added" | "removed";
};

const SearchPagesBarsChart = ({ rows }: SearchPagesBarsChartProps) => {
  const [hovered, setHovered] = useState<HoveredBar | null>(null);

  if (!rows.length) {
    return null;
  }

  const width = 320;
  const height = 110;
  const padding = 10;
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;
  const maxValue = Math.max(1, ...rows.flatMap((item) => [item.added ?? 0, item.removed ?? 0]));
  const yLabels = buildYAxisLabels(0, maxValue, 2, 5, (value) => formatMetricValue(Math.round(value)));
  const slotWidth = plotWidth / rows.length;
  const pairWidth = Math.max(5, Math.min(16, slotWidth * 0.75));
  const barGap = 2;
  const barWidth = Math.max(2, (pairWidth - barGap) / 2);

  const bars = rows.map((row, index) => {
    const addedValue = Math.max(0, row.added ?? 0);
    const removedValue = Math.max(0, row.removed ?? 0);
    const addedHeight = maxValue > 0 ? (addedValue / maxValue) * plotHeight : 0;
    const removedHeight = maxValue > 0 ? (removedValue / maxValue) * plotHeight : 0;
    const pairStartX = padding + index * slotWidth + (slotWidth - (barWidth * 2 + barGap)) / 2;
    return {
      date: row.date,
      added: {
        value: addedValue,
        x: pairStartX,
        y: height - padding - addedHeight,
        width: barWidth,
        height: Math.max(addedHeight, addedValue > 0 ? 1 : 0),
        centerX: pairStartX + barWidth / 2,
      },
      removed: {
        value: removedValue,
        x: pairStartX + barWidth + barGap,
        y: height - padding - removedHeight,
        width: barWidth,
        height: Math.max(removedHeight, removedValue > 0 ? 1 : 0),
        centerX: pairStartX + barWidth + barGap + barWidth / 2,
      },
    };
  });

  const hoveredBar = hovered ? bars[hovered.rowIndex]?.[hovered.kind] : null;
  const hoveredDate = hovered ? bars[hovered.rowIndex]?.date : null;
  const tooltipLeftPercent = hoveredBar ? (hoveredBar.centerX / width) * 100 : 0;
  const tooltipTopPercent = hoveredBar ? (hoveredBar.y / height) * 100 : 0;
  const xLabelIndexes = buildAxisIndexes(rows.length, 5, 10);

  return (
    <ChartCanvas>
      <ChartYAxis>
        {yLabels.map((label, index) => (
          <span key={`${label}-${index}`}>{label}</span>
        ))}
      </ChartYAxis>
      <ChartPlot>
        <ChartSvgWrap>
          <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" onMouseLeave={() => setHovered(null)}>
            <defs>
              <linearGradient id="addedBarGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#4ade80" />
                <stop offset="100%" stopColor="#16a34a" />
              </linearGradient>
              <linearGradient id="addedBarGradientActive" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#86efac" />
                <stop offset="100%" stopColor="#15803d" />
              </linearGradient>
              <linearGradient id="removedBarGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#f87171" />
                <stop offset="100%" stopColor="#dc2626" />
              </linearGradient>
              <linearGradient id="removedBarGradientActive" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fca5a5" />
                <stop offset="100%" stopColor="#b91c1c" />
              </linearGradient>
            </defs>
            {yLabels.map((_, index) => {
              const y = padding + (plotHeight * index) / Math.max(yLabels.length - 1, 1);
              return (
                <line
                  key={`grid-${index}`}
                  x1={padding}
                  y1={y}
                  x2={width - padding}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
              );
            })}
            <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#d1d5db" strokeWidth="1" />
            <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#d1d5db" strokeWidth="1" />
            {bars.map((bar, rowIndex) => (
              <g key={`${bar.date}-${rowIndex}`}>
                <rect
                  x={bar.added.x}
                  y={bar.added.y}
                  width={bar.added.width}
                  height={bar.added.height}
                  rx="2"
                  fill={hovered?.rowIndex === rowIndex && hovered.kind === "added" ? "url(#addedBarGradientActive)" : "url(#addedBarGradient)"}
                  opacity={hovered === null || hovered.rowIndex === rowIndex ? 1 : 0.5}
                  onMouseEnter={() => setHovered({ rowIndex, kind: "added" })}
                />
                <rect
                  x={bar.removed.x}
                  y={bar.removed.y}
                  width={bar.removed.width}
                  height={bar.removed.height}
                  rx="2"
                  fill={hovered?.rowIndex === rowIndex && hovered.kind === "removed" ? "url(#removedBarGradientActive)" : "url(#removedBarGradient)"}
                  opacity={hovered === null || hovered.rowIndex === rowIndex ? 1 : 0.5}
                  onMouseEnter={() => setHovered({ rowIndex, kind: "removed" })}
                />
              </g>
            ))}
            {hoveredBar ? (
              <line
                x1={hoveredBar.centerX}
                y1={padding}
                x2={hoveredBar.centerX}
                y2={height - padding}
                stroke="#cbd5e1"
                strokeWidth="1"
                strokeDasharray="2 3"
              />
            ) : null}
          </svg>
          {hoveredBar && hoveredDate && hovered ? (
            <ChartTooltip style={{ left: `${tooltipLeftPercent}%`, top: `${tooltipTopPercent}%` }}>
              <ChartTooltipDate>{formatDayLabel(hoveredDate)}</ChartTooltipDate>
              <ChartTooltipValue>
                {hovered.kind === "added" ? "Добавлено: " : "Удалено: "}
                {formatMetricValue(hoveredBar.value)}
              </ChartTooltipValue>
            </ChartTooltip>
          ) : null}
        </ChartSvgWrap>
        <ChartAxis $columns={rows.length}>
          {rows.map((row, index) => (
            <span key={`axis-${row.date}-${index}`}>
              {xLabelIndexes.has(index) ? formatDayLabel(row.date) : ""}
            </span>
          ))}
        </ChartAxis>
      </ChartPlot>
    </ChartCanvas>
  );
};

const ChartWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ChartCanvas = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 8px;
  align-items: stretch;
  height: 250px;
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
  min-height: 0;
`;

const ChartSvgWrap = styled.div`
  position: relative;
  width: 100%;
  min-height: 0;
  flex: 1;
`;

const ChartTooltip = styled.div`
  position: absolute;
  width: 116px;
  min-height: 34px;
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
`;

const ChartTooltipValue = styled.div`
  color: #ffffff;
  font-size: 11px;
  line-height: 1.2;
  font-weight: 700;
`;

const ChartAxis = styled.div<{ $columns: number }>`
  width: 100%;
  display: grid;
  grid-template-columns: repeat(${({ $columns }) => Math.max($columns, 1)}, minmax(0, 1fr));
  gap: 4px;
  font-size: 11px;
  color: #64748b;

  span {
    text-align: center;
    white-space: nowrap;
  }
`;

const Totals = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  width: 100%;
`;

const TotalItem = styled.span`
  display: inline-flex;
  align-items: center;
  font-size: 13px;
  font-weight: 500;
  color: #374151;

  &[data-kind="added"] {
    color: #15803d;
  }

  &[data-kind="removed"] {
    color: #b91c1c;
  }
`;

