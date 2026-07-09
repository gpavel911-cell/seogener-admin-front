import { API_ROUTES } from "@shared/config/api-routes";
import { baseApi } from "@shared/store";
import type { DistributionOrdersRequest, DistributionOrdersResponseDto } from "./types";

export const distributionApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDistributionOrders: builder.query<DistributionOrdersResponseDto, DistributionOrdersRequest>({
      query: ({ dateFrom, dateTo }) => ({
        url: API_ROUTES.DISTRIBUTION.GET_ORDERS,
        params: { dateFrom, dateTo },
      }),
      providesTags: ["Distribution"],
    }),
  }),
});

export const { useGetDistributionOrdersQuery } = distributionApi;
