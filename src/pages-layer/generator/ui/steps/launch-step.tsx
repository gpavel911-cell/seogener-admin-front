"use client";

import { useMemo, useState } from "react";
import styled from "styled-components";
import type { GeneratorProjectSnapshot, GeneratorWizardStep } from "@entities/generator/types";
import { WizardAccordionSection } from "../accordion-section";
import { DomainsStep } from "./domains-step";
import { RunStep } from "./run-step";
import { SeoStep } from "./seo-step";

type LaunchSection = "domains" | "seo" | "run";

type Props = {
  snapshot: GeneratorProjectSnapshot;
  requestedStep: GeneratorWizardStep;
  onSaved: (next: GeneratorProjectSnapshot) => void;
};

function pickLaunchSection(snapshot: GeneratorProjectSnapshot, requestedStep: GeneratorWizardStep): LaunchSection {
  const domainsDone = snapshot.completedSteps.domains;
  const seoDone = snapshot.completedSteps.seo;
  const preferred: LaunchSection =
    requestedStep === "RUN" || snapshot.running || snapshot.status === "ERROR"
      ? "run"
      : requestedStep === "SEO"
        ? "seo"
        : seoDone
          ? "run"
          : domainsDone
            ? "seo"
            : "domains";
  if (preferred === "run" && !seoDone && !snapshot.running) {
    return domainsDone ? "seo" : "domains";
  }
  if (preferred === "seo" && !domainsDone) {
    return "domains";
  }
  return preferred;
}

export function LaunchStep({ snapshot, requestedStep, onSaved }: Props) {
  const [openSection, setOpenSection] = useState<LaunchSection>(() => pickLaunchSection(snapshot, requestedStep));
  const domainsDone = snapshot.completedSteps.domains;
  const seoDone = snapshot.completedSteps.seo;
  const seoUnlocked = domainsDone;
  const runUnlocked = seoDone || snapshot.running;

  const domainsSubtitle = useMemo(() => {
    if (!domainsDone) {
      return "";
    }
    const count = snapshot.domainCount;
    if (count === 1) {
      return "1 домен";
    }
    if (count >= 2 && count <= 4) {
      return `${count} домена`;
    }
    return count ? `${count} доменов` : "Сохранено";
  }, [domainsDone, snapshot.domainCount]);

  const open = (section: LaunchSection) => {
    if (section === "seo" && !seoUnlocked) {
      return;
    }
    if (section === "run" && !runUnlocked) {
      return;
    }
    setOpenSection(section);
  };

  return (
    <Stack>
      <WizardAccordionSection
        number={1}
        title="Маппинг доменов"
        subtitle={domainsSubtitle}
        open={openSection === "domains"}
        done={domainsDone}
        onToggle={() => open("domains")}
      >
        <DomainsStep
          snapshot={snapshot}
          onSaved={onSaved}
          onContinue={(next) => {
            onSaved(next);
            setOpenSection("seo");
          }}
        />
      </WizardAccordionSection>
      <WizardAccordionSection
        number={2}
        title="Настройки контента"
        subtitle={seoDone ? "Подробная глубина" : ""}
        open={openSection === "seo"}
        done={seoDone}
        locked={!seoUnlocked}
        onToggle={() => open("seo")}
      >
        <SeoStep
          snapshot={snapshot}
          onSaved={onSaved}
          onContinue={(next) => {
            onSaved(next);
            setOpenSection("run");
          }}
        />
      </WizardAccordionSection>
      <WizardAccordionSection
        number={3}
        title="Запуск генерации"
        subtitle={snapshot.running ? "В процессе" : snapshot.lastRunAt ? "Есть запуск" : ""}
        open={openSection === "run"}
        done={Boolean(snapshot.lastRunAt) && !snapshot.running}
        locked={!runUnlocked}
        onToggle={() => open("run")}
      >
        {runUnlocked ? <RunStep snapshot={snapshot} onSaved={onSaved} /> : null}
      </WizardAccordionSection>
    </Stack>
  );
}

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
`;
