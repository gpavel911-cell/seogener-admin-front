import { API_ROUTES } from "@shared/config/api-routes";
import { baseApi } from "@shared/store";
import type { DomainHunterResultsListRequest, DomainHunterRunRequest } from "./request-types";
import type {
  DomainHunterLogResponse,
  DomainHunterResultTable,
  DomainHunterResultsPage,
  DomainHunterRunResponse,
  DomainHunterStatusResponse,
  DomainHunterStopResponse,
} from "./types";

export const domainHunterApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDomainHunterStatus: builder.query<DomainHunterStatusResponse, void>({
      query: () => ({
        url: API_ROUTES.DOMAIN_HUNTER.STATUS,
      }),
      providesTags: [{ type: "DomainHunter", id: "STATUS" }],
    }),
    getDomainHunterLog: builder.query<DomainHunterLogResponse, { lines: number }>({
      query: ({ lines }) => ({
        url: API_ROUTES.DOMAIN_HUNTER.LOG,
        params: { lines },
      }),
      providesTags: [{ type: "DomainHunter", id: "LOG" }],
    }),
    getDomainHunterResults: builder.query<DomainHunterResultsPage, DomainHunterResultsListRequest>({
      query: ({ pageNumber, pageSize }) => ({
        url: API_ROUTES.DOMAIN_HUNTER.RESULTS,
        params: { pageNumber, pageSize },
      }),
      providesTags: [{ type: "DomainHunter", id: "LIST" }],
    }),
    getDomainHunterResultTable: builder.query<DomainHunterResultTable, string>({
      query: (filename) => ({
        url: API_ROUTES.DOMAIN_HUNTER.RESULT(filename),
      }),
    }),
    startDomainHunterRun: builder.mutation<DomainHunterRunResponse, DomainHunterRunRequest>({
      query: (body) => ({
        url: API_ROUTES.DOMAIN_HUNTER.RUN,
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "DomainHunter", id: "STATUS" },
        { type: "DomainHunter", id: "LOG" },
      ],
    }),
    stopDomainHunterRun: builder.mutation<DomainHunterStopResponse, void>({
      query: () => ({
        url: API_ROUTES.DOMAIN_HUNTER.STOP,
        method: "POST",
      }),
      invalidatesTags: [{ type: "DomainHunter", id: "STATUS" }],
    }),
    downloadDomainHunterCsv: builder.mutation<string, string>({
      query: (filename) => ({
        url: API_ROUTES.DOMAIN_HUNTER.DOWNLOAD(filename),
        method: "GET",
        responseHandler: async (response) => {
          const blob = await response.blob();
          return URL.createObjectURL(blob);
        },
      }),
    }),
  }),
});

export const {
  useGetDomainHunterStatusQuery,
  useGetDomainHunterLogQuery,
  useGetDomainHunterResultsQuery,
  useGetDomainHunterResultTableQuery,
  useStartDomainHunterRunMutation,
  useStopDomainHunterRunMutation,
  useDownloadDomainHunterCsvMutation,
} = domainHunterApi;
