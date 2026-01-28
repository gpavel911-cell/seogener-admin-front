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
