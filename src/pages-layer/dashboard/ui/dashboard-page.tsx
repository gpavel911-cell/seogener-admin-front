"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import { FaInfoCircle, FaSyncAlt } from "react-icons/fa";
import styled, { css, keyframes } from "styled-components";
import { getDefaultDashboardDateRange, validateDashboardAnalyticsFilters } from "../lib/dashboard-analytics";
import { shouldShowBulkRecrawlButton } from "../lib/dashboard-action-visibility";
import { buildDashboardBarGroups, getNearestDashboardChartIndex } from "../lib/dashboard-chart";
import { DashboardMetricsSection } from "./dashboard-metrics-section";
import {
  formatDashboardSummaryDelta,
  getDashboardSummaryCardDotColor,
  getDashboardSummaryDeltaTone,
  orderDashboardSummaryCards,
  shouldRenderDashboardSummaryDelta,
} from "../lib/dashboard-summary";
import { DashboardDetailsModalContent } from "./dashboard-detail-page";
import {
  useGetDashboardAnalyticsQuery,
  useGetDashboardQuery,
  useRecrawlDashboardSiteMutation,
  useRecrawlDashboardSitesMutation,
} from "@entities/dashboard/api";
import type {
  DashboardAnalyticsRequest,
  DashboardAnalyticsResponseDto,
  DashboardAnalyticsSeriesDto,
  DashboardListRequest,
  DashboardRecrawlReportDto,
  DashboardRowDto,
} from "@entities/dashboard/types";
import { useGetProjectOptionsQuery } from "@entities/projects/api";
import { usePagination } from "@shared/lib/use-pagination";
import { PaginationControls } from "@shared/ui/pagination-controls";
import {
  Button,
  EMPTY_DATA_MESSAGE,
  PageHeader,
  PlaceholderText,
  SelectControl,
  StyledInput,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableWrapper,
  useToast,
} from "@shared/ui";
import { ModalDialog } from "@shared/ui-kit/modal-dialog";

type DashboardView = "indexing" | "metrics";

const DASHBOARD_VIEWS: Array<{ id: DashboardView; label: string }> = [
  { id: "indexing", label: "Индексация" },
  { id: "metrics", label: "Метрика" },
];
const UNAVAILABLE_PLACEHOLDER = "—";
const CHART_COLORS: Record<DashboardAnalyticsSeriesDto["key"], string> = {
  added: "#22c55e",
  removed: "#ef4444",
};

type ApiError = { data?: { message?: string } };

type AppliedFilters = {
  projectId: string;
  query: string;
  dateFrom: string;
  dateTo: string;
};

