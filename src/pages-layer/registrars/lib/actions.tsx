import { type ReactNode } from "react";
import { CreateARecord } from "@pages/registrars/ui/actions/create-a-record";
import { ViewDnsRecords } from "@pages/registrars/ui/actions/view-dns-records";
import type { RegistrarProviderType } from "@entities/registrars/types";

export enum RegistrarsAction {
  SYNC_REGISTRAR_DOMAINS = "SYNC_REGISTRAR_DOMAINS",
  GET_REGISTRAR_DNS_RECORDS = "GET_REGISTRAR_DNS_RECORDS",
  CREATE_REGISTRAR_A_RECORD = "CREATE_REGISTRAR_A_RECORD",
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
      { id: RegistrarsAction.CREATE_REGISTRAR_A_RECORD, label: "Создать А-запись" },
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
  if (action === RegistrarsAction.GET_REGISTRAR_DNS_RECORDS) {
    return <ViewDnsRecords fixedRegistrar={context?.registrar} fixedProfile={context?.profile} />;
  }
  return null;
};
