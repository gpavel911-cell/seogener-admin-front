import { ROUTES } from "./routes";

export type SidebarItem = {
  id: string;
  label: string;
  path: string;
};

export const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: "dashboard", label: "Дашборд", path: ROUTES.DASHBOARD },
  { id: "projects", label: "Проекты", path: ROUTES.PROJECTS },
  { id: "registrars", label: "Регистраторы", path: ROUTES.DOMAINS },
  { id: "metrics", label: "Метрика", path: ROUTES.COUNTERS },
  { id: "webmaster", label: "Вебмастер", path: ROUTES.WEBMASTER },
  { id: "topvisor", label: "Топвизор", path: ROUTES.TOPVISOR },
];
