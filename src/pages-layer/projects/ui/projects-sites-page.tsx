"use client";

import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { useAssignProjectSitesMutation, useCreateProjectMutation, useGetProjectOptionsQuery, useGetProjectSitesQuery } from "@entities/projects/api";
import { usePagination } from "@shared/lib/use-pagination";
import { PaginationControls } from "@shared/ui/pagination-controls";
import { Button, EMPTY_DATA_MESSAGE, PlaceholderText, SelectControl, StyledInput, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, TableWrapper, useToast } from "@shared/ui";
import { ModalDialog } from "@shared/ui-kit/modal-dialog";

type ApiError = { status?: number; data?: { message?: string } };
const ALL_PROJECTS_VALUE = "__all_projects__";
const WITHOUT_PROJECT_VALUE = "__without_project__";
const CREATE_NEW_VALUE = "__create_new__";

type ProjectsSitesSectionProps = {
  isCreateModalOpen: boolean;
  onCreateModalChange: (open: boolean) => void;
};

export function ProjectsSitesSection({ isCreateModalOpen, onCreateModalChange }: ProjectsSitesSectionProps) {
  const { showToast } = useToast();
  const { page, pageSize, pageSizeOptions, setPage, setPageSize } = usePagination();
  const [filterProjectId, setFilterProjectId] = useState(ALL_PROJECTS_VALUE);
  const [siteQuery, setSiteQuery] = useState("");
  const [selectedSiteIds, setSelectedSiteIds] = useState<number[]>([]);
  const [targetProjectId, setTargetProjectId] = useState(CREATE_NEW_VALUE);
  const [projectName, setProjectName] = useState("");

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

  const sites = useMemo(() => sitesData?.content ?? [], [sitesData?.content]);
  const totalPages = sitesData?.totalPages ?? 0;
  const selectedSet = useMemo(() => new Set(selectedSiteIds), [selectedSiteIds]);

  useEffect(() => {
    if (!error) return;
    const status = (error as ApiError).status;
    showToast({ variant: "error", message: status ? `Ошибка загрузки сайтов (status ${status}).` : "Ошибка загрузки сайтов." });
  }, [error, showToast]);

  const handleCreateModalChange = (open: boolean) => {
    onCreateModalChange(open);
    if (!open) {
      setTargetProjectId(CREATE_NEW_VALUE);
      setProjectName("");
    }
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
        setSelectedSiteIds([]);
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
      setSelectedSiteIds([]);
      showToast({ variant: "success", message: "Выбранные сайты добавлены в проект." });
    } catch (e) {
      const message = (e as ApiError)?.data?.message ?? "Ошибка добавления сайтов в проект.";
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
                  setSelectedSiteIds([]);
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
                  setSelectedSiteIds([]);
                  setPage(0);
                }}
                placeholder="Поиск по сайту"
              />
            </SearchInputWrap>
          </FiltersBlock>
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
        </Toolbar>
      </TopContainer>

      {isLoading ? (
        <PlaceholderCard>Загрузка сайтов...</PlaceholderCard>
      ) : sites.length === 0 ? (
        <PlaceholderCard>{EMPTY_DATA_MESSAGE}</PlaceholderCard>
      ) : (
        <>
          <TableWrapper>
            <SitesTable>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>&nbsp;</TableHeaderCell>
                  <TableHeaderCell>№ п/п</TableHeaderCell>
                  <TableHeaderCell>Сайт / URL</TableHeaderCell>
                  <TableHeaderCell>Проект</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sites.map((site, index) => (
                  <TableRow key={site.siteId}>
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
                  </TableRow>
                ))}
              </TableBody>
            </SitesTable>
          </TableWrapper>

          <PaginationControls
            page={page}
            totalPages={totalPages}
            pageSize={pageSize}
            pageSizeOptions={pageSizeOptions}
            isFetching={isFetching}
            onPageChange={(nextPage) => {
              setSelectedSiteIds([]);
              setPage(nextPage);
            }}
            onPageSizeChange={(nextPageSize) => {
              setSelectedSiteIds([]);
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

const ModalBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const SitesTable = styled(Table)`
  table-layout: fixed;

  ${TableHeaderCell}:nth-child(1),
  ${TableCell}:nth-child(1) {
    width: 52px;
    padding-left: 18px;
    padding-right: 10px;
  }

  ${TableHeaderCell}:nth-child(2),
  ${TableCell}:nth-child(2) {
    width: 10%;
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
`;
