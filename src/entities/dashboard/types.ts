import type { Page } from "@shared/api";

export type DashboardListRequest = {
  pageNumber: number;
  pageSize: number;
  projectId?: number;
  query?: string;
};

export type DashboardRowDto = {
  projectName?: string | null;
  siteId: number;
  domain: string;
  totalPages?: number | null;
  inSearchCount?: number | null;
  recrawlCount?: number | null;
  outOfIndexCount?: number | null;
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

export type DashboardSelectiveRecrawlItemDto = {
  url: string;
  status: "queued" | "already queued" | "invalid" | "quota blocked";
};

export type DashboardSelectiveRecrawlResponseDto = {
  quotaRemainder?: number | null;
  results: DashboardSelectiveRecrawlItemDto[];
};

export type DashboardListResponse = Page<DashboardRowDto>;
