"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { FaSyncAlt } from "react-icons/fa";
import styled, { css, keyframes } from "styled-components";
import { shouldShowSectionRecrawlButton } from "../lib/dashboard-action-visibility";
import { useGetDashboardDetailsQuery, useRecrawlDashboardUrlsMutation } from "@entities/dashboard/api";
import type {
  DashboardDetailSectionDto,
  DashboardDetailSectionKey,
  DashboardSelectiveRecrawlResponseDto,
} from "@entities/dashboard/types";
import {
  Button,
  PlaceholderText,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableWrapper,
  useToast,
} from "@shared/ui";
import { ModalDialog } from "@shared/ui-kit/modal-dialog";

const EMPTY_SECTION_MESSAGE = "Нет страниц в этой категории";
const UNAVAILABLE_PLACEHOLDER = "—";
const ACTIONABLE_SECTION_KEYS: DashboardDetailSectionKey[] = ["out-of-index", "not-in-search"];

type ApiError = { data?: { message?: string } };
type SelectionState = Record<DashboardDetailSectionKey, string[]>;

type DashboardDetailsModalContentProps = {
  siteId: number;
};

export function DashboardDetailsModalContent({ siteId }: DashboardDetailsModalContentProps) {
  const { showToast } = useToast();
  const [selection, setSelection] = useState<SelectionState>({
    "in-search": [],
    "recrawl-queue": [],
    "out-of-index": [],
    "not-in-search": [],
  });
  const [report, setReport] = useState<DashboardSelectiveRecrawlResponseDto | null>(null);
  const [activeUrls, setActiveUrls] = useState<string[]>([]);

  const { data: shell, isLoading, error } = useGetDashboardDetailsQuery(siteId);
  const [recrawlDashboardUrls, { isLoading: isRecrawling }] = useRecrawlDashboardUrlsMutation();

  const handleToggle = (sectionKey: DashboardDetailSectionKey, url: string, checked: boolean) => {
    setSelection((prev) => {
      const nextValues = checked ? [...prev[sectionKey], url] : prev[sectionKey].filter((value) => value !== url);
      return { ...prev, [sectionKey]: Array.from(new Set(nextValues)) };
    });
  };

  const handleToggleAll = (sectionKey: DashboardDetailSectionKey, urls: string[], checked: boolean) => {
    setSelection((prev) => {
      if (checked) {
        return {
          ...prev,
          [sectionKey]: Array.from(new Set([...prev[sectionKey], ...urls])),
        };
      }

      return {
        ...prev,
        [sectionKey]: prev[sectionKey].filter((value) => !urls.includes(value)),
      };
    });
  };

  const handleRecrawl = async (urls: string[]) => {
    if (urls.length === 0) {
      showToast({ variant: "error", message: "Выберите хотя бы один URL для переобхода." });
      return;
    }
    setActiveUrls(urls);
    try {
      const result = await recrawlDashboardUrls({ siteId, urls }).unwrap();
      setReport(result);
      setSelection((prev) => ({
        ...prev,
        "out-of-index": prev["out-of-index"].filter((value) => !urls.includes(value)),
        "not-in-search": prev["not-in-search"].filter((value) => !urls.includes(value)),
      }));
    } catch (error) {
      const message = (error as ApiError)?.data?.message ?? "Не удалось отправить URL на переобход.";
      showToast({ variant: "error", message });
    } finally {
      setActiveUrls([]);
    }
  };

  return (
    <Content>
      <TopBar>
        <QuotaCard>
          <QuotaLabel>Остаток суточной квоты</QuotaLabel>
          <QuotaValue>{report?.quotaRemainder ?? shell?.quotaRemainder ?? UNAVAILABLE_PLACEHOLDER}</QuotaValue>
        </QuotaCard>
      </TopBar>

      {isLoading ? (
        <PlaceholderCard>Загрузка деталей домена...</PlaceholderCard>
      ) : error || !shell ? (
        <PlaceholderCard>Не удалось загрузить данные домена.</PlaceholderCard>
      ) : (
        shell.sections.map((section) => {
          const isActionable = ACTIONABLE_SECTION_KEYS.includes(section.key);
          const selectedUrls = selection[section.key];
          return (
            <SectionCard key={section.key}>
              <SectionHeader>
                <SectionTitle>{formatSectionTitle(section)}</SectionTitle>
                {shouldShowSectionRecrawlButton(isActionable, selectedUrls.length) ? (
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => handleRecrawl(selectedUrls)}
                    disabled={isRecrawling}
                  >
                    {isRecrawling ? "Отправка..." : "Отправить выбранные"}
                  </Button>
                ) : null}
              </SectionHeader>
              <DashboardSection
                section={section}
                selectedUrls={selectedUrls}
                activeUrls={activeUrls}
                isRecrawling={isRecrawling}
                onToggle={handleToggle}
                onToggleAll={handleToggleAll}
                onRecrawlSingle={(url) => handleRecrawl([url])}
              />
            </SectionCard>
          );
        })
      )}
      <ModalDialog
        open={report !== null}
        onOpenChange={(open) => {
          if (!open) {
            setReport(null);
          }
        }}
        title="Результат переобхода"
        contentWidth="520px"
      >
        {report ? (
          <ReportContent>
            <ReportLine>Остаток квоты: {report.quotaRemainder ?? UNAVAILABLE_PLACEHOLDER}</ReportLine>
            {report.results.map((item) => (
              <ReportLine key={`${item.url}-${item.status}`}>
                {item.url}: {mapRecrawlStatus(item.status)}
              </ReportLine>
            ))}
          </ReportContent>
        ) : null}
      </ModalDialog>
    </Content>
  );
}

