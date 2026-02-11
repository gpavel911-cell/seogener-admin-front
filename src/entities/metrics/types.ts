import type { Page } from "@shared/api";

export enum MetricsProviderType {
  YANDEX_METRICA = "YANDEX_METRICA",
}

export const METRICS_PROVIDER_TYPES = Object.values(MetricsProviderType) as MetricsProviderType[];

export const METRICS_PROVIDER_TYPE_LABELS: Record<MetricsProviderType, string> = {
  [MetricsProviderType.YANDEX_METRICA]: "Яндекс Метрика",
};

export const getMetricsProviderTypeLabel = (provider: MetricsProviderType): string =>
  METRICS_PROVIDER_TYPE_LABELS[provider] ?? provider;

export enum MetricsCounterStatus {
  ACTIVE = "ACTIVE",
  DELETED = "DELETED",
}

export enum MetricsCounterPresence {
  PRESENT = "PRESENT",
  MISSING = "MISSING",
}

export type MetricsProfileDto = {
  provider: MetricsProviderType;
  profile: string;
};

export type MetricsCounterDto = {
  id: number;
  provider: MetricsProviderType;
  profile: string;
  counterId: string;
  counterName?: string | null;
  siteUrl?: string | null;
  status?: MetricsCounterStatus | null;
  presence?: MetricsCounterPresence | null;
  lastSeenAt?: string | null;
  updatedAt: string;
};

export type MetricsCounterDetailsDto = {
  id: number;
  provider: MetricsProviderType;
  profile: string;
  counterId: string;
  counterName?: string | null;
  siteUrl?: string | null;
  status?: MetricsCounterStatus | null;
  presence?: MetricsCounterPresence | null;
  createdAt: string;
  lastSeenAt?: string | null;
  updatedAt: string;
  additionalInfoJson?: Record<string, unknown> | null;
};

export type MetricsCountersListResponse = Page<MetricsCounterDto>;

export type MetricsCounterListRequest = {
  pageNumber: number;
  pageSize: number;
  provider: MetricsProviderType;
  profile: string;
};

export type MetricsCounterStatisticsRequest = {
  counterId: string;
  provider: MetricsProviderType;
  profile: string;
  date1?: string;
  date2?: string;
};

export type MetricsCounterCreateRequest = {
  provider: MetricsProviderType;
  profile: string;
  counterName: string;
  siteUrl: string;
};

export type MetricsCounterStatisticsRow = {
  dimensionValues: string[];
  metricValues: number[];
};

export type MetricsCounterStatisticsResponseItem = {
  metrics: string[];
  dimensions: string[];
  totals: number[];
  rows: MetricsCounterStatisticsRow[];
  containsSensitiveData: boolean;
};

export type MetricsCounterStatisticsResponse = {
  visits: MetricsCounterStatisticsResponseItem;
  entryPages: MetricsCounterStatisticsResponseItem;
  urlViews: MetricsCounterStatisticsResponseItem;
};

export type MetricsGoalDailyConversionPoint = {
  date: string;
  conversionRate?: number | null;
};

export type MetricsGoalDto = {
  id: number;
  name?: string | null;
  type?: string | null;
  status?: string | null;
  isFavorite?: boolean | null;
  goalSource?: string | null;
  defaultPrice?: number | null;
  isRetargeting?: boolean | null;
  prevGoalId?: number | null;
  flag?: string | null;
  conditions?: unknown[] | null;
  conversionRate?: number | null;
  goalReaches?: number | null;
  goalVisits?: number | null;
  dailyConversion?: MetricsGoalDailyConversionPoint[] | null;
  additionalInfo?: Record<string, unknown> | null;
};

export type MetricsCounterGoalsResponse = {
  goals: MetricsGoalDto[];
};

export type MetricsCounterGoalsRequest = {
  provider: MetricsProviderType;
  counterId: string;
  profile: string;
  date1?: string;
  date2?: string;
};
