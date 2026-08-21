import styled from "styled-components";
import { type ReactNode } from "react";
import { PageTitle } from "./page-title";

type PageHeaderProps = {
  title: string;
  actions?: ReactNode;
};

export function PageHeader({ title, actions }: PageHeaderProps) {
  return (
    <Header>
      <PageTitle>{title}</PageTitle>
      {actions ? <Actions>{actions}</Actions> : null}
    </Header>
  );
}

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 14px;
  border-radius: 14px;
  border: 1px solid ${({ theme }) => theme.tokens.color.borderSubtle};
  background: linear-gradient(180deg, #ffffff 0%, #f9fbff 100%);
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
`;
