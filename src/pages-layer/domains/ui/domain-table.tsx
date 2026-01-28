import styled from "styled-components";
import { type DomainDto } from "@entities/domains/types";
import {
  TableWrapper,
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
} from "@shared/ui";
import { formatDateTime, formatDateValue, formatDomainState, formatPresence } from "../lib/formatters";

type DomainTableProps = {
  items: DomainDto[];
  isLoading: boolean;
  selectedDomainId: number | null;
  onSelect: (id: number) => void;
};

const COLUMN_COUNT = 5;

export function DomainTable({ items, isLoading, selectedDomainId, onSelect }: DomainTableProps) {
  return (
    <TableWrapper>
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Домен</TableHeaderCell>
            <TableHeaderCell>Статус</TableHeaderCell>
            <TableHeaderCell>Дата истечения периода</TableHeaderCell>
            <TableHeaderCell>Наличие</TableHeaderCell>
            <TableHeaderCell>Время последнего обновления</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={COLUMN_COUNT}>Загрузка...</TableCell>
            </TableRow>
          ) : items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={COLUMN_COUNT}>Домены не найдены.</TableCell>
            </TableRow>
          ) : (
            items.map((domain) => (
              <DomainRow
                key={domain.id}
                domain={domain}
                isSelected={domain.id === selectedDomainId}
                onSelect={onSelect}
              />
            ))
          )}
        </TableBody>
      </Table>
    </TableWrapper>
  );
}

function DomainRow({
  domain,
  isSelected,
  onSelect,
}: {
  domain: DomainDto;
  isSelected: boolean;
  onSelect: (id: number) => void;
}) {
  return (
    <ClickableRow data-active={isSelected} onClick={() => onSelect(domain.id)}>
      <TableCell>{domain.domainName ?? "—"}</TableCell>
      <TableCell>{formatDomainState(domain.state)}</TableCell>
      <TableCell>{formatDateValue(domain.expirationDate)}</TableCell>
      <TableCell>
        <Badge data-variant={domain.registrarPresence}>
          {formatPresence(domain.registrarPresence)}
        </Badge>
      </TableCell>
      <TableCell>{formatDateTime(domain.lastSeenAt)}</TableCell>
    </ClickableRow>
  );
}

const ClickableRow = styled(TableRow)`
  cursor: pointer;

  &[data-active="true"] {
    background: #f3f4f6;
  }

  &:hover {
    background: #f9fafb;
  }
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
`;
