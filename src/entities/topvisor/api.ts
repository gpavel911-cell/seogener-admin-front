import { API_ROUTES } from "@shared/config/api-routes";
import { baseApi } from "@shared/store";
import type { TopvisorSyncResponse } from "./types";

export const topvisorApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    syncTopvisorPositions: builder.mutation<TopvisorSyncResponse, void>({
      query: () => ({
        url: API_ROUTES.TOPVISOR.SYNC_TOPVISOR_POSITIONS,
        method: "POST",
      }),
    }),
  }),
});

export const { useSyncTopvisorPositionsMutation } = topvisorApi;
