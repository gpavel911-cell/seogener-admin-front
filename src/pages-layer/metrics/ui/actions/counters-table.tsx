import styled from "styled-components";
import type { MetricsCounterDto } from "@entities/metrics/types";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, TableWrapper } from "@shared/ui";
import { formatDateTime } from "../../lib/formatters";

type CountersTableProps = {
  items: MetricsCounterDto[];
  isLoading: boolean;
  selectedCounterId: number | null;
  onSelect: (id: number) => void;
};

export const CountersTable = ({ items, isLoading, selectedCounterId, onSelect }: CountersTableProps) => {
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
          {isLoading && (
            <TableRow>
              <TableCell colSpan={6}>Загрузка...</TableCell>
            </TableRow>
          )}
          {!isLoading && items.length === 0 && (
            <TableRow>
              <TableCell colSpan={6}>Счетчики не найдены.</TableCell>
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
    background: #f3f4f6;
  }

  &:hover {
    background: #f9fafb;
  }
`;
