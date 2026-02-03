"use client";

import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { skipToken } from "@reduxjs/toolkit/query";
import { useGetDomainDetailsQuery, useGetDomainProfilesQuery, useGetDomainsQuery, useSyncDomainsMutation } from "@entities/domains/api";
import { type DomainProfileDto, type RegistrarType } from "@entities/domains/types";
import { usePagination } from "@shared/lib/use-pagination";
import { PaginationControls } from "@shared/ui/pagination-controls";
import { Button, PageTitle, useToast } from "@shared/ui";
import { DomainTable } from "./domain-table";
import { DomainDetailsModal } from "./domain-details-modal";

export function DomainsPage() {
  const { showToast } = useToast();
  const { page, pageSize, pageSizeOptions, setPage, setPageSize } = usePagination();
  const [selectedDomainId, setSelectedDomainId] = useState<number | null>(null);
  const [activeRegistrar, setActiveRegistrar] = useState<RegistrarType | null>(null);
  const [activeProfile, setActiveProfile] = useState<string | null>(null);

  const { data: profilesData, isFetching: isProfilesFetching } = useGetDomainProfilesQuery();
  const defaultSelection = useMemo(() => {
    if (!profilesData?.length) {
      return { registrar: null, profile: null };
    }
    const groups = buildRegistrarGroups(profilesData);
    if (groups.length === 0) {
      return { registrar: null, profile: null };
    }
    const firstGroup = groups[0];
    const firstProfile = firstGroup.profiles[0] ?? null;
    return { registrar: firstGroup.registrar, profile: firstProfile };
  }, [profilesData]);

  const resolvedRegistrar = activeRegistrar ?? defaultSelection.registrar;
  const resolvedProfile = activeProfile ?? defaultSelection.profile;

  const domainsQueryArgs = resolvedRegistrar && resolvedProfile
    ? { pageNumber: page, pageSize, profile: resolvedProfile, registrar: resolvedRegistrar }
    : skipToken;
  const { data: domainData, isLoading, isFetching, error: loadError, refetch } = useGetDomainsQuery(domainsQueryArgs);
  const [syncDomains, { isLoading: isSyncing }] = useSyncDomainsMutation();

  const totalPages = domainData?.totalPages ?? 0;
  const items = domainData?.content ?? [];
  const filteredItems = useMemo(() => {
    if (!resolvedRegistrar || !resolvedProfile) {
      return [];
    }
    return items.filter(
      (item) => item.registrar === resolvedRegistrar && item.profile === resolvedProfile,
    );
  }, [resolvedRegistrar, resolvedProfile, items]);

  const resolvedSelectedDomainId = useMemo(() => {
    if (!selectedDomainId) {
      return null;
    }
    const exists = filteredItems.some((item) => item.id === selectedDomainId);
    return exists ? selectedDomainId : null;
  }, [filteredItems, selectedDomainId]);

  const registrarGroups = useMemo(() => {
    const source: DomainProfileDto[] =
      profilesData?.length ? profilesData : items.map((item) => ({ registrar: item.registrar, profile: item.profile }));
    return buildRegistrarGroups(source);
  }, [profilesData, items]);
  const shouldShowProfilesEmptyState = !isProfilesFetching && (!profilesData || profilesData.length === 0);

  const {
    data: domainDetails,
    isFetching: isDetailsLoading,
    error: detailsError,
  } = useGetDomainDetailsQuery(resolvedSelectedDomainId ?? skipToken);

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

  useEffect(() => {
    setPage(0);
  }, [resolvedRegistrar, resolvedProfile, setPage]);

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
      <Body>
        <LeftColumn>
          {registrarGroups.map((group) => (
            <Sidebar key={`${group.registrar}-profiles`}>
              <SidebarTitle>{group.registrar}</SidebarTitle>
              {group.profiles.map((profile) => (
                <SidebarButton
                  key={`${group.registrar}-${profile}`}
                  type="button"
                  $active={resolvedRegistrar === group.registrar && resolvedProfile === profile}
                  onClick={() => {
                    setActiveRegistrar(group.registrar);
                    setActiveProfile(profile);
                  }}
                >
                  {profile}
                </SidebarButton>
              ))}
            </Sidebar>
          ))}
        </LeftColumn>

        <Main>
          {shouldShowProfilesEmptyState ? (
            <EmptyState>Профили доменов не найдены. Сначала синхронизируйте домены.</EmptyState>
          ) : (
            <>
              <DomainTable
                items={filteredItems}
                isLoading={isLoading}
                selectedDomainId={resolvedSelectedDomainId}
                onSelect={setSelectedDomainId}
              />
              <DomainDetailsModal
                isOpen={resolvedSelectedDomainId !== null}
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
            </>
          )}
        </Main>
      </Body>
    </Wrapper>
  );
}

type RegistrarGroup = {
  registrar: RegistrarType;
  profiles: string[];
};

const buildRegistrarGroups = (source: DomainProfileDto[]): RegistrarGroup[] => {
  const map = new Map<RegistrarType, Set<string>>();
  source.forEach((item) => {
    if (!map.has(item.registrar)) {
      map.set(item.registrar, new Set());
    }
    map.get(item.registrar)?.add(item.profile);
  });
  return Array.from(map.entries())
    .map(([registrar, profiles]) => ({
      registrar,
      profiles: Array.from(profiles).sort((a, b) => b.localeCompare(a)),
    }))
    .sort((a, b) => String(a.registrar).localeCompare(String(b.registrar)));
};

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

const Sidebar = styled.aside`
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 250px;
`;

const SidebarTitle = styled.h3`
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #111827;
`;

const SidebarButton = styled.button<{ $active?: boolean }>`
  padding: 8px 10px;
  text-align: left;
  border-radius: 8px;
  border: 1px solid ${({ $active }) => ($active ? "#2563eb" : "#e5e7eb")};
  background: ${({ $active }) => ($active ? "#eff6ff" : "#ffffff")};
  color: ${({ $active }) => ($active ? "#1d4ed8" : "#111827")};
  font-size: 13px;
  cursor: pointer;
`;

const Main = styled.div`
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
