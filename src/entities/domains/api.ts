import { API_ROUTES } from "@shared/config/api-routes";
import { baseApi } from "@shared/store";
import type {
  CreateARecordRequest,
  CreateARecordResponse,
  DomainDetailsDto,
  DomainListRequest,
  DomainListResponse,
  DomainProfileDto,
  ListDnsRecordsRequest,
  ListDnsRecordsResponse,
} from "./types";

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
    syncDomains: builder.mutation<void, { registrar: string; profile: string }>({
      query: ({ registrar, profile }) => ({
        url: API_ROUTES.DOMAINS.SYNC,
        method: "POST",
        params: { registrar, profile },
      }),
    }),
    createARecord: builder.mutation<CreateARecordResponse, CreateARecordRequest>({
      query: (payload) => ({
        url: API_ROUTES.DOMAINS.CREATE_A_RECORD,
        method: "POST",
        body: payload,
      }),
    }),
    listDnsRecords: builder.query<ListDnsRecordsResponse, ListDnsRecordsRequest>({
      query: ({ registrar, profileId, domain }) => ({
        url: API_ROUTES.DOMAINS.LIST_RECORDS,
        params: { registrar, profileId, domain },
      }),
    }),
  }),
});

export const {
  useGetDomainsQuery,
  useGetDomainDetailsQuery,
  useGetDomainProfilesQuery,
  useSyncDomainsMutation,
  useCreateARecordMutation,
  useListDnsRecordsQuery,
  useLazyListDnsRecordsQuery
} = domainsApi;
