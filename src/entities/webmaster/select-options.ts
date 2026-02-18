import { useMemo } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import { useGetWebmasterHostOptionsQuery, useGetWebmasterProfilesQuery } from "./api";
import {
  getWebmasterProviderTypeLabel,
  type WebmasterHostOptionDto,
  type WebmasterProfileDto,
  type WebmasterProviderType,
  WEBMASTER_PROVIDER_TYPES,
} from "./types";
import type { SelectOption } from "@shared/ui-kit/select";

type UseWebmasterSelectOptionsParams = {
  activeProvider?: WebmasterProviderType | null;
  fixedProvider?: WebmasterProviderType | null;
  activeProfile: string | null;
  fixedProfile?: string | null;
  activeHostId?: string | null;
  fixedHostId?: string | null;
  includeHosts?: boolean;
  hostFilter?: (host: WebmasterHostOptionDto) => boolean;
};

type UseWebmasterSelectOptionsResult = {
  profilesData: WebmasterProfileDto[] | undefined;
  hostsData: WebmasterHostOptionDto[] | undefined;
  resolvedProvider: WebmasterProviderType | null;
  resolvedProfile: string | null;
  resolvedHostId: string;
  providerOptions: SelectOption[];
  profileOptions: SelectOption[];
  hostOptions: SelectOption[];
  isProfilesFetching: boolean;
  isHostsFetching: boolean;
};

export const useWebmasterSelectOptions = ({
  activeProvider = null,
  fixedProvider = null,
  activeProfile,
  fixedProfile = null,
  activeHostId = null,
  fixedHostId = null,
  includeHosts = true,
  hostFilter,
}: UseWebmasterSelectOptionsParams): UseWebmasterSelectOptionsResult => {
  const { data: profilesData, isFetching: isProfilesFetching } = useGetWebmasterProfilesQuery();

  const providerOptions = useMemo<SelectOption[]>(
    () =>
      WEBMASTER_PROVIDER_TYPES.map((provider) => ({
        value: provider,
        label: getWebmasterProviderTypeLabel(provider),
      })),
    [],
  );

  const resolvedProvider = fixedProvider ?? activeProvider ?? WEBMASTER_PROVIDER_TYPES[0] ?? null;
  const providerProfiles = useMemo(
    () => (profilesData ?? []).filter((profile) => !resolvedProvider || profile.provider === resolvedProvider),
    [profilesData, resolvedProvider],
  );

  const profileOptions = useMemo<SelectOption[]>(
    () => providerProfiles.map((profile) => ({ value: profile.profile, label: profile.profile })),
    [providerProfiles],
  );

  const resolvedProfile = fixedProfile ?? activeProfile ?? providerProfiles[0]?.profile ?? null;

  const hostsQueryArgs = includeHosts && resolvedProvider && resolvedProfile
    ? { provider: resolvedProvider, profile: resolvedProfile }
    : skipToken;
  const { data: hostsData, isFetching: isHostsFetching } = useGetWebmasterHostOptionsQuery(hostsQueryArgs);

  const filteredHosts = useMemo(
    () => (hostsData ?? []).filter((host) => (hostFilter ? hostFilter(host) : true)),
    [hostFilter, hostsData],
  );

  const hostOptions = useMemo<SelectOption[]>(
    () =>
      filteredHosts.map((host) => ({
        value: host.value,
        label: host.label,
      })),
    [filteredHosts],
  );

  const resolvedHostCandidate = fixedHostId ?? activeHostId ?? "";
  const resolvedHostId = hostOptions.some((option) => option.value === resolvedHostCandidate)
    ? resolvedHostCandidate
    : (hostOptions[0]?.value ?? "");

  return {
    profilesData,
    hostsData,
    resolvedProvider,
    resolvedProfile,
    resolvedHostId,
    providerOptions,
    profileOptions,
    hostOptions,
    isProfilesFetching,
    isHostsFetching,
  };
};
