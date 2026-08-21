import type { Page } from "@shared/api";

export type GeneratorProjectStatus = "DRAFT" | "RUNNING" | "COMPLETED" | "ERROR";
export type GeneratorProjectAction = "OPEN" | "CONTINUE";
export type GeneratorWizardStep =
  | "PROJECT"
  | "BRIEF"
  | "KEYWORDS"
  | "DESIGN"
  | "DOMAINS"
  | "SEO"
  | "RUN"
  | "RESULTS";
export type GeneratorSiteType = "NICHE" | "AGGREGATOR";
export type GeneratorKeywordLanguage = "BOTH" | "RU" | "EN";
export type GeneratorUploadType = "KEYSO" | "SF";
export type GeneratorContentDepth = "DETAILED" | "EXPERT";
export type GeneratorKeywordProcessStatus = "IDLE" | "RUNNING" | "DONE" | "ERROR";
export type GeneratorStreamStage = "CONTENT" | "IMAGES" | "BUILD" | "DEPLOY";
export type GeneratorStreamStatus = "WAITING" | "RUNNING" | "DONE" | "ERROR";

export type GeneratorCompletedSteps = {
  project: boolean;
  brief: boolean;
  keywords: boolean;
  domains: boolean;
  design: boolean;
  seo: boolean;
};

export type GeneratorBrief = {
  audience: string | null;
  usp: string | null;
  tone: string | null;
  objections: string | null;
};

export type GeneratorKeywordItem = {
  keyword: string;
  frequency: number;
};

export type GeneratorCompetitor = {
  domain: string | null;
  type: string | null;
  filename: string | null;
};

export type GeneratorDomain = {
  domain: string;
  clusterId: string | null;
  h1: string | null;
  siteName: string | null;
  siteType: GeneratorSiteType;
  geo: string | null;
  status?: GeneratorStreamStatus | null;
  stage?: GeneratorStreamStage | null;
  lastRunAt?: string | null;
};

export type GeneratorDesign = {
  id: string | null;
  name: string | null;
  phase: string | null;
};

export type GeneratorCta = {
  text: string | null;
  url: string | null;
};

export type GeneratorCluster = {
  service?: string;
  h1_main?: string;
  h1?: string;
  cluster_id?: string | number;
  clusterId?: string;
  domain_slug?: string;
  kw_count?: number;
  keywords?: unknown;
};

export type GeneratorExclusionPage = {
  url_slug?: string;
  slug?: string;
  h1?: string;
};

export type GeneratorPageBlock = {
  name?: string;
  label?: string;
};

export type GeneratorSeoDomain = {
  domain: string;
  geo: string | null;
  sitemapEnabled: boolean;
  overrideCtas: boolean;
  ctas: GeneratorCta[];
};

export type GeneratorSeoSettings = {
  contactPhone: string | null;
  contactEmail: string | null;
  ctas: GeneratorCta[];
  domains: GeneratorSeoDomain[];
  contentDepth: GeneratorContentDepth;
  excludedSlugs: string[];
  excludedBlocks: Record<string, string[]>;
  pagesForExclusion: GeneratorExclusionPage[];
  blocksByPageType: Record<string, GeneratorPageBlock[]>;
};

export type GeneratorProjectListItem = {
  id: number;
  name: string | null;
  niche: string | null;
  domainCount: number;
  status: GeneratorProjectStatus;
  lastRunAt: string | null;
  action: GeneratorProjectAction;
};

export type GeneratorProjectSnapshot = GeneratorProjectListItem & {
  geo: string | null;
  siteType: GeneratorSiteType;
  completedSteps: GeneratorCompletedSteps;
  currentStep: GeneratorWizardStep;
  brief: GeneratorBrief;
  keywords: GeneratorKeywordItem[];
  competitors: GeneratorCompetitor[];
  clusters: GeneratorCluster[];
  rawClusters: GeneratorCluster[];
  keywordLanguage: GeneratorKeywordLanguage;
  domains: GeneratorDomain[];
  design: GeneratorDesign | null;
  seoSettings: GeneratorSeoSettings;
  running: boolean;
};

export type GeneratorProjectsListResponse = Page<GeneratorProjectListItem>;

export type GeneratorKeywordProcessStatusDto = {
  status: GeneratorKeywordProcessStatus;
  error: string | null;
};

export type GeneratorBriefAnalyzeResponse = {
  ok: boolean;
  brief: Record<string, unknown>;
  error: string | null;
};

export type GeneratorDesignListItem = {
  id: string;
  name: string;
  previewUrl: string;
};

export type GeneratorPageType = {
  id: string;
  label: string;
  required: string[];
  optional: string[];
};

export type GeneratorStreamTicket = {
  ticket: string;
  expiresInSeconds: number;
};

export type GeneratorResultSite = {
  domain: string;
  service: string | null;
  pagesCount: number;
  lastRunAt: string | null;
  status: string | null;
  exportAvailable: boolean;
};

export type GeneratorResultPage = {
  domain: string;
  path: string;
  status: string | null;
};

export type GeneratorResults = {
  sites: GeneratorResultSite[];
  pages: GeneratorResultPage[];
};

export type GeneratorLogEvent = {
  msg?: string;
  level?: string;
  domain?: string;
  stage?: string;
  status?: string;
  time?: string;
  replay?: boolean;
};
