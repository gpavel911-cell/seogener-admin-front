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
  createdAt?: string | null;
  lastSeenAt?: string | null;
  updatedAt: string;
  additionalInfoJson?: Record<string, unknown> | null;
};

export type MetricsCountersListResponse = Page<MetricsCounterDto>;

export type MetricsCounterOptionDto = {
  value: string;
  label: string;
};

export type MetricsCounterListRequest = {
  pageNumber: number;
  pageSize: number;
  provider: MetricsProviderType;
  profile: string;
  query?: string;
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

export enum MetricsCounterImportRowStatus {
  PENDING = "PENDING",
  CREATED = "CREATED",
  ALREADY_EXISTS = "ALREADY_EXISTS",
  FAILED = "FAILED",
}

export enum MetricsCounterBulkJobStatus {
  QUEUED = "QUEUED",
  RUNNING = "RUNNING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

export enum MetricsCounterBulkJobStage {
  VALIDATING = "VALIDATING",
  PROCESSING = "PROCESSING",
  WRITING = "WRITING",
  FINALIZING = "FINALIZING",
}

export type MetricsCounterImportDto = {
  id: string;
  name: string;
  provider: MetricsProviderType;
  profile: string;
  rowsTotal: number;
  rowsCreated: number;
  rowsAlreadyExists: number;
  rowsFailed: number;
  createdAt: string;
  updatedAt: string;
};

export type MetricsCounterImportRowDto = {
  id: number;
  counterName: string;
  provider: MetricsProviderType;
  profile: string;
  domain: string;
  status: MetricsCounterImportRowStatus;
  counterId?: string | null;
  errorMessage?: string | null;
  attempts: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateMetricsCounterImportPayload = {
  file: File;
  provider: MetricsProviderType;
  profile: string;
  name?: string;
};

export type GetMetricsCounterImportsPayload = {
  provider: MetricsProviderType;
  profile: string;
};

export type UpdateMetricsCounterImportPayload = {
  importId: string;
  name: string;
};

export type DeleteMetricsCounterImportPayload = {
  importId: string;
};

export type GetMetricsCounterImportRowsPayload = {
  importId: string;
  pageNumber: number;
  pageSize: number;
};

export type StartMetricsCounterImportCreateMissingPayload = {
  importId: string;
};

export type CreateMetricsCounterImportRowPayload = {
  importId: string;
  rowId: number;
};

export type MetricsCounterBulkStartResponse = {
  jobId: string;
  status: MetricsCounterBulkJobStatus;
};

export type MetricsCounterBulkJobStatusResponse = {
  jobId: string;
  status: MetricsCounterBulkJobStatus;
  stage: MetricsCounterBulkJobStage;
  progressPercent: number;
  totalRows: number;
  processedRows: number;
  createdRows: number;
  alreadyExistsRows: number;
  failedRows: number;
  latestError?: string | null;
  updatedAt: string;
};

export type MetricsCounterSingleCreateResponse = {
  rowId: number;
  status: MetricsCounterImportRowStatus;
  counterId?: string | null;
  errorMessage?: string | null;
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
