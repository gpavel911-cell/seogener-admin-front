"use client";

import { useState } from "react";
import styled from "styled-components";
import { DnsBulkRecordType, type RegistrarProviderType } from "@entities/registrars/types";
import { DnsBulkPage } from "./dns-bulk-page";
import { RECORD_TYPE_TABS, RecordTypeTabs } from "./record-type-tabs";

type BulkDnsOverlayProps = {
  registrar: RegistrarProviderType;
  profile: string;
  onNestedDialogOpenChange: (recordType: DnsBulkRecordType, open: boolean) => void;
};

export function BulkDnsOverlay({ registrar, profile, onNestedDialogOpenChange }: BulkDnsOverlayProps) {
  const [recordType, setRecordType] = useState(DnsBulkRecordType.A);

  return (
    <Stack>
      <RecordTypeTabs value={recordType} onChange={setRecordType} />
      {RECORD_TYPE_TABS.map((panelType) => (
        <Panel key={panelType} $hidden={recordType !== panelType} aria-hidden={recordType !== panelType}>
          <DnsBulkPage
            recordType={panelType}
            fixedRegistrar={registrar}
            fixedProfile={profile}
            hideTitle
            onNestedDialogOpenChange={(open) => onNestedDialogOpenChange(panelType, open)}
          />
        </Panel>
      ))}
    </Stack>
  );
}

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const Panel = styled.div<{ $hidden: boolean }>`
  display: ${({ $hidden }) => ($hidden ? "none" : "block")};
`;
