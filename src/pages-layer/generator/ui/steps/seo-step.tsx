"use client";

import { useMemo, useState } from "react";
import { FaTrash } from "react-icons/fa";
import styled from "styled-components";
import { useSaveGeneratorSeoConfigMutation } from "@entities/generator/api";
import type { GeneratorContentDepth, GeneratorCta, GeneratorProjectSnapshot } from "@entities/generator/types";
import { Button, SelectControl, useToast } from "@shared/ui";
import { apiErrorMessage } from "../../lib/api-error";
import {
  ConstrainedField,
  FieldRow,
  FormSection,
  FormSectionHeading,
  StepStack,
  WizardActions,
  WizardFieldLabel,
  WizardHint,
  WizardInput,
} from "../fields";

type Props = {
  snapshot: GeneratorProjectSnapshot;
  onSaved: (next: GeneratorProjectSnapshot) => void;
  onContinue: (next: GeneratorProjectSnapshot) => void;
};

type DomainSeoState = {
  domain: string;
  h1: string;
  geo: string;
  sitemapEnabled: boolean;
  overrideCtas: boolean;
  ctas: GeneratorCta[];
};

function toggleExcluded(list: string[], value: string, included: boolean): string[] {
  if (included) {
    return list.filter((item) => item !== value);
  }
  return list.includes(value) ? list : [...list, value];
}

function CtaEditor({
  ctas,
  onChange,
}: {
  ctas: GeneratorCta[];
  onChange: (next: GeneratorCta[]) => void;
}) {
  return (
    <>
      {ctas.map((cta, index) => (
        <CtaRow key={index}>
          <WizardInput
            value={cta.text ?? ""}
            placeholder="Текст"
            onChange={(event) =>
              onChange(ctas.map((item, idx) => (idx === index ? { ...item, text: event.target.value } : item)))
            }
          />
          <WizardInput
            value={cta.url ?? ""}
            placeholder="URL"
            onChange={(event) =>
              onChange(ctas.map((item, idx) => (idx === index ? { ...item, url: event.target.value } : item)))
            }
          />
          <DangerIconButton
            type="button"
            data-tooltip="Удалить"
            aria-label={`Удалить CTA ${index + 1}`}
            onClick={() => onChange(ctas.filter((_, idx) => idx !== index))}
          >
            <FaTrash aria-hidden="true" />
          </DangerIconButton>
        </CtaRow>
      ))}
      <WizardActions>
        <Button type="button" onClick={() => onChange([...ctas, { text: "", url: "" }])}>
          Добавить CTA
        </Button>
      </WizardActions>
    </>
  );
}

