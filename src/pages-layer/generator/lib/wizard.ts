import type {
  GeneratorProjectListItem,
  GeneratorProjectSnapshot,
  GeneratorProjectStatus,
  GeneratorStreamStage,
  GeneratorStreamStatus,
  GeneratorWizardStep,
} from "@entities/generator/types";
import { ROUTES } from "@shared/config/routes";

export const WIZARD_STEPS: Array<{ id: GeneratorWizardStep; slug: string; label: string }> = [
  { id: "PROJECT", slug: "project", label: "Проект" },
  { id: "BRIEF", slug: "brief", label: "Бриф" },
  { id: "KEYWORDS", slug: "keywords", label: "Ключи" },
  { id: "DESIGN", slug: "design", label: "Дизайн" },
  { id: "DOMAINS", slug: "domains", label: "Домены" },
  { id: "SEO", slug: "seo", label: "SEO" },
  { id: "RUN", slug: "run", label: "Запуск" },
  { id: "RESULTS", slug: "results", label: "Результаты" },
];

export const WIZARD_STEPPER_STEPS = WIZARD_STEPS.filter((item) => item.id !== "SEO" && item.id !== "RUN");

export const NEXT_WIZARD_STEP: Partial<Record<GeneratorWizardStep, GeneratorWizardStep>> = {
  PROJECT: "BRIEF",
  BRIEF: "KEYWORDS",
  KEYWORDS: "DESIGN",
  DESIGN: "DOMAINS",
  DOMAINS: "RESULTS",
  SEO: "RESULTS",
  RUN: "RESULTS",
};

export function isLaunchWizardStep(step: GeneratorWizardStep): boolean {
  return step === "DOMAINS" || step === "SEO" || step === "RUN";
}

export function canonicalWizardStep(step: GeneratorWizardStep): GeneratorWizardStep {
  return isLaunchWizardStep(step) ? "DOMAINS" : step;
}

const WIZARD_STASH_PREFIX = "generator-wizard-snapshot:";

type WizardStash = {
  snapshot: GeneratorProjectSnapshot;
  continuedFrom: GeneratorWizardStep | null;
};

export function readWizardStash(projectId: number | string | undefined): WizardStash | null {
  if (!projectId || typeof window === "undefined") {
    return null;
  }
  try {
    const raw = sessionStorage.getItem(`${WIZARD_STASH_PREFIX}${projectId}`);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as WizardStash;
    if (!parsed?.snapshot?.id) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeWizardStash(
  snapshot: GeneratorProjectSnapshot,
  continuedFrom: GeneratorWizardStep | null,
): void {
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.setItem(
    `${WIZARD_STASH_PREFIX}${snapshot.id}`,
    JSON.stringify({ snapshot, continuedFrom }),
  );
}

function wizardProgress(snapshot: GeneratorProjectSnapshot): number {
  const order = WIZARD_STEPS.map((item) => item.id);
  const stepIndex = Math.max(0, order.indexOf(snapshot.currentStep));
  const completedCount = Object.values(snapshot.completedSteps).filter(Boolean).length;
  return stepIndex * 10 + completedCount;
}

export function preferFresherSnapshot(
  current: GeneratorProjectSnapshot | undefined,
  incoming: GeneratorProjectSnapshot,
): GeneratorProjectSnapshot {
  if (!current || current.id !== incoming.id) {
    return incoming;
  }
  return wizardProgress(incoming) >= wizardProgress(current) ? incoming : current;
}

export const PROJECT_STATUS_LABEL: Record<GeneratorProjectStatus, string> = {
  DRAFT: "Черновик",
  RUNNING: "В процессе",
  COMPLETED: "Завершено",
  ERROR: "Ошибка",
};

export const STREAM_STATUS_LABEL: Record<GeneratorStreamStatus, string> = {
  WAITING: "Ожидание",
  RUNNING: "В процессе",
  DONE: "Готово",
  ERROR: "Ошибка",
};

export const STREAM_STAGE_LABEL: Record<GeneratorStreamStage, string> = {
  CONTENT: "Контент",
  BUILD: "Сборка",
  IMAGES: "Изображения",
  DEPLOY: "Деплой",
};

function stepSlug(step: GeneratorWizardStep): string {
  return WIZARD_STEPS.find((item) => item.id === step)?.slug ?? "project";
}

export function stepFromSlug(slug: string | undefined): GeneratorWizardStep | null {
  if (!slug) {
    return null;
  }
  return WIZARD_STEPS.find((item) => item.slug === slug)?.id ?? null;
}

export function wizardHref(id: number | string, step: GeneratorWizardStep): string {
  return `${ROUTES.GENERATOR}/${id}/${stepSlug(canonicalWizardStep(step))}`;
}

export function continueHref(item: Pick<GeneratorProjectListItem, "id" | "status">): string {
  if (item.status === "RUNNING" || item.status === "ERROR") {
    return wizardHref(item.id, "DOMAINS");
  }
  return `${ROUTES.GENERATOR}/${item.id}`;
}

export function resultsHref(item: Pick<GeneratorProjectListItem, "id">): string {
  return wizardHref(item.id, "RESULTS");
}

export function canOpenResults(item: Pick<GeneratorProjectListItem, "lastRunAt" | "status">): boolean {
  return Boolean(item.lastRunAt) && item.status !== "RUNNING";
}

export function formatRunAt(value: string | null | undefined): string {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const parts = new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${pick("day")}.${pick("month")}.${pick("year")} ${pick("hour")}:${pick("minute")}`;
}

export function isStepReachable(snapshot: GeneratorProjectSnapshot | undefined, step: GeneratorWizardStep): boolean {
  if (!snapshot) {
    return step === "PROJECT";
  }
  const target = canonicalWizardStep(step);
  const current = canonicalWizardStep(snapshot.currentStep);
  const order = WIZARD_STEPPER_STEPS.map((item) => item.id);
  const currentIndex = order.indexOf(current);
  const targetIndex = order.indexOf(target);
  if (targetIndex <= currentIndex) {
    return true;
  }
  const flags = snapshot.completedSteps;
  const completed: Record<GeneratorWizardStep, boolean> = {
    PROJECT: flags.project,
    BRIEF: flags.brief,
    KEYWORDS: flags.keywords,
    DOMAINS: flags.domains,
    DESIGN: flags.design,
    SEO: flags.seo,
    RUN: flags.seo,
    RESULTS: snapshot.action === "OPEN" || Boolean(snapshot.lastRunAt && !snapshot.running),
  };
  return completed[target];
}

export function isStepComplete(snapshot: GeneratorProjectSnapshot, step: GeneratorWizardStep): boolean {
  const flags = snapshot.completedSteps;
  switch (step) {
    case "PROJECT":
      return flags.project;
    case "BRIEF":
      return flags.brief;
    case "KEYWORDS":
      return flags.keywords;
    case "DOMAINS":
      return flags.domains;
    case "DESIGN":
      return flags.design;
    case "SEO":
      return flags.seo;
    case "RUN":
    case "RESULTS":
      return true;
    default:
      return false;
  }
}
