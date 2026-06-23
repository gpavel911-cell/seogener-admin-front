import type { Page } from "@shared/api";

export type DashboardListRequest = {
  pageNumber: number;
  pageSize: number;
  projectId: number;
  query?: string;
};

export type DashboardAnalyticsRequest = {
  projectId: number;
  query?: string;
  dateFrom: string;
  dateTo: string;
};

export type DashboardMetricsRequest = {
  projectId: number;
  query?: string;
  dateFrom: string;
  dateTo: string;
  pageNumber: number;
  pageSize: number;
};

export type DashboardMetricsRowDto = {
  domain: string;
  pageviews?: number | null;
  visits?: number | null;
  visitors?: number | null;
  entryUrl?: string | null;
  goals?: number | null;
};

export type DashboardMetricsResponse = Page<DashboardMetricsRowDto>;

export type DashboardAnalyticsPointDto = {
  date: string;
  value: number;
};

export type DashboardAnalyticsSeriesDto = {
  key: "added" | "removed";
  label: string;
  points: DashboardAnalyticsPointDto[];
};

export type DashboardSummaryCardDto = {
  key: "total-pages" | "in-search" | "recrawl-completed" | "out-of-index";
  label: string;
  value: number;
  deltaValue?: number | null;
};

export type DashboardAnalyticsResponseDto = {
  series: DashboardAnalyticsSeriesDto[];
  cards: DashboardSummaryCardDto[];
};

export type DashboardRowDto = {
  projectName?: string | null;
  siteId: number;
  domain: string;
  totalPages?: number | null;
  inSearchCount?: number | null;
  recrawlCount?: number | null;
  outOfIndexCount?: number | null;
  notInSearchCount?: number | null;
};

export type DashboardRecrawlReportDto = {
  sentCount: number;
  skippedCount: number;
  quotaLimitedCount: number;
};

export type DashboardBulkRecrawlRequestDto = {
  siteIds: number[];
};

export type DashboardBulkRecrawlResponseDto = DashboardRecrawlReportDto & {
  domains: string[];
  failedDomains: string[];
};

export type DashboardDetailSectionKey = "in-search" | "recrawl-queue" | "out-of-index" | "not-in-search";

export type DashboardDetailRowDto = {
  pageUrl: string;
  lastVisitedAt?: string | null;
  title?: string | null;
  status?: string | null;
  addedAt?: string | null;
  reason?: string | null;
  eventDate?: string | null;
};

export type DashboardDetailSectionDto = {
  key: DashboardDetailSectionKey;
  title: string;
  failed: boolean;
  message?: string | null;
  rows: DashboardDetailRowDto[];
};

export type DashboardDetailShellDto = {
  siteId: number;
  domain: string;
  quotaRemainder?: number | null;
  sections: DashboardDetailSectionDto[];
};

export type DashboardSelectiveRecrawlItemDto = {
  url: string;
  status: "queued" | "already queued" | "invalid" | "quota blocked";
};

export type DashboardSelectiveRecrawlResponseDto = {
  quotaRemainder?: number | null;
  results: DashboardSelectiveRecrawlItemDto[];
};

export type DashboardListResponse = Page<DashboardRowDto>;
