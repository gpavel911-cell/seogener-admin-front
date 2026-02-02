"use client";

import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { useGetCountersQuery, useSyncCountersMutation } from "@entities/analytics/api";
import { AnalyticsProvider, type AnalyticsCounterDto } from "@entities/analytics/types";
import { usePagination } from "@shared/lib/use-pagination";
import {
  Button,
  PageTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableWrapper,
  useToast,
} from "@shared/ui";
import { PaginationControls } from "@shared/ui/pagination-controls";

const PROVIDERS: { id: AnalyticsProvider; label: string }[] = [
  { id: AnalyticsProvider.YANDEX_METRICA, label: "Яндекс Метрика" },
];

const DEFAULT_PROVIDER: AnalyticsProvider = PROVIDERS[0]?.id ?? AnalyticsProvider.YANDEX_METRICA;

export function CountersPage() {
  const {
    page,
    pageSize,
    pageSizeOptions,
    setPage,
    setPageSize,
  } = usePagination();
  const [activeProvider, setActiveProvider] = useState<AnalyticsProvider>(DEFAULT_PROVIDER);
  const { data, isFetching, refetch } = useGetCountersQuery({
    provider: activeProvider,
    pageNumber: page,
    pageSize,
  });
  const [syncCounters, { isLoading: isSyncingCounters }] = useSyncCountersMutation();
  const { showToast } = useToast();

  const counters = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;

  useEffect(() => {
    setPage(0);
  }, [activeProvider, setPage]);

  const handleSyncCounters = async () => {
    try {
      await syncCounters({ provider: activeProvider }).unwrap();
      refetch();
      showToast({ variant: "success", message: "Синхронизация завершена." });
    } catch (error) {
      showToast({ variant: "error", message: "Ошибка синхронизации счетчиков." });
    }
  };

  return (
    <Wrapper>
      <Header>
        <PageTitle>Счетчики</PageTitle>
        <Button type="button" onClick={handleSyncCounters} disabled={isSyncingCounters}>
          {isSyncingCounters ? "Синхронизация..." : "Синхронизировать"}
        </Button>
      </Header>
      <Body>
        <LeftColumn>
          {PROVIDERS.map((provider) => (
            <IntegrationButton
              key={provider.id}
              type="button"
              $active={activeProvider === provider.id}
              onClick={() => setActiveProvider(provider.id)}
            >
              {provider.label}
            </IntegrationButton>
          ))}
        </LeftColumn>
        <Main>
          <TableSection>
            <CountersTable items={counters} isLoading={isFetching} />
            <PaginationControls
              page={page}
              totalPages={totalPages}
              pageSize={pageSize}
              pageSizeOptions={pageSizeOptions}
              isFetching={isFetching}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </TableSection>
        </Main>
      </Body>
    </Wrapper>
  );
}

const CountersTable = ({
  items,
  isLoading,
}: {
  items: AnalyticsCounterDto[];
  isLoading: boolean;
}) => {
  const rows = useMemo(() => {
    if (isLoading) {
      return (
        <TableRow>
          <TableCell colSpan={4}>Загрузка...</TableCell>
        </TableRow>
      );
    }
    if (items.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={4}>Счетчики не найдены.</TableCell>
        </TableRow>
      );
    }
    return items.map((item) => (
      <TableRow key={item.id}>
        <TableCell>{item.counterId}</TableCell>
        <TableCell>{item.counterName ?? "—"}</TableCell>
        <TableCell>{item.siteUrl ?? "—"}</TableCell>
        <TableCell>{formatDateTime(item.updatedAt)}</TableCell>
      </TableRow>
    ));
  }, [items, isLoading]);

  return (
    <TableWrapper>
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Номер счетчика</TableHeaderCell>
            <TableHeaderCell>Название</TableHeaderCell>
            <TableHeaderCell>Сайт</TableHeaderCell>
            <TableHeaderCell>Время последнего обновления</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>{rows}</TableBody>
      </Table>
    </TableWrapper>
  );
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("ru-RU");
};

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
`;

const Body = styled.div`
  display: grid;
  grid-template-columns: 250px 1fr;
  gap: 16px;
  align-items: flex-start;
`;

const LeftColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 250px;
`;

const IntegrationButton = styled.button<{ $active?: boolean }>`
  width: 250px;
  padding: 16px;
  text-align: left;
  border-radius: 12px;
  border: 1px solid ${({ $active }) => ($active ? "#2563eb" : "#e5e7eb")};
  background: ${({ $active }) => ($active ? "#eff6ff" : "#ffffff")};
  color: ${({ $active }) => ($active ? "#1d4ed8" : "#111827")};
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
`;

const Main = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const TableSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;
