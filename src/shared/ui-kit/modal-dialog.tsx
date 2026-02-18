import type { ReactNode } from "react";
import * as RadixDialog from "@radix-ui/react-dialog";
import styled, { keyframes } from "styled-components";

const overlayFadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const overlayFadeOut = keyframes`
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
`;

const contentIn = keyframes`
  from {
    opacity: 0;
    transform: translate(-50%, calc(-50% + 8px)) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
`;

const contentOut = keyframes`
  from {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
  to {
    opacity: 0;
    transform: translate(-50%, calc(-50% + 4px)) scale(0.985);
  }
`;

type ModalDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function ModalDialog({ open, onOpenChange, title, actions, children }: ModalDialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <Overlay />
        <Content onOpenAutoFocus={(event) => event.preventDefault()}>
          <Header>
            <Title>{title}</Title>
            <HeaderActions>
              {actions}
              <RadixDialog.Close asChild>
                <CloseButton type="button" aria-label="Закрыть" />
              </RadixDialog.Close>
            </HeaderActions>
          </Header>
          <Body>{children}</Body>
        </Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

const Overlay = styled(RadixDialog.Overlay)`
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(15, 23, 42, 0.55);

  &[data-state="open"] {
    animation: ${overlayFadeIn} 150ms ease-out;
  }

  &[data-state="closed"] {
    animation: ${overlayFadeOut} 120ms ease-in;
  }
`;

const Content = styled(RadixDialog.Content)`
  position: fixed;
  z-index: 51;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: min(960px, calc(100vw - 48px));
  max-height: 85vh;
  overflow: auto;
  border-radius: 16px;
  padding: 0;
  background: #ffffff;
  box-shadow: 0 24px 48px rgba(15, 23, 42, 0.2);

  &[data-state="open"] {
    animation: ${contentIn} 180ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  &[data-state="closed"] {
    animation: ${contentOut} 120ms ease-in;
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 16px 20px 14px;
  border-bottom: 1px solid #e5edf8;
  background: linear-gradient(180deg, #fbfdff 0%, #f6f9ff 100%);
`;

const HeaderActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
`;

const CloseButton = styled.button`
  position: relative;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: 1px solid #dbe5f3;
  background: #f8fbff;
  cursor: pointer;
  transition:
    background-color 0.14s ease,
    border-color 0.14s ease,
    transform 0.14s ease;

  &::before,
  &::after {
    content: "";
    position: absolute;
    left: 50%;
    top: 50%;
    width: 12px;
    height: 1.8px;
    background: #334155;
    border-radius: 99px;
    transform-origin: center;
  }

  &::before {
    transform: translate(-50%, -50%) rotate(45deg);
  }

  &::after {
    transform: translate(-50%, -50%) rotate(-45deg);
  }

  &:hover {
    background: #edf5ff;
    border-color: #bfdbfe;
  }

  &:active {
    transform: scale(0.97);
  }
`;

const Body = styled.div`
  padding: 16px 20px 20px;
`;

const Title = styled(RadixDialog.Title)`
  margin: 0;
  font-size: 19px;
  line-height: 1.25;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: min(72ch, 100%);
`;