export function DashboardPage() {
  const defaultRange = useMemo(() => getDefaultDashboardDateRange(), []);
  const { showToast } = useToast();
  const { page, pageSize, pageSizeOptions, setPage, setPageSize } = usePagination({ initialPageSize: 5 });
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState(defaultRange.dateFrom);
  const [dateTo, setDateTo] = useState(defaultRange.dateTo);
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters | null>(null);
  const [reportDomains, setReportDomains] = useState<string[]>([]);
  const [failedReportDomains, setFailedReportDomains] = useState<string[]>([]);
  const [report, setReport] = useState<DashboardRecrawlReportDto | null>(null);
  const [activeRecrawlSiteId, setActiveRecrawlSiteId] = useState<number | null>(null);
  const [selectedSiteIds, setSelectedSiteIds] = useState<number[]>([]);
  const [isBulkRecrawling, setIsBulkRecrawling] = useState(false);
  const [detailRow, setDetailRow] = useState<DashboardRowDto | null>(null);
  const [activeView, setActiveView] = useState<DashboardView>("indexing");

  const { data: projectOptions = [] } = useGetProjectOptionsQuery();
  const [recrawlDashboardSite] = useRecrawlDashboardSiteMutation();
  const [recrawlDashboardSites] = useRecrawlDashboardSitesMutation();
  const effectiveProjectId = selectedProjectId || projectOptions[0]?.value || "";

  const dashboardQueryArgs = useMemo<DashboardListRequest | typeof skipToken>(() => {
    if (!appliedFilters) {
      return skipToken;
    }
    return {
      pageNumber: page,
      pageSize,
      projectId: Number(appliedFilters.projectId),
      ...(appliedFilters.query.length > 0 ? { query: appliedFilters.query } : {}),
    };
  }, [appliedFilters, page, pageSize]);

  const analyticsQueryArgs = useMemo<DashboardAnalyticsRequest | typeof skipToken>(() => {
    if (!appliedFilters) {
      return skipToken;
    }
    return {
      projectId: Number(appliedFilters.projectId),
      dateFrom: appliedFilters.dateFrom,
      dateTo: appliedFilters.dateTo,
      ...(appliedFilters.query.length > 0 ? { query: appliedFilters.query } : {}),
    };
  }, [appliedFilters]);

  const { data, isFetching, error } = useGetDashboardQuery(dashboardQueryArgs);
  const {
    data: analytics,
    isFetching: isFetchingAnalytics,
    error: analyticsError,
  } = useGetDashboardAnalyticsQuery(analyticsQueryArgs);
  const rows = useMemo(() => data?.content ?? [], [data?.content]);
  const totalPages = data?.totalPages ?? 0;
  const hasLoaded = appliedFilters !== null;
  const isLoadingDashboard = isFetching || isFetchingAnalytics;
  const selectedRows = useMemo(
    () => rows.filter((row) => selectedSiteIds.includes(row.siteId)),
    [rows, selectedSiteIds],
  );
  const visibleSiteIds = useMemo(() => rows.map((row) => row.siteId), [rows]);
  const allVisibleRowsSelected = rows.length > 0 && rows.every((row) => selectedSiteIds.includes(row.siteId));
  const someVisibleRowsSelected = rows.some((row) => selectedSiteIds.includes(row.siteId));

  useEffect(() => {
    if (!error) return;
    showToast({ variant: "error", message: "Ошибка загрузки данных индексации. Повторите запрос." });
  }, [error, showToast]);

  useEffect(() => {
    if (!analyticsError) return;
    showToast({ variant: "error", message: "Ошибка загрузки аналитики индексации. Повторите запрос." });
  }, [analyticsError, showToast]);

  useEffect(() => {
    setSelectedSiteIds((prev) => prev.filter((siteId) => rows.some((row) => row.siteId === siteId)));
  }, [rows]);

  const resetDashboard = () => {
    setPage(0);
    setAppliedFilters(null);
    setSelectedSiteIds([]);
  };

  const executeSiteRecrawl = async (row: DashboardRowDto) => {
    setActiveRecrawlSiteId(row.siteId);
    try {
      return await recrawlDashboardSite(row.siteId).unwrap();
    } catch (error) {
      const message = (error as ApiError)?.data?.message ?? "Не удалось запустить переобход.";
      showToast({ variant: "error", message });
      throw error;
    } finally {
      setActiveRecrawlSiteId(null);
    }
  };

  const handleRecrawl = async (row: DashboardRowDto) => {
    try {
      const result = await executeSiteRecrawl(row);
      setReportDomains([row.domain]);
      setFailedReportDomains([]);
      setReport(result);
    } catch {
      // Error toast is shown in executeSiteRecrawl.
    }
  };

  const handleBulkRecrawl = async () => {
    if (selectedRows.length === 0) {
      showToast({ variant: "error", message: "Выберите хотя бы один сайт для переобхода." });
      return;
    }
    setIsBulkRecrawling(true);
    try {
      const result = await recrawlDashboardSites({ siteIds: selectedRows.map((row) => row.siteId) }).unwrap();
      setReportDomains(result.domains);
      setFailedReportDomains(result.failedDomains);
      setReport({
        sentCount: result.sentCount,
        skippedCount: result.skippedCount,
        quotaLimitedCount: result.quotaLimitedCount,
      });
      setSelectedSiteIds([]);
    } catch (error) {
      const message = (error as ApiError)?.data?.message ?? "Не удалось запустить переобход.";
      showToast({ variant: "error", message });
    } finally {
      setIsBulkRecrawling(false);
    }
  };

  const handleShow = () => {
    const validationMessage = validateDashboardAnalyticsFilters({
      projectId: effectiveProjectId,
      dateFrom,
      dateTo,
    });
    if (validationMessage) {
      showToast({ variant: "error", message: validationMessage });
      return;
    }
    setPage(0);
    setAppliedFilters({
      projectId: effectiveProjectId,
      query: search.trim(),
      dateFrom,
      dateTo,
    });
  };

  const handleOpenDetails = (row: DashboardRowDto) => setDetailRow(row);
  const handleToggleVisibleRows = (checked: boolean) => {
    setSelectedSiteIds((prev) => {
      if (checked) {
        return Array.from(new Set([...prev, ...visibleSiteIds]));
      }
      return prev.filter((siteId) => !visibleSiteIds.includes(siteId));
    });
  };

  return (
    <Root>
      <PageHeader title="Дашборд" />
      <Body>
        <SubSidebar aria-label="Навигация по дашборду">
          <SubList>
            {DASHBOARD_VIEWS.map((view) => (
              <SubItem key={view.id}>
                <SubButton
                  type="button"
                  $active={activeView === view.id}
                  aria-current={activeView === view.id ? "page" : undefined}
                  onClick={() => setActiveView(view.id)}
                >
                  {view.label}
                </SubButton>
              </SubItem>
            ))}
          </SubList>
        </SubSidebar>
        <Content>
          {activeView === "metrics" ? (
            <DashboardMetricsSection />
          ) : (
            <>
              <Toolbar>
                <Field>
                  <Label>Дата начала</Label>
                  <StyledInput
                    type="date"
                    value={dateFrom}
                    max={defaultRange.dateTo}
                    onChange={(event) => {
                      setDateFrom(event.target.value);
                      resetDashboard();
                    }}
                  />
                </Field>
                <Field>
                  <Label>Дата конца</Label>
                  <StyledInput
                    type="date"
                    value={dateTo}
                    max={defaultRange.dateTo}
                    onChange={(event) => {
                      setDateTo(event.target.value);
                      resetDashboard();
                    }}
                  />
                </Field>
                <Field>
                  <Label>Проект</Label>
                  <SelectControl
                    value={effectiveProjectId}
                    onValueChange={(value) => {
                      setSelectedProjectId(value);
                      resetDashboard();
                    }}
                    options={projectOptions}
                  />
                </Field>
                <SearchField>
                  <Label>Поиск по домену</Label>
                  <StyledInput
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      resetDashboard();
                    }}
                    placeholder="Введите домен"
                  />
                </SearchField>
                <ShowButton
                  type="button"
                  variant="primary"
                  onClick={handleShow}
                  disabled={isLoadingDashboard || !effectiveProjectId}
                >
                  {isLoadingDashboard ? "Загрузка..." : "Показать"}
                </ShowButton>
              </Toolbar>

              {!hasLoaded ? (
                <PlaceholderCard>Выберите фильтры и нажмите кнопку Показать.</PlaceholderCard>
              ) : (
                <>
                  <DashboardChartPanel analytics={analytics} isFetching={isFetchingAnalytics} hasError={Boolean(analyticsError)} />
                  <DashboardSummaryPanel
                    analytics={analytics}
                    isFetching={isFetchingAnalytics}
                    hasError={Boolean(analyticsError)}
                  />
                  {shouldShowBulkRecrawlButton(selectedRows.length) ? (
                    <TableActions>
                      <BulkRecrawlButton
                        type="button"
                        variant="primary"
                        onClick={handleBulkRecrawl}
                        disabled={isBulkRecrawling || isFetching}
                      >
                        {isBulkRecrawling ? "Переобход..." : "Запустить переобход"}
                      </BulkRecrawlButton>
                    </TableActions>
                  ) : null}
                  <DashboardTable
                    rows={rows}
                    isFetching={isFetching}
                    activeRecrawlSiteId={activeRecrawlSiteId}
                    isBulkRecrawling={isBulkRecrawling}
                    selectedSiteIds={selectedSiteIds}
                    onToggleSelect={(siteId, checked) => {
                      setSelectedSiteIds((prev) => {
                        if (checked) {
                          return prev.includes(siteId) ? prev : [...prev, siteId];
                        }
                        return prev.filter((value) => value !== siteId);
                      });
                    }}
                    allVisibleRowsSelected={allVisibleRowsSelected}
                    someVisibleRowsSelected={someVisibleRowsSelected}
                    onToggleVisibleRows={handleToggleVisibleRows}
                    onRecrawl={handleRecrawl}
                    onOpenDetails={handleOpenDetails}
                  />
                  <PaginationControls
                    page={page}
                    totalPages={totalPages}
                    pageSize={pageSize}
                    pageSizeOptions={pageSizeOptions}
                    isFetching={isFetching}
                    onPageChange={setPage}
                    onPageSizeChange={setPageSize}
                  />
                </>
              )}
            </>
          )}
        </Content>
      </Body>
      <ModalDialog
        open={report !== null}
        onOpenChange={(open) => {
          if (!open) {
            setReport(null);
            setReportDomains([]);
            setFailedReportDomains([]);
          }
        }}
        title="Отчет по переобходу"
        contentWidth="420px"
      >
        {report ? (
          <ReportContent>
            <ReportDomain>
              {reportDomains.length <= 1
                ? reportDomains[0] ?? UNAVAILABLE_PLACEHOLDER
                : `Выбрано доменов: ${reportDomains.length.toLocaleString("ru-RU")}`}
            </ReportDomain>
            <ReportLine>Отправлено: {report.sentCount.toLocaleString("ru-RU")}</ReportLine>
            <ReportLine>Пропущено (уже в очереди): {report.skippedCount.toLocaleString("ru-RU")}</ReportLine>
            <ReportLine>Не вошло из-за квоты: {report.quotaLimitedCount.toLocaleString("ru-RU")}</ReportLine>
            {failedReportDomains.length > 0 ? (
              <ReportLine>
                Не удалось запустить для: {failedReportDomains.join(", ")}
              </ReportLine>
            ) : null}
          </ReportContent>
        ) : null}
      </ModalDialog>
      <ModalDialog
        open={detailRow !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDetailRow(null);
          }
        }}
        title={detailRow?.domain ?? "Детали"}
        contentWidth="1180px"
      >
        {detailRow ? <DashboardDetailsModalContent siteId={detailRow.siteId} /> : null}
      </ModalDialog>
    </Root>
  );
}

