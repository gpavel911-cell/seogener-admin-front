"use client";

import { useEffect, useMemo } from "react";
import styled from "styled-components";

import { useGetDomainsQuery, useSyncDomainsMutation } from "@entities/domains/api";
import { RegistrarPresence, type DomainDto } from "@entities/domains/types";
import { usePagination } from "@shared/lib/use-pagination";
import { PaginationControls } from "@shared/ui/pagination-controls";
import {
  Button,
  PageTitle,
  TableWrapper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
  useToast,
} from "@shared/ui";

export function DomainsPage() {
  const { page, pageSize, pageSizeOptions, setPage, setPageSize } = usePagination();

  const { data: domainData, isLoading, isFetching, error: loadError, refetch } = useGetDomainsQuery({
    page,
    limit: pageSize,
  });
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

  useEffect(() => {
    if (!loadErrorMessage) return;
    showToast({ variant: "error", message: loadErrorMessage });
  }, [loadErrorMessage, showToast]);


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

      <TableWrapper>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Домен</TableHeaderCell>
              <TableHeaderCell>Service ID</TableHeaderCell>
              <TableHeaderCell>State</TableHeaderCell>
              <TableHeaderCell>Servtype</TableHeaderCell>
              <TableHeaderCell>Subtype</TableHeaderCell>
              <TableHeaderCell>Uplink ID</TableHeaderCell>
              <TableHeaderCell>Создан</TableHeaderCell>
              <TableHeaderCell>Истекает</TableHeaderCell>
              <TableHeaderCell>Presence</TableHeaderCell>
              <TableHeaderCell>Регистратор</TableHeaderCell>
              <TableHeaderCell>Профиль</TableHeaderCell>
              <TableHeaderCell>Последний sync</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={12}>Загрузка...</TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12}>Домены не найдены.</TableCell>
              </TableRow>
            ) : (
              items.map((domain) => <DomainRow key={domain.id} domain={domain} />)
            )}
          </TableBody>
        </Table>
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
    </Wrapper>
  );
}


function DomainRow({ domain }: { domain: DomainDto }) {
  return (
    <TableRow>
      <TableCell>{domain.dname}</TableCell>
      <TableCell>{domain.serviceId}</TableCell>
      <TableCell>{domain.state ?? "—"}</TableCell>
      <TableCell>{domain.servtype}</TableCell>
      <TableCell>{domain.subtype ?? "—"}</TableCell>
      <TableCell>{domain.uplinkServiceId ?? "—"}</TableCell>
      <TableCell>{domain.creationDate ?? "—"}</TableCell>
      <TableCell>{domain.expirationDate ?? "—"}</TableCell>
      <TableCell>
        <Badge data-variant={domain.registrarPresence}>
          {domain.registrarPresence === RegistrarPresence.MISSING ? "Missing" : "Present"}
        </Badge>
      </TableCell>
      <TableCell>{domain.registrar}</TableCell>
      <TableCell>{domain.profile}</TableCell>
      <TableCell>{new Date(domain.lastSeenAt).toLocaleString("ru-RU")}</TableCell>
    </TableRow>
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

const Badge = styled.span`
  display: inline-flex;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 12px;
  background: #ecfdf3;
  color: #027a48;

  &[data-variant="MISSING"] {
    background: #fef3f2;
    color: #b42318;
  }
`;

