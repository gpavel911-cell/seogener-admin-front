"use client";

import styled from "styled-components";
import { PageHeader } from "@shared/ui";
import type { ReactNode } from "react";

export enum ProjectsView {
  PROJECTS = "PROJECTS",
  SITES = "SITES",
}

type ProjectsShellProps = {
  activeView: ProjectsView;
  onSelectView: (view: ProjectsView) => void;
  children: ReactNode;
};

const SUB_NAV_ITEMS = [
  { id: ProjectsView.PROJECTS, label: "Проекты" },
  { id: ProjectsView.SITES, label: "Сайты" },
];

export function ProjectsShell({ activeView, onSelectView, children }: ProjectsShellProps) {
  return (
    <Root>
      <PageHeader title="Проекты" />
      <Body>
        <SubSidebar aria-label="Навигация по проектам">
          <SubList>
            {SUB_NAV_ITEMS.map((item) => {
              const isActive = activeView === item.id;
              return (
                <SubItem key={item.id}>
                  <SubButton
                    type="button"
                    $active={isActive}
                    aria-current={isActive ? "page" : undefined}
                    onClick={() => onSelectView(item.id)}
                  >
                    {item.label}
                  </SubButton>
                </SubItem>
              );
            })}
          </SubList>
        </SubSidebar>
        <Content>{children}</Content>
      </Body>
    </Root>
  );
}

const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
  min-height: 0;
`;

const Body = styled.div`
  display: grid;
  grid-template-columns: 250px minmax(0, 1fr);
  gap: 14px;
  align-items: start;
  flex: 1;
  min-height: 0;
`;

const SubSidebar = styled.nav`
  border: 1px solid #dbe5f3;
  border-radius: 14px;
  background: #ffffff;
  padding: 12px;
  height: fit-content;
  align-self: start;
  width: 250px;
`;

const SubList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const SubItem = styled.li`
  margin: 0;
`;

const SubButton = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 36px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid ${({ $active }) => ($active ? "rgba(37, 99, 235, 0.36)" : "transparent")};
  background: ${({ $active }) => ($active ? "rgba(37, 99, 235, 0.14)" : "transparent")};
  color: ${({ $active }) => ($active ? "#1d4ed8" : "#334155")};
  font-size: 14px;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  cursor: pointer;

  &:hover {
    background: rgba(37, 99, 235, 0.1);
    border-color: rgba(37, 99, 235, 0.28);
    color: #1d4ed8;
  }
`;

const Content = styled.section`
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
  min-width: 0;
`;