type DashboardTableProps = {
  rows: DashboardRowDto[];
  isFetching: boolean;
  activeRecrawlSiteId: number | null;
  isBulkRecrawling: boolean;
  selectedSiteIds: number[];
  onToggleSelect: (siteId: number, checked: boolean) => void;
  allVisibleRowsSelected: boolean;
  someVisibleRowsSelected: boolean;
  onToggleVisibleRows: (checked: boolean) => void;
  onRecrawl: (row: DashboardRowDto) => void;
  onOpenDetails: (row: DashboardRowDto) => void;
};

type DashboardChartPanelProps = {
  analytics?: DashboardAnalyticsResponseDto;
  isFetching: boolean;
  hasError: boolean;
};

function DashboardChartPanel({ analytics, isFetching, hasError }: DashboardChartPanelProps) {
  if (isFetching) {
    return <ChartSkeletonCard aria-hidden="true" />;
  }
  if (hasError || !analytics) {
    return <PlaceholderCard>Не удалось загрузить график индексации.</PlaceholderCard>;
  }

  return (
    <ChartCard>
      <ChartHeader>
        <ChartTitle>Динамика индексации</ChartTitle>
        <ChartLegend>
          {analytics.series.map((series) => (
            <ChartLegendItem key={series.key}>
              <ChartLegendDot $color={CHART_COLORS[series.key]} />
              <span>{series.label}</span>
            </ChartLegendItem>
          ))}
        </ChartLegend>
      </ChartHeader>
      <DashboardActivityChart series={analytics.series} />
    </ChartCard>
  );
}

