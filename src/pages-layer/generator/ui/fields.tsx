"use client";

import { useRef, type ReactNode } from "react";
import { FaInfoCircle } from "react-icons/fa";
import styled, { css } from "styled-components";
import { Button } from "@shared/ui";

const WizardField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  width: 100%;
`;

export const ConstrainedField = styled(WizardField)`
  width: 500px;
  max-width: 100%;
  align-self: flex-start;
  flex: 0 0 auto;
`;

export const FieldRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: flex-start;
`;

const WizardLabel = styled.span`
  font-size: ${({ theme }) => theme.tokens.fontSize.md};
  color: ${({ theme }) => theme.tokens.color.textSecondary};
`;

const LabelRow = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
`;

const RequiredMark = styled.span`
  color: ${({ theme }) => theme.tokens.color.danger};
  margin-left: 2px;
`;

const HintIcon = styled.span`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.tokens.color.textMuted};
  cursor: help;
  flex-shrink: 0;

  &::after {
    content: attr(data-tooltip);
    position: absolute;
    left: 50%;
    bottom: calc(100% + 8px);
    transform: translateX(-50%) translateY(4px);
    background: #0f172a;
    color: #f8fafc;
    font-size: 12px;
    line-height: 1.35;
    border-radius: 8px;
    padding: 8px 10px;
    width: max-content;
    max-width: 360px;
    white-space: normal;
    text-align: left;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.14s ease, transform 0.14s ease;
    z-index: 20;
  }

  &:hover::after,
  &:focus-visible::after {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
`;

type WizardFieldLabelProps = {
  children: ReactNode;
  required?: boolean;
  tooltip?: string;
};

export function WizardFieldLabel({ children, required, tooltip }: WizardFieldLabelProps) {
  return (
    <LabelRow>
      <WizardLabel>
        {children}
        {required ? <RequiredMark aria-hidden="true">*</RequiredMark> : null}
      </WizardLabel>
      {tooltip ? (
        <HintIcon tabIndex={0} data-tooltip={tooltip} aria-label={tooltip}>
          <FaInfoCircle aria-hidden="true" />
        </HintIcon>
      ) : null}
    </LabelRow>
  );
}

const controlStyles = css`
  border: 1px solid ${({ theme }) => theme.tokens.color.borderStrong};
  border-radius: ${({ theme }) => theme.tokens.radius.sm};
  padding: 8px 12px;
  font-size: ${({ theme }) => theme.tokens.fontSize.md};
  font-family: inherit;
  width: 100%;
  background: ${({ theme }) => theme.tokens.color.bgSurface};
  color: ${({ theme }) => theme.tokens.color.textPrimary};

  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.tokens.shadow.focus};
    border-color: ${({ theme }) => theme.tokens.color.accent};
  }
`;

export const WizardInput = styled.input`
  ${controlStyles}

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export const WizardTextArea = styled.textarea`
  ${controlStyles}
  min-height: 88px;
  resize: vertical;
`;

export const WizardHint = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.tokens.fontSize.sm};
  color: ${({ theme }) => theme.tokens.color.textMuted};
`;

export const WizardActions = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
`;

const StepCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  border: 1px solid ${({ theme }) => theme.tokens.color.borderSubtle};
  border-radius: ${({ theme }) => theme.tokens.radius.md};
  background: ${({ theme }) => theme.tokens.color.bgSurface};
`;

export const FormSection = StepCard;

export const FormSectionTitle = styled.h3`
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: ${({ theme }) => theme.tokens.color.textPrimary};
`;

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
`;

type FormSectionHeadingProps = {
  children: ReactNode;
  tooltip?: string;
};

export function FormSectionHeading({ children, tooltip }: FormSectionHeadingProps) {
  return (
    <TitleRow>
      <FormSectionTitle>{children}</FormSectionTitle>
      {tooltip ? (
        <HintIcon tabIndex={0} data-tooltip={tooltip} aria-label={tooltip}>
          <FaInfoCircle aria-hidden="true" />
        </HintIcon>
      ) : null}
    </TitleRow>
  );
}

export const StepStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const HiddenFileInput = styled.input`
  display: none;
`;

const FilePickerRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 34px;
`;

const FileHint = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.tokens.color.textSecondary};
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

type WizardFilePickerProps = {
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  buttonLabel: string;
  fileNames?: string;
  hideFileHint?: boolean;
  action?: ReactNode;
  onFiles: (files: File[]) => void;
};

export function WizardFilePicker({
  accept = ".csv",
  multiple = false,
  disabled,
  buttonLabel,
  fileNames,
  hideFileHint = false,
  action,
  onFiles,
}: WizardFilePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <HiddenFileInput
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={(event) => {
          const files = event.target.files ? Array.from(event.target.files) : [];
          onFiles(files);
          event.target.value = "";
        }}
      />
      <FilePickerRow>
        <Button type="button" onClick={() => inputRef.current?.click()} disabled={disabled}>
          {buttonLabel}
        </Button>
        {hideFileHint ? null : <FileHint>{fileNames?.trim() ? fileNames : "Файл не выбран"}</FileHint>}
        {action}
      </FilePickerRow>
    </>
  );
}
