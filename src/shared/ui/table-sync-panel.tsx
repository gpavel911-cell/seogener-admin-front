import { FaSyncAlt } from "react-icons/fa";
import styled, { keyframes } from "styled-components";
import { Button } from "./button";

type TableSyncPanelProps = {
  onSync: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  label?: string;
};

export function TableSyncPanel({
  onSync,
  isLoading = false,
  disabled = false,
  label = "Синхронизировать",
}: TableSyncPanelProps) {
  return (
    <Panel>
      <SyncButton
        type="button"
        onClick={onSync}
        disabled={disabled || isLoading}
        aria-label={label}
        title={label}
        data-loading={isLoading}
      >
        <FaSyncAlt aria-hidden="true" />
        <span>{label}</span>
      </SyncButton>
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
  display: flex;
  justify-content: center;
  align-items: center;
`;

const SyncButton = styled(Button)`
  padding: 8px 12px;
  min-width: 160px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  line-height: 1;
  font-weight: 500;

  svg {
    width: 16px;
    height: 16px;
    flex: 0 0 auto;
  }

  &[data-loading="true"] svg {
    animation: ${spin} 0.9s linear infinite;
  }
`;
