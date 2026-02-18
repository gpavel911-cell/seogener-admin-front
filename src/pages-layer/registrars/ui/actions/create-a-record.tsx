import { useState } from "react";
import { useCreateRegistrarARecordMutation } from "@entities/registrars/api";
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

const IPV4_REGEX = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

type ActionsSectionCreateARecordProps = {
  fixedRegistrar?: RegistrarProviderType | null;
  fixedProfile?: string | null;
};

export const CreateARecord = ({ fixedRegistrar, fixedProfile }: ActionsSectionCreateARecordProps = {}) => {
  const [host, setHost] = useState("");
  const [ipv4, setIpv4] = useState("");
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

  const [createARecord, { isLoading: isCreateLoading }] = useCreateRegistrarARecordMutation();

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
    const trimmedIpv4 = ipv4.trim();

    if (!selectedDomain) {
      showToast({ variant: "error", message: "Выберите домен." });
      return;
    }
    if (!trimmedIpv4) {
      showToast({ variant: "error", message: "Введите IPv4-адрес." });
      return;
    }
    if (!IPV4_REGEX.test(trimmedIpv4)) {
      showToast({ variant: "error", message: "Некорректный IPv4-адрес." });
      return;
    }
    if (!resolvedRegistrar || !resolvedProfile) {
      showToast({ variant: "error", message: "Выберите регистратора и профиль." });
      return;
    }

    try {
      const response = await createARecord({
        registrar: resolvedRegistrar,
        profileId: resolvedProfile,
        domain: selectedDomain,
        subdomain: normalizedHost,
        ipv4: trimmedIpv4,
      }).unwrap();
      setHost("");
      setIpv4("");
      const note = response.note ? ` (${response.note})` : "";
      showToast({ variant: "success", message: `A-запись создана${note}.` });
    } catch {
      showToast({ variant: "error", message: "Ошибка создания A-записи." });
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
            <FormField>
              <FieldLabel>IPv4</FieldLabel>
              <TextInput
                value={ipv4}
                onChange={(event) => setIpv4(event.target.value)}
                placeholder="111.222.111.222"
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

