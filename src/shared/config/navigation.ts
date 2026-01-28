import { ROUTES } from "./routes";

export const SIDEBAR_ITEM = {
  DASHBOARD: "dashboard",
  DOMAINS: "domains",
  COUNTERS: "counters",
  METRICS: "metrics",
  SETTINGS: "settings",
} as const;

export type SIDEBAR_ITEM = (typeof SIDEBAR_ITEM)[keyof typeof SIDEBAR_ITEM];

export type SidebarItem = {
  id: SIDEBAR_ITEM;
  label: string;
  path: string;
};

export const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: SIDEBAR_ITEM.DASHBOARD, label: "Главная", path: ROUTES.DASHBOARD },
  { id: SIDEBAR_ITEM.DOMAINS, label: "Домены", path: ROUTES.DOMAINS },
  { id: SIDEBAR_ITEM.COUNTERS, label: "Счетчики", path: ROUTES.COUNTERS },
  { id: SIDEBAR_ITEM.METRICS, label: "Метрика", path: ROUTES.METRICS },
  { id: SIDEBAR_ITEM.SETTINGS, label: "Настройки", path: ROUTES.SETTINGS },
];
