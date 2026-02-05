import { formatDecimal } from "./formatters";

const GOAL_TYPE_LABELS: Record<string, string> = {
  action: "Событие JavaScript",
  chat: "Чат",
  email: "Email-клик",
  file: "Скачивание файла",
  messenger: "Мессенджер",
  number: "Просмотры страниц",
  payment_system: "Платежная система",
  phone: "Клик по телефону",
  search: "Поиск по сайту",
  social: "Социальные сети",
  step: "Составная цель",
  url: "Просмотр страницы",
  visit_duration: "Длительность визита",
};

const GOAL_STATUS_LABELS: Record<string, string> = {
  active: "Активна",
  deleted: "Удалена",
  archived: "Архивная",
};

const GOAL_SOURCE_LABELS: Record<string, string> = {
  user: "Пользователь",
  auto: "Авто",
};

const CONDITION_TYPE_LABELS: Record<string, string> = {
  contain: "Содержит",
  exact: "Точное совпадение",
  start: "Начинается с",
  regexp: "Регулярное выражение",
  action: "Событие",
  messenger: "Мессенджер",
  all_files: "Все файлы",
  file: "Файл",
  search: "Поиск",
  all_social: "Все соцсети",
  social: "Соцсеть",
  regexp_action: "Событие (regexp)",
  contain_action: "Событие (contains)",
};

const EXTRA_FIELD_LABELS: Record<string, string> = {
  depth: "Глубина просмотра",
  duration: "Длительность визита (сек)",
  steps: "Шаги",
  price_locations: "Локации цены",
  hide_phone_number: "Скрывать номер телефона",
  prev_goal_id: "Предыдущая цель",
  flag: "Флаг",
};

export function formatGoalType(value?: string | null) {
  if (!value) return "—";
  const key = value.toLowerCase();
  return GOAL_TYPE_LABELS[key] ?? value;
}

export function formatGoalStatus(value?: string | null) {
  if (!value) return "—";
  const normalized = value.toLowerCase();
  return GOAL_STATUS_LABELS[normalized] ?? value;
}

export function formatGoalSource(value?: string | null) {
  if (!value) return "—";
  const key = value.toLowerCase();
  return GOAL_SOURCE_LABELS[key] ?? value;
}

export function formatBoolean(value?: boolean | null) {
  if (value === null || value === undefined) return "—";
  return value ? "Да" : "Нет";
}

export function formatPercent(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${formatDecimal(value)}%`;
}

export function formatNumber(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("ru-RU").format(value);
}

export function formatCondition(condition: Record<string, unknown>) {
  const entries = Object.entries(condition ?? {}).filter(([, value]) => value !== null && value !== undefined);
  if (entries.length === 0) return "";
  const parts = entries.map(([key, value]) => {
    if (key === "type") {
      const label =
        typeof value === "string" ? CONDITION_TYPE_LABELS[value.toLowerCase()] ?? value : String(value);
      return label;
    }
    return `${humanizeKey(key)}: ${normalizeValue(value)}`;
  });
  return parts.join(" · ");
}

export function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export function toEntries(record?: Record<string, unknown>) {
  return Object.entries(record ?? {})
    .map(([key, value]) => [formatExtraFieldLabel(key), normalizeValue(value)] as [string, string])
    .filter(([, value]) => value !== "");
}

export function normalizeValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  if (typeof value === "boolean") return value ? "Да" : "Нет";
  if (Array.isArray(value)) {
    if (value.length === 0) return "";
    if (value.every((item) => typeof item !== "object" || item === null)) {
      return value.map((item) => normalizeValue(item)).filter(Boolean).join(", ");
    }
    return value
      .map((item) => formatObjectSummary(asRecord(item)))
      .filter(Boolean)
      .join("; ");
  }
  return formatObjectSummary(asRecord(value));
}

function formatExtraFieldLabel(key: string) {
  return EXTRA_FIELD_LABELS[key] ?? humanizeKey(key);
}

function humanizeKey(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/(^|\s)\S/g, (char) => char.toUpperCase());
}

function formatObjectSummary(value: Record<string, unknown>) {
  const entries = Object.entries(value);
  if (entries.length === 0) return "";
  return entries
    .map(([key, itemValue]) => `${humanizeKey(key)}: ${normalizeValue(itemValue)}`)
    .join(", ");
}
