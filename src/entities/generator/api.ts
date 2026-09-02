import { API_ROUTES } from "@shared/config/api-routes";
import { baseApi } from "@shared/store";
import type {
  GeneratorAnalyticsRequest,
  GeneratorBriefAnalyzeRequest,
  GeneratorBriefUpdateRequest,
  GeneratorCreateProjectRequest,
  GeneratorDesignSelectRequest,
  GeneratorDomainsUpdateRequest,
  GeneratorPrebuiltConfirmRequest,
  GeneratorWordstatBulkRequest,
  GeneratorWordstatSearchRequest,
  GeneratorKeywordCollectRequest,
  GeneratorKeywordConfirmRequest,
  GeneratorExternalKeywordsRequest,
  GeneratorKeywordLanguageRequest,
  GeneratorKeywordUploadDeleteRequest,
  GeneratorProjectsListRequest,
  GeneratorRunRequest,
  GeneratorSeoConfigRequest,
  GeneratorSuggestDomainMappingRequest,
  GeneratorUpdateProjectRequest,
} from "./request-types";
import type {
  GeneratorDesignListItem,
  GeneratorDesignState,
  GeneratorBriefAnalyzeResponse,
  GeneratorKeywordItem,
  GeneratorKeywordProcessStatusDto,
  GeneratorPageType,
  GeneratorPrebuiltFile,
  GeneratorProjectSnapshot,
  GeneratorWordstatBulkStatus,
  GeneratorProjectsListResponse,
  GeneratorResults,
  GeneratorStreamTicket,
  GeneratorUploadType,
} from "./types";

