"use client";

import { type ChangeEvent, useRef } from "react";
import { FaArrowDown, FaFileLines, FaXmark } from "react-icons/fa6";
import styled from "styled-components";
import { useToast } from "./toast";

const XLSX_NAME_PATTERN = /^[A-Za-z0-9._-]+\.xlsx$/;
const TEMPLATE_DOWNLOAD_ERROR = "Не удалось скачать шаблон.";

type ImportXlsxFieldProps = {
  templateFilename: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
};

function isXlsxBytes(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b;
}

export function ImportXlsxField({ templateFilename, file, onFileChange, disabled = false }: ImportXlsxFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
  const hasFile = Boolean(file);

  const failDownload = () => {
    showToast({ variant: "error", message: TEMPLATE_DOWNLOAD_ERROR });
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0];
    if (!nextFile) return;
    if (!nextFile.name.toLowerCase().endsWith(".xlsx")) {
      showToast({ variant: "error", message: "Поддерживаются только .xlsx файлы." });
      event.target.value = "";
      return;
    }
    onFileChange(nextFile);
    event.target.value = "";
  };

  const handleDownload = async () => {
    if (!XLSX_NAME_PATTERN.test(templateFilename)) {
      failDownload();
      return;
    }

    try {
      const response = await fetch(`/import-templates/${templateFilename}`);
      if (!response.ok) {
        failDownload();
        return;
      }

      const buffer = await response.arrayBuffer();
      if (!isXlsxBytes(new Uint8Array(buffer))) {
        failDownload();
        return;
      }

      const objectUrl = URL.createObjectURL(
        new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
      );
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = templateFilename;
      link.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      failDownload();
    }
  };

  return (
    <Field>
      <Header>
        <Label>Excel-файл</Label>
        <DownloadButton type="button" onClick={handleDownload}>
          <FaArrowDown aria-hidden="true" />
          Скачать шаблон
        </DownloadButton>
      </Header>
      <HiddenFileInput ref={fileInputRef} type="file" accept=".xlsx" onChange={handleFileChange} disabled={disabled} />
      <Well $filled={hasFile} $disabled={disabled}>
        <PickButton
          type="button"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
          aria-label={hasFile ? "Заменить Excel-файл" : "Выбрать Excel-файл"}
        >
          <Glyph $filled={hasFile} aria-hidden="true">
            <FaFileLines />
            <Ext>XLSX</Ext>
          </Glyph>
          <Copy>
            {hasFile ? (
              <>
                <FileName title={file?.name}>{file?.name}</FileName>
                <Hint>Нажмите, чтобы заменить файл</Hint>
              </>
            ) : (
              <>
                <Title>Выберите файл</Title>
                <Hint>Поддерживаемые форматы: .xlsx</Hint>
              </>
            )}
          </Copy>
        </PickButton>
        {hasFile ? (
          <RemoveButton type="button" disabled={disabled} aria-label="Убрать файл" onClick={() => onFileChange(null)}>
            <FaXmark aria-hidden="true" />
          </RemoveButton>
        ) : null}
      </Well>
    </Field>
  );
}

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

const Label = styled.span`
  font-size: ${({ theme }) => theme.tokens.fontSize.md};
  color: ${({ theme }) => theme.tokens.color.textSecondary};
`;

const DownloadButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: ${({ theme }) => theme.tokens.color.accentText};
  font-size: ${({ theme }) => theme.tokens.fontSize.sm};
  font-weight: 600;
  letter-spacing: 0.01em;
  cursor: pointer;

  svg {
    width: 11px;
    height: 11px;
  }

  &:hover {
    color: ${({ theme }) => theme.tokens.color.accent};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.tokens.color.accent};
    outline-offset: 3px;
    border-radius: ${({ theme }) => theme.tokens.radius.sm};
  }
`;

const HiddenFileInput = styled.input`
  display: none;
`;

const Well = styled.div<{ $filled: boolean; $disabled: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  min-height: 72px;
  padding: 6px 6px 6px 8px;
  border-radius: ${({ theme }) => theme.tokens.radius.md};
  border: 1px dashed ${({ theme, $filled }) => ($filled ? "rgba(37, 99, 235, 0.28)" : theme.tokens.color.borderStrong)};
  background: ${({ theme, $filled }) =>
    $filled
      ? "linear-gradient(180deg, rgba(37, 99, 235, 0.08) 0%, rgba(37, 99, 235, 0.03) 100%)"
      : theme.tokens.color.bgSurface};
  opacity: ${({ $disabled }) => ($disabled ? 0.6 : 1)};
  transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;

  ${({ theme, $filled, $disabled }) =>
    $disabled
      ? ""
      : `
    &:hover {
      border-color: rgba(37, 99, 235, 0.42);
      background: ${
        $filled
          ? "linear-gradient(180deg, rgba(37, 99, 235, 0.11) 0%, rgba(37, 99, 235, 0.05) 100%)"
          : "linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)"
      };
      box-shadow: ${theme.tokens.shadow.focus};
    }
  `}
`;

const PickButton = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 1;
  padding: 6px 8px;
  border: 0;
  border-radius: ${({ theme }) => theme.tokens.radius.sm};
  background: transparent;
  color: ${({ theme }) => theme.tokens.color.textPrimary};
  text-align: left;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.tokens.color.accent};
    outline-offset: 1px;
  }

  &:disabled {
    cursor: not-allowed;
  }
`;

const Glyph = styled.span<{ $filled: boolean }>`
  position: relative;
  display: grid;
  place-items: center;
  flex: 0 0 40px;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: ${({ $filled }) =>
    $filled ? "rgba(37, 99, 235, 0.14)" : "linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)"};
  color: ${({ theme, $filled }) => ($filled ? theme.tokens.color.accentText : theme.tokens.color.textMuted)};
  border: 1px solid ${({ $filled }) => ($filled ? "rgba(37, 99, 235, 0.18)" : "rgba(15, 23, 42, 0.06)")};

  svg {
    width: 16px;
    height: 16px;
    margin-top: -4px;
  }
`;

const Ext = styled.span`
  position: absolute;
  bottom: 5px;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.06em;
  line-height: 1;
`;

const Copy = styled.span`
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 3px;
`;

const Title = styled.span`
  font-size: ${({ theme }) => theme.tokens.fontSize.md};
  font-weight: 600;
  color: ${({ theme }) => theme.tokens.color.textPrimary};
`;

const FileName = styled.span`
  overflow: hidden;
  color: ${({ theme }) => theme.tokens.color.textPrimary};
  font-size: ${({ theme }) => theme.tokens.fontSize.md};
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Hint = styled.span`
  font-size: ${({ theme }) => theme.tokens.fontSize.sm};
  color: ${({ theme }) => theme.tokens.color.textMuted};
`;

const RemoveButton = styled.button`
  display: grid;
  place-items: center;
  flex: 0 0 28px;
  width: 28px;
  height: 28px;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: ${({ theme }) => theme.tokens.radius.pill};
  background: transparent;
  color: ${({ theme }) => theme.tokens.color.textMuted};
  cursor: pointer;

  svg {
    width: 12px;
    height: 12px;
  }

  &:hover:not(:disabled) {
    background: rgba(220, 38, 38, 0.08);
    color: ${({ theme }) => theme.tokens.color.danger};
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
