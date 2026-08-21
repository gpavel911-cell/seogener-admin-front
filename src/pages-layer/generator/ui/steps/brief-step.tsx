"use client";

import { useState } from "react";
import { useAnalyzeGeneratorBriefMutation, useUpdateGeneratorBriefMutation } from "@entities/generator/api";
import type { GeneratorProjectSnapshot } from "@entities/generator/types";
import { Button, useToast } from "@shared/ui";
import { apiErrorMessage } from "../../lib/api-error";
import {
  ConstrainedField,
  FieldRow,
  FormSection,
  FormSectionTitle,
  StepStack,
  WizardActions,
  WizardFieldLabel,
  WizardInput,
  WizardTextArea,
} from "../fields";

type Props = {
  snapshot: GeneratorProjectSnapshot;
  onSaved: (next: GeneratorProjectSnapshot) => void;
  onContinue: (next: GeneratorProjectSnapshot) => void;
};

export function BriefStep({ snapshot, onSaved, onContinue }: Props) {
  const { showToast } = useToast();
  const [audience, setAudience] = useState(snapshot.brief?.audience ?? "");
  const [usp, setUsp] = useState(snapshot.brief?.usp ?? "");
  const [tone, setTone] = useState(snapshot.brief?.tone ?? "");
  const [objections, setObjections] = useState(snapshot.brief?.objections ?? "");
  const [query, setQuery] = useState(snapshot.niche ?? "");
  const [segment, setSegment] = useState("");
  const [saveBrief, { isLoading: isSaving }] = useUpdateGeneratorBriefMutation();
  const [analyzeBrief, { isLoading: isAnalyzing }] = useAnalyzeGeneratorBriefMutation();

  const applyBrief = (brief: Record<string, unknown>) => {
    if (typeof brief.audience === "string") setAudience(brief.audience);
    if (typeof brief.usp === "string") setUsp(brief.usp);
    if (typeof brief.tone === "string") setTone(brief.tone);
    if (typeof brief.objections === "string") setObjections(brief.objections);
  };

  const handleAnalyze = async () => {
    try {
      const result = await analyzeBrief({ id: snapshot.id, query, segment: segment || undefined }).unwrap();
      if (result.brief) {
        applyBrief(result.brief);
      }
      showToast({ variant: "success", message: "Бриф заполнен из анализа" });
    } catch (error) {
      showToast({ variant: "error", message: apiErrorMessage(error, "Не удалось проанализировать бриф.") });
    }
  };

  const handleContinue = async () => {
    try {
      const next = await saveBrief({ id: snapshot.id, audience, usp, tone, objections }).unwrap();
      onSaved(next);
      onContinue(next);
    } catch (error) {
      showToast({ variant: "error", message: apiErrorMessage(error, "Не удалось сохранить бриф.") });
    }
  };

  return (
    <StepStack>
      <FormSection>
        <FormSectionTitle>Автоанализ конкурентов</FormSectionTitle>
        <ConstrainedField>
          <WizardFieldLabel
            required
            tooltip="Введите фразу, по которой ищут в Яндексе. Гео не добавляется — пишите его сами при необходимости."
          >
            Поисковый запрос
          </WizardFieldLabel>
          <WizardInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="металлообработка на заказ спб"
          />
        </ConstrainedField>
        <ConstrainedField>
          <WizardFieldLabel tooltip="Добавляется к поисковому запросу — помогает найти нужный тип конкурентов">
            Сегмент
          </WizardFieldLabel>
          <WizardInput
            value={segment}
            onChange={(event) => setSegment(event.target.value)}
            placeholder="для частных лиц / для бизнеса"
          />
        </ConstrainedField>
      </FormSection>
      <FormSection>
        <FormSectionTitle>Контент</FormSectionTitle>
        <WizardActions>
          <Button type="button" disabled={isAnalyzing} onClick={() => void handleAnalyze()}>
            Найти конкурентов и заполнить
          </Button>
        </WizardActions>
        <FieldRow>
          <ConstrainedField>
            <WizardFieldLabel required tooltip="напр. промышленные предприятия СПб, МСП с металлоконструкциями">
              Целевая аудитория
            </WizardFieldLabel>
            <WizardTextArea
              value={audience}
              onChange={(event) => setAudience(event.target.value)}
              placeholder="Кто клиент, какая боль, уровень осведомлённости"
            />
          </ConstrainedField>
          <ConstrainedField>
            <WizardFieldLabel required tooltip="напр. точность до 0.01мм, любые металлы, срочные заказы за 24ч">
              УТП / Оффер
            </WizardFieldLabel>
            <WizardTextArea
              value={usp}
              onChange={(event) => setUsp(event.target.value)}
              placeholder="Главная выгода, чем отличаемся от конкурентов"
            />
          </ConstrainedField>
        </FieldRow>
        <FieldRow>
          <ConstrainedField>
            <WizardFieldLabel required tooltip="экспертно / по-человечески / строго">
              Тон
            </WizardFieldLabel>
            <WizardTextArea
              value={tone}
              onChange={(event) => setTone(event.target.value)}
              placeholder="экспертно / по-человечески / строго"
            />
          </ConstrainedField>
          <ConstrainedField>
            <WizardFieldLabel required tooltip="дорого? долго? качество?">
              Возражения
            </WizardFieldLabel>
            <WizardTextArea
              value={objections}
              onChange={(event) => setObjections(event.target.value)}
              placeholder="дорого? долго? качество?"
            />
          </ConstrainedField>
        </FieldRow>
      </FormSection>
      <WizardActions>
        <Button type="button" variant="primary" disabled={isSaving} onClick={() => void handleContinue()}>
          Далее
        </Button>
      </WizardActions>
    </StepStack>
  );
}
