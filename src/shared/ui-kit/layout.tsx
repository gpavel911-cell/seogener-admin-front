import styled from "styled-components";

export const FormStack = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  gap: 16px;
`;

export const FormCard = styled.div`
  border: 1px solid ${({ theme }) => theme.tokens.color.borderSubtle};
  border-radius: ${({ theme }) => theme.tokens.radius.md};
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: ${({ theme }) => theme.tokens.color.bgSurface};
`;

export const ResultCard = styled(FormCard)`
  flex: 1;
  min-height: 0;
  min-height: 160px;
`;

export const FormRow = styled.div`
  display: flex;
  flex-wrap: nowrap;
  gap: 16px;
  align-items: flex-end;
  overflow-x: auto;
  padding-bottom: 4px;
`;

export const FormFields = styled.div`
  display: flex;
  flex-wrap: nowrap;
  gap: 12px;
  flex: 0 1 auto;
  align-items: flex-end;
  justify-content: flex-start;
`;

export const FormField = styled.label`
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 0 0 300px;
  width: 300px;
  min-width: 300px;
  max-width: 300px;
`;

export const FieldLabel = styled.span`
  font-size: ${({ theme }) => theme.tokens.fontSize.md};
  color: ${({ theme }) => theme.tokens.color.textSecondary};
`;

export const FormActions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-start;
  align-items: flex-end;
  flex: 0 0 auto;
`;
