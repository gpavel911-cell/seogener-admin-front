import { FaArrowsRotate } from "react-icons/fa6";
import type { ReactNode } from "react";
import styled, { keyframes } from "styled-components";
import { Button } from "./button";

type TableSyncPanelProps = {
  onSync: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  label?: string;
  leftSlot?: ReactNode;
  rightSlot?: ReactNode;
};

export function TableSyncPanel({
  onSync,
  isLoading = false,
  disabled = false,
  label = "Синхронизировать",
  leftSlot,
  rightSlot,
}: TableSyncPanelProps) {
  return (
    <Panel>
      <Slot>{leftSlot}</Slot>
      <CenterSlot>
        <SyncButton
          type="button"
          onClick={onSync}
          disabled={disabled || isLoading}
          aria-label={label}
          title={label}
          data-loading={isLoading}
        >
          <FaArrowsRotate aria-hidden="true" />
          <span>{label}</span>
        </SyncButton>
      </CenterSlot>
      <RightSlot aria-hidden={!rightSlot}>{rightSlot}</RightSlot>
    </Panel>
  );
}

const spin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const Panel = styled.div`
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #ffffff;
  padding: 12px;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 12px;
`;

const Slot = styled.div`
  min-width: 0;
  display: flex;
  align-items: center;
`;

const RightSlot = styled(Slot)`
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
`;

const CenterSlot = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
`;

const SyncButton = styled(Button).attrs({
  variant: "primary",
})`
  padding: 8px 12px;
  min-width: 160px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  line-height: 1;
  font-weight: 500;
  background: rgba(37, 99, 235, 0.14);
  border-color: rgba(37, 99, 235, 0.35);
  color: ${({ theme }) => theme.tokens.color.accentText};

  &:hover:not(:disabled) {
    background: rgba(37, 99, 235, 0.2);
    border-color: rgba(37, 99, 235, 0.48);
    color: ${({ theme }) => theme.tokens.color.accentText};
  }

  svg {
    width: 14px;
    height: 14px;
    flex: 0 0 auto;
  }

  &[data-loading="true"] svg {
    animation: ${spin} 0.9s linear infinite;
  }
`;
