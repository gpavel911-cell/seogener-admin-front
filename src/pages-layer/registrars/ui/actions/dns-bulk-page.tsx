"use client";

import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import { FaPlus } from "react-icons/fa6";
import styled from "styled-components";
import {
  useCheckDnsBulkImportAMutation,
  useCheckDnsBulkImportNsMutation,
  useCheckDnsBulkImportTxtMutation,
  useCreateDnsBulkRecordsMutation,
  useCreateDnsBulkImportMutation,
  useDeleteDnsBulkImportMutation,
  useGenerateDnsBulkImportAMutation,
  useGenerateDnsBulkImportNsMutation,
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
  onNestedDialogOpenChange?: (open: boolean) => void;
};

export function DnsBulkPage({
  recordType,
  fixedRegistrar = null,
  fixedProfile = null,
  hideTitle = false,
  onNestedDialogOpenChange,
}: DnsBulkPageProps) {
  const { page, pageSize, pageSizeOptions, setPage, setPageSize } = usePagination();
  const [activeRegistrar, setActiveRegistrar] = useState<RegistrarProviderType | null>(null);
  const [activeProfile, setActiveProfile] = useState<string | null>(null);
  const [selectedImportId, setSelectedImportId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [importName, setImportName] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobImportId, setJobImportId] = useState<string | null>(null);
  const [jobOperationType, setJobOperationType] = useState<"generate" | "check">("generate");
  const [activeRowIds, setActiveRowIds] = useState<number[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editImportName, setEditImportName] = useState("");
  const onNestedDialogOpenChangeRef = useRef(onNestedDialogOpenChange);
  onNestedDialogOpenChangeRef.current = onNestedDialogOpenChange;
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
  const [createDnsBulkRecords] = useCreateDnsBulkRecordsMutation();
  const [generateA, { isLoading: isGenerateALoading }] = useGenerateDnsBulkImportAMutation();
  const [generateNs, { isLoading: isGenerateNsLoading }] = useGenerateDnsBulkImportNsMutation();
  const [generateTxt, { isLoading: isGenerateTxtLoading }] = useGenerateDnsBulkImportTxtMutation();
  const [checkA, { isLoading: isCheckALoading }] = useCheckDnsBulkImportAMutation();
  const [checkNs, { isLoading: isCheckNsLoading }] = useCheckDnsBulkImportNsMutation();
  const [checkTxt, { isLoading: isCheckTxtLoading }] = useCheckDnsBulkImportTxtMutation();
  const [updateImport, { isLoading: isUpdateImportLoading }] = useUpdateDnsBulkImportMutation();
  const [deleteImport, { isLoading: isDeleteImportLoading }] = useDeleteDnsBulkImportMutation();

  const statusQuery = useGetDnsBulkJobStatusQuery(jobId ? { jobId } : skipToken, {
    pollingInterval: jobId ? 4000 : 0,
    refetchOnMountOrArgChange: true,
  });
  const status = statusQuery.data;
  const currentStatus = status && jobId && status.jobId === jobId ? status : undefined;
  const isJobActive = isJobInProgress(currentStatus?.status);

  useEffect(() => {
    onNestedDialogOpenChangeRef.current?.(isAddDialogOpen || isEditDialogOpen);
    return () => onNestedDialogOpenChangeRef.current?.(false);
  }, [isAddDialogOpen, isEditDialogOpen]);

  useEffect(() => {
    if (!status || !jobId || status.jobId !== jobId) return;
    if (status.status === DnsBulkJobStatus.COMPLETED) {
      const timer = setTimeout(() => {
        setJobId(null);
        setJobImportId(null);
      }, 0);
      const completedLabel = jobOperationType === "check" ? "Массовая проверка" : "Массовое создание";
      if (status.failedRows > 0) {
        showToast({
          variant: "error",
          message: `${completedLabel} завершена с ошибками. Ошибок: ${status.failedRows}.`,
        });
      } else {
        showToast({ variant: "success", message: `${completedLabel} завершена.` });
      }
      void refetchImports();
      void refetchRows();
      return () => clearTimeout(timer);
    }
    if (status.status === DnsBulkJobStatus.FAILED) {
      const timer = setTimeout(() => {
        setJobId(null);
        setJobImportId(null);
      }, 0);
      showToast({
        variant: "error",
        message: status.latestError ?? (jobOperationType === "check" ? "Ошибка массовой проверки." : "Ошибка массового создания."),
      });
      void refetchImports();
      void refetchRows();
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [jobId, jobOperationType, refetchImports, refetchRows, showToast, status]);

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
      setJobOperationType("generate");
      const response = recordType === DnsBulkRecordType.A
        ? await generateA({ importId: effectiveSelectedImportId }).unwrap()
        : recordType === DnsBulkRecordType.TXT
          ? await generateTxt({ importId: effectiveSelectedImportId }).unwrap()
          : await generateNs({ importId: effectiveSelectedImportId }).unwrap();
      setJobId(response.jobId);
      setJobImportId(effectiveSelectedImportId);
      showToast({ variant: "success", message: "Массовое создание запущено." });
    } catch {
      showToast({ variant: "error", message: "Не удалось запустить массовое создание." });
    }
  };

  const handleCheck = async () => {
    if (!effectiveSelectedImportId) {
      showToast({ variant: "error", message: "Выберите импорт." });
      return;
    }
    try {
      setJobOperationType("check");
      const response = recordType === DnsBulkRecordType.A
        ? await checkA({ importId: effectiveSelectedImportId }).unwrap()
        : recordType === DnsBulkRecordType.TXT
          ? await checkTxt({ importId: effectiveSelectedImportId }).unwrap()
          : await checkNs({ importId: effectiveSelectedImportId }).unwrap();
      setJobId(response.jobId);
      setJobImportId(effectiveSelectedImportId);
      showToast({ variant: "success", message: "Массовая проверка запущена." });
    } catch {
      showToast({ variant: "error", message: "Не удалось запустить массовую проверку." });
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
    if (!resolvedRegistrar || !resolvedProfile) {
      showToast({ variant: "error", message: "Выберите регистратора и профиль." });
      return;
    }
    const row = rows.find((item) => item.id === rowId);
    if (!row) {
      showToast({ variant: "error", message: "Строка не найдена." });
      return;
    }
    setActiveRowIds((prev) => [...prev, rowId]);
    try {
      const response = await createDnsBulkRecords({
        registrar: resolvedRegistrar,
        profileId: resolvedProfile,
        recordType,
        rows: [
          {
            domain: row.domain,
            host: recordType === DnsBulkRecordType.NS ? undefined : row.host,
            ipv4: recordType === DnsBulkRecordType.A ? (row.ipv4 ?? undefined) : undefined,
            text: recordType === DnsBulkRecordType.TXT ? (row.text ?? undefined) : undefined,
          },
        ],
      }).unwrap();
      const first = response.rows[0];
      if (!first || first.status === DnsBulkRowStatus.FAILED) {
        showToast({ variant: "error", message: first?.error ?? "Не удалось обработать запись." });
      } else if (first.status === DnsBulkRowStatus.SKIPPED) {
        showToast({ variant: "success", message: "Запись уже существует." });
      } else {
        showToast({ variant: "success", message: "Запись успешно обработана." });
      }
      await refetchRows();
      await refetchImports();
    } catch {
      showToast({ variant: "error", message: "Не удалось обработать запись." });
    } finally {
      setActiveRowIds((prev) => prev.filter((value) => value !== rowId));
    }
  };

  const isProgressVisible = Boolean(
    jobId && jobImportId === effectiveSelectedImportId && (!currentStatus || isJobInProgress(currentStatus.status)),
  );
  const isGenerateLoading = isGenerateALoading || isGenerateTxtLoading || isGenerateNsLoading;
  const isCheckLoading = isCheckALoading || isCheckTxtLoading || isCheckNsLoading;
  const actionTitle = recordType === DnsBulkRecordType.A
    ? "Создать А-записи"
    : recordType === DnsBulkRecordType.TXT
      ? "Создать TXT-записи"
      : "Создать NS-записи";
  const checkButtonLabel = recordType === DnsBulkRecordType.A
    ? "Проверить А-записи"
    : recordType === DnsBulkRecordType.TXT
      ? "Проверить TXT-записи"
      : "Проверить NS-записи";
  const generateButtonLabel = recordType === DnsBulkRecordType.A
    ? "Создать недостающие А-записи"
    : recordType === DnsBulkRecordType.TXT
      ? "Создать недостающие TXT-записи"
      : "Создать недостающие NS-записи";
  const supportsIpv4 = recordType === DnsBulkRecordType.A;
  const supportsText = recordType === DnsBulkRecordType.TXT;
  const hostHeaderLabel = recordType === DnsBulkRecordType.NS ? "NS-серверы" : "Хост (поддомен)";
  const selectedImport = imports.find((item) => item.id === effectiveSelectedImportId) ?? null;
  const allRowsCreated = Boolean(
    selectedImport &&
      selectedImport.rowsTotal > 0 &&
      selectedImport.rowsSuccess + selectedImport.rowsSkipped >= selectedImport.rowsTotal,
  );
  const isAddImportLoading = isCreateImportLoading;
  const isAddImportValid = Boolean(file);

  const handleCloseAddImportDialog = () => {
    setIsAddDialogOpen(false);
    setFile(null);
    setImportName("");
  };

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
                onClick={handleCheck}
                disabled={!effectiveSelectedImportId || isCheckLoading || isJobActive}
              >
                {isCheckLoading ? "Запуск..." : checkButtonLabel}
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleGenerate}
                disabled={!effectiveSelectedImportId || isGenerateLoading || isJobActive || allRowsCreated}
              >
                {isGenerateLoading ? "Запуск..." : generateButtonLabel}
              </Button>
            </RightControls>
          </ControlsRow>
        </FormCard>

        {isProgressVisible ? (
          <ProgressCard>
            <ProgressLine>
              <strong>Статус:</strong> {currentStatus?.status === DnsBulkJobStatus.RUNNING ? "В обработке" : "В очереди"}
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
                    <TableHeaderCell>Домен</TableHeaderCell>
                    {supportsIpv4 ? <TableHeaderCell>IPv4</TableHeaderCell> : null}
                    {supportsText ? <TableHeaderCell>TXT</TableHeaderCell> : null}
                    <TableHeaderCell>{hostHeaderLabel}</TableHeaderCell>
                    <TableHeaderCell>Статус</TableHeaderCell>
                    <TableHeaderCell>Действие</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={supportsIpv4 ? 5 : supportsText ? 5 : 4}>Нет данных для отображения.</TableCell>
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
                          {supportsText ? <TableCell>{row.text ?? "—"}</TableCell> : null}
                          <TableCell>{recordType === DnsBulkRecordType.NS ? "ns1.reg.ru, ns2.reg.ru" : row.host}</TableCell>
                          <TableCell>
                            <StatusBadge data-created={isRecordCreated ? "true" : "false"} title={row.lastError ?? undefined}>
                              {rowStatusLabel}
                            </StatusBadge>
                          </TableCell>
                          <TableCell>
                            <RowActionIconButton
                              type="button"
                              onClick={() => handleCreateRow(row.id)}
                              disabled={isRowLoading || isJobActive || isRecordCreated}
                              data-loading={isRowLoading}
                              title="Обработать строку"
                              aria-label="Обработать строку"
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
          <HiddenFileInput ref={fileInputRef} type="file" accept=".xlsx" onChange={handleFileChange} disabled={isAddImportLoading} />
          <AddModalField>
            <FieldLabel>Название импорта (опционально)</FieldLabel>
            <AddModalNameInput
              value={importName}
              onChange={(event) => setImportName(event.target.value)}
              placeholder="По умолчанию: UTC timestamp"
              disabled={isAddImportLoading}
            />
          </AddModalField>
          <AddModalField>
            <FieldLabel>Excel-файл</FieldLabel>
            <AddModalFilePickerRow>
              <Button type="button" onClick={() => fileInputRef.current?.click()} disabled={isAddImportLoading}>
                Выбрать .xlsx
              </Button>
              <AddModalHint>{file ? file.name : "Файл не выбран"}</AddModalHint>
            </AddModalFilePickerRow>
          </AddModalField>
          <DialogActions>
            <Button
              type="button"
              onClick={handleCloseAddImportDialog}
              disabled={isAddImportLoading}
            >
              Отмена
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleCreateImport}
              disabled={isAddImportLoading || !isAddImportValid}
            >
              {isAddImportLoading ? "Добавление..." : "Добавить импорт"}
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

