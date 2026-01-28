import type { Page } from "@shared/api";

export enum RegistrarPresence {
  PRESENT = "PRESENT",
  MISSING = "MISSING",
}

export enum RegistrarType {
  REG_RU = "REG_RU",
}

export enum DomainState {
  INACTIVE = "INACTIVE",
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
  DELETED = "DELETED",
  TRANSFERRED = "TRANSFERRED",
}

export type DomainDto = {
  id: number;
  registrar: RegistrarType;
  profile: string;
  serviceId: string;
  domainName: string;
  state?: DomainState | null;
  expirationDate?: string | null;
  registrarPresence: RegistrarPresence;
  lastSeenAt: string;
};

export type DomainListResponse = Page<DomainDto>;

export type DomainListRequest = {
  pageNumber: number;
  pageSize: number;
  profile: string;
  registrar: RegistrarType;
};

export type DomainProfileDto = {
  registrar: RegistrarType;
  profile: string;
};

export type DomainDetailsDto = {
  id: number;
  registrar: RegistrarType;
  profile: string;
  serviceId: string;
  domainName: string;
  state?: DomainState | null;
  expirationDate?: string | null;
  registrarPresence: RegistrarPresence;
  lastSeenAt: string;
  detailsSyncedAt?: string | null;
  additionalInfo?: Record<string, unknown>;
};
