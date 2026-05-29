"use client";

import { useEffect, useMemo, useState } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import styled from "styled-components";
import { useGetDashboardQuery } from "@entities/dashboard/api";
import { DashboardStatus, getDashboardStatusLabel, type DashboardListRequest, type DashboardRowDto } from "@entities/dashboard/types";
import { useGetProjectOptionsQuery } from "@entities/projects/api";
import { usePagination } from "@shared/lib/use-pagination";
import { PaginationControls } from "@shared/ui/pagination-controls";
import {
  Button,
  DateInput,
  EMPTY_DATA_MESSAGE,
  PageHeader,
  PlaceholderText,
  ResultLoader,
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

const ALL_PROJECTS_VALUE = "__all_projects__";
const ALL_STATUSES_VALUE = "__all_statuses__";
const MAX_DASHBOARD_PERIOD_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

type AppliedRange = {
  dateFrom: string;
  dateTo: string;
};

type AppliedFilters = AppliedRange & {
  projectId: string;
  status: string;
  query: string;
};

export function DashboardPage() {
  const { showToast } = useToast();
  const { page, pageSize, pageSizeOptions, setPage, setPageSize } = usePagination();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState(ALL_PROJECTS_VALUE);
  const [selectedStatus, setSelectedStatus] = useState(ALL_STATUSES_VALUE);
  const [search, setSearch] = useState("");
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters | null>(null);

  const { data: projectOptions = [] } = useGetProjectOptionsQuery();
  const projectSelectOptions = useMemo(
    () => [{ value: ALL_PROJECTS_VALUE, label: "Все проекты" }, ...projectOptions],
    [projectOptions],
  );
  const statusSelectOptions = useMemo(
    () => [
      { value: ALL_STATUSES_VALUE, label: "Все статусы" },
      { value: DashboardStatus.GROWTH, label: getDashboardStatusLabel(DashboardStatus.GROWTH) },
      { value: DashboardStatus.DECLINE, label: getDashboardStatusLabel(DashboardStatus.DECLINE) },
      { value: DashboardStatus.STAGNATION, label: getDashboardStatusLabel(DashboardStatus.STAGNATION) },
      { value: DashboardStatus.NO_DATA, label: getDashboardStatusLabel(DashboardStatus.NO_DATA) },
    ],
    [],
  );

  const dashboardQueryArgs = useMemo<DashboardListRequest | typeof skipToken>(() => {
    if (!appliedFilters) {
      return skipToken;
    }
    return {
      dateFrom: appliedFilters.dateFrom,
      dateTo: appliedFilters.dateTo,
      pageNumber: page,
      pageSize,
      ...(appliedFilters.projectId !== ALL_PROJECTS_VALUE ? { projectId: Number(appliedFilters.projectId) } : {}),
      ...(appliedFilters.status !== ALL_STATUSES_VALUE ? { status: appliedFilters.status as DashboardStatus } : {}),
      ...(appliedFilters.query.length > 0 ? { query: appliedFilters.query } : {}),
    };
  }, [appliedFilters, page, pageSize]);

  const { data, isFetching, isLoading, error } = useGetDashboardQuery(dashboardQueryArgs);
  const rows = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;

  useEffect(() => {
    if (!error) return;
    showToast({ variant: "error", message: "Ошибка загрузки дашборда. Проверьте данные и повторите запрос." });
  }, [error, showToast]);

  const handleShow = () => {
    if (!dateFrom || !dateTo) {
      showToast({ variant: "error", message: "Укажите дату начала и дату конца." });
      return;
    }
    if (dateFrom > dateTo) {
      showToast({ variant: "error", message: "Дата начала не может быть позже даты конца." });
      return;
    }
    if (!isDateRangeWithinLimit(dateFrom, dateTo)) {
      showToast({ variant: "error", message: "Период не может превышать 30 дней." });
      return;
    }
    setPage(0);
    setAppliedFilters({
      dateFrom,
      dateTo,
      projectId: selectedProjectId,
      status: selectedStatus,
      query: search.trim(),
    });
  };

  const resetDashboard = () => {
    setPage(0);
    setAppliedFilters(null);
  };
  const hasLoaded = appliedFilters !== null;

  return (
    <PageShell>
      <PageHeader title="Дашборд" />
      <Toolbar>
        <Field>
          <Label>Дата начала</Label>
          <DateInput
            value={dateFrom}
            onChange={(event) => {
              setDateFrom(event.target.value);
              resetDashboard();
            }}
          />
        </Field>
        <Field>
          <Label>Дата конца</Label>
          <DateInput
            value={dateTo}
            onChange={(event) => {
              setDateTo(event.target.value);
              resetDashboard();
            }}
          />
        </Field>
        <Field>
          <Label>Проект</Label>
          <SelectControl
            value={selectedProjectId}
            onValueChange={(value) => {
              setSelectedProjectId(value);
              resetDashboard();
            }}
            options={projectSelectOptions}
          />
        </Field>
        <SearchField>
          <Label>Поиск</Label>
          <StyledInput
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              resetDashboard();
            }}
            placeholder="Поиск по домену"
          />
        </SearchField>
        <Field>
          <LabelWithHelp>
            Статус
            <HelpIcon
              tabIndex={0}
              aria-label="Использование этого фильтра значительно замедляет запрос."
              data-tooltip="Использование этого фильтра значительно замедляет запрос."
            >
              ?
            </HelpIcon>
          </LabelWithHelp>
          <SelectControl
            value={selectedStatus}
            onValueChange={(value) => {
              setSelectedStatus(value);
              resetDashboard();
            }}
            options={statusSelectOptions}
          />
        </Field>
        <ShowButton type="button" variant="primary" onClick={handleShow} disabled={isFetching}>
          {isFetching ? "Загрузка..." : "Показать"}
        </ShowButton>
      </Toolbar>

      {!hasLoaded ? (
        <PlaceholderCard>Выберите период и нажмите кнопку Показать.</PlaceholderCard>
      ) : (
        <>
          <DashboardTable rows={rows} isLoading={isLoading || isFetching} />
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
    </PageShell>
  );
}

function DashboardTable({ rows, isLoading }: { rows: DashboardRowDto[]; isLoading: boolean }) {
  if (isLoading) {
    return <LoadingCard><ResultLoader label="Загрузка данных..." /></LoadingCard>;
  }

  if (rows.length === 0) {
    return <PlaceholderCard>{EMPTY_DATA_MESSAGE}</PlaceholderCard>;
  }

  return (
    <TableWrapper>
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Проект</TableHeaderCell>
            <TableHeaderCell>Домен</TableHeaderCell>
            <TableHeaderCell>Статус</TableHeaderCell>
            <TableHeaderCell>Индексация</TableHeaderCell>
            <TableHeaderCell>Показы</TableHeaderCell>
            <TableHeaderCell>Клики</TableHeaderCell>
            <TableHeaderCell>Позиция</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.siteId}>
              <TableCell>{row.projectName ?? "—"}</TableCell>
              <TableCell>{row.domain}</TableCell>
              <TableCell>
                <StatusBadge data-status={row.status}>{getDashboardStatusLabel(row.status)}</StatusBadge>
              </TableCell>
              <TableCell>{formatSignedNumber(row.indexing)}</TableCell>
              <TableCell>{formatNumber(row.impressions)}</TableCell>
              <TableCell>{formatNumber(row.clicks)}</TableCell>
              <TableCell>{formatPosition(row.position)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableWrapper>
  );
}

const formatNumber = (value?: number | null) => (value === null || value === undefined ? "—" : value.toLocaleString("ru-RU"));

const isDateRangeWithinLimit = (dateFrom: string, dateTo: string) => {
  const fromDate = new Date(dateFrom);
  const toDate = new Date(dateTo);
  return Math.floor((toDate.getTime() - fromDate.getTime()) / DAY_MS) + 1 <= MAX_DASHBOARD_PERIOD_DAYS;
};

const formatSignedNumber = (value?: number | null) => {
  if (value === null || value === undefined) {
    return "—";
  }
  return value > 0 ? `+${value.toLocaleString("ru-RU")}` : value.toLocaleString("ru-RU");
};

const formatPosition = (value?: number | null) => {
  if (value === null || value === undefined) {
    return "—";
  }
  return value.toLocaleString("ru-RU", { maximumFractionDigits: 2 });
};

const PageShell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const Toolbar = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(150px, 180px)) minmax(170px, 210px) 260px minmax(170px, 210px) 1fr auto;
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
  width: 100%;
