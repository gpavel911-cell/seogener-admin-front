"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import { FaInfoCircle, FaSyncAlt } from "react-icons/fa";
import styled, { css, keyframes } from "styled-components";
import {
  useGetGoogleIndexingDetailsQuery,
  useGetGoogleIndexingQuery,
  useGetGoogleIndexingSummaryQuery,
  useInspectGoogleIndexingUrlMutation,
  useRefreshGoogleIndexingMutation,
} from "@entities/dashboard/api";
import type {
  GoogleIndexingDetailSectionDto,
  GoogleIndexingListRequest,
  GoogleIndexingRefreshResponseDto,
  GoogleIndexingRowDto,
  GoogleIndexingSummaryRequest,
} from "@entities/dashboard/types";
import { useGetProjectOptionsQuery } from "@entities/projects/api";
import { usePagination } from "@shared/lib/use-pagination";
import { PaginationControls } from "@shared/ui/pagination-controls";
import {
  Button,
  EMPTY_DATA_MESSAGE,
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

type ApiError = { data?: { message?: string } };

type AppliedFilters = {
  projectId: string;
  query: string;
};

type SortDirection = "asc" | "desc";
type SortableGoogleIndexingColumn = "totalPages" | "inSearchCount" | "outOfIndexCount" | "notInSearchCount";

const GOOGLE_INDEXING_SORTABLE_COLUMNS: Array<{ column: SortableGoogleIndexingColumn; label: string }> = [
  { column: "totalPages", label: "Всего страниц" },
  { column: "inSearchCount", label: "В индексе" },
  { column: "outOfIndexCount", label: "Вне индекса" },
  { column: "notInSearchCount", label: "Не в поиске" },
];

const UNAVAILABLE_PLACEHOLDER = "—";

export function GoogleIndexingSection() {
  const { showToast } = useToast();
  const { page, pageSize, pageSizeOptions, setPage, setPageSize } = usePagination({ initialPageSize: 5 });
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [search, setSearch] = useState("");
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters | null>(null);
  const [selectedSiteIds, setSelectedSiteIds] = useState<number[]>([]);
  const [activeRefreshSiteId, setActiveRefreshSiteId] = useState<number | null>(null);
  const [isBulkRefreshing, setIsBulkRefreshing] = useState(false);
  const [detailRow, setDetailRow] = useState<GoogleIndexingRowDto | null>(null);
  const [report, setReport] = useState<GoogleIndexingRefreshResponseDto | null>(null);
  const [sortColumn, setSortColumn] = useState<SortableGoogleIndexingColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const { data: projectOptions = [] } = useGetProjectOptionsQuery();
  const [refreshGoogleIndexing] = useRefreshGoogleIndexingMutation();
  const effectiveProjectId = selectedProjectId || projectOptions[0]?.value || "";

  const listQueryArgs = useMemo<GoogleIndexingListRequest | typeof skipToken>(() => {
    if (!appliedFilters) return skipToken;
    return {
      pageNumber: page,
      pageSize,
      projectId: Number(appliedFilters.projectId),
      ...(appliedFilters.query ? { query: appliedFilters.query } : {}),
    };
  }, [appliedFilters, page, pageSize]);

  const summaryQueryArgs = useMemo<GoogleIndexingSummaryRequest | typeof skipToken>(() => {
    if (!appliedFilters) return skipToken;
    return {
      projectId: Number(appliedFilters.projectId),
      ...(appliedFilters.query ? { query: appliedFilters.query } : {}),
    };
  }, [appliedFilters]);

  const { data, isFetching, error } = useGetGoogleIndexingQuery(listQueryArgs);
  const { data: summary, isFetching: isFetchingSummary, error: summaryError } = useGetGoogleIndexingSummaryQuery(summaryQueryArgs);
  const rows = useMemo(() => data?.content ?? [], [data?.content]);
  const sortedRows = useMemo(() => {
    if (!sortColumn) return rows;
    return [...rows].sort((left, right) =>
      compareGoogleIndexingNumericValues(left[sortColumn], right[sortColumn], sortDirection),
    );
  }, [rows, sortColumn, sortDirection]);
  const selectedRows = useMemo(() => rows.filter((row) => selectedSiteIds.includes(row.siteId)), [rows, selectedSiteIds]);
  const totalPages = data?.totalPages ?? 0;
  const hasLoaded = appliedFilters !== null;
  const visibleSiteIds = useMemo(() => rows.map((row) => row.siteId), [rows]);
  const allVisibleRowsSelected = rows.length > 0 && rows.every((row) => selectedSiteIds.includes(row.siteId));
  const someVisibleRowsSelected = rows.some((row) => selectedSiteIds.includes(row.siteId));

  useEffect(() => {
    if (error) showToast({ variant: "error", message: "Ошибка загрузки данных индексации Google." });
  }, [error, showToast]);

  useEffect(() => {
    if (summaryError) showToast({ variant: "error", message: "Ошибка загрузки сводки индексации Google." });
  }, [summaryError, showToast]);

  useEffect(() => {
    setSelectedSiteIds((prev) => prev.filter((siteId) => rows.some((row) => row.siteId === siteId)));
  }, [rows]);

  const reset = () => {
    setPage(0);
    setAppliedFilters(null);
    setSelectedSiteIds([]);
    setSortColumn(null);
    setSortDirection("asc");
  };

  const handleSort = (column: SortableGoogleIndexingColumn) => {
    if (sortColumn === column) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortColumn(column);
    setSortDirection("asc");
  };

  const handleShow = () => {
    if (!effectiveProjectId) {
      showToast({ variant: "error", message: "Выберите проект." });
      return;
    }
    setPage(0);
    setAppliedFilters({ projectId: effectiveProjectId, query: search.trim() });
  };

  const handleRefresh = async (siteIds?: number[]) => {
    if (!appliedFilters) return;
    setIsBulkRefreshing(true);
    try {
      const result = await refreshGoogleIndexing({
        projectId: Number(appliedFilters.projectId),
        ...(appliedFilters.query ? { query: appliedFilters.query } : {}),
        ...(siteIds ? { siteIds } : {}),
        scope: siteIds ? "SELECTED_ROWS" : "FILTERED_TABLE",
      }).unwrap();
      setReport(result);
    } catch (error) {
      const message = (error as ApiError)?.data?.message ?? "Не удалось запустить обновление Google.";
      showToast({ variant: "error", message });
    } finally {
      setIsBulkRefreshing(false);
    }
  };

  const handleRefreshRow = async (row: GoogleIndexingRowDto) => {
    if (!appliedFilters) return;
    setActiveRefreshSiteId(row.siteId);
    try {
      const result = await refreshGoogleIndexing({
        projectId: Number(appliedFilters.projectId),
        siteIds: [row.siteId],
        scope: "SITE",
      }).unwrap();
      setReport(result);
    } catch (error) {
      const message = (error as ApiError)?.data?.message ?? "Не удалось запустить обновление домена.";
      showToast({ variant: "error", message });
    } finally {
      setActiveRefreshSiteId(null);
    }
  };

  return (
    <SectionRoot>
      <Toolbar>
        <Field>
          <Label>Проект</Label>
          <SelectControl
            value={effectiveProjectId}
            onValueChange={(value) => {
              setSelectedProjectId(value);
              reset();
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
              reset();
            }}
            placeholder="Введите домен"
          />
        </SearchField>
        <Button type="button" variant="primary" onClick={handleShow} disabled={isFetching || isFetchingSummary || !effectiveProjectId}>
          {isFetching || isFetchingSummary ? "Загрузка..." : "Показать"}
        </Button>
      </Toolbar>

      {!hasLoaded ? (
        <PlaceholderCard>Выберите фильтры и нажмите кнопку Показать.</PlaceholderCard>
      ) : (
        <>
          <QueueStatusPanel queue={summary?.queueStatus} isFetching={isFetchingSummary} />
          <SummaryGrid>
            {(summary?.cards ?? []).map((card) => (
              <SummaryCard key={card.key}>
                <SummaryLabel>{card.label}</SummaryLabel>
                <SummaryValue>{formatNumber(card.value)}</SummaryValue>
                {card.deltaValue !== null && card.deltaValue !== undefined ? (
                  <SummaryDelta $tone={card.deltaValue >= 0 ? "positive" : "negative"}>
                    {card.deltaValue > 0 ? "+" : ""}
                    {card.deltaValue.toLocaleString("ru-RU")}
                  </SummaryDelta>
                ) : null}
              </SummaryCard>
            ))}
          </SummaryGrid>
          {selectedRows.length > 0 ? (
            <TableActions>
              <Button type="button" variant="primary" onClick={() => handleRefresh(selectedRows.map((row) => row.siteId))} disabled={isBulkRefreshing || isFetching}>
                {isBulkRefreshing ? "Обновление..." : "Обновить выбранные"}
              </Button>
            </TableActions>
          ) : null}
          <GoogleIndexingTable
            rows={sortedRows}
            isFetching={isFetching}
            selectedSiteIds={selectedSiteIds}
            activeRefreshSiteId={activeRefreshSiteId}
            isBulkRefreshing={isBulkRefreshing}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            allVisibleRowsSelected={allVisibleRowsSelected}
            someVisibleRowsSelected={someVisibleRowsSelected}
            onSort={handleSort}
            onToggleVisibleRows={(checked) => {
              setSelectedSiteIds((prev) => checked ? Array.from(new Set([...prev, ...visibleSiteIds])) : prev.filter((siteId) => !visibleSiteIds.includes(siteId)));
            }}
            onToggleSelect={(siteId, checked) => {
              setSelectedSiteIds((prev) => checked ? (prev.includes(siteId) ? prev : [...prev, siteId]) : prev.filter((value) => value !== siteId));
            }}
            onRefresh={handleRefreshRow}
            onOpenDetails={setDetailRow}
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

      <ModalDialog open={detailRow !== null} onOpenChange={(open) => !open && setDetailRow(null)} title={detailRow?.domain ?? "Детали Google"} contentWidth="1180px">
        {detailRow ? <GoogleIndexingDetailsModalContent siteId={detailRow.siteId} projectId={Number(appliedFilters?.projectId)} /> : null}
      </ModalDialog>
      <ModalDialog open={report !== null} onOpenChange={(open) => !open && setReport(null)} title="Результат обновления" contentWidth="420px">
        {report ? (
          <ReportContent>
            <ReportLine>Принято: {report.acceptedCount.toLocaleString("ru-RU")}</ReportLine>
            <ReportLine>Уже в очереди: {report.alreadyQueuedCount.toLocaleString("ru-RU")}</ReportLine>
            <ReportLine>Отложено: {report.deferredCount.toLocaleString("ru-RU")}</ReportLine>
            {report.message ? <ReportLine>{report.message}</ReportLine> : null}
          </ReportContent>
        ) : null}
      </ModalDialog>
    </SectionRoot>
  );
}

function QueueStatusPanel({ queue, isFetching }: { queue?: { totalCount: number; pendingCount: number; runningCount: number; deferredCount: number }; isFetching: boolean }) {
  return (
    <QueuePanel aria-busy={isFetching}>
      <QueueItem>Всего: {formatNumber(queue?.totalCount)}</QueueItem>
      <QueueItem>В очереди: {formatNumber(queue?.pendingCount)}</QueueItem>
      <QueueItem>Проверяется: {formatNumber(queue?.runningCount)}</QueueItem>
      <QueueItem>Отложено: {formatNumber(queue?.deferredCount)}</QueueItem>
    </QueuePanel>
  );
}

function GoogleIndexingTable({
  rows,
  isFetching,
  selectedSiteIds,
  activeRefreshSiteId,
  isBulkRefreshing,
  sortColumn,
  sortDirection,
  allVisibleRowsSelected,
  someVisibleRowsSelected,
  onSort,
  onToggleVisibleRows,
  onToggleSelect,
  onRefresh,
  onOpenDetails,
}: {
  rows: GoogleIndexingRowDto[];
  isFetching: boolean;
  selectedSiteIds: number[];
  activeRefreshSiteId: number | null;
  isBulkRefreshing: boolean;
  sortColumn: SortableGoogleIndexingColumn | null;
  sortDirection: SortDirection;
  allVisibleRowsSelected: boolean;
  someVisibleRowsSelected: boolean;
  onSort: (column: SortableGoogleIndexingColumn) => void;
  onToggleVisibleRows: (checked: boolean) => void;
  onToggleSelect: (siteId: number, checked: boolean) => void;
  onRefresh: (row: GoogleIndexingRowDto) => void;
  onOpenDetails: (row: GoogleIndexingRowDto) => void;
}) {
  if (isFetching) return <PlaceholderCard>Загрузка данных Google...</PlaceholderCard>;
  if (rows.length === 0) return <PlaceholderCard>{EMPTY_DATA_MESSAGE}</PlaceholderCard>;
  return (
    <TableWrapper>
      <GoogleListTable>
        <TableHead>
          <TableRow>
            <TableHeaderCell>
              <HeaderCheckbox checked={allVisibleRowsSelected} indeterminate={someVisibleRowsSelected && !allVisibleRowsSelected} disabled={isBulkRefreshing} onChange={(event) => onToggleVisibleRows(event.target.checked)} />
            </TableHeaderCell>
            <TableHeaderCell>Проект</TableHeaderCell>
            <TableHeaderCell>Домен</TableHeaderCell>
            {GOOGLE_INDEXING_SORTABLE_COLUMNS.map(({ column, label }) => (
              <TableHeaderCell key={column}>
                <SortButton type="button" onClick={() => onSort(column)}>
                  <span>{label}</span>
                  <SortIcons $active={sortColumn === column}>
                    <span>{sortColumn === column && sortDirection === "asc" ? "▲" : "△"}</span>
                    <span>{sortColumn === column && sortDirection === "desc" ? "▼" : "▽"}</span>
                  </SortIcons>
                </SortButton>
              </TableHeaderCell>
            ))}
            <TableHeaderCell />
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.siteId}>
              <TableCell>
                <Checkbox type="checkbox" checked={selectedSiteIds.includes(row.siteId)} disabled={isBulkRefreshing || activeRefreshSiteId === row.siteId} onChange={(event) => onToggleSelect(row.siteId, event.target.checked)} />
              </TableCell>
              <TableCell>{row.projectName ?? UNAVAILABLE_PLACEHOLDER}</TableCell>
              <TableCell>{row.domain}</TableCell>
              <TableCell>{formatNumber(row.totalPages)}</TableCell>
              <TableCell>{formatNumber(row.inSearchCount)}</TableCell>
              <TableCell>{formatNumber(row.outOfIndexCount)}</TableCell>
              <TableCell>{formatNumber(row.notInSearchCount)}</TableCell>
              <TableCell>
                <ActionsCell>
                  <IconButton type="button" onClick={() => onRefresh(row)} disabled={isBulkRefreshing || activeRefreshSiteId === row.siteId} data-tooltip="Обновить" aria-label={`Обновить ${row.domain}`}>
                    <RefreshIcon $spinning={activeRefreshSiteId === row.siteId} />
                  </IconButton>
                  <IconButton type="button" onClick={() => onOpenDetails(row)} data-tooltip="Детали" aria-label={`Детали ${row.domain}`}>
                    <FaInfoCircle />
                  </IconButton>
                </ActionsCell>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </GoogleListTable>
    </TableWrapper>
  );
}

function GoogleIndexingDetailsModalContent({ siteId, projectId }: { siteId: number; projectId: number }) {
  const { showToast } = useToast();
  const { data: shell, isLoading, error } = useGetGoogleIndexingDetailsQuery(siteId);
  const [refreshGoogleIndexing, { isLoading: isRefreshing }] = useRefreshGoogleIndexingMutation();
  const [inspectUrl, { isLoading: isInspecting }] = useInspectGoogleIndexingUrlMutation();
  const [selection, setSelection] = useState<Record<string, string[]>>({});

  const handleBulkRefresh = async (urls: string[]) => {
    if (urls.length === 0) {
      showToast({ variant: "error", message: "Выберите хотя бы один URL для обновления." });
      return;
    }
    try {
      await refreshGoogleIndexing({ projectId, urlsBySiteId: { [siteId]: urls }, scope: "URLS" }).unwrap();
      showToast({ variant: "success", message: "URL добавлены в очередь обновления." });
    } catch (error) {
      const message = (error as ApiError)?.data?.message ?? "Не удалось запустить обновление URL.";
      showToast({ variant: "error", message });
    }
  };

  const handleInspectUrl = async (url: string) => {
    try {
      const result = await inspectUrl({ siteId, url }).unwrap();
      showToast({ variant: result.status === "DONE" ? "success" : "error", message: result.message ?? "Проверка завершена." });
    } catch (error) {
      const message = (error as ApiError)?.data?.message ?? "Не удалось проверить URL.";
      showToast({ variant: "error", message });
    }
  };

  if (isLoading) return <PlaceholderCard>Загрузка деталей Google...</PlaceholderCard>;
  if (error || !shell) return <PlaceholderCard>Не удалось загрузить детали Google.</PlaceholderCard>;

  return (
    <DetailsContent>
      {shell.sections.map((section) => {
        const selectedUrls = selection[section.key] ?? [];
        return (
          <DetailSection key={section.key} section={section} selectedUrls={selectedUrls} disabled={isRefreshing || isInspecting} onToggle={(url, checked) => {
            setSelection((prev) => ({
              ...prev,
              [section.key]: checked ? Array.from(new Set([...(prev[section.key] ?? []), url])) : (prev[section.key] ?? []).filter((value) => value !== url),
            }));
          }} onToggleAll={(urls, checked) => {
            setSelection((prev) => ({ ...prev, [section.key]: checked ? urls : [] }));
          }} onRefreshSelected={() => handleBulkRefresh(selectedUrls)} onInspect={handleInspectUrl} />
        );
      })}
    </DetailsContent>
  );
}

function DetailSection({
  section,
  selectedUrls,
  disabled,
  onToggle,
  onToggleAll,
  onRefreshSelected,
  onInspect,
}: {
  section: GoogleIndexingDetailSectionDto;
  selectedUrls: string[];
  disabled: boolean;
  onToggle: (url: string, checked: boolean) => void;
  onToggleAll: (urls: string[], checked: boolean) => void;
  onRefreshSelected: () => void;
  onInspect: (url: string) => void;
}) {
  const selectedSet = useMemo(() => new Set(selectedUrls), [selectedUrls]);
  const urls = section.rows.map((row) => row.pageUrl);
  const allSelected = urls.length > 0 && urls.every((url) => selectedSet.has(url));
  const someSelected = urls.some((url) => selectedSet.has(url));
  return (
    <SectionCard>
      <SectionHeader>
        <SectionTitle>{section.title} ({section.rows.length.toLocaleString("ru-RU")})</SectionTitle>
        {selectedUrls.length > 0 ? <Button type="button" variant="primary" onClick={onRefreshSelected} disabled={disabled}>Обновить выбранные</Button> : null}
      </SectionHeader>
      {section.rows.length === 0 ? (
        <PlaceholderCard>Нет страниц в этой категории</PlaceholderCard>
      ) : (
        <TableWrapper>
          <DetailListTable>
            <TableHead>
              <TableRow>
                <TableHeaderCell>
                  <HeaderCheckbox checked={allSelected} indeterminate={someSelected && !allSelected} disabled={disabled} onChange={(event) => onToggleAll(urls, event.target.checked)} />
                </TableHeaderCell>
                <TableHeaderCell>Страница</TableHeaderCell>
                <TableHeaderCell>Причина / статус</TableHeaderCell>
                <TableHeaderCell>Проверено</TableHeaderCell>
                <TableHeaderCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {section.rows.map((row) => (
                <TableRow key={`${section.key}-${row.pageUrl}`}>
                  <TableCell><Checkbox type="checkbox" checked={selectedSet.has(row.pageUrl)} disabled={disabled} onChange={(event) => onToggle(row.pageUrl, event.target.checked)} /></TableCell>
                  <TableCell>{row.pageUrl}</TableCell>
                  <TableCell>{formatStatusLabel(row.reason ?? row.coverageState ?? row.inspectionState)}</TableCell>
                  <TableCell>{formatDateTime(row.inspectedAt)}</TableCell>
                  <TableCell>
                    <ActionsCell>
                      <IconButton type="button" onClick={() => onInspect(row.pageUrl)} disabled={disabled} data-tooltip="Обновить" aria-label={`Обновить ${row.pageUrl}`}>
                        <RefreshIcon $spinning={false} />
                      </IconButton>
                    </ActionsCell>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </DetailListTable>
        </TableWrapper>
      )}
    </SectionCard>
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
    if (checkboxRef.current) checkboxRef.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return <Checkbox ref={checkboxRef} type="checkbox" checked={checked} disabled={disabled} onChange={onChange} />;
}

const formatNumber = (value?: number | null) => value === null || value === undefined ? UNAVAILABLE_PLACEHOLDER : value.toLocaleString("ru-RU");

const compareGoogleIndexingNumericValues = (left?: number | null, right?: number | null, direction: SortDirection = "asc") => {
  const leftValue = left ?? Number.NEGATIVE_INFINITY;
  const rightValue = right ?? Number.NEGATIVE_INFINITY;
  const result = leftValue - rightValue;
  return direction === "asc" ? result : -result;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return UNAVAILABLE_PLACEHOLDER;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("ru-RU");
};

const GOOGLE_STATUS_LABELS: Record<string, string> = {
  IN_SEARCH: "В индексе",
  OUT_OF_INDEX: "Вне индекса",
  NOT_IN_SEARCH: "Не в поиске",
  PENDING: "В очереди",
  RUNNING: "Проверяется",
  DONE: "Готово",
  DEFERRED: "Отложено",
  FAILED: "Ошибка",
  PASS: "Страница в индексе",
  FAIL: "Страница не в индексе",
  NEUTRAL: "Нет данных",
  VERDICT_UNSPECIFIED: "Статус не указан",
  INDEXING_ALLOWED: "Индексация разрешена",
  BLOCKED_BY_META_TAG: "Заблокировано meta-тегом",
  BLOCKED_BY_HTTP_HEADER: "Заблокировано HTTP-заголовком",
  BLOCKED_BY_ROBOTS_TXT: "Заблокировано robots.txt",
  INDEXING_STATE_UNSPECIFIED: "Статус индексации не указан",
  SUCCESSFUL: "Успешно",
  SOFT_404: "Soft 404",
  NOT_FOUND: "Не найдено",
  ACCESS_DENIED: "Доступ запрещен",
  SERVER_ERROR: "Ошибка сервера",
  REDIRECT_ERROR: "Ошибка редиректа",
  ACCESS_FORBIDDEN: "Доступ запрещен",
  BLOCKED_4XX: "Заблокировано из-за 4xx",
  INTERNAL_CRAWL_ERROR: "Внутренняя ошибка сканирования",
  INVALID_URL: "Некорректный URL",
  PAGE_FETCH_STATE_UNSPECIFIED: "Статус загрузки не указан",
};

const formatStatusLabel = (value?: string | null) => {
  if (!value) return UNAVAILABLE_PLACEHOLDER;
  return GOOGLE_STATUS_LABELS[value] ?? value;
};

const SectionRoot = styled.section`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Toolbar = styled.div`
  display: flex;
  gap: 12px;
  align-items: flex-end;
  flex-wrap: wrap;
  border: 1px solid #dbe5f3;
  border-radius: 14px;
  background: #ffffff;
  padding: 14px;
`;

const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 220px;
`;

const SearchField = styled(Field)`
  width: 260px;
`;

const Label = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
`;

const PlaceholderCard = styled(PlaceholderText)`
  border: 1px solid #dbe5f3;
  background: #ffffff;
  border-radius: 14px;
  padding: 24px;
`;

const QueuePanel = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  border: 1px solid #dbe5f3;
  background: #ffffff;
  border-radius: 14px;
  padding: 12px 14px;
`;

const QueueItem = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: #334155;
`;

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
`;

const SummaryCard = styled.div`
  border: 1px solid #dbe5f3;
  border-radius: 14px;
  background: #ffffff;
  padding: 16px;
`;

const SummaryLabel = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: #64748b;
`;

const SummaryValue = styled.div`
  margin-top: 8px;
  font-size: 28px;
  font-weight: 800;
  color: #0f172a;
`;

const SummaryDelta = styled.div<{ $tone: "positive" | "negative" }>`
  margin-top: 6px;
  color: ${({ $tone }) => ($tone === "positive" ? "#16a34a" : "#dc2626")};
  font-weight: 700;
`;

const TableActions = styled.div`
  display: flex;
  gap: 10px;
  justify-content: flex-end;
`;

const ActionsCell = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`;

const SortButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  font-weight: inherit;
  cursor: pointer;
`;

const SortIcons = styled.span<{ $active: boolean }>`
  display: inline-flex;
  gap: 2px;
  color: ${({ $active }) => ($active ? "#2563eb" : "#94a3b8")};
  font-size: 11px;
`;

const GoogleListTable = styled(Table)`
  ${TableHeaderCell}:nth-child(1),
  ${TableCell}:nth-child(1) {
    width: 48px;
    padding-left: 12px;
    padding-right: 8px;
    text-align: center;
  }

  ${TableHeaderCell}:nth-child(8),
  ${TableCell}:nth-child(8) {
    width: 88px;
  }
`;

const DetailListTable = styled(Table)`
  ${TableHeaderCell}:nth-child(1),
  ${TableCell}:nth-child(1) {
    width: 48px;
    padding-left: 12px;
    padding-right: 8px;
    text-align: center;
  }

  ${TableHeaderCell}:nth-child(5),
  ${TableCell}:nth-child(5) {
    width: 88px;
  }
`;

const Checkbox = styled.input`
  width: 16px;
  height: 16px;
  cursor: pointer;
`;

const IconButton = styled(Button)`
  width: 34px;
  height: 34px;
  padding: 0;
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const RefreshIcon = styled(FaSyncAlt)<{ $spinning: boolean }>`
  font-size: 14px;
  animation: ${({ $spinning }) => $spinning ? css`${spin} 0.9s linear infinite` : "none"};
`;

const DetailsContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const SectionCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

const SectionTitle = styled.h2`
  margin: 0;
  font-size: 18px;
  color: #0f172a;
`;

const ReportContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const ReportLine = styled.div`
  font-size: 14px;
  color: #334155;
`;
