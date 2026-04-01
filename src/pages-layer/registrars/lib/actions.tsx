import { type ReactNode } from "react";
import { CreateARecord } from "@pages/registrars/ui/actions/create-a-record";
import { CreateNsRecord } from "@pages/registrars/ui/actions/create-ns-record";
import { CreateTxtRecord } from "@pages/registrars/ui/actions/create-txt-record";
import { DnsBulkPage } from "@pages/registrars/ui/actions/dns-bulk-page";
import { DomainMatrixPage } from "@pages/registrars/ui/actions/domain-matrix-page";
import { ViewDnsRecords } from "@pages/registrars/ui/actions/view-dns-records";
import { DnsBulkRecordType, type RegistrarProviderType } from "@entities/registrars/types";

export enum RegistrarsAction {
  SYNC_REGISTRAR_DOMAINS = "SYNC_REGISTRAR_DOMAINS",
  GET_REGISTRAR_DNS_RECORDS = "GET_REGISTRAR_DNS_RECORDS",
  CREATE_REGISTRAR_A_RECORD = "CREATE_REGISTRAR_A_RECORD",
  CREATE_REGISTRAR_NS_RECORD = "CREATE_REGISTRAR_NS_RECORD",
  CREATE_REGISTRAR_TXT_RECORD = "CREATE_REGISTRAR_TXT_RECORD",
  GENERATE_DOMAINS_MATRIX = "GENERATE_DOMAINS_MATRIX",
  CREATE_BULK_A_RECORDS = "CREATE_BULK_A_RECORDS",
  CREATE_BULK_NS_RECORDS = "CREATE_BULK_NS_RECORDS",
  CREATE_BULK_TXT_RECORDS = "CREATE_BULK_TXT_RECORDS",
}

type RegistrarsActionItem = {
  id: RegistrarsAction;
  label: string;
};

type RegistrarsActionSection = {
  title: string;
  actions: RegistrarsActionItem[];
};

export const REGISTRARS_ACTION_SECTIONS: RegistrarsActionSection[] = [
  {
    title: "Действия",
    actions: [
      { id: RegistrarsAction.SYNC_REGISTRAR_DOMAINS, label: "Домены" },
      { id: RegistrarsAction.GET_REGISTRAR_DNS_RECORDS, label: "Посмотреть ДНС записи" },
      { id: RegistrarsAction.CREATE_REGISTRAR_NS_RECORD, label: "Создать NS-запись" },
      { id: RegistrarsAction.CREATE_REGISTRAR_A_RECORD, label: "Создать А-запись" },
      { id: RegistrarsAction.CREATE_REGISTRAR_TXT_RECORD, label: "Создать TXT-запись" },
      { id: RegistrarsAction.GENERATE_DOMAINS_MATRIX, label: "Генерация доменов" },
      { id: RegistrarsAction.CREATE_BULK_NS_RECORDS, label: "Создать NS-записи" },
      { id: RegistrarsAction.CREATE_BULK_A_RECORDS, label: "Создать А-записи" },
      { id: RegistrarsAction.CREATE_BULK_TXT_RECORDS, label: "Создать TXT-записи" },
    ],
  },
];

export type RegistrarsActionRenderContext = {
  profile?: string | null;
  registrar?: RegistrarProviderType | null;
};

export const renderRegistrarsActionContent = (
  action: RegistrarsAction,
  context?: RegistrarsActionRenderContext,
): ReactNode => {
  if (action === RegistrarsAction.CREATE_REGISTRAR_A_RECORD) {
    return <CreateARecord fixedRegistrar={context?.registrar} fixedProfile={context?.profile} />;
  }
  if (action === RegistrarsAction.CREATE_REGISTRAR_TXT_RECORD) {
    return <CreateTxtRecord fixedRegistrar={context?.registrar} fixedProfile={context?.profile} />;
  }
  if (action === RegistrarsAction.CREATE_REGISTRAR_NS_RECORD) {
    return <CreateNsRecord fixedRegistrar={context?.registrar} fixedProfile={context?.profile} />;
  }
  if (action === RegistrarsAction.GET_REGISTRAR_DNS_RECORDS) {
    return <ViewDnsRecords fixedRegistrar={context?.registrar} fixedProfile={context?.profile} />;
  }
  if (action === RegistrarsAction.CREATE_BULK_A_RECORDS) {
    return (
      <DnsBulkPage
        recordType={DnsBulkRecordType.A}
        fixedRegistrar={context?.registrar}
        fixedProfile={context?.profile}
        hideTitle
      />
    );
  }
  if (action === RegistrarsAction.CREATE_BULK_TXT_RECORDS) {
    return (
      <DnsBulkPage
        recordType={DnsBulkRecordType.TXT}
        fixedRegistrar={context?.registrar}
        fixedProfile={context?.profile}
        hideTitle
      />
    );
  }
  if (action === RegistrarsAction.CREATE_BULK_NS_RECORDS) {
    return (
      <DnsBulkPage
        recordType={DnsBulkRecordType.NS}
        fixedRegistrar={context?.registrar}
        fixedProfile={context?.profile}
        hideTitle
      />
    );
  }
  if (action === RegistrarsAction.GENERATE_DOMAINS_MATRIX) {
    return <DomainMatrixPage fixedProfileId={context?.profile} hideTitle />;
  }
  return null;
};
