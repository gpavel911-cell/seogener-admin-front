import { API_ROUTES } from "@shared/config/api-routes";
import { baseApi } from "@shared/store";
import type {
  WebmasterApiResponse,
  WebmasterHostCreateRequest,
  WebmasterHostVerifyDnsRequest,
  WebmasterHostVerifyDnsResponse,
  WebmasterHostListRequest,
  WebmasterHostsListResponse,
  WebmasterHostOptionDto,
  WebmasterSearchEventHistoryPointDto,
  WebmasterSearchEventsHistoryRequest,
  WebmasterPopularQueryDto,
  WebmasterSearchQueriesPopularRequest,
  WebmasterProfileDto,
  WebmasterSearchQueriesHistoryRequest,
  WebmasterSearchQueryStatisticsPointDto,
} from "./types";

export const webmasterApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getWebmasterProfiles: builder.query<WebmasterProfileDto[], void>({
      query: () => ({
        url: API_ROUTES.WEBMASTER.GET_WEBMASTER_PROFILES,
      }),
    }),
    syncWebmasterHosts: builder.mutation<void, WebmasterHostListRequest>({
      query: ({ provider, profile }) => ({
        url: API_ROUTES.WEBMASTER.SYNC_WEBMASTER_HOSTS,
        method: "POST",
        params: { provider, profile },
      }),
    }),
    getWebmasterHosts: builder.query<WebmasterHostsListResponse, WebmasterHostListRequest>({
      query: ({ provider, profile, pageNumber, pageSize }) => ({
        url: API_ROUTES.WEBMASTER.GET_WEBMASTER_HOSTS,
        params: { provider, profile, pageNumber, pageSize },
      }),
    }),
    getWebmasterHostOptions: builder.query<WebmasterHostOptionDto[], { provider: WebmasterHostListRequest["provider"]; profile: string }>({
      query: ({ provider, profile }) => ({
        url: API_ROUTES.WEBMASTER.GET_WEBMASTER_HOST_OPTIONS,
        params: { provider, profile },
      }),
    }),
    createWebmasterHost: builder.mutation<WebmasterApiResponse, WebmasterHostCreateRequest>({
      query: (body) => ({
        url: API_ROUTES.WEBMASTER.CREATE_WEBMASTER_HOST,
        method: "POST",
        body,
      }),
    }),
    verifyWebmasterHostDns: builder.mutation<WebmasterHostVerifyDnsResponse, WebmasterHostVerifyDnsRequest>({
      query: (body) => ({
        url: API_ROUTES.WEBMASTER.VERIFY_WEBMASTER_HOST_DNS,
        method: "POST",
        body,
      }),
    }),
    getWebmasterPopularQueries: builder.query<WebmasterPopularQueryDto[], WebmasterSearchQueriesPopularRequest>({
      query: ({ hostId, ...params }) => ({
        url: API_ROUTES.WEBMASTER.GET_WEBMASTER_POPULAR_QUERIES(hostId),
        params,
      }),
    }),
    getWebmasterSearchEventsHistory: builder.query<WebmasterSearchEventHistoryPointDto[], WebmasterSearchEventsHistoryRequest>({
      query: ({ hostId, ...params }) => ({
        url: API_ROUTES.WEBMASTER.GET_WEBMASTER_SEARCH_EVENTS_HISTORY(hostId),
        params,
      }),
    }),
    getWebmasterSearchQueriesHistory: builder.query<WebmasterSearchQueryStatisticsPointDto[], WebmasterSearchQueriesHistoryRequest>({
      query: ({ hostId, ...params }) => ({
        url: API_ROUTES.WEBMASTER.GET_WEBMASTER_SEARCH_QUERIES_HISTORY(hostId),
        params,
      }),
    }),
  }),
});

export const {
  useGetWebmasterProfilesQuery,
  useSyncWebmasterHostsMutation,
  useGetWebmasterHostsQuery,
  useGetWebmasterHostOptionsQuery,
  useCreateWebmasterHostMutation,
  useVerifyWebmasterHostDnsMutation,
  useLazyGetWebmasterPopularQueriesQuery,
  useLazyGetWebmasterSearchEventsHistoryQuery,
  useLazyGetWebmasterSearchQueriesHistoryQuery,
} = webmasterApi;
