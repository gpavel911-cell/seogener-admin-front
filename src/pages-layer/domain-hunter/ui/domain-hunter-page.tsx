"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { FaDownload, FaInfoCircle, FaPlay, FaStop, FaTable } from "react-icons/fa";
import styled from "styled-components";
import {
  useDownloadDomainHunterCsvMutation,
  useGetDomainHunterLogQuery,
  useGetDomainHunterResultTableQuery,
  useGetDomainHunterResultsQuery,
  useGetDomainHunterStatusQuery,
  useStartDomainHunterRunMutation,
  useStopDomainHunterRunMutation,
} from "@entities/domain-hunter/api";
import {
  Button,
  EMPTY_DATA_MESSAGE,
  FormCard,
  PageHeader,
  PlaceholderText,
  ResultLoader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableWrapper,
  TextInput,
  useToast,
} from "@shared/ui";
import { StyledInput } from "@shared/ui-kit";
import { PaginationControls } from "@shared/ui/pagination-controls";
import { ModalDialog } from "@shared/ui-kit/modal-dialog";
import { usePagination } from "@shared/lib/use-pagination";
import { apiErrorMessage } from "../lib/api-error";

const POLL_MS = 2500;
const LOG_LINES = 80;

type SortState = {
  column: string;
  direction: "desc" | "asc";
};

