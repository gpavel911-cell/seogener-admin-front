"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { FaChevronDown, FaChevronRight, FaSyncAlt } from "react-icons/fa";
import styled from "styled-components";
import {
  projectsApi,
  useAssignProjectSitesMutation,
  useCreateProjectMutation,
  useGetProjectOptionsQuery,
  useGetProjectSitePagesQuery,
  useGetProjectSitesQuery,
  useRefreshProjectSitePagesMutation,
  useRefreshProjectSitesPagesMutation,
} from "@entities/projects/api";
import type { ProjectSiteDto } from "@entities/projects/types";
import { usePagination } from "@shared/lib/use-pagination";
import { useAppDispatch } from "@shared/store";
import { PaginationControls } from "@shared/ui/pagination-controls";
import {
  Button,
  EMPTY_DATA_MESSAGE,
  ExpandedTableCell,
  ExpandedTableRow,
  PlaceholderText,
  RowToggleButton,
  SelectControl,
  StyledInput,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  useToast,
} from "@shared/ui";
import { ModalDialog } from "@shared/ui-kit/modal-dialog";

type ApiError = { status?: number; data?: { message?: string } };
const ALL_PROJECTS_VALUE = "__all_projects__";
const WITHOUT_PROJECT_VALUE = "__without_project__";
const CREATE_NEW_VALUE = "__create_new__";
const EXPANDED_COLSPAN = 8;

type ProjectsSitesSectionProps = {
  isCreateModalOpen: boolean;
  onCreateModalChange: (open: boolean) => void;
};

