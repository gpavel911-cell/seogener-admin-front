import styled from "styled-components";
import { type RegistrarDomainDto } from "@entities/registrars/types";
import {
  TableWrapper,
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
} from "@shared/ui";
import { formatDateTime, formatDateValue, formatDomainState, formatPresence } from "../../lib/formatters";

type DomainTableProps = {
  items: RegistrarDomainDto[];
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
            <TableHeaderCell>Дата истечения периода</TableHeaderCell>
            <TableHeaderCell>Статус</TableHeaderCell>
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
  domain: RegistrarDomainDto;
  isSelected: boolean;
  onSelect: (id: number) => void;
}) {
  return (
    <ClickableRow data-active={isSelected} onClick={() => onSelect(domain.id)}>
      <TableCell>{domain.domainName ?? "—"}</TableCell>
      <TableCell>{formatDateValue(domain.expirationDate)}</TableCell>
      <TableCell>
        <Badge data-variant={domain.status ?? "UNKNOWN"}>
          {formatDomainState(domain.status)}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge data-variant={domain.presence}>
          {formatPresence(domain.presence)}
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

  &[data-variant="INACTIVE"] {
    background: #fef3f2;
    color: #b42318;
  }

  &[data-variant="DELETED"] {
    background: #fef3f2;
    color: #b42318;
  }

  &[data-variant="SUSPENDED"] {
    background: #fff7ed;
    color: #b45309;
  }

  &[data-variant="TRANSFERRED"] {
    background: #f3f4f6;
    color: #374151;
  }
`;
