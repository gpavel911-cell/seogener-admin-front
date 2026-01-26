"use client";

import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { skipToken } from "@reduxjs/toolkit/query";
import { useGetDomainDetailsQuery, useGetDomainsQuery, useSyncDomainsMutation } from "@entities/domains/api";
import { usePagination } from "@shared/lib/use-pagination";
import { PaginationControls } from "@shared/ui/pagination-controls";
import { Button, PageTitle, useToast } from "@shared/ui";
import { DomainTable } from "./domain-table";
import { DomainDetailsPanel } from "./domain-details-panel";

export function DomainsPage() {
  const { page, pageSize, pageSizeOptions, setPage, setPageSize } = usePagination();
  const [selectedDomainId, setSelectedDomainId] = useState<number | null>(null);

  const { data: domainData, isLoading, isFetching, error: loadError, refetch } = useGetDomainsQuery({
    page,
    limit: pageSize,
  });
  const {
    data: domainDetails,
    isFetching: isDetailsLoading,
    error: detailsError,
  } = useGetDomainDetailsQuery(selectedDomainId ?? skipToken);
  const [syncDomains, { isLoading: isSyncing }] = useSyncDomainsMutation();
  const { showToast } = useToast();

  const totalPages = domainData?.totalPages ?? 0;
  const items = domainData?.content ?? [];

  const loadErrorMessage = useMemo(() => {
    if (!loadError) return null;
    if (typeof loadError === "object" && "status" in loadError) {
      return `Ошибка загрузки доменов (status ${(loadError as { status: number }).status}).`;
    }
    return "Ошибка загрузки доменов.";
  }, [loadError]);

  const detailsErrorMessage = useMemo(() => {
    if (!detailsError) return null;
    if (typeof detailsError === "object" && "status" in detailsError) {
      return `Ошибка загрузки деталей (status ${(detailsError as { status: number }).status}).`;
    }
    return "Ошибка загрузки деталей домена.";
  }, [detailsError]);

  useEffect(() => {
    if (!loadErrorMessage) return;
    showToast({ variant: "error", message: loadErrorMessage });
  }, [loadErrorMessage, showToast]);

  useEffect(() => {
    if (!detailsErrorMessage) return;
    showToast({ variant: "error", message: detailsErrorMessage });
  }, [detailsErrorMessage, showToast]);


  const onSync = async () => {
    try {
      await syncDomains().unwrap();
      refetch();
      showToast({ variant: "success", message: "Синхронизация завершена." });
    } catch {
      showToast({ variant: "error", message: "Ошибка синхронизации" });
    }
  };

  return (
    <Wrapper>
      <Header>
        <PageTitle>Домены</PageTitle>
        <Actions>
          <Button type="button" onClick={onSync} disabled={isSyncing}>
            {isSyncing ? "Синхронизация..." : "Синхронизировать"}
          </Button>
        </Actions>
      </Header>

      <DomainTable
        items={items}
        isLoading={isLoading}
        selectedDomainId={selectedDomainId}
        onSelect={setSelectedDomainId}
      />

      <DomainDetailsPanel
        isOpen={selectedDomainId !== null}
        isLoading={isDetailsLoading}
        details={domainDetails}
        onClose={() => setSelectedDomainId(null)}
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
    </Wrapper>
  );
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;
