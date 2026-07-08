import { API_ROUTES } from "@shared/config/api-routes";
import { baseApi } from "@shared/store";
import type {
  AddPositioningKeywordArgs,
  DeletePositioningKeywordRequest,
  PositioningDetailsDto,
  PositioningDetailsRequest,
  PositioningKeywordDto,
  PositioningListRequest,
  PositioningListResponse,
} from "./types";

const positioningListTags = (projectId: number) => [
  { type: "Positioning" as const, id: `LIST-${projectId}` },
];

const positioningDetailsTag = (projectId: number, siteId: number) => ({
  type: "Positioning" as const,
  id: `DETAILS-${projectId}-${siteId}`,
});

export { positioningListTags, positioningDetailsTag };

export const positioningApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPositioning: builder.query<PositioningListResponse, PositioningListRequest>({
      query: ({ pageNumber, pageSize, projectId, query }) => {
        const params: Record<string, number | string> = { pageNumber, pageSize, projectId };
        if (query !== undefined) {
          params.query = query;
        }
        return {
          url: API_ROUTES.POSITIONING.GET_POSITIONING,
          params,
        };
      },
      providesTags: (_result, _error, { projectId }) => positioningListTags(projectId),
    }),
    getPositioningDetails: builder.query<PositioningDetailsDto, PositioningDetailsRequest>({
      query: ({ siteId, projectId }) => ({
        url: API_ROUTES.POSITIONING.GET_POSITIONING_DETAILS(siteId.toString()),
        params: { projectId },
      }),
      providesTags: (_result, _error, { projectId, siteId }) => [positioningDetailsTag(projectId, siteId)],
    }),
    addPositioningKeyword: builder.mutation<PositioningKeywordDto, AddPositioningKeywordArgs>({
      query: ({ siteId, projectId, body }) => ({
        url: API_ROUTES.POSITIONING.ADD_POSITIONING_KEYWORD(siteId.toString()),
        method: "POST",
        params: { projectId },
        body,
      }),
      invalidatesTags: (_result, _error, { projectId }) => positioningListTags(projectId),
    }),
    deletePositioningKeyword: builder.mutation<void, DeletePositioningKeywordRequest>({
      query: ({ siteId, projectId, keywordId }) => ({
        url: API_ROUTES.POSITIONING.DELETE_POSITIONING_KEYWORD(siteId.toString(), keywordId.toString()),
        method: "DELETE",
        params: { projectId },
      }),
      invalidatesTags: (_result, _error, { projectId }) => positioningListTags(projectId),
    }),
  }),
});

export const {
  useGetPositioningQuery,
  useGetPositioningDetailsQuery,
  useAddPositioningKeywordMutation,
  useDeletePositioningKeywordMutation,
} = positioningApi;
