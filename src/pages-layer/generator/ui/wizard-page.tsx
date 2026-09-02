"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import styled from "styled-components";
import { skipToken } from "@reduxjs/toolkit/query";
import { generatorApi, useApproveGeneratorDesignMutation, useGetGeneratorProjectQuery } from "@entities/generator/api";
import type { GeneratorProjectSnapshot, GeneratorWizardStep } from "@entities/generator/types";
import { useAppDispatch } from "@shared/store";
import { Button, PageHeader, PlaceholderText, ResultLoader, useToast } from "@shared/ui";
import { apiErrorMessage } from "../lib/api-error";
import {
  canonicalWizardStep,
  isLaunchWizardStep,
  isStepComplete,
  isStepReachable,
  NEXT_WIZARD_STEP,
  preferFresherSnapshot,
  readWizardStash,
  stepFromSlug,
  wizardHref,
  WIZARD_STEPPER_STEPS,
  writeWizardStash,
} from "../lib/wizard";
import { BriefStep } from "./steps/brief-step";
import { DesignStep } from "./steps/design-step";
import { KeywordsStep } from "./steps/keywords-step";
import { LaunchStep } from "./steps/launch-step";
import { ProjectStep } from "./steps/project-step";
import { ResultsStep } from "./steps/results-step";

type WizardPageProps = {
  mode?: "new" | "existing";
};

export function GeneratorWizardPage({ mode = "existing" }: WizardPageProps) {
  const params = useParams<{ id?: string; step?: string }>();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  const isNew = mode === "new";
  const id = isNew ? undefined : params.id;
  const requestedStep = isNew ? "PROJECT" : stepFromSlug(params.step) ?? "PROJECT";
  const query = useGetGeneratorProjectQuery(id ? Number(id) : skipToken);
  const [localSnapshot, setLocalSnapshot] = useState<GeneratorProjectSnapshot | undefined>(
    () => readWizardStash(id)?.snapshot,
  );
  const [savedStep, setSavedStep] = useState<GeneratorWizardStep | null>(
    () => readWizardStash(id)?.continuedFrom ?? null,
  );
  const [designReady, setDesignReady] = useState(false);
  const [approveDesign, { isLoading: isApprovingDesign }] = useApproveGeneratorDesignMutation();
  const handleDesignReady = useCallback((ready: boolean) => {
    setDesignReady(ready);
  }, []);

  useEffect(() => {
    if (isNew || !query.data) {
      return;
    }
    const incoming = query.data;
    setLocalSnapshot((current) => preferFresherSnapshot(current, incoming));
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
    if (isNew || !id) {
      return;
    }
    if (requestedStep === "SEO" || requestedStep === "RUN") {
      router.replace(wizardHref(id, "DOMAINS"));
    }
  }, [id, isNew, requestedStep, router]);

  useEffect(() => {
    if (isNew || !snapshot) {
      return;
    }
    const displayStep = canonicalWizardStep(requestedStep);
    if (isStepReachable(snapshot, displayStep)) {
      return;
    }
    const continuedFrom = savedStep ?? readWizardStash(id)?.continuedFrom ?? null;
    if (continuedFrom && NEXT_WIZARD_STEP[canonicalWizardStep(continuedFrom)] === displayStep) {
      return;
    }
    router.replace(wizardHref(snapshot.id, snapshot.currentStep));
  }, [id, isNew, requestedStep, router, savedStep, snapshot]);

  const applySnapshot = (next: GeneratorProjectSnapshot, continuedFrom: GeneratorWizardStep | null) => {
    setLocalSnapshot(next);
    setSavedStep(continuedFrom);
    writeWizardStash(next, continuedFrom);
    dispatch(generatorApi.util.updateQueryData("getGeneratorProject", Number(next.id), () => next));
  };

  const handleSaved = (next: GeneratorProjectSnapshot) => {
    applySnapshot(next, requestedStep);
  };

  const handleContinue = (next: GeneratorProjectSnapshot) => {
    applySnapshot(next, requestedStep);
    const following = NEXT_WIZARD_STEP[requestedStep];
    if (following) {
      router.push(wizardHref(next.id, following));
    }
  };

  const current = canonicalWizardStep(requestedStep);
  const nextStep = NEXT_WIZARD_STEP[current];
  const showFooterNext = current === "DESIGN";
  const canContinueDesign = saved || designReady;
  const title = snapshot?.niche ? `Генератор — ${snapshot.niche}` : "Генератор";

  const handleDesignNext = async () => {
    if (!snapshot || !nextStep) {
      return;
    }
    if (snapshot.completedSteps.design) {
      handleContinue(snapshot);
      return;
    }
    try {
      const next = await approveDesign(snapshot.id).unwrap();
      handleContinue(next);
    } catch (err) {
      showToast({ variant: "error", message: apiErrorMessage(err, "Не удалось утвердить дизайн.") });
    }
  };

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
        {WIZARD_STEPPER_STEPS.map((item) => {
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
      {current === "DESIGN" && snapshot ? (
        <DesignStep snapshot={snapshot} onSaved={handleSaved} onCanContinueChange={handleDesignReady} />
      ) : null}
      {isLaunchWizardStep(current) && snapshot ? (
        <LaunchStep snapshot={snapshot} requestedStep={requestedStep} onSaved={handleSaved} />
      ) : null}
      {current === "RESULTS" && snapshot ? <ResultsStep snapshot={snapshot} /> : null}
      {showFooterNext && nextStep ? (
        <Footer>
          <Button
            type="button"
            variant="primary"
            disabled={!canContinueDesign || isApprovingDesign || (isNew && !snapshot)}
            onClick={() => void handleDesignNext()}
          >
            {isApprovingDesign ? "Утверждение..." : "Далее"}
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
