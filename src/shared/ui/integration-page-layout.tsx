import { type ReactNode } from "react";
import styled from "styled-components";
import { PageHeader } from "./page-header";
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
  actionSections?: SidebarSection[];
  activeAction?: string | null;
  onSelectAction?: (action: string) => void;
  tableActionId?: string;
  onSync: () => void;
  isSyncLoading: boolean;
  syncDisabled: boolean;
  showProfilesEmptyState: boolean;
  profilesEmptyMessage: string;
  showTableEmptyState: boolean;
  tableEmptyMessage: string;
  tableToolbarLeftSlot?: ReactNode;
  tableToolbarRightSlot?: ReactNode;
  tableContent: ReactNode;
  tableDetailsContent?: ReactNode;
  actionContent?: ReactNode;
  tableOnly?: boolean;
};

export const IntegrationPageLayout = <TProvider extends string>({
  title,
  profileGroups,
  activeGroup,
  activeProfile,
  isProfilesFetching,
  onSelectProfile,
  actionSections = [],
  activeAction = null,
  onSelectAction = () => undefined,
  tableActionId,
  onSync,
  isSyncLoading,
  syncDisabled,
  showProfilesEmptyState,
  profilesEmptyMessage,
  showTableEmptyState,
  tableEmptyMessage,
  tableToolbarLeftSlot,
  tableToolbarRightSlot,
  tableContent,
  tableDetailsContent,
  actionContent,
  tableOnly = false,
}: IntegrationPageLayoutProps<TProvider>) => {
  const showTable = tableOnly
    ? Boolean(activeProfile)
    : Boolean(activeProfile && activeAction === tableActionId);

  let mainContent: ReactNode;
  if (showTable) {
    mainContent = (
      <TableSection>
        <TableSyncPanel
          onSync={onSync}
          isLoading={isSyncLoading}
          disabled={syncDisabled}
          leftSlot={tableToolbarLeftSlot}
          rightSlot={tableToolbarRightSlot}
        />
        {showProfilesEmptyState ? (
          <SelectionState>{profilesEmptyMessage}</SelectionState>
        ) : showTableEmptyState ? (
          <SelectionState>{tableEmptyMessage}</SelectionState>
        ) : (
          tableContent
        )}
        {tableDetailsContent}
      </TableSection>
    );
  } else if (tableOnly) {
    mainContent = (
      <SelectionState>
        {showProfilesEmptyState ? profilesEmptyMessage : "Выберите профиль в верхнем сайдбаре."}
      </SelectionState>
    );
  } else if (activeProfile && !activeAction) {
    mainContent = <SelectionState>Выберите действие в нижнем сайдбаре.</SelectionState>;
  } else if (!activeProfile && activeAction) {
    mainContent = <SelectionState>Выберите профиль в верхнем сайдбаре.</SelectionState>;
  } else if (!activeProfile && !activeAction) {
    mainContent = <SelectionState>Выберите профиль и действие.</SelectionState>;
  } else {
    mainContent = <ActionBlock>{actionContent}</ActionBlock>;
  }

  return (
    <Wrapper>
      <PageHeader title={title} />
      <Body>
        <LeftColumn>
          <ProfilesSidebar
            groups={profileGroups}
            activeGroup={activeGroup}
            activeProfile={activeProfile}
            isLoading={isProfilesFetching}
            onSelect={onSelectProfile}
          />
          {!tableOnly ? (
            <ActionsSidebar
              sections={actionSections}
              activeAction={activeAction}
              onSelect={onSelectAction}
            />
          ) : null}
        </LeftColumn>
        <Main>{mainContent}</Main>
      </Body>
    </Wrapper>
  );
};

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
  min-height: 0;
  gap: 24px;
`;

const Body = styled.div`
  display: grid;
  grid-template-columns: 250px 1fr;
  grid-template-rows: minmax(0, 1fr);
  gap: 14px;
  align-items: stretch;
  flex: 1;
  height: 100%;
  min-height: 0;
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
  height: 100%;
  min-height: 0;
  min-width: 0;
`;

const ActionBlock = styled.section`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  gap: 12px;
`;

const TableSection = styled.section`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  gap: 16px;
`;

const EmptyState = styled.div`
  border: 1px solid ${({ theme }) => theme.tokens.color.borderSubtle};
  background: ${({ theme }) => theme.tokens.color.bgSurface};
  padding: 20px;
  border-radius: ${({ theme }) => theme.tokens.radius.md};
  font-size: 14px;
  color: ${({ theme }) => theme.tokens.color.textSecondary};
`;

const SelectionState = styled(EmptyState)`
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
`;
