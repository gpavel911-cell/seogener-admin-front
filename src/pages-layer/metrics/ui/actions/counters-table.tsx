import styled from "styled-components";
import type { MetricsCounterDto } from "@entities/metrics/types";
import { EMPTY_DATA_MESSAGE, ResultLoader, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, TableWrapper } from "@shared/ui";
import { formatDateTime } from "../../lib/formatters";

type CountersTableProps = {
  items: MetricsCounterDto[];
  isLoading: boolean;
  pageSize: number;
  selectedCounterId: number | null;
  onSelect: (id: number) => void;
};

const COLUMN_COUNT = 6;

export const CountersTable = ({ items, isLoading, pageSize, selectedCounterId, onSelect }: CountersTableProps) => {
  if (isLoading) {
    return <ResultLoader label="Загрузка счетчиков..." />;
  }

  const fillerCount = !isLoading && items.length > 0 ? Math.max(pageSize - items.length, 0) : 0;

  return (
    <TableWrapper>
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Номер счетчика</TableHeaderCell>
            <TableHeaderCell>Название</TableHeaderCell>
            <TableHeaderCell>Сайт</TableHeaderCell>
            <TableHeaderCell>Статус</TableHeaderCell>
            <TableHeaderCell>Наличие</TableHeaderCell>
            <TableHeaderCell>Время последнего обновления</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {!isLoading && items.length === 0 && (
            <TableRow>
              <TableCell colSpan={COLUMN_COUNT}>{EMPTY_DATA_MESSAGE}</TableCell>
            </TableRow>
          )}
          {!isLoading &&
            items.length > 0 &&
            items.map((item) => (
              <ClickableRow key={item.id} data-active={item.id === selectedCounterId} onClick={() => onSelect(item.id)}>
                <TableCell>{item.counterId}</TableCell>
                <TableCell>{item.counterName ?? "—"}</TableCell>
                <TableCell>{item.siteUrl ?? "—"}</TableCell>
                <TableCell>
                  <Badge data-variant={item.status ?? "UNKNOWN"}>{formatStatus(item.status)}</Badge>
                </TableCell>
                <TableCell>
                  <Badge data-variant={item.presence ?? "UNKNOWN"}>{formatPresence(item.presence)}</Badge>
                </TableCell>
                <TableCell>{formatDateTime(item.updatedAt)}</TableCell>
              </ClickableRow>
            ))}
          {!isLoading &&
            fillerCount > 0 &&
            Array.from({ length: fillerCount }, (_, index) => (
              <PlaceholderRow key={`counter-placeholder-${index}`}>
                <TableCell colSpan={COLUMN_COUNT}>&nbsp;</TableCell>
              </PlaceholderRow>
            ))}
        </TableBody>
      </Table>
    </TableWrapper>
  );
};

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

const ClickableRow = styled(TableRow)`
  cursor: pointer;

  &[data-active="true"] {
    background: #edf4ff;
  }

  &:hover {
    background: #f8fbff;
  }
`;

const PlaceholderRow = styled(TableRow)`
  pointer-events: none;
`;
