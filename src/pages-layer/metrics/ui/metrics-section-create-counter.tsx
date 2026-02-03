import { useMemo, useState } from "react";
import styled from "styled-components";
import { skipToken } from "@reduxjs/toolkit/query";
import { useCreateCounterMutation, useGetCountersQuery } from "@entities/analytics/api";
import { AnalyticsProvider } from "@entities/analytics/types";
import { useGetDomainProfilesQuery, useGetDomainsQuery } from "@entities/domains/api";
import type { RegistrarType } from "@entities/domains/types";
import { Button, useToast } from "@shared/ui";
import { buildRegistrarGroups } from "../lib/registrars";

const DEFAULT_PROVIDER = AnalyticsProvider.YANDEX_METRICA;

export const MetricsSectionCreateCounter = () => {
  const [counterName, setCounterName] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("");
  const [activeRegistrar, setActiveRegistrar] = useState<RegistrarType | null>(null);
  const [activeProfile, setActiveProfile] = useState<string | null>(null);

  const { showToast } = useToast();
  const { refetch: refetchCounters } = useGetCountersQuery({
    provider: DEFAULT_PROVIDER,
    pageNumber: 0,
    pageSize: 100,
  });
  const { data: profilesData } = useGetDomainProfilesQuery();
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
  const { data: domainsData, isFetching: isDomainsFetching } = useGetDomainsQuery(domainsQueryArgs);
  const domains = domainsData?.content ?? [];
  const profileOptions = useMemo(() => {
    if (!resolvedRegistrar) {
      return [];
    }
    return registrarGroups.find((group) => group.registrar === resolvedRegistrar)?.profiles ?? [];
  }, [registrarGroups, resolvedRegistrar]);

  const domainOptions = useMemo(
    () =>
      domains.map((domain) => ({
        value: domain.domainName,
        label: domain.domainName,
      })),
    [domains],
  );

  const [createCounter, { isLoading: isCreateLoading }] = useCreateCounterMutation();

  const handleRegistrarChange = (value: RegistrarType | "") => {
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
    try {
      await createCounter({
        provider: DEFAULT_PROVIDER,
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
    <Section>
      <SectionTitle>Создать счетчик</SectionTitle>
      <FieldRow>
        <Label>Название</Label>
        <Input
          value={counterName}
          onChange={(event) => setCounterName(event.target.value)}
          placeholder="Например, Hotel Official"
        />
      </FieldRow>
      <FieldRow>
        <Label>Регистратор</Label>
        <Select
          value={resolvedRegistrar ?? ""}
          onChange={(event) => handleRegistrarChange(event.target.value as RegistrarType)}
        >
          <option value="">Выберите регистратора</option>
          {registrarGroups.map((group) => (
            <option key={group.registrar} value={group.registrar}>
              {group.registrar}
            </option>
          ))}
        </Select>
      </FieldRow>
      <FieldRow>
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
      </FieldRow>
      <FieldRow>
        <Label>Домен</Label>
        <Select
          value={selectedDomain}
          onChange={(event) => setSelectedDomain(event.target.value)}
          disabled={!resolvedRegistrar || !resolvedProfile || isDomainsFetching}
        >
          <option value="">Выберите домен</option>
          {domainOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </FieldRow>
      {showDomainsEmptyHint && <Hint>Нет доменов для выбранного профиля.</Hint>}
      {showProfilesEmptyHint && <Hint>Сначала синхронизируйте домены.</Hint>}
      <Actions>
        <Button type="button" onClick={handleSubmit} disabled={isCreateLoading}>
          {isCreateLoading ? "Создание..." : "Создать"}
        </Button>
      </Actions>
    </Section>
  );
};

const Section = styled.section`
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const SectionTitle = styled.h2`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #111827;
`;

const FieldRow = styled.label`
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: 12px;
  align-items: center;
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
`;

const Select = styled.select`
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 14px;
`;

const Actions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

const Hint = styled.p`
  margin: 0;
  font-size: 12px;
  color: #6b7280;
`;
