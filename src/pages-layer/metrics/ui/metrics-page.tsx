"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import {
  useGetMetricsCountersQuery,
  useGetMetricsProfilesQuery,
  useSyncMetricsCountersMutation,
} from "@entities/metrics/api";
import {
  METRICS_PROVIDER_TYPES,
  getMetricsProviderTypeLabel,
  type MetricsProfileDto,
  MetricsProviderType,
} from "@entities/metrics/types";
import { useDebouncedSearchQuery } from "@shared/lib/use-debounced-search-query";
import { usePagination } from "@shared/lib/use-pagination";
import {
  DomainSearchField,
  EMPTY_DATA_MESSAGE,
  IntegrationPageLayout,
  useToast,
} from "@shared/ui";
import { PaginationControls } from "@shared/ui/pagination-controls";
import { MetricsAction, getMetricsActionSections, renderMetricsActionContent } from "../lib/actions";
import { CountersTable } from "./actions/counters-table";

export function MetricsPage() {
  const { showToast } = useToast();
  const { page, pageSize, pageSizeOptions, setPage, setPageSize } = usePagination();
  const [activeProvider, setActiveProvider] = useState<MetricsProviderType | null>(null);
  const [activeProfile, setActiveProfile] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<MetricsAction | null>(null);
  const { search, setSearch, query } = useDebouncedSearchQuery();

  const metricaProfilesQuery = useGetMetricsProfilesQuery();
  const profilesByProvider = useMemo(
    () =>
      new Map<MetricsProviderType, MetricsProfileDto[]>(
        METRICS_PROVIDER_TYPES.map((provider) => [
          provider,
          (metricaProfilesQuery.data ?? []).filter((profile) => profile.provider === provider),
        ]),
      ),
    [metricaProfilesQuery.data],
  );

  const providerGroups = useMemo(
    () =>
      METRICS_PROVIDER_TYPES.map((provider) => ({
        provider,
        label: getMetricsProviderTypeLabel(provider),
        profiles: (profilesByProvider.get(provider) ?? []).map((profile) => profile.profile),
      })),
    [profilesByProvider],
  );

  const allProfiles = useMemo(
    () => Array.from(profilesByProvider.values()).flat(),
    [profilesByProvider],
  );
  const profileGroups = useMemo(
    () =>
      providerGroups.map((group) => ({
        id: group.provider,
        label: group.label,
        profiles: group.profiles,
      })),
    [providerGroups],
  );
  const resolvedProvider = activeProvider;
  const resolvedProfile = activeProfile;
  const actionSections = useMemo(() => getMetricsActionSections(resolvedProvider), [resolvedProvider]);
  const availableActions = useMemo(
    () => new Set(actionSections.flatMap((section) => section.actions.map((action) => action.id))),
    [actionSections],
  );
  const activeAction = selectedAction && availableActions.has(selectedAction) ? selectedAction : null;

  const isProfilesFetching = metricaProfilesQuery.isFetching;
  const countersQueryArgs = resolvedProvider && resolvedProfile
    ? { provider: resolvedProvider, profile: resolvedProfile, pageNumber: page, pageSize, query }
    : skipToken;
  const { data, isFetching, isLoading, error: loadError, refetch } = useGetMetricsCountersQuery(countersQueryArgs);
  const [syncCounters, { isLoading: isSyncingCounters }] = useSyncMetricsCountersMutation();

  const counters = useMemo(() => data?.content ?? [], [data?.content]);
  const totalPages = data?.totalPages ?? 0;
  const shouldShowEmptyState = !isLoading && counters.length === 0;
  const shouldShowProfilesEmptyState = !isProfilesFetching && allProfiles.length === 0;

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
  }, [resolvedProvider, resolvedProfile, query, setPage]);

  const handleSyncCounters = async () => {
    if (!resolvedProvider || !resolvedProfile) {
      showToast({ variant: "error", message: "Сначала выберите профиль." });
      return;
    }
    try {
      await syncCounters({ provider: resolvedProvider, profile: resolvedProfile }).unwrap();
      refetch();
      showToast({ variant: "success", message: "Синхронизация завершена." });
    } catch {
      showToast({ variant: "error", message: "Ошибка синхронизации счетчиков." });
    }
  };

  const refreshCountersAfterBulk = useCallback(async () => {
    if (!resolvedProvider || !resolvedProfile) {
      return;
    }
    try {
      await syncCounters({ provider: resolvedProvider, profile: resolvedProfile }).unwrap();
      await refetch();
    } catch {
      showToast({ variant: "error", message: "Ошибка синхронизации счетчиков после массового создания." });
    }
  }, [refetch, resolvedProfile, resolvedProvider, showToast, syncCounters]);

  const tableContent = (
    <>
      <CountersTable
        items={counters}
        isLoading={isLoading}
        pageSize={pageSize}
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
  );
  const tableToolbarLeftSlot = (
    <DomainSearchField
      id="metrics-domain-search"
      value={search}
      onChange={setSearch}
    />
  );

  return (
    <IntegrationPageLayout
      title="Метрика"
      profileGroups={profileGroups}
      activeGroup={resolvedProvider}
      activeProfile={resolvedProfile}
      isProfilesFetching={isProfilesFetching}
      onSelectProfile={(provider, profile) => {
        setActiveProvider(provider);
        setActiveProfile(profile);
        if (provider === MetricsProviderType.GOOGLE_ANALYTICS) {
          setSelectedAction(MetricsAction.SYNC_METRICS_COUNTERS);
        }
      }}
      actionSections={actionSections}
      activeAction={activeAction}
      onSelectAction={(action) => {
        setSelectedAction(action as MetricsAction);
      }}
      tableActionId={MetricsAction.SYNC_METRICS_COUNTERS}
      onSync={handleSyncCounters}
      isSyncLoading={isSyncingCounters}
      syncDisabled={!resolvedProvider || !resolvedProfile}
      showProfilesEmptyState={shouldShowProfilesEmptyState}
      profilesEmptyMessage="Нет доступных профилей. Проверьте конфигурацию."
      showTableEmptyState={shouldShowEmptyState}
      tableEmptyMessage={EMPTY_DATA_MESSAGE}
      tableToolbarLeftSlot={tableToolbarLeftSlot}
      tableContent={tableContent}
      actionContent={renderMetricsActionContent(activeAction as MetricsAction, {
        provider: resolvedProvider,
        profile: resolvedProfile,
        onRefreshCounters: refreshCountersAfterBulk,
        onRefreshCountersList: async () => {
          await refetch();
        },
      })}
    />
  );
}
