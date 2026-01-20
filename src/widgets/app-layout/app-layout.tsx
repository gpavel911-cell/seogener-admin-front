import { type ReactNode } from "react";
import styled from "styled-components";

import { Sidebar } from "@/widgets/sidebar/sidebar";

type AppLayoutProps = {
  children: ReactNode;
};

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <Layout>
      <Sidebar />
      <Main>{children}</Main>
    </Layout>
  );
}

const Layout = styled.div`
  display: flex;
  min-height: 100vh;
  background: #f6f7f9;
  color: #111827;
`;

const Main = styled.main`
  flex: 1;
  padding: 32px 40px;
`;
