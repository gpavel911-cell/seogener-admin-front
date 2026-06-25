import { API_ROUTES } from "@shared/config/api-routes";
import type { Page } from "@shared/api";
import { baseApi } from "@shared/store";
import type {
  CreateDnsBulkImportPayload,
  DnsBulkCreateRecordsPayload,
  DnsBulkCreateRecordsResponse,
  DeleteDnsBulkImportPayload,
  CreateARecordRequest,
  CreateARecordResponse,
  CreateNsRecordRequest,
  CreateNsRecordResponse,
  CreateTxtRecordRequest,
  CreateTxtRecordResponse,
  DnsBulkImportDto,
  DnsBulkImportRowDto,
  DnsBulkJobStatusResponse,
  DnsBulkStartResponse,
  CreateDomainMatrixImportPayload,
  DeleteDomainMatrixImportPayload,
  DomainMatrixImportDto,
  DomainMatrixImportRowDto,
  DomainMatrixRowPurchaseResponse,
  DomainMatrixStartResponse,
  DomainMatrixStatusResponse,
  GenerateDomainMatrixImportPayload,
  CheckDomainMatrixImportAvailabilityPayload,
  GenerateDnsBulkImportPayload,
  GetDnsBulkImportRowsPayload,
  GetDnsBulkImportsPayload,
  UpdateDnsBulkImportPayload,
  GetDomainMatrixImportRowsPayload,
  RegistrarDomainListRequest,
  RegistrarDomainListResponse,
  RegistrarDomainOptionDto,
  RegistrarDomainProfileDto,
  RegistrarProviderType,
  ListDnsRecordsRequest,
  ListDnsRecordsResponse,
  RegenerateDomainMatrixRowPayload,
  PurchaseDomainMatrixImportPayload,
  PurchaseDomainMatrixRowPayload,
  UpdateDomainMatrixImportPayload,
} from "./types";

