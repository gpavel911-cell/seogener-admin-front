import { API_ROUTES } from "@shared/config/api-routes";
import type { Page } from "@shared/api";
import { baseApi } from "@shared/store";
import type {
  CreateARecordRequest,
  CreateARecordResponse,
  CreateTxtRecordRequest,
  CreateTxtRecordResponse,
  CreateDomainMatrixImportPayload,
  DeleteDomainMatrixImportPayload,
  DomainMatrixImportDto,
  DomainMatrixImportRowDto,
  DomainMatrixStartResponse,
  DomainMatrixStatusResponse,
  GenerateDomainMatrixImportPayload,
  GetDomainMatrixImportRowsPayload,
  RegistrarDomainListRequest,
  RegistrarDomainListResponse,
  RegistrarDomainOptionDto,
  RegistrarDomainProfileDto,
  RegistrarProviderType,
  ListDnsRecordsRequest,
  ListDnsRecordsResponse,
  RegenerateDomainMatrixRowPayload,
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
      query: ({ pageNumber, pageSize, profile, registrar }) => {
        const params: Record<string, string | number> = {
          pageNumber,
          pageSize,
        };
        params.profile = profile;
        params.registrar = registrar;
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
  useGetDomainMatrixJobStatusQuery,
  useCreateDomainMatrixImportMutation,
  useGetDomainMatrixImportsQuery,
  useUpdateDomainMatrixImportMutation,
  useDeleteDomainMatrixImportMutation,
  useGenerateDomainMatrixImportMutation,
  useGetDomainMatrixImportRowsQuery,
  useRegenerateDomainMatrixRowMutation,
} = domainsApi;
