export const API_ROUTES = {
  AUTH: {
    LOGIN: "/api/v1/auth/login",
    REFRESH: "/api/v1/auth/refresh",
    LOGOUT: "/api/v1/auth/logout",
  },
  DOMAINS: {
    GET_ALL: "/api/v1/domains",
    GET_DETAILS: (id: number) => `/api/v1/domains/${id}`,
    GET_PROFILES: "/api/v1/domains/profiles",
    SYNC: "/api/v1/domains/sync",
    CREATE_A_RECORD: "/api/v1/domains/dns/a-records",
    LIST_RECORDS: "/api/v1/domains/dns/records",
  },
  ANALYTICS: {
    GET_COUNTERS: "/api/v1/analytics/counters",
    CREATE_COUNTER: "/api/v1/analytics/counters",
    GET_COUNTER_DETAILS: (id: number) => `/api/v1/analytics/counters/${id}`,
    SYNC_COUNTERS: "/api/v1/analytics/counters/sync",
    GET_STATISTICS: "/api/v1/analytics/statistics",
    GET_GOALS: "/api/v1/analytics/goals",
  },
} as const;