type DashboardSummaryPanelProps = {
  analytics?: DashboardAnalyticsResponseDto;
  isFetching: boolean;
  hasError: boolean;
};

function DashboardSummaryPanel({ analytics, isFetching, hasError }: DashboardSummaryPanelProps) {
  if (isFetching) {
    return (
      <SummaryGrid aria-hidden="true">
        {Array.from({ length: 4 }, (_, index) => (
          <SummarySkeletonCard key={index}>
            <SkeletonLine $width="42%" />
            <SkeletonLine $width="58%" $height={30} />
            <SkeletonLine $width="46%" />
          </SummarySkeletonCard>
        ))}
      </SummaryGrid>
    );
  }
  if (hasError || !analytics) {
    return <PlaceholderCard>Не удалось загрузить сводку индексации.</PlaceholderCard>;
  }

  const orderedCards = orderDashboardSummaryCards(analytics.cards);

  return (
    <SummaryGrid>
      {orderedCards.map((card) => (
        <SummaryCard key={card.key}>
          <SummaryMeta>
            {getDashboardSummaryCardDotColor(card) ? (
              <SummaryDot $color={getDashboardSummaryCardDotColor(card)!} aria-hidden="true" />
            ) : null}
            <SummaryLabel>{card.label}</SummaryLabel>
          </SummaryMeta>
          <SummaryValue>{formatNumber(card.value)}</SummaryValue>
          {shouldRenderDashboardSummaryDelta(card) ? (
            <SummaryDelta $tone={getDashboardSummaryDeltaTone(card.deltaValue ?? 0)}>
              {formatDashboardSummaryDelta(card.deltaValue ?? 0)}
            </SummaryDelta>
          ) : null}
        </SummaryCard>
      ))}
    </SummaryGrid>
  );
}

