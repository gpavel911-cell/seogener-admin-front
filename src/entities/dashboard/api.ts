import { API_ROUTES } from "@shared/config/api-routes";
import { baseApi } from "@shared/store";
import type {
  DashboardAnalyticsRequest,
  DashboardAnalyticsResponseDto,
  DashboardMetricsRequest,
  DashboardMetricsResponse,
  DashboardBulkRecrawlRequestDto,
  DashboardBulkRecrawlResponseDto,
  DashboardDetailShellDto,
  DashboardListRequest,
  DashboardListResponse,
  DashboardRecrawlReportDto,
  DashboardSelectiveRecrawlResponseDto,
  GoogleIndexingDetailShellDto,
  GoogleIndexingListRequest,
  GoogleIndexingListResponse,
  GoogleIndexingRefreshRequestDto,
  GoogleIndexingRefreshResponseDto,
  GoogleIndexingSummaryRequest,
  GoogleIndexingSummaryResponseDto,
  GoogleInspectUrlResponseDto,
} from "./types";

export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDashboard: builder.query<DashboardListResponse, DashboardListRequest>({
      query: ({ pageNumber, pageSize, projectId, query }) => {
        const params: Record<string, number | string> = { pageNumber, pageSize, projectId };
        if (query !== undefined) {
          params.query = query;
        }
        return {
          url: API_ROUTES.DASHBOARD.GET_DASHBOARD,
          params,
        };
      },
      providesTags: ["Dashboard"],
    }),
    getDashboardMetrics: builder.query<DashboardMetricsResponse, DashboardMetricsRequest>({
      query: ({ projectId, query, dateFrom, dateTo, pageNumber, pageSize }) => {
        const params: Record<string, number | string> = { projectId, dateFrom, dateTo, pageNumber, pageSize };
        if (query !== undefined) {
          params.query = query;
        }
        return {
          url: API_ROUTES.DASHBOARD.GET_DASHBOARD_METRICS,
          params,
        };
      },
      providesTags: ["Dashboard"],
    }),
    getDashboardAnalytics: builder.query<DashboardAnalyticsResponseDto, DashboardAnalyticsRequest>({
      query: ({ projectId, query, dateFrom, dateTo }) => {
        const params: Record<string, number | string> = { projectId, dateFrom, dateTo };
        if (query !== undefined) {
          params.query = query;
        }
        return {
          url: API_ROUTES.DASHBOARD.GET_DASHBOARD_ANALYTICS,
          params,
        };
      },
      providesTags: ["Dashboard"],
    }),
    getDashboardDetails: builder.query<DashboardDetailShellDto, number>({
      query: (siteId) => ({
        url: API_ROUTES.DASHBOARD.GET_DASHBOARD_DETAILS(siteId.toString()),
      }),
      providesTags: ["Dashboard"],
    }),
    recrawlDashboardSite: builder.mutation<DashboardRecrawlReportDto, number>({
      query: (siteId) => ({
        url: API_ROUTES.DASHBOARD.RECRAWL_SITE(siteId.toString()),
        method: "POST",
      }),
      invalidatesTags: ["Dashboard"],
    }),
    recrawlDashboardSites: builder.mutation<DashboardBulkRecrawlResponseDto, DashboardBulkRecrawlRequestDto>({
      query: (body) => ({
        url: API_ROUTES.DASHBOARD.RECRAWL_BULK,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Dashboard"],
    }),
    recrawlDashboardUrls: builder.mutation<DashboardSelectiveRecrawlResponseDto, { siteId: number; urls: string[] }>({
      query: ({ siteId, urls }) => ({
        url: API_ROUTES.DASHBOARD.RECRAWL_URLS(siteId.toString()),
        method: "POST",
        body: { urls },
      }),
      invalidatesTags: ["Dashboard"],
    }),
    getGoogleIndexing: builder.query<GoogleIndexingListResponse, GoogleIndexingListRequest>({
      query: ({ pageNumber, pageSize, projectId, query }) => {
        const params: Record<string, number | string> = { pageNumber, pageSize, projectId };
        if (query !== undefined) {
          params.query = query;
        }
        return {
          url: API_ROUTES.DASHBOARD.GET_GOOGLE_INDEXING,
          params,
        };
      },
      providesTags: ["Dashboard"],
    }),
    getGoogleIndexingSummary: builder.query<GoogleIndexingSummaryResponseDto, GoogleIndexingSummaryRequest>({
      query: ({ projectId, query }) => {
        const params: Record<string, number | string> = { projectId };
        if (query !== undefined) {
          params.query = query;
        }
        return {
          url: API_ROUTES.DASHBOARD.GET_GOOGLE_INDEXING_SUMMARY,
          params,
        };
      },
      providesTags: ["Dashboard"],
    }),
    getGoogleIndexingDetails: builder.query<GoogleIndexingDetailShellDto, number>({
      query: (siteId) => ({
        url: API_ROUTES.DASHBOARD.GET_GOOGLE_INDEXING_DETAILS(siteId.toString()),
      }),
      providesTags: ["Dashboard"],
    }),
    refreshGoogleIndexing: builder.mutation<GoogleIndexingRefreshResponseDto, GoogleIndexingRefreshRequestDto>({
      query: (body) => ({
        url: API_ROUTES.DASHBOARD.GOOGLE_INDEXING_REFRESH,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Dashboard"],
    }),
    inspectGoogleIndexingUrl: builder.mutation<GoogleInspectUrlResponseDto, { siteId: number; url: string }>({
      query: ({ siteId, url }) => ({
        url: API_ROUTES.DASHBOARD.GOOGLE_INDEXING_INSPECT_URL(siteId.toString()),
        method: "POST",
        body: { url },
      }),
      invalidatesTags: ["Dashboard"],
    }),
  }),
});

export const {
  useGetDashboardQuery,
  useGetDashboardMetricsQuery,
  useGetDashboardAnalyticsQuery,
  useGetDashboardDetailsQuery,
  useRecrawlDashboardSiteMutation,
  useRecrawlDashboardSitesMutation,
  useRecrawlDashboardUrlsMutation,
  useGetGoogleIndexingQuery,
  useGetGoogleIndexingSummaryQuery,
  useGetGoogleIndexingDetailsQuery,
  useRefreshGoogleIndexingMutation,
  useInspectGoogleIndexingUrlMutation,
} = dashboardApi;