type DashboardSectionProps = {
  section: DashboardDetailSectionDto;
  selectedUrls: string[];
  activeUrls: string[];
  isRecrawling: boolean;
  onToggle: (sectionKey: DashboardDetailSectionKey, url: string, checked: boolean) => void;
  onToggleAll: (sectionKey: DashboardDetailSectionKey, urls: string[], checked: boolean) => void;
  onRecrawlSingle: (url: string) => void;
};

function DashboardSection({
  section,
  selectedUrls,
  activeUrls,
  isRecrawling,
  onToggle,
  onToggleAll,
  onRecrawlSingle,
}: DashboardSectionProps) {
  const selectedSet = useMemo(() => new Set(selectedUrls), [selectedUrls]);
  const activeSet = useMemo(() => new Set(activeUrls), [activeUrls]);
  const isActionable = ACTIONABLE_SECTION_KEYS.includes(section.key);

  if (section.failed) {
    return <SectionState>{section.message ?? "Не удалось загрузить раздел."}</SectionState>;
  }

  const rows = section.rows ?? [];
  const rowUrls = rows.map((row) => row.pageUrl);
  const allRowsSelected = isActionable && rows.length > 0 && rows.every((row) => selectedSet.has(row.pageUrl));
  const someRowsSelected = isActionable && rows.some((row) => selectedSet.has(row.pageUrl));
  if (rows.length === 0) {
    return <SectionState>{EMPTY_SECTION_MESSAGE}</SectionState>;
  }

  return (
    <TableWrapper>
      <SectionTable $selectable={isActionable}>
        <TableHead>
          <TableRow>
            {renderHeaderCells(
              section.key,
              isActionable ? (
                <HeaderCheckbox
                  ariaLabel={`Выбрать все страницы в разделе ${section.title}`}
                  checked={allRowsSelected}
                  indeterminate={someRowsSelected && !allRowsSelected}
                  disabled={isRecrawling}
                  onChange={(event) => onToggleAll(section.key, rowUrls, event.target.checked)}
                />
              ) : null,
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={`${section.key}-${row.pageUrl}`}>
              {isActionable ? (
                <TableCell>
                  <Checkbox
                    type="checkbox"
                    checked={selectedSet.has(row.pageUrl)}
                    disabled={isRecrawling}
                    onChange={(event) => onToggle(section.key, row.pageUrl, event.target.checked)}
                  />
                </TableCell>
              ) : null}
              <TableCell>{row.pageUrl}</TableCell>
              {section.key === "in-search" ? (
                <>
                  <TableCell>{formatDateTime(row.lastVisitedAt)}</TableCell>
                  <TableCell>{row.title ?? UNAVAILABLE_PLACEHOLDER}</TableCell>
                </>
              ) : null}
              {section.key === "recrawl-queue" ? (
                <>
                  <TableCell>{mapQueueStatus(row.status)}</TableCell>
                  <TableCell>{formatDateTime(row.addedAt)}</TableCell>
                </>
              ) : null}
              {section.key === "out-of-index" ? (
                <>
                  <TableCell>{row.reason ?? UNAVAILABLE_PLACEHOLDER}</TableCell>
                  <TableCell>{formatDateTime(row.eventDate)}</TableCell>
                </>
              ) : null}
              {isActionable ? (
                <TableCell>
                  <ActionsCell>
                    <IconButton
                      type="button"
                      onClick={() => onRecrawlSingle(row.pageUrl)}
                      disabled={isRecrawling && activeSet.has(row.pageUrl)}
                      data-tooltip="Переобход"
                      aria-label={`Переобход для ${row.pageUrl}`}
                    >
                      <RecrawlIcon $spinning={isRecrawling && activeSet.has(row.pageUrl)} />
                    </IconButton>
                  </ActionsCell>
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </SectionTable>
    </TableWrapper>
  );
}

function renderHeaderCells(sectionKey: DashboardDetailSectionKey, headerCheckbox?: React.ReactNode) {
  switch (sectionKey) {
    case "in-search":
      return (
        <>
          <TableHeaderCell>Страница</TableHeaderCell>
          <TableHeaderCell>Последнее посещение</TableHeaderCell>
          <TableHeaderCell>Заголовок</TableHeaderCell>
        </>
      );
    case "recrawl-queue":
      return (
        <>
          <TableHeaderCell>Страница</TableHeaderCell>
          <TableHeaderCell>Статус</TableHeaderCell>
          <TableHeaderCell>Добавлено</TableHeaderCell>
        </>
      );
    case "out-of-index":
      return (
        <>
          <TableHeaderCell>{headerCheckbox}</TableHeaderCell>
          <TableHeaderCell>Страница</TableHeaderCell>
          <TableHeaderCell>Причина</TableHeaderCell>
          <TableHeaderCell>Дата</TableHeaderCell>
          <TableHeaderCell>&nbsp;</TableHeaderCell>
        </>
      );
    case "not-in-search":
      return (
        <>
          <TableHeaderCell>{headerCheckbox}</TableHeaderCell>
          <TableHeaderCell>Страница</TableHeaderCell>
          <TableHeaderCell>&nbsp;</TableHeaderCell>
        </>
      );
  }
}

type HeaderCheckboxProps = {
  ariaLabel: string;
  checked: boolean;
  indeterminate: boolean;
  disabled: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

function HeaderCheckbox({ ariaLabel, checked, indeterminate, disabled, onChange }: HeaderCheckboxProps) {
  const checkboxRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <Checkbox
      ref={checkboxRef}
      type="checkbox"
      aria-label={ariaLabel}
      checked={checked}
      disabled={disabled}
      onChange={onChange}
    />
  );
}

const formatDateTime = (value?: string | null) => {
  if (!value) return UNAVAILABLE_PLACEHOLDER;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("ru-RU");
};

const mapQueueStatus = (value?: string | null) => {
  switch (value) {
    case "IN_PROGRESS":
      return "В обработке";
    case "DONE":
      return "Завершено";
    case "FAILED":
      return "Ошибка";
    default:
      return value ?? UNAVAILABLE_PLACEHOLDER;
  }
};

const mapRecrawlStatus = (value: DashboardSelectiveRecrawlResponseDto["results"][number]["status"]) => {
  switch (value) {
    case "queued":
      return "добавлен в очередь";
    case "already queued":
      return "уже в очереди";
    case "invalid":
      return "некорректный URL";
    case "quota blocked":
      return "не добавлен из-за квоты";
  }
};

const formatSectionTitle = (section: DashboardDetailSectionDto) => {
  const countLabel = section.failed ? UNAVAILABLE_PLACEHOLDER : section.rows.length.toLocaleString("ru-RU");
  return `${section.title} (${countLabel})`;
};

const Content = styled.section`
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
  min-width: 0;
`;

const TopBar = styled.div`
  display: flex;
  justify-content: flex-end;
  border: 1px solid #dbe5f3;
  border-radius: 14px;
  background: #ffffff;
  padding: 14px;
`;

const QuotaCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-end;
`;

const QuotaLabel = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
`;

const QuotaValue = styled.span`
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
`;

const SectionCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

const SectionTitle = styled.h2`
  margin: 0;
  font-size: 18px;
  color: #0f172a;
`;

const SectionState = styled(PlaceholderText)`
  border: 1px solid #dbe5f3;
  background: #ffffff;
  border-radius: 14px;
  padding: 24px;
`;

const PlaceholderCard = styled(PlaceholderText)`
  border: 1px solid #dbe5f3;
  background: #ffffff;
  border-radius: 14px;
  padding: 24px;
`;

const ActionsCell = styled.div`
  display: flex;
  justify-content: flex-end;
  width: 100%;
  align-items: center;
  gap: 8px;
`;

const SectionTable = styled(Table)<{ $selectable: boolean }>`
  ${({ $selectable }) =>
    $selectable
      ? css`
          ${TableHeaderCell}:nth-child(1),
          ${TableCell}:nth-child(1) {
            width: 48px;
            padding-left: 12px;
            padding-right: 8px;
            text-align: center;
          }
        `
      : ""}
`;

const Checkbox = styled.input`
  width: 16px;
  height: 16px;
  cursor: pointer;
  vertical-align: middle;
`;

const IconButton = styled(Button)`
  position: relative;
  width: 34px;
  height: 34px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  &::after {
    content: attr(data-tooltip);
    position: absolute;
    left: 50%;
    bottom: calc(100% + 8px);
    transform: translateX(-50%) translateY(4px);
    background: #0f172a;
    color: #f8fafc;
    font-size: 12px;
    line-height: 1;
    border-radius: 8px;
    padding: 6px 8px;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition:
      opacity 0.14s ease,
      transform 0.14s ease;
    z-index: 10;
  }

  &:hover::after,
  &:focus-visible::after {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
`;

const spin = keyframes`
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
`;

const RecrawlIcon = styled(FaSyncAlt)<{ $spinning: boolean }>`
  font-size: 14px;
  animation: ${({ $spinning }) =>
    $spinning
      ? css`
          ${spin} 0.9s linear infinite
        `
      : "none"};
`;

const ReportContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const ReportLine = styled.div`
  font-size: 14px;
  color: #334155;
`;
