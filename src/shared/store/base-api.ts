import {
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
  createApi,
  fetchBaseQuery,
} from "@reduxjs/toolkit/query/react";
import type { AuthResponse } from "@entities/auth/types";
import { API_ROUTES } from "@shared/config/api-routes";
import { runSingleFlightRefresh } from "./refresh-session";
import { clearCredentials, setCredentials } from "./auth-slice";
import type { RootState } from "./store";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!apiBaseUrl) {
  throw new Error("NEXT_PUBLIC_API_BASE_URL is required");
}

const authenticatedBaseQuery = fetchBaseQuery({
  baseUrl: apiBaseUrl,
  credentials: "include",
  prepareHeaders: (headers, { getState }) => {
    const state = getState() as RootState;
    const token = state.auth.accessToken;
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

const unauthenticatedBaseQuery = fetchBaseQuery({
  baseUrl: apiBaseUrl,
  credentials: "include",
});

const AUTH_ENDPOINTS = Object.values(API_ROUTES.AUTH);

const isAuthEndpoint = (args: string | FetchArgs) => {
  const url = typeof args === "string" ? args : args.url;
  return AUTH_ENDPOINTS.some((endpoint) => url.startsWith(endpoint));
};

const executeBaseQuery = (
  args: string | FetchArgs,
  api: Parameters<BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError>>[1],
  extraOptions: Parameters<BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError>>[2],
) => {
  return (isAuthEndpoint(args) ? unauthenticatedBaseQuery : authenticatedBaseQuery)(args, api, extraOptions);
};

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  let result = await executeBaseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401 && !isAuthEndpoint(args)) {
    try {
      const refreshData = await runSingleFlightRefresh(async () => {
        const refreshResult = await unauthenticatedBaseQuery(
          {
            url: API_ROUTES.AUTH.REFRESH,
            method: "POST",
          },
          api,
          extraOptions,
        );

        if (!refreshResult.data) {
          throw refreshResult.error ?? new Error("Refresh failed");
        }

        return refreshResult.data as AuthResponse;
      });

      api.dispatch(setCredentials(refreshData));
      result = await executeBaseQuery(args, api, extraOptions);
    } catch {
      api.dispatch(clearCredentials());
    }
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Dashboard", "Distribution", "Positioning", "Projects", "ProjectSites", "ProjectSitePages", "ProjectOptions", "Generator"],
  endpoints: () => ({}),
});
