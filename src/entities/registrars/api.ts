import { API_ROUTES } from "@shared/config/api-routes";
import { baseApi } from "@shared/store";
import type {
  CreateARecordRequest,
  CreateARecordResponse,
  CreateTxtRecordRequest,
  CreateTxtRecordResponse,
  RegistrarDomainListRequest,
  RegistrarDomainListResponse,
  RegistrarDomainOptionDto,
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
    getRegistrarDomainOptions: builder.query<RegistrarDomainOptionDto[], { registrar: RegistrarProviderType; profile: string }>({
      query: ({ registrar, profile }) => ({
        url: API_ROUTES.REGISTRARS.GET_REGISTRAR_DOMAIN_OPTIONS,
        params: { registrar, profile },
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
  useGetRegistrarDomainOptionsQuery,
  useLazyGetRegistrarDomainsQuery,
  useLazyGetRegistrarDnsRecordsQuery,
  useCreateRegistrarARecordMutation,
  useCreateRegistrarTxtRecordMutation,
} = domainsApi;
