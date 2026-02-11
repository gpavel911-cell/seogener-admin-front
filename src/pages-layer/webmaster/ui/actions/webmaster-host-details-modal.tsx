import styled from "styled-components";
import type { WebmasterHostDetailsDto } from "@entities/webmaster/types";
import { Button } from "@shared/ui";
import { formatDateTime, formatPresence, formatVerified } from "../../lib/formatters";

type WebmasterHostDetailsModalProps = {
  isOpen: boolean;
  isLoading: boolean;
  details?: WebmasterHostDetailsDto;
  onClose: () => void;
};

export function WebmasterHostDetailsModal({
  isOpen,
  isLoading,
  details,
  onClose,
}: WebmasterHostDetailsModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(event) => event.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>Детали сайта</ModalTitle>
          <Button type="button" onClick={onClose}>
            Закрыть
          </Button>
        </ModalHeader>
        {isLoading ? (
          <DetailsPlaceholder>Загрузка деталей...</DetailsPlaceholder>
        ) : details ? (
          <DetailsContent>
            <SectionTitle>Основные данные</SectionTitle>
            <DetailGrid>
              <DetailLabel>ID</DetailLabel>
              <DetailValue>{details.id}</DetailValue>
              <DetailLabel>Host ID</DetailLabel>
              <DetailValue>{details.hostId}</DetailValue>
              <DetailLabel>URL</DetailLabel>
              <DetailValue>{details.hostUrl ?? "—"}</DetailValue>
              <DetailLabel>Провайдер</DetailLabel>
              <DetailValue>{details.provider}</DetailValue>
              <DetailLabel>Профиль</DetailLabel>
              <DetailValue>{details.profile}</DetailValue>
              <DetailLabel>Проверка</DetailLabel>
              <DetailValue>{formatVerified(details.verified)}</DetailValue>
              <DetailLabel>Наличие</DetailLabel>
              <DetailValue>{formatPresence(details.presence)}</DetailValue>
              <DetailLabel>Создан</DetailLabel>
              <DetailValue>{formatDateTime(details.createdAt)}</DetailValue>
              <DetailLabel>Последний раз получен</DetailLabel>
              <DetailValue>{formatDateTime(details.lastSeenAt)}</DetailValue>
              <DetailLabel>Обновлен</DetailLabel>
              <DetailValue>{formatDateTime(details.updatedAt)}</DetailValue>
            </DetailGrid>

            <SectionTitle>Метаданные</SectionTitle>
            {details.additionalInfoJson ? (
              <MetadataBlock>{JSON.stringify(details.additionalInfoJson, null, 2)}</MetadataBlock>
            ) : (
              <DetailsPlaceholder>Нет метаданных.</DetailsPlaceholder>
            )}
          </DetailsContent>
        ) : (
          <DetailsPlaceholder>Детали недоступны.</DetailsPlaceholder>
        )}
      </Modal>
    </Overlay>
  );
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(15, 23, 42, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
`;

const Modal = styled.div`
  width: min(960px, 100%);
  max-height: 85vh;
  overflow: auto;
  border-radius: 16px;
  padding: 16px;
  background: #ffffff;
  box-shadow: 0 24px 48px rgba(15, 23, 42, 0.2);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #111827;
`;

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
