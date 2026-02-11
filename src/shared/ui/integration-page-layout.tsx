import { type ReactNode } from "react";
import styled from "styled-components";
import { PageTitle } from "./page-title";
import { ProfilesSidebar, type ProfileSidebarGroup } from "./profiles-sidebar";
import { ActionsSidebar, type SidebarSection } from "./actions-sidebar";
import { TableSyncPanel } from "./table-sync-panel";

type IntegrationPageLayoutProps<TProvider extends string> = {
  title: string;
  profileGroups: ProfileSidebarGroup<TProvider>[];
  activeGroup: TProvider | null;
  activeProfile: string | null;
  isProfilesFetching: boolean;
  onSelectProfile: (group: TProvider, profile: string) => void;
  actionSections: SidebarSection[];
  activeAction: string | null;
  onSelectAction: (action: string) => void;
  tableActionId: string;
  onSync: () => void;
  isSyncLoading: boolean;
  syncDisabled: boolean;
  showProfilesEmptyState: boolean;
  profilesEmptyMessage: string;
  showTableEmptyState: boolean;
  tableEmptyMessage: string;
  tableContent: ReactNode;
  tableDetailsContent?: ReactNode;
  actionContent: ReactNode;
};

export const IntegrationPageLayout = <TProvider extends string>({
  title,
  profileGroups,
  activeGroup,
  activeProfile,
  isProfilesFetching,
  onSelectProfile,
  actionSections,
  activeAction,
  onSelectAction,
  tableActionId,
  onSync,
  isSyncLoading,
  syncDisabled,
  showProfilesEmptyState,
  profilesEmptyMessage,
  showTableEmptyState,
  tableEmptyMessage,
  tableContent,
  tableDetailsContent,
  actionContent,
}: IntegrationPageLayoutProps<TProvider>) => {
  return (
    <Wrapper>
      <Header>
        <PageTitle>{title}</PageTitle>
      </Header>
      <Body>
        <LeftColumn>
          <ProfilesSidebar
            groups={profileGroups}
            activeGroup={activeGroup}
            activeProfile={activeProfile}
            isLoading={isProfilesFetching}
            onSelect={onSelectProfile}
          />
          <ActionsSidebar
            sections={actionSections}
            activeAction={activeAction}
            onSelect={onSelectAction}
          />
        </LeftColumn>
        <Main>
          {activeProfile && !activeAction ? (
            <SelectionState>Выберите действие в нижнем сайдбаре.</SelectionState>
          ) : !activeProfile && activeAction ? (
            <SelectionState>Выберите профиль в верхнем сайдбаре.</SelectionState>
          ) : !activeProfile && !activeAction ? (
            <SelectionState>Выберите профиль и действие.</SelectionState>
          ) : activeAction === tableActionId ? (
            <TableSection>
              <TableSyncPanel
                onSync={onSync}
                isLoading={isSyncLoading}
                disabled={syncDisabled}
              />
              {showProfilesEmptyState ? (
                <EmptyState>{profilesEmptyMessage}</EmptyState>
              ) : showTableEmptyState ? (
                <EmptyState>{tableEmptyMessage}</EmptyState>
              ) : (
                tableContent
              )}
              {tableDetailsContent}
            </TableSection>
          ) : (
            <ActionBlock>{actionContent}</ActionBlock>
          )}
        </Main>
      </Body>
    </Wrapper>
  );
};

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
`;

const Body = styled.div`
  display: grid;
  grid-template-columns: 250px 1fr;
  gap: 16px;
  align-items: flex-start;
`;

const LeftColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 250px;
`;

const Main = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const ActionBlock = styled.section`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const TableSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const EmptyState = styled.div`
  border: 1px dashed #d1d5db;
  background: #f9fafb;
  padding: 20px;
  border-radius: 12px;
  font-size: 14px;
  color: #4b5563;
`;

const SelectionState = styled(EmptyState)`
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
`;
