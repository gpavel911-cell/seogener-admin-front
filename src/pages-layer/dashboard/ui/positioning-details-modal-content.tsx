"use client";

import { useEffect, useMemo, useState } from "react";
import styled, { keyframes } from "styled-components";
import { FaTrash } from "react-icons/fa";
import {
  useAddPositioningKeywordMutation,
  useDeletePositioningKeywordMutation,
  useGetPositioningDetailsQuery,
} from "@entities/positioning/api";
import type { PositioningKeywordDto, PositioningRowDto } from "@entities/positioning/types";
import { formatPositioningPosition } from "../lib/positioning-labels";
import {
  Button,
  PlaceholderText,
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

type ApiError = { data?: { message?: string } };

type PositioningDetailsModalContentProps = {
  rows: PositioningRowDto[];
  projectId: number;
};

export function PositioningDetailsModalContent({ rows, projectId }: PositioningDetailsModalContentProps) {
  return (
    <BulkRoot>
      {rows.map((row, index) => (
        <DomainSection key={row.siteId} $withDivider={index > 0}>
          {rows.length > 1 ? <DomainTitle>{row.domain}</DomainTitle> : null}
          <PositioningDomainPanel siteId={row.siteId} projectId={projectId} />
        </DomainSection>
      ))}
    </BulkRoot>
  );
}

type PositioningDomainPanelProps = {
  siteId: number;
  projectId: number;
};

function PositioningDomainPanel({ siteId, projectId }: PositioningDomainPanelProps) {
  const { showToast } = useToast();
  const [newKeyword, setNewKeyword] = useState("");
  const [pendingKeywords, setPendingKeywords] = useState<PositioningKeywordDto[]>([]);
  const [removedKeywordIds, setRemovedKeywordIds] = useState<number[]>([]);

  const { data, isFetching, isLoading, error } = useGetPositioningDetailsQuery({ siteId, projectId });
  const [addKeyword, { isLoading: isAdding }] = useAddPositioningKeywordMutation();
  const [deleteKeyword, { isLoading: isDeleting }] = useDeletePositioningKeywordMutation();

  const isDetailsLoading = isFetching || isLoading;
  const actionsDisabled = isDetailsLoading || isAdding || isDeleting;
  const serverKeywords = data?.keywords ?? [];

  const displayKeywords = useMemo(() => {
    const removedIds = new Set(removedKeywordIds);
    const visibleServerKeywords = serverKeywords.filter((item) => !removedIds.has(item.id));
    return [...visibleServerKeywords, ...pendingKeywords];
  }, [pendingKeywords, removedKeywordIds, serverKeywords]);

  useEffect(() => {
    if (!error) return;
    const message = (error as ApiError)?.data?.message ?? "Ошибка загрузки позиций. Повторите запрос.";
    showToast({ variant: "error", message });
  }, [error, showToast]);

  const handleAddKeyword = async () => {
    const keyword = newKeyword.trim();
    if (!keyword) {
      showToast({ variant: "error", message: "Введите ключевое слово." });
      return;
    }
    try {
      const created = await addKeyword({
        siteId,
        projectId,
        body: { keyword },
      }).unwrap();
      setPendingKeywords((prev) => [...prev, { ...created, yandexPosition: null, googlePosition: null }]);
      setNewKeyword("");
    } catch (addError) {
      const message = (addError as ApiError)?.data?.message ?? "Не удалось добавить ключевое слово.";
      showToast({ variant: "error", message });
    }
  };

  const handleDeleteKeyword = async (keywordId: number) => {
    const isPending = pendingKeywords.some((item) => item.id === keywordId);
    try {
      await deleteKeyword({ siteId, projectId, keywordId }).unwrap();
      if (isPending) {
        setPendingKeywords((prev) => prev.filter((item) => item.id !== keywordId));
      } else {
        setRemovedKeywordIds((prev) => (prev.includes(keywordId) ? prev : [...prev, keywordId]));
      }
    } catch (deleteError) {
      const message = (deleteError as ApiError)?.data?.message ?? "Не удалось удалить ключевое слово.";
      showToast({ variant: "error", message });
    }
  };

  if (isDetailsLoading && !data) {
    return (
      <Root>
        <TableSkeletonCard aria-hidden="true">
          <AddRowSkeleton>
            <SkeletonLine $width="100%" $height={36} />
            <SkeletonLine $width="100%" $height={36} />
          </AddRowSkeleton>
          <TableSkeletonHeader />
          {Array.from({ length: 4 }, (_, index) => (
            <TableSkeletonRow key={index}>
              <SkeletonLine $width="100%" />
              <SkeletonLine $width="100%" />
              <SkeletonLine $width="100%" />
              <SkeletonIcon $height={32} />
            </TableSkeletonRow>
          ))}
        </TableSkeletonCard>
      </Root>
    );
  }

  if (error && !data) {
    return <PlaceholderCard>Не удалось загрузить позиции для домена.</PlaceholderCard>;
  }

  return (
    <Root>
      <AddRow>
        <StyledInput
          value={newKeyword}
          onChange={(event) => setNewKeyword(event.target.value)}
          placeholder="Новое ключевое слово"
          disabled={actionsDisabled}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void handleAddKeyword();
            }
          }}
        />
        <AddButton type="button" variant="primary" onClick={() => void handleAddKeyword()} disabled={actionsDisabled}>
          {isAdding ? "Добавление..." : "Добавить"}
        </AddButton>
      </AddRow>
      {displayKeywords.length === 0 ? (
        <PlaceholderCard>Ключевые слова не добавлены.</PlaceholderCard>
      ) : (
        <TableWrapper>
          <KeywordsTable>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Ключ</TableHeaderCell>
                <TableHeaderCell>Позиция (Яндекс)</TableHeaderCell>
                <TableHeaderCell>Позиция (Google)</TableHeaderCell>
                <TableHeaderCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {displayKeywords.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.keyword}</TableCell>
                  <TableCell>{formatPositioningPosition(item.yandexPosition, isDetailsLoading)}</TableCell>
                  <TableCell>{formatPositioningPosition(item.googlePosition, isDetailsLoading)}</TableCell>
                  <TableCell>
                    <ActionsCell>
                      <DangerIconButton
                        type="button"
                        onClick={() => void handleDeleteKeyword(item.id)}
                        disabled={actionsDisabled}
                        data-tooltip="Удалить"
                        aria-label={`Удалить ключевое слово ${item.keyword}`}
                      >
                        <FaTrash />
                      </DangerIconButton>
                    </ActionsCell>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </KeywordsTable>
        </TableWrapper>
      )}
    </Root>
  );
}

