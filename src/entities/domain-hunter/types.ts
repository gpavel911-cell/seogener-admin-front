import type { Page } from "@shared/api";

export type DomainHunterStatusResponse = {
  running: boolean;
  niche: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  error: string | null;
};

export type DomainHunterRunResponse = {
  status: string;
  niche: string;
};

export type DomainHunterStopResponse = {
  status: string;
};

export type DomainHunterLogResponse = {
  text: string;
};

export type DomainHunterResultFile = {
  filename: string;
};

export type DomainHunterResultTable = {
  filename: string;
  columns: string[];
  rows: Array<Record<string, string | number | boolean | null>>;
};

export type DomainHunterResultsPage = Page<DomainHunterResultFile>;
