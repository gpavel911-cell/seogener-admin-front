"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import { FaArrowsRotate, FaCartPlus } from "react-icons/fa6";
import styled from "styled-components";
import { formatDateTime } from "@pages/registrars/lib/formatters";
import {
  useCreateDomainMatrixImportMutation,
  useCheckDomainMatrixImportAvailabilityMutation,
  useDeleteDomainMatrixImportMutation,
  useGenerateDomainMatrixImportMutation,
  useGetDomainMatrixImportRowsQuery,
  useGetDomainMatrixImportsQuery,
  useGetDomainMatrixJobStatusQuery,
  useGetRegistrarProfilesQuery,
  usePurchaseDomainMatrixImportMutation,
  usePurchaseDomainMatrixRowMutation,
  useRegenerateDomainMatrixRowMutation,
  useUpdateDomainMatrixImportMutation,
} from "@entities/registrars/api";
import {
  DomainMatrixJobStage,
  DomainMatrixJobStatus,
  DomainMatrixPurchaseItemStatus,
  DomainMatrixRowStatus,
  RegistrarProviderType,
} from "@entities/registrars/types";
import { usePagination } from "@shared/lib/use-pagination";
import { PaginationControls } from "@shared/ui/pagination-controls";
import { ModalDialog } from "@shared/ui-kit/modal-dialog";
import {
  Button,
  FieldLabel,
  FormCard,
  FormField,
  FormStack,
  ImportXlsxField,
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

const STAGE_LABELS: Record<DomainMatrixJobStage, string> = {
  [DomainMatrixJobStage.VALIDATING]: "Валидация",
  [DomainMatrixJobStage.PROCESSING]: "Обработка",
  [DomainMatrixJobStage.WRITING]: "Сохранение",
  [DomainMatrixJobStage.FINALIZING]: "Финализация",
};

const isJobInProgress = (status?: DomainMatrixJobStatus): boolean =>
  status === DomainMatrixJobStatus.QUEUED || status === DomainMatrixJobStatus.RUNNING;

const ACTIVE_GENERATION_STORAGE_KEY = "domain-matrix-active-generation";

type ActiveGenerationPayload = {
  jobId: string;
  importId: string;
};

const readActiveGeneration = (): ActiveGenerationPayload | null => {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(ACTIVE_GENERATION_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as ActiveGenerationPayload;
    if (!parsed?.jobId || !parsed?.importId) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const writeActiveGeneration = (payload: ActiveGenerationPayload | null) => {
  if (typeof window === "undefined") {
    return;
  }
  if (!payload) {
    window.localStorage.removeItem(ACTIVE_GENERATION_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(ACTIVE_GENERATION_STORAGE_KEY, JSON.stringify(payload));
};

const getRowStatusLabel = (status?: DomainMatrixRowStatus): string => {
  switch (status) {
    case DomainMatrixRowStatus.UNRESOLVED:
      return "Не сгенерирован";
    case DomainMatrixRowStatus.AVAILABLE:
      return "Не куплен";
    case DomainMatrixRowStatus.UNAVAILABLE:
      return "Недоступен";
    case DomainMatrixRowStatus.PURCHASED:
      return "Куплен";
    default:
      return "Не куплен";
  }
};

const getRowStatusVariant = (status?: DomainMatrixRowStatus): "neutral" | "success" | "danger" => {
  switch (status) {
    case DomainMatrixRowStatus.PURCHASED:
      return "success";
    case DomainMatrixRowStatus.UNAVAILABLE:
      return "danger";
    default:
      return "danger";
  }
};

type DomainMatrixPageProps = {
  fixedProfileId?: string | null;
  hideTitle?: boolean;
  onNestedDialogOpenChange?: (open: boolean) => void;
};

export function DomainMatrixPage({
  fixedProfileId = null,
  hideTitle = false,
  onNestedDialogOpenChange,
}: DomainMatrixPageProps) {
  const { page, pageSize, pageSizeOptions, setPage, setPageSize } = usePagination();
  const [file, setFile] = useState<File | null>(null);
  const [importName, setImportName] = useState("");
  const [selectedImportId, setSelectedImportId] = useState("");
  const [jobId, setJobId] = useState<string | null>(() => readActiveGeneration()?.jobId ?? null);
  const [generationImportId, setGenerationImportId] = useState<string | null>(() => readActiveGeneration()?.importId ?? null);
  const [purchaseJobId, setPurchaseJobId] = useState<string | null>(null);
  const [purchaseImportId, setPurchaseImportId] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editImportName, setEditImportName] = useState("");
  const [regeneratingRowIds, setRegeneratingRowIds] = useState<number[]>([]);
  const [purchasingRowIds, setPurchasingRowIds] = useState<number[]>([]);
  const finishedJobRef = useRef<string | null>(null);
  const finishedPurchaseJobRef = useRef<string | null>(null);
  const onNestedDialogOpenChangeRef = useRef(onNestedDialogOpenChange);
  onNestedDialogOpenChangeRef.current = onNestedDialogOpenChange;
  const { showToast } = useToast();

  useEffect(() => {
    onNestedDialogOpenChangeRef.current?.(isAddDialogOpen || isEditDialogOpen);
    return () => onNestedDialogOpenChangeRef.current?.(false);
  }, [isAddDialogOpen, isEditDialogOpen]);

  const profilesQuery = useGetRegistrarProfilesQuery();
  const {
    data: importsData,
    isLoading: isImportsLoading,
    refetch: refetchImports,
  } = useGetDomainMatrixImportsQuery();

  const [createImport, { isLoading: isUploading }] = useCreateDomainMatrixImportMutation();
  const [generateImport, { isLoading: isGenerating }] = useGenerateDomainMatrixImportMutation();
  const [checkAvailability, { isLoading: isCheckingAvailability }] = useCheckDomainMatrixImportAvailabilityMutation();
  const [purchaseImport, { isLoading: isPurchasingImport }] = usePurchaseDomainMatrixImportMutation();
  const [updateImport, { isLoading: isRenaming }] = useUpdateDomainMatrixImportMutation();
  const [deleteImport, { isLoading: isDeleting }] = useDeleteDomainMatrixImportMutation();
  const [regenerateRow] = useRegenerateDomainMatrixRowMutation();
  const [purchaseRow] = usePurchaseDomainMatrixRowMutation();

  const statusQuery = useGetDomainMatrixJobStatusQuery(jobId ? { jobId } : skipToken, {
    pollingInterval: jobId ? 4000 : 0,
    refetchOnMountOrArgChange: true,
  });
  const status = statusQuery.data;
  const currentStatus = status && jobId && status.jobId === jobId ? status : undefined;
  const isJobActive = isJobInProgress(currentStatus?.status);
  const purchaseStatusQuery = useGetDomainMatrixJobStatusQuery(purchaseJobId ? { jobId: purchaseJobId } : skipToken, {
    pollingInterval: purchaseJobId ? 4000 : 0,
    refetchOnMountOrArgChange: true,
  });
  const purchaseStatus = purchaseStatusQuery.data;
  const currentPurchaseStatus = purchaseStatus && purchaseJobId && purchaseStatus.jobId === purchaseJobId ? purchaseStatus : undefined;
  const isPurchaseJobActive = isJobInProgress(currentPurchaseStatus?.status);

  const profileOptions = useMemo(
    () =>
      (profilesQuery.data ?? [])
        .filter((item) => item.registrar === RegistrarProviderType.REG_RU)
        .map((item) => ({ value: item.profile, label: item.profile })),
    [profilesQuery.data],
  );
  const effectiveSelectedProfileId = useMemo(() => {
    if (fixedProfileId) return fixedProfileId;
    return profileOptions[0]?.value ?? "";
  }, [fixedProfileId, profileOptions]);

  const imports = useMemo(() => importsData ?? [], [importsData]);
  const importsForProfile = useMemo(
    () => imports.filter((item) => item.profile === effectiveSelectedProfileId && item.registrar === RegistrarProviderType.REG_RU),
    [effectiveSelectedProfileId, imports],
  );
  const effectiveSelectedImportId = useMemo(
    () => {
      if (selectedImportId && importsForProfile.some((item) => item.id === selectedImportId)) {
        return selectedImportId;
      }
      return importsForProfile[0]?.id ?? "";
    },
    [importsForProfile, selectedImportId],
  );
  const importOptions = useMemo(
    () =>
      importsForProfile.map((item) => ({
        value: item.id,
        label: `${item.name} (${formatDateTime(item.createdAt)})`,
      })),
    [importsForProfile],
  );
  const selectedImport = useMemo(
    () => importsForProfile.find((item) => item.id === effectiveSelectedImportId) ?? null,
    [effectiveSelectedImportId, importsForProfile],
  );
  const rowsQueryArgs = effectiveSelectedImportId
    ? { importId: effectiveSelectedImportId, pageNumber: page, pageSize }
    : skipToken;
  const {
    data: rowsData,
    isLoading: isRowsLoading,
    isFetching: isRowsFetching,
    refetch: refetchRows,
  } = useGetDomainMatrixImportRowsQuery(rowsQueryArgs);
  const rows = useMemo(() => rowsData?.content ?? [], [rowsData?.content]);
  const totalPages = rowsData?.totalPages ?? 0;
  const regeneratingRowIdSet = useMemo(() => new Set(regeneratingRowIds), [regeneratingRowIds]);
  const purchasingRowIdSet = useMemo(() => new Set(purchasingRowIds), [purchasingRowIds]);
  const resolvedAvailableCount = selectedImport?.rowsWithDomain ?? rows.filter((row) => Boolean(row.domain?.trim())).length;
  const totalCount = selectedImport?.rowsTotal ?? rows.length;
  const totalPrice = useMemo(
    () => Number(selectedImport?.totalPrice ?? rows.reduce((sum, row) => sum + Number(row.price ?? 0), 0)),
    [rows, selectedImport?.totalPrice],
  );
  const isProgressVisible = Boolean(
    jobId &&
      generationImportId &&
      generationImportId === effectiveSelectedImportId &&
      (!currentStatus || isJobInProgress(currentStatus.status)),
  );
  const isPurchaseProgressVisible = Boolean(
    purchaseJobId &&
      purchaseImportId &&
      purchaseImportId === effectiveSelectedImportId &&
      (!currentPurchaseStatus || isJobInProgress(currentPurchaseStatus.status)),
  );

  const clearActiveGenerationState = () => {
    setGenerationImportId(null);
    setJobId(null);
    writeActiveGeneration(null);
  };
  const clearActivePurchaseState = () => {
    setPurchaseImportId(null);
    setPurchaseJobId(null);
  };

  const refreshTableData = useCallback(async () => {
    await refetchImports();
    await refetchRows();
  }, [refetchImports, refetchRows]);

  useEffect(() => {
    if (!jobId || !status || status.jobId !== jobId || finishedJobRef.current === jobId) return;
    if (status.status === DomainMatrixJobStatus.COMPLETED) {
      finishedJobRef.current = jobId;
      clearActiveGenerationState();
      showToast({ variant: "success", message: "Генерация завершена." });
      void refreshTableData();
      return;
    }
    if (status.status === DomainMatrixJobStatus.FAILED) {
      finishedJobRef.current = jobId;
      clearActiveGenerationState();
      showToast({ variant: "error", message: status.latestError ?? "Ошибка генерации доменов." });
    }
  }, [jobId, refreshTableData, showToast, status]);

  useEffect(() => {
    if (!jobId || !statusQuery.error) {
      return;
    }
    clearActiveGenerationState();
  }, [jobId, statusQuery.error]);

  useEffect(() => {
    if (!purchaseJobId || !purchaseStatus || purchaseStatus.jobId !== purchaseJobId || finishedPurchaseJobRef.current === purchaseJobId) return;
    if (purchaseStatus.status === DomainMatrixJobStatus.COMPLETED) {
      finishedPurchaseJobRef.current = purchaseJobId;
      clearActivePurchaseState();
      showToast({ variant: "success", message: "Покупка завершена." });
      void refreshTableData();
      return;
    }
    if (purchaseStatus.status === DomainMatrixJobStatus.FAILED) {
      finishedPurchaseJobRef.current = purchaseJobId;
      clearActivePurchaseState();
      showToast({ variant: "error", message: purchaseStatus.latestError ?? "Ошибка покупки доменов." });
      void refreshTableData();
    }
  }, [purchaseJobId, purchaseStatus, refreshTableData, showToast]);

  useEffect(() => {
    if (!purchaseJobId || !purchaseStatusQuery.error) {
      return;
    }
    clearActivePurchaseState();
  }, [purchaseJobId, purchaseStatusQuery.error]);

  const handleUpload = async () => {
    if (!file) {
      showToast({ variant: "error", message: "Выберите входной .xlsx файл." });
      return;
    }
    if (!effectiveSelectedProfileId) {
      showToast({ variant: "error", message: "Выберите профиль Reg.ru." });
      return;
    }
    try {
      const created = await createImport({
        file,
        profileId: effectiveSelectedProfileId,
        name: importName.trim() || undefined,
      }).unwrap();
      setSelectedImportId(created.id);
      setPage(0);
      setImportName("");
      setFile(null);
      setIsAddDialogOpen(false);
      await refreshTableData();
      showToast({ variant: "success", message: "Импорт успешно загружен." });
    } catch {
      showToast({ variant: "error", message: "Не удалось загрузить импорт." });
    }
  };

  const handleGenerate = async () => {
    if (!effectiveSelectedImportId) {
      showToast({ variant: "error", message: "Выберите импорт." });
      return;
    }
    try {
      const response = await generateImport({ importId: effectiveSelectedImportId }).unwrap();
      setJobId(response.jobId);
      setGenerationImportId(effectiveSelectedImportId);
      writeActiveGeneration({ jobId: response.jobId, importId: effectiveSelectedImportId });
      finishedJobRef.current = null;
      showToast({ variant: "success", message: "Генерация запущена." });
    } catch {
      showToast({ variant: "error", message: "Не удалось запустить генерацию." });
    }
  };

  const handleCheckAvailability = async () => {
    if (!effectiveSelectedImportId) {
      showToast({ variant: "error", message: "Выберите импорт." });
      return;
    }
    try {
      const response = await checkAvailability({ importId: effectiveSelectedImportId }).unwrap();
      setJobId(response.jobId);
      setGenerationImportId(effectiveSelectedImportId);
      writeActiveGeneration({ jobId: response.jobId, importId: effectiveSelectedImportId });
      finishedJobRef.current = null;
      showToast({ variant: "success", message: "Проверка доступности и цен запущена." });
    } catch {
      showToast({ variant: "error", message: "Не удалось запустить проверку доступности и цен." });
    }
  };

  const handlePurchaseAll = async () => {
    if (!effectiveSelectedImportId) {
      showToast({ variant: "error", message: "Выберите импорт." });
      return;
    }
    try {
      const response = await purchaseImport({ importId: effectiveSelectedImportId }).unwrap();
      setPurchaseJobId(response.jobId);
      setPurchaseImportId(effectiveSelectedImportId);
      finishedPurchaseJobRef.current = null;
      showToast({ variant: "success", message: "Покупка запущена." });
    } catch {
      showToast({ variant: "error", message: "Не удалось запустить покупку доменов." });
    }
  };

  const handleDelete = async () => {
    if (!effectiveSelectedImportId) {
      showToast({ variant: "error", message: "Выберите импорт." });
      return;
    }
    try {
      await deleteImport({ importId: effectiveSelectedImportId }).unwrap();
      if (generationImportId === effectiveSelectedImportId) {
        clearActiveGenerationState();
      }
      setSelectedImportId("");
      setPage(0);
      await refreshTableData();
      setIsEditDialogOpen(false);
      showToast({ variant: "success", message: "Импорт удален." });
    } catch {
      showToast({ variant: "error", message: "Не удалось удалить импорт." });
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
      await refreshTableData();
      setIsEditDialogOpen(false);
      showToast({ variant: "success", message: "Название импорта обновлено." });
    } catch {
      showToast({ variant: "error", message: "Не удалось обновить название импорта." });
    }
  };

  const handleSelectImport = (importId: string) => {
    setSelectedImportId(importId);
    setPage(0);
  };

  const handleRegenerate = async (rowId: number) => {
    if (regeneratingRowIdSet.has(rowId)) return;
    setRegeneratingRowIds((prev) => [...prev, rowId]);
    try {
      await regenerateRow({ rowId }).unwrap();
      await refreshTableData();
      showToast({ variant: "success", message: "Домен перегенерирован." });
    } catch {
      showToast({ variant: "error", message: "Не удалось перегенерировать домен." });
    } finally {
      setRegeneratingRowIds((prev) => prev.filter((item) => item !== rowId));
    }
  };

  const handlePurchaseRow = async (rowId: number) => {
    if (purchasingRowIdSet.has(rowId)) return;
    setPurchasingRowIds((prev) => [...prev, rowId]);
    try {
      const response = await purchaseRow({ rowId }).unwrap();
      await refreshTableData();
      if (response.status === DomainMatrixPurchaseItemStatus.SUCCESS) {
        showToast({ variant: "success", message: "Домен куплен." });
      } else if (response.status === DomainMatrixPurchaseItemStatus.SKIPPED) {
        showToast({ variant: "success", message: "Покупка пропущена: домен уже куплен или не готов." });
      } else {
        showToast({ variant: "error", message: "Не удалось купить домен." });
      }
    } catch {
      showToast({ variant: "error", message: "Не удалось купить домен." });
    } finally {
      setPurchasingRowIds((prev) => prev.filter((item) => item !== rowId));
    }
  };

  return (
    <PageRoot>
      {!hideTitle ? <PageTitle>Генерация доменов</PageTitle> : null}
      <FormStack>
        <FormCard>
          <ControlsStack>
            <ImportRow>
              <ImportSelectorWrap>
                <FieldLabel>Импорт</FieldLabel>
                <SelectControl
                  value={effectiveSelectedImportId}
                  onValueChange={handleSelectImport}
                  options={importOptions}
                  placeholder={importOptions.length ? "Выберите импорт" : "Импорты отсутствуют"}
                  disabled={!importOptions.length || isImportsLoading}
                />
              </ImportSelectorWrap>
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
              <Button
                type="button"
                onClick={() => setIsAddDialogOpen(true)}
                disabled={!effectiveSelectedProfileId || isUploading}
              >
                Добавить импорт
              </Button>
            </ImportRow>
            <ActionsRow>
              <Button
                type="button"
                variant="primary"
                onClick={handleCheckAvailability}
                disabled={!effectiveSelectedImportId || isGenerating || isCheckingAvailability || isJobActive || isPurchaseJobActive}
              >
                {isCheckingAvailability ? "Запуск..." : "Проверить доступность и цены"}
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleGenerate}
                disabled={!effectiveSelectedImportId || isGenerating || isCheckingAvailability || isJobActive || isPurchaseJobActive}
              >
                {isGenerating ? "Запуск..." : "Сгенерировать недостающие домены"}
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handlePurchaseAll}
                disabled={!effectiveSelectedImportId || isPurchasingImport || isJobActive || isPurchaseJobActive}
              >
                {isPurchasingImport ? "Запуск..." : "Купить некупленные домены"}
              </Button>
            </ActionsRow>
          </ControlsStack>
        </FormCard>

        {isProgressVisible ? (
          <ProgressCard>
            <ProgressBlock>
              <ProgressLine>
                <strong>Статус:</strong> {currentStatus?.status === DomainMatrixJobStatus.RUNNING ? "В обработке" : "В очереди"}
                {" · "}
                <strong>Этап:</strong> {currentStatus ? (STAGE_LABELS[currentStatus.stage] ?? currentStatus.stage) : "Валидация"}
                {" · "}
                <strong>Прогресс:</strong> {currentStatus ? `${currentStatus.progressPercent}% (${currentStatus.processedCells}/${currentStatus.totalCells})` : "0% (0/0)"}
              </ProgressLine>
              <ProgressBarTrack>
                <ProgressBarValue $progress={currentStatus?.progressPercent ?? 0} />
              </ProgressBarTrack>
            </ProgressBlock>
          </ProgressCard>
        ) : null}

        {isPurchaseProgressVisible ? (
          <ProgressCard>
            <ProgressBlock>
              <ProgressLine>
                <strong>Покупка:</strong> {currentPurchaseStatus?.status === DomainMatrixJobStatus.RUNNING ? "В обработке" : "В очереди"}
                {" · "}
                <strong>Этап:</strong> {currentPurchaseStatus ? (STAGE_LABELS[currentPurchaseStatus.stage] ?? currentPurchaseStatus.stage) : "Валидация"}
                {" · "}
                <strong>Прогресс:</strong> {currentPurchaseStatus ? `${currentPurchaseStatus.progressPercent}% (${currentPurchaseStatus.processedCells}/${currentPurchaseStatus.totalCells})` : "0% (0/0)"}
              </ProgressLine>
              <ProgressBarTrack>
                <ProgressBarValue $progress={currentPurchaseStatus?.progressPercent ?? 0} />
              </ProgressBarTrack>
            </ProgressBlock>
          </ProgressCard>
        ) : null}

        {!effectiveSelectedImportId ? (
          <PlaceholderText>Выберите импорт для отображения данных таблицы.</PlaceholderText>
        ) : isRowsLoading ? (
          <PlaceholderText>Загрузка строк импорта...</PlaceholderText>
        ) : (
          <>
            <TableWrapper>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Фраза 1</TableHeaderCell>
                    <TableHeaderCell>Фраза 2</TableHeaderCell>
                    <TableHeaderCell>{`Домен (${resolvedAvailableCount}/${totalCount})`}</TableHeaderCell>
                    <TableHeaderCell>{`Цена (${formatMoney(totalPrice)})`}</TableHeaderCell>
                    <TableHeaderCell>Статус</TableHeaderCell>
                    <TableHeaderCell>Действие</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6}>Нет данных для отображения.</TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row) => {
                      const isRowRegenerating = regeneratingRowIdSet.has(row.id);
                      const isRowPurchasing = purchasingRowIdSet.has(row.id);
                      const hasResolvedDomain = Boolean(row.domain?.trim());
                      const isRowPurchased = row.rowStatus === DomainMatrixRowStatus.PURCHASED;
                      const isRowUnavailable = row.rowStatus === DomainMatrixRowStatus.UNAVAILABLE;
                      return (
                        <DomainDataRow key={row.id} data-unresolved={hasResolvedDomain ? "false" : "true"}>
                          <TableCell>{row.phrase1}</TableCell>
                          <TableCell>{row.phrase2}</TableCell>
                          <TableCell>{hasResolvedDomain ? row.domain : "—"}</TableCell>
                          <TableCell>{row.price == null ? "—" : formatMoney(row.price)}</TableCell>
                          <TableCell>
                            <RowStatusBadge data-variant={getRowStatusVariant(row.rowStatus)}>
                              {getRowStatusLabel(row.rowStatus)}
                            </RowStatusBadge>
                          </TableCell>
                          <TableCell>
                            <ActionButtonsRow>
                              <ActionIconButton
                                type="button"
                                onClick={() => handleRegenerate(row.id)}
                                disabled={isRowRegenerating || isPurchaseJobActive || isJobActive}
                                title="Перегенерировать домен"
                                aria-label="Перегенерировать домен"
                                data-loading={isRowRegenerating}
                              >
                                <FaArrowsRotate />
                              </ActionIconButton>
                              <ActionIconButton
                                type="button"
                                onClick={() => handlePurchaseRow(row.id)}
                                disabled={isRowPurchasing || isRowPurchased || isRowUnavailable || !hasResolvedDomain || isPurchaseJobActive || isJobActive}
                                title="Купить домен"
                                aria-label="Купить домен"
                                data-loading={isRowPurchasing}
                              >
                                <FaCartPlus />
                              </ActionIconButton>
                            </ActionButtonsRow>
                          </TableCell>
                        </DomainDataRow>
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
        <CompactModalBody>
          <CompactField>
            <FieldLabel>Название импорта (опционально)</FieldLabel>
            <ModalNameInput
              value={importName}
              onChange={(event) => setImportName(event.target.value)}
              placeholder="По умолчанию: UTC timestamp"
              disabled={isUploading}
            />
          </CompactField>
          <ImportXlsxField
            templateFilename="registrars-generate-domains-template.xlsx"
            file={file}
            onFileChange={setFile}
            disabled={isUploading}
          />
          <DialogActions>
            <Button
              type="button"
              onClick={() => {
                setIsAddDialogOpen(false);
                setImportName("");
                setFile(null);
              }}
              disabled={isUploading}
            >
              Отмена
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleUpload}
              disabled={isUploading || !file || !effectiveSelectedProfileId}
            >
              {isUploading ? "Добавление..." : "Добавить импорт"}
            </Button>
          </DialogActions>
        </CompactModalBody>
      </ModalDialog>
      <ModalDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        title="Редактировать импорт"
        contentWidth="480px"
      >
        <CompactModalBody>
          <CompactField>
            <FieldLabel>Название импорта</FieldLabel>
            <ModalNameInput
              value={editImportName}
              onChange={(event) => setEditImportName(event.target.value)}
              placeholder="Название импорта"
              disabled={isRenaming || isDeleting}
            />
          </CompactField>
          <EditDialogActions>
            <DangerButton
              type="button"
              onClick={handleDelete}
              disabled={!effectiveSelectedImportId || isRenaming || isDeleting}
            >
              {isDeleting ? "Удаление..." : "Удалить импорт"}
            </DangerButton>
            <EditDialogRight>
              <Button
                type="button"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={isRenaming || isDeleting}
              >
                Отмена
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleRenameImport}
                disabled={!effectiveSelectedImportId || isRenaming || isDeleting}
              >
                {isRenaming ? "Сохранение..." : "Сохранить"}
              </Button>
            </EditDialogRight>
          </EditDialogActions>
        </CompactModalBody>
      </ModalDialog>
    </PageRoot>
  );
}

const formatMoney = (value: number): string =>
  `${value.toLocaleString("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} ₽`;

const PageRoot = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const ControlsStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ImportRow = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 8px;
  min-width: 0;
`;

const ImportSelectorWrap = styled(FormField)`
  max-width: 420px;
  width: 100%;
  min-width: 0;
`;

const ActionsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;

  button {
    width: 100%;
    min-width: 0;
    white-space: nowrap;
  }
`;

const ProgressBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
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
`;

const ProgressBarValue = styled.div<{ $progress: number }>`
  height: 100%;
  width: ${({ $progress }) => `${Math.max(0, Math.min(100, $progress))}%`};
  background: linear-gradient(90deg, #2563eb 0%, #3b82f6 100%);
  transition: width 0.25s ease;
`;

const DialogActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
`;

const CompactModalBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const CompactField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const ModalNameInput = styled(StyledInput)`
  width: 300px;
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

const DomainDataRow = styled(TableRow)`
  &[data-unresolved="true"] ${TableCell} {
    background: #fff7f7;
  }

  &[data-unresolved="true"]:hover ${TableCell} {
    background: #ffecec;
  }
`;

const RowStatusBadge = styled.span`
  display: inline-flex;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 12px;
  line-height: 1;

  &[data-variant="success"] {
    background: #ecfdf3;
    color: #027a48;
  }

  &[data-variant="danger"] {
    background: #fef3f2;
    color: #b42318;
  }

  &[data-variant="neutral"] {
    background: #f2f4f7;
    color: #667085;
  }
`;

const ActionButtonsRow = styled.div`
  display: inline-flex;
  gap: 6px;
`;

const ActionIconButton = styled(Button)`
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