`;

const Label = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.tokens.color.textSecondary};
`;

const LabelWithHelp = styled(Label)`
  display: inline-flex;
  align-items: center;
  gap: 6px;
`;

const HelpIcon = styled.span`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 999px;
  border: 1px solid #cbd7ea;
  color: #64748b;
  font-size: 11px;
  line-height: 1;
  cursor: help;

  &::after {
    content: attr(data-tooltip);
    position: absolute;
    left: 50%;
    bottom: calc(100% + 8px);
    z-index: 20;
    width: 250px;
    padding: 8px 10px;
    border-radius: 8px;
    background: #111827;
    color: #ffffff;
    font-size: 12px;
    font-weight: 500;
    line-height: 1.35;
    white-space: normal;
    transform: translateX(-50%);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.15s ease;
  }

  &:hover::after,
  &:focus-visible::after {
    opacity: 1;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.tokens.color.accent};
    outline-offset: 2px;
  }
`;

const ShowButton = styled(Button)`
  min-width: 110px;
  grid-column: 7;
`;

const PlaceholderCard = styled(PlaceholderText)`
  border: 1px solid #dbe5f3;
  background: #ffffff;
  border-radius: 14px;
  padding: 24px;
`;

const LoadingCard = styled.div`
  border: 1px solid #dbe5f3;
  background: #ffffff;
  border-radius: 14px;
  min-height: 180px;
`;

const StatusBadge = styled.span`
  display: inline-flex;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 12px;
  background: #f3f4f6;
  color: #374151;

  &[data-status="${DashboardStatus.GROWTH}"] {
    background: #ecfdf3;
    color: #027a48;
  }

  &[data-status="${DashboardStatus.DECLINE}"] {
    background: #fef3f2;
    color: #b42318;
  }

  &[data-status="${DashboardStatus.STAGNATION}"] {
    background: #fffaeb;
    color: #b54708;
  }
`;
