import styled from "styled-components";
import {AnalyticsAction} from "@pages/metrics/ui/metrics-page";

type ActionItem = {
  id: AnalyticsAction;
  label: string;
};

type MetricsActionsProps = {
  actions: ActionItem[];
  activeAction: AnalyticsAction;
  onSelect: (id: AnalyticsAction) => void;
};

export const MetricsSidebar = ({ actions, activeAction, onSelect }: MetricsActionsProps) => {
  return (
    <Sidebar>
      <SidebarTitle>Действия</SidebarTitle>
      {actions.map((action) => (
        <ActionButton
          key={action.id}
          type="button"
          $active={activeAction === action.id}
          onClick={() => onSelect(action.id)}
        >
          {action.label}
        </ActionButton>
      ))}
    </Sidebar>
  );
};

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
