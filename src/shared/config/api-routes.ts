export const API_ROUTES = {
  AUTH: {
    LOGIN: "/api/v1/auth/login",
    REFRESH: "/api/v1/auth/refresh",
    LOGOUT: "/api/v1/auth/logout",
  },
  DOMAINS: {
    GET_ALL: "/api/v1/domains",
    GET_DETAILS: (id: number) => `/api/v1/domains/${id}`,
    SYNC: "/api/v1/domains/sync",
  },
} as const;
