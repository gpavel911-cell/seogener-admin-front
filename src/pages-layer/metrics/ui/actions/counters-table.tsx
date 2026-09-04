import styled from "styled-components";
import { FaChartColumn, FaFlag } from "react-icons/fa6";
import type { MetricsCounterDto } from "@entities/metrics/types";
import {
  Button,
  EMPTY_DATA_MESSAGE,
  ResultLoader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableWrapper,
} from "@shared/ui";
import { formatDateTime } from "../../lib/formatters";

type CountersTableProps = {
  items: MetricsCounterDto[];
  isLoading: boolean;
  pageSize: number;
  showRowActions?: boolean;
  onViewStatistics?: (counterId: string) => void;
  onViewGoals?: (counterId: string) => void;
};

export const CountersTable = ({
  items,
  isLoading,
  pageSize,
  showRowActions = false,
  onViewStatistics,
  onViewGoals,
}: CountersTableProps) => {
  const columnCount = showRowActions ? 7 : 6;

  if (isLoading) {
    return <ResultLoader label="Загрузка счетчиков..." />;
  }

  const fillerCount = items.length > 0 ? Math.max(pageSize - items.length, 0) : 0;

  return (
    <TableWrapper>
      <CountersTableRoot $hasActions={showRowActions}>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Номер счетчика</TableHeaderCell>
            <TableHeaderCell>Название</TableHeaderCell>
            <TableHeaderCell>Сайт</TableHeaderCell>
            <TableHeaderCell>Статус</TableHeaderCell>
            <TableHeaderCell>Наличие</TableHeaderCell>
            <TableHeaderCell>Время последнего обновления</TableHeaderCell>
            {showRowActions ? <TableHeaderCell /> : null}
          </TableRow>
        </TableHead>
        <TableBody>
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={columnCount}>{EMPTY_DATA_MESSAGE}</TableCell>
            </TableRow>
          )}
          {items.length > 0 &&
            items.map((item) => (
              <CounterRow
                key={item.id}
                item={item}
                showRowActions={showRowActions}
                onViewStatistics={onViewStatistics}
                onViewGoals={onViewGoals}
              />
            ))}
          {fillerCount > 0 &&
            Array.from({ length: fillerCount }, (_, index) => (
              <PlaceholderRow key={`counter-placeholder-${index}`}>
                <TableCell colSpan={columnCount}>&nbsp;</TableCell>
              </PlaceholderRow>
            ))}
        </TableBody>
      </CountersTableRoot>
    </TableWrapper>
  );
};

function CounterRow({
  item,
  showRowActions,
  onViewStatistics,
  onViewGoals,
}: {
  item: MetricsCounterDto;
  showRowActions: boolean;
  onViewStatistics?: (counterId: string) => void;
  onViewGoals?: (counterId: string) => void;
}) {
  const counterId = item.counterId;
  return (
    <TableRow>
      <TableCell>{counterId}</TableCell>
      <TableCell>{item.counterName ?? "—"}</TableCell>
      <TableCell>{item.siteUrl ?? "—"}</TableCell>
      <TableCell>
        <Badge data-variant={item.status ?? "UNKNOWN"}>{formatStatus(item.status)}</Badge>
      </TableCell>
      <TableCell>
        <Badge data-variant={item.presence ?? "UNKNOWN"}>{formatPresence(item.presence)}</Badge>
      </TableCell>
      <TableCell>{formatDateTime(item.updatedAt)}</TableCell>
      {showRowActions ? (
        <TableCell>
          {counterId ? (
            <ActionsCell>
              <IconButton
                type="button"
                onClick={() => onViewStatistics?.(counterId)}
                data-tooltip="Посмотреть статистику"
                aria-label="Посмотреть статистику"
              >
                <FaChartColumn />
              </IconButton>
              <IconButton
                type="button"
                onClick={() => onViewGoals?.(counterId)}
                data-tooltip="Посмотреть цели"
                aria-label="Посмотреть цели"
              >
                <FaFlag />
              </IconButton>
            </ActionsCell>
          ) : null}
        </TableCell>
      ) : null}
    </TableRow>
  );
}

const formatStatus = (status?: string | null) => {
  if (!status) {
    return "—";
  }
  return status === "DELETED" ? "Удален" : "Активен";
};

const formatPresence = (presence?: string | null) => {
  if (!presence) {
    return "—";
  }
  return presence === "MISSING" ? "Отсутствует" : "Присутствует";
};

const CountersTableRoot = styled(Table)<{ $hasActions: boolean }>`
  ${({ $hasActions }) =>
    $hasActions
      ? `
    ${TableHeaderCell}:last-child,
    ${TableCell}:last-child {
      width: 120px;
    }
  `
      : ""}
`;

const Badge = styled.span`
  display: inline-flex;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 12px;
  background: #ecfdf3;
  color: #027a48;

  &[data-variant="MISSING"] {
    background: #fef3f2;
    color: #b42318;
  }

  &[data-variant="DELETED"] {
    background: #fef3f2;
    color: #b42318;
  }
`;

const PlaceholderRow = styled(TableRow)`
  pointer-events: none;
`;

const ActionsCell = styled.div`
  display: flex;
  justify-content: flex-end;
  width: 100%;
  align-items: center;
  gap: 8px;
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
    transition: opacity 0.14s ease, transform 0.14s ease;
    z-index: 10;
  }

  &:hover::after,
  &:focus-visible::after {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
`;
