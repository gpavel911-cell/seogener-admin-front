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
import { formatDateTime, formatDateValue, formatPresence } from "../lib/formatters";

type DomainTableProps = {
  items: DomainDto[];
  isLoading: boolean;
  selectedDomainId: number | null;
  onSelect: (id: number) => void;
};

const COLUMN_COUNT = 8;

export function DomainTable({ items, isLoading, selectedDomainId, onSelect }: DomainTableProps) {
  return (
    <TableWrapper>
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Домен</TableHeaderCell>
            <TableHeaderCell>ID услуги</TableHeaderCell>
            <TableHeaderCell>Статус</TableHeaderCell>
            <TableHeaderCell>Истекает</TableHeaderCell>
            <TableHeaderCell>Наличие</TableHeaderCell>
            <TableHeaderCell>Регистратор</TableHeaderCell>
            <TableHeaderCell>Профиль</TableHeaderCell>
            <TableHeaderCell>Последний sync</TableHeaderCell>
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
      <TableCell>{domain.dname}</TableCell>
      <TableCell>{domain.serviceId}</TableCell>
      <TableCell>{domain.state ?? "—"}</TableCell>
      <TableCell>{formatDateValue(domain.expirationDate)}</TableCell>
      <TableCell>
        <Badge data-variant={domain.registrarPresence}>
          {formatPresence(domain.registrarPresence)}
        </Badge>
      </TableCell>
      <TableCell>{domain.registrar}</TableCell>
      <TableCell>{domain.profile}</TableCell>
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
