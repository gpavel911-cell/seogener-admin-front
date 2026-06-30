"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { FaCircleNotch, FaMagnifyingGlass, FaPlay, FaPlus } from "react-icons/fa6";
import styled, { keyframes } from "styled-components";
import { useGetWebmasterHostsBulkDnsPageQuery, useGetWebmasterHostsBulkDnsStatusMutation, useCreateWebmasterHostsBulkTxtMutation, useStartWebmasterHostsBulkDnsVerificationMutation } from "@entities/webmaster/api";
import { WebmasterHostDnsTxtState, WebmasterProviderType, type WebmasterHostBulkDnsRequest, type WebmasterHostBulkDnsRowResponse } from "@entities/webmaster/types";
import { useRegistrarSelectOptions } from "@entities/registrars/select-options";
import { RegistrarProviderType } from "@entities/registrars/types";
import { useDebouncedSearchQuery } from "@shared/lib/use-debounced-search-query";
import { usePagination } from "@shared/lib/use-pagination";
import { Button, EMPTY_DATA_MESSAGE, FieldLabel, FormCard, FormField, FormFields, FormRow, PlaceholderText, SelectControl, StyledInput, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, useToast } from "@shared/ui";
import { PaginationControls } from "@shared/ui/pagination-controls";

const DEFAULT_PROVIDER = WebmasterProviderType.YANDEX_WEBMASTER;
const COLUMN_COUNT = 7;

type VerifyHostDnsBulkProps = {
  fixedProfile?: string | null;
};

type BulkAction = "status" | "createTxt" | "startVerification";
type StatusVariant = "success" | "warning" | "danger" | "unknown";

type RowStateMap = Record<string, WebmasterHostBulkDnsRowResponse>;

const BULK_ACTIONS: BulkAction[] = ["status", "createTxt", "startVerification"];

const BULK_ACTION_CONFIG: Record<BulkAction, {
  label: string;
  icon: ReactNode;
  successMessage: (count: number) => string;
  failureMessage: string;
}> = {
  status: {
    label: "Проверить статус",
    icon: <FaMagnifyingGlass />,
    successMessage: (count) => `Статус обновлен: ${count}`,
    failureMessage: "Ошибка обновления DNS-статусов.",
  },
  createTxt: {
    label: "Создать TXT-запись",
    icon: <FaPlus />,
    successMessage: (count) => `TXT-записи обработаны: ${count}`,
    failureMessage: "Ошибка создания TXT-записей.",
  },
  startVerification: {
    label: "Запустить проверку",
    icon: <FaPlay />,
    successMessage: (count) => `Проверка запущена: ${count}`,
    failureMessage: "Ошибка запуска проверки DNS-прав.",
  },
};

const VERIFICATION_STATUS_VARIANTS: Record<string, StatusVariant> = {
  VERIFIED: "success",
  IN_PROGRESS: "warning",
  VERIFICATION_FAILED: "danger",
};

const VERIFICATION_STATUS_LABELS: Record<string, string> = {
  VERIFIED: "Подтверждено",
  IN_PROGRESS: "Проверяется",
  NONE: "Не запущено",
  VERIFICATION_FAILED: "Проверка не пройдена",
};

