import type { Page } from "@shared/api";

export enum AnalyticsProvider {
  YANDEX_METRICA = "YANDEX_METRICA",
}

export type AnalyticsCounterDto = {
  id: number;
  provider: AnalyticsProvider;
  counterId: string;
  counterName?: string | null;
  siteUrl?: string | null;
  updatedAt: string;
};

export type AnalyticsCountersListResponse = Page<AnalyticsCounterDto>;

export type AnalyticsCounterListRequest = {
  pageNumber: number;
  pageSize: number;
  provider: AnalyticsProvider;
};

export type AnalyticsCounterReportRequest = {
  counterId: string;
  provider: AnalyticsProvider;
  date1?: string;
  date2?: string;
};

export type AnalyticsCounterReportRow = {
  dimensionValues: string[];
  metricValues: number[];
};

export type AnalyticsCounterReportResponse = {
  metrics: string[];
  dimensions: string[];
  totals: number[];
  rows: AnalyticsCounterReportRow[];
  containsSensitiveData: boolean;
};

export type AnalyticsCounterReportsResponse = {
  visits: AnalyticsCounterReportResponse;
  entryPages: AnalyticsCounterReportResponse;
  urlViews: AnalyticsCounterReportResponse;
};
