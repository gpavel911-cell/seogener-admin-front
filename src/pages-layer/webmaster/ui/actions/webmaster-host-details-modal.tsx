import { useState } from "react";
import styled from "styled-components";
import type { WebmasterHostDto } from "@entities/webmaster/types";
import { ModalDialog } from "@shared/ui-kit/modal-dialog";
import { formatDateTime, formatPresence, formatVerified } from "../../lib/formatters";

type WebmasterHostDetailsModalProps = {
  isOpen: boolean;
  isLoading: boolean;
  details?: WebmasterHostDto;
  onClose: () => void;
};

const CLOSE_ANIMATION_MS = 180;

export function WebmasterHostDetailsModal({
  isOpen,
  isLoading,
  details,
  onClose,
}: WebmasterHostDetailsModalProps) {
  const [closingDetails, setClosingDetails] = useState<WebmasterHostDto | undefined>(undefined);
  const detailsForRender = details ?? closingDetails;
  const isLoadingForRender = isOpen && isLoading && !detailsForRender;
  const handleClose = () => {
    if (detailsForRender) {
      setClosingDetails(detailsForRender);
    }
    setTimeout(() => setClosingDetails(undefined), CLOSE_ANIMATION_MS);
    onClose();
  };

  return (
    <ModalDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          handleClose();
        }
      }}
      title="Детали сайта"
    >
      {isLoadingForRender ? (
        <DetailsPlaceholder>Загрузка деталей...</DetailsPlaceholder>
      ) : detailsForRender ? (
        <DetailsContent>
          <SectionTitle>Основные данные</SectionTitle>
          <DetailGrid>
            <DetailLabel>ID</DetailLabel>
            <DetailValue>{detailsForRender.id}</DetailValue>
            <DetailLabel>Host ID</DetailLabel>
            <DetailValue>{detailsForRender.hostId}</DetailValue>
            <DetailLabel>URL</DetailLabel>
            <DetailValue>{detailsForRender.hostUrl ?? "—"}</DetailValue>
            <DetailLabel>Провайдер</DetailLabel>
            <DetailValue>{detailsForRender.provider}</DetailValue>
            <DetailLabel>Профиль</DetailLabel>
            <DetailValue>{detailsForRender.profile}</DetailValue>
            <DetailLabel>Проверка</DetailLabel>
            <DetailValue>{formatVerified(detailsForRender.verified)}</DetailValue>
            <DetailLabel>Наличие</DetailLabel>
            <DetailValue>{formatPresence(detailsForRender.presence)}</DetailValue>
            <DetailLabel>Создан</DetailLabel>
            <DetailValue>{formatDateTime(detailsForRender.createdAt)}</DetailValue>
            <DetailLabel>Последний раз получен</DetailLabel>
            <DetailValue>{formatDateTime(detailsForRender.lastSeenAt)}</DetailValue>
            <DetailLabel>Обновлен</DetailLabel>
            <DetailValue>{formatDateTime(detailsForRender.updatedAt)}</DetailValue>
          </DetailGrid>

          <SectionTitle>Метаданные</SectionTitle>
          {detailsForRender.additionalInfoJson ? (
            <MetadataBlock>{JSON.stringify(detailsForRender.additionalInfoJson, null, 2)}</MetadataBlock>
          ) : (
            <DetailsPlaceholder>Нет метаданных.</DetailsPlaceholder>
          )}
        </DetailsContent>
      ) : (
        <DetailsPlaceholder>Детали недоступны.</DetailsPlaceholder>
      )}
    </ModalDialog>
  );
}

const DetailsContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const DetailsPlaceholder = styled.div`
  color: #6b7280;
  font-size: 14px;
`;

const SectionTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #111827;
`;

const DetailGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(160px, 220px) 1fr;
  gap: 8px 16px;
`;

const DetailLabel = styled.div`
  font-weight: 600;
  color: #374151;
  font-size: 13px;
`;

const DetailValue = styled.div`
  color: #111827;
  font-size: 13px;
  white-space: pre-wrap;
`;

const MetadataBlock = styled.pre`
  margin: 0;
  padding: 12px;
  border-radius: 12px;
  background: #f3f4f6;
  color: #111827;
  font-size: 12px;
  overflow: auto;
`;
