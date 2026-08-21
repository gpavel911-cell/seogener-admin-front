"use client";

import { useMemo, useState } from "react";
import {
  useClusterGeneratorKeywordsMutation,
  useCollectGeneratorKeywordsMutation,
  useConfirmGeneratorKeywordsMutation,
  useDeleteGeneratorUploadMutation,
  useGetGeneratorProcessStatusQuery,
  useImportGeneratorExternalKeywordsMutation,
  useProcessGeneratorKeywordsMutation,
  useSetGeneratorKeywordLanguageMutation,
  useUploadGeneratorKeywordsMutation,
} from "@entities/generator/api";
import type {
  GeneratorCluster,
  GeneratorKeywordItem,
  GeneratorKeywordLanguage,
  GeneratorProjectSnapshot,
  GeneratorUploadType,
} from "@entities/generator/types";
import { Button, SelectControl, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, TableWrapper, useToast } from "@shared/ui";
import { apiErrorMessage } from "../../lib/api-error";
import {
  ConstrainedField,
  FieldRow,
  FormSection,
  FormSectionHeading,
  FormSectionTitle,
  StepStack,
  WizardActions,
  WizardFieldLabel,
  WizardFilePicker,
  WizardHint,
  WizardInput,
  WizardTextArea,
} from "../fields";

type Props = {
  snapshot: GeneratorProjectSnapshot;
  onSaved: (next: GeneratorProjectSnapshot) => void;
  onContinue: (next: GeneratorProjectSnapshot) => void;
};

function clusterKeywords(cluster: GeneratorCluster): string[] {
  const raw = cluster.keywords;
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        return String(record.keyword ?? record.key ?? record.phrase ?? "");
      }
      return "";
    })
    .filter((item) => item.length > 0);
}

function resolveClusters(preferred: GeneratorCluster[], snapshot: GeneratorProjectSnapshot): GeneratorCluster[] {
  if (preferred.length) {
    return preferred;
  }
  if (snapshot.rawClusters?.length) {
    return snapshot.rawClusters;
  }
  return snapshot.clusters ?? [];
}

function fileNames(files: File[]): string {
  return files.map((file) => file.name).join(", ");
}

