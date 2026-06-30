import { type ReactNode, useCallback, useEffect, useRef } from "react";
import styled, { keyframes } from "styled-components";

import { useAppDispatch, useAppSelector } from "@shared/store";
import { clearToast, type ToastVariant, showToast } from "@shared/store/toast-slice";

export function ToastProvider({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const toasts = useAppSelector((state) => state.toast.toasts);
  const timersRef = useRef<Map<number, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    const timers = timersRef.current;

    toasts.forEach((toast) => {
      if (timers.has(toast.id)) return;
      const timer = setTimeout(() => {
        dispatch(clearToast(toast.id));
        timers.delete(toast.id);
      }, toast.durationMs);
      timers.set(toast.id, timer);
    });

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, [dispatch, toasts]);

  return (
    <>
      {children}
      {toasts.length > 0 && (
        <ToastContainer>
          {toasts.map((toast) => (
            <Toast key={toast.id} data-variant={toast.variant} $durationMs={toast.durationMs}>
              {toast.message}
            </Toast>
          ))}
        </ToastContainer>
      )}
    </>
  );
}

export const useToast = () => {
  const dispatch = useAppDispatch();
  const stableShowToast = useCallback(
    (args: { message: string; variant: ToastVariant; durationMs?: number }) => {
      dispatch(showToast(args));
    },
    [dispatch],
  );

  return {
    showToast: stableShowToast,
  };
};

const ToastContainer = styled.div`
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: flex-end;
`;

const toastLifecycle = keyframes`
  0% {
    opacity: 0;
    transform: translateY(8px);
  }
  12% {
    opacity: 1;
    transform: translateY(0);
  }
  80% {
    opacity: 1;
    transform: translateY(0);
  }
  100% {
    opacity: 0;
    transform: translateY(8px);
  }
`;

const Toast = styled.div<{ $durationMs: number }>`
  width: 400px;
  height: 100px;
  padding: 18px 24px;
  display: flex;
  align-items: center;
  border-radius: 10px;
  background: #ecfdf3;
  color: #027a48;
  font-size: 14px;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
  animation: ${toastLifecycle} ${({ $durationMs }) => $durationMs}ms ease-out forwards;

  &[data-variant="error"] {
    background: #fef3f2;
    color: #b42318;
  }
`;
