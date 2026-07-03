"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import { FaSearch } from "react-icons/fa";
import styled, { keyframes } from "styled-components";
import { useGetPositioningQuery, positioningApi, positioningDetailsTag } from "@entities/positioning/api";
import type { PositioningListRequest, PositioningRowDto } from "@entities/positioning/types";
import { useGetProjectOptionsQuery } from "@entities/projects/api";
import { useAppDispatch } from "@shared/store";
import { usePagination } from "@shared/lib/use-pagination";
import { PaginationControls } from "@shared/ui/pagination-controls";
import {
  Button,
  EMPTY_DATA_MESSAGE,
  PlaceholderText,
  SelectControl,
  StyledInput,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableWrapper,
  useToast,
} from "@shared/ui";
import { ModalDialog } from "@shared/ui-kit/modal-dialog";
import { PositioningDetailsModalContent } from "./positioning-details-modal-content";

type AppliedFilters = {
  projectId: string;
  query: string;
};

const validatePositioningFilters = (projectId: string): string | null => {
  if (!projectId) {
    return "Выберите проект.";
  }
  return null;
};

export function DashboardPositioningSection() {
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  const { page, pageSize, pageSizeOptions, setPage, setPageSize } = usePagination({ initialPageSize: 15 });
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [search, setSearch] = useState("");
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters | null>(null);
  const [detailRows, setDetailRows] = useState<PositioningRowDto[]>([]);
  const [detailsOpenKey, setDetailsOpenKey] = useState(0);
  const [selectedSiteIds, setSelectedSiteIds] = useState<number[]>([]);

  const { data: projectOptions = [] } = useGetProjectOptionsQuery();
  const effectiveProjectId = selectedProjectId || projectOptions[0]?.value || "";

  const queryArgs = useMemo<PositioningListRequest | typeof skipToken>(() => {
    if (!appliedFilters) {
      return skipToken;
    }
    return {
      projectId: Number(appliedFilters.projectId),
      query: appliedFilters.query || undefined,
      pageNumber: page,
      pageSize,
    };
  }, [appliedFilters, page, pageSize]);

  const { data, currentData, isFetching, error } = useGetPositioningQuery(queryArgs);

  useEffect(() => {
    if (!error) return;
    showToast({ variant: "error", message: "Ошибка загрузки данных позиционирования. Повторите запрос." });
  }, [error, showToast]);

  const resetPositioning = () => {
    setPage(0);
    setAppliedFilters(null);
    setDetailRows([]);
    setSelectedSiteIds([]);
  };

  const openDetailsForRows = (rows: PositioningRowDto[]) => {
    if (!appliedFilters || rows.length === 0) {
      return;
    }
    const projectId = Number(appliedFilters.projectId);
    dispatch(
      positioningApi.util.invalidateTags(
        rows.map((row) => positioningDetailsTag(projectId, row.siteId)),
      ),
    );
    setDetailsOpenKey((current) => current + 1);
    setDetailRows(rows);
  };

  const handleShow = () => {
    const validationMessage = validatePositioningFilters(effectiveProjectId);
    if (validationMessage) {
      showToast({ variant: "error", message: validationMessage });
      return;
    }
    setPage(0);
    setDetailRows([]);
    setAppliedFilters({
      projectId: effectiveProjectId,
      query: search.trim(),
    });
  };

  const rows = useMemo(() => data?.content ?? [], [data?.content]);
  const totalPages = data?.totalPages ?? 0;
  const hasLoaded = appliedFilters !== null;
  const showTableSkeleton = hasLoaded && isFetching && !currentData;
  const selectedRows = useMemo(
    () => rows.filter((row) => selectedSiteIds.includes(row.siteId)),
    [rows, selectedSiteIds],
  );
  const visibleSiteIds = useMemo(() => rows.map((row) => row.siteId), [rows]);
  const allVisibleRowsSelected = rows.length > 0 && rows.every((row) => selectedSiteIds.includes(row.siteId));
  const someVisibleRowsSelected = rows.some((row) => selectedSiteIds.includes(row.siteId));

  const handlePageChange = (nextPage: number) => {
    setSelectedSiteIds([]);
    setPage(nextPage);
  };

  const handlePageSizeChange = (nextPageSize: number) => {
    setSelectedSiteIds([]);
    setPageSize(nextPageSize);
  };

  return (
    <>
      <Content>
        <Toolbar>
          <Field>
            <Label>Проект</Label>
            <SelectControl
              value={effectiveProjectId}
              onValueChange={(value) => {
                setSelectedProjectId(value);
                resetPositioning();
              }}
              options={projectOptions}
            />
          </Field>
          <SearchField>
            <Label>Поиск по домену</Label>
            <StyledInput
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                resetPositioning();
              }}
              placeholder="Введите домен"
            />
          </SearchField>
          <ShowButton type="button" variant="primary" onClick={handleShow} disabled={isFetching || !effectiveProjectId}>
            {isFetching ? "Загрузка..." : "Показать"}
          </ShowButton>
          {selectedRows.length > 0 ? (
            <BulkCheckButton type="button" variant="primary" onClick={() => openDetailsForRows(selectedRows)}>
              Проверить
            </BulkCheckButton>
          ) : (
            <ToolbarSpacer aria-hidden="true" />
          )}
        </Toolbar>

        {!hasLoaded ? (
          <PlaceholderCard>Выберите фильтры и нажмите кнопку Показать.</PlaceholderCard>
        ) : showTableSkeleton ? (
          <TableSkeletonCard aria-hidden="true">
            <TableSkeletonHeader />
            {Array.from({ length: 5 }, (_, index) => (
              <TableSkeletonRow key={index}>
                <SkeletonLine $width="16px" $height={16} />
                <SkeletonLine $width="55%" />
                <SkeletonLine $width="20%" />
                <SkeletonLine $width="40px" $height={32} />
              </TableSkeletonRow>
            ))}
          </TableSkeletonCard>
        ) : rows.length === 0 ? (
          <PlaceholderCard>{EMPTY_DATA_MESSAGE}</PlaceholderCard>
        ) : (
          <>
            <TableWrapper>
              <PositioningTable>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>
                      <HeaderCheckbox
                        checked={allVisibleRowsSelected}
                        indeterminate={someVisibleRowsSelected && !allVisibleRowsSelected}
                        disabled={isFetching}
                        onChange={(event) => {
                          setSelectedSiteIds((prev) => {
                            if (event.target.checked) {
                              return Array.from(new Set([...prev, ...visibleSiteIds]));
                            }
                            return prev.filter((siteId) => !visibleSiteIds.includes(siteId));
                          });
                        }}
                      />
                    </TableHeaderCell>
                    <TableHeaderCell>Домен</TableHeaderCell>
                    <TableHeaderCell>Ключи</TableHeaderCell>
                    <TableHeaderCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.siteId}>
                      <TableCell>
                        <Checkbox
                          type="checkbox"
                          checked={selectedSiteIds.includes(row.siteId)}
                          disabled={isFetching}
                          onChange={(event) => {
                            setSelectedSiteIds((prev) => {
                              if (event.target.checked) {
                                return prev.includes(row.siteId) ? prev : [...prev, row.siteId];
                              }
                              return prev.filter((siteId) => siteId !== row.siteId);
                            });
                          }}
                        />
                      </TableCell>
                      <TableCell>{row.domain}</TableCell>
                      <TableCell>{formatKeywordCount(row.keywordCount)}</TableCell>
                      <TableCell>
                        <ActionsCell>
                          <IconButton
                            type="button"
                            onClick={() => openDetailsForRows([row])}
                            data-tooltip="Проверить"
                            aria-label={`Проверить позиции для ${row.domain}`}
                          >
                            <FaSearch />
                          </IconButton>
                        </ActionsCell>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </PositioningTable>
            </TableWrapper>
            <PaginationControls
              page={page}
              totalPages={totalPages}
              pageSize={pageSize}
              pageSizeOptions={pageSizeOptions}
              isFetching={isFetching}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </>
        )}
      </Content>
      <ModalDialog
        open={detailRows.length > 0}
        onOpenChange={(open) => {
          if (!open) {
            setDetailRows([]);
          }
        }}
        title={
          detailRows.length === 1
            ? detailRows[0]?.domain ?? "Проверка позиций"
            : `Проверка позиций (${detailRows.length.toLocaleString("ru-RU")})`
        }
        contentWidth="1180px"
      >
        {detailRows.length > 0 && appliedFilters ? (
          <PositioningDetailsModalContent
            key={`${detailsOpenKey}-${detailRows.map((row) => row.siteId).join("-")}`}
            rows={detailRows}
            projectId={Number(appliedFilters.projectId)}
          />
        ) : null}
      </ModalDialog>
    </>
  );
}

