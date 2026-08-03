import { API_ROUTES } from "@shared/config/api-routes";
import type { Page } from "@shared/api";
import { baseApi } from "@shared/store";
import type {
  CreateMetricsCounterImportPayload,
  CreateMetricsCounterImportRowPayload,
  DeleteMetricsCounterImportPayload,
  GetMetricsCounterImportRowsPayload,
  GetMetricsCounterImportsPayload,
  MetricsCounterDto,
  MetricsCounterBulkJobStatusResponse,
  MetricsCounterBulkStartResponse,
  MetricsCounterImportDto,
  MetricsCounterImportRowDto,
  MetricsCounterListRequest,
  MetricsCountersListResponse,
  MetricsCounterOptionDto,
  MetricsCounterCreateRequest,
  MetricsCounterCreateResponse,
  MetricsCounterSingleCreateResponse,
  MetricsCounterStatisticsRequest,
  MetricsCounterStatisticsResponse,
  MetricsCounterGoalsRequest,
  MetricsCounterGoalsResponse,
  MetricsProfileDto,
  StartMetricsCounterImportCreateMissingPayload,
  UpdateMetricsCounterImportPayload,
} from "./types";

export const analyticsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMetricsProfiles: builder.query<MetricsProfileDto[], void>({
      query: () => ({
        url: API_ROUTES.METRICS.GET_METRICS_PROFILES,
      }),
    }),
    syncMetricsCounters: builder.mutation<void, { provider: MetricsCounterDto["provider"]; profile: string }>({
      query: ({ provider, profile }) => ({
        url: API_ROUTES.METRICS.SYNC_METRICS_COUNTERS,
        method: "POST",
        params: { provider, profile },
      }),
    }),
    getMetricsCounters: builder.query<MetricsCountersListResponse, MetricsCounterListRequest>({
      query: ({ provider, profile, pageNumber, pageSize, query }) => {
        const params: Record<string, string | number> = { provider, profile, pageNumber, pageSize };
        if (query) {
          params.query = query;
        }
        return {
          url: API_ROUTES.METRICS.GET_METRICS_COUNTERS,
          params,
        };
      },
    }),
    getMetricsCounterOptions: builder.query<MetricsCounterOptionDto[], { provider: MetricsCounterDto["provider"]; profile: string }>({
      query: ({ provider, profile }) => ({
        url: API_ROUTES.METRICS.GET_METRICS_COUNTER_OPTIONS,
        params: { provider, profile },
      }),
    }),
    createMetricsCounter: builder.mutation<MetricsCounterCreateResponse, MetricsCounterCreateRequest>({
      query: (body) => ({
        url: API_ROUTES.METRICS.CREATE_METRICS_COUNTER,
        method: "POST",
        body,
      }),
    }),
    getMetricsCounterImportJobStatus: builder.query<MetricsCounterBulkJobStatusResponse, { jobId: string }>({
      query: ({ jobId }) => ({
        url: API_ROUTES.METRICS.GET_METRICS_COUNTER_IMPORT_JOB_STATUS(jobId),
      }),
    }),
    createMetricsCounterImport: builder.mutation<MetricsCounterImportDto, CreateMetricsCounterImportPayload>({
      query: ({ file, provider, profile, name }) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("provider", provider);
        formData.append("profile", profile);
        if (name && name.trim()) {
          formData.append("name", name.trim());
        }
        return {
          url: API_ROUTES.METRICS.CREATE_METRICS_COUNTER_IMPORT,
          method: "POST",
          body: formData,
        };
      },
    }),
    getMetricsCounterImports: builder.query<MetricsCounterImportDto[], GetMetricsCounterImportsPayload>({
      query: ({ provider, profile }) => ({
        url: API_ROUTES.METRICS.GET_METRICS_COUNTER_IMPORTS,
        params: { provider, profile },
      }),
    }),
    updateMetricsCounterImport: builder.mutation<MetricsCounterImportDto, UpdateMetricsCounterImportPayload>({
      query: ({ importId, name }) => ({
        url: API_ROUTES.METRICS.UPDATE_METRICS_COUNTER_IMPORT(importId),
        method: "PATCH",
        body: { name },
      }),
    }),
    deleteMetricsCounterImport: builder.mutation<void, DeleteMetricsCounterImportPayload>({
      query: ({ importId }) => ({
        url: API_ROUTES.METRICS.DELETE_METRICS_COUNTER_IMPORT(importId),
        method: "DELETE",
      }),
    }),
    getMetricsCounterImportRows: builder.query<Page<MetricsCounterImportRowDto>, GetMetricsCounterImportRowsPayload>({
      query: ({ importId, pageNumber, pageSize }) => ({
        url: API_ROUTES.METRICS.GET_METRICS_COUNTER_IMPORT_ROWS(importId),
        params: { pageNumber, pageSize },
      }),
    }),
    startMetricsCounterImportCreateMissing: builder.mutation<MetricsCounterBulkStartResponse, StartMetricsCounterImportCreateMissingPayload>({
      query: ({ importId }) => ({
        url: API_ROUTES.METRICS.START_METRICS_COUNTER_IMPORT_CREATE_MISSING(importId),
        method: "POST",
      }),
    }),
    createMetricsCounterImportRow: builder.mutation<MetricsCounterSingleCreateResponse, CreateMetricsCounterImportRowPayload>({
      query: ({ importId, rowId }) => ({
        url: API_ROUTES.METRICS.CREATE_METRICS_COUNTER_IMPORT_ROW(importId, rowId),
        method: "POST",
      }),
    }),
    getMetricsStatistics: builder.query<MetricsCounterStatisticsResponse, MetricsCounterStatisticsRequest>({
      query: (params) => ({
        url: API_ROUTES.METRICS.GET_METRICS_STATISTICS,
        params,
      }),
    }),
    getMetricsGoals: builder.query<MetricsCounterGoalsResponse, MetricsCounterGoalsRequest>({
      query: (params) => ({
        url: API_ROUTES.METRICS.GET_METRICS_GOALS,
        params,
      }),
    }),
  }),
});

export const {
  useGetMetricsProfilesQuery,
  useSyncMetricsCountersMutation,
  useGetMetricsCountersQuery,
  useGetMetricsCounterOptionsQuery,
  useCreateMetricsCounterMutation,
  useGetMetricsCounterImportJobStatusQuery,
  useCreateMetricsCounterImportMutation,
  useGetMetricsCounterImportsQuery,
  useUpdateMetricsCounterImportMutation,
  useDeleteMetricsCounterImportMutation,
  useGetMetricsCounterImportRowsQuery,
  useStartMetricsCounterImportCreateMissingMutation,
  useCreateMetricsCounterImportRowMutation,
  useLazyGetMetricsStatisticsQuery,
  useLazyGetMetricsGoalsQuery,
} = analyticsApi;