export const VerifyHostDnsBulk = ({ fixedProfile }: VerifyHostDnsBulkProps = {}) => {
  const { showToast } = useToast();
  const { page, pageSize, pageSizeOptions, setPage, setPageSize } = usePagination();
  const { search, setSearch, query } = useDebouncedSearchQuery();
  const [activeRegistrar, setActiveRegistrar] = useState<RegistrarProviderType | null>(null);
  const [activeRegistrarProfile, setActiveRegistrarProfile] = useState<string | null>(null);
  const [selectedHostIds, setSelectedHostIds] = useState<string[]>([]);
  const [rowStateByHostId, setRowStateByHostId] = useState<RowStateMap>({});
  const [activeRowActionByHostId, setActiveRowActionByHostId] = useState<Record<string, BulkAction | null>>({});

  const {
    registrarGroups,
    resolvedRegistrar,
    resolvedProfile: resolvedRegistrarProfile,
    registrarOptions,
    profileOptions: registrarProfileOptions,
    isProfilesFetching: isRegistrarProfilesFetching,
  } = useRegistrarSelectOptions({
    activeRegistrar,
    activeProfile: activeRegistrarProfile,
    preferredRegistrar: RegistrarProviderType.REG_RU,
    includeDomains: false,
  });

  const hostsQueryArgs = fixedProfile && resolvedRegistrar && resolvedRegistrarProfile
    ? {
        provider: DEFAULT_PROVIDER,
        profile: fixedProfile,
        registrar: resolvedRegistrar,
        registrarProfile: resolvedRegistrarProfile,
        pageNumber: page,
        pageSize,
        query,
      }
    : undefined;
  const { data, isLoading, isFetching } = useGetWebmasterHostsBulkDnsPageQuery(hostsQueryArgs!, { skip: !hostsQueryArgs });
  const [loadBulkStatus, { isLoading: isStatusLoading }] = useGetWebmasterHostsBulkDnsStatusMutation();
  const [createBulkTxt, { isLoading: isCreateTxtLoading }] = useCreateWebmasterHostsBulkTxtMutation();
  const [startBulkVerification, { isLoading: isStartVerificationLoading }] = useStartWebmasterHostsBulkDnsVerificationMutation();

  const rows = useMemo(() => data?.content ?? [], [data?.content]);
  const totalPages = data?.totalPages ?? 0;
  const selectedSet = useMemo(() => new Set(selectedHostIds), [selectedHostIds]);
  const hasRegistrarProfile = Boolean(resolvedRegistrarProfile);

  useEffect(() => {
    if (registrarGroups.length === 0) {
      if (activeRegistrar !== null) {
        setActiveRegistrar(null);
      }
      if (activeRegistrarProfile !== null) {
        setActiveRegistrarProfile(null);
      }
      return;
    }

    const preferredGroup = registrarGroups.find((group) => group.registrar === RegistrarProviderType.REG_RU);
    const fallbackGroup = preferredGroup ?? registrarGroups[0];
    const currentGroup = activeRegistrar
      ? registrarGroups.find((group) => group.registrar === activeRegistrar)
      : null;
    const nextGroup = currentGroup ?? fallbackGroup;

    if (activeRegistrar !== nextGroup.registrar) {
      setActiveRegistrar(nextGroup.registrar);
      return;
    }

    if (!activeRegistrarProfile || !nextGroup.profiles.includes(activeRegistrarProfile)) {
      setActiveRegistrarProfile(nextGroup.profiles[0] ?? null);
    }
  }, [activeRegistrar, activeRegistrarProfile, registrarGroups]);

  useEffect(() => {
    setSelectedHostIds([]);
  }, [page, pageSize, fixedProfile, query]);

  useEffect(() => {
    setPage(0);
  }, [query, setPage]);

  useEffect(() => {
    if (rows.length === 0) {
      setRowStateByHostId({});
      return;
    }
    setRowStateByHostId(indexRows(rows));
  }, [rows]);

  const allVisibleSelectable = rows.filter((row) => isRowSelectable(row)).map((row) => row.hostId);
  const allVisibleRowsSelected = allVisibleSelectable.length > 0 && allVisibleSelectable.every((hostId) => selectedSet.has(hostId));
  const someVisibleRowsSelected = allVisibleSelectable.some((hostId) => selectedSet.has(hostId));
  const showTableSkeleton = isLoading && rows.length === 0;

  const selectedRows = rows.filter((row) => selectedSet.has(row.hostId));
  const eligibleHostIdsByAction = useMemo(
    () =>
      BULK_ACTIONS.reduce<Record<BulkAction, string[]>>((acc, action) => {
        acc[action] = selectedRows
          .filter((row) => isActionEnabled(rowStateByHostId[row.hostId], action, hasRegistrarProfile))
          .map((row) => row.hostId);
        return acc;
      }, { status: [], createTxt: [], startVerification: [] }),
    [hasRegistrarProfile, rowStateByHostId, selectedRows],
  );

  const eligibleCounts = useMemo(
    () =>
      BULK_ACTIONS.reduce<Record<BulkAction, number>>((acc, action) => {
        acc[action] = eligibleHostIdsByAction[action].length;
        return acc;
      }, { status: 0, createTxt: 0, startVerification: 0 }),
    [eligibleHostIdsByAction],
  );

  const isActionRunning = isStatusLoading || isCreateTxtLoading || isStartVerificationLoading;

  const runAction = async (action: BulkAction, hostIds: string[], rowActionHostId?: string) => {
    if (!fixedProfile || !resolvedRegistrar || !resolvedRegistrarProfile) {
      showToast({ variant: "error", message: "Сначала выберите профиль регистратора." });
      return;
    }
    if (hostIds.length === 0) {
      return;
    }
    if (rowActionHostId) {
      setActiveRowActionByHostId((prev) => ({ ...prev, [rowActionHostId]: action }));
    }
    const request: WebmasterHostBulkDnsRequest = {
      provider: DEFAULT_PROVIDER,
      profile: fixedProfile,
      registrar: resolvedRegistrar,
      registrarProfile: resolvedRegistrarProfile,
      hostIds,
    };
    try {
      const rows = await (
        action === "status"
          ? loadBulkStatus(request)
          : action === "createTxt"
          ? createBulkTxt(request)
          : startBulkVerification(request)
      ).unwrap();
      setRowStateByHostId((prev) => ({ ...prev, ...indexRows(rows) }));
      const failures = rows.filter((row) => row.error);
      if (failures.length > 0) {
        showToast({ variant: "error", message: `Операция завершена с ошибками: ${failures.length}` });
      } else {
        showToast({ variant: "success", message: BULK_ACTION_CONFIG[action].successMessage(hostIds.length) });
      }
    } catch {
      showToast({ variant: "error", message: BULK_ACTION_CONFIG[action].failureMessage });
    } finally {
      if (rowActionHostId) {
        setActiveRowActionByHostId((prev) => ({ ...prev, [rowActionHostId]: null }));
      }
    }
  };

  const toggleVisibleRows = (checked: boolean) => {
    setSelectedHostIds((prev) => {
      const next = new Set(prev);
      for (const hostId of allVisibleSelectable) {
        if (checked) {
          next.add(hostId);
        } else {
          next.delete(hostId);
        }
      }
      return Array.from(next);
    });
  };

  const shouldShowEmptyState = !isLoading && rows.length === 0;

  return (
    <Root>
      <FormCard>
        <FormRow>
          <FormFields>
            <FormField>
              <FieldLabel>Регистратор</FieldLabel>
              <SelectControl
                value={activeRegistrar ?? ""}
                onValueChange={(value) => {
                  const nextRegistrar = value as RegistrarProviderType;
                  setActiveRegistrar(nextRegistrar || null);
                  const nextProfiles = registrarGroups.find((group) => group.registrar === nextRegistrar)?.profiles ?? [];
                  setActiveRegistrarProfile(nextProfiles[0] ?? null);
                }}
                disabled={isRegistrarProfilesFetching}
                options={registrarOptions}
                placeholder="Выберите регистратора"
              />
            </FormField>
            <FormField>
              <FieldLabel>Профиль регистратора</FieldLabel>
              <SelectControl
                value={activeRegistrarProfile ?? ""}
                onValueChange={(value) => {
                  setActiveRegistrarProfile(value || null);
                }}
                disabled={!resolvedRegistrar}
                options={registrarProfileOptions}
                placeholder="Выберите профиль"
              />
            </FormField>
            <FormField>
              <FieldLabel>Поиск по сайту</FieldLabel>
              <StyledInput
                id="webmaster-bulk-domain-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Введите сайт"
              />
            </FormField>
          </FormFields>
          <BulkActions>
            {BULK_ACTIONS.map((action) => (
              <Button
                key={action}
                type="button"
                variant="primary"
                disabled={eligibleCounts[action] === 0 || isActionRunning}
                onClick={() => void runAction(action, eligibleHostIdsByAction[action])}
              >
                {BULK_ACTION_CONFIG[action].label} ({eligibleCounts[action]})
              </Button>
            ))}
          </BulkActions>
        </FormRow>
      </FormCard>

      <ContentSection>
        {showTableSkeleton ? (
          <TableSkeletonCard aria-hidden="true">
            <TableSkeletonHeader />
            {Array.from({ length: 5 }, (_, index) => (
              <TableSkeletonRow key={index}>
                <SkeletonLine $width="16px" $height={16} />
                <SkeletonLine $width="28%" />
                <SkeletonLine $width="16%" />
                <SkeletonLine $width="18%" />
                <SkeletonLine $width="14%" />
                <SkeletonLine $width="14%" />
                <SkeletonLine $width="88px" $height={34} />
              </TableSkeletonRow>
            ))}
          </TableSkeletonCard>
        ) : shouldShowEmptyState ? (
          <PlaceholderCard>{EMPTY_DATA_MESSAGE}</PlaceholderCard>
        ) : (
          <>
            <TableLoadingWrap>
              <TableShell>
                <BulkDnsTable aria-busy={isFetching}>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>
                        <HeaderCheckbox
                          checked={allVisibleRowsSelected}
                          indeterminate={someVisibleRowsSelected && !allVisibleRowsSelected}
                          disabled={isActionRunning}
                          onChange={(event) => toggleVisibleRows(event.target.checked)}
                        />
                      </TableHeaderCell>
                      <TableHeaderCell>Сайт</TableHeaderCell>
                      <TableHeaderCell>Состояние</TableHeaderCell>
                      <TableHeaderCell>Verification UIN</TableHeaderCell>
                      <TableHeaderCell>TXT-запись</TableHeaderCell>
                      <TableHeaderCell>Статус</TableHeaderCell>
                      <TableHeaderCell />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((row) => {
                      const state = rowStateByHostId[row.hostId];
                      const rowAction = activeRowActionByHostId[row.hostId];
                      const disabledReasonByAction = BULK_ACTIONS.reduce<Record<BulkAction, string | null>>((acc, action) => {
                        acc[action] = getDisabledReason(state, action, hasRegistrarProfile);
                        return acc;
                      }, { status: null, createTxt: null, startVerification: null });
                      return (
                        <TableRow key={row.hostId}>
                          <TableCell>
                            <Checkbox
                              type="checkbox"
                              checked={selectedSet.has(row.hostId)}
                              disabled={!isRowSelectable(row) || isActionRunning}
                              onChange={(event) => {
                                setSelectedHostIds((prev) => {
                                  if (event.target.checked) {
                                    return prev.includes(row.hostId) ? prev : [...prev, row.hostId];
                                  }
                                  return prev.filter((value) => value !== row.hostId);
                                });
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <SiteCell>
                              <div>{state?.hostUrl ?? row.hostUrl ?? row.hostId}</div>
                            </SiteCell>
                          </TableCell>
                          <TableCell>
                            <StateBadge $variant={resolveStateVariant(state)}>
                              {formatVerificationState(state)}
                            </StateBadge>
                          </TableCell>
                          <TableCell>{state?.verificationUin ?? "—"}</TableCell>
                          <TableCell>
                            <TxtBadge $variant={resolveTxtVariant(state)}>
                              {formatTxtState(state)}
                            </TxtBadge>
                          </TableCell>
                          <TableCell>
                            <StatusBadge $variant={resolveStatusVariant(state)}>
                              {formatVerificationStatusLabel(state)}
                            </StatusBadge>
                          </TableCell>
                          <TableCell>
                            <ActionsCell>
                              <InlineActions>
                                {BULK_ACTIONS.map((action) => (
                                  <ActionIconButton
                                    key={action}
                                    type="button"
                                    data-tooltip={disabledReasonByAction[action] ?? BULK_ACTION_CONFIG[action].label}
                                    aria-label={`${BULK_ACTION_CONFIG[action].label} для ${row.hostUrl ?? row.hostId}`}
                                    onClick={() => void runAction(action, [row.hostId], row.hostId)}
                                    disabled={Boolean(disabledReasonByAction[action]) || isActionRunning}
                                  >
                                    {rowAction === action ? <SpinningIcon /> : BULK_ACTION_CONFIG[action].icon}
                                  </ActionIconButton>
                                ))}
                              </InlineActions>
                            </ActionsCell>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {!isLoading && rows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={COLUMN_COUNT}>{EMPTY_DATA_MESSAGE}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </BulkDnsTable>
              </TableShell>
              {isFetching ? <TableLoadingOverlay>Загрузка сайтов...</TableLoadingOverlay> : null}
            </TableLoadingWrap>

            <PaginationControls
              page={page}
              totalPages={totalPages}
              pageSize={pageSize}
              pageSizeOptions={pageSizeOptions}
              isFetching={isFetching}
              disabled={isActionRunning}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
      </ContentSection>
    </Root>
  );
};

function isRowSelectable(row: WebmasterHostBulkDnsRowResponse) {
  return Boolean(row.hostId);
}

function isActionEnabled(
  state: WebmasterHostBulkDnsRowResponse | undefined,
  action: BulkAction,
  hasRegistrarProfile: boolean,
) {
  return getDisabledReason(state, action, hasRegistrarProfile) === null;
}

function getDisabledReason(
  state: WebmasterHostBulkDnsRowResponse | undefined,
  action: BulkAction,
  hasRegistrarProfile: boolean,
) {
  if (!hasRegistrarProfile) {
    return "Выберите профиль регистратора.";
  }
  if (action === "status") {
    return null;
  }
  if (!state) {
    return "Сначала проверьте статус.";
  }
  if (state.error) {
    return "Сначала обновите статус без ошибок.";
  }
  if (isVerifiedState(state)) {
    return "Права уже подтверждены.";
  }
  if (!state.verificationUin) {
    return "Verification UIN отсутствует.";
  }
  if (action === "createTxt") {
    if (state.txtRecordState === WebmasterHostDnsTxtState.PRESENT) {
      return "TXT-запись уже присутствует.";
    }
    return null;
  }
  if (state.txtRecordState !== WebmasterHostDnsTxtState.PRESENT) {
    return "Сначала создайте TXT-запись.";
  }
  return null;
}

function indexRows(rows: WebmasterHostBulkDnsRowResponse[]): RowStateMap {
  return rows.reduce<RowStateMap>((acc, row) => {
    acc[row.hostId] = row;
    return acc;
  }, {});
}

function resolveStateVariant(state: WebmasterHostBulkDnsRowResponse | undefined) {
  if (isVerifiedState(state)) return "success";
  if (state?.error) return "danger";
  return "warning";
}

function resolveTxtVariant(state: WebmasterHostBulkDnsRowResponse | undefined) {
  if (!state) return "unknown";
  if (state.txtRecordState === WebmasterHostDnsTxtState.PRESENT) return "success";
  if (state.txtRecordState === WebmasterHostDnsTxtState.ABSENT) return "danger";
  return "unknown";
}

function resolveStatusVariant(state: WebmasterHostBulkDnsRowResponse | undefined) {
  const status = normalizeVerificationStatus(state?.verificationState);
  return status ? (VERIFICATION_STATUS_VARIANTS[status] ?? "unknown") : "unknown";
}

function formatVerificationState(state: WebmasterHostBulkDnsRowResponse | undefined) {
  if (isVerifiedState(state)) return "Подтверждено";
  if (state?.error) return "Ошибка";
  return "Не подтверждено";
}

function formatTxtState(state: WebmasterHostBulkDnsRowResponse | undefined) {
  if (!state) return "—";
  if (state.txtRecordState === WebmasterHostDnsTxtState.PRESENT) return "Присутствует";
  if (state.txtRecordState === WebmasterHostDnsTxtState.ABSENT) return "Отсутствует";
  return "Неизвестно";
}

function formatVerificationStatusLabel(state: WebmasterHostBulkDnsRowResponse | undefined) {
  const status = normalizeVerificationStatus(state?.verificationState);
  if (!status) return "Нет данных";
  return VERIFICATION_STATUS_LABELS[status] ?? status;
}

function isVerifiedState(state: WebmasterHostBulkDnsRowResponse | undefined) {
  return state?.verified === true || normalizeVerificationStatus(state?.verificationState) === "VERIFIED";
}

function normalizeVerificationStatus(value?: string | null) {
  return value?.toUpperCase() ?? null;
}

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

const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
`;

const ContentSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
`;

const PlaceholderCard = styled(PlaceholderText)`
  border: 1px solid #dbe5f3;
  background: #ffffff;
  border-radius: 14px;
  padding: 24px;
`;

const BulkActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  flex: 1 1 auto;
  justify-content: flex-end;
  margin-left: auto;
`;

const Checkbox = styled.input`
  width: 16px;
  height: 16px;
  accent-color: #2563eb;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
`;

const TableLoadingWrap = styled.div`
  position: relative;
`;

const TableLoadingOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.72);
  color: #334155;
  font-size: 14px;
  font-weight: 600;
  backdrop-filter: blur(1px);
  pointer-events: all;
`;

const TableShell = styled.div`
  overflow-x: hidden;
  background: #ffffff;
  border-radius: 14px;
  border: 1px solid #dbe5f3;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.04);
`;

const BulkDnsTable = styled(Table)`
  table-layout: fixed;
  min-width: 0;

  ${TableHeaderCell}:nth-child(1),
  ${TableCell}:nth-child(1) {
    width: 48px;
    padding-left: 12px;
    padding-right: 8px;
    text-align: center;
  }

  ${TableHeaderCell}:nth-child(2),
  ${TableCell}:nth-child(2) {
    white-space: normal;
    word-break: break-word;
  }

  ${TableHeaderCell}:nth-child(7),
  ${TableCell}:nth-child(7) {
    width: 88px;
  }
`;

const SiteCell = styled.div`
  display: flex;
  flex-direction: column;
`;

const badgeStyles = `
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 12px;
`;

const StateBadge = styled.span<{ $variant: "success" | "warning" | "danger" | "unknown" }>`
  ${badgeStyles}
  background: ${({ $variant }) =>
    $variant === "success" ? "#ecfdf3" : $variant === "warning" ? "#fff7ed" : $variant === "danger" ? "#fef2f2" : "#f1f5f9"};
  color: ${({ $variant }) =>
    $variant === "success" ? "#027a48" : $variant === "warning" ? "#c2410c" : $variant === "danger" ? "#b42318" : "#475569"};
`;

const TxtBadge = styled(StateBadge)``;

const StatusBadge = styled(StateBadge)``;

const ActionsCell = styled.div`
  display: flex;
  justify-content: flex-end;
  width: 100%;
`;

const InlineActions = styled.div`
  display: flex;
  gap: 6px;
  justify-content: flex-end;
  flex-wrap: nowrap;
`;

const ActionIconButton = styled(Button).attrs({
  variant: "secondary",
})`
  position: relative;
  width: 34px;
  min-width: 34px;
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

const spin = keyframes`
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
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
  grid-template-columns: 24px 1.6fr 0.9fr 0.9fr 0.9fr 0.9fr 88px;
  gap: 12px;
  align-items: center;
`;

const SkeletonLine = styled.span<{ $width: string; $height?: number }>`
  display: block;
  width: ${({ $width }) => $width};
  height: ${({ $height = 14 }) => `${$height}px`};
  border-radius: 999px;
  background: linear-gradient(90deg, #e2e8f0 0%, #f8fafc 50%, #e2e8f0 100%);
  animation: ${shimmer} 1.2s ease-in-out infinite;
`;

const SpinningIcon = styled(FaCircleNotch)`
  animation: ${spin} 0.9s linear infinite;
`;
