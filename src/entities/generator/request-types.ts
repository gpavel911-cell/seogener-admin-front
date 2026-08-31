import type {
  GeneratorContentDepth,
  GeneratorCta,
  GeneratorCluster,
  GeneratorKeywordLanguage,
  GeneratorSiteType,
  GeneratorUploadType,
} from "./types";

export type GeneratorProjectsListRequest = {
  pageNumber: number;
  pageSize: number;
};

export type GeneratorCreateProjectRequest = {
  niche: string;
  geo?: string;
  siteType?: GeneratorSiteType;
};

export type GeneratorUpdateProjectRequest = GeneratorCreateProjectRequest;

export type GeneratorBriefUpdateRequest = {
  audience?: string;
  usp?: string;
  tone?: string;
  objections?: string;
};

export type GeneratorBriefAnalyzeRequest = {
  query?: string;
  segment?: string;
};

export type GeneratorKeywordUploadDeleteRequest = {
  filename: string;
  type: GeneratorUploadType;
};

export type GeneratorKeywordLanguageRequest = {
  language: GeneratorKeywordLanguage;
};

export type GeneratorKeywordCollectRequest = {
  query?: string;
};

export type GeneratorKeywordConfirmRequest = {
  clusters: GeneratorCluster[];
};

export type GeneratorExternalKeywordsRequest = {
  text: string;
};

export type GeneratorDomainMappingRequest = {
  domain: string;
  clusterId: string;
  h1?: string;
  siteName?: string;
  siteType?: GeneratorSiteType;
};

export type GeneratorDomainsUpdateRequest = {
  mappings: GeneratorDomainMappingRequest[];
};

export type GeneratorSuggestDomainMappingRequest = {
  domains: string[];
  clusters: Array<{
    cluster_id: string;
    h1_main: string;
    keywords: string[];
  }>;
};

export type GeneratorDesignSelectRequest = {
  designId: string;
  pageTypes: string[];
};

export type GeneratorWordstatSearchRequest = {
  phrase: string;
};

export type GeneratorWordstatBulkRequest = {
  pages: Array<{ url?: string; h1: string }>;
};

export type GeneratorPrebuiltConfirmRequest = {
  mapping: Record<string, string>;
  pagesHtml: Record<string, string>;
};

export type GeneratorSeoConfigRequest = {
  contactPhone?: string;
  contactEmail?: string;
  ctas?: GeneratorCta[];
  domains?: Array<{
    domain: string;
    geo?: string;
    sitemapEnabled: boolean;
    overrideCtas: boolean;
    ctas?: GeneratorCta[];
  }>;
  contentDepth?: GeneratorContentDepth;
  excludedSlugs?: string[];
  excludedBlocks?: Record<string, string[]>;
};

export type GeneratorRunRequest = {
  forceRegenerate: boolean;
};

export type GeneratorAnalyticsRequest = {
  metrikaId?: string;
  ga4Id?: string;
};
