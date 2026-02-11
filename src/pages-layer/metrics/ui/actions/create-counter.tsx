import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { skipToken } from "@reduxjs/toolkit/query";
import { useCreateMetricsCounterMutation, useGetMetricsCountersQuery, useGetMetricsProfilesQuery } from "@entities/metrics/api";
import { MetricsProviderType } from "@entities/metrics/types";
import { useGetRegistrarProfilesQuery, useGetRegistrarDomainsQuery, useLazyGetRegistrarDomainsQuery } from "@entities/registrars/api";
import type { RegistrarProviderType } from "@entities/registrars/types";
import { buildRegistrarGroups, resolveRegistrarProfile, resolveRegistrarProvider } from "@shared/lib/registrars";
import { Button, useToast } from "@shared/ui";

const DEFAULT_PROVIDER = MetricsProviderType.YANDEX_METRICA;

type ActionsSectionCreateCounterProps = {
  fixedProfile?: string | null;
};

export const CreateCounter = ({ fixedProfile }: ActionsSectionCreateCounterProps = {}) => {
  const [counterName, setCounterName] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("");
  const [activeRegistrar, setActiveRegistrar] = useState<RegistrarProviderType | null>(null);
  const [activeProfile, setActiveProfile] = useState<string | null>(null);
  const [activeMetricaProfile, setActiveMetricaProfile] = useState<string | null>(null);
  const [allDomains, setAllDomains] = useState<string[]>([]);
  const [isLoadingAllDomains, setIsLoadingAllDomains] = useState(false);

  const { showToast } = useToast();
  const { data: accountProfilesRaw, isFetching: isAccountsFetching } = useGetMetricsProfilesQuery();
  const accountProfiles = useMemo(
    () => (accountProfilesRaw ?? []).filter((profile) => profile.provider === DEFAULT_PROVIDER),
    [accountProfilesRaw],
  );
  const resolvedMetricaProfile = useMemo(
    () => fixedProfile ?? activeMetricaProfile ?? accountProfiles?.[0]?.profile ?? null,
    [fixedProfile, activeMetricaProfile, accountProfiles],
  );
  const countersQueryArgs = resolvedMetricaProfile
    ? { provider: DEFAULT_PROVIDER, profile: resolvedMetricaProfile, pageNumber: 0, pageSize: 100 }
    : skipToken;
  const { refetch: refetchCounters } = useGetMetricsCountersQuery(countersQueryArgs);
  const { data: profilesData } = useGetRegistrarProfilesQuery();
  const registrarGroups = useMemo(() => buildRegistrarGroups(profilesData ?? []), [profilesData]);
  const fallbackSelection = useMemo(() => {
    if (registrarGroups.length === 0) {
      return { registrar: null, profile: null };
    }
    const firstGroup = registrarGroups[0];
    const firstProfile = firstGroup.profiles[0] ?? null;
    return { registrar: firstGroup.registrar, profile: firstProfile };
  }, [registrarGroups]);

  const resolvedRegistrar = activeRegistrar ?? fallbackSelection.registrar;
  const resolvedProfile = activeProfile ?? fallbackSelection.profile;

  const domainsQueryArgs = resolvedRegistrar && resolvedProfile
    ? { pageNumber: 0, pageSize: 200, profile: resolvedProfile, registrar: resolvedRegistrar }
    : skipToken;
  const { data: domainsData, isFetching: isDomainsFetching } = useGetRegistrarDomainsQuery(domainsQueryArgs);
  const [loadDomainsByProfile] = useLazyGetRegistrarDomainsQuery();
  const profileOptions = useMemo(() => {
    if (!resolvedRegistrar) {
      return [];
    }
    return registrarGroups.find((group) => group.registrar === resolvedRegistrar)?.profiles ?? [];
  }, [registrarGroups, resolvedRegistrar]);

  const selectedDomainOptions = useMemo(
    () => {
      const page = domainsData as { content?: Array<{ domainName?: string; domain?: string }> } | undefined;
      return (page?.content ?? [])
        .map((domain) => domain.domainName ?? domain.domain ?? "")
        .filter((name) => name.length > 0)
        .map((name) => ({
          value: name,
          label: name,
        }));
    },
    [domainsData],
  );
  const allDomainOptions = useMemo(
    () =>
      allDomains.map((domain) => ({
        value: domain,
        label: domain,
      })),
    [allDomains],
  );
  const domainOptions = selectedDomainOptions.length > 0 ? selectedDomainOptions : allDomainOptions;

  useEffect(() => {
    let isCancelled = false;

    const fetchAllDomains = async () => {
      const profiles = (profilesData ?? [])
        .map((item) => ({
          registrar: resolveRegistrarProvider(item),
          profile: resolveRegistrarProfile(item),
        }))
        .filter(
          (item): item is { registrar: RegistrarProviderType; profile: string } =>
            Boolean(item.registrar) && typeof item.profile === "string" && item.profile.length > 0,
        );

      if (profiles.length === 0) {
        setAllDomains([]);
        return;
      }

      setIsLoadingAllDomains(true);
      try {
        const results = await Promise.allSettled(
          profiles.map((item) =>
            loadDomainsByProfile(
              { pageNumber: 0, pageSize: 500, registrar: item.registrar, profile: item.profile },
              true,
            ).unwrap(),
          ),
        );

        if (isCancelled) {
          return;
        }

        const uniqueDomains = new Set<string>();
        results.forEach((result) => {
          if (result.status !== "fulfilled") {
            return;
          }
          const page = result.value as { content?: Array<{ domainName?: string; domain?: string }> };
          (page.content ?? []).forEach((domain) => {
            const domainName = domain.domainName ?? domain.domain ?? "";
            if (domainName) {
              uniqueDomains.add(domainName);
            }
          });
        });
        setAllDomains(Array.from(uniqueDomains).sort((a, b) => a.localeCompare(b)));
      } finally {
        if (!isCancelled) {
          setIsLoadingAllDomains(false);
        }
      }
    };

    void fetchAllDomains();

    return () => {
      isCancelled = true;
    };
  }, [loadDomainsByProfile, profilesData]);

  useEffect(() => {
    if (!selectedDomain) {
      return;
    }
    const stillExists = domainOptions.some((option) => option.value === selectedDomain);
    if (!stillExists) {
      setSelectedDomain("");
    }
  }, [domainOptions, selectedDomain]);

  const [createCounter, { isLoading: isCreateLoading }] = useCreateMetricsCounterMutation();

  const handleRegistrarChange = (value: RegistrarProviderType | "") => {
    if (!value) {
      setActiveRegistrar(null);
      setActiveProfile(null);
      setSelectedDomain("");
      return;
    }
    const nextGroup = registrarGroups.find((group) => group.registrar === value);
    setActiveRegistrar(value);
    setActiveProfile(nextGroup?.profiles[0] ?? null);
    setSelectedDomain("");
  };

  const handleProfileChange = (value: string) => {
    setActiveProfile(value || null);
    setSelectedDomain("");
  };

  const handleSubmit = async () => {
    if (!counterName.trim()) {
      showToast({ variant: "error", message: "Введите название счетчика." });
      return;
    }
    if (!selectedDomain) {
      showToast({ variant: "error", message: "Выберите домен." });
      return;
    }
    if (!resolvedMetricaProfile) {
      showToast({ variant: "error", message: "Выберите профиль Метрики." });
      return;
    }
    try {
      await createCounter({
        provider: DEFAULT_PROVIDER,
        profile: resolvedMetricaProfile,
        counterName: counterName.trim(),
        siteUrl: selectedDomain,
      }).unwrap();
      await refetchCounters();
      setCounterName("");
      setSelectedDomain("");
      showToast({ variant: "success", message: "Счетчик создан. Выполняется синхронизация." });
    } catch {
      showToast({ variant: "error", message: "Ошибка создания счетчика." });
    }
  };

  const showDomainsEmptyHint = resolvedRegistrar && resolvedProfile && domainOptions.length === 0;
  const showProfilesEmptyHint = registrarGroups.length === 0;

  return (
    <Stack>
      <FormCard>
        <FormRow>
          <FormFields>
            <FormField>
              <Label>Название</Label>
              <Input
                value={counterName}
                onChange={(event) => setCounterName(event.target.value)}
                placeholder="Например, Hotel Official"
              />
            </FormField>
            {!fixedProfile && (
              <FormField>
                <Label>Профиль Метрики</Label>
                <Select
                  value={resolvedMetricaProfile ?? ""}
                  onChange={(event) => setActiveMetricaProfile(event.target.value)}
                  disabled={isAccountsFetching}
                >
                  <option value="">Выберите профиль</option>
                  {(accountProfiles ?? []).map((profile) => (
                    <option key={profile.profile} value={profile.profile}>
                      {profile.profile}
                    </option>
                  ))}
                </Select>
              </FormField>
            )}
            <FormField>
              <Label>Регистратор</Label>
              <Select
                value={resolvedRegistrar ?? ""}
                onChange={(event) => handleRegistrarChange(event.target.value as RegistrarProviderType)}
              >
                <option value="">Выберите регистратора</option>
                {registrarGroups.map((group) => (
                  <option key={group.registrar} value={group.registrar}>
                    {group.registrar}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField>
              <Label>Профиль</Label>
              <Select
                value={resolvedProfile ?? ""}
                onChange={(event) => handleProfileChange(event.target.value)}
                disabled={!resolvedRegistrar}
              >
                <option value="">Выберите профиль</option>
                {profileOptions.map((profile) => (
                  <option key={profile} value={profile}>
                    {profile}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField>
              <Label>Домен</Label>
              <Select
                value={selectedDomain}
                onChange={(event) => setSelectedDomain(event.target.value)}
                disabled={isDomainsFetching || isLoadingAllDomains || domainOptions.length === 0}
              >
                <option value="">Выберите домен</option>
                {domainOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </FormField>
          </FormFields>
          <Actions>
            <ActionButton type="button" onClick={handleSubmit} disabled={isCreateLoading}>
              {isCreateLoading ? "Создание..." : "Создать"}
            </ActionButton>
          </Actions>
        </FormRow>
      </FormCard>
      {showDomainsEmptyHint && <Hint>Нет доменов для выбранного профиля.</Hint>}
      {showProfilesEmptyHint && <Hint>Сначала синхронизируйте домены.</Hint>}
    </Stack>
  );
};

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const FormCard = styled.div`
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: #ffffff;
`;

const FormRow = styled.div`
  display: flex;
  flex-wrap: nowrap;
  gap: 16px;
  align-items: flex-end;
  overflow-x: auto;
  padding-bottom: 4px;
`;

const FormFields = styled.div`
  display: flex;
  flex-wrap: nowrap;
  gap: 12px;
  flex: 0 1 auto;
  align-items: flex-end;
  justify-content: flex-start;
`;

const FormField = styled.label`
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 0 1 300px;
  min-width: 220px;
  max-width: 300px;
`;

const Label = styled.span`
  font-size: 14px;
  color: #374151;
`;

const Input = styled.input`
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 14px;
  width: 100%;
  max-width: 300px;
`;

const Select = styled.select`
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 14px;
  width: 100%;
  max-width: 300px;
`;

const Actions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-start;
  align-items: flex-end;
  flex: 0 0 auto;
`;

const ActionButton = styled(Button)`
  font-weight: 600;
  box-shadow: 0 10px 18px rgba(37, 99, 235, 0.2);
`;

const Hint = styled.p`
  margin: 0;
  font-size: 12px;
  color: #6b7280;
`;