export const generatorApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getGeneratorProjects: builder.query<GeneratorProjectsListResponse, GeneratorProjectsListRequest>({
      query: ({ pageNumber, pageSize }) => ({
        url: API_ROUTES.GENERATOR.LIST_PROJECTS,
        params: { pageNumber, pageSize },
      }),
      providesTags: [{ type: "Generator", id: "LIST" }],
    }),
    getGeneratorProject: builder.query<GeneratorProjectSnapshot, number | string>({
      query: (id) => ({
        url: API_ROUTES.GENERATOR.GET_PROJECT(id),
      }),
      providesTags: (_result, _error, id) => [{ type: "Generator", id: String(id) }],
    }),
    deleteGeneratorProject: builder.mutation<void, number | string>({
      query: (id) => ({
        url: API_ROUTES.GENERATOR.DELETE_PROJECT(id),
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Generator", id: "LIST" },
        { type: "Generator", id: String(id) },
      ],
    }),
    createGeneratorProject: builder.mutation<GeneratorProjectSnapshot, GeneratorCreateProjectRequest>({
      query: (body) => ({
        url: API_ROUTES.GENERATOR.CREATE_PROJECT,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Generator", id: "LIST" }],
    }),
    updateGeneratorProject: builder.mutation<
      GeneratorProjectSnapshot,
      { id: number | string } & GeneratorUpdateProjectRequest
    >({
      query: ({ id, ...body }) => ({
        url: API_ROUTES.GENERATOR.UPDATE_PROJECT(id),
        method: "PUT",
        body,
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: "Generator", id: "LIST" },
        { type: "Generator", id: String(arg.id) },
      ],
    }),
    updateGeneratorBrief: builder.mutation<
      GeneratorProjectSnapshot,
      { id: number | string } & GeneratorBriefUpdateRequest
    >({
      query: ({ id, ...body }) => ({
        url: API_ROUTES.GENERATOR.UPDATE_BRIEF(id),
        method: "PUT",
        body,
      }),
      invalidatesTags: (_r, _e, arg) => [{ type: "Generator", id: String(arg.id) }],
    }),
    analyzeGeneratorBrief: builder.mutation<
      GeneratorBriefAnalyzeResponse,
      { id: number | string } & GeneratorBriefAnalyzeRequest
    >({
      query: ({ id, ...body }) => ({
        url: API_ROUTES.GENERATOR.ANALYZE_BRIEF(id),
        method: "POST",
        body,
      }),
    }),
    uploadGeneratorKeywords: builder.mutation<
      GeneratorProjectSnapshot,
      { id: number | string; file: File; type: GeneratorUploadType }
    >({
      query: ({ id, file, type }) => {
        const body = new FormData();
        body.append("file", file);
        body.append("type", type);
        return {
          url: API_ROUTES.GENERATOR.UPLOAD_KEYWORDS(id),
          method: "POST",
          body,
        };
      },
      invalidatesTags: (_r, _e, arg) => [{ type: "Generator", id: String(arg.id) }],
    }),
    deleteGeneratorUpload: builder.mutation<
      GeneratorProjectSnapshot,
      { id: number | string } & GeneratorKeywordUploadDeleteRequest
    >({
      query: ({ id, ...body }) => ({
        url: API_ROUTES.GENERATOR.DELETE_UPLOAD(id),
        method: "DELETE",
        body,
      }),
      invalidatesTags: (_r, _e, arg) => [{ type: "Generator", id: String(arg.id) }],
    }),
    processGeneratorKeywords: builder.mutation<GeneratorProjectSnapshot, number | string>({
      query: (id) => ({
        url: API_ROUTES.GENERATOR.PROCESS_KEYWORDS(id),
        method: "POST",
      }),
      invalidatesTags: (_r, _e, id) => [{ type: "Generator", id: String(id) }],
    }),
    getGeneratorProcessStatus: builder.query<GeneratorKeywordProcessStatusDto, number | string>({
      query: (id) => ({
        url: API_ROUTES.GENERATOR.PROCESS_STATUS(id),
      }),
    }),
    clusterGeneratorKeywords: builder.mutation<GeneratorProjectSnapshot, number | string>({
      query: (id) => ({
        url: API_ROUTES.GENERATOR.CLUSTER_KEYWORDS(id),
        method: "POST",
      }),
      invalidatesTags: (_r, _e, id) => [{ type: "Generator", id: String(id) }],
    }),
    setGeneratorKeywordLanguage: builder.mutation<
      GeneratorProjectSnapshot,
      { id: number | string } & GeneratorKeywordLanguageRequest
    >({
      query: ({ id, ...body }) => ({
        url: API_ROUTES.GENERATOR.KEYWORD_LANGUAGE(id),
        method: "PUT",
        body,
      }),
      invalidatesTags: (_r, _e, arg) => [{ type: "Generator", id: String(arg.id) }],
    }),
    collectGeneratorKeywords: builder.mutation<
      GeneratorProjectSnapshot,
      { id: number | string } & GeneratorKeywordCollectRequest
    >({
      query: ({ id, ...body }) => ({
        url: API_ROUTES.GENERATOR.COLLECT_KEYWORDS(id),
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, arg) => [{ type: "Generator", id: String(arg.id) }],
    }),
    searchGeneratorWordstat: builder.mutation<
      { keywords: GeneratorKeywordItem[]; count: number },
      { id: number | string } & GeneratorWordstatSearchRequest
    >({
      query: ({ id, ...body }) => ({
        url: API_ROUTES.GENERATOR.WORDSTAT_SEARCH(id),
        method: "POST",
        body,
      }),
    }),
    startGeneratorWordstatBulk: builder.mutation<
      GeneratorWordstatBulkStatus,
      { id: number | string } & GeneratorWordstatBulkRequest
    >({
      query: ({ id, ...body }) => ({
        url: API_ROUTES.GENERATOR.WORDSTAT_BULK(id),
        method: "POST",
        body,
      }),
    }),
    getGeneratorWordstatBulkStatus: builder.query<GeneratorWordstatBulkStatus, number | string>({
      query: (id) => ({
        url: API_ROUTES.GENERATOR.WORDSTAT_BULK_STATUS(id),
      }),
    }),
    confirmGeneratorKeywords: builder.mutation<
      GeneratorProjectSnapshot,
      { id: number | string } & GeneratorKeywordConfirmRequest
    >({
      query: ({ id, ...body }) => ({
        url: API_ROUTES.GENERATOR.CONFIRM_KEYWORDS(id),
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, arg) => [{ type: "Generator", id: String(arg.id) }],
    }),
    importGeneratorExternalKeywords: builder.mutation<
      GeneratorProjectSnapshot,
      { id: number | string } & GeneratorExternalKeywordsRequest
    >({
      query: ({ id, ...body }) => ({
        url: API_ROUTES.GENERATOR.IMPORT_EXTERNAL_KEYWORDS(id),
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, arg) => [{ type: "Generator", id: String(arg.id) }],
    }),
    updateGeneratorDomains: builder.mutation<
      GeneratorProjectSnapshot,
      { id: number | string } & GeneratorDomainsUpdateRequest
    >({
      query: ({ id, ...body }) => ({
        url: API_ROUTES.GENERATOR.UPDATE_DOMAINS(id),
        method: "PUT",
        body,
      }),
      async onQueryStarted({ id }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          patchCachedGeneratorProject(dispatch, id, data);
        } catch {
          // keep the previous snapshot until the next fetch
        }
      },
      invalidatesTags: (_r, _e, arg) => [
        { type: "Generator", id: "LIST" },
        { type: "Generator", id: String(arg.id) },
      ],
    }),
    suggestGeneratorDomains: builder.mutation<
      { suggestions: Record<string, string> },
      { id: number | string } & GeneratorSuggestDomainMappingRequest
    >({
      query: ({ id, ...body }) => ({
        url: API_ROUTES.GENERATOR.SUGGEST_DOMAINS(id),
        method: "POST",
        body,
      }),
    }),
    getGeneratorDesigns: builder.query<{ items: GeneratorDesignListItem[] }, void>({
      query: () => ({
        url: API_ROUTES.GENERATOR.LIST_DESIGNS,
      }),
      providesTags: [{ type: "Generator", id: "DESIGNS" }],
    }),
    getGeneratorPageTypes: builder.query<{ items: GeneratorPageType[] }, void>({
      query: () => ({
        url: API_ROUTES.GENERATOR.DESIGN_PAGE_TYPES,
      }),
    }),
    getGeneratorDesignPreview: builder.query<string, string>({
      query: (designId) => ({
        url: API_ROUTES.GENERATOR.DESIGN_PREVIEW(designId),
        responseHandler: async (response) => {
          const blob = await response.blob();
          return URL.createObjectURL(blob);
        },
      }),
    }),
    importGeneratorDesign: builder.mutation<GeneratorDesignListItem, { file: File; name: string }>({
      query: ({ file, name }) => {
        const body = new FormData();
        body.append("file", file);
        body.append("name", name);
        return {
          url: API_ROUTES.GENERATOR.IMPORT_DESIGN,
          method: "POST",
          body,
        };
      },
      invalidatesTags: [{ type: "Generator", id: "DESIGNS" }],
    }),
    selectGeneratorDesign: builder.mutation<
      GeneratorProjectSnapshot,
      { id: number | string } & GeneratorDesignSelectRequest
    >({
      query: ({ id, ...body }) => ({
        url: API_ROUTES.GENERATOR.SELECT_DESIGN(id),
        method: "PUT",
        body,
      }),
      invalidatesTags: (_r, _e, arg) => [{ type: "Generator", id: String(arg.id) }],
    }),
    getGeneratorDesignState: builder.query<GeneratorDesignState, number | string>({
      query: (id) => ({
        url: API_ROUTES.GENERATOR.DESIGN_STATE(id),
      }),
      providesTags: (_r, _e, id) => [{ type: "Generator", id: `${id}-design-state` }],
    }),
    startGeneratorTemplateDesign: builder.mutation<
      GeneratorDesignState,
      { id: number | string; file: File }
    >({
      query: ({ id, file }) => {
        const body = new FormData();
        body.append("file", file);
        return {
          url: API_ROUTES.GENERATOR.DESIGN_TEMPLATE(id),
          method: "POST",
          body,
        };
      },
      invalidatesTags: (_r, _e, arg) => [
        { type: "Generator", id: String(arg.id) },
        { type: "Generator", id: `${arg.id}-design-state` },
      ],
    }),
    buildGeneratorDesign: builder.mutation<GeneratorProjectSnapshot, number | string>({
      query: (id) => ({
        url: API_ROUTES.GENERATOR.DESIGN_BUILD(id),
        method: "POST",
      }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Generator", id: String(id) },
        { type: "Generator", id: `${id}-design-state` },
      ],
    }),
    resetGeneratorDesign: builder.mutation<GeneratorProjectSnapshot, number | string>({
      query: (id) => ({
        url: API_ROUTES.GENERATOR.DESIGN_RESET(id),
        method: "POST",
      }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Generator", id: String(id) },
        { type: "Generator", id: `${id}-design-state` },
      ],
    }),
    uploadGeneratorPrebuiltDesign: builder.mutation<
      { files: GeneratorPrebuiltFile[] },
      { id: number | string; file: File }
    >({
      query: ({ id, file }) => {
        const body = new FormData();
        body.append("file", file);
        return {
          url: API_ROUTES.GENERATOR.DESIGN_PREBUILT(id),
          method: "POST",
          body,
        };
      },
    }),
    confirmGeneratorPrebuiltDesign: builder.mutation<
      GeneratorProjectSnapshot,
      { id: number | string } & GeneratorPrebuiltConfirmRequest
    >({
      query: ({ id, ...body }) => ({
        url: API_ROUTES.GENERATOR.DESIGN_PREBUILT_CONFIRM(id),
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: "Generator", id: String(arg.id) },
        { type: "Generator", id: `${arg.id}-design-state` },
      ],
    }),
    approveGeneratorDesign: builder.mutation<GeneratorProjectSnapshot, number | string>({
      query: (id) => ({
        url: API_ROUTES.GENERATOR.DESIGN_APPROVE(id),
        method: "POST",
      }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Generator", id: String(id) },
        { type: "Generator", id: `${id}-design-state` },
      ],
    }),
    getGeneratorDesignPageHtml: builder.query<string, { id: number | string; slug: string }>({
      query: ({ id, slug }) => ({
        url: API_ROUTES.GENERATOR.DESIGN_PAGE_HTML(id, slug),
        responseHandler: async (response) => {
          if (!response.ok) {
            throw new Error("Не удалось загрузить превью");
          }
          return response.text();
        },
      }),
    }),
    saveGeneratorSeoConfig: builder.mutation<
      GeneratorProjectSnapshot,
      { id: number | string } & GeneratorSeoConfigRequest
    >({
      query: ({ id, ...body }) => ({
        url: API_ROUTES.GENERATOR.SEO_CONFIG(id),
        method: "PUT",
        body,
      }),
      async onQueryStarted({ id }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          patchCachedGeneratorProject(dispatch, id, data);
        } catch {
          // keep the previous snapshot until the next fetch
        }
      },
      invalidatesTags: (_r, _e, arg) => [{ type: "Generator", id: String(arg.id) }],
    }),
    runGeneratorProject: builder.mutation<GeneratorProjectSnapshot, { id: number | string } & GeneratorRunRequest>({
      query: ({ id, ...body }) => ({
        url: API_ROUTES.GENERATOR.RUN(id),
        method: "POST",
        body,
      }),
      async onQueryStarted({ id }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          patchCachedGeneratorProject(dispatch, id, data);
        } catch {
          // keep the previous snapshot until the next poll
        }
      },
      invalidatesTags: (_r, _e, arg) => [
        { type: "Generator", id: "LIST" },
        { type: "Generator", id: String(arg.id) },
      ],
    }),
    stopGeneratorProject: builder.mutation<GeneratorProjectSnapshot, number | string>({
      query: (id) => ({
        url: API_ROUTES.GENERATOR.STOP(id),
        method: "POST",
      }),
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          patchCachedGeneratorProject(dispatch, id, data);
        } catch {
          // keep the previous snapshot until the next poll
        }
      },
      invalidatesTags: (_r, _e, id) => [
        { type: "Generator", id: "LIST" },
        { type: "Generator", id: String(id) },
      ],
    }),
    issueGeneratorStreamTicket: builder.mutation<GeneratorStreamTicket, number | string>({
      query: (id) => ({
        url: API_ROUTES.GENERATOR.STREAM_TICKET(id),
        method: "POST",
      }),
    }),
    getGeneratorResults: builder.query<GeneratorResults, number | string>({
      query: (id) => ({
        url: API_ROUTES.GENERATOR.RESULTS(id),
      }),
      providesTags: (_r, _e, id) => [{ type: "Generator", id: `${id}-results` }],
    }),
    downloadGeneratorExport: builder.mutation<string, { id: number | string; domain: string }>({
      query: ({ id, domain }) => ({
        url: API_ROUTES.GENERATOR.EXPORT(id, domain),
        method: "GET",
        responseHandler: async (response) => {
          const blob = await response.blob();
          return URL.createObjectURL(blob);
        },
      }),
    }),
    saveGeneratorAnalytics: builder.mutation<
      GeneratorProjectSnapshot,
      { id: number | string } & GeneratorAnalyticsRequest
    >({
      query: ({ id, ...body }) => ({
        url: API_ROUTES.GENERATOR.ANALYTICS(id),
        method: "PUT",
        body,
      }),
      invalidatesTags: (_r, _e, arg) => [{ type: "Generator", id: String(arg.id) }],
    }),
  }),
});

