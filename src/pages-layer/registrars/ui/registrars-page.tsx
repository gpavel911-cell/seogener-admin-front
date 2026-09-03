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
import { Button, DomainSearchField, EMPTY_DATA_MESSAGE, IntegrationPageLayout, useToast } from "@shared/ui";
import { ModalDialog } from "@shared/ui-kit/modal-dialog";
import { REGISTRARS_WIDE_OVERLAY_WIDTH, EMPTY_NESTED_DIALOGS, getRegistrarsOverlayTitle, hasOpenNestedDialog, isWideRegistrarsOverlay, type NestedDialogState, type RegistrarsOverlay } from "../lib/overlay";
import { BulkDnsOverlay } from "./actions/bulk-dns-overlay";
import { CreateDnsRecord } from "./actions/create-dns-record";
import { DomainMatrixPage } from "./actions/domain-matrix-page";
import { DomainTable } from "./actions/domain-table";
import { ViewDnsRecords } from "./actions/view-dns-records";

export function RegistrarsPage() {
  const { showToast } = useToast();
  const { page, pageSize, pageSizeOptions, setPage, setPageSize } = usePagination();
  const [activeRegistrar, setActiveRegistrar] = useState<RegistrarProviderType | null>(null);
  const [activeProfile, setActiveProfile] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<RegistrarsOverlay | null>(null);
  const [nestedDialogs, setNestedDialogs] = useState<NestedDialogState>(EMPTY_NESTED_DIALOGS);
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

  const isNestedDialogOpen = hasOpenNestedDialog(nestedDialogs);

  const closeOverlay = () => {
    setOverlay(null);
    setNestedDialogs(EMPTY_NESTED_DIALOGS);
  };

  const openOverlay = (next: RegistrarsOverlay) => {
    setNestedDialogs(EMPTY_NESTED_DIALOGS);
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

  const handleSelectProfile = (provider: RegistrarProviderType, profile: string) => {
    setActiveRegistrar(provider);
    setActiveProfile(profile);
    closeOverlay();
  };

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
        onViewDns={(domain) => openOverlay({ type: "view-dns", domain })}
        onCreateDns={(domain) => openOverlay({ type: "create-dns", domain })}
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
  const tableToolbarRightSlot = (
    <>
      <Button type="button" onClick={() => openOverlay({ type: "bulk-dns" })}>
        Создать DNS записи
      </Button>
      <Button type="button" onClick={() => openOverlay({ type: "generate" })}>
        Генерация доменов
      </Button>
    </>
  );

  const overlayTitle = overlay ? getRegistrarsOverlayTitle(overlay) : "Регистраторы";
  const isWideOverlay = overlay ? isWideRegistrarsOverlay(overlay) : false;

  return (
    <>
      <IntegrationPageLayout
        title="Регистраторы"
        tableOnly
        profileGroups={profileGroups}
        activeGroup={resolvedProvider}
        activeProfile={resolvedProfile}
        isProfilesFetching={isProfilesFetching}
        onSelectProfile={handleSelectProfile}
        onSync={handleSync}
        isSyncLoading={isSyncing}
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
        contentWidth={isWideOverlay ? REGISTRARS_WIDE_OVERLAY_WIDTH : undefined}
      >
        {overlay?.type === "view-dns" && resolvedProvider && resolvedProfile ? (
          <ViewDnsRecords
            key={overlay.domain}
            registrar={resolvedProvider}
            profile={resolvedProfile}
            domain={overlay.domain}
          />
        ) : null}
        {overlay?.type === "create-dns" && resolvedProvider && resolvedProfile ? (
          <CreateDnsRecord
            key={overlay.domain}
            registrar={resolvedProvider}
            profile={resolvedProfile}
            domain={overlay.domain}
          />
        ) : null}
        {overlay?.type === "bulk-dns" && resolvedProvider && resolvedProfile ? (
          <BulkDnsOverlay
            registrar={resolvedProvider}
            profile={resolvedProfile}
            onNestedDialogOpenChange={(recordType, open) => {
              setNestedDialogs((current) => ({ ...current, [recordType]: open }));
            }}
          />
        ) : null}
        {overlay?.type === "generate" && resolvedProfile ? (
          <DomainMatrixPage
            fixedProfileId={resolvedProfile}
            hideTitle
            onNestedDialogOpenChange={(open) => {
              setNestedDialogs((current) => ({ ...current, generate: open }));
            }}
          />
        ) : null}
      </ModalDialog>
    </>
  );
}