export function KeywordsStep({ snapshot, onSaved, onContinue }: Props) {
  const { showToast } = useToast();
  const [language, setLanguage] = useState<GeneratorKeywordLanguage>(snapshot.keywordLanguage ?? "BOTH");
  const [mask, setMask] = useState(snapshot.niche ?? "");
  const [externalText, setExternalText] = useState("");
  const [keysoNames, setKeysoNames] = useState("");
  const [sfNames, setSfNames] = useState("");
  const [processStarted, setProcessStarted] = useState(false);
  const [wordstatRows, setWordstatRows] = useState<GeneratorKeywordItem[]>([]);
  const [localClusters, setLocalClusters] = useState<GeneratorCluster[]>([]);
  const [uploadKeywords, { isLoading: isUploading }] = useUploadGeneratorKeywordsMutation();
  const [deleteUpload] = useDeleteGeneratorUploadMutation();
  const [setKeywordLanguage, { isLoading: isSavingLanguage }] = useSetGeneratorKeywordLanguageMutation();
  const [processKeywords, { isLoading: isProcessing }] = useProcessGeneratorKeywordsMutation();
  const [clusterKeywordsRequest, { isLoading: isClustering }] = useClusterGeneratorKeywordsMutation();
  const [collectKeywords, { isLoading: isCollecting }] = useCollectGeneratorKeywordsMutation();
  const [confirmKeywords, { isLoading: isConfirming }] = useConfirmGeneratorKeywordsMutation();
  const [importExternalKeywords, { isLoading: isImporting }] = useImportGeneratorExternalKeywordsMutation();
  const processStatusQuery = useGetGeneratorProcessStatusQuery(snapshot.id, {
    skip: !processStarted,
    pollingInterval: processStarted ? 2000 : 0,
  });
  const processStatus = processStatusQuery.data?.status;
  const processError = processStatusQuery.data?.error;

  const previewClusters = useMemo(() => resolveClusters(localClusters, snapshot), [localClusters, snapshot]);

  const persistLanguage = async (current: GeneratorProjectSnapshot): Promise<GeneratorProjectSnapshot> => {
    if (language === current.keywordLanguage) {
      return current;
    }
    return setKeywordLanguage({ id: current.id, language }).unwrap();
  };

  const handleUpload = async (type: GeneratorUploadType, files: File[]) => {
    if (!files.length) {
      return;
    }
    try {
      let next = snapshot;
      for (const file of files) {
        next = await uploadKeywords({ id: snapshot.id, file, type }).unwrap();
      }
      onSaved(next);
      if (type === "KEYSO") {
        setKeysoNames(fileNames(files));
      } else {
        setSfNames(fileNames(files));
      }
      showToast({ variant: "success", message: files.length > 1 ? "Файлы загружены" : "Файл загружен" });
    } catch (error) {
      showToast({ variant: "error", message: apiErrorMessage(error, "Не удалось загрузить файл.") });
    }
  };

  const handleDelete = async (filename: string, type: GeneratorUploadType) => {
    try {
      const next = await deleteUpload({ id: snapshot.id, filename, type }).unwrap();
      onSaved(next);
    } catch (error) {
      showToast({ variant: "error", message: apiErrorMessage(error, "Не удалось удалить файл.") });
    }
  };

  const persistExternalKeywords = async (current: GeneratorProjectSnapshot): Promise<GeneratorProjectSnapshot> => {
    if (!externalText.trim()) {
      return current;
    }
    return importExternalKeywords({ id: current.id, text: externalText }).unwrap();
  };

  const handleProcess = async () => {
    try {
      const withExternal = await persistExternalKeywords(snapshot);
      const withLanguage = await persistLanguage(withExternal);
      const next = await processKeywords(withLanguage.id).unwrap();
      onSaved(next);
      setProcessStarted(true);
    } catch (error) {
      showToast({ variant: "error", message: apiErrorMessage(error, "Не удалось запустить обработку ключей.") });
    }
  };

  const handleCluster = async () => {
    try {
      const next = await clusterKeywordsRequest(snapshot.id).unwrap();
      onSaved(next);
      setLocalClusters([]);
      showToast({ variant: "success", message: "Кластеры построены" });
    } catch (error) {
      showToast({ variant: "error", message: apiErrorMessage(error, "Не удалось кластеризовать ключи.") });
    }
  };

  const handleCollect = async () => {
    try {
      const next = await collectKeywords({ id: snapshot.id, query: mask }).unwrap();
      onSaved(next);
      setWordstatRows(next.keywords ?? []);
      showToast({ variant: "success", message: "Ключи собраны через Wordstat" });
    } catch (error) {
      showToast({ variant: "error", message: apiErrorMessage(error, "Не удалось собрать ключи.") });
    }
  };

  const handleAddWordstat = () => {
    if (!wordstatRows.length) {
      return;
    }
    const query = mask || snapshot.niche || "кластер";
    const added = {
      service: query,
      domain_slug: query.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
      keywords: wordstatRows.map((item) => item.keyword),
      kw_count: wordstatRows.length,
    };
    setLocalClusters((current) => [...resolveClusters(current, snapshot), added]);
    setWordstatRows([]);
    showToast({ variant: "success", message: "Ключи добавлены в кластер" });
  };

  const handleContinue = async () => {
    const clusters = previewClusters.length
      ? previewClusters
      : [
          {
            service: mask || snapshot.niche || undefined,
            domain_slug: (mask || snapshot.niche || "cluster").toLowerCase().replace(/\s+/g, "-"),
            keywords: snapshot.keywords.map((item) => item.keyword),
          },
        ];
    try {
      const withExternal = await persistExternalKeywords(snapshot);
      await persistLanguage(withExternal);
    } catch (error) {
      showToast({ variant: "error", message: apiErrorMessage(error, "Не удалось сохранить ключи.") });
      return;
    }
    try {
      const next = await confirmKeywords({ id: snapshot.id, clusters }).unwrap();
      onSaved(next);
      setLocalClusters([]);
      onContinue(next);
    } catch (error) {
      showToast({ variant: "error", message: apiErrorMessage(error, "Не удалось подтвердить кластеры.") });
    }
  };

  return (
    <StepStack>
      <FormSection>
        <FormSectionTitle>Источники данных</FormSectionTitle>
        <FieldRow>
          <ConstrainedField>
            <WizardFieldLabel
              tooltip="Экспортируйте site_pages_with_keys из Keys.so по каждому конкуренту. Можно загрузить один или несколько файлов сразу (по одному файлу на каждого конкурента)."
            >
              Keys.so CSV
            </WizardFieldLabel>
            <WizardFilePicker
              accept=".csv"
              multiple
              disabled={isUploading}
              buttonLabel="Выбрать .csv"
              fileNames={keysoNames}
              onFiles={(files) => void handleUpload("KEYSO", files)}
            />
          </ConstrainedField>
          <ConstrainedField>
            <WizardFieldLabel
              tooltip="Экспортируйте Internal → All из Screaming Frog по каждому конкуренту. Можно загрузить один или несколько файлов сразу. Файл: domain.csv (где domain — домен конкурента)."
            >
              Screaming Frog CSV
            </WizardFieldLabel>
            <WizardFilePicker
              accept=".csv"
              multiple
              disabled={isUploading}
              buttonLabel="Выбрать .csv"
              fileNames={sfNames}
              onFiles={(files) => void handleUpload("SF", files)}
            />
          </ConstrainedField>
        </FieldRow>
        {snapshot.competitors?.length ? (
          <TableWrapper>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Файл</TableHeaderCell>
                  <TableHeaderCell>Тип</TableHeaderCell>
                  <TableHeaderCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {snapshot.competitors.map((item) => (
                  <TableRow key={`${item.type}-${item.filename}`}>
                    <TableCell>{item.filename || item.domain || "—"}</TableCell>
                    <TableCell>{item.type || "—"}</TableCell>
                    <TableCell>
                      {item.filename ? (
                        <Button
                          type="button"
                          onClick={() =>
                            void handleDelete(item.filename as string, item.type === "sf" ? "SF" : "KEYSO")
                          }
                        >
                          Удалить
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableWrapper>
        ) : null}
        <ConstrainedField>
          <WizardFieldLabel
            tooltip="Если ключи уже собраны отдельно (например, в Google Sheets) — вставьте их построчно: Запрос и Частотность. Дубли не тронем, новые попробуем пристроить к странице или отложим для разбора на шаге «Домены». Список подхватится при обработке или по кнопке «Далее»."
          >
            Ручной ввод ключей
          </WizardFieldLabel>
          <WizardTextArea
            value={externalText}
            onChange={(event) => setExternalText(event.target.value)}
            placeholder={"впн купить\t19953\nвпн подписка\t100785"}
          />
        </ConstrainedField>
      </FormSection>

      <FormSection>
        <FormSectionTitle>Обработка ключей</FormSectionTitle>
        <ConstrainedField>
          <WizardFieldLabel
            required
            tooltip="Для международных проектов ключи в отчётах конкурентов могут быть на двух языках сразу — выберите нужный до обработки."
          >
            Язык ключей
          </WizardFieldLabel>
          <SelectControl
            value={language}
            onValueChange={(value) => setLanguage(value as GeneratorKeywordLanguage)}
            options={[
              { value: "BOTH", label: "оба" },
              { value: "RU", label: "ru" },
              { value: "EN", label: "en" },
            ]}
          />
        </ConstrainedField>
        <WizardActions>
          <Button type="button" disabled={isProcessing || isSavingLanguage || isImporting || processStatus === "RUNNING"} onClick={() => void handleProcess()}>
            Обработать данные
          </Button>
        </WizardActions>
        {processStatus === "RUNNING" ? <WizardHint>Идёт обработка ключей...</WizardHint> : null}
        {processStatus === "DONE" ? <WizardHint>Обработка ключей завершена</WizardHint> : null}
        {processStatus === "ERROR" ? <WizardHint>{processError || "Ошибка обработки ключей"}</WizardHint> : null}
      </FormSection>

      <FormSection>
        <FormSectionTitle>Своя маска</FormSectionTitle>
        <ConstrainedField>
          <WizardFieldLabel tooltip="Если есть готовая маска или услуга — соберите по ней частотные ключи через Wordstat и сразу создайте из них кластер.">
            Своя маска
          </WizardFieldLabel>
          <WizardInput
            value={mask}
            onChange={(event) => setMask(event.target.value)}
            placeholder="ремонт стиральных машин"
          />
        </ConstrainedField>
        <WizardActions>
          <Button type="button" disabled={isCollecting} onClick={() => void handleCollect()}>
            Собрать
          </Button>
        </WizardActions>
        {wordstatRows.length ? (
          <>
            <TableWrapper>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Запрос</TableHeaderCell>
                    <TableHeaderCell>Частотность</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {wordstatRows.map((item) => (
                    <TableRow key={item.keyword}>
                      <TableCell>{item.keyword}</TableCell>
                      <TableCell>{item.frequency}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableWrapper>
            <WizardActions>
              <Button type="button" onClick={handleAddWordstat}>
                Добавить
              </Button>
            </WizardActions>
          </>
        ) : null}
      </FormSection>

      <FormSection>
        <FormSectionHeading tooltip="Группировка по похожести H1 — каждая группа станет отдельным доменом.">
          Кластеры услуг
        </FormSectionHeading>
        <WizardActions>
          <Button type="button" disabled={isClustering} onClick={() => void handleCluster()}>
            Кластеризовать
          </Button>
        </WizardActions>
        {previewClusters.length ? (
          <TableWrapper>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Кластер</TableHeaderCell>
                  <TableHeaderCell>Ключей</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {previewClusters.map((cluster, index) => (
                  <TableRow key={index}>
                    <TableCell>{String(cluster.service ?? cluster.h1_main ?? cluster.h1 ?? `Кластер ${index + 1}`)}</TableCell>
                    <TableCell>{clusterKeywords(cluster).length}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableWrapper>
        ) : (
          <WizardHint>Кластеры появятся после обработки.</WizardHint>
        )}
      </FormSection>
      <WizardActions>
        <Button type="button" variant="primary" disabled={isConfirming || isSavingLanguage || isImporting} onClick={() => void handleContinue()}>
          Далее
        </Button>
      </WizardActions>
    </StepStack>
  );
}
