import { useState } from "react";
import { useCreateRegistrarTxtRecordMutation } from "@entities/registrars/api";
import type { RegistrarProviderType } from "@entities/registrars/types";
import { useRegistrarSelectOptions } from "@entities/registrars/select-options";
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
  TextInput,
  useToast,
} from "@shared/ui";

type ActionsSectionCreateTxtRecordProps = {
  fixedRegistrar?: RegistrarProviderType | null;
  fixedProfile?: string | null;
};

export const CreateTxtRecord = ({ fixedRegistrar, fixedProfile }: ActionsSectionCreateTxtRecordProps = {}) => {
  const [host, setHost] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("");
  const [activeRegistrar, setActiveRegistrar] = useState<RegistrarProviderType | null>(null);
  const [activeProfile, setActiveProfile] = useState<string | null>(null);

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

  const [createTxtRecord, { isLoading: isCreateLoading }] = useCreateRegistrarTxtRecordMutation();

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
    const trimmedHost = host.trim();
    const normalizedHost = trimmedHost === "" ? "@" : trimmedHost;

    if (!selectedDomain) {
      showToast({ variant: "error", message: "Выберите домен." });
      return;
    }
    if (!resolvedRegistrar || !resolvedProfile) {
      showToast({ variant: "error", message: "Выберите регистратора и профиль." });
      return;
    }

    try {
      const response = await createTxtRecord({
        registrar: resolvedRegistrar,
        profileId: resolvedProfile,
        domain: selectedDomain,
        subdomain: normalizedHost,
        text: "",
      }).unwrap();
      setHost("");
      const note = response.note ? ` (${response.note})` : "";
      showToast({ variant: "success", message: `TXT-запись создана${note}.` });
    } catch {
      showToast({ variant: "error", message: "Ошибка создания TXT-записи." });
    }
  };

  const showDomainsEmptyHint = resolvedRegistrar && resolvedProfile && domainOptions.length === 0;
  const showProfilesEmptyHint = registrarGroups.length === 0;

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
              <TextInput
                value={host}
                onChange={(event) => setHost(event.target.value)}
                placeholder="@ или www"
              />
            </FormField>
          </FormFields>
          <FormActions>
            <Button type="button" variant="primary" onClick={handleSubmit} disabled={isCreateLoading}>
              {isCreateLoading ? "Создание..." : "Создать"}
            </Button>
          </FormActions>
        </FormRow>
      </FormCard>
      {showDomainsEmptyHint && <InlineHint>Нет доменов для выбранного профиля.</InlineHint>}
      {showProfilesEmptyHint && <InlineHint>Сначала синхронизируйте домены.</InlineHint>}
    </FormStack>
  );
};
