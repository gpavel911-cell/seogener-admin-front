"use client";

import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { skipToken } from "@reduxjs/toolkit/query";
import { useGetCounterDetailsQuery, useGetCountersQuery, useSyncCountersMutation } from "@entities/analytics/api";
import { AnalyticsProvider } from "@entities/analytics/types";
import { usePagination } from "@shared/lib/use-pagination";
import {
  Button,
  PageTitle,
  useToast,
} from "@shared/ui";
import { PaginationControls } from "@shared/ui/pagination-controls";
import { CountersTable } from "./counters-table";
import { CounterDetailsModal } from "./counter-details-modal";

const PROVIDERS: { id: AnalyticsProvider; label: string }[] = [
  { id: AnalyticsProvider.YANDEX_METRICA, label: "Яндекс Метрика" },
];

export function CountersPage() {
  const { showToast } = useToast();
  const { page, pageSize, pageSizeOptions, setPage, setPageSize } = usePagination();
  const [activeProvider, setActiveProvider] = useState<AnalyticsProvider>(PROVIDERS[0]?.id);
  const [selectedCounterId, setSelectedCounterId] = useState<number | null>(null);

  const { data, isFetching, isLoading, error: loadError, refetch } = useGetCountersQuery({
    provider: activeProvider,
    pageNumber: page,
    pageSize,
  });
  const [syncCounters, { isLoading: isSyncingCounters }] = useSyncCountersMutation();

  const counters = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;
  const shouldShowEmptyState = !isLoading && counters.length === 0;

  const resolvedSelectedCounterId = useMemo(() => {
    if (!selectedCounterId) {
      return null;
    }
    const exists = counters.some((item) => item.id === selectedCounterId);
    return exists ? selectedCounterId : null;
  }, [counters, selectedCounterId]);

  const { data: counterDetails, isFetching: isDetailsLoading } = useGetCounterDetailsQuery(
    resolvedSelectedCounterId ?? skipToken,
  );

  const loadErrorMessage = useMemo(() => {
    if (!loadError) return null;
    if (typeof loadError === "object" && "status" in loadError) {
      return `Ошибка загрузки счетчиков (status ${(loadError as { status: number }).status}).`;
    }
    return "Ошибка загрузки счетчиков.";
  }, [loadError]);

  useEffect(() => {
    if (!loadErrorMessage) return;
    showToast({ variant: "error", message: loadErrorMessage });
  }, [loadErrorMessage, showToast]);

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
            {shouldShowEmptyState ? (
              <EmptyState>Счетчики не найдены. Выполните синхронизацию.</EmptyState>
            ) : (
              <>
                <CountersTable
                  items={counters}
                  isLoading={isLoading}
                  selectedCounterId={resolvedSelectedCounterId}
                  onSelect={setSelectedCounterId}
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
          </TableSection>
          <CounterDetailsModal
            isOpen={resolvedSelectedCounterId !== null}
            isLoading={isDetailsLoading}
            details={counterDetails}
            onClose={() => setSelectedCounterId(null)}
          />
        </Main>
      </Body>
    </Wrapper>
  );
}

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

const EmptyState = styled.div`
  border: 1px dashed #d1d5db;
  background: #f9fafb;
  padding: 20px;
  border-radius: 12px;
  font-size: 14px;
  color: #4b5563;
`;
