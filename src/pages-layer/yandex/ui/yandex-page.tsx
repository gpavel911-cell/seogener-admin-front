"use client";

import { useState } from "react";
import styled from "styled-components";
import { PageTitle } from "@shared/ui";

type AnalyticsAction = "createCounter" | "linkCounter" | "trafficReport" | "entryReport" | "goal";

const ACTIONS: { id: AnalyticsAction; label: string }[] = [
  { id: "createCounter", label: "Создать счетчик" },
  { id: "linkCounter", label: "Привязать счетчик" },
  { id: "trafficReport", label: "Источники трафика" },
  { id: "entryReport", label: "Страница входа" },
  { id: "goal", label: "Создать цель" },
];

export function YandexPage() {
  const [activeAction, setActiveAction] = useState<AnalyticsAction>(ACTIONS[0].id);

  return (
    <Wrapper>
      <Header>
        <PageTitle>Метрика</PageTitle>
      </Header>
      <Body>
        <Sidebar>
          <SidebarTitle>Действия</SidebarTitle>
          {ACTIONS.map((action) => (
            <ActionButton
              key={action.id}
              type="button"
              $active={activeAction === action.id}
              onClick={() => setActiveAction(action.id)}
            >
              {action.label}
            </ActionButton>
          ))}
        </Sidebar>

        <Content>
          <Placeholder>Раздел находится в разработке</Placeholder>
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

const Sidebar = styled.aside`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #ffffff;
  width: 250px;
`;

const SidebarTitle = styled.h2`
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 600;
  color: #111827;
`;

const ActionButton = styled.button<{ $active?: boolean }>`
  padding: 10px 12px;
  text-align: left;
  border-radius: 8px;
  border: 1px solid ${({ $active }) => ($active ? "#2563eb" : "#e5e7eb")};
  background: ${({ $active }) => ($active ? "#eff6ff" : "#ffffff")};
  color: ${({ $active }) => ($active ? "#1d4ed8" : "#111827")};
  font-size: 14px;
  cursor: pointer;
`;

const Content = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const Placeholder = styled.div`
  border: 1px dashed #d1d5db;
  background: #f9fafb;
  padding: 20px;
  border-radius: 12px;
  font-size: 14px;
  color: #4b5563;
`;
