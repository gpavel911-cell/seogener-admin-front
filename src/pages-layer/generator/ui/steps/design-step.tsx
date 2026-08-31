"use client";

import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import {
  useApproveGeneratorDesignMutation,
  useConfirmGeneratorPrebuiltDesignMutation,
  useGetGeneratorDesignPageHtmlQuery,
  useGetGeneratorDesignStateQuery,
  useGetGeneratorPageTypesQuery,
  useStartGeneratorTemplateDesignMutation,
  useUploadGeneratorPrebuiltDesignMutation,
} from "@entities/generator/api";
import type { GeneratorPrebuiltFile, GeneratorProjectSnapshot } from "@entities/generator/types";
import { Button, PlaceholderText, ResultLoader, SelectControl, useToast } from "@shared/ui";
import { apiErrorMessage } from "../../lib/api-error";
import {
  ConstrainedField,
  FormSection,
  FormSectionHeading,
  StepStack,
  WizardActions,
  WizardFieldLabel,
  WizardFilePicker,
  WizardHint,
} from "../fields";

const QUICK_PRESET = ["home", "service", "contacts", "faq"];

type SourceMode = "template" | "prebuilt";

type Props = {
  snapshot: GeneratorProjectSnapshot;
  onSaved: (next: GeneratorProjectSnapshot) => void;
};

function pageCountLabel(count: number): string {
  if (count === 1) {
    return "1 страница";
  }
  if (count >= 2 && count <= 4) {
    return `${count} страницы`;
  }
  return `${count} страниц`;
}

function isReadyPhase(phase: string | null | undefined): boolean {
  const value = (phase ?? "").toLowerCase();
  return value === "approval" || value === "approved" || value === "built" || value === "ready";
}

