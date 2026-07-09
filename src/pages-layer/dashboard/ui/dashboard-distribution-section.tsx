"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import styled, { css, keyframes } from "styled-components";
import { useGetDistributionOrdersQuery } from "@entities/distribution/api";
import { getDefaultDashboardDateRange } from "../lib/dashboard-analytics";
import { validateDistributionDateFilters } from "../lib/distribution-date-filters";
import {
  formatDateTime,
  formatMoney,
  formatNullable,
  formatPercent,
  formatSummaryValue,
  sortDistributionOrders,
  UNAVAILABLE_PLACEHOLDER,
} from "../lib/distribution-formatters";
import {
  formatDistributionSource,
  formatDistributionStatus,
  resolveDistributionStatusVariant,
  type DistributionStatusVariant,
} from "../lib/distribution-labels";
import { usePagination } from "@shared/lib/use-pagination";
import { PaginationControls } from "@shared/ui/pagination-controls";
import {
  Button,
  DateInput,
  EMPTY_DATA_MESSAGE,
  PlaceholderText,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableWrapper,
  useToast,
} from "@shared/ui";

type AppliedFilters = {
  dateFrom: string;
  dateTo: string;
};

type ApiError = { data?: { message?: string } };

const SUMMARY_CARDS = [
  { key: "totalOrders", label: "Всего заказов за период" },
  { key: "confirmedCount", label: "Подтверждённых заказов" },
  { key: "holdCount", label: "Ожидающих подтверждения" },
  { key: "confirmedFeeAmount", label: "Сумма вознаграждения по подтверждённым заказам" },
] as const;

