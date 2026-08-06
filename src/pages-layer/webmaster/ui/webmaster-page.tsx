"use client";

import { useEffect, useMemo, useState } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import {
  useGetWebmasterHostsQuery,
  useGetWebmasterProfilesQuery,
  useSyncWebmasterHostsMutation,
} from "@entities/webmaster/api";
import {
  getWebmasterProviderTypeLabel,
  type WebmasterProfileDto,
  WebmasterProviderType,
  WEBMASTER_PROVIDER_TYPES,
} from "@entities/webmaster/types";
import { useDebouncedSearchQuery } from "@shared/lib/use-debounced-search-query";
import { usePagination } from "@shared/lib/use-pagination";
import { DomainSearchField, EMPTY_DATA_MESSAGE, IntegrationPageLayout, useToast } from "@shared/ui";
import { PaginationControls } from "@shared/ui/pagination-controls";
import {
  getWebmasterActionSections,
  WebmasterAction,
  renderWebmasterActionContent,
} from "../lib/actions";
import { WebmasterHostsTable } from "./actions/webmaster-hosts-table";

export function WebmasterPage() {
  const { showToast } = useToast();
  const { page, pageSize, pageSizeOptions, setPage, setPageSize } = usePagination();
  const [activeProvider, setActiveProvider] = useState<WebmasterProviderType | null>(null);
  const [activeProfile, setActiveProfile] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<WebmasterAction | null>(null);
  const { search, setSearch, query } = useDebouncedSearchQuery();

  const webmasterProfilesQuery = useGetWebmasterProfilesQuery();
  const profilesByProvider = useMemo(
    () =>
      new Map<WebmasterProviderType, WebmasterProfileDto[]>(
        WEBMASTER_PROVIDER_TYPES.map((provider) => [
          provider,
          (webmasterProfilesQuery.data ?? []).filter((profile) => profile.provider === provider),
        ]),
      ),
    [webmasterProfilesQuery.data],
  );

  const providerGroups = useMemo(
    () =>
      WEBMASTER_PROVIDER_TYPES.map((provider) => ({
        provider,
        label: getWebmasterProviderTypeLabel(provider),
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
  const actionSections = useMemo(
    () => getWebmasterActionSections(activeProvider),
    [activeProvider],
  );
  const availableActions = useMemo(
    () => new Set(actionSections.flatMap((section) => section.actions.map((action) => action.id))),
    [actionSections],
  );
  const activeAction = selectedAction && availableActions.has(selectedAction) ? selectedAction : null;

  const resolvedProvider = activeProvider;
  const resolvedProfile = activeProfile;
  const isProfilesFetching = webmasterProfilesQuery.isFetching;
  const hostsQueryArgs = resolvedProvider && resolvedProfile
    ? { provider: resolvedProvider, profile: resolvedProfile, pageNumber: page, pageSize, query }
    : skipToken;
  const { data, isFetching, isLoading, error: loadError, refetch } = useGetWebmasterHostsQuery(hostsQueryArgs);
  const [syncHosts, { isLoading: isSyncingHosts }] = useSyncWebmasterHostsMutation();

  const hosts = useMemo(() => data?.content ?? [], [data?.content]);
  const totalPages = data?.totalPages ?? 0;
  const shouldShowEmptyState = !isLoading && hosts.length === 0;
  const shouldShowProfilesEmptyState = !isProfilesFetching && allProfiles.length === 0;

  const loadErrorMessage = useMemo(() => {
    if (!loadError) return null;
    if (typeof loadError === "object" && "status" in loadError) {
      return `Ошибка загрузки сайтов (status ${(loadError as { status: number }).status}).`;
    }
    return "Ошибка загрузки сайтов.";
  }, [loadError]);

  useEffect(() => {
    if (!loadErrorMessage) return;
    showToast({ variant: "error", message: loadErrorMessage });
  }, [loadErrorMessage, showToast]);

  useEffect(() => {
    setPage(0);
  }, [resolvedProvider, resolvedProfile, query, setPage]);

  const handleSyncHosts = async () => {
    if (!resolvedProvider || !resolvedProfile) {
      showToast({ variant: "error", message: "Сначала выберите профиль." });
      return;
    }
    try {
      await syncHosts({ provider: resolvedProvider, profile: resolvedProfile }).unwrap();
      refetch();
      showToast({ variant: "success", message: "Синхронизация завершена." });
    } catch {
      showToast({ variant: "error", message: "Ошибка синхронизации сайтов." });
    }
  };

  const tableContent = (
    <>
      <WebmasterHostsTable
        items={hosts}
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
      id="webmaster-domain-search"
      value={search}
      onChange={setSearch}
    />
  );

  return (
    <IntegrationPageLayout
      title="Вебмастер"
      profileGroups={profileGroups}
      activeGroup={resolvedProvider}
      activeProfile={resolvedProfile}
      isProfilesFetching={isProfilesFetching}
      onSelectProfile={(provider, profile) => {
        setActiveProvider(provider);
        setActiveProfile(profile);
        if (provider === WebmasterProviderType.GOOGLE_SEARCH_CONSOLE) {
          setSelectedAction(WebmasterAction.SYNC_WEBMASTER_HOSTS);
        }
      }}
      actionSections={actionSections}
      activeAction={activeAction}
      onSelectAction={(action) => {
        setSelectedAction(action as WebmasterAction);
      }}
      tableActionId={WebmasterAction.SYNC_WEBMASTER_HOSTS}
      onSync={handleSyncHosts}
      isSyncLoading={isSyncingHosts}
      syncDisabled={!resolvedProvider || !resolvedProfile}
      showProfilesEmptyState={shouldShowProfilesEmptyState}
      profilesEmptyMessage="Нет доступных профилей. Проверьте конфигурацию."
      showTableEmptyState={shouldShowEmptyState}
      tableEmptyMessage={EMPTY_DATA_MESSAGE}
      tableToolbarLeftSlot={tableToolbarLeftSlot}
      tableContent={tableContent}
      actionContent={renderWebmasterActionContent(activeAction as WebmasterAction, {
        provider: resolvedProvider,
        profile: resolvedProfile,
      })}
    />
  );
}
