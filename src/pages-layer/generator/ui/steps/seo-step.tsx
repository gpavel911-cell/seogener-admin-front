"use client";

import { useMemo, useState } from "react";
import styled from "styled-components";
import { useSaveGeneratorSeoConfigMutation } from "@entities/generator/api";
import type { GeneratorProjectSnapshot } from "@entities/generator/types";
import { Button, useToast } from "@shared/ui";
import { apiErrorMessage } from "../../lib/api-error";
import {
  FormSection,
  FormSectionHeading,
  StepStack,
  WizardActions,
  WizardHint,
} from "../fields";

type Props = {
  snapshot: GeneratorProjectSnapshot;
  onSaved: (next: GeneratorProjectSnapshot) => void;
  onContinue: (next: GeneratorProjectSnapshot) => void;
};

function toggleExcluded(list: string[], value: string, included: boolean): string[] {
  if (included) {
    return list.filter((item) => item !== value);
  }
  return list.includes(value) ? list : [...list, value];
}

export function SeoStep({ snapshot, onSaved, onContinue }: Props) {
  const { showToast } = useToast();
  const seo = snapshot.seoSettings;
  const [excludedSlugs, setExcludedSlugs] = useState<string[]>(seo?.excludedSlugs ?? []);
  const [saveSeo, { isLoading }] = useSaveGeneratorSeoConfigMutation();

  const pageOptions = useMemo(
    () =>
      (seo?.pagesForExclusion ?? [])
        .map((page) => ({
          slug: String(page.url_slug ?? page.slug ?? ""),
          label: String(page.h1 ?? page.url_slug ?? page.slug ?? ""),
        }))
        .filter((item) => item.slug),
    [seo?.pagesForExclusion],
  );
  const includedPagesCount = pageOptions.filter((page) => !excludedSlugs.includes(page.slug)).length;

  const handleContinue = async () => {
    try {
      const next = await saveSeo({
        id: snapshot.id,
        contentDepth: "DETAILED",
        excludedSlugs,
        excludedBlocks: {},
      }).unwrap();
      onSaved(next);
      onContinue(next);
    } catch (error) {
      showToast({ variant: "error", message: apiErrorMessage(error, "Не удалось сохранить SEO-настройки.") });
    }
  };

  return (
    <StepStack>
      <SplitRow>
        <FormSection>
          <FormSectionHeading tooltip="Отмеченные страницы попадут в генерацию. Снимите галочку, чтобы исключить страницу.">
            Страницы для генерации
          </FormSectionHeading>
          {pageOptions.length ? (
            <>
              <WizardHint>
                {includedPagesCount}/{pageOptions.length} включено
              </WizardHint>
              <CheckboxList>
                {pageOptions.map((page) => {
                  const included = !excludedSlugs.includes(page.slug);
                  const inputId = `page-${page.slug}`;
                  return (
                    <CheckRow key={page.slug}>
                      <input
                        id={inputId}
                        type="checkbox"
                        checked={included}
                        onChange={(event) =>
                          setExcludedSlugs((current) => toggleExcluded(current, page.slug, event.target.checked))
                        }
                      />
                      <label htmlFor={inputId}>
                        <span>{page.label}</span>
                        <CheckMeta>{page.slug}</CheckMeta>
                      </label>
                    </CheckRow>
                  );
                })}
              </CheckboxList>
            </>
          ) : (
            <WizardHint>Страницы ещё не определены.</WizardHint>
          )}
        </FormSection>
        <FormSection>
          <FormSectionHeading tooltip="Глубина текста на блоках. В текущем UI Seogen этот шаг всегда сохраняет подробный режим.">
            Глубина контента
          </FormSectionHeading>
          <DepthNote>
            <strong>Подробный:</strong> 300–400 слов на блок, 15–20 ключевых слов, оптимален для SEO.
          </DepthNote>
        </FormSection>
      </SplitRow>

      <WizardActions>
        <Button type="button" variant="primary" disabled={isLoading} onClick={() => void handleContinue()}>
          Сохранить и перейти к запуску
        </Button>
      </WizardActions>
    </StepStack>
  );
}

const SplitRow = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
`;

const CheckboxList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 260px;
  overflow-y: auto;
`;

const CheckRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: ${({ theme }) => theme.tokens.fontSize.md};

  input {
    width: 16px;
    height: 16px;
    margin-top: 2px;
    flex-shrink: 0;
  }

  label {
    cursor: pointer;
    min-width: 0;
  }
`;

const CheckMeta = styled.small`
  display: block;
  color: ${({ theme }) => theme.tokens.color.textMuted};
  font-size: ${({ theme }) => theme.tokens.fontSize.sm};
`;

const DepthNote = styled.div`
  padding: 10px 12px;
  border-radius: ${({ theme }) => theme.tokens.radius.md};
  border: 1px solid ${({ theme }) => theme.tokens.color.borderSubtle};
  background: ${({ theme }) => theme.tokens.color.accentMuted};
  font-size: ${({ theme }) => theme.tokens.fontSize.sm};
  color: ${({ theme }) => theme.tokens.color.textPrimary};
  line-height: 1.45;
`;
