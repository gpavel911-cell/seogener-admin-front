import styled from "styled-components";
import { Button } from "./button";

type PaginationControlsProps = {
  page: number;
  totalPages: number;
  pageSize: number;
  pageSizeOptions: number[];
  isFetching?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

export function PaginationControls({
  page,
  totalPages,
  pageSize,
  pageSizeOptions,
  isFetching = false,
  onPageChange,
  onPageSizeChange,
}: PaginationControlsProps) {
  const canPrev = page > 0;
  const canNext = page + 1 < totalPages;

  return (
    <Container>
      <Controls>
        <Button type="button" onClick={() => onPageChange(page - 1)} disabled={!canPrev}>
          Назад
        </Button>
        <PageInfo>
          Стр. {page + 1} из {Math.max(totalPages, 1)}
          {isFetching && " (обновление...)"}
        </PageInfo>
        <Button type="button" onClick={() => onPageChange(page + 1)} disabled={!canNext}>
          Далее
        </Button>
      </Controls>
      <Select value={String(pageSize)} onChange={(event) => onPageSizeChange(Number(event.target.value))}>
        {pageSizeOptions.map((option) => (
          <Option key={option} value={option}>
            {option} / стр.
          </Option>
        ))}
      </Select>
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
`;

const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Select = styled.select`
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  background: #ffffff;
  color: #111827;
  font-size: 14px;
`;

const Option = styled.option``;

const PageInfo = styled.div`
  font-size: 14px;
  color: #6b7280;
`;