const BulkRoot = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  min-width: 0;
`;

const DomainSection = styled.section<{ $withDivider: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: ${({ $withDivider }) => ($withDivider ? "20px" : "0")};
  border-top: ${({ $withDivider }) => ($withDivider ? "1px solid #dbe5f3" : "none")};
`;

const DomainTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
`;

const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  min-width: 0;
`;

const AddRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
`;

const AddButton = styled(Button)`
  min-width: 120px;
`;

const PlaceholderCard = styled(PlaceholderText)`
  border: 1px dashed #dbe5f3;
  border-radius: 14px;
  padding: 24px;
  background: #f8fafc;
`;

const KeywordsTable = styled(Table)`
  ${TableHeaderCell}:nth-child(4),
  ${TableCell}:nth-child(4) {
    width: 88px;
  }
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

const TableSkeletonCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  min-width: 0;
`;

const AddRowSkeleton = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 120px;
  gap: 12px;
  min-width: 0;
`;

const TableSkeletonHeader = styled.div`
  height: 18px;
  width: 100%;
  max-width: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #e2e8f0 0%, #f8fafc 50%, #e2e8f0 100%);
  animation: ${shimmer} 1.2s ease-in-out infinite;
`;

const TableSkeletonRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 120px) minmax(0, 120px) 88px;
  gap: 12px;
  align-items: center;
  min-width: 0;
`;

const SkeletonLine = styled.span<{ $width: string; $height?: number }>`
  display: block;
  width: ${({ $width }) => $width};
  max-width: 100%;
  height: ${({ $height = 14 }) => `${$height}px`};
  border-radius: 999px;
  background: linear-gradient(90deg, #e2e8f0 0%, #f8fafc 50%, #e2e8f0 100%);
  animation: ${shimmer} 1.2s ease-in-out infinite;
`;

const SkeletonIcon = styled.span<{ $height?: number }>`
  display: block;
  width: 34px;
  height: ${({ $height = 32 }) => `${$height}px`};
  justify-self: end;
  border-radius: 999px;
  background: linear-gradient(90deg, #e2e8f0 0%, #f8fafc 50%, #e2e8f0 100%);
  animation: ${shimmer} 1.2s ease-in-out infinite;
`;
