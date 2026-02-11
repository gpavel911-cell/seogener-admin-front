"use client";

import { useMemo, useState } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import { useGetRegistrarDomainsQuery, useGetRegistrarProfilesQuery } from "@entities/registrars/api";
import { RegistrarProviderType } from "@entities/registrars/types";
import styled from "styled-components";
import {
  useCreateWebmasterHostMutation,
  useGetWebmasterProfilesQuery,
} from "@entities/webmaster/api";
import {
  type WebmasterApiResponse,
  WebmasterProviderType,
} from "@entities/webmaster/types";
import { buildRegistrarGroups } from "@shared/lib/registrars";
import { Button, useToast } from "@shared/ui";

const DEFAULT_PROVIDER = WebmasterProviderType.YANDEX_WEBMASTER;

type ActionsSectionWebmasterAddHostProps = {
  fixedProfile?: string | null;
};

export const AddHost = ({ fixedProfile }: ActionsSectionWebmasterAddHostProps = {}) => {
  const { showToast } = useToast();
  const [activeProfile, setActiveProfile] = useState<string | null>(null);
  const [activeRegistrar, setActiveRegistrar] = useState<RegistrarProviderType | null>(null);
  const [activeRegistrarProfile, setActiveRegistrarProfile] = useState<string | null>(null);
  const [domain, setDomain] = useState("");
  const [resultByProfile, setResultByProfile] = useState<{
    profile: string;
    data: WebmasterApiResponse;
  } | null>(null);

  const { data: profilesRaw, isFetching: isProfilesFetching } = useGetWebmasterProfilesQuery();
  const profiles = useMemo(
    () => (profilesRaw ?? []).filter((profile) => profile.provider === DEFAULT_PROVIDER),
    [profilesRaw],
  );
  const resolvedProfile = useMemo(
    () => fixedProfile ?? activeProfile ?? profiles?.[0]?.profile ?? null,
    [fixedProfile, activeProfile, profiles],
  );
  const result = useMemo(
    () => (resolvedProfile && resultByProfile?.profile === resolvedProfile ? resultByProfile.data : null),
    [resolvedProfile, resultByProfile],
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

  const domainsQueryArgs = resolvedRegistrar && resolvedRegistrarProfile
    ? { pageNumber: 0, pageSize: 200, profile: resolvedRegistrarProfile, registrar: resolvedRegistrar }
    : skipToken;
  const { data: domainsData, isFetching: isDomainsFetching } = useGetRegistrarDomainsQuery(domainsQueryArgs);
  const domainOptions = useMemo(
    () => (domainsData?.content ?? []).map((item) => item.domainName),
    [domainsData?.content],
  );
  const resolvedDomain = useMemo(() => {
    if (domain && domainOptions.includes(domain)) {
      return domain;
    }
    return domainOptions[0] ?? "";
  }, [domain, domainOptions]);
  const hostUrl = useMemo(
    () => (resolvedDomain ? `https://${resolvedDomain}/` : ""),
    [resolvedDomain],
  );

  const [addHost, { isLoading }] = useCreateWebmasterHostMutation();

  const handleSubmit = async () => {
    if (!resolvedProfile) {
      showToast({ variant: "error", message: "Выберите профиль Вебмастера." });
      return;
    }
    if (!resolvedDomain) {
      showToast({ variant: "error", message: "Выберите домен." });
      return;
    }
    try {
      const response = await addHost({
        provider: DEFAULT_PROVIDER,
        profile: resolvedProfile,
        hostUrl,
      }).unwrap();

      setResultByProfile({
        profile: resolvedProfile,
        data: response,
      });
      showToast({ variant: "success", message: "Сайт добавлен." });
    } catch {
      showToast({ variant: "error", message: "Ошибка добавления сайта." });
    }
  };

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
                  setDomain("");
                }}
                disabled={isRegistrarProfilesFetching}
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
              <Label>Профиль регистратора</Label>
              <Select
                value={resolvedRegistrarProfile ?? ""}
                onChange={(event) => {
                  setActiveRegistrarProfile(event.target.value || null);
                  setDomain("");
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
              <Label>Домен</Label>
              <Select
                value={resolvedDomain}
                onChange={(event) => setDomain(event.target.value)}
                disabled={!resolvedRegistrar || !resolvedRegistrarProfile || isDomainsFetching}
              >
                <option value="">Выберите домен</option>
                {domainOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
            </FormField>
          </FormFields>
          <Actions>
            <ActionButton type="button" onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? "Добавление..." : "Добавить"}
            </ActionButton>
          </Actions>
        </FormRow>
      </FormCard>
      {!isDomainsFetching && domainOptions.length === 0 && (
        <HintBlock>Нет доступных доменов. Сначала синхронизируйте домены в разделе Регистраторы.</HintBlock>
      )}
      <ResultCard>
        {result ? <JsonBlock>{JSON.stringify(result, null, 2)}</JsonBlock> : <Placeholder>Нет данных.</Placeholder>}
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

const HintBlock = styled.div`
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 12px 16px;
  background: #f9fafb;
  color: #374151;
  font-size: 13px;
`;

const ResultCard = styled.div`
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
  background: #ffffff;
  min-height: 160px;
`;

const JsonBlock = styled.pre`
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 12px;
  color: #111827;
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
