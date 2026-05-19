"use client";

import { useMemo, useState } from "react";
import styled from "styled-components";
import { useSyncTopvisorPositionsMutation } from "@entities/topvisor/api";
import type { TopvisorPositionRowDto } from "@entities/topvisor/types";
import {
  CenteredState,
  EMPTY_DATA_MESSAGE,
  PageHeader,
  PlaceholderText,
  ResultLoader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableSyncPanel,
  TableWrapper,
  useToast,
} from "@shared/ui";

export function TopvisorPage() {
  const { showToast } = useToast();
  const [syncTopvisorPositions, { isLoading }] = useSyncTopvisorPositionsMutation();
  const [rows, setRows] = useState<TopvisorPositionRowDto[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasSynced, setHasSynced] = useState(false);
  const [domainFilter, setDomainFilter] = useState("");

  const visibleRows = useMemo(
    () => {
      const normalizedFilter = domainFilter.trim().toLowerCase();
      return rows
        .filter((row) => !normalizedFilter || row.domain.toLowerCase().includes(normalizedFilter))
        .sort((left, right) => {
          if (left.projectId !== right.projectId) {
            return right.projectId - left.projectId;
          }
          return left.domain.localeCompare(right.domain, "ru");
        });
    },
    [domainFilter, rows],
  );

  const handleSync = async () => {
    setHasSynced(true);
    setErrorMessage(null);
    try {
      const result = await syncTopvisorPositions().unwrap();
      setRows(result.rows ?? []);
      setWarnings(result.warnings ?? []);
      if (result.status === "PARTIAL") {
        showToast({ variant: "error", message: "Данные получены частично. Проверьте предупреждения." });
        return;
      }
      if (result.status === "EMPTY") {
        showToast({ variant: "success", message: "Данные обновлены: результатов не найдено." });
        return;
      }
      showToast({ variant: "success", message: "Позиции успешно обновлены." });
    } catch {
      setRows([]);
      setWarnings([]);
      setErrorMessage("Ошибка снятия позиций. Повторите попытку.");
      showToast({ variant: "error", message: "Ошибка снятия позиций." });
    }
  };

  return (
    <Wrapper>
      <PageHeader title="Топвизор" />
      <TableSyncPanel
        onSync={handleSync}
        isLoading={isLoading}
        disabled={isLoading}
        label="Снять позиции"
        leftSlot={
          <SearchInput
            type="search"
            value={domainFilter}
            onChange={(event) => setDomainFilter(event.target.value)}
            placeholder="Поиск по домену"
            disabled={!hasSynced || rows.length === 0}
          />
        }
      />
      {warnings.length > 0 && (
        <WarningCard>
          {warnings.map((warning) => (
            <WarningText key={warning}>{warning}</WarningText>
          ))}
        </WarningCard>
      )}
      <Content>
        {isLoading ? (
          <ResultLoader label="Снимаем позиции..." />
        ) : errorMessage ? (
          <CenteredState>
            <PlaceholderText>{errorMessage}</PlaceholderText>
          </CenteredState>
        ) : hasSynced && visibleRows.length === 0 ? (
          <CenteredState>
            <PlaceholderText>{EMPTY_DATA_MESSAGE}</PlaceholderText>
          </CenteredState>
        ) : visibleRows.length > 0 ? (
          <TopvisorTableWrapper>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>ID проекта</TableHeaderCell>
                  <TableHeaderCell>Домен</TableHeaderCell>
                  <TableHeaderCell>Топ 10</TableHeaderCell>
                  <TableHeaderCell>Топ 11-30</TableHeaderCell>
                  <TableHeaderCell>Топ 31-50</TableHeaderCell>
                  <TableHeaderCell>Топ 51-100</TableHeaderCell>
                  <TableHeaderCell>Топ 101+</TableHeaderCell>
                  <TableHeaderCell>Дата</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleRows.map((row) => (
                  <TableRow key={`${row.projectId}-${row.domain}`}>
                    <TableCell>{row.projectId}</TableCell>
                    <TableCell>{row.domain}</TableCell>
                    <TopCell count={row.top10} dynamics={row.top10Dynamics} />
                    <TopCell count={row.top1130} dynamics={row.top1130Dynamics} />
                    <TopCell count={row.top3150} dynamics={row.top3150Dynamics} />
                    <TopCell count={row.top51100} dynamics={row.top51100Dynamics} />
                    <TopCell count={row.top101} dynamics={row.top101Dynamics} />
                    <TableCell>{formatDateTime(row.date)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TopvisorTableWrapper>
        ) : (
          <CenteredState>
            <PlaceholderText>Нажмите «Снять позиции», чтобы загрузить данные.</PlaceholderText>
          </CenteredState>
        )}
      </Content>
    </Wrapper>
  );
}

function TopCell({ count, dynamics }: { count: number; dynamics: number }) {
  return (
    <TableCell>
      <TopValue>
        <span>{count}</span>
        {dynamics !== 0 && (
          <DynamicsValue $tone={resolveDynamicsTone(dynamics)}>{formatDynamics(dynamics)}</DynamicsValue>
        )}
      </TopValue>
    </TableCell>
  );
}

function formatDynamics(value: number) {
  if (value > 0) {
    return `+${value}`;
  }
  return String(value);
}

function resolveDynamicsTone(value: number) {
  if (value > 0) {
    return "positive";
  }
  if (value < 0) {
    return "negative";
  }
  return "neutral";
}

function formatDateTime(value?: string | null) {
  if (!value || value === "—") {
    return "—";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString("ru-RU");
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
  height: 100%;
`;

const Content = styled.div`
  display: flex;
  flex: 1;
  min-height: 0;
`;

const TopvisorTableWrapper = styled(TableWrapper)`
  width: 100%;
`;

const SearchInput = styled.input`
  width: min(360px, 100%);
  border: 1px solid rgba(148, 163, 184, 0.6);
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 14px;
  color: #0f172a;
  background: #ffffff;

  &:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
  }

  &:disabled {
    cursor: not-allowed;
    color: #94a3b8;
    background: #f8fafc;
  }
`;

const TopValue = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
`;

const DynamicsValue = styled.span<{ $tone: "positive" | "negative" | "neutral" }>`
  color: ${({ $tone }) => {
    if ($tone === "positive") {
      return "#15803d";
    }
    if ($tone === "negative") {
      return "#b91c1c";
    }
    return "#64748b";
  }};
  font-size: 12px;
  font-weight: 600;
`;

const WarningCard = styled.div`
  border: 1px solid rgba(234, 179, 8, 0.4);
  background: rgba(254, 252, 232, 0.85);
  border-radius: 12px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const WarningText = styled.p`
  margin: 0;
  color: #92400e;
  font-size: 13px;
`;