export function DashboardDistributionSection() {
  const defaultRange = useMemo(() => getDefaultDashboardDateRange(), []);
  const { showToast } = useToast();
  const { page, pageSize, pageSizeOptions, setPage, setPageSize } = usePagination({ initialPageSize: 15 });
  const [dateFrom, setDateFrom] = useState(defaultRange.dateFrom);
  const [dateTo, setDateTo] = useState(defaultRange.dateTo);
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters | null>(null);

  const queryArgs = useMemo(() => {
    if (!appliedFilters) {
      return skipToken;
    }
    return {
      dateFrom: appliedFilters.dateFrom,
      dateTo: appliedFilters.dateTo,
    };
  }, [appliedFilters]);

  const { data, currentData, isFetching, isError, error } = useGetDistributionOrdersQuery(queryArgs);

  useEffect(() => {
    if (!error) {
      return;
    }
    const message = (error as ApiError)?.data?.message ?? "Не удалось загрузить заказы.";
    showToast({ variant: "error", message });
  }, [error, showToast]);

  const sortedOrders = useMemo(
    () => sortDistributionOrders(data?.orders ?? []),
    [data?.orders],
  );

  const totalPages = Math.max(1, Math.ceil(sortedOrders.length / pageSize));
  const paginatedOrders = useMemo(() => {
    const start = page * pageSize;
    return sortedOrders.slice(start, start + pageSize);
  }, [page, pageSize, sortedOrders]);

  const hasLoaded = appliedFilters !== null;
  const showTableSkeleton = hasLoaded && isFetching && !currentData;
  const showError = hasLoaded && !isFetching && isError;
  const showContent = hasLoaded && !isFetching && !isError && data;

  const resetAppliedFilters = () => {
    setPage(0);
    setAppliedFilters(null);
  };

  const handleDateFromChange = (event: ChangeEvent<HTMLInputElement>) => {
    setDateFrom(event.target.value);
    resetAppliedFilters();
  };

  const handleDateToChange = (event: ChangeEvent<HTMLInputElement>) => {
    setDateTo(event.target.value);
    resetAppliedFilters();
  };

  const handleShow = () => {
    const validationMessage = validateDistributionDateFilters({ dateFrom, dateTo });
    if (validationMessage) {
      showToast({ variant: "error", message: validationMessage });
      return;
    }
    setPage(0);
    setAppliedFilters({ dateFrom, dateTo });
  };

  return (
    <Root>
      <Content>
        <Toolbar>
          <Field>
            <Label>Дата от</Label>
            <DateInput
              value={dateFrom}
              max={dateTo || defaultRange.dateTo}
              onChange={handleDateFromChange}
            />
          </Field>
          <Field>
            <Label>Дата до</Label>
            <DateInput
              value={dateTo}
              min={dateFrom}
              max={defaultRange.dateTo}
              onChange={handleDateToChange}
            />
          </Field>
          <ShowButton type="button" variant="primary" onClick={handleShow} disabled={isFetching}>
            {isFetching ? "Загрузка..." : "Показать"}
          </ShowButton>
          <ToolbarSpacer aria-hidden="true" />
        </Toolbar>

        {!hasLoaded ? (
          <PlaceholderCard>Выберите фильтры и нажмите кнопку &quot;Показать&quot;.</PlaceholderCard>
        ) : showTableSkeleton ? (
          <LoadingBlock>
            <SummaryGrid aria-hidden="true">
              {SUMMARY_CARDS.map((card) => (
                <SummarySkeletonCard key={card.key} />
              ))}
            </SummaryGrid>
            <TableSkeleton />
          </LoadingBlock>
        ) : showError ? (
          <PlaceholderCard>{(error as ApiError)?.data?.message ?? "Не удалось загрузить заказы."}</PlaceholderCard>
        ) : showContent && sortedOrders.length === 0 ? (
          <PlaceholderCard>{EMPTY_DATA_MESSAGE}</PlaceholderCard>
        ) : showContent ? (
          <>
            <SummaryGrid>
              {SUMMARY_CARDS.map((card) => (
                <SummaryCard key={card.key}>
                  <SummaryLabel>{card.label}</SummaryLabel>
                  <SummaryValue>{formatSummaryValue(card.key, data.summary)}</SummaryValue>
                </SummaryCard>
              ))}
            </SummaryGrid>
            <TableWrapper>
              <DistributionTable>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>№ заказа</TableHeaderCell>
                    <TableHeaderCell>Дата создания</TableHeaderCell>
                    <TableHeaderCell>Clid</TableHeaderCell>
                    <TableHeaderCell>VID</TableHeaderCell>
                    <TableHeaderCell>Статус</TableHeaderCell>
                    <TableHeaderCell>Город</TableHeaderCell>
                    <TableHeaderCell>Источник</TableHeaderCell>
                    <TableHeaderCell>Сумма заказа</TableHeaderCell>
                    <TableHeaderCell>Вознаграждение</TableHeaderCell>
                    <TableHeaderCell>%</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedOrders.map((row) => (
                    <TableRow key={`${row.partnerOrderId}-${row.createdAt}`}>
                      <TableCell>{row.partnerOrderId}</TableCell>
                      <TableCell>{formatDateTime(row.createdAt)}</TableCell>
                      <TableCell>{formatNullable(row.clid)}</TableCell>
                      <TableCell>{formatNullable(row.affiliateVid)}</TableCell>
                      <TableCell>
                        <StatusBadge $variant={resolveDistributionStatusVariant(row.state)}>
                          {formatDistributionStatus(row.state)}
                        </StatusBadge>
                      </TableCell>
                      <TableCell>{formatNullable(row.city)}</TableCell>
                      <TableCell>{formatDistributionSource(row.sourcePlatform, UNAVAILABLE_PLACEHOLDER)}</TableCell>
                      <MoneyCell>{formatMoney(row.orderAmount)}</MoneyCell>
                      <MoneyCell>{formatMoney(row.feeAmount)}</MoneyCell>
                      <TableCell>{formatPercent(row.feePercent)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={7}>
                      <FooterLabel>Итого</FooterLabel>
                    </TableCell>
                    <MoneyCell>{formatMoney(data.totals.orderAmount)}</MoneyCell>
                    <MoneyCell>{formatMoney(data.totals.feeAmount)}</MoneyCell>
                    <TableCell>{UNAVAILABLE_PLACEHOLDER}</TableCell>
                  </TableRow>
                </TableBody>
              </DistributionTable>
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
        ) : null}
      </Content>
    </Root>
  );
}

function TableSkeleton() {
  return (
    <TableWrapper>
      <Table>
        <TableHead>
          <TableRow>
            {Array.from({ length: 10 }).map((_, index) => (
              <TableHeaderCell key={index}>
                <SkeletonLine />
              </TableHeaderCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {Array.from({ length: 6 }).map((_, rowIndex) => (
            <TableRow key={rowIndex}>
              {Array.from({ length: 10 }).map((__, cellIndex) => (
                <TableCell key={cellIndex}>
                  <SkeletonLine />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableWrapper>
  );
}

const shimmer = keyframes`
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
`;

const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
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
  grid-template-columns: minmax(180px, 220px) minmax(180px, 220px) auto 1fr;
  gap: 12px;
  align-items: end;
  padding: 14px;
  border: 1px solid #dbe5f3;
  border-radius: 14px;
  background: #ffffff;
`;

const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
`;

const Label = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
`;

const ShowButton = styled(Button)`
  min-width: 110px;
  justify-self: start;
`;

const ToolbarSpacer = styled.div`
  min-width: 0;
`;

const PlaceholderCard = styled(PlaceholderText)`
  border: 1px solid #dbe5f3;
  background: #ffffff;
  border-radius: 14px;
  padding: 24px;
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

const SummarySkeletonCard = styled(SummaryCard)`
  min-height: 96px;
`;

const LoadingBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const SkeletonLine = styled.div`
  height: 14px;
  border-radius: 999px;
  background: linear-gradient(90deg, #eef2f7 0%, #f8fafc 50%, #eef2f7 100%);
  background-size: 200% 100%;
  animation: ${shimmer} 1.4s ease-in-out infinite;
`;

const DistributionTable = styled(Table)`
  ${TableHeaderCell}:nth-child(8),
  ${TableHeaderCell}:nth-child(9),
  ${TableCell}:nth-child(8),
  ${TableCell}:nth-child(9) {
    text-align: right;
  }
`;

const MoneyCell = styled(TableCell)`
  text-align: right;
  white-space: nowrap;
`;

const badgeStyles = css`
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
`;

const StatusBadge = styled.span<{ $variant: DistributionStatusVariant }>`
  ${badgeStyles}
  background: ${({ $variant }) =>
    $variant === "confirmed" ? "#ecfdf3" : $variant === "hold" ? "#fef9c3" : $variant === "canceled" ? "#fef2f2" : "#f1f5f9"};
  color: ${({ $variant }) =>
    $variant === "confirmed" ? "#027a48" : $variant === "hold" ? "#ca8a04" : $variant === "canceled" ? "#b42318" : "#475569"};
`;

const FooterLabel = styled.span`
  font-weight: 700;
  color: #0f172a;
`;
