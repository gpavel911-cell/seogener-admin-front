import { API_ROUTES } from "@shared/config/api-routes";
import type { Page } from "@shared/api";
import { baseApi } from "@shared/store";
import type {
  CreateWebmasterHostImportPayload,
  CreateWebmasterHostImportRowPayload,
  DeleteWebmasterHostImportPayload,
  GetWebmasterHostImportsPayload,
  GetWebmasterHostImportRowsPayload,
  WebmasterApiResponse,
  WebmasterHostImportDto,
  WebmasterHostImportJobStatusResponse,
  WebmasterHostImportRowDto,
  WebmasterHostImportSingleCreateResponse,
  WebmasterHostImportStartResponse,
  WebmasterHostCreateRequest,
  WebmasterHostBulkDnsRequest,
  WebmasterHostBulkDnsPageRequest,
  WebmasterHostBulkDnsPageResponse,
  WebmasterHostBulkDnsRowResponse,
  WebmasterHostListRequest,
  WebmasterHostsListResponse,
  WebmasterHostOptionDto,
  WebmasterSearchEventHistoryPointDto,
  WebmasterSearchEventsHistoryRequest,
  WebmasterPopularQueryDto,
  WebmasterSearchQueriesPopularRequest,
  WebmasterProfileDto,
  WebmasterSearchQueriesHistoryRequest,
  WebmasterSearchQueryStatisticsPointDto,
  StartWebmasterHostImportPayload,
  UpdateWebmasterHostImportPayload,
} from "./types";

