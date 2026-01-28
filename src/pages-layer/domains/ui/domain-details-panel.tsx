import styled from "styled-components";
import type { DomainDetailsDto } from "@entities/domains/types";
import { Button } from "@shared/ui";
import {
  asRecord,
  formatDateTime,
  formatDateValue,
  formatDomainState,
  formatFieldValue,
  formatPresence,
  toEntries,
} from "../lib/formatters";

type DomainDetailsPanelProps = {
  isOpen: boolean;
  isLoading: boolean;
  details?: DomainDetailsDto;
  onClose: () => void;
};

export function DomainDetailsPanel({
  isOpen,
  isLoading,
  details,
  onClose,
}: DomainDetailsPanelProps) {
  if (!isOpen) {
    return null;
  }
  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(event) => event.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>Детали домена</ModalTitle>
          <Button type="button" onClick={onClose}>
            Закрыть
          </Button>
        </ModalHeader>
        {isLoading ? (
          <DetailsPlaceholder>Загрузка деталей...</DetailsPlaceholder>
        ) : details ? (
          <DomainDetailsContent details={details} />
        ) : (
          <DetailsPlaceholder>Детали недоступны.</DetailsPlaceholder>
        )}
      </Modal>
    </Overlay>
  );
}

function DomainDetailsContent({ details }: { details: DomainDetailsDto }) {
  const payload = asRecord(details.additionalInfo);
  const detailEntries = toEntries(asRecord(payload.details));
  const contactEntries = toEntries(asRecord(payload.contacts));
  const extraEntries = toEntries(asRecord(payload.extraFields));

  return (
    <DetailsContent>
      <SectionTitle>Основные данные</SectionTitle>
      <DetailGrid>
        <DetailLabel>Домен</DetailLabel>
        <DetailValue>{details.domainName ?? "—"}</DetailValue>
        <DetailLabel>ID услуги</DetailLabel>
        <DetailValue>{details.serviceId}</DetailValue>
        <DetailLabel>Статус</DetailLabel>
        <DetailValue>{formatDomainState(details.state)}</DetailValue>
        <DetailLabel>Дата истечения периода</DetailLabel>
        <DetailValue>{formatDateValue(details.expirationDate)}</DetailValue>
        <DetailLabel>Регистратор</DetailLabel>
        <DetailValue>{details.registrar}</DetailValue>
        <DetailLabel>Профиль</DetailLabel>
        <DetailValue>{details.profile}</DetailValue>
        <DetailLabel>Наличие</DetailLabel>
        <DetailValue>{formatPresence(details.registrarPresence)}</DetailValue>
        <DetailLabel>Время последнего обновления</DetailLabel>
        <DetailValue>{formatDateTime(details.lastSeenAt)}</DetailValue>
        <DetailLabel>Время последнего обновления деталей</DetailLabel>
        <DetailValue>{formatDateTime(details.detailsSyncedAt)}</DetailValue>
      </DetailGrid>

      <FieldSection title="Детали" entries={detailEntries} />
      <FieldSection title="Контакты" entries={contactEntries} />
      <FieldSection title="Доп. поля" entries={extraEntries} />
    </DetailsContent>
  );
}

function FieldSection({
  title,
  entries,
}: {
  title: string;
  entries: Array<[string, string]>;
}) {
  if (entries.length === 0) {
    return (
      <>
        <SectionTitle>{title}</SectionTitle>
        <DetailsPlaceholder>Данных нет.</DetailsPlaceholder>
      </>
    );
  }
  return (
    <>
      <SectionTitle>{title}</SectionTitle>
      <DetailGrid>
        {entries.map(([key, value]) => (
          <DetailRow key={`${title}-${key}`}>
            <DetailLabel>{key}</DetailLabel>
            <DetailValue>{formatFieldValue(key, value)}</DetailValue>
          </DetailRow>
        ))}
      </DetailGrid>
    </>
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

const DetailRow = styled.div`
  display: contents;
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
