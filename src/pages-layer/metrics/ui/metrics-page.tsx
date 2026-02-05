"use client";

import { useState } from "react";
import styled from "styled-components";
import { PageTitle } from "@shared/ui";
import { MetricsSidebar } from "./metrics-sidebar";
import { MetricsSectionCreateCounter } from "./metrics-section-create-counter";
import { MetricsSectionViewCounterGoals } from "./metrics-section-view-counter-goals";
import { MetricsSectionViewCounterStatistics } from "./metrics-section-view-counter-statistics";

export enum AnalyticsAction {
   VIEW_ANALYTICS_STATISTICS = 'VIEW_ANALYTICS_STATISTICS',
   CREATE_COUNTER = 'CREATE_COUNTER',
   VIEW_COUNTER_GOALS = 'VIEW_COUNTER_GOALS'
}

const ANALYTICS_ACTIONS: { id: AnalyticsAction; label: string }[] = [
  { id: AnalyticsAction.CREATE_COUNTER, label: "Создать счетчик" },
  { id: AnalyticsAction.VIEW_ANALYTICS_STATISTICS, label: "Посмотреть статистику" },
  { id: AnalyticsAction.VIEW_COUNTER_GOALS, label: "Посмотреть цели" },
];

export function MetricsPage() {
  const [activeAction, setActiveAction] = useState<AnalyticsAction>(ANALYTICS_ACTIONS[0].id);

  return (
    <Wrapper>
      <Header>
        <PageTitle>Метрика</PageTitle>
      </Header>
      <Body>
        <MetricsSidebar
           actions={ANALYTICS_ACTIONS}
           activeAction={activeAction}
           onSelect={setActiveAction}
        />
        <Content>
          {activeAction === AnalyticsAction.VIEW_ANALYTICS_STATISTICS && <MetricsSectionViewCounterStatistics />}
          {activeAction === AnalyticsAction.CREATE_COUNTER && <MetricsSectionCreateCounter />}
          {activeAction === AnalyticsAction.VIEW_COUNTER_GOALS && <MetricsSectionViewCounterGoals />}
        </Content>
      </Body>
    </Wrapper>
  );
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Body = styled.div`
  display: grid;
  grid-template-columns: 250px 1fr;
  gap: 24px;
  align-items: flex-start;
`;

const Content = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;