export function ProjectsSitesSection({ isCreateModalOpen, onCreateModalChange }: ProjectsSitesSectionProps) {
  const { showToast } = useToast();
  const dispatch = useAppDispatch();
  const { page, pageSize, pageSizeOptions, setPage, setPageSize } = usePagination();
  const [filterProjectId, setFilterProjectId] = useState(ALL_PROJECTS_VALUE);
  const [siteQuery, setSiteQuery] = useState("");
  const [selectedSiteIds, setSelectedSiteIds] = useState<number[]>([]);
  const [expandedSiteIds, setExpandedSiteIds] = useState<number[]>([]);
  const [targetProjectId, setTargetProjectId] = useState(CREATE_NEW_VALUE);
  const [projectName, setProjectName] = useState("");
  const [refreshingSiteId, setRefreshingSiteId] = useState<number | null>(null);

  const { data: projectOptions = [] } = useGetProjectOptionsQuery();
  const siteQueryArgs = useMemo(
    () => ({
      pageNumber: page,
      pageSize,
      ...(filterProjectId !== ALL_PROJECTS_VALUE && filterProjectId !== WITHOUT_PROJECT_VALUE ? { projectId: Number(filterProjectId) } : {}),
      ...(filterProjectId === WITHOUT_PROJECT_VALUE ? { unassigned: true } : {}),
      ...(siteQuery.trim().length > 0 ? { siteQuery: siteQuery.trim() } : {}),
    }),
    [filterProjectId, page, pageSize, siteQuery],
  );
  const { data: sitesData, isLoading, isFetching, error } = useGetProjectSitesQuery(siteQueryArgs);
  const [createProject, { isLoading: isCreatingProject }] = useCreateProjectMutation();
  const [assignProjectSites, { isLoading: isAssigningSites }] = useAssignProjectSitesMutation();
  const [refreshProjectSitePages] = useRefreshProjectSitePagesMutation();
  const [refreshProjectSitesPages, { isLoading: isRefreshingAllSites }] = useRefreshProjectSitesPagesMutation();

  const sites = useMemo(() => sitesData?.content ?? [], [sitesData?.content]);
  const totalPages = sitesData?.totalPages ?? 0;
  const selectedSet = useMemo(() => new Set(selectedSiteIds), [selectedSiteIds]);
  const expandedSet = useMemo(() => new Set(expandedSiteIds), [expandedSiteIds]);

  useEffect(() => {
    if (!error) return;
    const status = (error as ApiError).status;
    showToast({ variant: "error", message: status ? `Ошибка загрузки сайтов (status ${status}).` : "Ошибка загрузки сайтов." });
  }, [error, showToast]);

  useEffect(() => {
    setExpandedSiteIds((prev) => prev.filter((siteId) => sites.some((site) => site.siteId === siteId)));
  }, [sites]);

  const handleCreateModalChange = (open: boolean) => {
    onCreateModalChange(open);
    if (!open) {
      setTargetProjectId(CREATE_NEW_VALUE);
      setProjectName("");
    }
  };

  const resetVisibleSelectionState = () => {
    setSelectedSiteIds([]);
    setExpandedSiteIds([]);
  };

  const handleSubmitAddToProject = async () => {
    if (selectedSiteIds.length === 0) {
      showToast({ variant: "error", message: "Выберите хотя бы один сайт." });
      return;
    }
    if (targetProjectId === CREATE_NEW_VALUE) {
      const normalizedName = projectName.trim();
      if (normalizedName.length < 1 || normalizedName.length > 30) {
        showToast({ variant: "error", message: "Название проекта должно быть от 1 до 30 символов." });
        return;
      }
      try {
        await createProject({
          name: normalizedName,
          siteIds: selectedSiteIds,
        }).unwrap();
        handleCreateModalChange(false);
        resetVisibleSelectionState();
        showToast({ variant: "success", message: "Проект создан, выбранные сайты привязаны." });
      } catch (e) {
        const message = (e as ApiError)?.data?.message ?? "Ошибка создания проекта.";
        showToast({ variant: "error", message });
      }
      return;
    }
    try {
      await assignProjectSites({
        projectId: targetProjectId,
        siteIds: selectedSiteIds,
      }).unwrap();
      handleCreateModalChange(false);
      resetVisibleSelectionState();
      showToast({ variant: "success", message: "Выбранные сайты добавлены в проект." });
    } catch (e) {
      const message = (e as ApiError)?.data?.message ?? "Ошибка добавления сайтов в проект.";
      showToast({ variant: "error", message });
    }
  };

  const handleRefreshSitePages = async (site: ProjectSiteDto) => {
    setRefreshingSiteId(site.siteId);
    try {
      const result = await refreshProjectSitePages(site.siteId).unwrap();
      dispatch(
        projectsApi.util.updateQueryData("getProjectSites", siteQueryArgs, (draft) => {
          const row = draft.content.find((item) => item.siteId === site.siteId);
          if (!row) {
            return;
          }
          row.pageCount = result.pageCount;
          row.pagesLastRefreshedAt = result.pagesLastRefreshedAt ?? row.pagesLastRefreshedAt;
        }),
      );
      if (result.success) {
        showToast({ variant: "success", message: `Список страниц для ${site.siteUrl ?? "сайта"} обновлен.` });
      } else {
        showToast({ variant: "error", message: result.message ?? "Ошибка обновления списка страниц." });
      }
    } catch (e) {
      const message = (e as ApiError)?.data?.message ?? "Ошибка обновления списка страниц.";
      showToast({ variant: "error", message });
    } finally {
      setRefreshingSiteId(null);
    }
  };

  const handleRefreshVisibleSites = async () => {
    try {
      const results = await refreshProjectSitesPages(siteQueryArgs).unwrap();
      const successCount = results.filter((result) => result.success).length;
      const failureCount = results.length - successCount;
      if (failureCount === 0) {
        showToast({ variant: "success", message: `Список страниц обновлен для ${successCount} сайт(ов).` });
        return;
      }
      showToast({
        variant: "error",
        message: `Обновлено: ${successCount}. Ошибки: ${failureCount}.`,
      });
    } catch (e) {
      const message = (e as ApiError)?.data?.message ?? "Ошибка обновления списка страниц.";
      showToast({ variant: "error", message });
    }
  };

  const filterOptions = useMemo(
    () => [
      { value: ALL_PROJECTS_VALUE, label: "Все сайты" },
      ...projectOptions.map((item) => ({ value: item.value, label: item.label })),
      { value: WITHOUT_PROJECT_VALUE, label: "Без проекта" },
    ],
    [projectOptions],
  );

  const targetProjectOptions = useMemo(
    () => [...projectOptions, { value: CREATE_NEW_VALUE, label: "Создать новый проект" }],
    [projectOptions],
  );

  const getInitialTargetProjectId = () => projectOptions[0]?.value ?? CREATE_NEW_VALUE;

  const toggleSiteExpanded = (siteId: number) => {
    setExpandedSiteIds((prev) => (prev.includes(siteId) ? prev.filter((value) => value !== siteId) : [...prev, siteId]));
  };

  return (
    <>
      <TopContainer>
        <Toolbar>
          <FiltersBlock>
            <FilterSelectWrap>
              <SelectControl
                value={filterProjectId}
                onValueChange={(value) => {
                  setFilterProjectId(value);
                  resetVisibleSelectionState();
                  setPage(0);
                }}
                options={filterOptions}
                placeholder="Фильтр по проекту"
              />
            </FilterSelectWrap>
            <SearchInputWrap>
              <StyledInput
                value={siteQuery}
                onChange={(event) => {
                  setSiteQuery(event.target.value);
                  resetVisibleSelectionState();
                  setPage(0);
                }}
                placeholder="Поиск по сайту"
              />
            </SearchInputWrap>
          </FiltersBlock>
          <ActionsBlock>
            <Button type="button" onClick={handleRefreshVisibleSites} disabled={isLoading || sites.length === 0 || isRefreshingAllSites}>
              {isRefreshingAllSites ? "Обновление..." : "Обновить список страниц"}
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                setTargetProjectId(getInitialTargetProjectId());
                handleCreateModalChange(true);
              }}
              disabled={selectedSiteIds.length === 0}
            >
              Добавить в проект
            </Button>
          </ActionsBlock>
        </Toolbar>
      </TopContainer>

      {isLoading && sites.length === 0 ? (
        <PlaceholderCard>Загрузка сайтов...</PlaceholderCard>
      ) : sites.length === 0 ? (
        <PlaceholderCard>{EMPTY_DATA_MESSAGE}</PlaceholderCard>
      ) : (
        <>
          <TableLoadingWrap>
            <TableWrapper>
              <SitesTable aria-busy={isFetching}>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>&nbsp;</TableHeaderCell>
                  <TableHeaderCell>&nbsp;</TableHeaderCell>
                  <TableHeaderCell>№ п/п</TableHeaderCell>
                  <TableHeaderCell>Сайт / URL</TableHeaderCell>
                  <TableHeaderCell>Проект</TableHeaderCell>
                  <TableHeaderCell>Страниц</TableHeaderCell>
                  <TableHeaderCell>Дата обновления страниц</TableHeaderCell>
                  <TableHeaderCell>&nbsp;</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sites.map((site, index) => {
                  const isExpanded = expandedSet.has(site.siteId);
                  const isRefreshing = refreshingSiteId === site.siteId;
                  return (
                    <Fragment key={site.siteId}>
                      <TableRow key={site.siteId}>
                        <TableCell>
                          <RowToggleButton
                            type="button"
                            onClick={() => toggleSiteExpanded(site.siteId)}
                            aria-label={isExpanded ? "Свернуть список страниц" : "Развернуть список страниц"}
                          >
                            {isExpanded ? <FaChevronDown /> : <FaChevronRight />}
                          </RowToggleButton>
                        </TableCell>
                        <TableCell>
                          <Checkbox
                            type="checkbox"
                            checked={selectedSet.has(site.siteId)}
                            onChange={(event) => {
                              setSelectedSiteIds((prev) => {
                                if (event.target.checked) {
                                  if (prev.includes(site.siteId)) return prev;
                                  return [...prev, site.siteId];
                                }
                                return prev.filter((value) => value !== site.siteId);
                              });
                            }}
                          />
                        </TableCell>
                        <TableCell>{page * pageSize + index + 1}</TableCell>
                        <TableCell>{site.siteUrl ?? "—"}</TableCell>
                        <TableCell>{site.projectName ?? "—"}</TableCell>
                        <TableCell>{site.pageCount.toLocaleString("ru-RU")}</TableCell>
                        <TableCell>{formatDateTime(site.pagesLastRefreshedAt)}</TableCell>
                        <TableCell>
                          <ActionsCell>
                            <IconButton
                              type="button"
                              onClick={() => handleRefreshSitePages(site)}
                              disabled={isRefreshing}
                              data-tooltip="Обновить список страниц"
                              aria-label="Обновить список страниц"
                            >
                              <FaSyncAlt />
                            </IconButton>
                          </ActionsCell>
                        </TableCell>
                      </TableRow>
                      {isExpanded ? (
                        <ExpandedTableRow>
                          <ExpandedTableCell colSpan={EXPANDED_COLSPAN}>
                            <ExpandedPagesSection siteId={site.siteId} />
                          </ExpandedTableCell>
                        </ExpandedTableRow>
                      ) : null}
                    </Fragment>
                  );
                })}
              </TableBody>
              </SitesTable>
            </TableWrapper>
            {isFetching ? <TableLoadingOverlay>Загрузка сайтов...</TableLoadingOverlay> : null}
          </TableLoadingWrap>

          <PaginationControls
            page={page}
            totalPages={totalPages}
            pageSize={pageSize}
            pageSizeOptions={pageSizeOptions}
            isFetching={isFetching}
            disabled={isFetching}
            onPageChange={(nextPage) => {
              resetVisibleSelectionState();
              setPage(nextPage);
            }}
            onPageSizeChange={(nextPageSize) => {
              resetVisibleSelectionState();
              setPageSize(nextPageSize);
            }}
          />
        </>
      )}

      <ModalDialog open={isCreateModalOpen} onOpenChange={handleCreateModalChange} title="Добавить в проект" contentWidth="520px">
        <ModalBody>
          <FilterSelectWrap>
            <SelectControl
              value={targetProjectId}
              onValueChange={setTargetProjectId}
              options={targetProjectOptions}
              placeholder="Выберите проект"
              disabled={isCreatingProject || isAssigningSites}
            />
          </FilterSelectWrap>
          {targetProjectId === CREATE_NEW_VALUE ? (
            <StyledInput
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
              placeholder="Название нового проекта"
              disabled={isCreatingProject}
            />
          ) : null}
          <ModalActions>
            <Button
              type="button"
              onClick={() => {
                handleCreateModalChange(false);
              }}
              disabled={isCreatingProject || isAssigningSites}
            >
              Отмена
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleSubmitAddToProject}
              disabled={isCreatingProject || isAssigningSites || selectedSiteIds.length === 0}
            >
              {isCreatingProject ? "Создание..." : isAssigningSites ? "Добавление..." : "Добавить"}
            </Button>
          </ModalActions>
        </ModalBody>
      </ModalDialog>
    </>
  );
}

