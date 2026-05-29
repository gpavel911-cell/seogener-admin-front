import type { Page } from "@shared/api";

export enum DashboardStatus {
  GROWTH = "GROWTH",
  DECLINE = "DECLINE",
  STAGNATION = "STAGNATION",
  NO_DATA = "NO_DATA",
}

export const DASHBOARD_STATUS_LABELS: Record<DashboardStatus, string> = {
  [DashboardStatus.GROWTH]: "Рост",
  [DashboardStatus.DECLINE]: "Падение",
  [DashboardStatus.STAGNATION]: "Стагнация",
  [DashboardStatus.NO_DATA]: "Нет данных",
};

export const getDashboardStatusLabel = (status: DashboardStatus): string => DASHBOARD_STATUS_LABELS[status] ?? status;

export type DashboardListRequest = {
  dateFrom: string;
  dateTo: string;
  pageNumber: number;
  pageSize: number;
  projectId?: number;
  status?: DashboardStatus;
  query?: string;
};

export type DashboardRowDto = {
  projectName?: string | null;
  siteId: number;
  domain: string;
  status: DashboardStatus;
  indexing?: number | null;
  impressions?: number | null;
  clicks?: number | null;
  position?: number | null;
};

export type DashboardListResponse = Page<DashboardRowDto>;