export function SeoStep({ snapshot, onSaved, onContinue }: Props) {
  const { showToast } = useToast();
  const seo = snapshot.seoSettings;
  const [phone, setPhone] = useState(seo?.contactPhone ?? "");
  const [email, setEmail] = useState(seo?.contactEmail ?? "");
  const [ctas, setCtas] = useState<GeneratorCta[]>(seo?.ctas?.length ? seo.ctas : [{ text: "", url: "" }]);
  const [contentDepth, setContentDepth] = useState<GeneratorContentDepth>(seo?.contentDepth ?? "DETAILED");
  const [excludedSlugs, setExcludedSlugs] = useState<string[]>(seo?.excludedSlugs ?? []);
  const [excludedBlocks, setExcludedBlocks] = useState<Record<string, string[]>>(() => {
    const raw = seo?.excludedBlocks ?? {};
    const next: Record<string, string[]> = {};
    Object.entries(raw).forEach(([pageType, value]) => {
      if (Array.isArray(value)) {
        next[pageType] = value.map((item) => String(item));
      }
    });
    return next;
  });
  const [saveSeo, { isLoading }] = useSaveGeneratorSeoConfigMutation();
  const [domains, setDomains] = useState<DomainSeoState[]>(() =>
    (snapshot.domains ?? []).map((domain) => {
      const saved = seo?.domains?.find((item) => item.domain === domain.domain);
      return {
        domain: domain.domain,
        h1: domain.h1 ?? "",
        geo: saved?.geo ?? domain.geo ?? snapshot.geo ?? "",
        sitemapEnabled: saved?.sitemapEnabled ?? true,
        overrideCtas: saved?.overrideCtas ?? false,
        ctas: saved?.ctas?.length ? saved.ctas : [{ text: "", url: "" }],
      };
    }),
  );

  const pages = useMemo(() => seo?.pagesForExclusion ?? [], [seo?.pagesForExclusion]);
  const pageOptions = useMemo(
    () =>
      pages
        .map((page) => ({
          slug: String(page.url_slug ?? page.slug ?? ""),
          label: String(page.h1 ?? page.url_slug ?? page.slug ?? ""),
        }))
        .filter((item) => item.slug),
    [pages],
  );
  const blockEntries = useMemo(() => Object.entries(seo?.blocksByPageType ?? {}), [seo?.blocksByPageType]);
  const includedPagesCount = pageOptions.filter((page) => !excludedSlugs.includes(page.slug)).length;

  const handleContinue = async () => {
    try {
      const next = await saveSeo({
        id: snapshot.id,
        contactPhone: phone,
        contactEmail: email,
        ctas: ctas.map((cta) => ({ text: cta.text ?? "", url: cta.url ?? "" })),
        domains: domains.map((item) => ({
          domain: item.domain,
          geo: item.geo,
          sitemapEnabled: item.sitemapEnabled,
          overrideCtas: item.overrideCtas,
          ctas: item.ctas.map((cta) => ({ text: cta.text ?? "", url: cta.url ?? "" })),
        })),
        contentDepth,
        excludedSlugs,
        excludedBlocks,
      }).unwrap();
      onSaved(next);
      onContinue(next);
    } catch (error) {
      showToast({ variant: "error", message: apiErrorMessage(error, "Не удалось сохранить SEO-настройки.") });
    }
  };

  return (
    <StepStack>
      <FormSection>
        <FormSectionHeading tooltip="Контакты и кнопки, которые подставятся на все домены, если для домена не заданы свои CTA.">
          Общие для всех доменов
        </FormSectionHeading>
        <FieldRow>
          <ConstrainedField>
            <WizardFieldLabel tooltip="Опционально. Телефон для контактов на сайте.">Телефон</WizardFieldLabel>
            <WizardInput
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+7-921-..."
            />
          </ConstrainedField>
          <ConstrainedField>
            <WizardFieldLabel tooltip="Опционально. Email для контактов на сайте.">Email</WizardFieldLabel>
            <WizardInput
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="info@example.com"
            />
          </ConstrainedField>
        </FieldRow>
        <ConstrainedField>
          <WizardFieldLabel tooltip="Опционально. Текст и ссылка кнопки — в одной строке, чтобы не занимать лишнее место.">
            CTA-кнопки
          </WizardFieldLabel>
          <CtaEditor ctas={ctas} onChange={setCtas} />
        </ConstrainedField>
      </FormSection>

      <FormSection>
        <FormSectionHeading tooltip="Гео для Schema.org и отдельные настройки sitemap и CTA по каждому домену.">
          Настройки для каждого домена
        </FormSectionHeading>
        {domains.length ? (
          domains.map((domain, index) => (
            <DomainCard key={domain.domain}>
              <DomainTitle>
                {index + 1}. {domain.domain}
                {domain.h1 ? <DomainMeta>Услуга: {domain.h1}</DomainMeta> : null}
              </DomainTitle>
              <FieldRow>
                <ConstrainedField>
                  <WizardFieldLabel tooltip="Город или регион для Schema.org.">Гео</WizardFieldLabel>
                  <WizardInput
                    value={domain.geo}
                    placeholder="Москва"
                    onChange={(event) =>
                      setDomains((current) =>
                        current.map((item, idx) => (idx === index ? { ...item, geo: event.target.value } : item)),
                      )
                    }
                  />
                </ConstrainedField>
                <ConstrainedField>
                  <WizardFieldLabel tooltip="Генерировать sitemap.xml с правильными URL этого домена.">
                    Sitemap.xml
                  </WizardFieldLabel>
                  <CheckRow>
                    <input
                      id={`sitemap-${domain.domain}`}
                      type="checkbox"
                      checked={domain.sitemapEnabled}
                      onChange={(event) =>
                        setDomains((current) =>
                          current.map((item, idx) =>
                            idx === index ? { ...item, sitemapEnabled: event.target.checked } : item,
                          ),
                        )
                      }
                    />
                    <label htmlFor={`sitemap-${domain.domain}`}>Генерировать с правильными URL</label>
                  </CheckRow>
                  <CheckRow>
                    <input
                      id={`override-cta-${domain.domain}`}
                      type="checkbox"
                      checked={domain.overrideCtas}
                      onChange={(event) =>
                        setDomains((current) =>
                          current.map((item, idx) =>
                            idx === index ? { ...item, overrideCtas: event.target.checked } : item,
                          ),
                        )
                      }
                    />
                    <label htmlFor={`override-cta-${domain.domain}`}>Своя CTA для этого домена</label>
                  </CheckRow>
                </ConstrainedField>
              </FieldRow>
              {domain.overrideCtas ? (
                <ConstrainedField>
                  <WizardFieldLabel tooltip="Эти кнопки заменят общие CTA только для этого домена.">
                    CTA-кнопки домена
                  </WizardFieldLabel>
                  <CtaEditor
                    ctas={domain.ctas}
                    onChange={(next) =>
                      setDomains((current) => current.map((item, idx) => (idx === index ? { ...item, ctas: next } : item)))
                    }
                  />
                </ConstrainedField>
              ) : null}
            </DomainCard>
          ))
        ) : (
          <WizardHint>Сначала сохраните домены на предыдущем шаге.</WizardHint>
        )}
      </FormSection>

      <FormSection>
        <FormSectionHeading tooltip="Глубина текста, какие страницы включить в генерацию и какие блоки оставить на каждой странице.">
          Настройки контента
        </FormSectionHeading>
        <ConstrainedField>
          <WizardFieldLabel tooltip="Подробный: 300–400 слов на блок. Экспертный: 500+ слов, больше ключей.">
            Глубина контента
          </WizardFieldLabel>
          <SelectControl
            value={contentDepth}
            onValueChange={(value) => setContentDepth(value as GeneratorContentDepth)}
            options={[
              { value: "DETAILED", label: "Подробный" },
              { value: "EXPERT", label: "Экспертный" },
            ]}
          />
        </ConstrainedField>
        <SplitRow>
          <InnerSection>
            <FormSectionHeading tooltip="Отмеченные страницы попадут в генерацию. Снимите галочку, чтобы исключить страницу.">
              Страницы для генерации
            </FormSectionHeading>
            {pageOptions.length ? (
              <>
                <WizardHint>
                  {includedPagesCount}/{pageOptions.length} включено
                </WizardHint>
                <CheckboxGrid>
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
                </CheckboxGrid>
              </>
            ) : (
              <WizardHint>Страницы ещё не определены.</WizardHint>
            )}
          </InnerSection>
          <InnerSection>
            <FormSectionHeading tooltip="Отмеченные блоки попадут в генерацию. Снимите галочку, чтобы исключить блок.">
              Блоки по типам страниц
            </FormSectionHeading>
            {blockEntries.length ? (
              blockEntries.map(([pageType, value]) => {
                const items = Array.isArray(value) ? value : [];
                return (
                  <BlockGroup key={pageType}>
                    <BlockTypeTitle>{pageType}</BlockTypeTitle>
                    <CheckboxGrid>
                      {items.map((block, index) => {
                        const name = String(block.name ?? "");
                        if (!name) {
                          return null;
                        }
                        const label = String(block.label ?? name);
                        const included = !(excludedBlocks[pageType] ?? []).includes(name);
                        const inputId = `block-${pageType}-${name}-${index}`;
                        return (
                          <CheckRow key={`${pageType}-${name}-${index}`}>
                            <input
                              id={inputId}
                              type="checkbox"
                              checked={included}
                              onChange={(event) =>
                                setExcludedBlocks((current) => ({
                                  ...current,
                                  [pageType]: toggleExcluded(current[pageType] ?? [], name, event.target.checked),
                                }))
                              }
                            />
                            <label htmlFor={inputId}>{label}</label>
                          </CheckRow>
                        );
                      })}
                    </CheckboxGrid>
                  </BlockGroup>
                );
              })
            ) : (
              <WizardHint>Нет утверждённого дизайна с блоками.</WizardHint>
            )}
          </InnerSection>
        </SplitRow>
      </FormSection>

      <WizardActions>
        <Button type="button" variant="primary" disabled={isLoading} onClick={() => void handleContinue()}>
          Далее
        </Button>
      </WizardActions>
    </StepStack>
  );
}

