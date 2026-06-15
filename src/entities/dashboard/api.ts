import { API_ROUTES } from "@shared/config/api-routes";
import { baseApi } from "@shared/store";
import type {
  DashboardBulkRecrawlRequestDto,
  DashboardBulkRecrawlResponseDto,
  DashboardDetailShellDto,
  DashboardListRequest,
  DashboardListResponse,
  DashboardRecrawlReportDto,
  DashboardSelectiveRecrawlResponseDto,
} from "./types";

export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDashboard: builder.query<DashboardListResponse, DashboardListRequest>({
      query: ({ pageNumber, pageSize, projectId, query }) => {
        const params: Record<string, number | string> = { pageNumber, pageSize };
        if (projectId !== undefined) {
          params.projectId = projectId;
        }
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
  }),
});

export const {
  useGetDashboardQuery,
  useGetDashboardDetailsQuery,
  useRecrawlDashboardSiteMutation,
  useRecrawlDashboardSitesMutation,
  useRecrawlDashboardUrlsMutation,
} = dashboardApi;
