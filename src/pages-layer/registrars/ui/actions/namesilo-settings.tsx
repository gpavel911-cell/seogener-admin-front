"use client";

import { useState } from "react";
import styled from "styled-components";
import {
  useCheckNameSiloProfileMutation,
  useGetNameSiloSettingsQuery,
  useSaveNameSiloProfileMutation,
} from "@entities/registrars/api";
import {
  Button,
  FieldLabel,
  FormField,
  FormStack,
  PlaceholderText,
  StyledInput,
  useToast,
} from "@shared/ui";

export function NameSiloSettings({ onSaved }: { onSaved: () => Promise<unknown> }) {
  const settings = useGetNameSiloSettingsQuery();
  const [profile, setProfile] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [save, saveState] = useSaveNameSiloProfileMutation();
  const [check, checkState] = useCheckNameSiloProfileMutation();
  const { showToast } = useToast();
  const busy = saveState.isLoading || checkState.isLoading;
  const validProfile = /^[a-z0-9][a-z0-9_-]{0,63}$/.test(profile);

  const handleSave = async () => {
    if (!validProfile || !apiKey.trim() || busy) return;
    const key = apiKey.trim();
    setApiKey("");
    try {
      await save({ profile, apiKey: key }).unwrap();
      await Promise.all([settings.refetch(), onSaved()]);
      showToast({ variant: "success", message: "Профиль NameSilo сохранён." });
    } catch {
      showToast({
        variant: "error",
        message:
          "Не удалось сохранить профиль NameSilo. Проверьте доступ и состояние профиля перед повтором.",
      });
    } finally {
      saveState.reset();
    }
  };

  const handleCheck = async (id: string) => {
    try {
      const response = await check(id).unwrap();
      showToast({
        variant: response.connected ? "success" : "error",
        message: response.connected
          ? `NameSilo подключён. Доменов: ${response.domainCount}.`
          : "NameSilo не подключён.",
      });
    } catch {
      showToast({ variant: "error", message: "Не удалось проверить подключение NameSilo." });
    } finally {
      checkState.reset();
    }
  };

  if (settings.isLoading) return <PlaceholderText>Загрузка настроек...</PlaceholderText>;
  if (settings.isError)
    return (
      <PlaceholderText>Настройки NameSilo недоступны. Требуется доступ оператора.</PlaceholderText>
    );
  if (!settings.data?.enabled)
    return <PlaceholderText>NameSilo отключён в конфигурации сервера.</PlaceholderText>;

  return (
    <FormStack>
      <PlaceholderText>
        Ключ хранится на сервере и не отображается после сохранения. Используйте отдельный профиль
        для каждого аккаунта.
      </PlaceholderText>
      {settings.data.profiles.map((item) => (
        <div key={item.profile}>
          <span>
            {item.profile}: {item.configured ? "настроен" : "не настроен"}
          </span>{" "}
          <Button
            type="button"
            disabled={busy}
            onClick={() => {
              setProfile(item.profile);
              setApiKey("");
            }}
          >
            Изменить ключ
          </Button>{" "}
          <Button
            type="button"
            disabled={busy || !item.configured}
            onClick={() => void handleCheck(item.profile)}
          >
            Проверить подключение
          </Button>
        </div>
      ))}
      <SettingsField>
        <FieldLabel id="namesilo-profile-label">Профиль</FieldLabel>
        <StyledInput
          id="namesilo-profile"
          aria-labelledby="namesilo-profile-label"
          value={profile}
          maxLength={64}
          disabled={busy}
          onChange={(event) => {
            setProfile(event.target.value);
            setApiKey("");
          }}
          placeholder="account-1"
          autoComplete="off"
        />
        <PlaceholderText>
          1–64 символа: a–z, 0–9, _ и -. Первый символ — буква или цифра.
        </PlaceholderText>
      </SettingsField>
      <SettingsField>
        <FieldLabel id="namesilo-api-key-label">API ключ NameSilo</FieldLabel>
        <StyledInput
          id="namesilo-api-key"
          aria-labelledby="namesilo-api-key-label"
          type="password"
          value={apiKey}
          autoComplete="new-password"
          disabled={busy}
          onChange={(event) => setApiKey(event.target.value)}
        />
      </SettingsField>
      <Button
        type="button"
        variant="primary"
        disabled={!validProfile || !apiKey.trim() || busy}
        onClick={() => void handleSave()}
      >
        {saveState.isLoading ? "Сохранение..." : "Сохранить ключ"}
      </Button>
    </FormStack>
  );
}

// FormField reserves horizontal width with flex-basis; this form stacks vertically.
const SettingsField = styled(FormField)`
  flex: 0 0 auto;
  width: min(100%, 420px);
  min-width: 0;
  max-width: none;
`;
