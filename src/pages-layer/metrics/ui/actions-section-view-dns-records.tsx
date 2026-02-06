import { useMemo, useState } from "react";
import styled from "styled-components";
import { skipToken } from "@reduxjs/toolkit/query";
import { useGetDomainProfilesQuery, useGetDomainsQuery, useLazyListDnsRecordsQuery } from "@entities/domains/api";
import type { ListDnsRecordsResponse, RegistrarType } from "@entities/domains/types";
import { Button, useToast } from "@shared/ui";
import { buildRegistrarGroups } from "../lib/registrars";

export const ActionsSectionViewDnsRecords = () => {
  const [selectedDomain, setSelectedDomain] = useState("");
  const [activeRegistrar, setActiveRegistrar] = useState<RegistrarType | null>(null);
  const [activeProfile, setActiveProfile] = useState<string | null>(null);
  const [recordsResponse, setRecordsResponse] = useState<ListDnsRecordsResponse | null>(null);
  const [loadError, setLoadError] = useState("");

  const { showToast } = useToast();
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

  const [loadRecords, { isFetching: isListFetching }] = useLazyListDnsRecordsQuery();

  const handleRegistrarChange = (value: RegistrarType | "") => {
    if (!value) {
      setActiveRegistrar(null);
      setActiveProfile(null);
      setSelectedDomain("");
      setRecordsResponse(null);
      setLoadError("");
      return;
    }
    const nextGroup = registrarGroups.find((group) => group.registrar === value);
    setActiveRegistrar(value);
    setActiveProfile(nextGroup?.profiles[0] ?? null);
    setSelectedDomain("");
    setRecordsResponse(null);
    setLoadError("");
  };

  const handleProfileChange = (value: string) => {
    setActiveProfile(value || null);
    setSelectedDomain("");
    setRecordsResponse(null);
    setLoadError("");
  };

  const handleLoadRecords = async () => {
    if (!resolvedRegistrar || !resolvedProfile) {
      showToast({ variant: "error", message: "Выберите регистратора и профиль." });
      return;
    }
    if (!selectedDomain) {
      showToast({ variant: "error", message: "Выберите домен." });
      return;
    }
    try {
      const response = await loadRecords({
        registrar: resolvedRegistrar,
        profileId: resolvedProfile,
        domain: selectedDomain,
      }).unwrap();
      setRecordsResponse(response);
      setLoadError("");
    } catch (error) {
      setRecordsResponse(null);
      const message =
        typeof error === "object" && error !== null && "data" in error
          ? (error as { data?: { message?: string } }).data?.message
          : undefined;
      setLoadError(message || "Ошибка загрузки записей.");
    }
  };

  const showDomainsEmptyHint = resolvedRegistrar && resolvedProfile && domainOptions.length === 0;
  const showProfilesEmptyHint = registrarGroups.length === 0;
  const sortedRecords = useMemo(() => {
    if (!recordsResponse?.groups) {
      return [];
    }
    const items = recordsResponse.groups.flatMap((group) =>
      group.records.map((record) => ({
        ...record,
        rectype: record.rectype || group.rectype,
      })),
    );
    return items.sort((left, right) => String(left.rectype).localeCompare(String(right.rectype)));
  }, [recordsResponse]);
  const hasRecords = sortedRecords.length > 0;
  const domainName = recordsResponse?.domain ?? "";
  const ttlSeconds = useMemo(() => {
    const rawTtl = recordsResponse?.soa?.ttl ?? recordsResponse?.soa?.minimumTtl ?? "";
    const trimmed = rawTtl.trim();
    if (!trimmed) {
      return null;
    }
    const match = trimmed.match(/^(\d+)([smhdw])?$/i);
    if (!match) {
      return null;
    }
    const value = Number(match[1]);
    if (Number.isNaN(value)) {
      return null;
    }
    const unit = (match[2] || "s").toLowerCase();
    const multiplier = unit === "m"
      ? 60
      : unit === "h"
        ? 3600
        : unit === "d"
          ? 86400
          : unit === "w"
            ? 604800
            : 1;
    return value * multiplier;
  }, [recordsResponse]);

  const formatRecordName = (subname: string | null | undefined) => {
    if (!domainName) {
      return subname || "@";
    }
    const normalized = subname && subname.trim().length > 0 ? subname.trim() : "@";
    if (normalized === "@") {
      return `${domainName}.`;
    }
    return `${normalized}.${domainName}.`;
  };

  return (
    <Stack>
      <FormCard>
        <FormRow>
          <FormFields>
            <FormField>
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
                onChange={(event) => {
                  setSelectedDomain(event.target.value);
                  setRecordsResponse(null);
                  setLoadError("");
                }}
                disabled={!resolvedRegistrar || !resolvedProfile || isDomainsFetching}
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
            <ActionButton type="button" onClick={handleLoadRecords} disabled={isListFetching}>
              {isListFetching ? "Обновление..." : "Обновить"}
            </ActionButton>
          </Actions>
        </FormRow>
      </FormCard>
      {showDomainsEmptyHint && <Hint>Нет доменов для выбранного профиля.</Hint>}
      {showProfilesEmptyHint && <Hint>Сначала синхронизируйте домены.</Hint>}
      <ResultCard>
        {isListFetching ? (
          <EmptyState>
            <Placeholder>Загрузка записей...</Placeholder>
          </EmptyState>
        ) : loadError ? (
          <EmptyState>
            <Placeholder>{loadError}</Placeholder>
          </EmptyState>
        ) : recordsResponse === null ? (
          <EmptyState>
            <Placeholder>Нет данных для отображения.</Placeholder>
          </EmptyState>
        ) : !hasRecords ? (
          <EmptyState>
            <Placeholder>Записи не найдены.</Placeholder>
          </EmptyState>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Название</Th>
                  <Th>TTL, сек</Th>
                  <Th>Тип</Th>
                  <Th>Значение</Th>
                  <Th>Приоритет</Th>
                </tr>
              </thead>
              <tbody>
                {sortedRecords.map((record, index) => (
                  <tr key={`${record.subname}-${record.content}-${index}`}>
                    <Td>{formatRecordName(record.subname)}</Td>
                    <Td>{ttlSeconds ?? "-"}</Td>
                    <Td>{record.rectype || "-"}</Td>
                    <Td>{record.content || "-"}</Td>
                    <Td>{record.priority ?? "-"}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </>
        )}
      </ResultCard>
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
  flex-wrap: wrap;
  gap: 16px;
  align-items: flex-end;
`;

const FormFields = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
  flex: 1 1 520px;
`;

const FormField = styled.label`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.span`
  font-size: 14px;
  color: #374151;
`;

const Select = styled.select`
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 14px;
  width: 100%;
`;

const Actions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
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

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
`;

const Th = styled.th`
  text-align: left;
  padding: 8px 6px;
  border-bottom: 1px solid #e5e7eb;
  color: #6b7280;
  font-weight: 600;
`;

const Td = styled.td`
  padding: 8px 6px;
  border-bottom: 1px solid #f3f4f6;
  color: #111827;
`;

const ResultCard = styled.div`
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: #ffffff;
  min-height: 160px;
`;

const Placeholder = styled.div`
  color: #6b7280;
  font-size: 14px;
`;

const EmptyState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  flex: 1;
`;
