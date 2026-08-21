"use client";

import { useEffect, useState } from "react";
import styled from "styled-components";
import {
  useGetGeneratorDesignPreviewQuery,
  useGetGeneratorDesignsQuery,
  useGetGeneratorPageTypesQuery,
  useImportGeneratorDesignMutation,
  useSelectGeneratorDesignMutation,
} from "@entities/generator/api";
import type { GeneratorProjectSnapshot } from "@entities/generator/types";
import { Button, PlaceholderText, ResultLoader, useToast } from "@shared/ui";
import { apiErrorMessage } from "../../lib/api-error";
import {
  ConstrainedField,
  FormSection,
  FormSectionHeading,
  StepStack,
  WizardActions,
  WizardFieldLabel,
  WizardFilePicker,
} from "../fields";

const QUICK_PRESET = ["home", "service", "contacts", "faq"];

type Props = {
  snapshot: GeneratorProjectSnapshot;
  onSaved: (next: GeneratorProjectSnapshot) => void;
};

function designStem(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? filename;
  const dot = base.lastIndexOf(".");
  return (dot > 0 ? base.slice(0, dot) : base).trim();
}

function pageCountLabel(count: number): string {
  if (count === 1) {
    return "1 страница";
  }
  if (count >= 2 && count <= 4) {
    return `${count} страницы`;
  }
  return `${count} страниц`;
}

