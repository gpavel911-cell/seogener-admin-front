import { type ReactNode } from "react";
import { CreateCounter } from "@pages/metrics/ui/actions/create-counter";
import { ViewCounterGoals } from "@pages/metrics/ui/actions/view-counter-goals";
import { ViewCounterStatistics } from "@pages/metrics/ui/actions/view-counter-statistics";

export enum MetricsAction {
  SYNC_METRICS_COUNTERS = "SYNC_METRICS_COUNTERS",
  CREATE_METRICS_COUNTER = "CREATE_METRICS_COUNTER",
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
      { id: MetricsAction.GET_METRICS_STATISTICS, label: "Посмотреть статистику" },
      { id: MetricsAction.GET_METRICS_GOALS, label: "Посмотреть цели" },
    ],
  },
];

export type MetricsActionRenderContext = {
  profile?: string | null;
};

export const renderMetricsActionContent = (
  action: MetricsAction,
  context?: MetricsActionRenderContext,
): ReactNode => {
  if (action === MetricsAction.GET_METRICS_STATISTICS) {
    return <ViewCounterStatistics fixedProfile={context?.profile} />;
  }
  if (action === MetricsAction.CREATE_METRICS_COUNTER) {
    return <CreateCounter fixedProfile={context?.profile} />;
  }
  if (action === MetricsAction.GET_METRICS_GOALS) {
    return <ViewCounterGoals fixedProfile={context?.profile} />;
  }
  return null;
};
