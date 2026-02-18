import styled from "styled-components";

export type ProfileSidebarGroup<T extends string> = {
  id: T;
  label: string;
  profiles: string[];
};

type ProfilesSidebarProps<T extends string> = {
  groups: ProfileSidebarGroup<T>[];
  activeGroup: T | null;
  activeProfile: string | null;
  isLoading?: boolean;
  onSelect: (group: T, profile: string) => void;
};

export const ProfilesSidebar = <T extends string>({
  groups,
  activeGroup,
  activeProfile,
  isLoading = false,
  onSelect,
}: ProfilesSidebarProps<T>) => {
  return (
    <SidebarStack>
      {groups.map((group) => (
        <Sidebar key={`${group.id}-profiles`}>
          <SidebarTitle>{group.label}</SidebarTitle>
          {group.profiles.length > 0 ? (
            group.profiles.map((profile) => (
              <SidebarButton
                key={`${group.id}-${profile}`}
                type="button"
                $active={activeGroup === group.id && activeProfile === profile}
                onClick={() => onSelect(group.id, profile)}
                disabled={isLoading}
              >
                {profile}
              </SidebarButton>
            ))
          ) : (
            <SidebarEmpty>Профили не найдены</SidebarEmpty>
          )}
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
  background: #ffffff;
  border: 1px solid ${({ theme }) => theme.tokens.color.borderSubtle};
  border-radius: 10px;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.05);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 250px;
`;

const SidebarTitle = styled.h3`
  margin: 0 0 2px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 500;
  color: ${({ theme }) => theme.tokens.color.accentText};
`;

const SidebarButton = styled.button<{ $active?: boolean }>`
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

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.tokens.color.accentMuted};
    border-color: ${({ theme }) => theme.tokens.color.borderStrong};
    transform: translateX(1px);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
`;

const SidebarEmpty = styled.div`
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.tokens.color.textMuted};
`;