function DesignCard({
  id,
  name,
  selected,
  disabled,
  onSelect,
}: {
  id: string;
  name: string;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const preview = useGetGeneratorDesignPreviewQuery(id);
  useEffect(() => {
    return () => {
      if (preview.data) {
        URL.revokeObjectURL(preview.data);
      }
    };
  }, [preview.data]);

  return (
    <Card type="button" $selected={selected} disabled={disabled} onClick={onSelect}>
      {preview.data ? <Preview src={preview.data} alt={name} /> : <PreviewPlaceholder>Нет превью</PreviewPlaceholder>}
      <CardName>{name}</CardName>
    </Card>
  );
}

export function DesignStep({ snapshot, onSaved }: Props) {
  const { showToast } = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [importingName, setImportingName] = useState<string | null>(null);
  const [selectedDesignId, setSelectedDesignId] = useState(snapshot.design?.id ?? "");
  const [selectedPageTypes, setSelectedPageTypes] = useState<string[]>(QUICK_PRESET);
  const designsQuery = useGetGeneratorDesignsQuery();
  const pageTypesQuery = useGetGeneratorPageTypesQuery();
  const [importDesign, { isLoading: isImporting }] = useImportGeneratorDesignMutation();
  const [selectDesign, { isLoading: isSaving }] = useSelectGeneratorDesignMutation();
  const [generationSucceeded, setGenerationSucceeded] = useState(snapshot.design?.phase === "approved");

  useEffect(() => {
    if (!designsQuery.error) {
      return;
    }
    showToast({ variant: "error", message: apiErrorMessage(designsQuery.error, "Не удалось загрузить дизайны.") });
  }, [designsQuery.error, showToast]);

  useEffect(() => {
    if (!pageTypesQuery.error) {
      return;
    }
    showToast({ variant: "error", message: apiErrorMessage(pageTypesQuery.error, "Не удалось загрузить типы страниц.") });
  }, [pageTypesQuery.error, showToast]);

  const togglePageType = (id: string) => {
    setSelectedPageTypes((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const applyDesign = async (designId: string) => {
    if (!selectedPageTypes.length) {
      showToast({ variant: "error", message: "Выберите хотя бы один тип страницы." });
      return;
    }
    const next = await selectDesign({
      id: snapshot.id,
      designId,
      pageTypes: selectedPageTypes,
    }).unwrap();
    onSaved(next);
    setGenerationSucceeded(true);
    showToast({ variant: "success", message: "Дизайн утверждён" });
  };

  const handleImportFile = async (file: File) => {
    const resolvedName = designStem(file.name) || file.name;
    setImportingName(file.name);
    try {
      const imported = await importDesign({ file, name: resolvedName }).unwrap();
      setFiles((current) => current.filter((item) => item !== file));
      setSelectedDesignId(imported.id);
      showToast({ variant: "success", message: "Шаблон добавлен в библиотеку" });
    } catch (err) {
      showToast({
        variant: "error",
        message: apiErrorMessage(err, "Не удалось импортировать шаблон."),
      });
    } finally {
      setImportingName(null);
    }
  };

  const handleGenerate = async () => {
    if (!selectedDesignId) {
      showToast({ variant: "error", message: "Выберите дизайн из библиотеки или импортируйте файл." });
      return;
    }
    try {
      await applyDesign(selectedDesignId);
    } catch (err) {
      showToast({ variant: "error", message: apiErrorMessage(err, "Не удалось сгенерировать дизайн.") });
    }
  };

  if (designsQuery.isLoading || pageTypesQuery.isLoading) {
    return <ResultLoader label="Загрузка дизайнов..." />;
  }

  const items = designsQuery.data?.items ?? [];
  const pageTypes = pageTypesQuery.data?.items ?? [];
  const busy = isSaving || isImporting;

  return (
    <StepStack>
      <FormSection>
        <FormSectionHeading tooltip="Отметьте страницы, которые нужно собрать из шаблона. Сборка запускается кнопкой «Сгенерировать».">
          Типы страниц
        </FormSectionHeading>
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
        <FormSectionHeading tooltip="ZIP или HTML. Выбор файла не запускает сборку — сначала «Импорт» в библиотеку, затем «Сгенерировать».">
          Шаблон
        </FormSectionHeading>
        <ConstrainedField>
          <WizardFieldLabel tooltip="Можно выбрать один или несколько файлов. Импорт только добавляет шаблон в библиотеку.">
            Файл шаблона
          </WizardFieldLabel>
          <WizardFilePicker
            accept=".zip,.html,.htm"
            multiple
            disabled={busy}
            buttonLabel="Выбрать .zip / .html"
            hideFileHint={files.length > 1}
            fileNames={files.length === 1 ? files[0].name : undefined}
            action={
              files.length === 1 ? (
                <Button type="button" disabled={busy} onClick={() => void handleImportFile(files[0])}>
                  {importingName === files[0].name ? "Импорт..." : "Импорт"}
                </Button>
              ) : null
            }
            onFiles={(next) => setFiles(next)}
          />
        </ConstrainedField>
        {files.length > 1
          ? files.map((file) => (
              <SelectedFileRow key={`${file.name}-${file.lastModified}-${file.size}`}>
                <SelectedFileName title={file.name}>{file.name}</SelectedFileName>
                <Button type="button" disabled={busy} onClick={() => void handleImportFile(file)}>
                  {importingName === file.name ? "Импорт..." : "Импорт"}
                </Button>
              </SelectedFileRow>
            ))
          : null}
        {items.length ? (
          <Grid>
            {items.map((item) => (
              <DesignCard
                key={item.id}
                id={item.id}
                name={item.name}
                selected={selectedDesignId === item.id}
                disabled={busy}
                onSelect={() => setSelectedDesignId(item.id)}
              />
            ))}
          </Grid>
        ) : (
          <PlaceholderText>Нет доступных дизайнов. Загрузите ZIP или HTML выше.</PlaceholderText>
        )}
        {isImporting ? (
          <StatusBanner>
            <ResultLoader label="Добавляем шаблон в библиотеку. ZIP разбирается и тегируется — это может занять несколько минут." />
          </StatusBanner>
        ) : null}
        {isSaving ? (
          <StatusBanner>
            <ResultLoader label="Собираем выбранные типы страниц и утверждаем дизайн. Генерация блоков может занять до 10 минут." />
          </StatusBanner>
        ) : null}
        {!isSaving && generationSucceeded ? (
          <SuccessNote>Дизайн успешно сгенерирован и утверждён.</SuccessNote>
        ) : null}
        <WizardActions>
          <Button type="button" variant="primary" disabled={busy || !selectedDesignId} onClick={() => void handleGenerate()}>
            {isSaving ? "Генерация..." : "Сгенерировать"}
          </Button>
        </WizardActions>
      </FormSection>
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

const SelectedFileRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 34px;
  width: 500px;
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

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
`;

const Card = styled.button<{ $selected: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border-radius: 12px;
  border: 1px solid ${({ theme, $selected }) => ($selected ? theme.tokens.color.accent : theme.tokens.color.borderSubtle)};
  background: ${({ theme }) => theme.tokens.color.bgSurface};
  cursor: pointer;
  text-align: left;
`;

const Preview = styled.img`
  width: 100%;
  height: 140px;
  object-fit: cover;
  border-radius: 8px;
  background: #f1f5f9;
`;

const PreviewPlaceholder = styled.div`
  width: 100%;
  height: 140px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f1f5f9;
  color: #64748b;
  font-size: 13px;
`;

const CardName = styled.div`
  font-size: 14px;
  font-weight: 500;
`;
