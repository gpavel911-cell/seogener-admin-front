import { useMemo } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import { useGetRegistrarDomainOptionsQuery, useGetRegistrarProfilesQuery } from "./api";
import { getRegistrarProviderTypeLabel, type RegistrarDomainProfileDto, type RegistrarProviderType } from "./types";
import type { SelectOption } from "@shared/ui-kit/select";
import { buildRegistrarGroups, type RegistrarGroup } from "@shared/lib/registrars";

type UseRegistrarSelectOptionsParams = {
  activeRegistrar: RegistrarProviderType | null;
  activeProfile: string | null;
  fixedRegistrar?: RegistrarProviderType | null;
  fixedProfile?: string | null;
  preferredRegistrar?: RegistrarProviderType | null;
  includeDomains?: boolean;
};

type UseRegistrarSelectOptionsResult = {
  profilesData: RegistrarDomainProfileDto[] | undefined;
  registrarGroups: RegistrarGroup[];
  resolvedRegistrar: RegistrarProviderType | null;
  resolvedProfile: string | null;
  profilesForRegistrar: string[];
  registrarOptions: SelectOption[];
  profileOptions: SelectOption[];
  domainOptions: SelectOption[];
  isProfilesFetching: boolean;
  isDomainsFetching: boolean;
};

export const useRegistrarSelectOptions = ({
  activeRegistrar,
  activeProfile,
  fixedRegistrar = null,
  fixedProfile = null,
  preferredRegistrar = null,
  includeDomains = true,
}: UseRegistrarSelectOptionsParams): UseRegistrarSelectOptionsResult => {
  const { data: profilesData, isFetching: isProfilesFetching } = useGetRegistrarProfilesQuery();

  const registrarGroups = useMemo(
    () => buildRegistrarGroups(profilesData ?? []),
    [profilesData],
  );

  const fallbackSelection = useMemo(() => {
    if (!registrarGroups.length) {
      return { registrar: null, profile: null };
    }
    const preferredGroup = preferredRegistrar
      ? registrarGroups.find((group) => group.registrar === preferredRegistrar)
      : null;
    const firstGroup = preferredGroup ?? registrarGroups[0];
    return {
      registrar: firstGroup.registrar,
      profile: firstGroup.profiles[0] ?? null,
    };
  }, [preferredRegistrar, registrarGroups]);

  const resolvedRegistrar = fixedRegistrar ?? activeRegistrar ?? fallbackSelection.registrar;

  const profilesForRegistrar = useMemo(() => {
    if (!resolvedRegistrar) {
      return [];
    }
    return registrarGroups.find((group) => group.registrar === resolvedRegistrar)?.profiles ?? [];
  }, [registrarGroups, resolvedRegistrar]);

  const resolvedProfile = fixedProfile ?? activeProfile ?? profilesForRegistrar[0] ?? fallbackSelection.profile;

  const registrarOptions = useMemo<SelectOption[]>(
    () =>
      registrarGroups.map((group) => ({
        value: group.registrar,
        label: getRegistrarProviderTypeLabel(group.registrar),
      })),
    [registrarGroups],
  );

  const profileOptions = useMemo<SelectOption[]>(
    () => profilesForRegistrar.map((profile) => ({ value: profile, label: profile })),
    [profilesForRegistrar],
  );

  const domainsQueryArgs = includeDomains && resolvedRegistrar && resolvedProfile
    ? { profile: resolvedProfile, registrar: resolvedRegistrar }
    : skipToken;
  const { data: domainOptionsData, isFetching: isDomainsFetching } = useGetRegistrarDomainOptionsQuery(domainsQueryArgs);

  const domainOptions = useMemo<SelectOption[]>(
    () => (domainOptionsData ?? []).map((item) => ({ value: item.value, label: item.label })),
    [domainOptionsData],
  );

  return {
    profilesData,
    registrarGroups,
    resolvedRegistrar,
    resolvedProfile,
    profilesForRegistrar,
    registrarOptions,
    profileOptions,
    domainOptions,
    isProfilesFetching,
    isDomainsFetching,
  };
};