const CtaRow = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  width: 100%;

  input {
    min-width: 0;
  }
`;

const DangerIconButton = styled(Button)`
  position: relative;
  width: 34px;
  height: 34px;
  padding: 0;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #fef3f2;
  border-color: #fecaca;
  color: #b42318;

  &::after {
    content: attr(data-tooltip);
    position: absolute;
    left: 50%;
    bottom: calc(100% + 8px);
    transform: translateX(-50%) translateY(4px);
    background: #0f172a;
    color: #f8fafc;
    font-size: 12px;
    line-height: 1;
    border-radius: 8px;
    padding: 6px 8px;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.14s ease, transform 0.14s ease;
    z-index: 10;
  }

  &:hover:not(:disabled)::after,
  &:focus-visible::after {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }

  &:hover:not(:disabled) {
    background: #fee4e2;
    border-color: #fda29b;
    color: #912018;
  }
`;

const DomainCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  border: 1px solid ${({ theme }) => theme.tokens.color.borderSubtle};
  border-radius: ${({ theme }) => theme.tokens.radius.md};
`;

const DomainTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.tokens.color.textPrimary};
`;

const DomainMeta = styled.div`
  margin-top: 2px;
  font-size: ${({ theme }) => theme.tokens.fontSize.sm};
  font-weight: 400;
  color: ${({ theme }) => theme.tokens.color.textMuted};
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

const SplitRow = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
`;

const InnerSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
`;

const CheckboxGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 16px;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

const BlockGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const BlockTypeTitle = styled.div`
  font-size: ${({ theme }) => theme.tokens.fontSize.md};
  font-weight: 600;
  color: ${({ theme }) => theme.tokens.color.textPrimary};
`;
