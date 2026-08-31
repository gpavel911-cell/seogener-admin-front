"use client";

import type { ReactNode } from "react";
import { FaChevronRight } from "react-icons/fa";
import styled from "styled-components";

type Props = {
  number: number;
  title: string;
  subtitle?: string;
  open: boolean;
  done?: boolean;
  locked?: boolean;
  onToggle: () => void;
  children: ReactNode;
};

export function WizardAccordionSection({
  number,
  title,
  subtitle,
  open,
  done = false,
  locked = false,
  onToggle,
  children,
}: Props) {
  return (
    <Section $open={open} $locked={locked} $done={done}>
      <Head type="button" disabled={locked} onClick={onToggle}>
        <Number $active={open} $done={done}>
          {number}
        </Number>
        <Title>{title}</Title>
        {subtitle ? <Subtitle>{subtitle}</Subtitle> : null}
        <Chevron aria-hidden="true" $open={open}>
          <FaChevronRight />
        </Chevron>
      </Head>
      {open ? <Body>{children}</Body> : null}
    </Section>
  );
}

const Section = styled.div<{ $open: boolean; $locked: boolean; $done: boolean }>`
  border: 1px solid ${({ theme }) => theme.tokens.color.borderSubtle};
  border-radius: 10px;
  background: ${({ theme }) => theme.tokens.color.bgSurface};
  overflow: hidden;
  opacity: ${({ $locked }) => ($locked ? 0.55 : 1)};
`;

const Head = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 14px 18px;
  border: 0;
  background: transparent;
  color: ${({ theme }) => theme.tokens.color.textPrimary};
  cursor: pointer;
  text-align: left;

  &:disabled {
    cursor: not-allowed;
  }
`;

const Number = styled.span<{ $active: boolean; $done: boolean }>`
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 700;
  background: ${({ theme, $active, $done }) =>
    $done ? "#16a34a" : $active ? theme.tokens.color.accent : theme.tokens.color.accentMuted};
  color: ${({ theme, $active, $done }) => ($done || $active ? "#ffffff" : theme.tokens.color.textMuted)};
`;

const Title = styled.span`
  font-weight: 600;
  font-size: 14px;
`;

const Subtitle = styled.span`
  color: ${({ theme }) => theme.tokens.color.textMuted};
  font-size: 13px;
`;

const Chevron = styled.span<{ $open: boolean }>`
  margin-left: auto;
  color: ${({ theme }) => theme.tokens.color.textMuted};
  display: inline-flex;
  transform: rotate(${({ $open }) => ($open ? "90deg" : "0deg")});
  transition: transform 0.15s ease;
  font-size: 11px;
`;

const Body = styled.div`
  padding: 16px 18px 18px;
  border-top: 1px solid ${({ theme }) => theme.tokens.color.borderSubtle};
`;
