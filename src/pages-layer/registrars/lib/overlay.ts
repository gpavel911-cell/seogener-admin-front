import { DnsBulkRecordType } from "@entities/registrars/types";

export type RegistrarsOverlay =
  | { type: "view-dns"; domain: string }
  | { type: "create-dns"; domain: string }
  | { type: "bulk-dns" }
  | { type: "generate" };

export const REGISTRARS_WIDE_OVERLAY_WIDTH = "1180px";

export type NestedDialogState = Record<DnsBulkRecordType | "generate", boolean>;

export const EMPTY_NESTED_DIALOGS: NestedDialogState = {
  [DnsBulkRecordType.A]: false,
  [DnsBulkRecordType.NS]: false,
  [DnsBulkRecordType.TXT]: false,
  generate: false,
};

export function hasOpenNestedDialog(state: NestedDialogState): boolean {
  return Object.values(state).some(Boolean);
}

export function getRegistrarsOverlayTitle(overlay: RegistrarsOverlay): string {
  switch (overlay.type) {
    case "view-dns":
      return `Посмотреть ДНС записи (${overlay.domain})`;
    case "create-dns":
      return `Создать DNS запись (${overlay.domain})`;
    case "bulk-dns":
      return "Создать DNS записи";
    case "generate":
      return "Генерация доменов";
  }
}

export function isWideRegistrarsOverlay(overlay: RegistrarsOverlay): boolean {
  return overlay.type === "bulk-dns" || overlay.type === "generate";
}
