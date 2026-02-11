import styled from "styled-components";
import type { WebmasterHostDto } from "@entities/webmaster/types";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, TableWrapper } from "@shared/ui";
import { formatDateTime, formatPresence, formatVerified } from "../../lib/formatters";

type WebmasterHostsTableProps = {
  items: WebmasterHostDto[];
  isLoading: boolean;
  selectedHostId: number | null;
  onSelect: (id: number) => void;
};

export const WebmasterHostsTable = ({ items, isLoading, selectedHostId, onSelect }: WebmasterHostsTableProps) => {
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
          {isLoading && (
            <TableRow>
              <TableCell colSpan={5}>Загрузка...</TableCell>
            </TableRow>
          )}
          {!isLoading && items.length === 0 && (
            <TableRow>
              <TableCell colSpan={5}>Сайты не найдены.</TableCell>
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
        </TableBody>
      </Table>
    </TableWrapper>
  );
};

const ClickableRow = styled(TableRow)`
  cursor: pointer;

  &[data-active="true"] {
    background: #f3f4f6;
  }

  &:hover {
    background: #f9fafb;
  }
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
