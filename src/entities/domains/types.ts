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
  status?: DomainState | null;
  expirationDate?: string | null;
  presence: RegistrarPresence;
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
  status?: DomainState | null;
  expirationDate?: string | null;
  presence: RegistrarPresence;
  lastSeenAt: string;
  additionalInfo?: Record<string, unknown>;
};

export type CreateARecordRequest = {
  registrar: RegistrarType;
  profileId: string;
  domain: string;
  subdomain?: string;
  ipv4: string;
};

export type CreateARecordResponse = {
  result: string;
  errorCode?: string | null;
  errorText?: string | null;
  note?: string | null;
};

export type ListDnsRecordsRequest = {
  registrar: RegistrarType;
  profileId: string;
  domain: string;
};

export type DnsRecord = {
  subname: string;
  rectype: string;
  content: string;
  priority?: number | null;
  state?: string | null;
};

export type DnsRecordGroup = {
  rectype: string;
  records: DnsRecord[];
};

export type DnsSoa = {
  ttl?: string | null;
  minimumTtl?: string | null;
};

export type ListDnsRecordsResponse = {
  domain: string;
  groups: DnsRecordGroup[];
  soa?: DnsSoa | null;
};