function DashboardActivityChart({ series }: { series: DashboardAnalyticsSeriesDto[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const barGroups = useMemo(() => buildDashboardBarGroups(series), [series]);
  const dates = useMemo(() => barGroups.map((group) => group.date), [barGroups]);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const element = containerRef.current;
    const updateWidth = () => setContainerWidth(element.clientWidth);
    updateWidth();

    const observer = new ResizeObserver(() => updateWidth());
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  if (barGroups.length === 0) {
    return <ChartEmptyState>Нет данных за выбранный период.</ChartEmptyState>;
  }

  const maxValue = Math.max(
    1,
    ...barGroups.flatMap((group) => [group.added, group.removed]),
  );
  const chartWidth = Math.max(containerWidth, 320);
  const chartHeight = 280;
  const padding = { top: 20, right: 24, bottom: 44, left: 48 };
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;
  const halfPlotHeight = plotHeight / 2;
  const barAreaHeight = Math.max(1, halfPlotHeight - 12);
  const zeroY = padding.top + halfPlotHeight;
  const groupWidth = plotWidth / barGroups.length;
  const barGap = Math.min(10, Math.max(4, groupWidth * 0.08));
  const barWidth = Math.max(10, Math.min(28, (groupWidth - barGap * 3) / 2));

  const getGroupCenterX = (index: number) => {
    if (barGroups.length === 1) {
      return padding.left + plotWidth / 2;
    }
    return padding.left + groupWidth * index + groupWidth / 2;
  };

  const getBarHeight = (value: number) => (value / maxValue) * barAreaHeight;
  const hoveredGroup = hoveredIndex !== null ? barGroups[hoveredIndex] : null;
  const hoveredX = hoveredIndex !== null ? getGroupCenterX(hoveredIndex) : null;
  const hoverValues = hoveredGroup
    ? [
        { key: "added" as const, label: series.find((item) => item.key === "added")?.label ?? "Добавлено", value: hoveredGroup.added },
        { key: "removed" as const, label: series.find((item) => item.key === "removed")?.label ?? "Удалено", value: hoveredGroup.removed },
      ]
    : [];

  return (
    <ChartContainer ref={containerRef} onMouseLeave={() => setHoveredIndex(null)}>
      <ChartSvg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        role="img"
        aria-label="График динамики индексации"
        onMouseMove={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          const pointerX = ((event.clientX - bounds.left) / bounds.width) * chartWidth;
          setHoveredIndex(
            getNearestDashboardChartIndex({
              dateCount: barGroups.length,
              pointerX,
              plotWidth,
              paddingLeft: padding.left,
            }),
          );
        }}
      >
        <ChartAxisLabel x={8} y={padding.top + 4}>
          +{maxValue.toLocaleString("ru-RU")}
        </ChartAxisLabel>
        <ChartAxisLabel x={16} y={zeroY + 4}>
          0
        </ChartAxisLabel>
        <ChartAxisLabel x={8} y={chartHeight - padding.bottom + 4}>
          -{maxValue.toLocaleString("ru-RU")}
        </ChartAxisLabel>
        <ChartMidline x1={padding.left} y1={zeroY} x2={chartWidth - padding.right} y2={zeroY} />
        {barGroups.map((group, index) => {
          const centerX = getGroupCenterX(index);
          const hoverStartX = padding.left + groupWidth * index;
          const addedHeight = getBarHeight(group.added);
          const removedHeight = getBarHeight(group.removed);
          return (
            <g key={group.date}>
              {hoveredIndex === index ? (
                <ChartHoverBand
                  x={hoverStartX + 2}
                  y={padding.top}
                  width={Math.max(groupWidth - 4, 0)}
                  height={plotHeight}
                  rx="10"
                />
              ) : null}
              <rect
                x={centerX - barGap / 2 - barWidth}
                y={zeroY - addedHeight}
                width={barWidth}
                height={addedHeight}
                rx="6"
                fill={CHART_COLORS.added}
              />
              <rect
                x={centerX + barGap / 2}
                y={zeroY}
                width={barWidth}
                height={removedHeight}
                rx="6"
                fill={CHART_COLORS.removed}
              />
            </g>
          );
        })}
        {hoveredX !== null ? (
          <ChartHoverLine x1={hoveredX} y1={padding.top} x2={hoveredX} y2={chartHeight - padding.bottom} />
        ) : null}
        {dates.map((date, index) => {
          const x = getGroupCenterX(index);
          const shouldRenderLabel = index === 0 || index === dates.length - 1 || index === Math.floor(dates.length / 2);
          if (!shouldRenderLabel) {
            return null;
          }
          return (
            <ChartDateLabel key={date} x={x} y={chartHeight - 12} textAnchor="middle">
              {formatChartDate(date)}
            </ChartDateLabel>
          );
        })}
      </ChartSvg>
      {hoveredGroup && hoveredX !== null ? (
        <ChartTooltip
          $left={`${Math.min(Math.max((hoveredX / chartWidth) * 100, 12), 88)}%`}
        >
          <ChartTooltipDate>{formatChartDate(hoveredGroup.date)}</ChartTooltipDate>
          {hoverValues.map((item) => (
            <ChartTooltipRow key={item.key}>
              <ChartLegendDot $color={CHART_COLORS[item.key]} />
              <span>{item.label}</span>
              <strong>{item.value.toLocaleString("ru-RU")}</strong>
            </ChartTooltipRow>
          ))}
        </ChartTooltip>
      ) : null}
    </ChartContainer>
  );
}

function DashboardTable({
  rows,
  isFetching,
  activeRecrawlSiteId,
  isBulkRecrawling,
  selectedSiteIds,
  onToggleSelect,
  allVisibleRowsSelected,
  someVisibleRowsSelected,
  onToggleVisibleRows,
  onRecrawl,
  onOpenDetails,
}: DashboardTableProps) {
  if (isFetching) {
    return (
      <TableSkeletonCard aria-hidden="true">
        <TableSkeletonHeader />
        {Array.from({ length: 5 }, (_, index) => (
          <TableSkeletonRow key={index}>
            <SkeletonLine $width="16px" $height={16} />
            <SkeletonLine $width="18%" />
            <SkeletonLine $width="22%" />
            <SkeletonLine $width="10%" />
            <SkeletonLine $width="10%" />
            <SkeletonLine $width="10%" />
            <SkeletonLine $width="10%" />
            <SkeletonLine $width="10%" />
            <SkeletonLine $width="40px" $height={32} />
          </TableSkeletonRow>
        ))}
      </TableSkeletonCard>
    );
  }

  if (rows.length === 0) {
    return <PlaceholderCard>{EMPTY_DATA_MESSAGE}</PlaceholderCard>;
  }

  return (
    <TableWrapper>
      <DashboardListTable>
        <TableHead>
          <TableRow>
            <TableHeaderCell>
              <HeaderCheckbox
                checked={allVisibleRowsSelected}
                indeterminate={someVisibleRowsSelected && !allVisibleRowsSelected}
                disabled={isBulkRecrawling}
                onChange={(event) => onToggleVisibleRows(event.target.checked)}
              />
            </TableHeaderCell>
            <TableHeaderCell>Проект</TableHeaderCell>
            <TableHeaderCell>Домен</TableHeaderCell>
            <TableHeaderCell>Всего</TableHeaderCell>
            <TableHeaderCell>В индексе</TableHeaderCell>
            <TableHeaderCell>На переобходе</TableHeaderCell>
            <TableHeaderCell>Вне индекса</TableHeaderCell>
            <TableHeaderCell>Не в поиске</TableHeaderCell>
            <TableHeaderCell />
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.siteId}>
              <TableCell>
                <Checkbox
                  type="checkbox"
                  checked={selectedSiteIds.includes(row.siteId)}
                  disabled={isBulkRecrawling || activeRecrawlSiteId === row.siteId}
                  onChange={(event) => onToggleSelect(row.siteId, event.target.checked)}
                />
              </TableCell>
              <TableCell>{row.projectName ?? UNAVAILABLE_PLACEHOLDER}</TableCell>
              <TableCell>{row.domain}</TableCell>
              <TableCell>{formatNumber(row.totalPages)}</TableCell>
              <TableCell>{formatNumber(row.inSearchCount)}</TableCell>
              <TableCell>{formatNumber(row.recrawlCount)}</TableCell>
              <TableCell>{formatNumber(row.outOfIndexCount)}</TableCell>
              <TableCell>{formatNumber(row.notInSearchCount)}</TableCell>
              <TableCell>
                <ActionsCell>
                  <IconButton
                    type="button"
                    onClick={() => onRecrawl(row)}
                    disabled={isBulkRecrawling || activeRecrawlSiteId === row.siteId}
                    data-tooltip="Переобход"
                    aria-label={`Переобход для ${row.domain}`}
                  >
                    <RecrawlIcon $spinning={activeRecrawlSiteId === row.siteId} />
                  </IconButton>
                  <IconButton
                    type="button"
                    onClick={() => onOpenDetails(row)}
                    data-tooltip="Детали"
                    aria-label={`Детали для ${row.domain}`}
                  >
                    <FaInfoCircle />
                  </IconButton>
                </ActionsCell>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </DashboardListTable>
    </TableWrapper>
  );
}

