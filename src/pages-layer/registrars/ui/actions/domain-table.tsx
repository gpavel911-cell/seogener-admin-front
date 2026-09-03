import styled from "styled-components";
import { FaList, FaPlus } from "react-icons/fa6";
import { type RegistrarDomainDto } from "@entities/registrars/types";
import {
  Button,
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
  onViewDns: (domain: string) => void;
  onCreateDns: (domain: string) => void;
};

const COLUMN_COUNT = 6;

export function DomainTable({ items, isLoading, pageSize, onViewDns, onCreateDns }: DomainTableProps) {
  if (isLoading) {
    return <ResultLoader label="Загрузка доменов..." />;
  }

  const fillerCount = !isLoading && items.length > 0 ? Math.max(pageSize - items.length, 0) : 0;

  return (
    <TableWrapper>
      <DomainsTable>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Домен</TableHeaderCell>
            <TableHeaderCell>Дата истечения периода</TableHeaderCell>
            <TableHeaderCell>Статус</TableHeaderCell>
            <TableHeaderCell>Наличие</TableHeaderCell>
            <TableHeaderCell>Время последнего обновления</TableHeaderCell>
            <TableHeaderCell />
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
                onViewDns={onViewDns}
                onCreateDns={onCreateDns}
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
      </DomainsTable>
    </TableWrapper>
  );
}

function DomainRow({
  domain,
  onViewDns,
  onCreateDns,
}: {
  domain: RegistrarDomainDto;
  onViewDns: (domain: string) => void;
  onCreateDns: (domain: string) => void;
}) {
  const domainName = domain.domainName;
  return (
    <TableRow>
      <TableCell>{domainName ?? "—"}</TableCell>
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
      <TableCell>
        {domainName ? (
          <ActionsCell>
            <IconButton
              type="button"
              onClick={() => onViewDns(domainName)}
              data-tooltip="Посмотреть ДНС записи"
              aria-label="Посмотреть ДНС записи"
            >
              <FaList />
            </IconButton>
            <IconButton
              type="button"
              onClick={() => onCreateDns(domainName)}
              data-tooltip="Создать DNS запись"
              aria-label="Создать DNS запись"
            >
              <FaPlus />
            </IconButton>
          </ActionsCell>
        ) : null}
      </TableCell>
    </TableRow>
  );
}

const DomainsTable = styled(Table)`
  ${TableHeaderCell}:last-child,
  ${TableCell}:last-child {
    width: 120px;
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
