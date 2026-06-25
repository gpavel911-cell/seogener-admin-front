import type { Page } from "@shared/api";
import type { RegistrarProviderType } from "@entities/registrars/types";

export enum WebmasterProviderType {
  YANDEX_WEBMASTER = "YANDEX_WEBMASTER",
}

export const WEBMASTER_PROVIDER_TYPES = Object.values(WebmasterProviderType) as WebmasterProviderType[];

export const WEBMASTER_PROVIDER_TYPE_LABELS: Record<WebmasterProviderType, string> = {
  [WebmasterProviderType.YANDEX_WEBMASTER]: "Яндекс Вебмастер",
};

export const getWebmasterProviderTypeLabel = (provider: WebmasterProviderType): string =>
  WEBMASTER_PROVIDER_TYPE_LABELS[provider] ?? provider;

export enum WebmasterHostPresence {
  PRESENT = "PRESENT",
  MISSING = "MISSING",
}

export type WebmasterProfileDto = {
  provider: WebmasterProviderType;
  profile: string;
};

export type WebmasterApiResponse = Record<string, unknown>;

export type WebmasterHostListRequest = {
  provider: WebmasterProviderType;
  profile: string;
  pageNumber?: number;
  pageSize?: number;
  query?: string;
};

export type WebmasterHostDto = {
  id: number;
  provider: WebmasterProviderType;
  profile: string;
  hostId: string;
  hostUrl?: string | null;
  verified?: boolean | null;
  presence: WebmasterHostPresence;
  createdAt?: string | null;
  lastSeenAt: string;
  updatedAt: string;
  additionalInfoJson?: Record<string, unknown> | null;
};

export type WebmasterHostsListResponse = Page<WebmasterHostDto>;

export type WebmasterHostOptionDto = {
  value: string;
  label: string;
};

export type WebmasterHostCreateRequest = {
  provider: WebmasterProviderType;
  profile: string;
  hostUrl: string;
};

export enum WebmasterHostImportRowStatus {
  PENDING = "PENDING",
  READY = "READY",
  ALREADY_BOUND = "ALREADY_BOUND",
  SENT = "SENT",
  FAILED = "FAILED",
  INVALID = "INVALID",
}

export enum WebmasterHostImportJobStatus {
  QUEUED = "QUEUED",
  RUNNING = "RUNNING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

export enum WebmasterHostImportJobStage {
  VALIDATING = "VALIDATING",
  PROCESSING = "PROCESSING",
  WRITING = "WRITING",
  FINALIZING = "FINALIZING",
}

export type WebmasterHostImportDto = {
  id: string;
  name: string;
  registrar: RegistrarProviderType;
  registrarProfile: string;
  webmasterProfile: string;
  rowsTotal: number;
  rowsReady: number;
  rowsAlreadyBound: number;
  rowsSent: number;
  rowsFailed: number;
  rowsInvalid: number;
  createdAt: string;
  updatedAt: string;
};

export type WebmasterHostImportRowDto = {
  id: number;
  registrar: RegistrarProviderType;
  profile: string;
  domain: string;
  status: WebmasterHostImportRowStatus;
  errorMessage?: string | null;
  attempts: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateWebmasterHostImportPayload = {
  file: File;
  profile: string;
  name?: string;
};

export type GetWebmasterHostImportsPayload = {
  profile: string;
};

export type UpdateWebmasterHostImportPayload = {
  importId: string;
  name: string;
};

export type DeleteWebmasterHostImportPayload = {
  importId: string;
};

export type GetWebmasterHostImportRowsPayload = {
  importId: string;
  pageNumber: number;
  pageSize: number;
};

export type StartWebmasterHostImportPayload = {
  importId: string;
};

export type CreateWebmasterHostImportRowPayload = {
  importId: string;
  rowId: number;
};

export type WebmasterHostImportStartResponse = {
  jobId: string;
  status: WebmasterHostImportJobStatus;
};

export type WebmasterHostImportJobStatusResponse = {
  jobId: string;
  status: WebmasterHostImportJobStatus;
  stage: WebmasterHostImportJobStage;
  progressPercent: number;
  totalRows: number;
  processedRows: number;
  successRows: number;
  failedRows: number;
  skippedRows: number;
  latestError?: string | null;
  updatedAt: string;
};

export type WebmasterHostImportSingleCreateResponse = {
  rowId: number;
  status: WebmasterHostImportRowStatus;
  errorMessage?: string | null;
};

export type WebmasterHostVerifyDnsRequest = {
  provider: WebmasterProviderType;
  profile: string;
  hostId: string;
  hostUrl?: string;
  startVerification?: boolean;
};

export type WebmasterHostVerifyDnsResponse = {
  hostId: string;
  hostUrl: string;
  verificationUin: string;
  verificationType: string;
  verificationState: string;
  verified: boolean | null;
};

export type WebmasterSearchQueriesPopularRequest = {
  provider: WebmasterProviderType;
  profile: string;
  hostId: string;
  dateFrom?: string;
  dateTo?: string;
  orderBy?: string;
  deviceTypeIndicator?: string;
  offset?: number;
  limit?: number;
};

export type WebmasterPopularQueryDto = {
  query: string;
  shows: number | null;
  clicks: number | null;
};

export type WebmasterSearchQueriesHistoryRequest = {
  provider: WebmasterProviderType;
  profile: string;
  hostId: string;
  dateFrom?: string;
  dateTo?: string;
  deviceTypeIndicator?: string;
};

export type WebmasterSearchQueryStatisticsPointDto = {
  date: string;
  shows: number;
  clicks: number;
  ctr: number | null;
  avgShowPosition: number | null;
  avgClickPosition: number | null;
};

export type WebmasterSearchEventsHistoryRequest = {
  provider: WebmasterProviderType;
  profile: string;
  hostId: string;
  dateFrom?: string;
  dateTo?: string;
};

export type WebmasterSearchEventHistoryPointDto = {
  date: string;
  added: number;
  removed: number;
};
