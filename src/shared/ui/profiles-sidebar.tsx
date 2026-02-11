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
  gap: 12px;
  width: 250px;
`;

const Sidebar = styled.aside`
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 250px;
`;

const SidebarTitle = styled.h3`
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #111827;
`;

const SidebarButton = styled.button<{ $active?: boolean }>`
  padding: 8px 10px;
  text-align: left;
  border-radius: 8px;
  border: 1px solid ${({ $active }) => ($active ? "#2563eb" : "#e5e7eb")};
  background: ${({ $active }) => ($active ? "#eff6ff" : "#ffffff")};
  color: ${({ $active }) => ($active ? "#1d4ed8" : "#111827")};
  font-size: 13px;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
`;

const SidebarEmpty = styled.div`
  padding: 8px 12px;
  font-size: 13px;
  color: #6b7280;
`;
