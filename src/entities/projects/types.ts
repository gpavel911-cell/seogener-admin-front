import type { Page } from "@shared/api";

export type ProjectDto = {
  id: number;
  name: string;
  sitesCount: number;
};

export type ProjectOptionDto = {
  value: string;
  label: string;
};

export type ProjectSiteDto = {
  siteId: number;
  siteUrl: string;
  projectId?: number | null;
  projectName?: string | null;
};

export type ProjectSitesListRequest = {
  pageNumber: number;
  pageSize: number;
  projectId?: number;
  unassigned?: boolean;
  siteQuery?: string;
};

export type ProjectSitesListResponse = Page<ProjectSiteDto>;

export type ProjectCreateRequest = {
  name: string;
  siteIds: number[];
};

export type ProjectRenameRequest = {
  projectId: string;
  name: string;
};

export type ProjectDeleteRequest = {
  projectId: string;
};

export type ProjectUnassignSitesRequest = {
  projectId: string;
  siteIds: number[];
};

export type ProjectAssignSitesRequest = {
  projectId: string;
  siteIds: number[];
};
