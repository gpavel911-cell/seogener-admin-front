import { type ReactNode } from "react";
import { AddHost } from "@pages/webmaster/ui/actions/add-host";
import { CreateHostsBulk } from "@pages/webmaster/ui/actions/create-hosts-bulk";
import { PopularQueries } from "@pages/webmaster/ui/actions/popular-queries";
import { QueriesHistory } from "@pages/webmaster/ui/actions/queries-history";
import { SearchUrls } from "@pages/webmaster/ui/actions/search-urls";
import { VerifyHostDnsBulk } from "@pages/webmaster/ui/actions/verify-host-dns-bulk";

export enum WebmasterAction {
  SYNC_WEBMASTER_HOSTS = "SYNC_WEBMASTER_HOSTS",
  CREATE_WEBMASTER_HOST = "CREATE_WEBMASTER_HOST",
  CREATE_WEBMASTER_HOSTS_BULK = "CREATE_WEBMASTER_HOSTS_BULK",
  VERIFY_WEBMASTER_HOST_DNS_BULK = "VERIFY_WEBMASTER_HOST_DNS_BULK",
  GET_WEBMASTER_POPULAR_QUERIES = "GET_WEBMASTER_POPULAR_QUERIES",
  GET_WEBMASTER_SEARCH_QUERIES_HISTORY = "GET_WEBMASTER_SEARCH_QUERIES_HISTORY",
  GET_WEBMASTER_SEARCH_URLS_IN_SEARCH_SAMPLES = "GET_WEBMASTER_SEARCH_URLS_IN_SEARCH_SAMPLES",
}

type WebmasterActionItem = {
  id: WebmasterAction;
  label: string;
};

type WebmasterActionSection = {
  title: string;
  actions: WebmasterActionItem[];
};

export const WEBMASTER_ACTION_SECTIONS: WebmasterActionSection[] = [
  {
    title: "Действия",
    actions: [
      { id: WebmasterAction.SYNC_WEBMASTER_HOSTS, label: "Сайты" },
      { id: WebmasterAction.CREATE_WEBMASTER_HOST, label: "Добавить сайт" },
      { id: WebmasterAction.CREATE_WEBMASTER_HOSTS_BULK, label: "Добавить сайты" },
      { id: WebmasterAction.VERIFY_WEBMASTER_HOST_DNS_BULK, label: "Проверить права DNS (мн.)" },
      { id: WebmasterAction.GET_WEBMASTER_POPULAR_QUERIES, label: "Популярные запросы" },
      { id: WebmasterAction.GET_WEBMASTER_SEARCH_URLS_IN_SEARCH_SAMPLES, label: "Страницы в поиске" },
      { id: WebmasterAction.GET_WEBMASTER_SEARCH_QUERIES_HISTORY, label: "Статистика запросов" },
    ],
  },
];

export type WebmasterActionRenderContext = {
  profile?: string | null;
};

export const renderWebmasterActionContent = (
  action: WebmasterAction,
  context?: WebmasterActionRenderContext,
): ReactNode => {
  if (action === WebmasterAction.CREATE_WEBMASTER_HOST) {
    return <AddHost fixedProfile={context?.profile} />;
  }
  if (action === WebmasterAction.CREATE_WEBMASTER_HOSTS_BULK) {
    return <CreateHostsBulk fixedProfile={context?.profile} />;
  }
  if (action === WebmasterAction.VERIFY_WEBMASTER_HOST_DNS_BULK) {
    return <VerifyHostDnsBulk fixedProfile={context?.profile} />;
  }
  if (action === WebmasterAction.GET_WEBMASTER_POPULAR_QUERIES) {
    return <PopularQueries fixedProfile={context?.profile} />;
  }
  if (action === WebmasterAction.GET_WEBMASTER_SEARCH_QUERIES_HISTORY) {
    return <QueriesHistory fixedProfile={context?.profile} />;
  }
  if (action === WebmasterAction.GET_WEBMASTER_SEARCH_URLS_IN_SEARCH_SAMPLES) {
    return <SearchUrls fixedProfile={context?.profile} />;
  }
  return null;
};
