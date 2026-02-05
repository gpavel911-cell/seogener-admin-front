import { API_ROUTES } from "@shared/config/api-routes";
import { baseApi } from "@shared/store";
import type {
  AnalyticsCounterDto,
  AnalyticsCounterDetailsDto,
  AnalyticsCounterListRequest,
  AnalyticsCountersListResponse,
  AnalyticsCounterCreateRequest,
  AnalyticsCounterStatisticsRequest,
  AnalyticsCounterStatisticsResponse,
  AnalyticsCounterGoalsRequest,
  AnalyticsCounterGoalsResponse,
} from "./types";

export const analyticsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCounters: builder.query<AnalyticsCountersListResponse, AnalyticsCounterListRequest>({
      query: ({ provider, pageNumber, pageSize }) => {
        const params: Record<string, string | number> = { provider, pageNumber, pageSize };
        return {
          url: API_ROUTES.ANALYTICS.GET_COUNTERS,
          params,
        };
      },
    }),
    getCounterDetails: builder.query<AnalyticsCounterDetailsDto, number>({
      query: (id) => ({
        url: API_ROUTES.ANALYTICS.GET_COUNTER_DETAILS(id),
      }),
    }),
    createCounter: builder.mutation<void, AnalyticsCounterCreateRequest>({
      query: (body) => ({
        url: API_ROUTES.ANALYTICS.CREATE_COUNTER,
        method: "POST",
        body,
      }),
    }),
    syncCounters: builder.mutation<void, { provider: AnalyticsCounterDto["provider"] }>({
      query: ({ provider }) => ({
        url: API_ROUTES.ANALYTICS.SYNC_COUNTERS,
        method: "POST",
        params: { provider },
      }),
    }),
    getStatistics: builder.query<AnalyticsCounterStatisticsResponse, AnalyticsCounterStatisticsRequest>({
      query: (params) => ({
        url: API_ROUTES.ANALYTICS.GET_STATISTICS,
        params,
      }),
    }),
    getGoals: builder.query<AnalyticsCounterGoalsResponse, AnalyticsCounterGoalsRequest>({
      query: (params) => ({
        url: API_ROUTES.ANALYTICS.GET_GOALS,
        params,
      }),
    }),
  }),
});

export const {
  useGetCountersQuery,
  useGetCounterDetailsQuery,
  useCreateCounterMutation,
  useSyncCountersMutation,
  useLazyGetStatisticsQuery,
  useLazyGetGoalsQuery,
} = analyticsApi;
