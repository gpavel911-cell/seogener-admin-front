"use client";

import { useState } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import styled from "styled-components";
import {
  type GoogleSitemapStatus,
  useGetGoogleSitemapStatusQuery,
  useLazyPreviewGoogleSitemapQuery,
  useSubmitGoogleSitemapMutation,
} from "@entities/webmaster/api";
import { useWebmasterSelectOptions } from "@entities/webmaster/select-options";
import { WebmasterProviderType, type WebmasterHostOptionDto } from "@entities/webmaster/types";
import { Button, FieldLabel, FormCard, FormField, FormFields, FormStack, SelectControl } from "@shared/ui";

// Domain properties only: keep the exact host from the selected sc-domain property.
const isDomainProperty = (host: WebmasterHostOptionDto) => /^sc-domain:[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i.test(host.value);

export const GoogleSitemap = ({ fixedProfile }: { fixedProfile?: string | null }) => {
  const [activeProfile, setActiveProfile] = useState<string | null>(null);
  const [hostId, setHostId] = useState("");
  const [preview, setPreview] = useState<{ key: string; data: GoogleSitemapStatus } | null>(null);
  const [submittedResult, setSubmittedResult] = useState<{ key: string; data: GoogleSitemapStatus } | null>(null);
  const [confirmedUrl, setConfirmedUrl] = useState("");
  const [error, setError] = useState("");
  const { resolvedProfile, resolvedHostId, profileOptions, hostOptions, isProfilesFetching, isHostsFetching } = useWebmasterSelectOptions({
    activeProfile,
    fixedProfile,
    fixedProvider: WebmasterProviderType.GOOGLE_SEARCH_CONSOLE,
    activeHostId: hostId,
    hostFilter: isDomainProperty,
  });
  const domain = resolvedHostId.startsWith("sc-domain:") ? resolvedHostId.slice("sc-domain:".length) : "";
  const request = resolvedProfile && domain && !isHostsFetching ? { profile: resolvedProfile, domain } : null;
  const key = JSON.stringify([resolvedProfile, domain]);
  const { currentData: status, isFetching: statusLoading, isError: statusError, refetch } = useGetGoogleSitemapStatusQuery(request ?? skipToken, { refetchOnMountOrArgChange: true });
  const [loadPreview, { isFetching: previewLoading }] = useLazyPreviewGoogleSitemapQuery();
  const [submit, { isLoading: submitLoading }] = useSubmitGoogleSitemapMutation();
  const busy = statusLoading || previewLoading || submitLoading;
  const currentPreview = preview?.key === key ? preview.data : null;
  const result = submittedResult?.key === key ? submittedResult.data : currentPreview ?? status;
  const canSubmit = Boolean(request && status && !statusError && currentPreview?.ready && currentPreview.domain === domain && currentPreview.propertyUrl === resolvedHostId && currentPreview.verified && currentPreview.propertyPresent && !currentPreview.submitted && currentPreview.sha256 && confirmedUrl === currentPreview.sitemapUrl && !busy);

  const reset = () => {
    setPreview(null);
    setSubmittedResult(null);
    setConfirmedUrl("");
    setError("");
  };
  const previewSitemap = async () => {
    if (!request || !status || statusError || busy) return;
    reset();
    try {
      const data = await loadPreview(request, false).unwrap();
      setPreview({ key, data });
    } catch {
      setError("Не удалось проверить публичный sitemap. Отправка недоступна. Обновите статус и повторите проверку.");
    }
  };
  const submitSitemap = async () => {
    if (!canSubmit || !request || !currentPreview?.sha256) return;
    const expectedSha256 = currentPreview.sha256;
    // Consume the preview before the request: an uncertain outcome requires a new status and preview.
    setPreview(null);
    setConfirmedUrl("");
    setError("");
    try {
      const data = await submit({ ...request, expectedSha256 }).unwrap();
      setSubmittedResult({ key, data });
      void refetch();
    } catch {
      setError("Отправка не подтверждена. Обновите статус перед новой проверкой sitemap.");
      void refetch();
    }
  };

  return (
    <FormStack>
      <FormCard>
        <SitemapFields>
          {!fixedProfile && <SitemapField>
            <FieldLabel>Профиль Google</FieldLabel>
            <SelectControl value={resolvedProfile ?? ""} options={profileOptions} disabled={busy || isProfilesFetching} onValueChange={(value) => { reset(); setActiveProfile(value); setHostId(""); }} placeholder="Выберите профиль" />
          </SitemapField>}
          <SitemapField>
            <FieldLabel>Домен Google Search Console</FieldLabel>
            <SelectControl value={resolvedHostId} options={hostOptions} disabled={busy || isHostsFetching} onValueChange={(value) => { reset(); setHostId(value); }} placeholder={hostOptions.length ? "Выберите домен" : "Нет доменных ресурсов"} />
          </SitemapField>
        </SitemapFields>
      </FormCard>
      <Panel aria-busy={busy}>
        {!request ? <p>Выберите доменный ресурс (sc-domain) в текущем профиле Google.</p> : <>
          <p><strong>Профиль:</strong> {resolvedProfile}<br /><strong>Ресурс:</strong> {resolvedHostId}</p>
          {statusLoading && <p role="status">Загрузка статуса Google…</p>}
          {statusError && <p role="alert">Не удалось получить статус Google. Обновите статус.</p>}
          {result && <>
            <Stages>
              <li>Домен в Google: <strong>{result.propertyPresent ? "Присутствует" : "Не найден"}</strong></li>
              <li>Права Google: <strong>{result.verified ? "Подтверждены" : "Не подтверждены"}</strong></li>
              <li>Публичный sitemap: <strong>{currentPreview?.submitted ? "Отправлен ранее; новая проверка не выполнялась" : currentPreview ? (currentPreview.ready ? "Проверен, готов к отправке" : "Проверка не пройдена") : "Требуется проверка"}</strong></li>
              <li>Sitemap в Google: <strong>{result.submitted ? (result.pending ? "Отправлен, ожидает обработки Google" : "Отправлен") : "Не отправлен"}</strong></li>
            </Stages>
            <p>TXT: проверяется в «Проверить права DNS (мн.)».</p>
            <p><strong>URL sitemap:</strong> <Url>{result.sitemapUrl}</Url></p>
            {result.urlCount !== null && <p>URL в sitemap: {result.urlCount}</p>}
            <p>Ошибки Google: {result.errors}; предупреждения: {result.warnings}.</p>
            {result.lastSubmitted && <p>Последняя отправка: {result.lastSubmitted}</p>}
            <p role="status">{result.message}</p>
          </>}
          <Actions>
            <Button type="button" variant="secondary" disabled={busy} onClick={() => { reset(); void refetch(); }}>Обновить статус</Button>
            <Button type="button" variant="secondary" disabled={busy || !status || statusError} onClick={() => void previewSitemap()}>{previewLoading ? "Проверка…" : "Проверить публичный sitemap"}</Button>
          </Actions>
          {currentPreview?.ready && !currentPreview.submitted && currentPreview.sha256 && <Confirmation>
            <input type="checkbox" disabled={busy} checked={confirmedUrl === currentPreview.sitemapUrl} onChange={(event) => setConfirmedUrl(event.target.checked ? currentPreview.sitemapUrl : "")} />
            <span>Подтверждаю отправку в Google ресурса {currentPreview.propertyUrl}: <Url>{currentPreview.sitemapUrl}</Url></span>
          </Confirmation>}
          <Button type="button" variant="primary" disabled={!canSubmit} onClick={() => void submitSitemap()}>{submitLoading ? "Отправка…" : "Отправить sitemap в Google"}</Button>
          {error && <p role="alert">{error}</p>}
        </>}
      </Panel>
    </FormStack>
  );
};

const Panel = styled.section`
  padding: 20px;
  border: 1px solid ${({ theme }) => theme.tokens.color.borderSubtle};
  border-radius: ${({ theme }) => theme.tokens.radius.md};
  background: ${({ theme }) => theme.tokens.color.bgSurface};
  color: ${({ theme }) => theme.tokens.color.textPrimary};
  min-width: 0;
  overflow-wrap: anywhere;
  p { margin: 0 0 14px; }
`;
const SitemapFields = styled(FormFields)`
  flex-wrap: wrap;
  min-width: 0;
`;
const SitemapField = styled(FormField)`
  flex: 1 1 300px;
  width: 100%;
  min-width: 0;
  max-width: 100%;
`;
const Stages = styled.ol`
  padding-left: 22px;
  line-height: 1.6;
`;
const Url = styled.code`
  overflow-wrap: anywhere;
  word-break: break-word;
`;
const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
`;
const Confirmation = styled.label`
  display: flex;
  gap: 10px;
  align-items: flex-start;
  margin: 0 0 16px;
  input { margin-top: 4px; flex-shrink: 0; }
`;
