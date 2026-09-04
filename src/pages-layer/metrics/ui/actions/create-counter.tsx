import { useEffect, useMemo, useState } from "react";
import { useCreateMetricsCounterMutation } from "@entities/metrics/api";
import { MetricsProviderType } from "@entities/metrics/types";
import { useLazyGetRegistrarDomainsQuery } from "@entities/registrars/api";
import type { RegistrarProviderType } from "@entities/registrars/types";
import { useMetricsSelectOptions } from "@entities/metrics/select-options";
import { useRegistrarSelectOptions } from "@entities/registrars/select-options";
import { resolveRegistrarProfile, resolveRegistrarProvider } from "@shared/lib/registrars";
import styled from "styled-components";
import {
  Button,
  FieldLabel,
  FormActions,
  FormCard,
  FormField,
  FormStack,
  InlineHint,
  SelectControl,
  TextInput,
  useToast,
} from "@shared/ui";

const DEFAULT_PROVIDER = MetricsProviderType.YANDEX_METRICA;

type ActionsSectionCreateCounterProps = {
  fixedProfile?: string | null;
  provider?: MetricsProviderType | null;
  onRefreshCounters?: () => Promise<unknown> | void;
};

export const CreateCounter = ({
  fixedProfile,
  provider,
  onRefreshCounters,
}: ActionsSectionCreateCounterProps = {}) => {
  const resolvedProvider = provider ?? DEFAULT_PROVIDER;
  const [counterName, setCounterName] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("");
  const [activeRegistrar, setActiveRegistrar] = useState<RegistrarProviderType | null>(null);
  const [activeProfile, setActiveProfile] = useState<string | null>(null);
  const [activeMetricaProfile, setActiveMetricaProfile] = useState<string | null>(null);
  const [allDomains, setAllDomains] = useState<string[]>([]);
  const [isLoadingAllDomains, setIsLoadingAllDomains] = useState(false);

  const { showToast } = useToast();
  const {
    resolvedProfile: resolvedMetricaProfile,
    profileOptions: metricaProfileOptions,
    isProfilesFetching: isAccountsFetching,
    refetchCounters,
  } = useMetricsSelectOptions({
    activeProfile: activeMetricaProfile,
    fixedProfile: fixedProfile ?? null,
    fixedProvider: resolvedProvider,
  });
  const {
    profilesData,
    registrarGroups,
    resolvedRegistrar,
    resolvedProfile,
    registrarOptions,
    profileOptions: profileSelectOptions,
    domainOptions: selectedDomainOptions,
    isDomainsFetching,
  } = useRegistrarSelectOptions({
    activeRegistrar,
    activeProfile,
  });
  const [loadDomainsByProfile] = useLazyGetRegistrarDomainsQuery();
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
      showToast({ variant: "error", message: "Выберите профиль." });
      return;
    }
    try {
      const result = await createCounter({
        provider: resolvedProvider,
        profile: resolvedMetricaProfile,
        counterName: counterName.trim(),
        siteUrl: selectedDomain,
      }).unwrap();
      if (onRefreshCounters) {
        await onRefreshCounters();
      } else {
        await refetchCounters();
      }
      setCounterName("");
      setSelectedDomain("");
      if (result.installRequired) {
        const measurementPart = result.measurementId
          ? ` Measurement ID: ${result.measurementId}.`
          : "";
        showToast({
          variant: "success",
          message: `Счетчик создан.${measurementPart} Установите тег на сайт (GTM или snippet), иначе данные не будут собираться.`,
        });
      } else {
        showToast({ variant: "success", message: "Счетчик создан. Выполняется синхронизация." });
      }
    } catch (error) {
      const response = error as { data?: { message?: string } };
      showToast({
        variant: "error",
        message: response.data?.message ?? "Ошибка создания счетчика.",
      });
    }
  };

  const showDomainsEmptyHint = resolvedRegistrar && resolvedProfile && domainOptions.length === 0;
  const showProfilesEmptyHint = registrarGroups.length === 0;

  return (
    <FormStack>
      <FormCard>
        <VerticalFields>
          <FullWidthField>
            <FieldLabel>Название</FieldLabel>
            <TextInput
              value={counterName}
              onChange={(event) => setCounterName(event.target.value)}
              placeholder="Например, Hotel Official"
            />
          </FullWidthField>
          {!fixedProfile && (
            <FullWidthField>
              <FieldLabel>Профиль</FieldLabel>
              <SelectControl
                value={resolvedMetricaProfile ?? ""}
                onValueChange={setActiveMetricaProfile}
                disabled={isAccountsFetching}
                options={metricaProfileOptions}
                placeholder="Выберите профиль"
              />
            </FullWidthField>
          )}
          <FullWidthField>
            <FieldLabel>Регистратор</FieldLabel>
            <SelectControl
              value={resolvedRegistrar ?? ""}
              onValueChange={(value) => handleRegistrarChange(value as RegistrarProviderType)}
              options={registrarOptions}
              placeholder="Выберите регистратора"
            />
          </FullWidthField>
          <FullWidthField>
            <FieldLabel>Профиль</FieldLabel>
            <SelectControl
              value={resolvedProfile ?? ""}
              onValueChange={handleProfileChange}
              disabled={!resolvedRegistrar}
              options={profileSelectOptions}
              placeholder="Выберите профиль"
            />
          </FullWidthField>
          <FullWidthField>
            <FieldLabel>Домен</FieldLabel>
            <SelectControl
              value={selectedDomain}
              onValueChange={setSelectedDomain}
              disabled={isDomainsFetching || isLoadingAllDomains || domainOptions.length === 0}
              options={domainOptions}
              placeholder="Выберите домен"
            />
          </FullWidthField>
        </VerticalFields>
        <FormActions>
          <Button type="button" variant="primary" onClick={handleSubmit} disabled={isCreateLoading}>
            {isCreateLoading ? "Создание..." : "Создать"}
          </Button>
        </FormActions>
      </FormCard>
      {showDomainsEmptyHint && <InlineHint>Нет доменов для выбранного профиля.</InlineHint>}
      {showProfilesEmptyHint && <InlineHint>Сначала синхронизируйте домены.</InlineHint>}
    </FormStack>
  );
};

const VerticalFields = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const FullWidthField = styled(FormField)`
  flex: 1 1 auto;
  width: 100%;
  min-width: 0;
  max-width: none;
`;