function ExpandedPagesSection({ siteId }: { siteId: number }) {
  const { data: pages = [], isLoading, error } = useGetProjectSitePagesQuery(siteId);

  if (isLoading) {
    return <ExpandedHint>Загрузка страниц...</ExpandedHint>;
  }

  if (error) {
    return <ExpandedError>Ошибка загрузки страниц.</ExpandedError>;
  }

  if (pages.length === 0) {
    return <ExpandedHint>Нет активных страниц для отображения.</ExpandedHint>;
  }

  return (
    <ExpandedList>
      {pages.map((page) => (
        <ExpandedListItem key={page.pageUrl}>
          <ExpandedUrl href={page.pageUrl} target="_blank" rel="noreferrer">
            {page.pageUrl}
          </ExpandedUrl>
        </ExpandedListItem>
      ))}
    </ExpandedList>
  );
}

const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }
  return parsed.toLocaleString("ru-RU");
};

const Toolbar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
`;

const TopContainer = styled.div`
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #ffffff;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const FiltersBlock = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const ActionsBlock = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const FilterSelectWrap = styled.div`
  width: 260px;
`;

const SearchInputWrap = styled.div`
  width: 260px;
`;

const PlaceholderCard = styled(PlaceholderText)`
  border: 1px solid #dbe5f3;
  background: #ffffff;
  border-radius: 14px;
  padding: 24px;
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

