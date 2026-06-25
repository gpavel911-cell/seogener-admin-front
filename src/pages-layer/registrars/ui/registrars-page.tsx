"use client";

import { useEffect, useMemo, useState } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import {
  useGetRegistrarProfilesQuery,
  useGetRegistrarDomainsQuery,
  useSyncRegistrarDomainsMutation,
} from "@entities/registrars/api";
import {
  type RegistrarDomainProfileDto,
  getRegistrarProviderTypeLabel,
  RegistrarProviderType,
  REGISTRAR_PROVIDER_TYPES,
} from "@entities/registrars/types";
import { useDebouncedSearchQuery } from "@shared/lib/use-debounced-search-query";
import { usePagination } from "@shared/lib/use-pagination";
import { PaginationControls } from "@shared/ui/pagination-controls";
import { DomainSearchField, EMPTY_DATA_MESSAGE, IntegrationPageLayout, useToast } from "@shared/ui";
import {
  REGISTRARS_ACTION_SECTIONS,
  RegistrarsAction,
  renderRegistrarsActionContent,
} from "../lib/actions";
import { DomainTable } from "./actions/domain-table";

export function RegistrarsPage() {
  const { showToast } = useToast();
  const { page, pageSize, pageSizeOptions, setPage, setPageSize } = usePagination();
  const [activeRegistrar, setActiveRegistrar] = useState<RegistrarProviderType | null>(null);
  const [activeProfile, setActiveProfile] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<RegistrarsAction | null>(null);
  const { search, setSearch, query } = useDebouncedSearchQuery();

  const registrarProfilesQuery = useGetRegistrarProfilesQuery();
  const profilesByProvider = useMemo(
    () =>
      new Map<RegistrarProviderType, RegistrarDomainProfileDto[]>(
        REGISTRAR_PROVIDER_TYPES.map((provider) => [
          provider,
          (registrarProfilesQuery.data ?? []).filter((profile) => profile.registrar === provider),
        ]),
      ),
    [registrarProfilesQuery.data],
  );

  const providerGroups = useMemo(
    () =>
      REGISTRAR_PROVIDER_TYPES.map((provider) => ({
        provider,
        label: getRegistrarProviderTypeLabel(provider),
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
  const actionSections = REGISTRARS_ACTION_SECTIONS;
  const availableActions = useMemo(
    () => new Set(actionSections.flatMap((section) => section.actions.map((action) => action.id))),
    [actionSections],
  );
  const activeAction = selectedAction && availableActions.has(selectedAction) ? selectedAction : null;

  const resolvedProvider = activeRegistrar;
  const resolvedProfile = activeProfile;
  const isProfilesFetching = registrarProfilesQuery.isFetching;
  const domainsQueryArgs = resolvedProvider && resolvedProfile
    ? { pageNumber: page, pageSize, profile: resolvedProfile, registrar: resolvedProvider, query }
    : skipToken;
  const { data: domainData, isLoading, isFetching, error: loadError, refetch } = useGetRegistrarDomainsQuery(domainsQueryArgs);
  const [syncDomains, { isLoading: isSyncing }] = useSyncRegistrarDomainsMutation();

  const domains = useMemo(() => domainData?.content ?? [], [domainData?.content]);
  const totalPages = domainData?.totalPages ?? 0;
  const shouldShowEmptyState = !isLoading && domains.length === 0;
  const shouldShowProfilesEmptyState = !isProfilesFetching && allProfiles.length === 0;

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

  useEffect(() => {
    setPage(0);
  }, [resolvedProvider, resolvedProfile, query, setPage]);

  const handleSync = async () => {
    if (!resolvedProvider || !resolvedProfile) {
      showToast({ variant: "error", message: "Сначала выберите профиль." });
      return;
    }
    try {
      await syncDomains({ registrar: resolvedProvider, profile: resolvedProfile }).unwrap();
      await refetch();
      showToast({ variant: "success", message: "Синхронизация завершена." });
    } catch {
      showToast({ variant: "error", message: "Ошибка синхронизации доменов." });
    }
  };

  const tableContent = (
    <>
      <DomainTable
        items={domains}
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
      id="registrars-domain-search"
      value={search}
      onChange={setSearch}
    />
  );

  return (
    <IntegrationPageLayout
      title="Регистраторы"
      profileGroups={profileGroups}
      activeGroup={resolvedProvider}
      activeProfile={resolvedProfile}
      isProfilesFetching={isProfilesFetching}
      onSelectProfile={(provider, profile) => {
        setActiveRegistrar(provider);
        setActiveProfile(profile);
      }}
      actionSections={actionSections}
      activeAction={activeAction}
      onSelectAction={(action) => {
        setSelectedAction(action as RegistrarsAction);
      }}
      tableActionId={RegistrarsAction.SYNC_REGISTRAR_DOMAINS}
      onSync={handleSync}
      isSyncLoading={isSyncing}
      syncDisabled={!resolvedProvider || !resolvedProfile}
      showProfilesEmptyState={shouldShowProfilesEmptyState}
      profilesEmptyMessage="Нет доступных профилей. Проверьте конфигурацию."
      showTableEmptyState={shouldShowEmptyState}
      tableEmptyMessage={EMPTY_DATA_MESSAGE}
      tableToolbarLeftSlot={tableToolbarLeftSlot}
      tableContent={tableContent}
      actionContent={renderRegistrarsActionContent(activeAction as RegistrarsAction, {
        profile: resolvedProfile,
        registrar: resolvedProvider,
      })}
    />
  );
}
