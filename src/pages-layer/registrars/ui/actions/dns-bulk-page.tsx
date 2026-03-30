"use client";

import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import { FaPlus } from "react-icons/fa6";
import styled from "styled-components";
import {
  useCreateDnsBulkImportMutation,
  useCreateDnsBulkRowAMutation,
  useCreateDnsBulkRowTxtMutation,
  useDeleteDnsBulkImportMutation,
  useGenerateDnsBulkImportAMutation,
  useGenerateDnsBulkImportTxtMutation,
  useGetDnsBulkImportRowsQuery,
  useGetDnsBulkImportsQuery,
  useGetDnsBulkJobStatusQuery,
  useUpdateDnsBulkImportMutation,
} from "@entities/registrars/api";
import { useRegistrarSelectOptions } from "@entities/registrars/select-options";
import { DnsBulkJobStage, DnsBulkJobStatus, DnsBulkRecordType, DnsBulkRowStatus, type RegistrarProviderType } from "@entities/registrars/types";
import { usePagination } from "@shared/lib/use-pagination";
import { PaginationControls } from "@shared/ui/pagination-controls";
import { ModalDialog } from "@shared/ui-kit/modal-dialog";
import {
  Button,
  FieldLabel,
  FormCard,
  FormField,
  FormStack,
  PageTitle,
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

const STAGE_LABELS: Record<DnsBulkJobStage, string> = {
  [DnsBulkJobStage.VALIDATING]: "Валидация",
  [DnsBulkJobStage.PROCESSING]: "Обработка",
  [DnsBulkJobStage.WRITING]: "Сохранение",
  [DnsBulkJobStage.FINALIZING]: "Финализация",
};

const isJobInProgress = (status?: DnsBulkJobStatus): boolean =>
  status === DnsBulkJobStatus.QUEUED || status === DnsBulkJobStatus.RUNNING;

type DnsBulkPageProps = {
  recordType: DnsBulkRecordType;
  fixedRegistrar?: RegistrarProviderType | null;
  fixedProfile?: string | null;
  hideTitle?: boolean;
};

export function DnsBulkPage({ recordType, fixedRegistrar = null, fixedProfile = null, hideTitle = false }: DnsBulkPageProps) {
  const { page, pageSize, pageSizeOptions, setPage, setPageSize } = usePagination();
  const [activeRegistrar, setActiveRegistrar] = useState<RegistrarProviderType | null>(null);
  const [activeProfile, setActiveProfile] = useState<string | null>(null);
  const [selectedImportId, setSelectedImportId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [importName, setImportName] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobImportId, setJobImportId] = useState<string | null>(null);
  const [activeRowIds, setActiveRowIds] = useState<number[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editImportName, setEditImportName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const {
    registrarGroups,
    resolvedRegistrar,
    resolvedProfile,
    registrarOptions,
    profileOptions: profileSelectOptions,
    isProfilesFetching,
  } = useRegistrarSelectOptions({
    activeRegistrar,
    activeProfile,
    fixedRegistrar,
    fixedProfile,
    includeDomains: false,
  });

  const importsQueryArgs = resolvedRegistrar && resolvedProfile
    ? { registrar: resolvedRegistrar, profileId: resolvedProfile, recordType }
    : skipToken;
  const {
    data: importsData,
    isLoading: isImportsLoading,
    refetch: refetchImports,
  } = useGetDnsBulkImportsQuery(importsQueryArgs);

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
  } = useGetDnsBulkImportRowsQuery(rowsQueryArgs);

  const rows = useMemo(() => rowsData?.content ?? [], [rowsData?.content]);
  const totalPages = rowsData?.totalPages ?? 0;
  const activeRowIdSet = useMemo(() => new Set(activeRowIds), [activeRowIds]);

  const [createImport, { isLoading: isCreateImportLoading }] = useCreateDnsBulkImportMutation();
  const [generateA, { isLoading: isGenerateALoading }] = useGenerateDnsBulkImportAMutation();
  const [generateTxt, { isLoading: isGenerateTxtLoading }] = useGenerateDnsBulkImportTxtMutation();
  const [createRowA] = useCreateDnsBulkRowAMutation();
  const [createRowTxt] = useCreateDnsBulkRowTxtMutation();
  const [updateImport, { isLoading: isUpdateImportLoading }] = useUpdateDnsBulkImportMutation();
  const [deleteImport, { isLoading: isDeleteImportLoading }] = useDeleteDnsBulkImportMutation();

  const statusQuery = useGetDnsBulkJobStatusQuery(jobId ? { jobId } : skipToken, {
    pollingInterval: jobId ? 4000 : 0,
    refetchOnMountOrArgChange: true,
  });
  const status = statusQuery.data;
  const isJobActive = isJobInProgress(status?.status);

  useEffect(() => {
    if (!status || !jobId) return;
    if (status.status === DnsBulkJobStatus.COMPLETED) {
      setJobId(null);
      setJobImportId(null);
      if (status.failedRows > 0) {
        showToast({
          variant: "error",
          message: `Массовое создание завершено с ошибками. Не создано: ${status.failedRows}.`,
        });
      } else {
        showToast({ variant: "success", message: "Массовое создание завершено." });
      }
      void refetchImports();
      void refetchRows();
      return;
    }
    if (status.status === DnsBulkJobStatus.FAILED) {
      setJobId(null);
      setJobImportId(null);
      showToast({ variant: "error", message: status.latestError ?? "Ошибка массового создания." });
      void refetchImports();
      void refetchRows();
    }
  }, [jobId, refetchImports, refetchRows, showToast, status]);

  useEffect(() => {
    setPage(0);
  }, [effectiveSelectedImportId, setPage]);

  const handleRegistrarChange = (value: RegistrarProviderType | "") => {
    if (!value) {
      setActiveRegistrar(null);
      setActiveProfile(null);
      setSelectedImportId("");
      return;
    }
    const nextGroup = registrarGroups.find((group) => group.registrar === value);
    setActiveRegistrar(value);
    setActiveProfile(nextGroup?.profiles[0] ?? null);
    setSelectedImportId("");
  };

  const handleProfileChange = (value: string) => {
    setActiveProfile(value || null);
    setSelectedImportId("");
  };

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
    if (!resolvedRegistrar || !resolvedProfile) {
      showToast({ variant: "error", message: "Выберите регистратора и профиль." });
      return;
    }
    try {
      const created = await createImport({
        file,
        registrar: resolvedRegistrar,
        profileId: resolvedProfile,
        recordType,
        name: importName.trim() || undefined,
      }).unwrap();
      setSelectedImportId(created.id);
      setIsAddDialogOpen(false);
      setFile(null);
      setImportName("");
      await refetchImports();
      await refetchRows();
      showToast({ variant: "success", message: "Импорт успешно добавлен." });
    } catch {
      showToast({ variant: "error", message: "Не удалось добавить импорт." });
    }
  };

  const handleGenerate = async () => {
    if (!effectiveSelectedImportId) {
      showToast({ variant: "error", message: "Выберите импорт." });
      return;
    }
    try {
      const response = recordType === DnsBulkRecordType.A
        ? await generateA({ importId: effectiveSelectedImportId }).unwrap()
        : await generateTxt({ importId: effectiveSelectedImportId }).unwrap();
      setJobId(response.jobId);
      setJobImportId(effectiveSelectedImportId);
      showToast({ variant: "success", message: "Массовое создание запущено." });
    } catch {
      showToast({ variant: "error", message: "Не удалось запустить массовое создание." });
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
    } catch {
      showToast({ variant: "error", message: "Не удалось обновить название импорта." });
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
    } catch {
      showToast({ variant: "error", message: "Не удалось удалить импорт." });
    }
  };

  const handleCreateRow = async (rowId: number) => {
    if (activeRowIdSet.has(rowId)) return;
    setActiveRowIds((prev) => [...prev, rowId]);
    try {
      if (recordType === DnsBulkRecordType.A) {
        await createRowA({ rowId }).unwrap();
      } else {
        await createRowTxt({ rowId }).unwrap();
      }
      await refetchRows();
      await refetchImports();
      showToast({ variant: "success", message: "Запись успешно обработана." });
    } catch {
      showToast({ variant: "error", message: "Не удалось обработать запись." });
    } finally {
      setActiveRowIds((prev) => prev.filter((value) => value !== rowId));
    }
  };

  const isProgressVisible = Boolean(status && jobImportId === effectiveSelectedImportId && isJobInProgress(status.status));
  const isGenerateLoading = isGenerateALoading || isGenerateTxtLoading;
  const actionTitle = recordType === DnsBulkRecordType.A ? "Создать А-записи" : "Создать TXT-записи";
  const generateButtonLabel =
    recordType === DnsBulkRecordType.A ? "Создать недостающие А-записи" : "Создать недостающие TXT-записи";
  const rowActionLabel = recordType === DnsBulkRecordType.A ? "Создать A" : "Создать TXT";
  const supportsIpv4 = recordType === DnsBulkRecordType.A;
  const selectedImport = imports.find((item) => item.id === effectiveSelectedImportId) ?? null;

  return (
    <PageRoot>
      {!hideTitle ? <PageTitle>{actionTitle}</PageTitle> : null}
      <FormStack>
        <FormCard>
          <ControlsRow>
            <LeftControls>
              {!fixedRegistrar && (
                <CompactField>
                  <FieldLabel>Регистратор</FieldLabel>
                  <SelectControl
                    value={resolvedRegistrar ?? ""}
                    onValueChange={(value) => handleRegistrarChange(value as RegistrarProviderType)}
                    options={registrarOptions}
                    placeholder="Выберите регистратора"
                    disabled={isProfilesFetching}
                  />
                </CompactField>
              )}
              {!fixedProfile && (
                <CompactField>
                  <FieldLabel>Профиль</FieldLabel>
                  <SelectControl
                    value={resolvedProfile ?? ""}
                    onValueChange={handleProfileChange}
                    options={profileSelectOptions}
                    placeholder="Выберите профиль"
                    disabled={!resolvedRegistrar}
                  />
                </CompactField>
              )}
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
              <Button type="button" onClick={() => setIsAddDialogOpen(true)} disabled={!resolvedRegistrar || !resolvedProfile}>
                Добавить импорт
              </Button>
            </LeftControls>
            <RightControls>
              <Button
                type="button"
                variant="primary"
                onClick={handleGenerate}
                disabled={!effectiveSelectedImportId || isGenerateLoading || isJobActive}
              >
                {isGenerateLoading ? "Запуск..." : generateButtonLabel}
              </Button>
            </RightControls>
          </ControlsRow>
        </FormCard>

        {isProgressVisible && status ? (
          <ProgressCard>
            <ProgressLine>
              <strong>Статус:</strong> {status.status === DnsBulkJobStatus.RUNNING ? "В обработке" : "В очереди"}
              {" · "}
              <strong>Этап:</strong> {STAGE_LABELS[status.stage] ?? status.stage}
              {" · "}
              <strong>Прогресс:</strong> {status.progressPercent}% ({status.processedRows}/{status.totalRows})
            </ProgressLine>
            <ProgressBarTrack>
              <ProgressBarValue $progress={status.progressPercent} />
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
                    <TableHeaderCell>Домен</TableHeaderCell>
                    {supportsIpv4 ? <TableHeaderCell>IPv4</TableHeaderCell> : null}
                    <TableHeaderCell>Хост (поддомен)</TableHeaderCell>
                    <TableHeaderCell>Статус</TableHeaderCell>
                    <TableHeaderCell>Действие</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={supportsIpv4 ? 5 : 4}>Нет данных для отображения.</TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row) => {
                      const isRowLoading = activeRowIdSet.has(row.id);
                      const isRecordCreated = row.status === DnsBulkRowStatus.SUCCESS || row.status === DnsBulkRowStatus.SKIPPED;
                      const rowStatusLabel =
                        row.status === DnsBulkRowStatus.FAILED
                          ? "Не создана (ошибка)"
                          : isRecordCreated
                            ? "Создана"
                            : "Не создана";
                      return (
                        <TableRow key={row.id}>
                          <TableCell>{row.domain}</TableCell>
                          {supportsIpv4 ? <TableCell>{row.ipv4 ?? "—"}</TableCell> : null}
                          <TableCell>{row.host}</TableCell>
                          <TableCell>
                            <StatusBadge data-created={isRecordCreated ? "true" : "false"} title={row.lastError ?? undefined}>
                              {rowStatusLabel}
                            </StatusBadge>
                          </TableCell>
                          <TableCell>
                            <RowActionIconButton
                              type="button"
                              onClick={() => handleCreateRow(row.id)}
                              disabled={isRowLoading || isJobActive}
                              title={rowActionLabel}
                              aria-label={rowActionLabel}
                              data-loading={isRowLoading}
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
}

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
  min-width: 220px;
`;

const StatusBadge = styled.span`
  display: inline-flex;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 12px;

  &[data-created="true"] {
    background: #ecfdf3;
    color: #027a48;
  }

  &[data-created="false"] {
    background: #fef3f2;
    color: #b42318;
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
