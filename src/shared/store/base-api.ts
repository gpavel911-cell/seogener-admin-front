import {
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
  createApi,
  fetchBaseQuery,
} from "@reduxjs/toolkit/query/react";
import type { AuthResponse } from "@entities/auth/types";
import { API_ROUTES } from "@shared/config/api-routes";
import { clearCredentials, setCredentials } from "./auth-slice";
import type { RootState } from "./store";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!apiBaseUrl) {
  throw new Error("NEXT_PUBLIC_API_BASE_URL is required");
}

const rawBaseQuery = fetchBaseQuery({
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

const AUTH_ENDPOINTS = Object.values(API_ROUTES.AUTH);

const isAuthEndpoint = (args: string | FetchArgs) => {
  const url = typeof args === "string" ? args : args.url;
  return AUTH_ENDPOINTS.some((endpoint) => url.startsWith(endpoint));
};

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401 && !isAuthEndpoint(args)) {
    const refreshResult = await rawBaseQuery(
      {
        url: API_ROUTES.AUTH.REFRESH,
        method: "POST",
      },
      api,
      extraOptions,
    );

    if (refreshResult.data) {
      api.dispatch(setCredentials(refreshResult.data as AuthResponse));
      result = await rawBaseQuery(args, api, extraOptions);
    } else {
      api.dispatch(clearCredentials());
    }
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Projects", "ProjectSites", "ProjectOptions"],
  endpoints: () => ({}),
});