function isBuildingPhase(phase: string | null | undefined): boolean {
  return (phase ?? "").toLowerCase() === "building";
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

export function DesignStep({ snapshot, onSaved }: Props) {
  const { showToast } = useToast();
  const [sourceMode, setSourceMode] = useState<SourceMode>("template");
  const [selectedPageTypes, setSelectedPageTypes] = useState<string[]>(QUICK_PRESET);
  const [templateFiles, setTemplateFiles] = useState<File[]>([]);
  const [prebuiltFiles, setPrebuiltFiles] = useState<File[]>([]);
  const [prebuiltPages, setPrebuiltPages] = useState<GeneratorPrebuiltFile[]>([]);
  const [prebuiltMapping, setPrebuiltMapping] = useState<Record<string, string>>({});
  const [pollState, setPollState] = useState(false);
  const pageTypesQuery = useGetGeneratorPageTypesQuery();
  const designStateQuery = useGetGeneratorDesignStateQuery(snapshot.id, {
    pollingInterval: pollState ? 2000 : 0,
  });
  const [startTemplate, { isLoading: isStartingTemplate }] = useStartGeneratorTemplateDesignMutation();
  const [uploadPrebuilt, { isLoading: isUploadingPrebuilt }] = useUploadGeneratorPrebuiltDesignMutation();
  const [confirmPrebuilt, { isLoading: isConfirmingPrebuilt }] = useConfirmGeneratorPrebuiltDesignMutation();
  const [approveDesign, { isLoading: isApproving }] = useApproveGeneratorDesignMutation();

  const phase = designStateQuery.data?.phase ?? snapshot.design?.phase;
  const pages = designStateQuery.data?.pages ?? [];
  const approved = (phase ?? "").toLowerCase() === "approved";
  const readyForPreview = pages.length > 0 && isReadyPhase(phase);
  const building = pollState || isBuildingPhase(phase) || isStartingTemplate;

  useEffect(() => {
    if (!pageTypesQuery.error) {
      return;
    }
    showToast({ variant: "error", message: apiErrorMessage(pageTypesQuery.error, "Не удалось загрузить типы страниц.") });
  }, [pageTypesQuery.error, showToast]);

  useEffect(() => {
    const current = (designStateQuery.data?.phase ?? "").toLowerCase();
    if (current === "building") {
      setPollState(true);
    }
    if (current === "approval" || current === "approved" || current === "error" || current === "built") {
      setPollState(false);
    }
    if (current === "error" && designStateQuery.data?.error) {
      showToast({ variant: "error", message: designStateQuery.data.error });
    }
  }, [designStateQuery.data?.error, designStateQuery.data?.phase, showToast]);

  const pageTypeOptions = useMemo(
    () => (pageTypesQuery.data?.items ?? []).map((item) => ({ value: item.id, label: item.label })),
    [pageTypesQuery.data?.items],
  );

  const togglePageType = (id: string) => {
    setSelectedPageTypes((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const handleStartTemplate = async () => {
    if (!selectedPageTypes.length) {
      showToast({ variant: "error", message: "Выберите хотя бы один тип страницы." });
      return;
    }
    const file = templateFiles[0];
    if (!file) {
      showToast({ variant: "error", message: "Загрузите HTML или ZIP шаблона." });
      return;
    }
    try {
      await startTemplate({ id: snapshot.id, file, pageTypes: selectedPageTypes }).unwrap();
      setPollState(true);
      showToast({ variant: "success", message: "Сборка страниц запущена" });
    } catch (err) {
      showToast({ variant: "error", message: apiErrorMessage(err, "Не удалось загрузить шаблон.") });
    }
  };

  const handleUploadPrebuilt = async () => {
    const file = prebuiltFiles[0];
    if (!file) {
      showToast({ variant: "error", message: "Загрузите ZIP готового сайта." });
      return;
    }
    try {
      const result = await uploadPrebuilt({ id: snapshot.id, file }).unwrap();
      const files = result.files ?? [];
      setPrebuiltPages(files);
      setPrebuiltMapping(
        Object.fromEntries(files.map((item) => [item.filename, item.suggestedSlug || ""])),
      );
      showToast({ variant: "success", message: "ZIP разобран. Сопоставьте файлы со страницами." });
    } catch (err) {
      showToast({ variant: "error", message: apiErrorMessage(err, "Не удалось загрузить готовый сайт.") });
    }
  };

  const handleConfirmPrebuilt = async () => {
    const mapping = Object.fromEntries(
      Object.entries(prebuiltMapping).filter(([, slug]) => slug.trim().length > 0),
    );
    if (!Object.keys(mapping).length) {
      showToast({ variant: "error", message: "Сопоставьте хотя бы один файл со страницей." });
      return;
    }
    const pagesHtml = Object.fromEntries(
      prebuiltPages.filter((item) => mapping[item.filename]).map((item) => [item.filename, item.html]),
    );
    try {
      const next = await confirmPrebuilt({ id: snapshot.id, mapping, pagesHtml }).unwrap();
      showToast({ variant: "success", message: "Страницы импортированы. Проверьте превью и утвердите дизайн." });
      void designStateQuery.refetch();
      if (next.design?.phase === "approved") {
        onSaved(next);
      }
    } catch (err) {
      showToast({ variant: "error", message: apiErrorMessage(err, "Не удалось подтвердить импорт.") });
    }
  };

  const handleApprove = async () => {
    try {
      const next = await approveDesign(snapshot.id).unwrap();
      onSaved(next);
      showToast({ variant: "success", message: "Дизайн утверждён" });
    } catch (err) {
      showToast({ variant: "error", message: apiErrorMessage(err, "Не удалось утвердить дизайн.") });
    }
  };

  if (pageTypesQuery.isLoading) {
    return <ResultLoader label="Загрузка типов страниц..." />;
  }

  const pageTypes = pageTypesQuery.data?.items ?? [];
  const busy = isStartingTemplate || isUploadingPrebuilt || isConfirmingPrebuilt || isApproving || pollState;

  return (
    <StepStack>
      <FormSection>
        <FormSectionHeading>Структура</FormSectionHeading>
        <PageCount>{pageCountLabel(selectedPageTypes.length)}</PageCount>
        <PageTypeList>
          {pageTypes.map((item) => (
            <PageTypeRow key={item.id}>
              <input
                id={`page-type-${item.id}`}
                type="checkbox"
                checked={selectedPageTypes.includes(item.id)}
                disabled={busy}
                onChange={() => togglePageType(item.id)}
              />
              <label htmlFor={`page-type-${item.id}`}>{item.label}</label>
            </PageTypeRow>
          ))}
        </PageTypeList>
      </FormSection>

      <FormSection>
        <FormSectionHeading>Шаблон</FormSectionHeading>
        <SourceList>
          <SourceCard type="button" $selected={sourceMode === "template"} disabled={busy} onClick={() => setSourceMode("template")}>
            Загрузить дизайн (HTML или ZIP)
          </SourceCard>
          <SourceCard type="button" $selected={sourceMode === "prebuilt"} disabled={busy} onClick={() => setSourceMode("prebuilt")}>
            Готовый сайт (все страницы)
          </SourceCard>
        </SourceList>

        {sourceMode === "template" ? (
          <>
            <ConstrainedField>
              <WizardFieldLabel>Файл шаблона</WizardFieldLabel>
              <WizardFilePicker
                accept=".zip,.html,.htm"
                disabled={busy}
                buttonLabel="Выбрать .zip / .html"
                fileNames={templateFiles[0]?.name}
                onFiles={setTemplateFiles}
              />
            </ConstrainedField>
            <WizardActions>
              <Button type="button" variant="primary" disabled={busy || !templateFiles[0]} onClick={() => void handleStartTemplate()}>
                {isStartingTemplate || pollState ? "Сборка..." : "Сгенерировать страницы"}
              </Button>
            </WizardActions>
          </>
        ) : (
          <>
            <ConstrainedField>
              <WizardFieldLabel>ZIP готового сайта</WizardFieldLabel>
              <WizardFilePicker
                accept=".zip"
                disabled={busy}
                buttonLabel="Выбрать .zip"
                fileNames={prebuiltFiles[0]?.name}
                onFiles={setPrebuiltFiles}
              />
            </ConstrainedField>
            <WizardActions>
              <Button type="button" disabled={busy || !prebuiltFiles[0]} onClick={() => void handleUploadPrebuilt()}>
                {isUploadingPrebuilt ? "Разбор ZIP..." : "Загрузить ZIP"}
              </Button>
            </WizardActions>
            {prebuiltPages.length ? (
              <>
                {prebuiltPages.map((item) => (
                  <MappingRow key={item.filename}>
                    <SelectedFileName title={item.filename}>{item.filename}</SelectedFileName>
                    <SelectControl
                      value={prebuiltMapping[item.filename] || "skip"}
                      onValueChange={(value) =>
                        setPrebuiltMapping((current) => ({
                          ...current,
                          [item.filename]: value === "skip" ? "" : value,
                        }))
                      }
                      options={[{ value: "skip", label: "Не использовать" }, ...pageTypeOptions]}
                    />
                  </MappingRow>
                ))}
                <WizardActions>
                  <Button type="button" variant="primary" disabled={busy} onClick={() => void handleConfirmPrebuilt()}>
                    {isConfirmingPrebuilt ? "Импорт..." : "Импортировать страницы"}
                  </Button>
                </WizardActions>
              </>
            ) : null}
          </>
        )}
      </FormSection>

      {building ? (
        <StatusBanner>
          <ResultLoader
            label={
              designStateQuery.data?.buildStatus
                || "Собираем выбранные типы страниц. Генерация блоков может занять несколько минут."
            }
          />
        </StatusBanner>
      ) : null}

      {readyForPreview ? (
        <FormSection>
          <FormSectionHeading>Утверждение</FormSectionHeading>
          <PreviewGrid>
            {pages.map((page) => (
              <DesignPagePreview key={page.slug} projectId={snapshot.id} slug={page.slug} label={page.label || page.slug} />
            ))}
          </PreviewGrid>
          {approved ? (
            <SuccessNote>Дизайн утверждён. Можно переходить к доменам.</SuccessNote>
          ) : (
            <WizardActions>
              <Button type="button" variant="primary" disabled={isApproving} onClick={() => void handleApprove()}>
                {isApproving ? "Утверждение..." : "Утвердить дизайн"}
              </Button>
            </WizardActions>
          )}
        </FormSection>
      ) : null}

      {!building && !readyForPreview && designStateQuery.data?.error ? (
        <WizardHint>{designStateQuery.data.error}</WizardHint>
      ) : null}
    </StepStack>
  );
}

const PageCount = styled.div`
  font-size: ${({ theme }) => theme.tokens.fontSize.sm};
  color: ${({ theme }) => theme.tokens.color.textMuted};
`;

const PageTypeList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const PageTypeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: ${({ theme }) => theme.tokens.fontSize.md};

  input {
    width: 16px;
    height: 16px;
  }

  label {
    cursor: pointer;
  }
`;

const SourceList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const SourceCard = styled.button<{ $selected: boolean }>`
  border: 1px solid ${({ theme, $selected }) => ($selected ? theme.tokens.color.accent : theme.tokens.color.borderSubtle)};
  background: ${({ theme, $selected }) => ($selected ? theme.tokens.color.accentMuted : theme.tokens.color.bgSurface)};
  color: ${({ theme }) => theme.tokens.color.textPrimary};
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 14px;
  cursor: pointer;
  text-align: left;
`;

const MappingRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 34px;
  width: 640px;
  max-width: 100%;
`;

const SelectedFileName = styled.div`
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: ${({ theme }) => theme.tokens.color.textSecondary};
`;

const StatusBanner = styled.div`
  min-height: 120px;
  border: 1px solid ${({ theme }) => theme.tokens.color.borderSubtle};
  border-radius: ${({ theme }) => theme.tokens.radius.md};
  background: ${({ theme }) => theme.tokens.color.bgSurface};
  padding: 8px;
`;

const SuccessNote = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.tokens.fontSize.md};
  color: #15803d;
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
