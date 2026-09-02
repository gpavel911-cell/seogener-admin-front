"use client";

import { useEffect, useState } from "react";
import styled from "styled-components";
import {
  useBuildGeneratorDesignMutation,
  useGetGeneratorDesignPageHtmlQuery,
  useGetGeneratorDesignStateQuery,
  useResetGeneratorDesignMutation,
  useStartGeneratorTemplateDesignMutation,
} from "@entities/generator/api";
import type { GeneratorProjectSnapshot } from "@entities/generator/types";
import { Button, PlaceholderText, ResultLoader, useToast } from "@shared/ui";
import { apiErrorMessage } from "../../lib/api-error";
import { WizardAccordionSection } from "../accordion-section";
import {
  ConstrainedField,
  FormSectionHeading,
  StepStack,
  WizardActions,
  WizardFieldLabel,
  WizardFilePicker,
  WizardHint,
} from "../fields";

type DesignSection = "source" | "approval";

type Props = {
  snapshot: GeneratorProjectSnapshot;
  onSaved: (next: GeneratorProjectSnapshot) => void;
  onCanContinueChange?: (ready: boolean) => void;
};

function isReadyPhase(phase: string | null | undefined): boolean {
  const value = (phase ?? "").toLowerCase();
  return value === "approval" || value === "approved" || value === "built" || value === "ready" || value === "editing";
}

function derivedSection(phase: string | null | undefined, pageCount: number): DesignSection {
  const value = (phase ?? "").toLowerCase();
  const aliases: Record<string, DesignSection> = {
    spec: "source",
    building: "source",
    error: "source",
    source: "source",
    approved: "approval",
    editing: "approval",
    approval: "approval",
    built: "approval",
    ready: "approval",
  };
  const mapped = aliases[value] ?? "source";
  if (mapped === "approval" && pageCount === 0) {
    return "source";
  }
  return mapped;
}

function DesignPagePreview({
  projectId,
  slug,
  label,
}: {
  projectId: number | string;
  slug: string;
  label: string;
}) {
  const htmlQuery = useGetGeneratorDesignPageHtmlQuery({ id: projectId, slug });
  return (
    <PreviewCard>
      <CardName>{label}</CardName>
      {htmlQuery.isLoading ? <ResultLoader label="Загрузка превью..." /> : null}
      {htmlQuery.error ? <PlaceholderText>Не удалось загрузить превью.</PlaceholderText> : null}
      {htmlQuery.data ? <PreviewFrame srcDoc={htmlQuery.data} title={label} sandbox="" /> : null}
    </PreviewCard>
  );
}

