"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FaChartBar, FaPlay, FaTrash } from "react-icons/fa";
import styled from "styled-components";
import {
  useDeleteGeneratorProjectMutation,
  useGetGeneratorProjectsQuery,
} from "@entities/generator/api";
import type { GeneratorProjectListItem, GeneratorProjectStatus } from "@entities/generator/types";
import { Button, EMPTY_DATA_MESSAGE, PageHeader, PlaceholderText, ResultLoader, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, TableWrapper, useToast } from "@shared/ui";
import { PaginationControls } from "@shared/ui/pagination-controls";
import { ModalDialog } from "@shared/ui-kit/modal-dialog";
import { usePagination } from "@shared/lib/use-pagination";
import { ROUTES } from "@shared/config/routes";
import { apiErrorMessage } from "../lib/api-error";
import { canOpenResults, continueHref, formatRunAt, PROJECT_STATUS_LABEL, resultsHref } from "../lib/wizard";

const STATUS_VARIANT: Record<GeneratorProjectStatus, "draft" | "running" | "done" | "error"> = {
  DRAFT: "draft",
  RUNNING: "running",
  COMPLETED: "done",
  ERROR: "error",
};

export function GeneratorPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [deleteTarget, setDeleteTarget] = useState<GeneratorProjectListItem | null>(null);
  const { page, pageSize, pageSizeOptions, setPage, setPageSize } = usePagination({
    initialPageSize: 20,
    pageSizeOptions: [20, 50, 100],
  });
  const { data, isLoading, isFetching, error } = useGetGeneratorProjectsQuery({
    pageNumber: page,
    pageSize,
  });
  const [deleteProject, { isLoading: isDeleting }] = useDeleteGeneratorProjectMutation();

  useEffect(() => {
    if (!error) {
      return;
    }
    showToast({ variant: "error", message: apiErrorMessage(error, "Не удалось загрузить проекты генератора.") });
  }, [error, showToast]);

  const rows = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }
    try {
      await deleteProject(deleteTarget.id).unwrap();
      setDeleteTarget(null);
      showToast({ variant: "success", message: "Проект удалён" });
    } catch (deleteError) {
      showToast({ variant: "error", message: apiErrorMessage(deleteError, "Не удалось удалить проект.") });
    }
  };

  return (
    <Page>
      <PageHeader title="Генератор" />
      <TopContainer>
        <Button type="button" variant="primary" onClick={() => router.push(`${ROUTES.GENERATOR}/new`)}>
          Создать проект
        </Button>
      </TopContainer>
      {isLoading ? (
        <ResultLoader label="Загрузка проектов..." />
      ) : rows.length === 0 ? (
        <EmptyState>{EMPTY_DATA_MESSAGE}</EmptyState>
      ) : (
        <TableWrapper>
          <ProjectsTable>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Проект</TableHeaderCell>
                <TableHeaderCell>Ниша</TableHeaderCell>
                <TableHeaderCell>Доменов</TableHeaderCell>
                <TableHeaderCell>Статус</TableHeaderCell>
                <TableHeaderCell>Последний запуск</TableHeaderCell>
                <TableHeaderCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((item) => {
                const resultsEnabled = canOpenResults(item);
                const deleteEnabled = item.status !== "RUNNING" && !isDeleting;
                return (
                  <TableRow key={item.id}>
                    <TableCell>{item.name || `Проект ${item.id}`}</TableCell>
                    <TableCell>{item.niche || ""}</TableCell>
                    <TableCell>{item.domainCount}</TableCell>
                    <TableCell>
                      <StatusBadge data-variant={STATUS_VARIANT[item.status]}>
                        {PROJECT_STATUS_LABEL[item.status]}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>{formatRunAt(item.lastRunAt)}</TableCell>
                    <TableCell>
                      <ActionsCell>
                        <IconButton
                          type="button"
                          data-tooltip="Продолжить"
                          aria-label="Продолжить"
                          onClick={() => router.push(continueHref(item))}
                        >
                          <FaPlay aria-hidden="true" />
                        </IconButton>
                        <IconButton
                          type="button"
                          data-tooltip={resultsEnabled ? "Результаты" : "Результаты появятся после запуска"}
                          aria-label="Результаты"
                          disabled={!resultsEnabled}
                          onClick={() => router.push(resultsHref(item))}
                        >
                          <FaChartBar aria-hidden="true" />
                        </IconButton>
                        <DangerIconButton
                          type="button"
                          data-tooltip={deleteEnabled ? "Удалить" : "Нельзя удалить во время запуска"}
                          aria-label="Удалить"
                          disabled={!deleteEnabled}
                          onClick={() => setDeleteTarget(item)}
                        >
                          <FaTrash aria-hidden="true" />
                        </DangerIconButton>
                      </ActionsCell>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </ProjectsTable>
        </TableWrapper>
      )}
      {totalPages > 1 || pageSize !== 20 ? (
        <PaginationControls
          page={page}
          totalPages={Math.max(totalPages, 1)}
          pageSize={pageSize}
          pageSizeOptions={pageSizeOptions}
          isFetching={isFetching}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      ) : null}

      <ModalDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        title="Удалить проект"
        contentWidth="520px"
      >
        <ModalBody>
          <HintText>
            {deleteTarget
              ? `Удалить проект «${deleteTarget.name || deleteTarget.niche || deleteTarget.id}»? Это удалит все данные проекта.`
              : "Удалить проект?"}
          </HintText>
          <ModalActions>
            <Button type="button" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
              Отмена
            </Button>
            <DangerActionButton type="button" onClick={() => void handleDelete()} disabled={isDeleting || !deleteTarget}>
              {isDeleting ? "Удаление..." : "Удалить"}
            </DangerActionButton>
          </ModalActions>
        </ModalBody>
      </ModalDialog>
    </Page>
  );
}

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
`;

const TopContainer = styled.div`
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #ffffff;
  padding: 12px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
`;

const EmptyState = styled(PlaceholderText)`
  border: 1px solid #dbe5f3;
  background: #ffffff;
  border-radius: 14px;
  padding: 24px;
`;

const ProjectsTable = styled(Table)`
  table-layout: fixed;

  ${TableHeaderCell}:nth-child(6),
  ${TableCell}:nth-child(6) {
    width: 160px;
  }
`;

const StatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;

  &[data-variant="draft"] {
    background: #e2e8f0;
    color: #334155;
  }

  &[data-variant="running"] {
    background: #dbeafe;
    color: #1d4ed8;
  }

  &[data-variant="done"] {
    background: #dcfce7;
    color: #166534;
  }

  &[data-variant="error"] {
    background: #fee2e2;
    color: #b91c1c;
  }
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

const DangerIconButton = styled(IconButton)`
  background: #fef3f2;
  border-color: #fecaca;
  color: #b42318;

  &:hover:not(:disabled) {
    background: #fee4e2;
    border-color: #fda29b;
    color: #912018;
  }
`;

const DangerActionButton = styled(Button)`
  background: #fef3f2;
  border-color: #fecaca;
  color: #b42318;

  &:hover:not(:disabled) {
    background: #fee4e2;
    border-color: #fda29b;
    color: #912018;
  }
`;

const ModalBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`;

const HintText = styled.div`
  color: #64748b;
  font-size: 13px;
`;
