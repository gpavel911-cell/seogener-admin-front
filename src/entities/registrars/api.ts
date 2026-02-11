import { API_ROUTES } from "@shared/config/api-routes";
import { baseApi } from "@shared/store";
import type {
  CreateARecordRequest,
  CreateARecordResponse,
  CreateTxtRecordRequest,
  CreateTxtRecordResponse,
  RegistrarDomainDetailsDto,
  RegistrarDomainListRequest,
  RegistrarDomainListResponse,
  RegistrarDomainProfileDto,
  RegistrarProviderType,
  ListDnsRecordsRequest,
  ListDnsRecordsResponse,
} from "./types";

export const domainsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getRegistrarProfiles: builder.query<RegistrarDomainProfileDto[], void>({
      query: () => ({
        url: API_ROUTES.REGISTRARS.GET_REGISTRAR_PROFILES,
      }),
    }),
    syncRegistrarDomains: builder.mutation<void, { registrar: RegistrarProviderType; profile: string }>({
      query: ({ registrar, profile }) => ({
        url: API_ROUTES.REGISTRARS.SYNC_REGISTRAR_DOMAINS,
        method: "POST",
        params: { registrar, profile },
      }),
    }),
    getRegistrarDomains: builder.query<RegistrarDomainListResponse, RegistrarDomainListRequest>({
      query: ({ pageNumber, pageSize, profile, registrar }) => {
        const params: Record<string, string | number> = {
          pageNumber,
          pageSize,
        };
        params.profile = profile;
        params.registrar = registrar;
        return {
          url: API_ROUTES.REGISTRARS.GET_REGISTRAR_DOMAINS,
          params,
        };
      },
    }),
    getRegistrarDomainDetails: builder.query<RegistrarDomainDetailsDto, number>({
      query: (id) => ({
        url: API_ROUTES.REGISTRARS.GET_REGISTRAR_DOMAIN_DETAILS(id),
      }),
    }),
    getRegistrarDnsRecords: builder.query<ListDnsRecordsResponse, ListDnsRecordsRequest>({
      query: ({ registrar, profileId, domain }) => ({
        url: API_ROUTES.REGISTRARS.GET_REGISTRAR_DNS_RECORDS,
        params: { registrar, profileId, domain },
      }),
    }),
    createRegistrarARecord: builder.mutation<CreateARecordResponse, CreateARecordRequest>({
      query: (payload) => ({
        url: API_ROUTES.REGISTRARS.CREATE_REGISTRAR_A_RECORD,
        method: "POST",
        body: payload,
      }),
    }),
    createRegistrarTxtRecord: builder.mutation<CreateTxtRecordResponse, CreateTxtRecordRequest>({
      query: (payload) => ({
        url: API_ROUTES.REGISTRARS.CREATE_REGISTRAR_TXT_RECORD,
        method: "POST",
        body: payload,
      }),
    }),
  }),
});

export const {
  useGetRegistrarProfilesQuery,
  useSyncRegistrarDomainsMutation,
  useGetRegistrarDomainsQuery,
  useLazyGetRegistrarDomainsQuery,
  useGetRegistrarDomainDetailsQuery,
  useLazyGetRegistrarDnsRecordsQuery,
  useCreateRegistrarARecordMutation,
  useCreateRegistrarTxtRecordMutation,
} = domainsApi;
