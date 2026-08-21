"use client";

import { useState } from "react";
import {
  useDownloadGeneratorExportMutation,
  useGetGeneratorResultsQuery,
  useSaveGeneratorAnalyticsMutation,
} from "@entities/generator/api";
import type { GeneratorProjectSnapshot } from "@entities/generator/types";
import { Button, PlaceholderText, ResultLoader, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, TableWrapper, useToast } from "@shared/ui";
import { apiErrorMessage } from "../../lib/api-error";
import { formatRunAt } from "../../lib/wizard";
import {
  ConstrainedField,
  FieldRow,
  FormSection,
  FormSectionHeading,
  StepStack,
  WizardActions,
  WizardFieldLabel,
  WizardInput,
} from "../fields";

type Props = {
  snapshot: GeneratorProjectSnapshot;
};

const SITE_STATUS_LABEL: Record<string, string> = {
  created: "Черновик",
  content: "В процессе",
  images: "В процессе",
  build: "В процессе",
  deploy: "В процессе",
  done: "Завершено",
  error: "Ошибка",
};

export function ResultsStep({ snapshot }: Props) {
  const { showToast } = useToast();
  const { data, isLoading, error } = useGetGeneratorResultsQuery(snapshot.id);
  const [metrikaId, setMetrikaId] = useState("");
  const [ga4Id, setGa4Id] = useState("");
  const [saveAnalytics, { isLoading: isSavingAnalytics }] = useSaveGeneratorAnalyticsMutation();
  const [downloadExport, { isLoading: isExporting }] = useDownloadGeneratorExportMutation();

  if (error) {
    return <PlaceholderText>{apiErrorMessage(error, "Не удалось загрузить результаты.")}</PlaceholderText>;
  }
  if (isLoading) {
    return <ResultLoader label="Загрузка результатов..." />;
  }

  const sites = data?.sites ?? [];
  const pages = data?.pages ?? [];

  const handleExport = async (domain: string) => {
    try {
      const blob = await downloadExport({ id: snapshot.id, domain }).unwrap();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${domain}.zip`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      showToast({ variant: "error", message: apiErrorMessage(err, "Не удалось скачать архив.") });
    }
  };

  const handleAnalytics = async () => {
    try {
      await saveAnalytics({ id: snapshot.id, metrikaId, ga4Id }).unwrap();
      showToast({ variant: "success", message: "Аналитика сохранена" });
    } catch (err) {
      showToast({ variant: "error", message: apiErrorMessage(err, "Не удалось сохранить аналитику.") });
    }
  };

  return (
    <StepStack>
      <FormSection>
        <FormSectionHeading tooltip="Готовые сайты по доменам. Zip можно скачать, если генерация завершилась успешно.">
          Готовые сайты
        </FormSectionHeading>
        {sites.length === 0 ? (
          <PlaceholderText>Нет результатов генерации.</PlaceholderText>
        ) : (
          <TableWrapper>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Домен</TableHeaderCell>
                  <TableHeaderCell>Услуга</TableHeaderCell>
                  <TableHeaderCell>Страниц</TableHeaderCell>
                  <TableHeaderCell>Последний запуск</TableHeaderCell>
                  <TableHeaderCell>Статус</TableHeaderCell>
                  <TableHeaderCell>Экспорт</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sites.map((site) => (
                  <TableRow key={site.domain}>
                    <TableCell>{site.domain}</TableCell>
                    <TableCell>{site.service || "—"}</TableCell>
                    <TableCell>{site.pagesCount}</TableCell>
                    <TableCell>{formatRunAt(site.lastRunAt)}</TableCell>
                    <TableCell>{SITE_STATUS_LABEL[site.status ?? ""] || site.status || "—"}</TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        disabled={!site.exportAvailable || isExporting}
                        onClick={() => void handleExport(site.domain)}
                      >
                        Скачать zip
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableWrapper>
        )}
      </FormSection>

      {pages.length ? (
        <FormSection>
          <FormSectionHeading tooltip="Список сгенерированных страниц по каждому домену и их статус.">
            Страницы
          </FormSectionHeading>
          <TableWrapper>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Домен</TableHeaderCell>
                  <TableHeaderCell>Страница</TableHeaderCell>
                  <TableHeaderCell>Статус</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pages.map((page) => (
                  <TableRow key={`${page.domain}-${page.path}`}>
                    <TableCell>{page.domain}</TableCell>
                    <TableCell>{page.path}</TableCell>
                    <TableCell>{SITE_STATUS_LABEL[page.status ?? ""] || page.status || ""}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableWrapper>
        </FormSection>
      ) : null}

      <FormSection>
        <FormSectionHeading tooltip="ID вставляются во все сгенерированные страницы при следующей сборке. Аналитика загружается только если ID заполнен.">
          Аналитика
        </FormSectionHeading>
        <FieldRow>
          <ConstrainedField>
            <WizardFieldLabel tooltip="Числовой ID счётчика Яндекс.Метрики.">Яндекс.Метрика ID</WizardFieldLabel>
            <WizardInput
              value={metrikaId}
              onChange={(event) => setMetrikaId(event.target.value)}
              placeholder="12345678"
            />
          </ConstrainedField>
          <ConstrainedField>
            <WizardFieldLabel tooltip="Идентификатор потока Google Analytics 4 в формате G-XXXXXXXXXX.">
              GA4 ID
            </WizardFieldLabel>
            <WizardInput
              value={ga4Id}
              onChange={(event) => setGa4Id(event.target.value)}
              placeholder="G-XXXXXXXXXX"
            />
          </ConstrainedField>
        </FieldRow>
        <WizardActions>
          <Button type="button" disabled={isSavingAnalytics} onClick={() => void handleAnalytics()}>
            Сохранить
          </Button>
        </WizardActions>
      </FormSection>
    </StepStack>
  );
}
