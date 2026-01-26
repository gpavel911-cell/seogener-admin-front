import { API_ROUTES } from "@shared/config/api-routes";
import { baseApi } from "@shared/store";
import type { DomainDetailsDto, DomainListResponse } from "./types";

export const domainsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDomains: builder.query<DomainListResponse, { page: number; limit: number }>({
      query: ({ page, limit }) => ({
        url: API_ROUTES.DOMAINS.GET_ALL,
        params: { pageNumber: page, pageSize: limit },
      }),
    }),
    getDomainDetails: builder.query<DomainDetailsDto, number>({
      query: (id) => ({
        url: API_ROUTES.DOMAINS.GET_DETAILS(id),
      }),
    }),
    syncDomains: builder.mutation<void, void>({
      query: () => ({
        url: API_ROUTES.DOMAINS.SYNC,
        method: "POST",
      }),
    }),
  }),
});

export const {
  useGetDomainsQuery,
  useGetDomainDetailsQuery,
  useSyncDomainsMutation
} = domainsApi;
