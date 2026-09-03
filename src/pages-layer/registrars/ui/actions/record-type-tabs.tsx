"use client";

import styled from "styled-components";
import { DnsBulkRecordType } from "@entities/registrars/types";

export const RECORD_TYPE_TABS: DnsBulkRecordType[] = [
  DnsBulkRecordType.A,
  DnsBulkRecordType.NS,
  DnsBulkRecordType.TXT,
];

type RecordTypeTabsProps = {
  value: DnsBulkRecordType;
  onChange: (value: DnsBulkRecordType) => void;
};

export function RecordTypeTabs({ value, onChange }: RecordTypeTabsProps) {
  return (
    <TabList role="tablist" aria-label="Тип DNS-записи">
      {RECORD_TYPE_TABS.map((tab) => (
        <TabButton
          key={tab}
          type="button"
          role="tab"
          aria-selected={value === tab}
          data-active={value === tab}
          onClick={() => onChange(tab)}
        >
          {tab}
        </TabButton>
      ))}
    </TabList>
  );
}

const TabList = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const TabButton = styled.button`
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.tokens.color.borderStrong};
  background: ${({ theme }) => theme.tokens.color.bgSurface};
  color: ${({ theme }) => theme.tokens.color.textPrimary};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;

  &[data-active="true"] {
    background: rgba(37, 99, 235, 0.14);
    border-color: rgba(37, 99, 235, 0.35);
    color: ${({ theme }) => theme.tokens.color.accentText};
  }
`;