type HeaderCheckboxProps = {
  checked: boolean;
  indeterminate: boolean;
  disabled: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

function HeaderCheckbox({ checked, indeterminate, disabled, onChange }: HeaderCheckboxProps) {
  const checkboxRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return <Checkbox ref={checkboxRef} type="checkbox" checked={checked} disabled={disabled} onChange={onChange} />;
}

const formatNumber = (value?: number | null) =>
  value === null || value === undefined ? UNAVAILABLE_PLACEHOLDER : value.toLocaleString("ru-RU");

const formatChartDate = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("ru-RU");
};

const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
  min-height: 0;
`;

const Body = styled.div`
  display: grid;
  grid-template-columns: 250px minmax(0, 1fr);
  gap: 14px;
  align-items: start;
  flex: 1;
  min-height: 0;
`;

const SubSidebar = styled.nav`
  border: 1px solid #dbe5f3;
  border-radius: 14px;
  background: #ffffff;
  padding: 12px;
  height: fit-content;
  align-self: start;
  width: 250px;
`;

const SubList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const SubItem = styled.li`
  margin: 0;
`;

const SubButton = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 36px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid ${({ $active }) => ($active ? "rgba(37, 99, 235, 0.36)" : "transparent")};
  background: ${({ $active }) => ($active ? "rgba(37, 99, 235, 0.14)" : "transparent")};
  color: ${({ $active }) => ($active ? "#1d4ed8" : "#334155")};
  font-size: 14px;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  cursor: pointer;
`;

