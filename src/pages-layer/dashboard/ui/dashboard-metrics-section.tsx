"use client";

import { useEffect, useMemo, useState } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import styled, { keyframes } from "styled-components";
import { useGetDashboardMetricsQuery } from "@entities/dashboard/api";
import type {
  DashboardMetricsEntryUrlDto,
  DashboardMetricsRequest,
} from "@entities/dashboard/types";
import { useGetProjectOptionsQuery } from "@entities/projects/api";
import { getDefaultDashboardDateRange, validateDashboardAnalyticsFilters } from "../lib/dashboard-analytics";
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

const UNAVAILABLE_PLACEHOLDER = "—";

type AppliedFilters = {
  projectId: string;
  query: string;
  dateFrom: string;
  dateTo: string;
};

type SortableColumn = "pageviews" | "visits" | "visitors" | "goalReaches";
type SortDirection = "asc" | "desc";

export function DashboardMetricsSection() {
  const defaultRange = useMemo(() => getDefaultDashboardDateRange(), []);
  const { showToast } = useToast();
  const { page, pageSize, pageSizeOptions, setPage, setPageSize } = usePagination({ initialPageSize: 15 });
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState(defaultRange.dateFrom);
  const [dateTo, setDateTo] = useState(defaultRange.dateTo);
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters | null>(null);
  const [sortColumn, setSortColumn] = useState<SortableColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);

  const { data: projectOptions = [] } = useGetProjectOptionsQuery();
  const effectiveProjectId = selectedProjectId || projectOptions[0]?.value || "";

  const queryArgs = useMemo<DashboardMetricsRequest | typeof skipToken>(() => {
    if (!appliedFilters) {
      return skipToken;
    }
    return {
      projectId: Number(appliedFilters.projectId),
      query: appliedFilters.query || undefined,
      dateFrom: appliedFilters.dateFrom,
      dateTo: appliedFilters.dateTo,
      pageNumber: page,
      pageSize,
    };
  }, [appliedFilters, page, pageSize]);

  const { data, currentData, isFetching, error } = useGetDashboardMetricsQuery(queryArgs);

  useEffect(() => {
    if (!error) return;
    showToast({ variant: "error", message: "Ошибка загрузки данных метрики. Повторите запрос." });
  }, [error, showToast]);

  const resetMetrics = () => {
    setPage(0);
    setAppliedFilters(null);
    setSortColumn(null);
    setSortDirection("asc");
    setExpandedDomain(null);
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
    setExpandedDomain(null);
    setAppliedFilters({
      projectId: effectiveProjectId,
      query: search.trim(),
      dateFrom,
      dateTo,
    });
  };

  const rows = useMemo(() => data?.content ?? [], [data?.content]);
  const totalPages = data?.totalPages ?? 0;
  const hasLoaded = appliedFilters !== null;
  const showTableSkeleton = hasLoaded && isFetching && !currentData;
  const sortedRows = useMemo(() => {
    if (!sortColumn) {
      return rows;
    }
    return [...rows].sort((left, right) => compareMetricValues(left[sortColumn], right[sortColumn], sortDirection));
  }, [rows, sortColumn, sortDirection]);

  const handleSort = (column: SortableColumn) => {
    setExpandedDomain(null);
    if (sortColumn === column) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortColumn(column);
    setSortDirection("asc");
  };

  const toggleExpandedRow = (domain: string) => {
    setExpandedDomain((current) => (current === domain ? null : domain));
  };

  return (
    <Content>
      <Toolbar>
        <Field>
          <Label>Дата начала</Label>
          <StyledInput
            type="date"
            value={dateFrom}
            max={defaultRange.dateTo}
            onChange={(event) => {
              setDateFrom(event.target.value);
              resetMetrics();
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
              resetMetrics();
            }}
          />
        </Field>
        <Field>
          <Label>Проект</Label>
          <SelectControl
            value={effectiveProjectId}
            onValueChange={(value) => {
              setSelectedProjectId(value);
              resetMetrics();
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
              resetMetrics();
            }}
            placeholder="Введите домен"
          />
        </SearchField>
        <ShowButton type="button" variant="primary" onClick={handleShow} disabled={isFetching || !effectiveProjectId}>
          {isFetching ? "Загрузка..." : "Показать"}
        </ShowButton>
      </Toolbar>

      {!hasLoaded ? (
        <PlaceholderCard>Выберите фильтры и нажмите кнопку Показать.</PlaceholderCard>
      ) : showTableSkeleton ? (
        <TableSkeletonCard aria-hidden="true">
          <TableSkeletonHeader />
          {Array.from({ length: 5 }, (_, index) => (
            <TableSkeletonRow key={index}>
              <SkeletonLine $width="18%" />
              <SkeletonLine $width="12%" />
              <SkeletonLine $width="12%" />
              <SkeletonLine $width="12%" />
              <SkeletonLine $width="38%" />
              <SkeletonLine $width="12%" />
            </TableSkeletonRow>
          ))}
        </TableSkeletonCard>
      ) : rows.length === 0 ? (
        <PlaceholderCard>{EMPTY_DATA_MESSAGE}</PlaceholderCard>
      ) : (
        <>
          <TableWrapper>
            <MetricsTable>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Домен</TableHeaderCell>
                  <TableHeaderCell>
                    <SortButton type="button" onClick={() => handleSort("pageviews")}>
                      <span>Просмотры</span>
                      <SortIcons $active={sortColumn === "pageviews"}>
                        <span>{sortColumn === "pageviews" && sortDirection === "asc" ? "▲" : "△"}</span>
                        <span>{sortColumn === "pageviews" && sortDirection === "desc" ? "▼" : "▽"}</span>
                      </SortIcons>
                    </SortButton>
                  </TableHeaderCell>
                  <TableHeaderCell>
                    <SortButton type="button" onClick={() => handleSort("visits")}>
                      <span>Визиты</span>
                      <SortIcons $active={sortColumn === "visits"}>
                        <span>{sortColumn === "visits" && sortDirection === "asc" ? "▲" : "△"}</span>
                        <span>{sortColumn === "visits" && sortDirection === "desc" ? "▼" : "▽"}</span>
                      </SortIcons>
                    </SortButton>
                  </TableHeaderCell>
                  <TableHeaderCell>
                    <SortButton type="button" onClick={() => handleSort("visitors")}>
                      <span>Посетители</span>
                      <SortIcons $active={sortColumn === "visitors"}>
                        <span>{sortColumn === "visitors" && sortDirection === "asc" ? "▲" : "△"}</span>
                        <span>{sortColumn === "visitors" && sortDirection === "desc" ? "▼" : "▽"}</span>
                      </SortIcons>
                    </SortButton>
                  </TableHeaderCell>
                  <TableHeaderCell>URL входа</TableHeaderCell>
                  <TableHeaderCell>
                    <SortButton type="button" onClick={() => handleSort("goalReaches")}>
                      <span>Достижения целей</span>
                      <SortIcons $active={sortColumn === "goalReaches"}>
                        <span>{sortColumn === "goalReaches" && sortDirection === "asc" ? "▲" : "△"}</span>
                        <span>{sortColumn === "goalReaches" && sortDirection === "desc" ? "▼" : "▽"}</span>
                      </SortIcons>
                    </SortButton>
                  </TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedRows.map((row) => {
                  const entryUrls = row.entryUrls ?? [];
                  const firstEntryUrl = entryUrls[0];
                  const isExpanded = expandedDomain === row.domain;

                  return (
                    <ExpandableRow
                      key={row.domain}
                      $expanded={isExpanded}
                      onClick={() => toggleExpandedRow(row.domain)}
                      aria-expanded={isExpanded}
                    >
                      <TableCell>{row.domain}</TableCell>
                      <TableCell>{formatNumber(row.pageviews)}</TableCell>
                      <TableCell>{formatNumber(row.visits)}</TableCell>
                      <TableCell>{formatNumber(row.visitors)}</TableCell>
                      <UrlCell>
                        {firstEntryUrl ? (
                          <UrlCellContent>
                            {!isExpanded ? <ExpandedUrlItem as="span">{formatEntryUrl(firstEntryUrl)}</ExpandedUrlItem> : null}
                            {isExpanded ? (
                              <ExpandedUrlsList>
                                {entryUrls.map((entryUrl) => (
                                  <ExpandedUrlItem key={`${row.domain}-${entryUrl.url}`}>{formatEntryUrl(entryUrl)}</ExpandedUrlItem>
                                ))}
                              </ExpandedUrlsList>
                            ) : null}
                          </UrlCellContent>
                        ) : (
                          UNAVAILABLE_PLACEHOLDER
                        )}
                      </UrlCell>
                      <TableCell>{formatNumber(row.goalReaches)}</TableCell>
                    </ExpandableRow>
                  );
                })}
              </TableBody>
            </MetricsTable>
          </TableWrapper>
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
    </Content>
  );
}

