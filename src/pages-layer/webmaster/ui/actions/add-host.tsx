"use client";

import { useMemo, useState } from "react";
import { RegistrarProviderType } from "@entities/registrars/types";
import {
  useCreateWebmasterHostMutation,
} from "@entities/webmaster/api";
import { WebmasterProviderType } from "@entities/webmaster/types";
import { useRegistrarSelectOptions } from "@entities/registrars/select-options";
import { useWebmasterSelectOptions } from "@entities/webmaster/select-options";
import {
  Button,
  FieldLabel,
  FormActions,
  FormCard,
  FormField,
  FormFields,
  FormRow,
  FormStack,
  InlineHint,
  SelectControl,
  useToast,
} from "@shared/ui";

const DEFAULT_PROVIDER = WebmasterProviderType.YANDEX_WEBMASTER;

type ActionsSectionWebmasterAddHostProps = {
  fixedProvider?: WebmasterProviderType | null;
  fixedProfile?: string | null;
};

export const AddHost = ({ fixedProvider, fixedProfile }: ActionsSectionWebmasterAddHostProps = {}) => {
  const { showToast } = useToast();
  const [activeProfile, setActiveProfile] = useState<string | null>(null);
  const [activeRegistrar, setActiveRegistrar] = useState<RegistrarProviderType | null>(null);
  const [activeRegistrarProfile, setActiveRegistrarProfile] = useState<string | null>(null);
  const [domain, setDomain] = useState("");
  const provider = fixedProvider ?? DEFAULT_PROVIDER;

  const {
    resolvedProfile,
    profileOptions: webmasterProfileOptions,
    isProfilesFetching,
  } = useWebmasterSelectOptions({
    activeProfile,
    fixedProfile: fixedProfile ?? null,
    fixedProvider: provider,
    includeHosts: false,
  });
  const {
    registrarGroups,
    resolvedRegistrar,
    resolvedProfile: resolvedRegistrarProfile,
    registrarOptions,
    profileOptions: registrarProfileOptions,
    domainOptions: domainSelectOptions,
    isProfilesFetching: isRegistrarProfilesFetching,
    isDomainsFetching,
  } = useRegistrarSelectOptions({
    activeRegistrar,
    activeProfile: activeRegistrarProfile,
    preferredRegistrar: RegistrarProviderType.REG_RU,
  });
  const domainOptions = useMemo(
    () => domainSelectOptions.map((item) => item.value),
    [domainSelectOptions],
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
      await addHost({
        provider,
        profile: resolvedProfile,
        hostUrl,
      }).unwrap();
      showToast({ variant: "success", message: "Сайт добавлен." });
    } catch {
      showToast({ variant: "error", message: "Ошибка добавления сайта." });
    }
  };

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
                  setDomain("");
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
                  setDomain("");
                }}
                disabled={!resolvedRegistrar}
                options={registrarProfileOptions}
                placeholder="Выберите профиль"
              />
            </FormField>
            <FormField>
              <FieldLabel>Домен</FieldLabel>
              <SelectControl
                value={resolvedDomain}
                onValueChange={setDomain}
                disabled={!resolvedRegistrar || !resolvedRegistrarProfile || isDomainsFetching}
                options={domainSelectOptions}
                placeholder="Выберите домен"
              />
            </FormField>
          </FormFields>
          <FormActions>
            <Button type="button" variant="primary" onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? "Добавление..." : "Добавить"}
            </Button>
          </FormActions>
        </FormRow>
      </FormCard>
      {!isDomainsFetching && domainOptions.length === 0 && (
        <InlineHint>Нет доступных доменов. Сначала синхронизируйте домены в разделе Регистраторы.</InlineHint>
      )}
    </FormStack>
  );
};
