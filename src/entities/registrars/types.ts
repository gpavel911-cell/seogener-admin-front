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

export type CreateNsRecordRequest = {
  registrar: RegistrarProviderType;
  profileId: string;
  domain: string;
};

export type CreateNsRecordResponse = {
  result: string;
  errorCode?: string | null;
  errorText?: string | null;
  note?: string | null;
};

export enum DnsBulkRecordType {
  A = "A",
  TXT = "TXT",
  NS = "NS",
}

export enum DnsBulkRowStatus {
  PENDING = "PENDING",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
  SKIPPED = "SKIPPED",
}

export enum DnsBulkJobStatus {
  QUEUED = "QUEUED",
  RUNNING = "RUNNING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

export enum DnsBulkJobStage {
  VALIDATING = "VALIDATING",
  PROCESSING = "PROCESSING",
  WRITING = "WRITING",
  FINALIZING = "FINALIZING",
}

export type DnsBulkImportDto = {
  id: string;
  name: string;
  registrar: RegistrarProviderType;
  profile: string;
  recordType: DnsBulkRecordType;
  rowsTotal: number;
  rowsSuccess: number;
  rowsFailed: number;
  rowsSkipped: number;
  createdAt: string;
  updatedAt: string;
};

export type DnsBulkImportRowDto = {
  id: number;
  domain: string;
  host: string;
  recordType: DnsBulkRecordType;
  ipv4?: string | null;
  status: DnsBulkRowStatus;
  lastError?: string | null;
  attempts: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateDnsBulkImportPayload = {
  file: File;
  registrar: RegistrarProviderType;
  profileId: string;
  recordType: DnsBulkRecordType;
  name?: string;
};

export type DnsBulkCreateRecordsPayload = {
  registrar: RegistrarProviderType;
  profileId: string;
  recordType: DnsBulkRecordType;
  rows: Array<{
    domain: string;
    host?: string;
    text?: string;
    ipv4?: string;
  }>;
};

export type DnsBulkCreateRecordsResponse = {
  rows: Array<{
    domain: string;
    host?: string | null;
    ipv4?: string | null;
    status: DnsBulkRowStatus;
    error?: string | null;
  }>;
};

export type GetDnsBulkImportsPayload = {
  registrar: RegistrarProviderType;
  profileId: string;
  recordType: DnsBulkRecordType;
};

export type UpdateDnsBulkImportPayload = {
  importId: string;
  name: string;
};

export type DeleteDnsBulkImportPayload = {
  importId: string;
};

export type GetDnsBulkImportRowsPayload = {
  importId: string;
  pageNumber: number;
  pageSize: number;
};

export type GenerateDnsBulkImportPayload = {
  importId: string;
};

export type DnsBulkStartResponse = {
  jobId: string;
  status: DnsBulkJobStatus;
};

export type DnsBulkJobStatusResponse = {
  jobId: string;
  status: DnsBulkJobStatus;
  stage: DnsBulkJobStage;
  progressPercent: number;
  totalRows: number;
  processedRows: number;
  successRows: number;
  failedRows: number;
  skippedRows: number;
  latestError?: string | null;
  updatedAt: string;
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
  rowStatus: DomainMatrixRowStatus;
  createdAt: string;
  updatedAt: string;
};

export enum DomainMatrixRowStatus {
  UNRESOLVED = "UNRESOLVED",
  AVAILABLE = "AVAILABLE",
  UNAVAILABLE = "UNAVAILABLE",
  PURCHASED = "PURCHASED",
}

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

export type CheckDomainMatrixImportAvailabilityPayload = {
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
