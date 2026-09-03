import { RegistrarDomainState, RegistrarDomainPresence } from "@entities/registrars/types";

export function formatDateValue(value?: string | null) {
  if (!value) return "—";
  const parsed = parseDate(value);
  if (!parsed) return value;
  return parsed.toLocaleDateString("ru-RU");
}

export function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("ru-RU");
}

const DOMAIN_STATE_LABELS: Record<RegistrarDomainState, string> = {
  [RegistrarDomainState.INACTIVE]: "Неактивен",
  [RegistrarDomainState.ACTIVE]: "Активен",
  [RegistrarDomainState.SUSPENDED]: "Приостановлен",
  [RegistrarDomainState.DELETED]: "Удален",
  [RegistrarDomainState.TRANSFERRED]: "Перенесен",
};

export function formatDomainState(value?: RegistrarDomainState | null) {
  if (!value) return "—";
  return DOMAIN_STATE_LABELS[value] ?? value;
}

export function formatPresence(value: RegistrarDomainPresence) {
  return value === RegistrarDomainPresence.MISSING ? "Отсутствует" : "Присутствует";
}

function parseDate(value: string) {
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(value)) {
    const [day, month, year] = value.split(".");
    const iso = `${year}-${month}-${day}T00:00:00Z`;
    const parsed = new Date(iso);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
