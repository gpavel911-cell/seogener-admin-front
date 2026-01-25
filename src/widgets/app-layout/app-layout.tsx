import { type ReactNode } from "react";
import styled from "styled-components";

import { Sidebar } from "@widgets/sidebar/sidebar";
import { TopBar } from "@widgets/top-bar/top-bar";

type AppLayoutProps = {
  children: ReactNode;
};

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <Layout>
      <TopBar />
      <Body>
        <Sidebar />
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
  background: #f6f7f9;
  color: #111827;
`;

const Body = styled.div`
  display: flex;
  flex: 1;
  min-height: 0;
`;

const Main = styled.main`
  flex: 1;
  padding: 32px 40px;
`;

const Content = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;
