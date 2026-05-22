"use client";

import { skipToken } from "@reduxjs/toolkit/query";
import { useEffect, useMemo, useState } from "react";
import { FaEdit, FaTrash, FaUnlink } from "react-icons/fa";
import styled from "styled-components";
import { useCreateProjectMutation, useDeleteProjectMutation, useGetProjectSitesQuery, useGetProjectsQuery, useUnassignProjectSitesMutation, useUpdateProjectMutation } from "@entities/projects/api";
import type { ProjectDto } from "@entities/projects/types";
import { EMPTY_DATA_MESSAGE, Button, PlaceholderText, ResultLoader, StyledInput, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, TableWrapper, useToast } from "@shared/ui";
import { ModalDialog } from "@shared/ui-kit/modal-dialog";
import { ProjectsShell, ProjectsView } from "./projects-shell";
import { ProjectsSitesSection } from "./projects-sites-page";

type ApiError = { status?: number; data?: { message?: string } };

export function ProjectsPage() {
  const { showToast } = useToast();
  const [activeView, setActiveView] = useState<ProjectsView>(ProjectsView.PROJECTS);
  const [createProjectModalOpen, setCreateProjectModalOpen] = useState(false);
  const [addToProjectModalOpen, setAddToProjectModalOpen] = useState(false);
  const [createProjectName, setCreateProjectName] = useState("");
  const { data: projects = [], isLoading, isFetching, error } = useGetProjectsQuery();
  const [renameProject, setRenameProject] = useState<ProjectDto | null>(null);
  const [renameName, setRenameName] = useState("");
  const [manageProject, setManageProject] = useState<ProjectDto | null>(null);
  const [deleteProjectTarget, setDeleteProjectTarget] = useState<ProjectDto | null>(null);
  const [selectedSiteIds, setSelectedSiteIds] = useState<number[]>([]);
  const [createProject, { isLoading: isCreatingProject }] = useCreateProjectMutation();
  const [updateProject, { isLoading: isRenaming }] = useUpdateProjectMutation();
  const [deleteProject, { isLoading: isDeleting }] = useDeleteProjectMutation();
  const [unassignSites, { isLoading: isUnassigning }] = useUnassignProjectSitesMutation();

  const manageSitesArgs = manageProject
    ? { pageNumber: 0, pageSize: 200, projectId: manageProject.id }
    : skipToken;
  const { data: manageSitesData, isFetching: isManageSitesFetching } = useGetProjectSitesQuery(manageSitesArgs);
  const manageSites = useMemo(() => manageSitesData?.content ?? [], [manageSitesData?.content]);
  const selectedSet = useMemo(() => new Set(selectedSiteIds), [selectedSiteIds]);

  useEffect(() => {
    if (!error) return;
    const status = (error as ApiError).status;
    showToast({ variant: "error", message: status ? `Ошибка загрузки проектов (status ${status}).` : "Ошибка загрузки проектов." });
  }, [error, showToast]);

  const handleStartRename = (project: ProjectDto) => {
    setRenameProject(project);
    setRenameName(project.name);
  };

  const handleSubmitRename = async () => {
    if (!renameProject) return;
    const normalized = renameName.trim();
    if (normalized.length < 1 || normalized.length > 30) {
      showToast({ variant: "error", message: "Название проекта должно быть от 1 до 30 символов." });
      return;
    }
    try {
      await updateProject({ projectId: String(renameProject.id), name: normalized }).unwrap();
      setRenameProject(null);
      showToast({ variant: "success", message: "Название проекта обновлено." });
    } catch (e) {
      const message = (e as ApiError)?.data?.message ?? "Ошибка обновления названия проекта.";
      showToast({ variant: "error", message });
    }
  };

  const handleDeleteProject = async (project: ProjectDto) => {
    try {
      await deleteProject({ projectId: String(project.id) }).unwrap();
      if (manageProject?.id === project.id) {
        setManageProject(null);
        setSelectedSiteIds([]);
      }
      setDeleteProjectTarget(null);
      showToast({ variant: "success", message: "Проект удален. Сайты отвязаны." });
    } catch (e) {
      const message = (e as ApiError)?.data?.message ?? "Ошибка удаления проекта.";
      showToast({ variant: "error", message });
    }
  };

  const handleOpenManageSites = (project: ProjectDto) => {
    setManageProject(project);
    setSelectedSiteIds([]);
  };

  const handleSubmitUnassign = async () => {
    if (!manageProject || selectedSiteIds.length === 0) {
      return;
    }
    try {
      await unassignSites({ projectId: String(manageProject.id), siteIds: selectedSiteIds }).unwrap();
      setSelectedSiteIds([]);
      showToast({ variant: "success", message: "Выбранные сайты отвязаны." });
    } catch (e) {
      const message = (e as ApiError)?.data?.message ?? "Ошибка отвязки сайтов.";
      showToast({ variant: "error", message });
    }
  };

  const handleSubmitCreateProject = async () => {
    const normalized = createProjectName.trim();
    if (normalized.length < 1 || normalized.length > 30) {
      showToast({ variant: "error", message: "Название проекта должно быть от 1 до 30 символов." });
      return;
    }
    try {
      await createProject({ name: normalized, siteIds: [] }).unwrap();
      setCreateProjectModalOpen(false);
      setCreateProjectName("");
      showToast({ variant: "success", message: "Проект создан." });
    } catch (e) {
      const message = (e as ApiError)?.data?.message ?? "Ошибка создания проекта.";
      showToast({ variant: "error", message });
    }
  };

  const handleSelectView = (view: ProjectsView) => {
    setActiveView(view);
    if (view !== ProjectsView.SITES) {
      setAddToProjectModalOpen(false);
    }
  };

  return (
    <ProjectsShell activeView={activeView} onSelectView={handleSelectView}>
      {activeView === ProjectsView.SITES ? (
        <ProjectsSitesSection
          isCreateModalOpen={addToProjectModalOpen}
          onCreateModalChange={setAddToProjectModalOpen}
        />
      ) : (
        <>
          <TopContainer>
            <Button
              type="button"
              variant="primary"
              onClick={() => setCreateProjectModalOpen(true)}
            >
              Создать проект
            </Button>
          </TopContainer>
          {isLoading ? (
            <ResultLoader label="Загрузка проектов..." />
          ) : projects.length === 0 ? (
            <EmptyState>{EMPTY_DATA_MESSAGE}</EmptyState>
          ) : (
            <TableWrapper>
              <ProjectsTable>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>№ п/п</TableHeaderCell>
                    <TableHeaderCell>Название</TableHeaderCell>
                    <TableHeaderCell>Сайтов</TableHeaderCell>
                  <TableHeaderCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {projects.map((project, index) => (
                    <TableRow key={project.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{project.name}</TableCell>
                      <TableCell>{project.sitesCount}</TableCell>
                      <TableCell>
                        <ActionsCell>
                          <IconButton
                            type="button"
                            onClick={() => handleStartRename(project)}
                            disabled={isRenaming || isDeleting}
                            data-tooltip="Переименовать"
                            aria-label="Переименовать"
                          >
                            <FaEdit />
                          </IconButton>
                          <IconButton
                            type="button"
                            onClick={() => handleOpenManageSites(project)}
                            disabled={isUnassigning || isDeleting || project.sitesCount === 0}
                            data-tooltip="Отвязать сайты"
                            aria-label="Отвязать сайты"
                          >
                            <FaUnlink />
                          </IconButton>
                          <DangerIconButton
                            type="button"
                            onClick={() => setDeleteProjectTarget(project)}
                            disabled={isDeleting || isRenaming}
                            data-tooltip="Удалить"
                            aria-label="Удалить"
                          >
                            <FaTrash />
                          </DangerIconButton>
                        </ActionsCell>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </ProjectsTable>
            </TableWrapper>
          )}
        </>
      )}

      {isFetching && !isLoading ? <HintText>Обновление списка...</HintText> : null}

      <ModalDialog
        open={createProjectModalOpen}
        onOpenChange={(open) => {
          setCreateProjectModalOpen(open);
          if (!open) {
            setCreateProjectName("");
          }
        }}
        title="Создать проект"
        contentWidth="520px"
      >
        <ModalBody>
          <StyledInput
            value={createProjectName}
            onChange={(event) => setCreateProjectName(event.target.value)}
            placeholder="Название проекта"
            disabled={isCreatingProject}
          />
          <ModalActions>
            <Button
              type="button"
              onClick={() => {
                setCreateProjectModalOpen(false);
                setCreateProjectName("");
              }}
              disabled={isCreatingProject}
            >
              Отмена
            </Button>
            <Button type="button" variant="primary" onClick={handleSubmitCreateProject} disabled={isCreatingProject}>
              {isCreatingProject ? "Создание..." : "Создать"}
            </Button>
          </ModalActions>
        </ModalBody>
      </ModalDialog>

      <ModalDialog
        open={renameProject !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRenameProject(null);
          }
        }}
        title="Переименовать проект"
        contentWidth="520px"
      >
        <ModalBody>
          <StyledInput
            value={renameName}
            onChange={(event) => setRenameName(event.target.value)}
            placeholder="Название проекта"
            disabled={isRenaming}
          />
          <ModalActions>
            <Button type="button" onClick={() => setRenameProject(null)} disabled={isRenaming}>
              Отмена
            </Button>
            <Button type="button" variant="primary" onClick={handleSubmitRename} disabled={isRenaming}>
              {isRenaming ? "Сохранение..." : "Сохранить"}
            </Button>
          </ModalActions>
        </ModalBody>
      </ModalDialog>

      <ModalDialog
        open={manageProject !== null}
        onOpenChange={(open) => {
          if (!open) {
            setManageProject(null);
            setSelectedSiteIds([]);
          }
        }}
        title={manageProject ? `Отвязать сайты: ${manageProject.name}` : "Отвязать сайты"}
        contentWidth="760px"
      >
        <ModalBody>
          {isManageSitesFetching ? (
            <PlaceholderText>Загрузка сайтов...</PlaceholderText>
          ) : manageSites.length === 0 ? (
            <PlaceholderText>В проекте нет привязанных сайтов.</PlaceholderText>
          ) : (
            <TableWrapper>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Выбор</TableHeaderCell>
                    <TableHeaderCell>Сайт / URL</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {manageSites.map((site) => (
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
                      <TableCell>{site.siteUrl ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableWrapper>
          )}
          <ModalActions>
            <Button
              type="button"
              onClick={() => {
                setManageProject(null);
                setSelectedSiteIds([]);
              }}
              disabled={isUnassigning}
            >
              Отмена
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleSubmitUnassign}
              disabled={selectedSiteIds.length === 0 || isUnassigning}
            >
              {isUnassigning ? "Отвязка..." : "Отвязать выбранные"}
            </Button>
          </ModalActions>
        </ModalBody>
      </ModalDialog>

      <ModalDialog
        open={deleteProjectTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteProjectTarget(null);
          }
        }}
        title="Удалить проект"
        contentWidth="520px"
      >
        <ModalBody>
          <HintText>
            {deleteProjectTarget
              ? `Удалить проект "${deleteProjectTarget.name}"? Сайты будут отвязаны от проекта, но останутся в системе.`
              : "Удалить проект?"}
          </HintText>
          <ModalActions>
            <Button type="button" onClick={() => setDeleteProjectTarget(null)} disabled={isDeleting}>
              Отмена
            </Button>
            <DangerActionButton
              type="button"
              onClick={() => {
                if (deleteProjectTarget) {
                  void handleDeleteProject(deleteProjectTarget);
                }
              }}
              disabled={isDeleting || !deleteProjectTarget}
            >
              {isDeleting ? "Удаление..." : "Удалить"}
            </DangerActionButton>
          </ModalActions>
        </ModalBody>
      </ModalDialog>
    </ProjectsShell>
  );
}

const EmptyState = styled(PlaceholderText)`
  border: 1px solid #dbe5f3;
  background: #ffffff;
  border-radius: 14px;
  padding: 24px;
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

const ProjectsTable = styled(Table)`
  table-layout: fixed;

  ${TableHeaderCell}:nth-child(1),
  ${TableCell}:nth-child(1) {
    width: 12%;
  }

  ${TableHeaderCell}:nth-child(2),
  ${TableCell}:nth-child(2) {
    width: 42%;
  }

  ${TableHeaderCell}:nth-child(3),
  ${TableCell}:nth-child(3) {
    width: 20%;
  }

  ${TableHeaderCell}:nth-child(4),
  ${TableCell}:nth-child(4) {
    width: 26%;
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

const Checkbox = styled.input`
  width: 16px;
  height: 16px;
  cursor: pointer;
`;
