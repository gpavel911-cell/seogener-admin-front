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
  gap: 10px;
  width: 250px;
`;

const Sidebar = styled.aside`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px;
  border: 1px solid ${({ theme }) => theme.tokens.color.borderSubtle};
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.05);
`;

const SidebarTitle = styled.h2`
  margin: 0 0 2px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 500;
  color: ${({ theme }) => theme.tokens.color.accentText};
`;

const ActionButton = styled.button<{ $active?: boolean }>`
  padding: 9px 10px;
  text-align: left;
  border-radius: ${({ theme }) => theme.tokens.radius.sm};
  border: 1px solid ${({ theme, $active }) => ($active ? "rgba(37, 99, 235, 0.36)" : theme.tokens.color.borderSubtle)};
  background: ${({ theme, $active }) =>
    $active ? "linear-gradient(180deg, rgba(37, 99, 235, 0.16) 0%, rgba(37, 99, 235, 0.08) 100%)" : theme.tokens.color.bgSurface};
  color: ${({ theme, $active }) => ($active ? theme.tokens.color.accentText : theme.tokens.color.textPrimary)};
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease;

  &:hover {
    background: ${({ theme }) => theme.tokens.color.accentMuted};
    border-color: ${({ theme }) => theme.tokens.color.borderStrong};
    transform: translateX(1px);
  }
`;
