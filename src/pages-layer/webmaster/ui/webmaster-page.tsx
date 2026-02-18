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
import { usePagination } from "@shared/lib/use-pagination";
import { EMPTY_DATA_MESSAGE, IntegrationPageLayout, useToast } from "@shared/ui";
import { PaginationControls } from "@shared/ui/pagination-controls";
import {
  WEBMASTER_ACTION_SECTIONS,
  WebmasterAction,
  renderWebmasterActionContent,
} from "../lib/actions";
import { WebmasterHostDetailsModal } from "./actions/webmaster-host-details-modal";
import { WebmasterHostsTable } from "./actions/webmaster-hosts-table";

export function WebmasterPage() {
  const { showToast } = useToast();
  const { page, pageSize, pageSizeOptions, setPage, setPageSize } = usePagination();
  const [activeProvider, setActiveProvider] = useState<WebmasterProviderType | null>(null);
  const [activeProfile, setActiveProfile] = useState<string | null>(null);
  const [selectedHostId, setSelectedHostId] = useState<number | null>(null);
  const [selectedAction, setSelectedAction] = useState<WebmasterAction | null>(null);

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
  const actionSections = WEBMASTER_ACTION_SECTIONS;
  const availableActions = useMemo(
    () => new Set(actionSections.flatMap((section) => section.actions.map((action) => action.id))),
    [actionSections],
  );
  const activeAction = selectedAction && availableActions.has(selectedAction) ? selectedAction : null;

  const resolvedProvider = activeProvider;
  const resolvedProfile = activeProfile;
  const isProfilesFetching = webmasterProfilesQuery.isFetching;

  const hostsQueryArgs = resolvedProvider && resolvedProfile
    ? { provider: resolvedProvider, profile: resolvedProfile, pageNumber: page, pageSize }
    : skipToken;
  const { data, isFetching, isLoading, error: loadError, refetch } = useGetWebmasterHostsQuery(hostsQueryArgs);
  const [syncHosts, { isLoading: isSyncingHosts }] = useSyncWebmasterHostsMutation();

  const hosts = useMemo(() => data?.content ?? [], [data?.content]);
  const totalPages = data?.totalPages ?? 0;
  const shouldShowEmptyState = !isLoading && hosts.length === 0;
  const shouldShowProfilesEmptyState = !isProfilesFetching && allProfiles.length === 0;

  const resolvedSelectedHostId = useMemo(() => {
    if (!selectedHostId) {
      return null;
    }
    const exists = hosts.some((item) => item.id === selectedHostId);
    return exists ? selectedHostId : null;
  }, [hosts, selectedHostId]);

  const selectedHostDetails = useMemo(() => {
    if (!resolvedSelectedHostId) {
      return undefined;
    }
    const selected = hosts.find((item) => item.id === resolvedSelectedHostId);
    if (!selected) {
      return undefined;
    }
    return {
      ...selected,
      createdAt: selected.createdAt ?? selected.updatedAt,
      additionalInfoJson: selected.additionalInfoJson ?? null,
    };
  }, [hosts, resolvedSelectedHostId]);

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
  }, [resolvedProvider, resolvedProfile, setPage]);

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
        selectedHostId={resolvedSelectedHostId}
        onSelect={setSelectedHostId}
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
      title="Вебмастер"
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
      tableContent={tableContent}
      tableDetailsContent={(
        <WebmasterHostDetailsModal
          isOpen={resolvedSelectedHostId !== null}
          isLoading={false}
          details={selectedHostDetails}
          onClose={() => setSelectedHostId(null)}
        />
      )}
      actionContent={renderWebmasterActionContent(activeAction as WebmasterAction, {
        profile: resolvedProfile,
      })}
    />
  );
}
