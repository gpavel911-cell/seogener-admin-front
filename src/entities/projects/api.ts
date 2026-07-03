import { API_ROUTES } from "@shared/config/api-routes";
import { positioningListTags } from "@entities/positioning/api";
import { baseApi } from "@shared/store";
import type {
  ProjectDto,
  ProjectAssignSitesRequest,
  ProjectCreateRequest,
  ProjectDeleteRequest,
  ProjectOptionDto,
  ProjectSitePageDto,
  ProjectSiteRefreshResultDto,
  ProjectRenameRequest,
  ProjectSitesListRequest,
  ProjectSitesListResponse,
  ProjectUnassignSitesRequest,
} from "./types";

const buildProjectSitesParams = ({ pageNumber, pageSize, projectId, unassigned, siteQuery }: ProjectSitesListRequest) => {
  const params: Record<string, number | boolean | string> = { pageNumber, pageSize };
  if (projectId !== undefined) {
    params.projectId = projectId;
  }
  if (unassigned !== undefined) {
    params.unassigned = unassigned;
  }
  if (siteQuery !== undefined) {
    params.siteQuery = siteQuery;
  }
  return params;
};

export const projectsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProjects: builder.query<ProjectDto[], void>({
      query: () => ({
        url: API_ROUTES.PROJECTS.GET_PROJECTS,
      }),
      providesTags: ["Projects"],
    }),
    getProjectOptions: builder.query<ProjectOptionDto[], void>({
      query: () => ({
        url: API_ROUTES.PROJECTS.GET_PROJECT_OPTIONS,
      }),
      providesTags: ["ProjectOptions"],
    }),
    createProject: builder.mutation<ProjectDto, ProjectCreateRequest>({
      query: (body) => ({
        url: API_ROUTES.PROJECTS.CREATE_PROJECT,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Projects", "ProjectSites", "ProjectOptions"],
    }),
    updateProject: builder.mutation<ProjectDto, ProjectRenameRequest>({
      query: ({ projectId, name }) => ({
        url: API_ROUTES.PROJECTS.UPDATE_PROJECT(projectId),
        method: "PATCH",
        body: { name },
      }),
      invalidatesTags: ["Projects", "ProjectSites", "ProjectOptions"],
    }),
    deleteProject: builder.mutation<void, ProjectDeleteRequest>({
      query: ({ projectId }) => ({
        url: API_ROUTES.PROJECTS.DELETE_PROJECT(projectId),
        method: "DELETE",
      }),
      invalidatesTags: ["Projects", "ProjectSites", "ProjectOptions"],
    }),
    getProjectSites: builder.query<ProjectSitesListResponse, ProjectSitesListRequest>({
      query: (request) => ({
        url: API_ROUTES.PROJECTS.GET_PROJECT_SITES,
        params: buildProjectSitesParams(request),
      }),
      providesTags: (result) => [
        { type: "ProjectSites", id: "LIST" },
        ...(result?.content.map((site) => ({ type: "ProjectSites" as const, id: site.siteId })) ?? []),
      ],
    }),
    getProjectSitePages: builder.query<ProjectSitePageDto[], number>({
      query: (siteId) => ({
        url: API_ROUTES.PROJECTS.GET_PROJECT_SITE_PAGES(String(siteId)),
      }),
      providesTags: (_result, _error, siteId) => [
        { type: "ProjectSitePages", id: "LIST" },
        { type: "ProjectSitePages", id: siteId },
      ],
    }),
    refreshProjectSitePages: builder.mutation<ProjectSiteRefreshResultDto, number>({
      query: (siteId) => ({
        url: API_ROUTES.PROJECTS.REFRESH_PROJECT_SITE_PAGES(String(siteId)),
        method: "POST",
      }),
      invalidatesTags: (_result, _error, siteId) => [
        { type: "ProjectSitePages", id: siteId },
      ],
    }),
    refreshProjectSitesPages: builder.mutation<ProjectSiteRefreshResultDto[], ProjectSitesListRequest>({
      query: (request) => ({
        url: API_ROUTES.PROJECTS.REFRESH_PROJECT_SITES_PAGES,
        method: "POST",
        params: buildProjectSitesParams(request),
      }),
      invalidatesTags: (result) => [
        { type: "ProjectSites", id: "LIST" },
        { type: "ProjectSitePages", id: "LIST" },
        ...(result?.flatMap((item) => [
          { type: "ProjectSites" as const, id: item.siteId },
          { type: "ProjectSitePages" as const, id: item.siteId },
        ]) ?? []),
      ],
    }),
    assignProjectSites: builder.mutation<void, ProjectAssignSitesRequest>({
      query: ({ projectId, siteIds }) => ({
        url: API_ROUTES.PROJECTS.ASSIGN_PROJECT_SITES(projectId),
        method: "POST",
        body: { siteIds },
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Projects", id: "LIST" },
        { type: "ProjectSites", id: "LIST" },
        ...positioningListTags(Number(projectId)),
      ],
    }),
    unassignProjectSites: builder.mutation<void, ProjectUnassignSitesRequest>({
      query: ({ projectId, siteIds }) => ({
        url: API_ROUTES.PROJECTS.UNASSIGN_PROJECT_SITES(projectId),
        method: "POST",
        body: { siteIds },
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Projects", id: "LIST" },
        { type: "ProjectSites", id: "LIST" },
        ...positioningListTags(Number(projectId)),
      ],
    }),
  }),
});

export const {
  useGetProjectsQuery,
  useGetProjectOptionsQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
  useGetProjectSitesQuery,
  useGetProjectSitePagesQuery,
  useRefreshProjectSitePagesMutation,
  useRefreshProjectSitesPagesMutation,
  useAssignProjectSitesMutation,
  useUnassignProjectSitesMutation,
} = projectsApi;
