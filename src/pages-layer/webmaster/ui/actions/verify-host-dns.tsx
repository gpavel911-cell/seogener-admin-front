"use client";

import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import {
  useCreateRegistrarTxtRecordMutation,
  useLazyGetRegistrarDnsRecordsQuery,
} from "@entities/registrars/api";
import {
  RegistrarProviderType,
} from "@entities/registrars/types";
import {
  useVerifyWebmasterHostDnsMutation,
} from "@entities/webmaster/api";
import { type WebmasterHostVerifyDnsResponse, WebmasterProviderType } from "@entities/webmaster/types";
import { useRegistrarSelectOptions } from "@entities/registrars/select-options";
import { useWebmasterSelectOptions } from "@entities/webmaster/select-options";
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
  PlaceholderText,
  ResultLoader,
  ResultCard,
  SelectControl,
  useToast,
} from "@shared/ui";

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

  const {
    resolvedProfile,
    profileOptions: webmasterProfileOptions,
    hostOptions: hostSelectOptions,
    resolvedHostId: resolvedHostEntityId,
    isProfilesFetching,
    isHostsFetching,
  } = useWebmasterSelectOptions({
    activeProfile,
    fixedProfile: fixedProfile ?? null,
    fixedProvider: DEFAULT_PROVIDER,
    activeHostId: selectedHostId,
  });

  const {
    registrarGroups,
    resolvedRegistrar,
    resolvedProfile: resolvedRegistrarProfile,
    registrarOptions,
    profileOptions: registrarProfileOptions,
    isProfilesFetching: isRegistrarProfilesFetching,
  } = useRegistrarSelectOptions({
    activeRegistrar,
    activeProfile: activeRegistrarProfile,
    preferredRegistrar: RegistrarProviderType.REG_RU,
    includeDomains: false,
  });

  const resolvedDomain = useMemo(
    () => normalizeDomain(extractWebsite(undefined, resolvedHostEntityId)),
    [resolvedHostEntityId],
  );
  const resolvedHostId = resolvedHostEntityId;
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
    if (!resolvedProfile || !resolvedDomain || !resolvedHostId) {
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
    if (!resolvedHostId) {
      showToast({ variant: "error", message: "Для выбранного домена нет площадки в Вебмастере. Сначала добавьте сайт." });
      return;
    }
    try {
      const response = await verifyHostDns({
        provider: DEFAULT_PROVIDER,
        profile: resolvedProfile,
        hostId: resolvedHostId,
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
    if (!resolvedProfile || !resolvedDomain || !resolvedHostId) {
      showToast({ variant: "error", message: "Сначала выберите профиль, домен и площадку Вебмастера." });
      return;
    }
    try {
      const response = await verifyHostDns({
        provider: DEFAULT_PROVIDER,
        profile: resolvedProfile,
        hostId: resolvedHostId,
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
      && resolvedHostId,
  );
  const disableCreateTxt = !canCreateTxt || isVerified || resolvedTxtPresence === true || isTxtCreating || isTxtChecking;
  const disableStartVerification = !canStartVerification || isVerifying || isPollingStatus || isVerified || resolvedTxtPresence !== true;

  return (
    <FormStack>
      <FormCard>
        <FormRow>
          <FormFields>
            {!fixedProfile && (
              <FormField>
                <FieldLabel>Профиль Вебмастера</FieldLabel>
                <SelectControl
                  value={resolvedProfile ?? ""}
                  onValueChange={setActiveProfile}
                  disabled={isProfilesFetching}
                  options={webmasterProfileOptions}
                  placeholder="Выберите профиль"
                />
              </FormField>
            )}
            <FormField>
              <FieldLabel>Регистратор</FieldLabel>
              <SelectControl
                value={resolvedRegistrar ?? ""}
                onValueChange={(value) => {
                  const nextRegistrar = value as RegistrarProviderType;
                  setActiveRegistrar(nextRegistrar || null);
                  const nextProfiles = registrarGroups.find((group) => group.registrar === nextRegistrar)?.profiles ?? [];
                  setActiveRegistrarProfile(nextProfiles[0] ?? null);
                }}
                disabled={isRegistrarProfilesFetching}
                options={registrarOptions}
                placeholder="Выберите регистратора"
              />
            </FormField>
            <FormField>
              <FieldLabel>Профиль регистратора</FieldLabel>
              <SelectControl
                value={resolvedRegistrarProfile ?? ""}
                onValueChange={(value) => {
                  setActiveRegistrarProfile(value || null);
                }}
                disabled={!resolvedRegistrar}
                options={registrarProfileOptions}
                placeholder="Выберите профиль"
              />
            </FormField>
            <FormField>
              <FieldLabel>Сайт</FieldLabel>
              <SelectControl
                value={resolvedHostEntityId}
                onValueChange={(value) => {
                  setSelectedHostId(value);
                  setResultBySelection(null);
                  setIsPollingStatus(false);
                  setPollAttempt(0);
                }}
                disabled={!resolvedProfile || isHostsFetching}
                options={hostSelectOptions}
                placeholder={hostSelectOptions.length ? "Выберите сайт" : "Нет сайтов в Вебмастере"}
              />
            </FormField>
          </FormFields>
          <FormActions>
            <Button
              type="button"
              variant="primary"
              onClick={handleLoadVerificationCode}
              disabled={isVerifying || isPollingStatus || isHostsFetching}
            >
              Проверить статус
            </Button>
          </FormActions>
        </FormRow>
      </FormCard>

      <ResultCard>
        {isVerifying || isTxtCreating || isTxtChecking || isPollingStatus ? (
          <ResultLoader label="Проверка данных..." />
        ) : !result ? (
          <CenteredState>
            <PlaceholderText>Нет данных для отображения.</PlaceholderText>
          </CenteredState>
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
                <Button type="button" variant="primary" onClick={handleCreateTxt} disabled={disableCreateTxt}>
                  {isTxtCreating ? "Сохранение..." : "Создать TXT-запись"}
                </Button>
              </ActionCell>
            </InfoRow>
            <InfoRow>
              <InfoLabel>Статус</InfoLabel>
              <InfoValue>{result.verificationState}</InfoValue>
              <ActionCell>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleStartVerification}
                  disabled={disableStartVerification}
                >
                  {isVerifying || isPollingStatus ? "Проверка..." : "Запустить проверку"}
                </Button>
              </ActionCell>
            </InfoRow>
          </ResultGrid>
        )}
      </ResultCard>
    </FormStack>
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
  color: ${({ theme }) => theme.tokens.color.textMuted};
  font-size: 13px;
  white-space: nowrap;
`;

const InfoValue = styled.span`
  color: ${({ theme }) => theme.tokens.color.textPrimary};
  font-size: 14px;
  overflow-wrap: anywhere;
`;

const CodeValue = styled.code`
  display: inline-block;
  font-family: Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 13px;
  color: ${({ theme }) => theme.tokens.color.textPrimary};
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
