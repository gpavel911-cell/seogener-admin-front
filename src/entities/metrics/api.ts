import { API_ROUTES } from "@shared/config/api-routes";
import { baseApi } from "@shared/store";
import type {
  MetricsCounterDto,
  MetricsCounterDetailsDto,
  MetricsCounterListRequest,
  MetricsCountersListResponse,
  MetricsCounterCreateRequest,
  MetricsCounterStatisticsRequest,
  MetricsCounterStatisticsResponse,
  MetricsCounterGoalsRequest,
  MetricsCounterGoalsResponse,
  MetricsProfileDto,
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
      query: ({ provider, profile, pageNumber, pageSize }) => {
        const params: Record<string, string | number> = { provider, profile, pageNumber, pageSize };
        return {
          url: API_ROUTES.METRICS.GET_METRICS_COUNTERS,
          params,
        };
      },
    }),
    getMetricsCounterDetails: builder.query<MetricsCounterDetailsDto, number>({
      query: (id) => ({
        url: API_ROUTES.METRICS.GET_METRICS_COUNTER_DETAILS(id),
      }),
    }),
    createMetricsCounter: builder.mutation<void, MetricsCounterCreateRequest>({
      query: (body) => ({
        url: API_ROUTES.METRICS.CREATE_METRICS_COUNTER,
        method: "POST",
        body,
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
  useGetMetricsCounterDetailsQuery,
  useCreateMetricsCounterMutation,
  useLazyGetMetricsStatisticsQuery,
  useLazyGetMetricsGoalsQuery,
} = analyticsApi;