const Content = styled.section`
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
  min-width: 0;
`;

const Toolbar = styled.div`
  display: grid;
  grid-template-columns: 170px 170px minmax(180px, 220px) 260px auto;
  gap: 12px;
  align-items: end;
  padding: 14px;
  border: 1px solid ${({ theme }) => theme.tokens.color.borderSubtle};
  border-radius: 14px;
  background: #ffffff;
`;

const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
`;

const SearchField = styled(Field)`
  width: 260px;
`;

const Label = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.tokens.color.textSecondary};
`;

const ShowButton = styled(Button)`
  min-width: 110px;
  justify-self: start;
`;

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
`;

const SummaryCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 18px;
  border: 1px solid #dbe5f3;
  border-radius: 14px;
  background: #ffffff;
`;

const SummaryMeta = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
`;

const SummaryDot = styled.span<{ $color: string }>`
  width: 10px;
  height: 10px;
  border-radius: 999px;
  flex-shrink: 0;
  background: ${({ $color }) => $color};
`;

const SummaryLabel = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
`;

const SummaryValue = styled.span`
  font-size: 28px;
  font-weight: 700;
  color: #0f172a;
`;

const SummaryDelta = styled.span<{ $tone: "positive" | "negative" | "neutral" }>`
  font-size: 13px;
  color: ${({ $tone }) => {
    switch ($tone) {
      case "positive":
        return "#16a34a";
      case "negative":
        return "#dc2626";
      default:
        return "#334155";
    }
  }};
`;

const shimmer = keyframes`
  0% {
    opacity: 0.55;
  }

  50% {
    opacity: 1;
  }

  100% {
    opacity: 0.55;
  }
`;

const ChartCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 18px;
  border: 1px solid #dbe5f3;
  border-radius: 14px;
  background: #ffffff;
`;

const ChartHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`;

const ChartTitle = styled.h2`
  margin: 0;
  font-size: 18px;
  color: #0f172a;
`;

const ChartLegend = styled.div`
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
`;