const formatKeywordCount = (value: number) => value.toLocaleString("ru-RU");

type HeaderCheckboxProps = {
  checked: boolean;
  indeterminate: boolean;
  disabled: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

function HeaderCheckbox({ checked, indeterminate, disabled, onChange }: HeaderCheckboxProps) {
  const checkboxRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return <Checkbox ref={checkboxRef} type="checkbox" checked={checked} disabled={disabled} onChange={onChange} />;
}

const Content = styled.section`
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
  min-width: 0;
`;

const Toolbar = styled.div`
  display: grid;
  grid-template-columns: minmax(180px, 220px) 260px auto 1fr auto;
  gap: 12px;
  align-items: end;
  padding: 14px;
  border: 1px solid ${({ theme }) => theme.tokens.color.borderSubtle};
  border-radius: 14px;
  background: #ffffff;
`;

const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
`;

const SearchField = styled(Field)`
  width: 260px;
`;

const Label = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.tokens.color.textSecondary};
`;

const ShowButton = styled(Button)`
  min-width: 110px;
  justify-self: start;
`;

const ToolbarSpacer = styled.div`
  min-width: 0;
`;

const BulkCheckButton = styled(Button)`
  min-width: 120px;
  justify-self: end;
`;

const PlaceholderCard = styled(PlaceholderText)`
  border: 1px solid #dbe5f3;
  background: #ffffff;
  border-radius: 14px;
  padding: 24px;
`;

const shimmer = keyframes`
  0% {
    opacity: 0.55;
  }

  50% {
    opacity: 1;
  }

  100% {
    opacity: 0.55;
  }
`;

const PositioningTable = styled(Table)`
  ${TableHeaderCell}:nth-child(1),
  ${TableCell}:nth-child(1) {
    width: 48px;
    padding-left: 12px;
    padding-right: 8px;
    text-align: center;
  }

  ${TableHeaderCell}:nth-child(4),
  ${TableCell}:nth-child(4) {
    width: 88px;
  }
`;

const TableSkeletonCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border: 1px solid #dbe5f3;
  border-radius: 14px;
  background: #ffffff;
`;

const TableSkeletonHeader = styled.div`
  height: 18px;
  width: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #e2e8f0 0%, #f8fafc 50%, #e2e8f0 100%);
  animation: ${shimmer} 1.2s ease-in-out infinite;
`;

const TableSkeletonRow = styled.div`
  display: grid;
  grid-template-columns: 24px 1.4fr 0.6fr 48px;
  gap: 12px;
  align-items: center;
`;

const Checkbox = styled.input`
  width: 16px;
  height: 16px;
  cursor: pointer;
  vertical-align: middle;
`;

const SkeletonLine = styled.span<{ $width: string; $height?: number }>`
  display: block;
  width: ${({ $width }) => $width};
  height: ${({ $height = 14 }) => `${$height}px`};
  border-radius: 999px;
  background: linear-gradient(90deg, #e2e8f0 0%, #f8fafc 50%, #e2e8f0 100%);
  animation: ${shimmer} 1.2s ease-in-out infinite;
`;

const ActionsCell = styled.div`
  display: flex;
  justify-content: flex-end;
  width: 100%;
  align-items: center;
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
    transition:
      opacity 0.14s ease,
      transform 0.14s ease;
    z-index: 10;
  }

  &:hover::after,
  &:focus-visible::after {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
`;
