import type { Page } from "@shared/api";

export type PositioningListRequest = {
  pageNumber: number;
  pageSize: number;
  projectId: number;
  query?: string;
};

export type PositioningRowDto = {
  siteId: number;
  domain: string;
  keywordCount: number;
};

export type PositioningListResponse = Page<PositioningRowDto>;

export type PositioningKeywordDto = {
  id: number;
  keyword: string;
  yandexPosition: string | null;
  googlePosition: string | null;
};

export type PositioningDetailsDto = {
  keywords: PositioningKeywordDto[];
};

export type AddPositioningKeywordRequest = {
  keyword: string;
};

export type PositioningDetailsRequest = {
  siteId: number;
  projectId: number;
};

export type DeletePositioningKeywordRequest = {
  siteId: number;
  projectId: number;
  keywordId: number;
};

export type AddPositioningKeywordArgs = {
  siteId: number;
  projectId: number;
  body: AddPositioningKeywordRequest;
};
