import styled from "styled-components";
import { PageTitle } from "./page-title";

type PageHeaderProps = {
  title: string;
};

export function PageHeader({ title }: PageHeaderProps) {
  return (
    <Header>
      <PageTitle>{title}</PageTitle>
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
