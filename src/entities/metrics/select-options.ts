import { useMemo } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import { useGetMetricsCounterOptionsQuery, useGetMetricsProfilesQuery } from "./api";
import {
  getMetricsProviderTypeLabel,
  METRICS_PROVIDER_TYPES,
  type MetricsCounterOptionDto,
  type MetricsProfileDto,
  type MetricsProviderType,
} from "./types";
import type { SelectOption } from "@shared/ui-kit/select";

type UseMetricsSelectOptionsParams = {
  activeProvider?: MetricsProviderType | null;
  fixedProvider?: MetricsProviderType | null;
  activeProfile: string | null;
  fixedProfile?: string | null;
  activeCounterId?: string | null;
  fixedCounterId?: string | null;
  includeCounters?: boolean;
  counterFilter?: (counter: MetricsCounterOptionDto) => boolean;
};

type UseMetricsSelectOptionsResult = {
  profilesData: MetricsProfileDto[] | undefined;
  countersData: MetricsCounterOptionDto[] | undefined;
  resolvedProvider: MetricsProviderType | null;
  resolvedProfile: string | null;
  resolvedCounterId: string;
  providerOptions: SelectOption[];
  profileOptions: SelectOption[];
  counterOptions: SelectOption[];
  isProfilesFetching: boolean;
  isCountersFetching: boolean;
  refetchCounters: () => Promise<unknown>;
};

export const useMetricsSelectOptions = ({
  activeProvider = null,
  fixedProvider = null,
  activeProfile,
  fixedProfile = null,
  activeCounterId = null,
  fixedCounterId = null,
  includeCounters = true,
  counterFilter,
}: UseMetricsSelectOptionsParams): UseMetricsSelectOptionsResult => {
  const { data: profilesData, isFetching: isProfilesFetching } = useGetMetricsProfilesQuery();

  const providerOptions = useMemo<SelectOption[]>(
    () =>
      METRICS_PROVIDER_TYPES.map((provider) => ({
        value: provider,
        label: getMetricsProviderTypeLabel(provider),
      })),
    [],
  );

  const resolvedProvider = fixedProvider ?? activeProvider ?? METRICS_PROVIDER_TYPES[0] ?? null;

  const providerProfiles = useMemo(
    () => (profilesData ?? []).filter((profile) => !resolvedProvider || profile.provider === resolvedProvider),
    [profilesData, resolvedProvider],
  );

  const profileOptions = useMemo<SelectOption[]>(
    () => providerProfiles.map((profile) => ({ value: profile.profile, label: profile.profile })),
    [providerProfiles],
  );

  const resolvedProfile = fixedProfile ?? activeProfile ?? providerProfiles[0]?.profile ?? null;

  const countersQueryArgs = includeCounters && resolvedProvider && resolvedProfile
    ? { provider: resolvedProvider, profile: resolvedProfile }
    : skipToken;
  const { data: countersData, isFetching: isCountersFetching, refetch: refetchCounters } = useGetMetricsCounterOptionsQuery(countersQueryArgs);

  const filteredCounters = useMemo(
    () => (countersData ?? []).filter((counter) => (counterFilter ? counterFilter(counter) : true)),
    [counterFilter, countersData],
  );

  const counterOptions = useMemo<SelectOption[]>(
    () =>
      filteredCounters.map((counter) => ({
        value: counter.value,
        label: counter.label,
      })),
    [filteredCounters],
  );

  const resolvedCounterId = fixedCounterId ?? activeCounterId ?? "";
  const hasResolvedCounter = counterOptions.some((option) => option.value === resolvedCounterId);

  return {
    profilesData,
    countersData,
    resolvedProvider,
    resolvedProfile,
    resolvedCounterId: hasResolvedCounter ? resolvedCounterId : "",
    providerOptions,
    profileOptions,
    counterOptions,
    isProfilesFetching,
    isCountersFetching,
    refetchCounters,
  };
};
