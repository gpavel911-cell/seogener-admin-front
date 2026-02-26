"use client";

import { useEffect, useMemo, useState } from "react";
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
import { usePagination } from "@shared/lib/use-pagination";
import {
  EMPTY_DATA_MESSAGE,
  IntegrationPageLayout,
  useToast,
} from "@shared/ui";
import { PaginationControls } from "@shared/ui/pagination-controls";
import { METRICS_ACTION_SECTIONS, MetricsAction, renderMetricsActionContent } from "../lib/actions";
import { CountersTable } from "./actions/counters-table";

export function MetricsPage() {
  const { showToast } = useToast();
  const { page, pageSize, pageSizeOptions, setPage, setPageSize } = usePagination();
  const [activeProvider, setActiveProvider] = useState<MetricsProviderType | null>(null);
  const [activeProfile, setActiveProfile] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<MetricsAction | null>(null);

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
  const actionSections = METRICS_ACTION_SECTIONS;
  const availableActions = useMemo(
    () => new Set(actionSections.flatMap((section) => section.actions.map((action) => action.id))),
    [actionSections],
  );
  const activeAction = selectedAction && availableActions.has(selectedAction) ? selectedAction : null;

  const resolvedProvider = activeProvider;
  const resolvedProfile = activeProfile;
  const isProfilesFetching = metricaProfilesQuery.isFetching;

  const countersQueryArgs = resolvedProvider && resolvedProfile
    ? { provider: resolvedProvider, profile: resolvedProfile, pageNumber: page, pageSize }
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
  }, [resolvedProvider, resolvedProfile, setPage]);

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
      tableContent={tableContent}
      actionContent={renderMetricsActionContent(activeAction as MetricsAction, {
        profile: resolvedProfile,
      })}
    />
  );
}
