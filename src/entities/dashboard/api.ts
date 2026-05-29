import { API_ROUTES } from "@shared/config/api-routes";
import { baseApi } from "@shared/store";
import type { DashboardListRequest, DashboardListResponse } from "./types";

export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDashboard: builder.query<DashboardListResponse, DashboardListRequest>({
      query: ({ dateFrom, dateTo, pageNumber, pageSize, projectId, status, query }) => {
        const params: Record<string, number | string> = { dateFrom, dateTo, pageNumber, pageSize };
        if (projectId !== undefined) {
          params.projectId = projectId;
        }
        if (status !== undefined) {
          params.status = status;
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
  }),
});

export const { useGetDashboardQuery } = dashboardApi;
