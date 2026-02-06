"use client";

import { useState } from "react";
import styled from "styled-components";
import { PageTitle } from "@shared/ui";
import { MetricsSidebar } from "./metrics-sidebar";
import { ActionsSectionCreateCounter } from "./actions-section-create-counter";
import { ActionsSectionViewCounterGoals } from "./actions-section-view-counter-goals";
import { ActionsSectionViewCounterStatistics } from "./actions-section-view-counter-statistics";
import { ActionsSectionCreateARecord } from "./actions-section-create-a-record";
import { ActionsSectionViewDnsRecords } from "./actions-section-view-dns-records";

export enum Action {
   VIEW_ANALYTICS_STATISTICS = 'VIEW_ANALYTICS_STATISTICS',
   CREATE_COUNTER = 'CREATE_COUNTER',
   VIEW_COUNTER_GOALS = 'VIEW_COUNTER_GOALS',
   CREATE_A_RECORD = 'CREATE_A_RECORD',
   VIEW_DNS_RECORDS = 'VIEW_DNS_RECORDS'
}

const METRICS_ACTIONS: { id: Action; label: string }[] = [
  { id: Action.CREATE_COUNTER, label: "Создать счетчик" },
  { id: Action.VIEW_ANALYTICS_STATISTICS, label: "Посмотреть статистику" },
  { id: Action.VIEW_COUNTER_GOALS, label: "Посмотреть цели" },
];

const REGISTRAR_ACTIONS: { id: Action; label: string }[] = [
  { id: Action.VIEW_DNS_RECORDS, label: "Посмотреть А-записи" },
  { id: Action.CREATE_A_RECORD, label: "Создать А-запись" },
];

export function ActionsPage() {
  const [activeAction, setActiveAction] = useState<Action>(METRICS_ACTIONS[0].id);

  return (
    <Wrapper>
      <Header>
        <PageTitle>Действия</PageTitle>
      </Header>
      <Body>
        <MetricsSidebar
           sections={[
             { title: "Метрика", actions: METRICS_ACTIONS },
             { title: "Регистратор", actions: REGISTRAR_ACTIONS },
           ]}
           activeAction={activeAction}
           onSelect={setActiveAction}
        />
        <Content>
          {activeAction === Action.VIEW_ANALYTICS_STATISTICS && <ActionsSectionViewCounterStatistics />}
          {activeAction === Action.CREATE_COUNTER && <ActionsSectionCreateCounter />}
          {activeAction === Action.VIEW_COUNTER_GOALS && <ActionsSectionViewCounterGoals />}
          {activeAction === Action.CREATE_A_RECORD && <ActionsSectionCreateARecord />}
          {activeAction === Action.VIEW_DNS_RECORDS && <ActionsSectionViewDnsRecords />}
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