export function DomainHunterPage() {
  const { showToast } = useToast();
  const [niche, setNiche] = useState("");
  const [tlds, setTlds] = useState("com");
  const [keywords, setKeywords] = useState("");
  const [maxResults, setMaxResults] = useState(20);
  const [formError, setFormError] = useState<string | null>(null);
  const [openFilename, setOpenFilename] = useState<string | null>(null);
  const [sort, setSort] = useState<SortState | null>(null);
  const wasRunning = useRef(false);

  const toastedStatusError = useRef(false);

  const { page, pageSize, pageSizeOptions, setPage, setPageSize } = usePagination();
  const { data: status, error: statusError } = useGetDomainHunterStatusQuery(undefined, {
    pollingInterval: POLL_MS,
  });
  const running = Boolean(status?.running);
  const { data: log } = useGetDomainHunterLogQuery(
    { lines: LOG_LINES },
    { skip: !running, pollingInterval: running ? POLL_MS : 0 },
  );
  const { data: results, isLoading: resultsLoading, error: resultsError, refetch: refetchResults } =
    useGetDomainHunterResultsQuery({ pageNumber: page, pageSize });
  const { data: table, isFetching: tableLoading, error: tableError } = useGetDomainHunterResultTableQuery(
    openFilename ?? "",
    { skip: !openFilename },
  );
  const [startRun, { isLoading: isStarting }] = useStartDomainHunterRunMutation();
  const [stopRun, { isLoading: isStopping }] = useStopDomainHunterRunMutation();
  const [downloadCsv, { isLoading: isDownloading }] = useDownloadDomainHunterCsvMutation();

  useEffect(() => {
    if (!statusError) {
      toastedStatusError.current = false;
      return;
    }
    if (toastedStatusError.current) {
      return;
    }
    toastedStatusError.current = true;
    showToast({ variant: "error", message: apiErrorMessage(statusError, "Сервис подбора доменов недоступен. Повторите попытку позже.") });
  }, [showToast, statusError]);

  useEffect(() => {
    if (resultsError) {
      showToast({ variant: "error", message: apiErrorMessage(resultsError, "Не удалось загрузить результаты.") });
    }
  }, [resultsError, showToast]);

  useEffect(() => {
    if (wasRunning.current && !running) {
      refetchResults();
    }
    wasRunning.current = running;
  }, [refetchResults, running]);

  const completionAlert = !running ? status?.error?.trim() || null : null;

  const rows = results?.content ?? [];
  const totalPages = results?.totalPages ?? 0;

  const sortedRows = useMemo(() => {
    const source = table?.rows ?? [];
    if (!sort) {
      return source;
    }
    const copy = [...source];
    copy.sort((left, right) => compareValues(left[sort.column], right[sort.column], sort.direction));
    return copy;
  }, [sort, table?.rows]);

  const handleStart = async () => {
    setFormError(null);
    if (!niche.trim()) {
      setFormError("Укажите название ниши");
      return;
    }
    if (!keywords.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).length) {
      setFormError("Добавьте хотя бы одно ключевое слово");
      return;
    }
    try {
      await startRun({
        niche: niche.trim(),
        tlds: tlds.trim() || "com",
        keywords,
        maxResults: Number.isFinite(maxResults) && maxResults >= 1 ? maxResults : 20,
      }).unwrap();
    } catch (error) {
      setFormError(apiErrorMessage(error, "Не удалось запустить поиск."));
    }
  };

  const handleStop = async () => {
    try {
      await stopRun().unwrap();
    } catch (error) {
      showToast({ variant: "error", message: apiErrorMessage(error, "Не удалось остановить поиск.") });
    }
  };

  const handleDownload = async (filename: string) => {
    try {
      const url = await downloadCsv(filename).unwrap();
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      showToast({ variant: "error", message: apiErrorMessage(error, "Не удалось скачать CSV.") });
    }
  };

  const handleHeaderClick = (column: string) => {
    setSort((current) => {
      if (!current || current.column !== column) {
        return { column, direction: "desc" };
      }
      return { column, direction: current.direction === "desc" ? "asc" : "desc" };
    });
  };

  return (
    <Page>
      <PageHeader title="Подбор доменов" />
      <FormCard>
        <SectionTitle>Поиск доменов</SectionTitle>
        <FieldGrid>
          <Field>
            <FieldLabelRow>
              <span>Название ниши</span>
              <HintIcon tabIndex={0} data-tooltip="Будет именем файла результата" aria-label="Будет именем файла результата">
                <FaInfoCircle aria-hidden="true" />
              </HintIcon>
            </FieldLabelRow>
            <TextInput value={niche} onChange={(event) => setNiche(event.target.value)} disabled={running} />
          </Field>
          <Field>
            <FieldLabelRow>
              <span>TLD</span>
              <HintIcon tabIndex={0} data-tooltip="через запятую" aria-label="через запятую">
                <FaInfoCircle aria-hidden="true" />
              </HintIcon>
            </FieldLabelRow>
            <TextInput value={tlds} onChange={(event) => setTlds(event.target.value)} disabled={running} />
          </Field>
        </FieldGrid>
        <Field>
          <FieldLabelRow>
            <span>
              Ключевые слова <RequiredMark aria-hidden="true">*</RequiredMark>
            </span>
          </FieldLabelRow>
          <KeywordsArea
            value={keywords}
            onChange={(event) => setKeywords(event.target.value)}
            disabled={running}
            rows={6}
            placeholder={"vpn\nvpn review"}
          />
        </Field>
        <ActionsRow>
          <Field $narrow>
            <FieldLabelRow>
              <span>Макс. результатов</span>
            </FieldLabelRow>
            <StyledInput
              type="number"
              min={1}
              max={1000}
              value={String(maxResults)}
              onChange={(event) => setMaxResults(Number(event.target.value) || 0)}
              disabled={running}
            />
          </Field>
          {running ? (
            <Button type="button" onClick={handleStop} disabled={isStopping}>
              <FaStop aria-hidden="true" /> Стоп
            </Button>
          ) : (
            <Button type="button" variant="primary" onClick={handleStart} disabled={isStarting}>
              <FaPlay aria-hidden="true" /> Запустить поиск
            </Button>
          )}
        </ActionsRow>
        {formError ? <ErrorText>{formError}</ErrorText> : null}
      </FormCard>

      <FormCard>
        <StatusRow>
          <Badge $running={running}>{running ? "running" : "idle"}</Badge>
          <StatusText>
            {running && status?.niche ? `Идёт поиск: ${status.niche}` : "Готов к запуску"}
          </StatusText>
        </StatusRow>
        {completionAlert ? <Alert>{completionAlert}</Alert> : null}
        <LogBox>{log?.text || (running ? "…" : "Ожидание...")}</LogBox>
      </FormCard>

      <FormCard>
        <SectionTitle>Последние результаты</SectionTitle>
        {resultsLoading ? (
          <ResultLoader label="Загрузка результатов..." />
        ) : rows.length === 0 ? (
          <EmptyState>{EMPTY_DATA_MESSAGE}</EmptyState>
        ) : (
          <TableWrapper>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Наименование файла</TableHeaderCell>
                  <TableHeaderCell> </TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.filename}>
                    <TableCell>{row.filename}</TableCell>
                    <TableCell>
                      <IconActions>
                        <IconButton
                          type="button"
                          aria-label="Открыть"
                          title="Открыть"
                          onClick={() => {
                            setSort(null);
                            setOpenFilename(row.filename);
                          }}
                        >
                          <FaTable aria-hidden="true" />
                        </IconButton>
                        <IconButton
                          type="button"
                          aria-label="Скачать CSV"
                          title="Скачать CSV"
                          disabled={isDownloading}
                          onClick={() => handleDownload(row.filename)}
                        >
                          <FaDownload aria-hidden="true" />
                        </IconButton>
                      </IconActions>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableWrapper>
        )}
        {totalPages > 1 || pageSize !== 15 ? (
          <PaginationControls
            page={page}
            totalPages={totalPages}
            pageSize={pageSize}
            pageSizeOptions={pageSizeOptions}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        ) : null}
      </FormCard>

      <ModalDialog
        open={Boolean(openFilename)}
        onOpenChange={(open) => {
          if (!open) {
            setOpenFilename(null);
            setSort(null);
          }
        }}
        title={openFilename ?? ""}
        contentWidth="min(1100px, 92vw)"
      >
        {tableError ? (
          <PlaceholderText>{apiErrorMessage(tableError, "Не удалось открыть файл.")}</PlaceholderText>
        ) : tableLoading || !table ? (
          <ResultLoader label="Загрузка таблицы..." />
        ) : table.columns.length === 0 ? (
          <EmptyState>{EMPTY_DATA_MESSAGE}</EmptyState>
        ) : (
          <TableWrapper>
            <ResultTable>
              <TableHead>
                <TableRow>
                  {table.columns.map((column) => (
                    <TableHeaderCell key={column}>
                      <SortableHeader type="button" onClick={() => handleHeaderClick(column)}>
                        {column}
                        {sort?.column === column ? (sort.direction === "desc" ? " ↓" : " ↑") : ""}
                      </SortableHeader>
                    </TableHeaderCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedRows.map((row, index) => (
                  <TableRow key={index}>
                    {table.columns.map((column) => (
                      <TableCell key={column}>{formatCell(row[column])}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </ResultTable>
          </TableWrapper>
        )}
      </ModalDialog>
    </Page>
  );
}

function compareValues(
  left: string | number | boolean | null,
  right: string | number | boolean | null,
  direction: "asc" | "desc",
): number {
  const factor = direction === "desc" ? -1 : 1;
  if (left == null && right == null) {
    return 0;
  }
  if (left == null) {
    return 1;
  }
  if (right == null) {
    return -1;
  }
  if (typeof left === "number" && typeof right === "number") {
    return (left - right) * factor;
  }
  return String(left).localeCompare(String(right), "ru", { numeric: true }) * factor;
}

function formatCell(value: string | number | boolean | null): ReactNode {
  if (value == null) {
    return "";
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  return String(value);
}

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const SectionTitle = styled.h2`
  margin: 0;
  font-size: ${({ theme }) => theme.tokens.fontSize.lg};
  font-weight: 600;
`;

const FieldGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
`;

const Field = styled.label<{ $narrow?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  ${({ $narrow }) => ($narrow ? "max-width: 200px;" : "")}
`;

const FieldLabelRow = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: ${({ theme }) => theme.tokens.fontSize.md};
  color: ${({ theme }) => theme.tokens.color.textSecondary};
`;

const RequiredMark = styled.span`
  color: ${({ theme }) => theme.tokens.color.danger};
`;

const HintIcon = styled.span`
  position: relative;
  display: inline-flex;
  color: ${({ theme }) => theme.tokens.color.textMuted};
  cursor: help;

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

const KeywordsArea = styled.textarea`
  border: 1px solid ${({ theme }) => theme.tokens.color.borderStrong};
  border-radius: ${({ theme }) => theme.tokens.radius.sm};
  padding: 8px 12px;
  font-size: ${({ theme }) => theme.tokens.fontSize.md};
  font-family: inherit;
  width: 100%;
  resize: vertical;
  background: ${({ theme }) => theme.tokens.color.bgSurface};
  color: ${({ theme }) => theme.tokens.color.textPrimary};
`;

const ActionsRow = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 16px;
`;

const ErrorText = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.tokens.color.danger};
`;

const StatusRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const Badge = styled.span<{ $running: boolean }>`
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
  background: ${({ $running }) => ($running ? "rgba(37, 99, 235, 0.14)" : "#eef2f7")};
  color: ${({ $running, theme }) => ($running ? theme.tokens.color.accentText : theme.tokens.color.textSecondary)};
`;

const StatusText = styled.span`
  color: ${({ theme }) => theme.tokens.color.textPrimary};
`;

const Alert = styled.div`
  border: 1px solid ${({ theme }) => theme.tokens.color.danger};
  background: #fef2f2;
  color: ${({ theme }) => theme.tokens.color.danger};
  border-radius: ${({ theme }) => theme.tokens.radius.sm};
  padding: 8px 12px;
`;

const LogBox = styled.pre`
  margin: 0;
  min-height: 180px;
  max-height: 320px;
  overflow: auto;
  padding: 12px;
  border-radius: ${({ theme }) => theme.tokens.radius.sm};
  background: #0f172a;
  color: #e2e8f0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 12px;
  white-space: pre-wrap;
`;

const EmptyState = styled.div`
  padding: 24px;
  text-align: center;
  color: ${({ theme }) => theme.tokens.color.textMuted};
`;

const IconActions = styled.div`
  display: flex;
  gap: 8px;
`;

const IconButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid ${({ theme }) => theme.tokens.color.borderStrong};
  border-radius: ${({ theme }) => theme.tokens.radius.sm};
  background: ${({ theme }) => theme.tokens.color.bgSurface};
  color: ${({ theme }) => theme.tokens.color.textPrimary};
  cursor: pointer;
`;

const ResultTable = styled(Table)`
  width: max-content;
  min-width: 100%;
`;

const SortableHeader = styled.button`
  display: inline-flex;
  align-items: center;
  width: 100%;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
`;
