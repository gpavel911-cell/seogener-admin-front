import { type ReactNode, useState } from "react";
import styled from "styled-components";

import { Sidebar } from "@widgets/sidebar/sidebar";
import { TopBar } from "@widgets/top-bar/top-bar";

type AppLayoutProps = {
  children: ReactNode;
};

export function AppLayout({ children }: AppLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <Layout>
      <TopBar />
      <Body>
        <Sidebar collapsed={isSidebarCollapsed} onToggle={() => setIsSidebarCollapsed((prev) => !prev)} />
        <Main>
          <Content>{children}</Content>
        </Main>
      </Body>
    </Layout>
  );
}

const Layout = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: #ffffff;
  color: ${({ theme }) => theme.tokens.color.textPrimary};
`;

const Body = styled.div`
  display: flex;
  flex: 1;
  min-height: 0;
  gap: 12px;
  align-items: stretch;
  background: #ffffff;
`;

const Main = styled.main`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  margin: 12px 16px 16px 0;
  padding: 24px 28px;
  border: 1px solid ${({ theme }) => theme.tokens.color.borderSubtle};
  border-radius: 16px;
  background: linear-gradient(180deg, #f2f8ff 0%, #e4efff 100%);
  box-shadow: none;
`;

const Content = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  gap: 20px;
  min-width: 0;
`;
