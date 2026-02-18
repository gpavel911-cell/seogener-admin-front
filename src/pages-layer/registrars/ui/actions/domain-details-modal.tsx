import { useState } from "react";
import styled from "styled-components";
import type { RegistrarDomainDto } from "@entities/registrars/types";
import { ModalDialog } from "@shared/ui-kit/modal-dialog";
import {
  asRecord,
  formatDateTime,
  formatDateValue,
  formatDomainState,
  formatFieldValue,
  formatPresence,
  toEntries,
} from "../../lib/formatters";

type DomainDetailsPanelProps = {
  isOpen: boolean;
  isLoading: boolean;
  details?: RegistrarDomainDto;
  onClose: () => void;
};

const CLOSE_ANIMATION_MS = 180;

export function DomainDetailsModal({
  isOpen,
  isLoading,
  details,
  onClose,
}: DomainDetailsPanelProps) {
  const [closingDetails, setClosingDetails] = useState<RegistrarDomainDto | undefined>(undefined);
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
      title="Детали домена"
    >
      {isLoadingForRender ? (
        <DetailsPlaceholder>Загрузка деталей...</DetailsPlaceholder>
      ) : detailsForRender ? (
        <DomainDetailsContent details={detailsForRender} />
      ) : (
        <DetailsPlaceholder>Детали недоступны.</DetailsPlaceholder>
      )}
    </ModalDialog>
  );
}

function DomainDetailsContent({ details }: { details: RegistrarDomainDto }) {
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
        <DetailValue>{formatDomainState(details.status)}</DetailValue>
        <DetailLabel>Дата истечения периода</DetailLabel>
        <DetailValue>{formatDateValue(details.expirationDate)}</DetailValue>
        <DetailLabel>Регистратор</DetailLabel>
        <DetailValue>{details.registrar}</DetailValue>
        <DetailLabel>Профиль</DetailLabel>
        <DetailValue>{details.profile}</DetailValue>
        <DetailLabel>Наличие</DetailLabel>
        <DetailValue>{formatPresence(details.presence)}</DetailValue>
        <DetailLabel>Время последнего обновления</DetailLabel>
        <DetailValue>{formatDateTime(details.lastSeenAt)}</DetailValue>
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
