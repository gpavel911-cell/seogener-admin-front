import styled, { keyframes } from "styled-components";

export const InlineHint = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.tokens.fontSize.sm};
  color: ${({ theme }) => theme.tokens.color.textMuted};
`;

export const CenteredState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  flex: 1;
`;

export const PlaceholderText = styled.div`
  color: ${({ theme }) => theme.tokens.color.textMuted};
  font-size: ${({ theme }) => theme.tokens.fontSize.md};
`;

type ResultLoaderProps = {
  label?: string;
};

export function ResultLoader({ label = "Загрузка..." }: ResultLoaderProps) {
  return (
    <LoaderSurface role="status" aria-live="polite" aria-label={label}>
      <LoaderGlow />
      <LoaderCore>
        <Spinner />
        <LoaderLabel>{label}</LoaderLabel>
      </LoaderCore>
    </LoaderSurface>
  );
}

const spin = keyframes`
  to {
    transform: rotate(360deg);
  }
`;

const pulse = keyframes`
  0% {
    opacity: 0.5;
    transform: scale(0.98);
  }
  50% {
    opacity: 0.9;
    transform: scale(1.01);
  }
  100% {
    opacity: 0.5;
    transform: scale(0.98);
  }
`;

const sheen = keyframes`
  0% {
    transform: translateX(-130%);
  }
  100% {
    transform: translateX(130%);
  }
`;

const LoaderSurface = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  border-radius: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const LoaderGlow = styled.div`
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    width: 42%;
    background: linear-gradient(90deg, transparent 0%, rgba(37, 99, 235, 0.14) 50%, transparent 100%);
    animation: ${sheen} 1.6s ease-in-out infinite;
  }
`;

const LoaderCore = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  animation: ${pulse} 1.8s ease-in-out infinite;
`;

const Spinner = styled.div`
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: 3px solid rgba(37, 99, 235, 0.2);
  border-top-color: rgba(37, 99, 235, 0.9);
  animation: ${spin} 0.9s linear infinite;
`;

const LoaderLabel = styled.div`
  font-size: 14px;
  color: #334155;
  font-weight: 500;
`;
