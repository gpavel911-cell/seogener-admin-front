import styled from "styled-components";
import { StyledInput } from "@shared/ui-kit";

type DomainSearchFieldProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
};

export function DomainSearchField({ id, value, onChange }: DomainSearchFieldProps) {
  return (
    <SearchField>
      <SearchLabel htmlFor={id}>Поиск по домену</SearchLabel>
      <SearchInput
        id={id}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        placeholder="Введите домен"
      />
    </SearchField>
  );
}

const SearchField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: min(320px, 100%);
`;

const SearchLabel = styled.label`
  font-size: 12px;
  color: ${({ theme }) => theme.tokens.color.textSecondary};
`;

const SearchInput = styled(StyledInput)`
  width: 100%;
`;
