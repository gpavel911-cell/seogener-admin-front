import { API_ROUTES } from "@shared/config/api-routes";
import { baseApi } from "@shared/store";
import type { DomainDetailsDto, DomainListRequest, DomainListResponse, DomainProfileDto } from "./types";

export const domainsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDomains: builder.query<DomainListResponse, DomainListRequest>({
      query: ({ pageNumber, pageSize, profile, registrar }) => {
        const params: Record<string, string | number> = {
          pageNumber,
          pageSize,
        };
        params.profile = profile;
        params.registrar = registrar;
        return {
          url: API_ROUTES.DOMAINS.GET_ALL,
          params,
        };
      },
    }),
    getDomainDetails: builder.query<DomainDetailsDto, number>({
      query: (id) => ({
        url: API_ROUTES.DOMAINS.GET_DETAILS(id),
      }),
    }),
    getDomainProfiles: builder.query<DomainProfileDto[], void>({
      query: () => ({
        url: API_ROUTES.DOMAINS.GET_PROFILES,
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
  useGetDomainProfilesQuery,
  useSyncDomainsMutation
} = domainsApi;