const ChartLegendItem = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #334155;
`;

const ChartSkeletonCard = styled(ChartCard)`
  min-height: 360px;
  background: linear-gradient(90deg, #e2e8f0 0%, #f8fafc 50%, #e2e8f0 100%);
  animation: ${shimmer} 1.2s ease-in-out infinite;
`;

const SummarySkeletonCard = styled(SummaryCard)`
  min-height: 132px;
`;

const SkeletonLine = styled.span<{ $width: string; $height?: number }>`
  display: block;
  width: ${({ $width }) => $width};
  height: ${({ $height = 14 }) => `${$height}px`};
  border-radius: 999px;
  background: linear-gradient(90deg, #e2e8f0 0%, #f8fafc 50%, #e2e8f0 100%);
  animation: ${shimmer} 1.2s ease-in-out infinite;
`;

const ChartLegendDot = styled.span<{ $color: string }>`
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: ${({ $color }) => $color};
`;

const ChartContainer = styled.div`
  width: 100%;
  position: relative;
`;

const ChartSvg = styled.svg`
  width: 100%;
  height: 280px;
`;

const ChartAxisLabel = styled.text`
  fill: #64748b;
  font-size: 12px;
`;

const ChartDateLabel = styled.text`
  fill: #64748b;
  font-size: 12px;
`;

const ChartMidline = styled.line`
  stroke: #94a3b8;
  stroke-width: 1.5;
`;

const ChartHoverBand = styled.rect`
  fill: rgba(148, 163, 184, 0.12);
`;

const ChartHoverLine = styled.line`
  stroke: #94a3b8;
  stroke-width: 1;
  stroke-dasharray: 4 4;
`;

const ChartTooltip = styled.div<{ $left: string }>`
  position: absolute;
  top: 14px;
  left: ${({ $left }) => $left};
  transform: translateX(-50%);
  min-width: 180px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.96);
  color: #f8fafc;
  pointer-events: none;
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.18);
`;

const ChartTooltipDate = styled.div`
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 8px;
`;

const ChartTooltipRow = styled.div`
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 8px;
  font-size: 12px;

  & + & {
    margin-top: 6px;
  }
`;

const ChartEmptyState = styled(PlaceholderText)`
  border: 1px dashed #dbe5f3;
  border-radius: 14px;
  padding: 32px;
  background: #f8fafc;
`;

const TableActions = styled.div`
  display: flex;
  justify-content: flex-end;
`;

const BulkRecrawlButton = styled(Button)`
  min-width: 180px;
`;

const PlaceholderCard = styled(PlaceholderText)`
  border: 1px solid #dbe5f3;
  background: #ffffff;
  border-radius: 14px;
  padding: 24px;
`;

const ActionsCell = styled.div`
  display: flex;
  justify-content: flex-end;
  width: 100%;
  align-items: center;
  gap: 8px;
`;

const DashboardListTable = styled(Table)`
  ${TableHeaderCell}:nth-child(1),
  ${TableCell}:nth-child(1) {
    width: 48px;
    padding-left: 12px;
    padding-right: 8px;
    text-align: center;
  }

  ${TableHeaderCell}:nth-child(9),
  ${TableCell}:nth-child(9) {
    width: 88px;
  }
`;

const TableSkeletonCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border: 1px solid #dbe5f3;
  border-radius: 14px;
  background: #ffffff;
`;

const TableSkeletonHeader = styled.div`
  height: 18px;
  width: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #e2e8f0 0%, #f8fafc 50%, #e2e8f0 100%);
  animation: ${shimmer} 1.2s ease-in-out infinite;
`;

const TableSkeletonRow = styled.div`
  display: grid;
  grid-template-columns: 24px 1.1fr 1.4fr repeat(5, 0.7fr) 48px;
  gap: 12px;
  align-items: center;
`;

const Checkbox = styled.input`
  width: 16px;
  height: 16px;
  cursor: pointer;
  vertical-align: middle;
`;

const IconButton = styled(Button)`
  position: relative;
  width: 34px;
  height: 34px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  &::after {
    content: attr(data-tooltip);
    position: absolute;
    left: 50%;
    bottom: calc(100% + 8px);
    transform: translateX(-50%) translateY(4px);
    background: #0f172a;
    color: #f8fafc;
    font-size: 12px;
    line-height: 1;
    border-radius: 8px;
    padding: 6px 8px;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition:
      opacity 0.14s ease,
      transform 0.14s ease;
    z-index: 10;
  }

  &:hover::after,
  &:focus-visible::after {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
`;

const spin = keyframes`
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
`;

const RecrawlIcon = styled(FaSyncAlt)<{ $spinning: boolean }>`
  font-size: 14px;
  animation: ${({ $spinning }) =>
    $spinning
      ? css`
          ${spin} 0.9s linear infinite
        `
      : "none"};
`;

const ReportContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const ReportDomain = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
`;

const ReportLine = styled.div`
  font-size: 14px;
  color: #334155;
`;