export const webmasterApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getWebmasterProfiles: builder.query<WebmasterProfileDto[], void>({
      query: () => ({
        url: API_ROUTES.WEBMASTER.GET_WEBMASTER_PROFILES,
      }),
    }),
    syncWebmasterHosts: builder.mutation<void, WebmasterHostListRequest>({
      query: ({ provider, profile }) => ({
        url: API_ROUTES.WEBMASTER.SYNC_WEBMASTER_HOSTS,
        method: "POST",
        params: { provider, profile },
      }),
    }),
    getWebmasterHosts: builder.query<WebmasterHostsListResponse, WebmasterHostListRequest>({
      query: ({ provider, profile, pageNumber, pageSize, query }) => {
        const params: Record<string, string | number | undefined> = { provider, profile, pageNumber, pageSize };
        if (query) {
          params.query = query;
        }
        return {
          url: API_ROUTES.WEBMASTER.GET_WEBMASTER_HOSTS,
          params,
        };
      },
    }),
    getWebmasterHostOptions: builder.query<WebmasterHostOptionDto[], { provider: WebmasterHostListRequest["provider"]; profile: string }>({
      query: ({ provider, profile }) => ({
        url: API_ROUTES.WEBMASTER.GET_WEBMASTER_HOST_OPTIONS,
        params: { provider, profile },
      }),
    }),
    createWebmasterHost: builder.mutation<WebmasterApiResponse, WebmasterHostCreateRequest>({
      query: (body) => ({
        url: API_ROUTES.WEBMASTER.CREATE_WEBMASTER_HOST,
        method: "POST",
        body,
      }),
    }),
    getWebmasterHostImportJobStatus: builder.query<WebmasterHostImportJobStatusResponse, { jobId: string }>({
      query: ({ jobId }) => ({
        url: API_ROUTES.WEBMASTER.GET_WEBMASTER_HOST_IMPORT_JOB_STATUS(jobId),
      }),
    }),
    createWebmasterHostImport: builder.mutation<WebmasterHostImportDto, CreateWebmasterHostImportPayload>({
      query: ({ file, provider, profile, name }) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("provider", provider);
        formData.append("profile", profile);
        if (name && name.trim()) {
          formData.append("name", name.trim());
        }
        return {
          url: API_ROUTES.WEBMASTER.CREATE_WEBMASTER_HOST_IMPORT,
          method: "POST",
          body: formData,
        };
      },
    }),
    getWebmasterHostImports: builder.query<WebmasterHostImportDto[], GetWebmasterHostImportsPayload>({
      query: ({ provider, profile }) => ({
        url: API_ROUTES.WEBMASTER.GET_WEBMASTER_HOST_IMPORTS,
        params: { provider, profile },
      }),
    }),
    updateWebmasterHostImport: builder.mutation<WebmasterHostImportDto, UpdateWebmasterHostImportPayload>({
      query: ({ importId, name }) => ({
        url: API_ROUTES.WEBMASTER.UPDATE_WEBMASTER_HOST_IMPORT(importId),
        method: "PATCH",
        body: { name },
      }),
    }),
    deleteWebmasterHostImport: builder.mutation<void, DeleteWebmasterHostImportPayload>({
      query: ({ importId }) => ({
        url: API_ROUTES.WEBMASTER.DELETE_WEBMASTER_HOST_IMPORT(importId),
        method: "DELETE",
      }),
    }),
    getWebmasterHostImportRows: builder.query<Page<WebmasterHostImportRowDto>, GetWebmasterHostImportRowsPayload>({
      query: ({ importId, pageNumber, pageSize }) => ({
        url: API_ROUTES.WEBMASTER.GET_WEBMASTER_HOST_IMPORT_ROWS(importId),
        params: { pageNumber, pageSize },
      }),
    }),
    startWebmasterHostImportCheck: builder.mutation<WebmasterHostImportStartResponse, StartWebmasterHostImportPayload>({
      query: ({ importId }) => ({
        url: API_ROUTES.WEBMASTER.START_WEBMASTER_HOST_IMPORT_CHECK(importId),
        method: "POST",
      }),
    }),
    startWebmasterHostImportAddMissing: builder.mutation<WebmasterHostImportStartResponse, StartWebmasterHostImportPayload>({
      query: ({ importId }) => ({
        url: API_ROUTES.WEBMASTER.START_WEBMASTER_HOST_IMPORT_ADD_MISSING(importId),
        method: "POST",
      }),
    }),
    createWebmasterHostImportRow: builder.mutation<WebmasterHostImportSingleCreateResponse, CreateWebmasterHostImportRowPayload>({
      query: ({ importId, rowId }) => ({
        url: API_ROUTES.WEBMASTER.CREATE_WEBMASTER_HOST_IMPORT_ROW(importId, rowId),
        method: "POST",
      }),
    }),
    getWebmasterHostsBulkDnsPage: builder.query<WebmasterHostBulkDnsPageResponse, WebmasterHostBulkDnsPageRequest>({
      query: (body) => ({
        url: API_ROUTES.WEBMASTER.GET_WEBMASTER_HOSTS_BULK_DNS_PAGE,
        method: "POST",
        body,
      }),
    }),
    getWebmasterHostsBulkDnsStatus: builder.mutation<WebmasterHostBulkDnsRowResponse[], WebmasterHostBulkDnsRequest>({
      query: (body) => ({
        url: API_ROUTES.WEBMASTER.GET_WEBMASTER_HOSTS_BULK_DNS_STATUS,
        method: "POST",
        body,
      }),
    }),
    createWebmasterHostsBulkTxt: builder.mutation<WebmasterHostBulkDnsRowResponse[], WebmasterHostBulkDnsRequest>({
      query: (body) => ({
        url: API_ROUTES.WEBMASTER.CREATE_WEBMASTER_HOSTS_BULK_TXT,
        method: "POST",
        body,
      }),
    }),
    startWebmasterHostsBulkDnsVerification: builder.mutation<WebmasterHostBulkDnsRowResponse[], WebmasterHostBulkDnsRequest>({
      query: (body) => ({
        url: API_ROUTES.WEBMASTER.START_WEBMASTER_HOSTS_BULK_DNS_VERIFICATION,
        method: "POST",
        body,
      }),
    }),
    getWebmasterPopularQueries: builder.query<WebmasterPopularQueryDto[], WebmasterSearchQueriesPopularRequest>({
      query: ({ hostId, ...params }) => ({
        url: API_ROUTES.WEBMASTER.GET_WEBMASTER_POPULAR_QUERIES(hostId),
        params,
      }),
    }),
    getWebmasterSearchEventsHistory: builder.query<WebmasterSearchEventHistoryPointDto[], WebmasterSearchEventsHistoryRequest>({
      query: ({ hostId, ...params }) => ({
        url: API_ROUTES.WEBMASTER.GET_WEBMASTER_SEARCH_EVENTS_HISTORY(hostId),
        params,
      }),
    }),
    getWebmasterSearchQueriesHistory: builder.query<WebmasterSearchQueryStatisticsPointDto[], WebmasterSearchQueriesHistoryRequest>({
      query: ({ hostId, ...params }) => ({
        url: API_ROUTES.WEBMASTER.GET_WEBMASTER_SEARCH_QUERIES_HISTORY(hostId),
        params,
      }),
    }),
  }),
});

export const {
  useGetWebmasterProfilesQuery,
  useSyncWebmasterHostsMutation,
  useGetWebmasterHostsQuery,
  useGetWebmasterHostOptionsQuery,
  useCreateWebmasterHostMutation,
  useGetWebmasterHostImportJobStatusQuery,
  useCreateWebmasterHostImportMutation,
  useGetWebmasterHostImportsQuery,
  useUpdateWebmasterHostImportMutation,
  useDeleteWebmasterHostImportMutation,
  useGetWebmasterHostImportRowsQuery,
  useStartWebmasterHostImportCheckMutation,
  useStartWebmasterHostImportAddMissingMutation,
  useCreateWebmasterHostImportRowMutation,
  useGetWebmasterHostsBulkDnsPageQuery,
  useGetWebmasterHostsBulkDnsStatusMutation,
  useCreateWebmasterHostsBulkTxtMutation,
  useStartWebmasterHostsBulkDnsVerificationMutation,
  useLazyGetWebmasterPopularQueriesQuery,
  useLazyGetWebmasterSearchEventsHistoryQuery,
  useLazyGetWebmasterSearchQueriesHistoryQuery,
} = webmasterApi;
