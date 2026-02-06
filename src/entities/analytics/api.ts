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
  AnalyticsProfileDto,
} from "./types";

export const analyticsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCounters: builder.query<AnalyticsCountersListResponse, AnalyticsCounterListRequest>({
      query: ({ provider, profile, pageNumber, pageSize }) => {
        const params: Record<string, string | number> = { provider, profile, pageNumber, pageSize };
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
    syncCounters: builder.mutation<void, { provider: AnalyticsCounterDto["provider"]; profile: string }>({
      query: ({ provider, profile }) => ({
        url: API_ROUTES.ANALYTICS.SYNC_COUNTERS,
        method: "POST",
        params: { provider, profile },
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
    getProfiles: builder.query<AnalyticsProfileDto[], AnalyticsCounterDto["provider"]>({
      query: (provider) => ({
        url: API_ROUTES.ANALYTICS.GET_PROFILES,
        params: { provider },
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
  useGetProfilesQuery,
} = analyticsApi;
