"use client";

import { useEffect, useMemo, useState } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import styled from "styled-components";
import {
  useCreateRegistrarTxtRecordMutation,
  useGetRegistrarProfilesQuery,
  useLazyGetRegistrarDnsRecordsQuery,
} from "@entities/registrars/api";
import {
  getRegistrarProviderTypeLabel,
  RegistrarProviderType,
} from "@entities/registrars/types";
import {
  useGetWebmasterHostsQuery,
  useGetWebmasterProfilesQuery,
  useVerifyWebmasterHostDnsMutation,
} from "@entities/webmaster/api";
import { type WebmasterHostDto, type WebmasterHostVerifyDnsResponse, WebmasterProviderType } from "@entities/webmaster/types";
import { buildRegistrarGroups } from "@shared/lib/registrars";
import { Button, useToast } from "@shared/ui";

const DEFAULT_PROVIDER = WebmasterProviderType.YANDEX_WEBMASTER;
const ROOT_SUBDOMAIN = "@";
const VERIFIED_STATE = "VERIFIED";
const IN_PROGRESS_STATE = "IN_PROGRESS";
const POLLING_ATTEMPTS_LIMIT = 8;
const POLLING_INTERVAL_MS = 5000;

type ActionsSectionVerifyHostDnsProps = {
  fixedProfile?: string | null;
};

