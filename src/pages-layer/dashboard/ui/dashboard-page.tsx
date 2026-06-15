"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import { FaInfoCircle, FaSyncAlt } from "react-icons/fa";
import styled, { css, keyframes } from "styled-components";
import { shouldShowBulkRecrawlButton } from "../lib/dashboard-action-visibility";
import { DashboardDetailsModalContent } from "./dashboard-detail-page";
import { useGetDashboardQuery, useRecrawlDashboardSiteMutation, useRecrawlDashboardSitesMutation } from "@entities/dashboard/api";
import type { DashboardListRequest, DashboardRecrawlReportDto, DashboardRowDto } from "@entities/dashboard/types";
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

const ALL_PROJECTS_VALUE = "__all_projects__";
const DASHBOARD_VIEW_LABEL = "Индексация";
const UNAVAILABLE_PLACEHOLDER = "—";

type ApiError = { data?: { message?: string } };

type AppliedFilters = {
  projectId: string;
  query: string;
};

export function DashboardPage() {
  const { showToast } = useToast();
  const { page, pageSize, pageSizeOptions, setPage, setPageSize } = usePagination({ initialPageSize: 5 });
  const [selectedProjectId, setSelectedProjectId] = useState(ALL_PROJECTS_VALUE);
  const [search, setSearch] = useState("");
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters | null>(null);
  const [reportDomains, setReportDomains] = useState<string[]>([]);
  const [failedReportDomains, setFailedReportDomains] = useState<string[]>([]);
  const [report, setReport] = useState<DashboardRecrawlReportDto | null>(null);
  const [activeRecrawlSiteId, setActiveRecrawlSiteId] = useState<number | null>(null);
  const [selectedSiteIds, setSelectedSiteIds] = useState<number[]>([]);
  const [isBulkRecrawling, setIsBulkRecrawling] = useState(false);
  const [detailRow, setDetailRow] = useState<DashboardRowDto | null>(null);

  const { data: projectOptions = [] } = useGetProjectOptionsQuery();
  const [recrawlDashboardSite] = useRecrawlDashboardSiteMutation();
  const [recrawlDashboardSites] = useRecrawlDashboardSitesMutation();
  const projectSelectOptions = useMemo(
    () => [{ value: ALL_PROJECTS_VALUE, label: "Все проекты" }, ...projectOptions],
    [projectOptions],
  );

  const dashboardQueryArgs = useMemo<DashboardListRequest | typeof skipToken>(() => {
    if (!appliedFilters) {
      return skipToken;
    }
    return {
      pageNumber: page,
      pageSize,
      ...(appliedFilters.projectId !== ALL_PROJECTS_VALUE ? { projectId: Number(appliedFilters.projectId) } : {}),
      ...(appliedFilters.query.length > 0 ? { query: appliedFilters.query } : {}),
    };
  }, [appliedFilters, page, pageSize]);

  const { data, isFetching, error } = useGetDashboardQuery(dashboardQueryArgs);
  const rows = useMemo(() => data?.content ?? [], [data?.content]);
  const totalPages = data?.totalPages ?? 0;
  const hasLoaded = appliedFilters !== null;
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
    setPage(0);
    setAppliedFilters({
      projectId: selectedProjectId,
      query: search.trim(),
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
            <SubItem>
              <SubButton type="button" $active aria-current="page">
                {DASHBOARD_VIEW_LABEL}
              </SubButton>
            </SubItem>
          </SubList>
        </SubSidebar>
        <Content>
          <Toolbar>
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
            <ShowButton type="button" variant="primary" onClick={handleShow} disabled={isFetching}>
              {isFetching ? "Загрузка..." : "Показать"}
            </ShowButton>
          </Toolbar>

          {!hasLoaded ? (
            <PlaceholderCard>Выберите фильтры и нажмите кнопку Показать.</PlaceholderCard>
          ) : (
            <>
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

function DashboardTable({
  rows,
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
  cursor: default;
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
  grid-template-columns: minmax(180px, 220px) 260px auto;
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
