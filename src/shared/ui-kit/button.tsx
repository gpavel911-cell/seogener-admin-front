import styled, { css } from "styled-components";

type ButtonVariant = "primary" | "secondary";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export const Button = styled.button<ButtonProps>`
  padding: 8px 14px;
  border-radius: ${({ theme }) => theme.tokens.radius.sm};
  font-size: ${({ theme }) => theme.tokens.fontSize.md};
  font-weight: 500;
  cursor: pointer;
  box-shadow: none !important;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;

  ${({ theme, variant = "secondary" }) =>
    variant === "primary"
      ? css`
          background: rgba(37, 99, 235, 0.14);
          border: 1px solid rgba(37, 99, 235, 0.35);
          color: ${theme.tokens.color.accentText};
        `
      : css`
          background: ${theme.tokens.color.bgSurface};
          border: 1px solid ${theme.tokens.color.borderStrong};
          color: ${theme.tokens.color.textPrimary};
        `}

  &:hover:not(:disabled) {
    ${({ theme, variant = "secondary" }) =>
      variant === "primary"
        ? css`
            background: rgba(37, 99, 235, 0.2);
            border-color: rgba(37, 99, 235, 0.48);
            color: ${theme.tokens.color.accentText};
          `
        : css`
            background: ${theme.tokens.color.bgSurface};
            border-color: ${theme.tokens.color.borderStrong};
            color: ${theme.tokens.color.textPrimary};
          `}
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.tokens.color.accent};
    outline-offset: 1px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
`;
