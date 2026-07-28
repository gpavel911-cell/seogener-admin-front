import { type ReactNode } from "react";
import { MetricsProviderType } from "@entities/metrics/types";
import { CreateCountersBulk } from "@pages/metrics/ui/actions/create-counters-bulk";
import { CreateCounter } from "@pages/metrics/ui/actions/create-counter";
import { ViewCounterGoals } from "@pages/metrics/ui/actions/view-counter-goals";
import { ViewCounterStatistics } from "@pages/metrics/ui/actions/view-counter-statistics";

export enum MetricsAction {
  SYNC_METRICS_COUNTERS = "SYNC_METRICS_COUNTERS",
  CREATE_METRICS_COUNTER = "CREATE_METRICS_COUNTER",
  CREATE_METRICS_COUNTERS_BULK = "CREATE_METRICS_COUNTERS_BULK",
  GET_METRICS_STATISTICS = "GET_METRICS_STATISTICS",
  GET_METRICS_GOALS = "GET_METRICS_GOALS",
}

type MetricsActionItem = {
  id: MetricsAction;
  label: string;
};

type MetricsActionSection = {
  title: string;
  actions: MetricsActionItem[];
};

export const METRICS_ACTION_SECTIONS: MetricsActionSection[] = [
  {
    title: "Действия",
    actions: [
      { id: MetricsAction.SYNC_METRICS_COUNTERS, label: "Счетчики" },
      { id: MetricsAction.CREATE_METRICS_COUNTER, label: "Создать счетчик" },
      { id: MetricsAction.CREATE_METRICS_COUNTERS_BULK, label: "Создать счетчики" },
      { id: MetricsAction.GET_METRICS_STATISTICS, label: "Посмотреть статистику" },
      { id: MetricsAction.GET_METRICS_GOALS, label: "Посмотреть цели" },
    ],
  },
];

export const getMetricsActionSections = (provider?: MetricsProviderType | null): MetricsActionSection[] => {
  if (provider === MetricsProviderType.GOOGLE_ANALYTICS) {
    return [
      {
        title: "Действия",
        actions: [
          { id: MetricsAction.SYNC_METRICS_COUNTERS, label: "Счетчики" },
        ],
      },
    ];
  }
  return METRICS_ACTION_SECTIONS;
};

export type MetricsActionRenderContext = {
  profile?: string | null;
  onRefreshCounters?: () => Promise<unknown> | void;
};

export const renderMetricsActionContent = (
  action: MetricsAction,
  context?: MetricsActionRenderContext,
): ReactNode => {
  if (action === MetricsAction.GET_METRICS_STATISTICS) {
    return <ViewCounterStatistics fixedProfile={context?.profile} />;
  }
  if (action === MetricsAction.CREATE_METRICS_COUNTERS_BULK) {
    return <CreateCountersBulk fixedProfile={context?.profile} onRefreshCounters={context?.onRefreshCounters} />;
  }
  if (action === MetricsAction.CREATE_METRICS_COUNTER) {
    return <CreateCounter fixedProfile={context?.profile} />;
  }
  if (action === MetricsAction.GET_METRICS_GOALS) {
    return <ViewCounterGoals fixedProfile={context?.profile} />;
  }
  return null;
};
