import styled from "styled-components";
import { type RegistrarDomainDto } from "@entities/registrars/types";
import {
  EMPTY_DATA_MESSAGE,
  ResultLoader,
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
  pageSize: number;
  selectedDomainId: number | null;
  onSelect: (id: number) => void;
};

const COLUMN_COUNT = 5;

export function DomainTable({ items, isLoading, pageSize, selectedDomainId, onSelect }: DomainTableProps) {
  if (isLoading) {
    return <ResultLoader label="Загрузка доменов..." />;
  }

  const fillerCount = !isLoading && items.length > 0 ? Math.max(pageSize - items.length, 0) : 0;

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
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={COLUMN_COUNT}>{EMPTY_DATA_MESSAGE}</TableCell>
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
          {!isLoading &&
            fillerCount > 0 &&
            Array.from({ length: fillerCount }, (_, index) => (
              <PlaceholderRow key={`domain-placeholder-${index}`}>
                <TableCell colSpan={COLUMN_COUNT}>&nbsp;</TableCell>
              </PlaceholderRow>
            ))}
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
    background: #edf4ff;
  }

  &:hover {
    background: #f8fbff;
  }
`;

const PlaceholderRow = styled(TableRow)`
  pointer-events: none;
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