const formatNumber = (value?: number | null) =>
  value === null || value === undefined ? UNAVAILABLE_PLACEHOLDER : value.toLocaleString("ru-RU");

const formatEntryUrl = (entryUrl: DashboardMetricsEntryUrlDto) =>
  `${entryUrl.url} (${(entryUrl.visits ?? 0).toLocaleString("ru-RU")})`;

const compareMetricValues = (left?: number | null, right?: number | null, direction: SortDirection = "asc") => {
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;
  return direction === "asc" ? left - right : right - left;
};

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

const PlaceholderCard = styled(PlaceholderText)`
  border: 1px solid #dbe5f3;
  background: #ffffff;
  border-radius: 14px;
  padding: 24px;
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

const MetricsTable = styled(Table)`
  ${TableHeaderCell}:nth-child(5),
  ${TableCell}:nth-child(5) {
    min-width: 320px;
  }
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
  grid-template-columns: 1.2fr 0.7fr 0.7fr 0.7fr 1.8fr 0.7fr;
  gap: 12px;
  align-items: center;
`;

const SkeletonLine = styled.span<{ $width: string; $height?: number }>`
  display: block;
  width: ${({ $width }) => $width};
  height: ${({ $height = 14 }) => `${$height}px`};
  border-radius: 999px;
  background: linear-gradient(90deg, #e2e8f0 0%, #f8fafc 50%, #e2e8f0 100%);
  animation: ${shimmer} 1.2s ease-in-out infinite;
`;

const ExpandableRow = styled(TableRow)<{ $expanded: boolean }>`
  cursor: pointer;
  background: ${({ $expanded }) => ($expanded ? "#f8fbff" : "transparent")};
`;

const ExpandedUrlsList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
`;

const ExpandedUrlItem = styled.li`
  word-break: break-all;
  color: ${({ theme }) => theme.tokens.color.textPrimary};
`;

const UrlCell = styled(TableCell)`
  word-break: break-all;
`;

const UrlCellContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;