export function DesignStep({ snapshot, onSaved, onCanContinueChange }: Props) {
  const { showToast } = useToast();
  const [templateFiles, setTemplateFiles] = useState<File[]>([]);
  const [pollState, setPollState] = useState(false);
  const [userSection, setUserSection] = useState<DesignSection | null>(null);
  const designStateQuery = useGetGeneratorDesignStateQuery(snapshot.id, {
    pollingInterval: pollState ? 3000 : 0,
  });
  const [startTemplate, { isLoading: isAnalyzing }] = useStartGeneratorTemplateDesignMutation();
  const [buildDesign, { isLoading: isStartingBuild }] = useBuildGeneratorDesignMutation();
  const [resetDesign, { isLoading: isResetting }] = useResetGeneratorDesignMutation();

  const designState = designStateQuery.data;
  const phase = designState?.phase ?? snapshot.design?.phase;
  const pages = designState?.pages ?? [];
  const approved = (phase ?? "").toLowerCase() === "approved";
  const readyForPreview = pages.length > 0 && isReadyPhase(phase);
  const building = pollState || isStartingBuild;
  const busy = isAnalyzing || building || isResetting;
  const analyzed = Boolean(designState?.analyzed);
  const foundBlocks = designState?.foundBlocks ?? [];
  const hasTemplate = Boolean(designState?.hasTemplate || templateFiles[0]);
  const canReset = hasTemplate || analyzed || readyForPreview || approved || pages.length > 0 || Boolean(designState?.error);
  const fileLabel = templateFiles[0]?.name || designState?.fileName || (hasTemplate ? "Шаблон загружен" : "");
  const openSection = isAnalyzing || building ? "source" : (userSection ?? derivedSection(phase, pages.length));

  useEffect(() => {
    const current = (designState?.phase ?? "").toLowerCase();
    if (current === "building" && designState?.analyzed) {
      setPollState(true);
      setUserSection(null);
    }
    if (current === "approval" || current === "approved" || current === "error" || current === "built") {
      setPollState(false);
    }
    if (current === "approval" || current === "approved" || current === "built") {
      setUserSection(null);
    }
    if (current === "error" && designState?.error) {
      showToast({ variant: "error", message: designState.error });
    }
  }, [designState?.analyzed, designState?.error, designState?.phase, showToast]);

  useEffect(() => {
    onCanContinueChange?.(readyForPreview || approved);
  }, [approved, onCanContinueChange, readyForPreview]);

  const open = (section: DesignSection) => {
    if (section === "approval" && (!readyForPreview || isAnalyzing || building)) {
      return;
    }
    setUserSection(section);
  };

  const handleFiles = (files: File[]) => {
    setTemplateFiles(files);
    const file = files[0];
    if (!file) {
      return;
    }
    if (!file.name.toLowerCase().endsWith(".zip")) {
      showToast({
        variant: "error",
        message: "Для загрузки шаблона используйте ZIP-архив (HTML + CSS + изображения). Одиночный HTML не поддерживается.",
      });
      return;
    }
    void handleUpload(file);
  };

  const handleUpload = async (file: File) => {
    try {
      setUserSection("source");
      await startTemplate({ id: snapshot.id, file }).unwrap();
      void designStateQuery.refetch();
      showToast({ variant: "success", message: "Шаблон проанализирован" });
    } catch (err) {
      showToast({ variant: "error", message: apiErrorMessage(err, "Не удалось загрузить шаблон.") });
    }
  };

  const handleBuild = async () => {
    try {
      setUserSection("source");
      await buildDesign(snapshot.id).unwrap();
      setPollState(true);
      showToast({ variant: "success", message: "Сборка страниц запущена" });
    } catch (err) {
      showToast({ variant: "error", message: apiErrorMessage(err, "Не удалось собрать страницы.") });
    }
  };

  const handleReset = async () => {
    try {
      const next = await resetDesign(snapshot.id).unwrap();
      setTemplateFiles([]);
      setPollState(false);
      setUserSection("source");
      onSaved(next);
      void designStateQuery.refetch();
      showToast({ variant: "success", message: "Дизайн сброшен" });
    } catch (err) {
      showToast({ variant: "error", message: apiErrorMessage(err, "Не удалось сбросить дизайн.") });
    }
  };

  const sourceSubtitle = analyzed
    ? `${foundBlocks.length} блоков`
    : hasTemplate
      ? "Загружен"
      : "ZIP-архив с HTML, CSS и фото";

  return (
    <StepStack>
      <WizardAccordionSection
        number={1}
        title="Шаблон"
        subtitle={sourceSubtitle}
        open={openSection === "source"}
        done={analyzed || readyForPreview || approved}
        onToggle={() => open("source")}
      >
        <SourceBody>
          <FormSectionHeading tooltip="ZIP-архив с HTML, CSS и фото — стили и изображения загрузятся автоматически">
            Загрузи свой шаблон дизайна
          </FormSectionHeading>
          <ConstrainedField>
            <WizardFieldLabel>Файл шаблона</WizardFieldLabel>
            <WizardFilePicker
              accept=".zip"
              disabled={busy}
              buttonLabel="Выбрать .zip"
              fileNames={fileLabel}
              onFiles={handleFiles}
            />
          </ConstrainedField>

          {isAnalyzing ? (
            <StatusBanner>
              <ResultLoader label="ИИ анализирует шаблон, расставляет блоки... для больших файлов может занять до 5 минут." />
            </StatusBanner>
          ) : null}

          {!isAnalyzing && analyzed ? (
            <AnalyzeResult>
              <AnalyzeTitle>Шаблон проанализирован: {foundBlocks.length} блоков</AnalyzeTitle>
              {foundBlocks.length === 0 ? (
                <AnalyzeWarning>
                  Структура шаблона не распознана — ни один блок не найден. Все секции страниц будут сгенерированы ИИ с
                  нуля, реальная вёрстка загруженного файла использована не будет.
                </AnalyzeWarning>
              ) : (
                <BlockList>
                  {foundBlocks.map((block) => (
                    <BlockChip key={block}>{block}</BlockChip>
                  ))}
                </BlockList>
              )}
            </AnalyzeResult>
          ) : null}

          {building ? (
            <StatusBanner>
              <ResultLoader
                label={designState?.buildStatus || "Генерируем страницы..."}
              />
              {designState?.buildTotal ? (
                <BuildMeta>
                  {designState.buildDone}/{designState.buildTotal} блоков
                </BuildMeta>
              ) : null}
            </StatusBanner>
          ) : null}

          {!building && !readyForPreview && designState?.error ? <WizardHint>{designState.error}</WizardHint> : null}

          {(analyzed && !building) || canReset ? (
            <WizardActions>
              {analyzed && !building ? (
                <Button type="button" variant="primary" disabled={busy} onClick={() => void handleBuild()}>
                  Собрать страницы
                </Button>
              ) : null}
              {canReset ? (
                <Button type="button" disabled={busy} onClick={() => void handleReset()}>
                  {isResetting ? "Сброс..." : "Сбросить"}
                </Button>
              ) : null}
            </WizardActions>
          ) : null}
        </SourceBody>
      </WizardAccordionSection>

      <WizardAccordionSection
        number={2}
        title="Утверждение"
        subtitle={approved ? "Дизайн утверждён" : readyForPreview ? "Финальная проверка" : undefined}
        open={openSection === "approval"}
        done={approved}
        locked={!readyForPreview || isAnalyzing || building}
        onToggle={() => open("approval")}
      >
        <HeroTitle>Финальная проверка дизайна</HeroTitle>
        <PreviewGrid>
          {pages.map((page) => (
            <DesignPagePreview key={page.slug} projectId={snapshot.id} slug={page.slug} label={page.label || page.slug} />
          ))}
        </PreviewGrid>
      </WizardAccordionSection>
    </StepStack>
  );
}

const SourceBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const HeroTitle = styled.div`
  font-size: 16px;
  font-weight: 600;
`;

const AnalyzeResult = styled.div`
  padding: 12px 14px;
  border-radius: 8px;
  background: rgba(22, 163, 74, 0.08);
  border: 1px solid rgba(22, 163, 74, 0.35);
`;

const AnalyzeTitle = styled.div`
  color: #15803d;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 8px;
`;

const AnalyzeWarning = styled.div`
  color: #b45309;
  font-size: 13px;
`;

const BlockList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const BlockChip = styled.span`
  background: ${({ theme }) => theme.tokens.color.bgSurface};
  color: ${({ theme }) => theme.tokens.color.textMuted};
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
`;

const StatusBanner = styled.div`
  min-height: 80px;
  border: 1px solid ${({ theme }) => theme.tokens.color.borderSubtle};
  border-radius: ${({ theme }) => theme.tokens.radius.md};
  background: ${({ theme }) => theme.tokens.color.bgSurface};
  padding: 8px;
`;

const BuildMeta = styled.p`
  margin: 4px 0 0;
  font-size: 12px;
  color: ${({ theme }) => theme.tokens.color.textMuted};
`;

const PreviewGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
`;

const PreviewCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.tokens.color.borderSubtle};
  background: ${({ theme }) => theme.tokens.color.bgSurface};
`;

const PreviewFrame = styled.iframe`
  width: 100%;
  height: 220px;
  border: 0;
  border-radius: 8px;
  background: #f8fafc;
`;

const CardName = styled.div`
  font-size: 14px;
  font-weight: 500;
`;
