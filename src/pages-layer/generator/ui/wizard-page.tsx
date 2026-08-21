"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import styled from "styled-components";
import { skipToken } from "@reduxjs/toolkit/query";
import { useGetGeneratorProjectQuery } from "@entities/generator/api";
import type { GeneratorProjectSnapshot, GeneratorWizardStep } from "@entities/generator/types";
import { Button, PageHeader, PlaceholderText, ResultLoader, useToast } from "@shared/ui";
import { apiErrorMessage } from "../lib/api-error";
import { isStepComplete, isStepReachable, stepFromSlug, wizardHref, WIZARD_STEPS } from "../lib/wizard";
import { BriefStep } from "./steps/brief-step";
import { DesignStep } from "./steps/design-step";
import { DomainsStep } from "./steps/domains-step";
import { KeywordsStep } from "./steps/keywords-step";
import { ProjectStep } from "./steps/project-step";
import { ResultsStep } from "./steps/results-step";
import { RunStep } from "./steps/run-step";
import { SeoStep } from "./steps/seo-step";

type WizardPageProps = {
  mode?: "new" | "existing";
};

const NEXT_STEP: Partial<Record<GeneratorWizardStep, GeneratorWizardStep>> = {
  PROJECT: "BRIEF",
  BRIEF: "KEYWORDS",
  KEYWORDS: "DESIGN",
  DESIGN: "DOMAINS",
  DOMAINS: "SEO",
  SEO: "RUN",
  RUN: "RESULTS",
};

export function GeneratorWizardPage({ mode = "existing" }: WizardPageProps) {
  const params = useParams<{ id?: string; step?: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const isNew = mode === "new";
  const id = isNew ? undefined : params.id;
  const requestedStep = isNew ? "PROJECT" : stepFromSlug(params.step) ?? "PROJECT";
  const query = useGetGeneratorProjectQuery(id ? Number(id) : skipToken);
  const [localSnapshot, setLocalSnapshot] = useState<GeneratorProjectSnapshot | undefined>(undefined);
  const [savedStep, setSavedStep] = useState<GeneratorWizardStep | null>(null);

  useEffect(() => {
    if (!isNew && query.data) {
      setLocalSnapshot(query.data);
    }
  }, [isNew, query.data]);

  const snapshot = isNew ? localSnapshot : (localSnapshot ?? query.data);
  const saved = Boolean(snapshot && (isStepComplete(snapshot, requestedStep) || savedStep === requestedStep));

  useEffect(() => {
    if (!query.error) {
      return;
    }
    showToast({ variant: "error", message: apiErrorMessage(query.error, "Не удалось загрузить проект.") });
  }, [query.error, showToast]);

  useEffect(() => {
    if (isNew || !snapshot) {
      return;
    }
    if (!isStepReachable(snapshot, requestedStep)) {
      router.replace(wizardHref(snapshot.id, snapshot.currentStep));
    }
  }, [isNew, requestedStep, router, snapshot]);

  const handleSaved = (next: GeneratorProjectSnapshot) => {
    setLocalSnapshot(next);
    setSavedStep(requestedStep);
  };

  const handleContinue = (next: GeneratorProjectSnapshot) => {
    handleSaved(next);
    const following = NEXT_STEP[requestedStep];
    if (following) {
      router.push(wizardHref(next.id, following));
    }
  };

  const current = requestedStep;
  const nextStep = NEXT_STEP[current];
  const showFooterNext = current === "DESIGN";
  const title = snapshot?.niche ? `Генератор — ${snapshot.niche}` : "Генератор";

  if (!isNew && query.isLoading) {
    return <ResultLoader label="Загрузка проекта..." />;
  }
  if (!isNew && query.error) {
    return <PlaceholderText>{apiErrorMessage(query.error, "Проект не найден.")}</PlaceholderText>;
  }
  if (!isNew && !snapshot) {
    return <ResultLoader label="Загрузка проекта..." />;
  }

  return (
    <Page>
      <PageHeader title={title} />
      <Stepper>
        {WIZARD_STEPS.map((item) => {
          const reachable = isNew ? item.id === "PROJECT" : isStepReachable(snapshot, item.id);
          const active = item.id === current;
          return (
            <StepButton
              key={item.id}
              type="button"
              $active={active}
              disabled={!reachable}
              onClick={() => {
                if (isNew) {
                  return;
                }
                if (snapshot) {
                  router.push(wizardHref(snapshot.id, item.id));
                }
              }}
            >
              {item.label}
            </StepButton>
          );
        })}
      </Stepper>
      {current === "PROJECT" ? <ProjectStep snapshot={snapshot} onSaved={handleSaved} onContinue={handleContinue} /> : null}
      {current === "BRIEF" && snapshot ? <BriefStep snapshot={snapshot} onSaved={handleSaved} onContinue={handleContinue} /> : null}
      {current === "KEYWORDS" && snapshot ? <KeywordsStep snapshot={snapshot} onSaved={handleSaved} onContinue={handleContinue} /> : null}
      {current === "DOMAINS" && snapshot ? <DomainsStep snapshot={snapshot} onSaved={handleSaved} onContinue={handleContinue} /> : null}
      {current === "DESIGN" && snapshot ? <DesignStep snapshot={snapshot} onSaved={handleSaved} /> : null}
      {current === "SEO" && snapshot ? <SeoStep snapshot={snapshot} onSaved={handleSaved} onContinue={handleContinue} /> : null}
      {current === "RUN" && snapshot ? <RunStep snapshot={snapshot} onSaved={handleSaved} /> : null}
      {current === "RESULTS" && snapshot ? <ResultsStep snapshot={snapshot} /> : null}
      {showFooterNext && nextStep ? (
        <Footer>
          <Button
            type="button"
            variant="primary"
            disabled={!saved || (isNew && !snapshot)}
            onClick={() => {
              if (!snapshot) {
                return;
              }
              router.push(wizardHref(snapshot.id, nextStep));
            }}
          >
            Далее
          </Button>
        </Footer>
      ) : null}
    </Page>
  );
}

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
`;

const Stepper = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const StepButton = styled.button<{ $active: boolean }>`
  border: 1px solid ${({ theme, $active }) => ($active ? theme.tokens.color.accent : theme.tokens.color.borderSubtle)};
  background: ${({ theme, $active }) => ($active ? theme.tokens.color.accentMuted : theme.tokens.color.bgSurface)};
  color: ${({ theme }) => theme.tokens.color.textPrimary};
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 13px;
  cursor: pointer;

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-start;
`;
