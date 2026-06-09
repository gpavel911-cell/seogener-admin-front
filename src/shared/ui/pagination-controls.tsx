import styled from "styled-components";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6";
import { Button } from "./button";
import { SelectControl } from "@shared/ui-kit";

type PaginationControlsProps = {
  page: number;
  totalPages: number;
  pageSize: number;
  pageSizeOptions: number[];
  isFetching?: boolean;
  disabled?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

export function PaginationControls({
  page,
  totalPages,
  pageSize,
  pageSizeOptions,
  isFetching = false,
  disabled = false,
  onPageChange,
  onPageSizeChange,
}: PaginationControlsProps) {
  const canPrev = page > 0;
  const canNext = page + 1 < totalPages;
  const pageSizeSelectOptions = pageSizeOptions.map((option) => ({
    value: String(option),
    label: `${option} / стр.`,
  }));

  return (
    <Container>
      <Controls>
        <NavButton type="button" onClick={() => onPageChange(page - 1)} disabled={disabled || !canPrev}>
          <FaChevronLeft aria-hidden="true" />
          Назад
        </NavButton>
        <PageInfo>
          Стр. {page + 1} из {Math.max(totalPages, 1)}
          {isFetching && " (обновление...)"}
        </PageInfo>
        <NavButton type="button" onClick={() => onPageChange(page + 1)} disabled={disabled || !canNext}>
          Далее
          <FaChevronRight aria-hidden="true" />
        </NavButton>
      </Controls>
      <PageSizeControl>
        <SelectControl
          value={String(pageSize)}
          onValueChange={(value) => onPageSizeChange(Number(value))}
          options={pageSizeSelectOptions}
          placeholder="Размер страницы"
          disabled={disabled}
        />
      </PageSizeControl>
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

const PageInfo = styled.div`
  font-size: 14px;
  color: #6b7280;
`;

const PageSizeControl = styled.div`
  width: 130px;
`;

const NavButton = styled(Button).attrs({
  variant: "secondary",
})`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 10px;
  border-color: #cbd7ea;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  color: #334155;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease, transform 0.15s ease;

  &:hover:not(:disabled) {
    border-color: rgba(37, 99, 235, 0.35);
    background: linear-gradient(180deg, #f8fbff 0%, #eff6ff 100%);
    color: #1d4ed8;
    transform: translateY(-1px);
  }
`;