const TableWrapper = styled.div`
  overflow-x: hidden;
  background: #ffffff;
  border-radius: 14px;
  border: 1px solid #dbe5f3;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.04);
`;

const ModalBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const SitesTable = styled(Table)`
  table-layout: fixed;
  min-width: 0;

  ${TableHeaderCell}:nth-child(1),
  ${TableCell}:nth-child(1) {
    width: 52px;
    padding-left: 18px;
    padding-right: 14px;
  }

  ${TableHeaderCell}:nth-child(2),
  ${TableCell}:nth-child(2) {
    width: 48px;
    padding-left: 12px;
    padding-right: 8px;
    text-align: center;
  }

  ${TableHeaderCell}:nth-child(3),
  ${TableCell}:nth-child(3) {
    width: 70px;
  }

  ${TableHeaderCell}:nth-child(4),
  ${TableCell}:nth-child(4),
  ${TableHeaderCell}:nth-child(5),
  ${TableCell}:nth-child(5) {
    white-space: normal;
    word-break: break-word;
  }

  ${TableHeaderCell}:nth-child(6),
  ${TableCell}:nth-child(6) {
    width: 110px;
  }

  ${TableHeaderCell}:nth-child(7),
  ${TableCell}:nth-child(7) {
    width: 210px;
  }

  ${TableHeaderCell}:nth-child(8),
  ${TableCell}:nth-child(8) {
    width: 88px;
  }
`;

const ActionsCell = styled.div`
  display: flex;
  justify-content: flex-end;
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

const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`;

const Checkbox = styled.input`
  width: 16px;
  height: 16px;
  cursor: pointer;
  vertical-align: middle;
`;

const ExpandedList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ExpandedListItem = styled.li`
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border: 1px solid #dbe5f3;
  border-radius: 10px;
  background: #ffffff;
`;

const ExpandedUrl = styled.a`
  color: #0f172a;
  text-decoration: none;
  word-break: break-all;

  &:hover {
    text-decoration: underline;
  }
`;

const ExpandedHint = styled.div`
  color: #64748b;
  font-size: 13px;
`;

const ExpandedError = styled(ExpandedHint)`
  color: #b42318;
`;
