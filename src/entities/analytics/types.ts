import type { Page } from "@shared/api";

export enum AnalyticsProvider {
  YANDEX_METRICA = "YANDEX_METRICA",
}

export enum AnalyticsCounterStatus {
  ACTIVE = "ACTIVE",
  DELETED = "DELETED",
}

export enum AnalyticsCounterPresence {
  PRESENT = "PRESENT",
  MISSING = "MISSING",
}

export type AnalyticsCounterDto = {
  id: number;
  provider: AnalyticsProvider;
  counterId: string;
  counterName?: string | null;
  siteUrl?: string | null;
  status?: AnalyticsCounterStatus | null;
  presence?: AnalyticsCounterPresence | null;
  lastSeenAt?: string | null;
  updatedAt: string;
};

export type AnalyticsCounterDetailsDto = {
  id: number;
  provider: AnalyticsProvider;
  counterId: string;
  counterName?: string | null;
  siteUrl?: string | null;
  status?: AnalyticsCounterStatus | null;
  presence?: AnalyticsCounterPresence | null;
  createdAt: string;
  lastSeenAt?: string | null;
  updatedAt: string;
  additionalInfoJson?: Record<string, unknown> | null;
};

export type AnalyticsCountersListResponse = Page<AnalyticsCounterDto>;

export type AnalyticsCounterListRequest = {
  pageNumber: number;
  pageSize: number;
  provider: AnalyticsProvider;
};

export type AnalyticsCounterStatisticsRequest = {
  counterId: string;
  provider: AnalyticsProvider;
  date1?: string;
  date2?: string;
};

export type AnalyticsCounterCreateRequest = {
  provider: AnalyticsProvider;
  counterName: string;
  siteUrl: string;
};

export type AnalyticsCounterStatisticsRow = {
  dimensionValues: string[];
  metricValues: number[];
};

export type AnalyticsCounterStatisticsResponseItem = {
  metrics: string[];
  dimensions: string[];
  totals: number[];
  rows: AnalyticsCounterStatisticsRow[];
  containsSensitiveData: boolean;
};

export type AnalyticsCounterStatisticsResponse = {
  visits: AnalyticsCounterStatisticsResponseItem;
  entryPages: AnalyticsCounterStatisticsResponseItem;
  urlViews: AnalyticsCounterStatisticsResponseItem;
};