export const domainsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getRegistrarProfiles: builder.query<RegistrarDomainProfileDto[], void>({
      query: () => ({
        url: API_ROUTES.REGISTRARS.GET_REGISTRAR_PROFILES,
      }),
    }),
    syncRegistrarDomains: builder.mutation<void, { registrar: RegistrarProviderType; profile: string }>({
      query: ({ registrar, profile }) => ({
        url: API_ROUTES.REGISTRARS.SYNC_REGISTRAR_DOMAINS,
        method: "POST",
        params: { registrar, profile },
      }),
    }),
    getRegistrarDomains: builder.query<RegistrarDomainListResponse, RegistrarDomainListRequest>({
      query: ({ pageNumber, pageSize, profile, registrar, query }) => {
        const params: Record<string, string | number> = {
          pageNumber,
          pageSize,
        };
        params.profile = profile;
        params.registrar = registrar;
        if (query) {
          params.query = query;
        }
        return {
          url: API_ROUTES.REGISTRARS.GET_REGISTRAR_DOMAINS,
          params,
        };
      },
    }),
    getRegistrarDomainOptions: builder.query<RegistrarDomainOptionDto[], { registrar: RegistrarProviderType; profile: string }>({
      query: ({ registrar, profile }) => ({
        url: API_ROUTES.REGISTRARS.GET_REGISTRAR_DOMAIN_OPTIONS,
        params: { registrar, profile },
      }),
    }),
    getRegistrarDnsRecords: builder.query<ListDnsRecordsResponse, ListDnsRecordsRequest>({
      query: ({ registrar, profileId, domain }) => ({
        url: API_ROUTES.REGISTRARS.GET_REGISTRAR_DNS_RECORDS,
        params: { registrar, profileId, domain },
      }),
    }),
    createRegistrarARecord: builder.mutation<CreateARecordResponse, CreateARecordRequest>({
      query: (payload) => ({
        url: API_ROUTES.REGISTRARS.CREATE_REGISTRAR_A_RECORD,
        method: "POST",
        body: payload,
      }),
    }),
    createRegistrarTxtRecord: builder.mutation<CreateTxtRecordResponse, CreateTxtRecordRequest>({
      query: (payload) => ({
        url: API_ROUTES.REGISTRARS.CREATE_REGISTRAR_TXT_RECORD,
        method: "POST",
        body: payload,
      }),
    }),
    createRegistrarNsRecord: builder.mutation<CreateNsRecordResponse, CreateNsRecordRequest>({
      query: (payload) => ({
        url: API_ROUTES.REGISTRARS.CREATE_REGISTRAR_NS_RECORD,
        method: "POST",
        body: payload,
      }),
    }),
    getDnsBulkJobStatus: builder.query<DnsBulkJobStatusResponse, { jobId: string }>({
      query: ({ jobId }) => ({
        url: API_ROUTES.REGISTRARS.GET_DNS_BULK_JOB_STATUS(jobId),
      }),
    }),
    createDnsBulkImport: builder.mutation<DnsBulkImportDto, CreateDnsBulkImportPayload>({
      query: ({ file, registrar, profileId, recordType, name }) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("registrar", registrar);
        formData.append("profileId", profileId);
        formData.append("recordType", recordType);
        if (name && name.trim()) {
          formData.append("name", name.trim());
        }
        return {
          url: API_ROUTES.REGISTRARS.CREATE_DNS_BULK_IMPORT,
          method: "POST",
          body: formData,
        };
      },
    }),
    createDnsBulkRecords: builder.mutation<DnsBulkCreateRecordsResponse, DnsBulkCreateRecordsPayload>({
      query: (payload) => ({
        url: API_ROUTES.REGISTRARS.CREATE_DNS_BULK_RECORDS,
        method: "POST",
        body: payload,
      }),
    }),
    getDnsBulkImports: builder.query<DnsBulkImportDto[], GetDnsBulkImportsPayload>({
      query: ({ registrar, profileId, recordType }) => ({
        url: API_ROUTES.REGISTRARS.GET_DNS_BULK_IMPORTS,
        params: { registrar, profileId, recordType },
      }),
    }),
    updateDnsBulkImport: builder.mutation<DnsBulkImportDto, UpdateDnsBulkImportPayload>({
      query: ({ importId, name }) => ({
        url: API_ROUTES.REGISTRARS.UPDATE_DNS_BULK_IMPORT(importId),
        method: "PATCH",
        body: { name },
      }),
    }),
    deleteDnsBulkImport: builder.mutation<void, DeleteDnsBulkImportPayload>({
      query: ({ importId }) => ({
        url: API_ROUTES.REGISTRARS.DELETE_DNS_BULK_IMPORT(importId),
        method: "DELETE",
      }),
    }),
    getDnsBulkImportRows: builder.query<Page<DnsBulkImportRowDto>, GetDnsBulkImportRowsPayload>({
      query: ({ importId, pageNumber, pageSize }) => ({
        url: API_ROUTES.REGISTRARS.GET_DNS_BULK_IMPORT_ROWS(importId),
        params: { pageNumber, pageSize },
      }),
    }),
    generateDnsBulkImportA: builder.mutation<DnsBulkStartResponse, GenerateDnsBulkImportPayload>({
      query: ({ importId }) => ({
        url: API_ROUTES.REGISTRARS.GENERATE_DNS_BULK_IMPORT_A(importId),
        method: "POST",
      }),
    }),
    generateDnsBulkImportTxt: builder.mutation<DnsBulkStartResponse, GenerateDnsBulkImportPayload>({
      query: ({ importId }) => ({
        url: API_ROUTES.REGISTRARS.GENERATE_DNS_BULK_IMPORT_TXT(importId),
        method: "POST",
      }),
    }),
    generateDnsBulkImportNs: builder.mutation<DnsBulkStartResponse, GenerateDnsBulkImportPayload>({
      query: ({ importId }) => ({
        url: API_ROUTES.REGISTRARS.GENERATE_DNS_BULK_IMPORT_NS(importId),
        method: "POST",
      }),
    }),
    checkDnsBulkImportA: builder.mutation<DnsBulkStartResponse, GenerateDnsBulkImportPayload>({
      query: ({ importId }) => ({
        url: API_ROUTES.REGISTRARS.CHECK_DNS_BULK_IMPORT_A(importId),
        method: "POST",
      }),
    }),
    checkDnsBulkImportTxt: builder.mutation<DnsBulkStartResponse, GenerateDnsBulkImportPayload>({
      query: ({ importId }) => ({
        url: API_ROUTES.REGISTRARS.CHECK_DNS_BULK_IMPORT_TXT(importId),
        method: "POST",
      }),
    }),
    checkDnsBulkImportNs: builder.mutation<DnsBulkStartResponse, GenerateDnsBulkImportPayload>({
      query: ({ importId }) => ({
        url: API_ROUTES.REGISTRARS.CHECK_DNS_BULK_IMPORT_NS(importId),
        method: "POST",
      }),
    }),
    getDomainMatrixJobStatus: builder.query<DomainMatrixStatusResponse, { jobId: string }>({
      query: ({ jobId }) => ({
        url: API_ROUTES.REGISTRARS.GET_DOMAIN_MATRIX_JOB_STATUS(jobId),
      }),
    }),
    createDomainMatrixImport: builder.mutation<DomainMatrixImportDto, CreateDomainMatrixImportPayload>({
      query: ({ file, profileId, name }) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("profileId", profileId);
        if (name && name.trim()) {
          formData.append("name", name.trim());
        }
        return {
          url: API_ROUTES.REGISTRARS.CREATE_DOMAIN_MATRIX_IMPORT,
          method: "POST",
          body: formData,
        };
      },
    }),
    getDomainMatrixImports: builder.query<DomainMatrixImportDto[], void>({
      query: () => ({
        url: API_ROUTES.REGISTRARS.GET_DOMAIN_MATRIX_IMPORTS,
      }),
    }),
    updateDomainMatrixImport: builder.mutation<DomainMatrixImportDto, UpdateDomainMatrixImportPayload>({
      query: ({ importId, name }) => ({
        url: API_ROUTES.REGISTRARS.UPDATE_DOMAIN_MATRIX_IMPORT(importId),
        method: "PATCH",
        body: { name },
      }),
    }),
    deleteDomainMatrixImport: builder.mutation<void, DeleteDomainMatrixImportPayload>({
      query: ({ importId }) => ({
        url: API_ROUTES.REGISTRARS.DELETE_DOMAIN_MATRIX_IMPORT(importId),
        method: "DELETE",
      }),
    }),
    generateDomainMatrixImport: builder.mutation<DomainMatrixStartResponse, GenerateDomainMatrixImportPayload>({
      query: ({ importId }) => ({
        url: API_ROUTES.REGISTRARS.GENERATE_DOMAIN_MATRIX_IMPORT(importId),
        method: "POST",
      }),
    }),
    checkDomainMatrixImportAvailability: builder.mutation<DomainMatrixStartResponse, CheckDomainMatrixImportAvailabilityPayload>({
      query: ({ importId }) => ({
        url: API_ROUTES.REGISTRARS.CHECK_DOMAIN_MATRIX_IMPORT_AVAILABILITY(importId),
        method: "POST",
      }),
    }),
    purchaseDomainMatrixImport: builder.mutation<DomainMatrixStartResponse, PurchaseDomainMatrixImportPayload>({
      query: ({ importId }) => ({
        url: API_ROUTES.REGISTRARS.PURCHASE_DOMAIN_MATRIX_IMPORT(importId),
        method: "POST",
      }),
    }),
    getDomainMatrixImportRows: builder.query<Page<DomainMatrixImportRowDto>, GetDomainMatrixImportRowsPayload>({
      query: ({ importId, pageNumber, pageSize }) => ({
        url: API_ROUTES.REGISTRARS.GET_DOMAIN_MATRIX_IMPORT_ROWS(importId),
        params: { pageNumber, pageSize },
      }),
    }),
    regenerateDomainMatrixRow: builder.mutation<DomainMatrixImportRowDto, RegenerateDomainMatrixRowPayload>({
      query: ({ rowId }) => ({
        url: API_ROUTES.REGISTRARS.REGENERATE_DOMAIN_MATRIX_ROW(rowId),
        method: "POST",
      }),
    }),
    purchaseDomainMatrixRow: builder.mutation<DomainMatrixRowPurchaseResponse, PurchaseDomainMatrixRowPayload>({
      query: ({ rowId }) => ({
        url: API_ROUTES.REGISTRARS.PURCHASE_DOMAIN_MATRIX_ROW(rowId),
        method: "POST",
      }),
    }),
  }),
});

