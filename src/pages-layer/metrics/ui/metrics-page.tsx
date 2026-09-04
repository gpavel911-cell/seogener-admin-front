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
  Button,
  DomainSearchField,
  EMPTY_DATA_MESSAGE,
  IntegrationPageLayout,
  useToast,
} from "@shared/ui";
import { PaginationControls } from "@shared/ui/pagination-controls";
import { ModalDialog } from "@shared/ui-kit/modal-dialog";
import {
  getMetricsOverlayTitle,
  isWideMetricsOverlay,
  METRICS_WIDE_OVERLAY_WIDTH,
  type MetricsOverlay,
} from "../lib/overlay";
import { CountersTable } from "./actions/counters-table";
import { CreateCounter } from "./actions/create-counter";
import { CreateCountersBulk } from "./actions/create-counters-bulk";
import { ViewCounterGoals } from "./actions/view-counter-goals";
import { ViewCounterStatistics } from "./actions/view-counter-statistics";

export function MetricsPage() {
  const { showToast } = useToast();
  const { page, pageSize, pageSizeOptions, setPage, setPageSize } = usePagination();
  const [activeProvider, setActiveProvider] = useState<MetricsProviderType | null>(null);
  const [activeProfile, setActiveProfile] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<MetricsOverlay | null>(null);
  const [isNestedDialogOpen, setIsNestedDialogOpen] = useState(false);
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

  const allProfiles = useMemo(
    () => Array.from(profilesByProvider.values()).flat(),
    [profilesByProvider],
  );
  const profileGroups = useMemo(
    () =>
      METRICS_PROVIDER_TYPES.map((provider) => ({
        id: provider,
        label: getMetricsProviderTypeLabel(provider),
        profiles: (profilesByProvider.get(provider) ?? []).map((profile) => profile.profile),
      })),
    [profilesByProvider],
  );
  const resolvedProvider = activeProvider;
  const resolvedProfile = activeProfile;
  const canOpenOverlays = Boolean(resolvedProvider && resolvedProfile);
  const showYandexRowActions = resolvedProvider === MetricsProviderType.YANDEX_METRICA && canOpenOverlays;

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

  const closeOverlay = () => {
    setOverlay(null);
    setIsNestedDialogOpen(false);
  };

  const openOverlay = (next: MetricsOverlay) => {
    if (!canOpenOverlays) {
      return;
    }
    setIsNestedDialogOpen(false);
    setOverlay(next);
  };

  const handleOverlayOpenChange = (open: boolean) => {
    if (!open && isNestedDialogOpen) {
      return;
    }
    if (!open) {
      closeOverlay();
    }
  };

  const handleSelectProfile = (provider: MetricsProviderType, profile: string) => {
    setActiveProvider(provider);
    setActiveProfile(profile);
    closeOverlay();
  };

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
        showRowActions={showYandexRowActions}
        onViewStatistics={(counterId) => openOverlay({ type: "statistics", counterId })}
        onViewGoals={(counterId) => openOverlay({ type: "goals", counterId })}
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
  const tableToolbarRightSlot = (
    <>
      <Button
        type="button"
        disabled={!canOpenOverlays}
        onClick={() => openOverlay({ type: "create-counter" })}
      >
        Создать счетчик
      </Button>
      <Button
        type="button"
        disabled={!canOpenOverlays}
        onClick={() => openOverlay({ type: "create-counters-bulk" })}
      >
        Создать счетчики
      </Button>
    </>
  );

  const overlayTitle = overlay ? getMetricsOverlayTitle(overlay) : "Метрика";
  const isWideOverlay = overlay ? isWideMetricsOverlay(overlay) : false;

  return (
    <>
      <IntegrationPageLayout
        title="Метрика"
        tableOnly
        profileGroups={profileGroups}
        activeGroup={resolvedProvider}
        activeProfile={resolvedProfile}
        isProfilesFetching={isProfilesFetching}
        onSelectProfile={handleSelectProfile}
        onSync={handleSyncCounters}
        isSyncLoading={isSyncingCounters}
        syncDisabled={!resolvedProvider || !resolvedProfile}
        showProfilesEmptyState={shouldShowProfilesEmptyState}
        profilesEmptyMessage="Нет доступных профилей. Проверьте конфигурацию."
        showTableEmptyState={shouldShowEmptyState}
        tableEmptyMessage={EMPTY_DATA_MESSAGE}
        tableToolbarLeftSlot={tableToolbarLeftSlot}
        tableToolbarRightSlot={tableToolbarRightSlot}
        tableContent={tableContent}
      />
      <ModalDialog
        open={overlay !== null}
        onOpenChange={handleOverlayOpenChange}
        title={overlayTitle}
        contentWidth={isWideOverlay ? METRICS_WIDE_OVERLAY_WIDTH : undefined}
      >
        {overlay?.type === "create-counter" && resolvedProvider && resolvedProfile ? (
          <CreateCounter
            fixedProfile={resolvedProfile}
            provider={resolvedProvider}
            onRefreshCounters={async () => {
              await refetch();
            }}
          />
        ) : null}
        {overlay?.type === "create-counters-bulk" && resolvedProvider && resolvedProfile ? (
          <CreateCountersBulk
            fixedProfile={resolvedProfile}
            provider={resolvedProvider}
            onRefreshCounters={refreshCountersAfterBulk}
            onNestedDialogOpenChange={setIsNestedDialogOpen}
          />
        ) : null}
        {overlay?.type === "statistics" && resolvedProvider && resolvedProfile ? (
          <ViewCounterStatistics
            key={overlay.counterId}
            provider={resolvedProvider}
            profile={resolvedProfile}
            counterId={overlay.counterId}
          />
        ) : null}
        {overlay?.type === "goals" && resolvedProvider && resolvedProfile ? (
          <ViewCounterGoals
            key={overlay.counterId}
            provider={resolvedProvider}
            profile={resolvedProfile}
            counterId={overlay.counterId}
          />
        ) : null}
      </ModalDialog>
    </>
  );
}
