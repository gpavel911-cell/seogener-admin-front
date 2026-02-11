import type { Page } from "@shared/api";

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
};

export type WebmasterHostDto = {
  id: number;
  provider: WebmasterProviderType;
  profile: string;
  hostId: string;
  hostUrl?: string | null;
  verified?: boolean | null;
  presence: WebmasterHostPresence;
  lastSeenAt: string;
  updatedAt: string;
};

export type WebmasterHostsListResponse = Page<WebmasterHostDto>;

export type WebmasterHostDetailsDto = {
  id: number;
  provider: WebmasterProviderType;
  profile: string;
  hostId: string;
  hostUrl?: string | null;
  verified?: boolean | null;
  presence: WebmasterHostPresence;
  createdAt: string;
  lastSeenAt: string;
  updatedAt: string;
  additionalInfoJson?: Record<string, unknown> | null;
};

export type WebmasterHostCreateRequest = {
  provider: WebmasterProviderType;
  profile: string;
  hostUrl: string;
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

export type WebmasterSearchQueryHistoryRequest = WebmasterSearchQueriesHistoryRequest & {
  queryId: string;
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
