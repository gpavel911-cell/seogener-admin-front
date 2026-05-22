import { API_ROUTES } from "@shared/config/api-routes";
import { baseApi } from "@shared/store";
import type {
  ProjectDto,
  ProjectAssignSitesRequest,
  ProjectCreateRequest,
  ProjectDeleteRequest,
  ProjectOptionDto,
  ProjectRenameRequest,
  ProjectSitesListRequest,
  ProjectSitesListResponse,
  ProjectUnassignSitesRequest,
} from "./types";

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
      query: ({ pageNumber, pageSize, projectId, unassigned, siteQuery }) => {
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
        return {
          url: API_ROUTES.PROJECTS.GET_PROJECT_SITES,
          params,
        };
      },
      providesTags: ["ProjectSites"],
    }),
    assignProjectSites: builder.mutation<void, ProjectAssignSitesRequest>({
      query: ({ projectId, siteIds }) => ({
        url: API_ROUTES.PROJECTS.ASSIGN_PROJECT_SITES(projectId),
        method: "POST",
        body: { siteIds },
      }),
      invalidatesTags: ["Projects", "ProjectSites"],
    }),
    unassignProjectSites: builder.mutation<void, ProjectUnassignSitesRequest>({
      query: ({ projectId, siteIds }) => ({
        url: API_ROUTES.PROJECTS.UNASSIGN_PROJECT_SITES(projectId),
        method: "POST",
        body: { siteIds },
      }),
      invalidatesTags: ["Projects", "ProjectSites"],
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
  useAssignProjectSitesMutation,
  useUnassignProjectSitesMutation,
} = projectsApi;