export const {
  useGetRegistrarProfilesQuery,
  useSyncRegistrarDomainsMutation,
  useGetRegistrarDomainsQuery,
  useGetRegistrarDomainOptionsQuery,
  useLazyGetRegistrarDomainsQuery,
  useLazyGetRegistrarDnsRecordsQuery,
  useCreateRegistrarARecordMutation,
  useCreateRegistrarTxtRecordMutation,
  useCreateRegistrarNsRecordMutation,
  useGetDnsBulkJobStatusQuery,
  useCreateDnsBulkImportMutation,
  useCreateDnsBulkRecordsMutation,
  useGetDnsBulkImportsQuery,
  useUpdateDnsBulkImportMutation,
  useDeleteDnsBulkImportMutation,
  useGetDnsBulkImportRowsQuery,
  useGenerateDnsBulkImportAMutation,
  useGenerateDnsBulkImportTxtMutation,
  useGenerateDnsBulkImportNsMutation,
  useCheckDnsBulkImportAMutation,
  useCheckDnsBulkImportTxtMutation,
  useCheckDnsBulkImportNsMutation,
  useGetDomainMatrixJobStatusQuery,
  useCreateDomainMatrixImportMutation,
  useGetDomainMatrixImportsQuery,
  useUpdateDomainMatrixImportMutation,
  useDeleteDomainMatrixImportMutation,
  useGenerateDomainMatrixImportMutation,
  useCheckDomainMatrixImportAvailabilityMutation,
  usePurchaseDomainMatrixImportMutation,
  useGetDomainMatrixImportRowsQuery,
  useRegenerateDomainMatrixRowMutation,
  usePurchaseDomainMatrixRowMutation,
} = domainsApi;
