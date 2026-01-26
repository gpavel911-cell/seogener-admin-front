import type { Page } from "@shared/api";

export enum RegistrarPresence {
  PRESENT = "PRESENT",
  MISSING = "MISSING",
}

export enum RegistrarType {
  REG_RU = "REG_RU",
}

export type DomainDto = {
  id: number;
  registrar: RegistrarType;
  profile: string;
  serviceId: string;
  dname: string;
  state?: string | null;
  expirationDate?: string | null;
  registrarPresence: RegistrarPresence;
  lastSeenAt: string;
};

export type DomainListResponse = Page<DomainDto>;

export type DomainDetailsDto = {
  id: number;
  registrar: RegistrarType;
  profile: string;
  serviceId: string;
  dname: string;
  state?: string | null;
  expirationDate?: string | null;
  registrarPresence: RegistrarPresence;
  lastSeenAt: string;
  detailsSyncedAt?: string | null;
  additionalInfo?: Record<string, unknown>;
};
