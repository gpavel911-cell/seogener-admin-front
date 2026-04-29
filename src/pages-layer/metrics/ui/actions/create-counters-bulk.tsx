import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import { FaPlus } from "react-icons/fa6";
import styled from "styled-components";
import {
  useCreateMetricsCounterImportMutation,
  useCreateMetricsCounterImportRowMutation,
  useDeleteMetricsCounterImportMutation,
  useGetMetricsCounterImportJobStatusQuery,
  useGetMetricsCounterImportRowsQuery,
  useGetMetricsCounterImportsQuery,
  useStartMetricsCounterImportCreateMissingMutation,
  useUpdateMetricsCounterImportMutation,
} from "@entities/metrics/api";
import {
  getMetricsProviderTypeLabel,
  MetricsCounterBulkJobStage,
  MetricsCounterBulkJobStatus,
  MetricsCounterImportRowStatus,
  MetricsProviderType,
} from "@entities/metrics/types";
import { usePagination } from "@shared/lib/use-pagination";
import { PaginationControls } from "@shared/ui/pagination-controls";
import { ModalDialog } from "@shared/ui-kit/modal-dialog";
import {
  Button,
  FieldLabel,
  FormCard,
  FormField,
  FormStack,
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

const STAGE_LABELS: Record<MetricsCounterBulkJobStage, string> = {
  [MetricsCounterBulkJobStage.VALIDATING]: "Валидация",
  [MetricsCounterBulkJobStage.PROCESSING]: "Обработка",
  [MetricsCounterBulkJobStage.WRITING]: "Сохранение",
  [MetricsCounterBulkJobStage.FINALIZING]: "Финализация",
};

const isJobInProgress = (status?: MetricsCounterBulkJobStatus): boolean =>
  status === MetricsCounterBulkJobStatus.QUEUED || status === MetricsCounterBulkJobStatus.RUNNING;

type CreateCountersBulkProps = {
  fixedProfile?: string | null;
  onRefreshCounters?: () => Promise<unknown> | void;
};

export const CreateCountersBulk = ({ fixedProfile = null, onRefreshCounters }: CreateCountersBulkProps = {}) => {
  const { page, pageSize, pageSizeOptions, setPage, setPageSize } = usePagination();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedImportId, setSelectedImportId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [importName, setImportName] = useState("");
  const [editImportName, setEditImportName] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobImportId, setJobImportId] = useState<string | null>(null);
  const [activeRowIds, setActiveRowIds] = useState<number[]>([]);

  const profile = fixedProfile ?? null;
  const provider = MetricsProviderType.YANDEX_METRICA;
  const canQuery = Boolean(profile);

  const importsQueryArgs = canQuery ? { provider, profile: profile as string } : skipToken;
  const {
    data: importsData,
    isLoading: isImportsLoading,
    refetch: refetchImports,
  } = useGetMetricsCounterImportsQuery(importsQueryArgs);

  const imports = useMemo(() => importsData ?? [], [importsData]);
  const importOptions = useMemo(
    () => imports.map((item) => ({ value: item.id, label: `${item.name} (${item.rowsTotal})` })),
    [imports],
  );

  const effectiveSelectedImportId = useMemo(() => {
    if (selectedImportId && imports.some((item) => item.id === selectedImportId)) {
      return selectedImportId;
    }
    return imports[0]?.id ?? "";
  }, [imports, selectedImportId]);

  const rowsQueryArgs = effectiveSelectedImportId
    ? { importId: effectiveSelectedImportId, pageNumber: page, pageSize }
    : skipToken;
  const {
    data: rowsData,
    isLoading: isRowsLoading,
    isFetching: isRowsFetching,
    refetch: refetchRows,
  } = useGetMetricsCounterImportRowsQuery(rowsQueryArgs);

  const rows = useMemo(() => rowsData?.content ?? [], [rowsData?.content]);
  const totalPages = rowsData?.totalPages ?? 0;
  const activeRowIdSet = useMemo(() => new Set(activeRowIds), [activeRowIds]);

  const [createImport, { isLoading: isCreateImportLoading }] = useCreateMetricsCounterImportMutation();
  const [updateImport, { isLoading: isUpdateImportLoading }] = useUpdateMetricsCounterImportMutation();
  const [deleteImport, { isLoading: isDeleteImportLoading }] = useDeleteMetricsCounterImportMutation();
  const [startCreateMissing, { isLoading: isCreateMissingLoading }] = useStartMetricsCounterImportCreateMissingMutation();
  const [createImportRow] = useCreateMetricsCounterImportRowMutation();

  const statusQuery = useGetMetricsCounterImportJobStatusQuery(jobId ? { jobId } : skipToken, {
    pollingInterval: jobId ? 4000 : 0,
    refetchOnMountOrArgChange: true,
  });
  const status = statusQuery.data;
  const statusError = statusQuery.error as { status?: number; data?: { message?: string } } | undefined;
  const currentStatus = status && jobId && status.jobId === jobId ? status : undefined;
  const isJobActive = isJobInProgress(currentStatus?.status);

  useEffect(() => {
    if (!status || !jobId || status.jobId !== jobId) return;
    if (status.status === MetricsCounterBulkJobStatus.COMPLETED) {
      const timer = setTimeout(() => {
        setJobId(null);
        setJobImportId(null);
      }, 0);
      if (status.failedRows > 0) {
        showToast({
          variant: "error",
          message: `Создание завершено с ошибками. Ошибок: ${status.failedRows}.`,
        });
      } else {
        showToast({ variant: "success", message: "Создание завершено." });
      }
      void refetchImports();
      void refetchRows();
      void onRefreshCounters?.();
      return () => clearTimeout(timer);
    }
    if (status.status === MetricsCounterBulkJobStatus.FAILED) {
      const timer = setTimeout(() => {
        setJobId(null);
        setJobImportId(null);
      }, 0);
      showToast({
        variant: "error",
        message: status.latestError ?? "Ошибка массового создания счетчиков.",
      });
      void refetchImports();
      void refetchRows();
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [jobId, onRefreshCounters, refetchImports, refetchRows, showToast, status]);

  useEffect(() => {
    if (!jobId || !statusError) {
      return;
    }
    if (statusError.status === 404) {
      showToast({
        variant: "error",
        message: "Статус задачи недоступен (возможно, сервер был перезапущен). Используйте повторный запуск для недостающих строк.",
      });
      setJobId(null);
      setJobImportId(null);
      void refetchRows();
      return;
    }
    if (statusError.status && statusError.status >= 400) {
      showToast({ variant: "error", message: statusError.data?.message ?? "Ошибка получения статуса задачи." });
    }
  }, [jobId, refetchRows, showToast, statusError]);

  useEffect(() => {
    setPage(0);
  }, [effectiveSelectedImportId, setPage]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0];
    if (!nextFile) return;
    if (!nextFile.name.toLowerCase().endsWith(".xlsx")) {
      showToast({ variant: "error", message: "Поддерживаются только .xlsx файлы." });
      event.target.value = "";
      return;
    }
    setFile(nextFile);
    event.target.value = "";
  };

  const handleCreateImport = async () => {
    if (!file) {
      showToast({ variant: "error", message: "Выберите входной .xlsx файл." });
      return;
    }
    if (!profile) {
      showToast({ variant: "error", message: "Выберите профиль Метрики." });
      return;
    }
    try {
      const created = await createImport({
        file,
        provider,
        profile,
        name: importName.trim() || undefined,
      }).unwrap();
      setSelectedImportId(created.id);
      setIsAddDialogOpen(false);
      setFile(null);
      setImportName("");
      await refetchImports();
      await refetchRows();
      showToast({ variant: "success", message: "Импорт успешно добавлен." });
    } catch (error) {
      const response = error as { data?: { message?: string } };
      showToast({ variant: "error", message: response.data?.message ?? "Не удалось добавить импорт." });
    }
  };

  const handleStartCreateMissing = async () => {
    if (!effectiveSelectedImportId) {
      showToast({ variant: "error", message: "Выберите импорт." });
      return;
    }
    try {
      const response = await startCreateMissing({ importId: effectiveSelectedImportId }).unwrap();
      setJobId(response.jobId);
      setJobImportId(effectiveSelectedImportId);
      showToast({ variant: "success", message: "Создание недостающих счетчиков запущено." });
    } catch (error) {
      const response = error as { data?: { message?: string } };
      showToast({ variant: "error", message: response.data?.message ?? "Не удалось запустить массовое создание." });
    }
  };

  const handleRenameImport = async () => {
    if (!effectiveSelectedImportId) {
      showToast({ variant: "error", message: "Выберите импорт." });
      return;
    }
    const nextName = editImportName.trim();
    if (!nextName) {
      showToast({ variant: "error", message: "Введите название импорта." });
      return;
    }
    try {
      await updateImport({ importId: effectiveSelectedImportId, name: nextName }).unwrap();
      await refetchImports();
      setIsEditDialogOpen(false);
      showToast({ variant: "success", message: "Название импорта обновлено." });
    } catch (error) {
      const response = error as { data?: { message?: string } };
      showToast({ variant: "error", message: response.data?.message ?? "Не удалось обновить название импорта." });
    }
  };

  const handleDeleteImport = async () => {
    if (!effectiveSelectedImportId) {
      showToast({ variant: "error", message: "Выберите импорт." });
      return;
    }
    try {
      await deleteImport({ importId: effectiveSelectedImportId }).unwrap();
      if (jobImportId === effectiveSelectedImportId) {
        setJobId(null);
        setJobImportId(null);
      }
      setSelectedImportId("");
      setPage(0);
      setIsEditDialogOpen(false);
      await refetchImports();
      await refetchRows();
      showToast({ variant: "success", message: "Импорт удален." });
    } catch (error) {
      const response = error as { data?: { message?: string } };
      showToast({ variant: "error", message: response.data?.message ?? "Не удалось удалить импорт." });
    }
  };

  const handleCreateRow = async (rowId: number) => {
    if (!effectiveSelectedImportId) {
      showToast({ variant: "error", message: "Выберите импорт." });
      return;
    }
    if (activeRowIdSet.has(rowId)) {
      return;
    }
    setActiveRowIds((prev) => [...prev, rowId]);
    try {
      const response = await createImportRow({
        importId: effectiveSelectedImportId,
        rowId,
      }).unwrap();
      if (response.status === MetricsCounterImportRowStatus.FAILED) {
        showToast({ variant: "error", message: response.errorMessage ?? "Не удалось создать счетчик." });
      } else if (response.status === MetricsCounterImportRowStatus.ALREADY_EXISTS) {
        showToast({ variant: "success", message: "Счетчик уже существует." });
      } else {
        showToast({ variant: "success", message: "Счетчик успешно создан." });
      }
      await refetchRows();
      await refetchImports();
      await onRefreshCounters?.();
    } catch (error) {
      const response = error as { data?: { message?: string } };
      showToast({ variant: "error", message: response.data?.message ?? "Не удалось обработать строку." });
    } finally {
      setActiveRowIds((prev) => prev.filter((value) => value !== rowId));
    }
  };

  const isProgressVisible = Boolean(
    jobId && jobImportId === effectiveSelectedImportId && (!currentStatus || isJobInProgress(currentStatus.status)),
  );
  const selectedImport = imports.find((item) => item.id === effectiveSelectedImportId) ?? null;
  const allRowsProcessed = Boolean(
    selectedImport &&
      selectedImport.rowsTotal > 0 &&
      selectedImport.rowsCreated + selectedImport.rowsAlreadyExists >= selectedImport.rowsTotal,
  );

  if (!profile) {
    return <PlaceholderText>Выберите профиль в верхнем сайдбаре.</PlaceholderText>;
  }

  return (
    <PageRoot>
      <FormStack>
        <FormCard>
          <ControlsRow>
            <LeftControls>
              <CompactField>
                <FieldLabel>Импорт</FieldLabel>
                <SelectControl
                  value={effectiveSelectedImportId}
                  onValueChange={setSelectedImportId}
                  options={importOptions}
                  placeholder={importOptions.length ? "Выберите импорт" : "Импорты отсутствуют"}
                  disabled={!importOptions.length || isImportsLoading}
                />
              </CompactField>
              <Button
                type="button"
                onClick={() => {
                  setEditImportName(selectedImport?.name ?? "");
                  setIsEditDialogOpen(true);
                }}
                disabled={!effectiveSelectedImportId}
              >
                Редактировать импорт
              </Button>
              <Button type="button" onClick={() => setIsAddDialogOpen(true)}>
                Добавить импорт
              </Button>
            </LeftControls>
            <RightControls>
              <Button
                type="button"
                variant="primary"
                onClick={handleStartCreateMissing}
                disabled={!effectiveSelectedImportId || isCreateMissingLoading || isJobActive || allRowsProcessed}
              >
                {isCreateMissingLoading ? "Запуск..." : "Создать недостающие счетчики"}
              </Button>
            </RightControls>
          </ControlsRow>
        </FormCard>

        {isProgressVisible ? (
          <ProgressCard>
            <ProgressLine>
              <strong>Статус:</strong> {currentStatus?.status === MetricsCounterBulkJobStatus.RUNNING ? "В обработке" : "В очереди"}
              {" · "}
              <strong>Этап:</strong> {currentStatus ? (STAGE_LABELS[currentStatus.stage] ?? currentStatus.stage) : "Валидация"}
              {" · "}
              <strong>Прогресс:</strong> {currentStatus ? `${currentStatus.progressPercent}% (${currentStatus.processedRows}/${currentStatus.totalRows})` : "0% (0/0)"}
            </ProgressLine>
            <ProgressBarTrack>
              <ProgressBarValue $progress={currentStatus?.progressPercent ?? 0} />
            </ProgressBarTrack>
          </ProgressCard>
        ) : null}

        {!effectiveSelectedImportId ? (
          <PlaceholderText>Выберите импорт для отображения данных.</PlaceholderText>
        ) : isRowsLoading ? (
          <PlaceholderText>Загрузка строк импорта...</PlaceholderText>
        ) : (
          <>
            <TableWrapper>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Название</TableHeaderCell>
                    <TableHeaderCell>Регистратор</TableHeaderCell>
                    <TableHeaderCell>Профиль</TableHeaderCell>
                    <TableHeaderCell>Домен</TableHeaderCell>
                    <TableHeaderCell>Статус</TableHeaderCell>
                    <TableHeaderCell>Номер счетчика</TableHeaderCell>
                    <TableHeaderCell>Действия</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7}>Нет данных для отображения.</TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row) => {
                      const isRowLoading = activeRowIdSet.has(row.id);
                      const isCreated = row.status === MetricsCounterImportRowStatus.CREATED || row.status === MetricsCounterImportRowStatus.ALREADY_EXISTS;
                      return (
                        <TableRow key={row.id}>
                          <TableCell>{row.counterName}</TableCell>
                          <TableCell>{getMetricsProviderTypeLabel(row.provider)}</TableCell>
                          <TableCell>{row.profile}</TableCell>
                          <TableCell>{row.domain}</TableCell>
                          <TableCell>
                            <StatusBadge data-variant={row.status} title={row.errorMessage ?? undefined}>
                              {formatRowStatus(row.status)}
                            </StatusBadge>
                          </TableCell>
                          <TableCell>{row.counterId ?? "—"}</TableCell>
                          <TableCell>
                            <RowActionIconButton
                              type="button"
                              onClick={() => handleCreateRow(row.id)}
                              disabled={isRowLoading || isJobActive || isCreated}
                              data-loading={isRowLoading}
                              title="Создать счетчик для строки"
                              aria-label="Создать счетчик для строки"
                            >
                              <FaPlus />
                            </RowActionIconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableWrapper>
            <PaginationControls
              page={page}
              totalPages={totalPages}
              pageSize={pageSize}
              pageSizeOptions={pageSizeOptions}
              isFetching={isRowsFetching}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
      </FormStack>

      <ModalDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        title="Добавить импорт"
        contentWidth="480px"
      >
        <AddModalBody>
          <HiddenFileInput ref={fileInputRef} type="file" accept=".xlsx" onChange={handleFileChange} disabled={isCreateImportLoading} />
          <AddModalField>
            <FieldLabel>Название импорта (опционально)</FieldLabel>
            <AddModalNameInput
              value={importName}
              onChange={(event) => setImportName(event.target.value)}
              placeholder="По умолчанию: UTC timestamp"
              disabled={isCreateImportLoading}
            />
          </AddModalField>
          <AddModalField>
            <FieldLabel>Excel-файл</FieldLabel>
            <AddModalFilePickerRow>
              <Button type="button" onClick={() => fileInputRef.current?.click()} disabled={isCreateImportLoading}>
                Выбрать .xlsx
              </Button>
              <AddModalHint>{file ? file.name : "Файл не выбран"}</AddModalHint>
            </AddModalFilePickerRow>
          </AddModalField>
          <DialogActions>
            <Button
              type="button"
              onClick={() => {
                setIsAddDialogOpen(false);
                setFile(null);
                setImportName("");
              }}
              disabled={isCreateImportLoading}
            >
              Отмена
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleCreateImport}
              disabled={isCreateImportLoading || !file}
            >
              {isCreateImportLoading ? "Добавление..." : "Добавить импорт"}
            </Button>
          </DialogActions>
        </AddModalBody>
      </ModalDialog>

      <ModalDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        title="Редактировать импорт"
        contentWidth="480px"
      >
        <AddModalBody>
          <AddModalField>
            <FieldLabel>Название импорта</FieldLabel>
            <AddModalNameInput
              value={editImportName}
              onChange={(event) => setEditImportName(event.target.value)}
              placeholder="Название импорта"
              disabled={isUpdateImportLoading || isDeleteImportLoading}
            />
          </AddModalField>
          <EditDialogActions>
            <DangerButton
              type="button"
              onClick={handleDeleteImport}
              disabled={!effectiveSelectedImportId || isUpdateImportLoading || isDeleteImportLoading}
            >
              {isDeleteImportLoading ? "Удаление..." : "Удалить импорт"}
            </DangerButton>
            <EditDialogRight>
              <Button
                type="button"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={isUpdateImportLoading || isDeleteImportLoading}
              >
                Отмена
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleRenameImport}
                disabled={!effectiveSelectedImportId || isUpdateImportLoading || isDeleteImportLoading}
              >
                {isUpdateImportLoading ? "Сохранение..." : "Сохранить"}
              </Button>
            </EditDialogRight>
          </EditDialogActions>
        </AddModalBody>
      </ModalDialog>
    </PageRoot>
  );
};

const formatRowStatus = (status: MetricsCounterImportRowStatus): string => {
  if (status === MetricsCounterImportRowStatus.CREATED) {
    return "Создан";
  }
  if (status === MetricsCounterImportRowStatus.ALREADY_EXISTS) {
    return "Уже существует";
  }
  if (status === MetricsCounterImportRowStatus.FAILED) {
    return "Ошибка";
  }
  return "Не создан";
};

const PageRoot = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const ControlsRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 12px;
`;

const LeftControls = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 8px;
  min-width: 0;
  flex: 1;
`;

const RightControls = styled.div`
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  align-items: flex-end;
  flex-shrink: 0;
`;

const CompactField = styled(FormField)`
  min-width: 260px;
`;

const StatusBadge = styled.span`
  display: inline-flex;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 12px;

  &[data-variant="CREATED"] {
    background: #ecfdf3;
    color: #027a48;
  }

  &[data-variant="ALREADY_EXISTS"] {
    background: #f4f3ff;
    color: #5925dc;
  }

  &[data-variant="FAILED"] {
    background: #fef3f2;
    color: #b42318;
  }

  &[data-variant="PENDING"] {
    background: #f9fafb;
    color: #344054;
  }
`;

const ProgressCard = styled(FormCard)`
  padding-top: 12px;
  padding-bottom: 12px;
`;

const ProgressLine = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.tokens.color.textSecondary};
`;

const ProgressBarTrack = styled.div`
  width: 100%;
  height: 8px;
  border-radius: 999px;
  background: #e7eef9;
  overflow: hidden;
  margin-top: 8px;
`;

const ProgressBarValue = styled.div<{ $progress: number }>`
  height: 100%;
  width: ${({ $progress }) => `${Math.max(0, Math.min(100, $progress))}%`};
  background: linear-gradient(90deg, #2563eb 0%, #3b82f6 100%);
  transition: width 0.25s ease;
`;

const AddModalBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const HiddenFileInput = styled.input`
  display: none;
`;

const AddModalField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const AddModalNameInput = styled(StyledInput)`
  width: 300px;
`;

const AddModalFilePickerRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 34px;
`;

const AddModalHint = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.tokens.color.textSecondary};
`;

const DialogActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
`;

const EditDialogActions = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
`;

const EditDialogRight = styled.div`
  display: flex;
  gap: 8px;
`;

const DangerButton = styled(Button)`
  background: #fef3f2;
  border-color: #fecaca;
  color: #b42318;

  &:hover:not(:disabled) {
    background: #fee4e2;
    border-color: #fda29b;
    color: #912018;
  }
`;

const RowActionIconButton = styled(Button)`
  width: 34px;
  height: 34px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  &[data-loading="true"] svg {
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;
