import styled from "styled-components";

export const EMPTY_DATA_MESSAGE = "Нет данных для отображения.";

export const TableWrapper = styled.div`
  overflow-x: auto;
  background: #ffffff;
  border-radius: 14px;
  border: 1px solid #dbe5f3;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.04);
`;

export const Table = styled.table`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 13px;
`;

export const TableHead = styled.thead``;

export const TableBody = styled.tbody``;

export const TableRow = styled.tr`
  transition: background-color 0.14s ease;
`;

export const ExpandedTableRow = styled(TableRow)`
  background: #f8fbff;
`;

export const TableHeaderCell = styled.th`
  padding: 11px 14px;
  height: 46px;
  border-bottom: 1px solid #e6edf8;
  text-align: left;
  vertical-align: middle;
  white-space: nowrap;
  background: linear-gradient(180deg, #f9fbff 0%, #f4f8ff 100%);
  font-weight: 600;
  color: #334155;
  letter-spacing: 0.01em;

  &:first-child {
    padding-left: 20px;
  }

  &:last-child {
    padding-right: 20px;
  }
`;

export const TableCell = styled.td`
  padding: 10px 14px;
  height: 44px;
  border-bottom: 1px solid #edf2fa;
  text-align: left;
  vertical-align: middle;
  white-space: nowrap;
  line-height: 1.25;
  color: #0f172a;

  ${TableBody} ${TableRow}:hover & {
    background: #f8fbff;
  }

  &:first-child {
    padding-left: 20px;
  }

  &:last-child {
    padding-right: 20px;
  }
`;

export const ExpandedTableCell = styled(TableCell)`
  white-space: normal;
  background: #f8fbff;
  padding-top: 14px;
  padding-bottom: 14px;
`;

export const RowToggleButton = styled.button`
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 1px solid #dbe5f3;
  background: #ffffff;
  color: #334155;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.14s ease, border-color 0.14s ease, color 0.14s ease;

  &:hover:not(:disabled) {
    background: #eff6ff;
    border-color: #bfdbfe;
    color: #1d4ed8;
  }

  &:disabled {
    cursor: default;
    opacity: 0.6;
  }
`;
