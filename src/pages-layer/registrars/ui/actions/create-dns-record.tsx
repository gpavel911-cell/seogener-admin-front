"use client";

import { useState } from "react";
import {
  useCreateRegistrarARecordMutation,
  useCreateRegistrarNsRecordMutation,
  useCreateRegistrarTxtRecordMutation,
} from "@entities/registrars/api";
import { DnsBulkRecordType, RegistrarProviderType } from "@entities/registrars/types";
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
  ResultCard,
  StyledInput,
  useToast,
} from "@shared/ui";
import { RecordTypeTabs } from "./record-type-tabs";

type CreateDnsRecordProps = {
  registrar: RegistrarProviderType;
  profile: string;
  domain: string;
};

const apiErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === "object" && error !== null && "data" in error) {
    return (error as { data?: { message?: string } }).data?.message || fallback;
  }
  return fallback;
};

export function CreateDnsRecord({ registrar, profile, domain }: CreateDnsRecordProps) {
  const isNameSilo = registrar === RegistrarProviderType.NAME_SILO;
  const [recordType, setRecordType] = useState(isNameSilo ? DnsBulkRecordType.TXT : DnsBulkRecordType.A);
  const [aHost, setAHost] = useState("@");
  const [ipv4, setIpv4] = useState("");
  const [txtHost, setTxtHost] = useState("@");
  const [text, setText] = useState("");
  const [resultMessage, setResultMessage] = useState("");
  const { showToast } = useToast();

  const [createARecord, { isLoading: isCreateALoading }] = useCreateRegistrarARecordMutation();
  const [createNsRecord, { isLoading: isCreateNsLoading }] = useCreateRegistrarNsRecordMutation();
  const [createTxtRecord, { isLoading: isCreateTxtLoading }] = useCreateRegistrarTxtRecordMutation();
  const isCreateLoading = isCreateALoading || isCreateNsLoading || isCreateTxtLoading;

  const handleCreate = async () => {
    if (isNameSilo && (recordType !== DnsBulkRecordType.TXT || !/^google-site-verification=[A-Za-z0-9_-]+$/.test(text.trim()))) {
      showToast({ variant: "error", message: "Укажите google-site-verification= с токеном Google. NameSilo поддерживает только TXT в корне домена." });
      return;
    }
    if (recordType === DnsBulkRecordType.A && !ipv4.trim()) {
      showToast({ variant: "error", message: "Укажите IPv4." });
      return;
    }
    if (recordType === DnsBulkRecordType.TXT && !text.trim()) {
      showToast({ variant: "error", message: "Укажите текст TXT-записи." });
      return;
    }
    try {
      const noteSuffix = (note?: string | null) => (note ? ` (${note})` : "");
      if (recordType === DnsBulkRecordType.A) {
        const response = await createARecord({
          registrar,
          profileId: profile,
          domain,
          subdomain: aHost.trim() || "@",
          ipv4: ipv4.trim(),
        }).unwrap();
        const message = `A-запись создана${noteSuffix(response.note)}.`;
        setResultMessage(message);
        showToast({ variant: "success", message });
        return;
      }
      if (recordType === DnsBulkRecordType.TXT) {
        const response = await createTxtRecord({
          registrar,
          profileId: profile,
          domain,
          subdomain: isNameSilo ? "@" : txtHost.trim() || "@",
          text: text.trim(),
        }).unwrap();
        if (isNameSilo && response.result !== "success") {
          const message = response.errorText || "NameSilo TXT not confirmed. Read DNS before retrying.";
          setResultMessage(message);
          showToast({ variant: "error", message });
          return;
        }
        const message = `TXT-запись создана${noteSuffix(response.note)}.`;
        setResultMessage(message);
        showToast({ variant: "success", message });
        return;
      }
      const response = await createNsRecord({
        registrar,
        profileId: profile,
        domain,
      }).unwrap();
      const message = `NS-запись создана${noteSuffix(response.note)}.`;
      setResultMessage(message);
      showToast({ variant: "success", message });
    } catch (error) {
      const fallback =
        recordType === DnsBulkRecordType.A
          ? "Не удалось создать A-запись."
          : recordType === DnsBulkRecordType.TXT
            ? "Не удалось создать TXT-запись."
            : "Не удалось создать NS-запись.";
      showToast({ variant: "error", message: apiErrorMessage(error, fallback) });
    }
  };

  return (
    <FormStack>
      {isNameSilo ? <PlaceholderText>NameSilo: только корневая TXT-запись для подтверждения Google Search Console. Хост: @.</PlaceholderText>
        : <RecordTypeTabs value={recordType} onChange={setRecordType} />}
      <FormCard>
        <FormRow>
          <FormFields>
            {recordType === DnsBulkRecordType.A ? (
              <>
                <FormField>
                  <FieldLabel>Хост (поддомен)</FieldLabel>
                  <StyledInput value={aHost} onChange={(event) => setAHost(event.target.value)} placeholder="@" />
                </FormField>
                <FormField>
                  <FieldLabel>IPv4</FieldLabel>
                  <StyledInput value={ipv4} onChange={(event) => setIpv4(event.target.value)} placeholder="0.0.0.0" />
                </FormField>
              </>
            ) : null}
            {recordType === DnsBulkRecordType.TXT ? (
              <>
                <FormField>
                  <FieldLabel>Хост (поддомен)</FieldLabel>
                  <StyledInput value={isNameSilo ? "@" : txtHost} disabled={isNameSilo} onChange={(event) => setTxtHost(event.target.value)} placeholder="@" />
                </FormField>
                <FormField>
                  <FieldLabel>Текст</FieldLabel>
                  <StyledInput value={text} onChange={(event) => setText(event.target.value)} placeholder={isNameSilo ? "google-site-verification=..." : "TXT"} />
                </FormField>
              </>
            ) : null}
          </FormFields>
          <FormActions>
            <Button type="button" variant="primary" onClick={handleCreate} disabled={isCreateLoading}>
              {isCreateLoading ? "Создание..." : "Создать"}
            </Button>
          </FormActions>
        </FormRow>
      </FormCard>
      <ResultCard>
        <CenteredState>
          <PlaceholderText>{resultMessage || "Нет данных для отображения."}</PlaceholderText>
        </CenteredState>
      </ResultCard>
    </FormStack>
  );
}
