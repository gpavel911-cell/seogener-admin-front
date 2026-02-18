import styled from "styled-components";
import type { WebmasterHostDto } from "@entities/webmaster/types";
import { EMPTY_DATA_MESSAGE, ResultLoader, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, TableWrapper } from "@shared/ui";
import { formatDateTime, formatPresence, formatVerified } from "../../lib/formatters";

type WebmasterHostsTableProps = {
  items: WebmasterHostDto[];
  isLoading: boolean;
  pageSize: number;
  selectedHostId: number | null;
  onSelect: (id: number) => void;
};

const COLUMN_COUNT = 5;

export const WebmasterHostsTable = ({ items, isLoading, pageSize, selectedHostId, onSelect }: WebmasterHostsTableProps) => {
  if (isLoading) {
    return <ResultLoader label="Загрузка сайтов..." />;
  }

  const fillerCount = !isLoading && items.length > 0 ? Math.max(pageSize - items.length, 0) : 0;

  return (
    <TableWrapper>
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Сайт</TableHeaderCell>
            <TableHeaderCell>ID сайта</TableHeaderCell>
            <TableHeaderCell>Верифицирован</TableHeaderCell>
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
              <ClickableRow key={item.id} data-active={item.id === selectedHostId} onClick={() => onSelect(item.id)}>
                <TableCell>{item.hostUrl ?? "—"}</TableCell>
                <TableCell>{item.hostId}</TableCell>
                <TableCell>
                  <VerifiedBadge data-variant={item.verified === false ? "NO" : item.verified === true ? "YES" : "UNKNOWN"}>
                    {formatVerified(item.verified)}
                  </VerifiedBadge>
                </TableCell>
                <TableCell>
                  <PresenceBadge data-variant={item.presence ?? "UNKNOWN"}>{formatPresence(item.presence)}</PresenceBadge>
                </TableCell>
                <TableCell>{formatDateTime(item.updatedAt)}</TableCell>
              </ClickableRow>
            ))}
          {!isLoading &&
            fillerCount > 0 &&
            Array.from({ length: fillerCount }, (_, index) => (
              <PlaceholderRow key={`host-placeholder-${index}`}>
                <TableCell colSpan={COLUMN_COUNT}>&nbsp;</TableCell>
              </PlaceholderRow>
            ))}
        </TableBody>
      </Table>
    </TableWrapper>
  );
};

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

const PresenceBadge = styled.span`
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

const VerifiedBadge = styled.span`
  display: inline-flex;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 12px;
  background: #ecfdf3;
  color: #027a48;

  &[data-variant="NO"] {
    background: #fef3f2;
    color: #b42318;
  }

  &[data-variant="UNKNOWN"] {
    background: #f3f4f6;
    color: #6b7280;
  }
`;
