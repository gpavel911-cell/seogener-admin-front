import type { Page } from "@shared/api";

export enum RegistrarDomainPresence {
  PRESENT = "PRESENT",
  MISSING = "MISSING",
}

export enum RegistrarProviderType {
  REG_RU = "REG_RU",
}

export const REGISTRAR_PROVIDER_TYPES = Object.values(RegistrarProviderType) as RegistrarProviderType[];

export const REGISTRAR_PROVIDER_TYPE_LABELS: Record<RegistrarProviderType, string> = {
  [RegistrarProviderType.REG_RU]: "Рег.ру",
};

export const getRegistrarProviderTypeLabel = (registrar: RegistrarProviderType): string =>
  REGISTRAR_PROVIDER_TYPE_LABELS[registrar] ?? registrar;

export enum RegistrarDomainState {
  INACTIVE = "INACTIVE",
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
  DELETED = "DELETED",
  TRANSFERRED = "TRANSFERRED",
}

export type RegistrarDomainDto = {
  id: number;
  registrar: RegistrarProviderType;
  profile: string;
  serviceId: string;
  domainName: string;
  status?: RegistrarDomainState | null;
  expirationDate?: string | null;
  presence: RegistrarDomainPresence;
  lastSeenAt: string;
  additionalInfo?: Record<string, unknown>;
};

export type RegistrarDomainListResponse = Page<RegistrarDomainDto>;

export type RegistrarDomainOptionDto = {
  value: string;
  label: string;
};

export type RegistrarDomainListRequest = {
  pageNumber: number;
  pageSize: number;
  profile: string;
  registrar: RegistrarProviderType;
};

export type RegistrarDomainProfileDto = {
  registrar: RegistrarProviderType;
  profile: string;
};

export type CreateARecordRequest = {
  registrar: RegistrarProviderType;
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

export type CreateTxtRecordRequest = {
  registrar: RegistrarProviderType;
  profileId: string;
  domain: string;
  subdomain?: string;
  text: string;
};

export type CreateTxtRecordResponse = {
  result: string;
  errorCode?: string | null;
  errorText?: string | null;
  note?: string | null;
};

export type ListDnsRecordsRequest = {
  registrar: RegistrarProviderType;
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

export enum DomainMatrixJobStatus {
  QUEUED = "QUEUED",
  RUNNING = "RUNNING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

export enum DomainMatrixJobStage {
  VALIDATING = "VALIDATING",
  PROCESSING = "PROCESSING",
  WRITING = "WRITING",
  FINALIZING = "FINALIZING",
}

export type DomainMatrixStartResponse = {
  jobId: string;
  status: DomainMatrixJobStatus;
};

export type DomainMatrixStatusResponse = {
  jobId: string;
  status: DomainMatrixJobStatus;
  stage: DomainMatrixJobStage;
  progressPercent: number;
  totalCells: number;
  processedCells: number;
  successCells: number;
  failedCells: number;
  skippedCells: number;
  latestError?: string | null;
  updatedAt: string;
};

export type DomainMatrixImportDto = {
  id: string;
  name: string;
  registrar: RegistrarProviderType;
  profile: string;
  rowsTotal: number;
  rowsWithDomain: number;
  totalPrice: number;
  createdAt: string;
  updatedAt: string;
};

export type DomainMatrixImportRowDto = {
  id: number;
  phrase1: string;
  phrase2: string;
  domain?: string | null;
  price?: number | null;
  isPurchased: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateDomainMatrixImportPayload = {
  file: File;
  profileId: string;
  name?: string;
};

export type UpdateDomainMatrixImportPayload = {
  importId: string;
  name: string;
};

export type DeleteDomainMatrixImportPayload = {
  importId: string;
};

export type GenerateDomainMatrixImportPayload = {
  importId: string;
};

export type GetDomainMatrixImportRowsPayload = {
  importId: string;
  pageNumber: number;
  pageSize: number;
};

export type RegenerateDomainMatrixRowPayload = {
  rowId: number;
};

export enum Environment {
  TEST = "TEST",
  PROD = "PROD",
}

export enum DomainMatrixPurchaseItemStatus {
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
  SKIPPED = "SKIPPED",
}

export type PurchaseDomainMatrixImportPayload = {
  importId: string;
};

export type PurchaseDomainMatrixRowPayload = {
  rowId: number;
};

export type DomainMatrixRowPurchaseResponse = {
  rowId: number;
  status: DomainMatrixPurchaseItemStatus;
  environment: Environment;
  row: DomainMatrixImportRowDto;
};
