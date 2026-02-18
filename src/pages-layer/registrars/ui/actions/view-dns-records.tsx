import { useMemo, useState } from "react";
import { useLazyGetRegistrarDnsRecordsQuery } from "@entities/registrars/api";
import type { ListDnsRecordsResponse, RegistrarProviderType } from "@entities/registrars/types";
import { useRegistrarSelectOptions } from "@entities/registrars/select-options";
import {
  Button,
  CenteredState,
  FieldLabel,
  FormActions,
  FormCard,
  FormField,
  FormFields,
  FormRow,
  FormStack,
  InlineHint,
  PlaceholderText,
  ResultLoader,
  ResultCard,
  SelectControl,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableWrapper,
  useToast,
} from "@shared/ui";

type ActionsSectionViewDnsRecordsProps = {
  fixedRegistrar?: RegistrarProviderType | null;
  fixedProfile?: string | null;
};

export const ViewDnsRecords = ({ fixedRegistrar, fixedProfile }: ActionsSectionViewDnsRecordsProps = {}) => {
  const [selectedDomain, setSelectedDomain] = useState("");
  const [activeRegistrar, setActiveRegistrar] = useState<RegistrarProviderType | null>(null);
  const [activeProfile, setActiveProfile] = useState<string | null>(null);
  const [recordsResponse, setRecordsResponse] = useState<ListDnsRecordsResponse | null>(null);
  const [loadError, setLoadError] = useState("");

  const { showToast } = useToast();
  const {
    registrarGroups,
    resolvedRegistrar,
    resolvedProfile,
    registrarOptions,
    profileOptions: profileSelectOptions,
    domainOptions,
    isDomainsFetching,
  } = useRegistrarSelectOptions({
    activeRegistrar,
    activeProfile,
    fixedRegistrar: fixedRegistrar ?? null,
    fixedProfile: fixedProfile ?? null,
  });

  const [loadRecords, { isFetching: isListFetching }] = useLazyGetRegistrarDnsRecordsQuery();

  const handleRegistrarChange = (value: RegistrarProviderType | "") => {
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
    <FormStack>
      <FormCard>
        <FormRow>
          <FormFields>
            {!fixedRegistrar && (
              <FormField>
                <FieldLabel>Регистратор</FieldLabel>
                <SelectControl
                  value={resolvedRegistrar ?? ""}
                  onValueChange={(value) => handleRegistrarChange(value as RegistrarProviderType)}
                  options={registrarOptions}
                  placeholder="Выберите регистратора"
                />
              </FormField>
            )}
            {!fixedProfile && (
              <FormField>
                <FieldLabel>Профиль</FieldLabel>
                <SelectControl
                  value={resolvedProfile ?? ""}
                  onValueChange={handleProfileChange}
                  disabled={!resolvedRegistrar}
                  options={profileSelectOptions}
                  placeholder="Выберите профиль"
                />
              </FormField>
            )}
            <FormField>
              <FieldLabel>Домен</FieldLabel>
              <SelectControl
                value={selectedDomain}
                onValueChange={(value) => {
                  setSelectedDomain(value);
                  setRecordsResponse(null);
                  setLoadError("");
                }}
                disabled={!resolvedRegistrar || !resolvedProfile || isDomainsFetching}
                options={domainOptions}
                placeholder="Выберите домен"
              />
            </FormField>
          </FormFields>
          <FormActions>
            <Button type="button" variant="primary" onClick={handleLoadRecords} disabled={isListFetching}>
              {isListFetching ? "Обновление..." : "Обновить"}
            </Button>
          </FormActions>
        </FormRow>
      </FormCard>
      {showDomainsEmptyHint && <InlineHint>Нет доменов для выбранного профиля.</InlineHint>}
      {showProfilesEmptyHint && <InlineHint>Сначала синхронизируйте домены.</InlineHint>}
      <ResultCard>
        {isListFetching ? (
          <ResultLoader label="Загрузка записей..." />
        ) : loadError ? (
          <CenteredState>
            <PlaceholderText>{loadError}</PlaceholderText>
          </CenteredState>
        ) : recordsResponse === null ? (
          <CenteredState>
            <PlaceholderText>Нет данных для отображения.</PlaceholderText>
          </CenteredState>
        ) : !hasRecords ? (
          <CenteredState>
            <PlaceholderText>Нет данных для отображения.</PlaceholderText>
          </CenteredState>
        ) : (
          <TableWrapper>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Название</TableHeaderCell>
                  <TableHeaderCell>TTL, сек</TableHeaderCell>
                  <TableHeaderCell>Тип</TableHeaderCell>
                  <TableHeaderCell>Значение</TableHeaderCell>
                  <TableHeaderCell>Приоритет</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedRecords.map((record, index) => (
                  <TableRow key={`${record.subname}-${record.content}-${index}`}>
                    <TableCell>{formatRecordName(record.subname)}</TableCell>
                    <TableCell>{ttlSeconds ?? "-"}</TableCell>
                    <TableCell>{record.rectype || "-"}</TableCell>
                    <TableCell>{record.content || "-"}</TableCell>
                    <TableCell>{record.priority ?? "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableWrapper>
        )}
      </ResultCard>
    </FormStack>
  );
};