export const VerifyHostDns = ({ fixedProfile }: ActionsSectionVerifyHostDnsProps = {}) => {
  const { showToast } = useToast();
  const [activeProfile, setActiveProfile] = useState<string | null>(null);
  const [selectedHostId, setSelectedHostId] = useState("");
  const [activeRegistrar, setActiveRegistrar] = useState<RegistrarProviderType | null>(null);
  const [activeRegistrarProfile, setActiveRegistrarProfile] = useState<string | null>(null);
  const [resultBySelection, setResultBySelection] = useState<{
    profile: string;
    hostId: string;
    data: WebmasterHostVerifyDnsResponse;
  } | null>(null);
  const [isTxtPresent, setIsTxtPresent] = useState<boolean | null>(null);
  const [isPollingStatus, setIsPollingStatus] = useState(false);
  const [pollAttempt, setPollAttempt] = useState(0);

  const { data: profilesRaw, isFetching: isProfilesFetching } = useGetWebmasterProfilesQuery();
  const profiles = useMemo(
    () => (profilesRaw ?? []).filter((profile) => profile.provider === DEFAULT_PROVIDER),
    [profilesRaw],
  );
  const resolvedProfile = useMemo(
    () => fixedProfile ?? activeProfile ?? profiles?.[0]?.profile ?? null,
    [fixedProfile, activeProfile, profiles],
  );

  const hostsQueryArgs = resolvedProfile
    ? { provider: DEFAULT_PROVIDER, profile: resolvedProfile, pageNumber: 0, pageSize: 500 }
    : skipToken;
  const { data: hostsData, isFetching: isHostsFetching } = useGetWebmasterHostsQuery(hostsQueryArgs);
  const hosts = useMemo(() => hostsData?.content ?? [], [hostsData?.content]);
  const hostOptions = useMemo(
    () => hosts.filter((host) => host.hostId && host.hostId.trim().length > 0),
    [hosts],
  );

  const { data: registrarProfilesRaw, isFetching: isRegistrarProfilesFetching } = useGetRegistrarProfilesQuery();
  const registrarGroups = useMemo(
    () => buildRegistrarGroups(registrarProfilesRaw ?? []),
    [registrarProfilesRaw],
  );
  const fallbackRegistrarSelection = useMemo(() => {
    if (!registrarGroups.length) {
      return { registrar: null, profile: null };
    }
    const regRuGroup = registrarGroups.find((group) => group.registrar === RegistrarProviderType.REG_RU);
    const firstGroup = regRuGroup ?? registrarGroups[0];
    return {
      registrar: firstGroup.registrar,
      profile: firstGroup.profiles[0] ?? null,
    };
  }, [registrarGroups]);
  const resolvedRegistrar = activeRegistrar ?? fallbackRegistrarSelection.registrar;
  const profileOptions = useMemo(() => {
    if (!resolvedRegistrar) {
      return [];
    }
    return registrarGroups.find((group) => group.registrar === resolvedRegistrar)?.profiles ?? [];
  }, [registrarGroups, resolvedRegistrar]);
  const resolvedRegistrarProfile = activeRegistrarProfile ?? fallbackRegistrarSelection.profile;

  const resolvedHost = useMemo(() => {
    if (!hostOptions.length) {
      return null;
    }
    if (selectedHostId) {
      const selected = hostOptions.find((item) => item.hostId === selectedHostId);
      if (selected) {
        return selected;
      }
    }
    return hostOptions[0] ?? null;
  }, [hostOptions, selectedHostId]);
  const resolvedHostEntityId = resolvedHost?.hostId ?? "";
  const resolvedDomain = useMemo(
    () => normalizeDomain(extractWebsite(resolvedHost?.hostUrl, resolvedHost?.hostId)),
    [resolvedHost?.hostId, resolvedHost?.hostUrl],
  );
  const resolvedHostId = resolvedHost?.hostId ?? "";
  const result = useMemo(() => {
    if (!resolvedProfile || !resolvedHostId) {
      return null;
    }
    return resultBySelection?.profile === resolvedProfile && resultBySelection.hostId === resolvedHostId
      ? resultBySelection.data
      : null;
  }, [resolvedHostId, resolvedProfile, resultBySelection]);

  const [verifyHostDns, { isLoading: isVerifying }] = useVerifyWebmasterHostDnsMutation();
  const [createRegistrarTxtRecord, { isLoading: isTxtCreating }] = useCreateRegistrarTxtRecordMutation();
  const [loadRegistrarDnsRecords, { isFetching: isTxtChecking }] = useLazyGetRegistrarDnsRecordsQuery();
  const shouldShowTxtSection = Boolean(result && result.verified !== true);
  const isVerified = result?.verified === true || result?.verificationState === VERIFIED_STATE;
  const expectedTxtValue = useMemo(
    () => (result?.verificationUin ? `yandex-verification: ${result.verificationUin}` : null),
    [result?.verificationUin],
  );
  const resolvedTxtPresence = expectedTxtValue ? isTxtPresent : null;

  useEffect(() => {
    if (!resolvedRegistrar || !resolvedRegistrarProfile || !resolvedDomain || !expectedTxtValue) {
      return;
    }
    let isCancelled = false;
    const loadTxtPresence = async () => {
      try {
        const dns = await loadRegistrarDnsRecords({
          registrar: resolvedRegistrar,
          profileId: resolvedRegistrarProfile,
          domain: resolvedDomain,
        }).unwrap();
        if (isCancelled) {
          return;
        }
        setIsTxtPresent(hasMatchingTxtRecord(dns, expectedTxtValue));
      } catch {
        if (isCancelled) {
          return;
        }
        setIsTxtPresent(null);
      }
    };
    void loadTxtPresence();
    return () => {
      isCancelled = true;
    };
  }, [
    expectedTxtValue,
    loadRegistrarDnsRecords,
    resolvedDomain,
    resolvedRegistrar,
    resolvedRegistrarProfile,
  ]);

  useEffect(() => {
    if (!isPollingStatus) {
      return;
    }
    if (!resolvedProfile || !resolvedDomain || !resolvedHostId || !resolvedHost) {
      return;
    }
    if (isVerified || pollAttempt >= POLLING_ATTEMPTS_LIMIT) {
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const response = await verifyHostDns({
          provider: DEFAULT_PROVIDER,
          profile: resolvedProfile,
          hostId: resolvedHostId,
          hostUrl: resolvedHost.hostUrl ?? undefined,
          startVerification: false,
        }).unwrap();

        setResultBySelection({
          profile: resolvedProfile,
          hostId: resolvedHostId,
          data: response,
        });
        if (response.verified || response.verificationState === VERIFIED_STATE) {
          setIsPollingStatus(false);
          setPollAttempt(0);
          return;
        }
        setPollAttempt((attempt) => {
          const nextAttempt = attempt + 1;
          if (nextAttempt >= POLLING_ATTEMPTS_LIMIT) {
            setIsPollingStatus(false);
            showToast({ variant: "error", message: "Не удалось получить подтверждение. Попробуйте обновить статус позже." });
          }
          return nextAttempt;
        });
      } catch {
        setIsPollingStatus(false);
        showToast({ variant: "error", message: "Ошибка обновления статуса проверки." });
      }
    }, POLLING_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [
    isPollingStatus,
    isVerified,
    pollAttempt,
    resolvedDomain,
    resolvedHost,
    resolvedHostId,
    resolvedProfile,
    showToast,
    verifyHostDns,
  ]);

  const handleLoadVerificationCode = async () => {
    if (!resolvedProfile) {
      showToast({ variant: "error", message: "Выберите профиль Вебмастера." });
      return;
    }
    if (!resolvedDomain) {
      showToast({ variant: "error", message: "Выберите домен." });
      return;
    }
    if (!resolvedHostId || !resolvedHost) {
      showToast({ variant: "error", message: "Для выбранного домена нет площадки в Вебмастере. Сначала добавьте сайт." });
      return;
    }
    try {
      const response = await verifyHostDns({
        provider: DEFAULT_PROVIDER,
        profile: resolvedProfile,
        hostId: resolvedHostId,
        hostUrl: resolvedHost?.hostUrl ?? undefined,
        startVerification: false,
      }).unwrap();

      setResultBySelection({
        profile: resolvedProfile,
          hostId: resolvedHostId,
        data: response,
      });

      setIsPollingStatus(false);
      setPollAttempt(0);

      if (response.verified || response.verificationState === VERIFIED_STATE) {
        showToast({ variant: "success", message: "Права подтверждены." });
      } else {
        showToast({ variant: "success", message: "Код подтверждения получен. Добавьте TXT-запись и запустите проверку." });
      }
    } catch {
      showToast({ variant: "error", message: "Ошибка получения данных для проверки." });
    }
  };

  const handleCreateTxt = async () => {
    if (!result?.verificationUin) {
      showToast({ variant: "error", message: "Сначала выполните проверку, чтобы получить verificationUin." });
      return;
    }
    if (!resolvedRegistrar || !resolvedRegistrarProfile || !resolvedDomain) {
      showToast({ variant: "error", message: "Выберите регистратора, профиль и домен." });
      return;
    }
    const txtValue = `yandex-verification: ${result.verificationUin}`;
    try {
      const response = await createRegistrarTxtRecord({
        registrar: resolvedRegistrar,
        profileId: resolvedRegistrarProfile,
        domain: resolvedDomain,
        subdomain: ROOT_SUBDOMAIN,
        text: txtValue,
      }).unwrap();
      const note = response.note ? ` (${response.note})` : "";
      showToast({ variant: "success", message: `TXT-запись создана${note}.` });
      setIsTxtPresent(true);
    } catch {
      showToast({ variant: "error", message: "Ошибка создания TXT-записи." });
    }
  };

  const handleStartVerification = async () => {
    if (!resolvedProfile || !resolvedDomain || !resolvedHostId || !resolvedHost) {
      showToast({ variant: "error", message: "Сначала выберите профиль, домен и площадку Вебмастера." });
      return;
    }
    try {
      const response = await verifyHostDns({
        provider: DEFAULT_PROVIDER,
        profile: resolvedProfile,
        hostId: resolvedHostId,
        hostUrl: resolvedHost.hostUrl ?? undefined,
        startVerification: true,
      }).unwrap();

      setResultBySelection({
        profile: resolvedProfile,
        hostId: resolvedHostId,
        data: response,
      });

      if (response.verified || response.verificationState === VERIFIED_STATE) {
        setIsPollingStatus(false);
        setPollAttempt(0);
        showToast({ variant: "success", message: "Права подтверждены." });
        return;
      }

      setPollAttempt(0);
      setIsPollingStatus(true);
      const stateNote = response.verificationState === IN_PROGRESS_STATE
        ? "Проверка запущена. Обновляем статус..."
        : "Проверка запрошена. Обновляем статус...";
      showToast({ variant: "success", message: stateNote });
    } catch {
      setIsPollingStatus(false);
      showToast({ variant: "error", message: "Ошибка запуска проверки прав в Яндексе." });
    }
  };

  const canCreateTxt = Boolean(
    shouldShowTxtSection
      && result?.verificationUin
      && resolvedRegistrar
      && resolvedRegistrarProfile
      && resolvedDomain,
  );
  const canStartVerification = Boolean(
    result?.verificationUin
      && resolvedProfile
      && resolvedDomain
      && resolvedHostId
      && resolvedHost,
  );
  const disableCreateTxt = !canCreateTxt || isVerified || resolvedTxtPresence === true || isTxtCreating || isTxtChecking;
  const disableStartVerification = !canStartVerification || isVerifying || isPollingStatus || isVerified || resolvedTxtPresence !== true;

  return (
    <Stack>
      <FormCard>
        <FormRow>
          <FormFields>
            {!fixedProfile && (
              <FormField>
                <Label>Профиль Вебмастера</Label>
                <Select
                  value={resolvedProfile ?? ""}
                  onChange={(event) => setActiveProfile(event.target.value)}
                  disabled={isProfilesFetching}
                >
                  <option value="">Выберите профиль</option>
                  {(profiles ?? []).map((profile) => (
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
                onChange={(event) => {
                  const nextRegistrar = event.target.value as RegistrarProviderType;
                  setActiveRegistrar(nextRegistrar || null);
                  const nextProfiles = registrarGroups.find((group) => group.registrar === nextRegistrar)?.profiles ?? [];
                  setActiveRegistrarProfile(nextProfiles[0] ?? null);
                }}
                disabled={isRegistrarProfilesFetching}
              >
                <option value="">Выберите регистратора</option>
                {registrarGroups.map((group) => (
                  <option key={group.registrar} value={group.registrar}>
                    {getRegistrarProviderTypeLabel(group.registrar)}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField>
              <Label>Профиль регистратора</Label>
              <Select
                value={resolvedRegistrarProfile ?? ""}
                onChange={(event) => {
                  setActiveRegistrarProfile(event.target.value || null);
                }}
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
              <Label>Сайт</Label>
              <Select
                value={resolvedHostEntityId}
                onChange={(event) => {
                  setSelectedHostId(event.target.value);
                  setResultBySelection(null);
                  setIsPollingStatus(false);
                  setPollAttempt(0);
                }}
                disabled={!resolvedProfile || isHostsFetching}
              >
                {!hostOptions.length && <option value="">Нет сайтов в Вебмастере</option>}
                {hostOptions.map((item) => (
                  <option key={item.hostId} value={item.hostId}>
                    {extractWebsite(item.hostUrl, item.hostId) ?? item.hostUrl ?? item.hostId}
                  </option>
                ))}
              </Select>
            </FormField>
          </FormFields>
          <Actions>
            <ActionButton
              type="button"
              onClick={handleLoadVerificationCode}
              disabled={isVerifying || isPollingStatus || isHostsFetching}
            >
              Проверить статус
            </ActionButton>
          </Actions>
        </FormRow>
      </FormCard>

      <ResultCard>
        {!result ? (
          <Placeholder>Сначала нажмите Проверить статус.</Placeholder>
        ) : (
          <ResultGrid>
            <InfoRow>
              <InfoLabel>Состояние</InfoLabel>
              <InfoValue as="span">
                <StatusBadge $success={isVerified}>
                  {isVerified ? "Подтверждено" : "Не верифицирован"}
                </StatusBadge>
              </InfoValue>
              <ActionCell />
            </InfoRow>
            <InfoRow>
              <InfoLabel>Сайт</InfoLabel>
              <InfoValue>{result.hostUrl}</InfoValue>
              <ActionCell />
            </InfoRow>
            <InfoRow>
              <InfoLabel>Verification UIN</InfoLabel>
              <CodeValue>{result.verificationUin}</CodeValue>
              <ActionCell />
            </InfoRow>
            <InfoRow>
              <InfoLabel>TXT-запись</InfoLabel>
              <InfoValue>
                {isTxtChecking
                  ? "проверяем..."
                    : resolvedTxtPresence === true
                    ? "присутствует"
                    : "отсутствует"}
              </InfoValue>
              <ActionCell>
                <ActionButton type="button" onClick={handleCreateTxt} disabled={disableCreateTxt}>
                  {isTxtCreating ? "Сохранение..." : "Создать TXT-запись"}
                </ActionButton>
              </ActionCell>
            </InfoRow>
            <InfoRow>
              <InfoLabel>Статус</InfoLabel>
              <InfoValue>{result.verificationState}</InfoValue>
              <ActionCell>
                <ActionButton
                  type="button"
                  onClick={handleStartVerification}
                  disabled={disableStartVerification}
                >
                  {isVerifying || isPollingStatus ? "Проверка..." : "Запустить проверку"}
                </ActionButton>
              </ActionCell>
            </InfoRow>
          </ResultGrid>
        )}
      </ResultCard>
    </Stack>
  );
};

const extractWebsite = (hostUrl?: string | null, hostId?: string | null): string | null => {
  if (hostUrl) {
    try {
      const parsed = new URL(hostUrl);
      if (parsed.hostname) {
        return parsed.hostname;
      }
    } catch {
      const withoutProtocol = hostUrl.replace(/^https?:\/\//, "");
      const firstPart = withoutProtocol.split("/")[0]?.trim();
      if (firstPart) {
        return firstPart;
      }
    }
  }
  if (hostId) {
    const parts = hostId.split(":").filter(Boolean);
    if (parts.length >= 2) {
      return parts[1];
    }
    return hostId;
  }
  return null;
};

const normalizeDomain = (value?: string | null): string => {
  return (value ?? "").trim().toLowerCase().replace(/\.$/, "");
};

const normalizeTxtValue = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.startsWith("\"") && trimmed.endsWith("\"") && trimmed.length >= 2) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
};

const isRootRecord = (subname: string | null | undefined): boolean => {
  const normalized = (subname ?? "").trim().toLowerCase();
  return normalized === "" || normalized === "@";
};

const hasMatchingTxtRecord = (
  dns: { groups?: Array<{ rectype?: string; records?: Array<{ subname?: string; content?: string }> }> } | undefined,
  expectedTxtValue: string,
): boolean => {
  const expected = normalizeTxtValue(expectedTxtValue);
  return (dns?.groups ?? []).some((group) =>
    (group.rectype ?? "").toUpperCase() === "TXT"
    && (group.records ?? []).some((record) =>
      isRootRecord(record.subname)
      && normalizeTxtValue(record.content ?? "") === expected),
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
  overflow-x: auto;
  padding-bottom: 4px;
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
  align-items: center;
  flex-wrap: wrap;
`;

const ActionButton = styled(Button)`
  font-weight: 600;
  box-shadow: 0 10px 18px rgba(37, 99, 235, 0.2);
`;

const ResultCard = styled.div`
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
  background: #ffffff;
  min-height: 160px;
`;

const Placeholder = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 128px;
  width: 100%;
  color: #6b7280;
  font-size: 14px;
  text-align: center;
`;

const ResultGrid = styled.div`
  display: grid;
  grid-template-columns: 130px max-content max-content;
  column-gap: 10px;
  row-gap: 10px;
  width: fit-content;
  max-width: 100%;
  justify-content: start;
  justify-items: start;
  align-items: center;
`;

const StatusBadge = styled.span<{ $success: boolean }>`
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
  background: ${({ $success }) => ($success ? "#dcfce7" : "#fee2e2")};
  color: ${({ $success }) => ($success ? "#166534" : "#991b1b")};
`;

const InfoRow = styled.div`
  display: contents;
`;

const InfoLabel = styled.span`
  color: #6b7280;
  font-size: 13px;
  white-space: nowrap;
`;

const InfoValue = styled.span`
  color: #111827;
  font-size: 14px;
  overflow-wrap: anywhere;
`;

const CodeValue = styled.code`
  display: inline-block;
  font-family: Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 13px;
  color: #111827;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 4px 8px;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
`;

const ActionCell = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  justify-self: start;
  white-space: nowrap;
`;
