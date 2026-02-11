import styled from "styled-components";

export type SidebarActionItem = {
  id: string;
  label: string;
};

export type SidebarSection = {
  title: string;
  actions: SidebarActionItem[];
};

type ActionsSidebarProps = {
  sections: SidebarSection[];
  activeAction: string | null;
  onSelect: (id: string) => void;
};

export const ActionsSidebar = ({ sections, activeAction, onSelect }: ActionsSidebarProps) => {
  return (
    <SidebarStack>
      {sections.map((section) => (
        <Sidebar key={section.title}>
          <SidebarTitle>{section.title}</SidebarTitle>
          {section.actions.map((action) => (
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
      ))}
    </SidebarStack>
  );
};

const SidebarStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 250px;
`;

const Sidebar = styled.aside`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #ffffff;
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
