import { API_ROUTES } from "@shared/config/api-routes";
import { baseApi } from "@shared/store";
import type {
  AnalyticsCounterDto,
  AnalyticsCounterListRequest,
  AnalyticsCountersListResponse,
} from "./types";

export const analyticsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCounters: builder.query<AnalyticsCountersListResponse, AnalyticsCounterListRequest>({
      query: ({ provider, pageNumber, pageSize }) => {
        const params: Record<string, string | number> = {
          provider,
          pageNumber,
          pageSize,
        };
        return {
          url: API_ROUTES.ANALYTICS.GET_COUNTERS,
          params,
        };
      },
    }),
    syncCounters: builder.mutation<void, { provider: AnalyticsCounterDto["provider"] }>({
      query: ({ provider }) => ({
        url: API_ROUTES.ANALYTICS.SYNC_COUNTERS,
        method: "POST",
        params: { provider },
      }),
    }),
  }),
});

export const {
  useGetCountersQuery,
  useSyncCountersMutation,
} = analyticsApi;
