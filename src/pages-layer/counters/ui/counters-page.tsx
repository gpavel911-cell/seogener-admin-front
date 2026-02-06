"use client";

import { useEffect, useMemo, useState } from "react";
import styled, { keyframes } from "styled-components";
import { FaSyncAlt } from "react-icons/fa";
import { skipToken } from "@reduxjs/toolkit/query";
import {
  useGetCounterDetailsQuery,
  useGetCountersQuery,
  useGetProfilesQuery,
  useSyncCountersMutation,
} from "@entities/analytics/api";
import { type AnalyticsProfileDto, AnalyticsProvider } from "@entities/analytics/types";
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
  const [activeProvider, setActiveProvider] = useState<AnalyticsProvider | null>(null);
  const [activeProfile, setActiveProfile] = useState<string | null>(null);
  const [selectedCounterId, setSelectedCounterId] = useState<number | null>(null);

  const metricaProfilesQuery = useGetProfilesQuery(AnalyticsProvider.YANDEX_METRICA);
  const profilesByProvider = useMemo(
    () =>
      new Map<AnalyticsProvider, AnalyticsProfileDto[]>([
        [AnalyticsProvider.YANDEX_METRICA, metricaProfilesQuery.data ?? []],
      ]),
    [metricaProfilesQuery.data],
  );

  const providerGroups = useMemo(
    () =>
      PROVIDERS.map((provider) => ({
        provider: provider.id,
        label: provider.label,
        profiles: (profilesByProvider.get(provider.id) ?? []).map((profile) => profile.profile),
      })),
    [profilesByProvider],
  );

  const allProfiles = useMemo(
    () => Array.from(profilesByProvider.values()).flat(),
    [profilesByProvider],
  );

  const defaultSelection = useMemo(() => {
    if (allProfiles.length === 0) {
      return { provider: null, profile: null };
    }
    if (providerGroups.length === 0) {
      return { provider: null, profile: null };
    }
    const firstGroup = providerGroups[0];
    const firstProfile = firstGroup.profiles[0] ?? null;
    return { provider: firstGroup.provider, profile: firstProfile };
  }, [allProfiles, providerGroups]);

  const resolvedProvider = activeProvider ?? defaultSelection.provider;
  const resolvedProfile = activeProfile ?? defaultSelection.profile;
  const isProfilesFetching = metricaProfilesQuery.isFetching;

  const countersQueryArgs = resolvedProvider && resolvedProfile
    ? { provider: resolvedProvider, profile: resolvedProfile, pageNumber: page, pageSize }
    : skipToken;
  const { data, isFetching, isLoading, error: loadError, refetch } = useGetCountersQuery(countersQueryArgs);
  const [syncCounters, { isLoading: isSyncingCounters }] = useSyncCountersMutation();
  const [syncingProvider, setSyncingProvider] = useState<AnalyticsProvider | null>(null);

  const counters = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;
  const shouldShowEmptyState = !isLoading && counters.length === 0;
  const shouldShowProfilesEmptyState = !isProfilesFetching && allProfiles.length === 0;

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
    setSelectedCounterId(null);
  }, [resolvedProvider, resolvedProfile, setPage]);

  const handleSyncCounters = async (provider: AnalyticsProvider) => {
    if (resolvedProvider !== provider || !resolvedProfile) {
      showToast({ variant: "error", message: "Сначала выберите профиль." });
      return;
    }
    setSyncingProvider(provider);
    try {
      await syncCounters({ provider, profile: resolvedProfile }).unwrap();
      refetch();
      showToast({ variant: "success", message: "Синхронизация завершена." });
    } catch (error) {
      showToast({ variant: "error", message: "Ошибка синхронизации счетчиков." });
    } finally {
      setSyncingProvider(null);
    }
  };

  return (
    <Wrapper>
      <Header>
        <PageTitle>Счетчики</PageTitle>
      </Header>
      <Body>
        <LeftColumn>
          {providerGroups.map((group) => (
            <Sidebar key={`${group.provider}-profiles`}>
              <SidebarHeader>
                <SidebarTitle>{group.label}</SidebarTitle>
                <SidebarSyncButton
                  type="button"
                  onClick={() => handleSyncCounters(group.provider)}
                  disabled={isSyncingCounters || resolvedProvider !== group.provider || !resolvedProfile}
                  aria-label="Синхронизировать"
                  title="Синхронизировать"
                  data-loading={isSyncingCounters && syncingProvider === group.provider}
                >
                  <FaSyncAlt aria-hidden="true" />
                </SidebarSyncButton>
              </SidebarHeader>
              {group.profiles.length > 0 ? (
                group.profiles.map((profile) => (
                  <SidebarButton
                    key={`${group.provider}-${profile}`}
                    type="button"
                    $active={resolvedProvider === group.provider && resolvedProfile === profile}
                    onClick={() => {
                      setActiveProvider(group.provider);
                      setActiveProfile(profile);
                    }}
                    disabled={isProfilesFetching}
                  >
                    {profile}
                  </SidebarButton>
                ))
              ) : (
                <SidebarEmpty>Профили не найдены</SidebarEmpty>
              )}
            </Sidebar>
          ))}
        </LeftColumn>
        <Main>
          <TableSection>
            {shouldShowProfilesEmptyState ? (
              <EmptyState>Нет доступных профилей. Проверьте конфигурацию.</EmptyState>
            ) : shouldShowEmptyState ? (
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

const SidebarHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;

const SidebarTitle = styled.h3`
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #111827;
`;

const spin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const SidebarSyncButton = styled(Button)`
  padding: 4px;
  min-width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 0;

  svg {
    width: 14px;
    height: 14px;
  }

  &[data-loading="true"] svg {
    animation: ${spin} 0.9s linear infinite;
  }
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

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
`;

const SidebarEmpty = styled.div`
  padding: 8px 12px;
  font-size: 13px;
  color: #6b7280;
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
