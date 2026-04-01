"use client";

import { useState } from "react";
import { useCreateRegistrarARecordMutation } from "@entities/registrars/api";
import type { RegistrarProviderType } from "@entities/registrars/types";
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
  ResultCard,
  SelectControl,
  StyledInput,
  useToast,
} from "@shared/ui";

type CreateARecordProps = {
  fixedRegistrar?: RegistrarProviderType | null;
  fixedProfile?: string | null;
};

export const CreateARecord = ({ fixedRegistrar, fixedProfile }: CreateARecordProps = {}) => {
  const [selectedDomain, setSelectedDomain] = useState("");
  const [subdomain, setSubdomain] = useState("@");
  const [ipv4, setIpv4] = useState("");
  const [activeRegistrar, setActiveRegistrar] = useState<RegistrarProviderType | null>(null);
  const [activeProfile, setActiveProfile] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState("");
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

  const [createARecord, { isLoading: isCreateLoading }] = useCreateRegistrarARecordMutation();

  const handleRegistrarChange = (value: RegistrarProviderType | "") => {
    if (!value) {
      setActiveRegistrar(null);
      setActiveProfile(null);
      setSelectedDomain("");
      setResultMessage("");
      return;
    }
    const nextGroup = registrarGroups.find((group) => group.registrar === value);
    setActiveRegistrar(value);
    setActiveProfile(nextGroup?.profiles[0] ?? null);
    setSelectedDomain("");
    setResultMessage("");
  };

  const handleProfileChange = (value: string) => {
    setActiveProfile(value || null);
    setSelectedDomain("");
    setResultMessage("");
  };

  const handleCreate = async () => {
    if (!resolvedRegistrar || !resolvedProfile) {
      showToast({ variant: "error", message: "Выберите регистратора и профиль." });
      return;
    }
    if (!selectedDomain) {
      showToast({ variant: "error", message: "Выберите домен." });
      return;
    }
    if (!ipv4.trim()) {
      showToast({ variant: "error", message: "Укажите IPv4." });
      return;
    }
    try {
      const response = await createARecord({
        registrar: resolvedRegistrar,
        profileId: resolvedProfile,
        domain: selectedDomain,
        subdomain: subdomain.trim() || "@",
        ipv4: ipv4.trim(),
      }).unwrap();
      const note = response.note ? ` (${response.note})` : "";
      const message = `A-запись создана${note}.`;
      setResultMessage(message);
      showToast({ variant: "success", message });
    } catch (error) {
      const message =
        typeof error === "object" && error !== null && "data" in error
          ? (error as { data?: { message?: string } }).data?.message
          : undefined;
      showToast({ variant: "error", message: message || "Не удалось создать A-запись." });
    }
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
                onValueChange={setSelectedDomain}
                disabled={!resolvedRegistrar || !resolvedProfile || isDomainsFetching}
                options={domainOptions}
                placeholder="Выберите домен"
              />
            </FormField>
            <FormField>
              <FieldLabel>Хост (поддомен)</FieldLabel>
              <StyledInput value={subdomain} onChange={(event) => setSubdomain(event.target.value)} placeholder="@" />
            </FormField>
            <FormField>
              <FieldLabel>IPv4</FieldLabel>
              <StyledInput value={ipv4} onChange={(event) => setIpv4(event.target.value)} placeholder="0.0.0.0" />
            </FormField>
          </FormFields>
          <FormActions>
            <Button type="button" variant="primary" onClick={handleCreate} disabled={isCreateLoading}>
              {isCreateLoading ? "Создание..." : "Создать A-запись"}
            </Button>
          </FormActions>
        </FormRow>
      </FormCard>
      <ResultCard>
        {resultMessage ? (
          <CenteredState>
            <PlaceholderText>{resultMessage}</PlaceholderText>
          </CenteredState>
        ) : (
          <CenteredState>
            <PlaceholderText>Нет данных для отображения.</PlaceholderText>
          </CenteredState>
        )}
      </ResultCard>
    </FormStack>
  );
};