export const {
  useGetGeneratorProjectsQuery,
  useGetGeneratorProjectQuery,
  useCreateGeneratorProjectMutation,
  useDeleteGeneratorProjectMutation,
  useUpdateGeneratorProjectMutation,
  useUpdateGeneratorBriefMutation,
  useAnalyzeGeneratorBriefMutation,
  useUploadGeneratorKeywordsMutation,
  useDeleteGeneratorUploadMutation,
  useProcessGeneratorKeywordsMutation,
  useGetGeneratorProcessStatusQuery,
  useClusterGeneratorKeywordsMutation,
  useSetGeneratorKeywordLanguageMutation,
  useCollectGeneratorKeywordsMutation,
  useSearchGeneratorWordstatMutation,
  useStartGeneratorWordstatBulkMutation,
  useGetGeneratorWordstatBulkStatusQuery,
  useConfirmGeneratorKeywordsMutation,
  useImportGeneratorExternalKeywordsMutation,
  useUpdateGeneratorDomainsMutation,
  useSuggestGeneratorDomainsMutation,
  useGetGeneratorDesignsQuery,
  useGetGeneratorPageTypesQuery,
  useGetGeneratorDesignPreviewQuery,
  useImportGeneratorDesignMutation,
  useSelectGeneratorDesignMutation,
  useGetGeneratorDesignStateQuery,
  useStartGeneratorTemplateDesignMutation,
  useBuildGeneratorDesignMutation,
  useResetGeneratorDesignMutation,
  useUploadGeneratorPrebuiltDesignMutation,
  useConfirmGeneratorPrebuiltDesignMutation,
  useApproveGeneratorDesignMutation,
  useGetGeneratorDesignPageHtmlQuery,
  useSaveGeneratorSeoConfigMutation,
  useRunGeneratorProjectMutation,
  useStopGeneratorProjectMutation,
  useIssueGeneratorStreamTicketMutation,
  useGetGeneratorResultsQuery,
  useDownloadGeneratorExportMutation,
  useSaveGeneratorAnalyticsMutation,
} = generatorApi;

function patchCachedGeneratorProject(
  dispatch: (action: ReturnType<typeof generatorApi.util.updateQueryData>) => void,
  id: number | string,
  data: GeneratorProjectSnapshot,
) {
  dispatch(generatorApi.util.updateQueryData("getGeneratorProject", Number(id), () => data));
}
