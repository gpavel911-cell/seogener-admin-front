import { FIELD_LABELS } from "@entities/domains/lib/field-labels";
import { RegistrarPresence } from "@entities/domains/types";

export function labelForKey(key: string) {
  return FIELD_LABELS[key] ?? key;
}

export function toEntries(record?: Record<string, unknown>) {
  return Object.entries(record ?? {})
    .map(([key, value]) => [key, normalizeValue(value)] as [string, string])
    .filter(([, value]) => value !== "")
    .sort(([a], [b]) => a.localeCompare(b));
}

export function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export function normalizeValue(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value, null, 2);
}

export function formatFieldValue(key: string, value: string) {
  if (!value) return "—";
  if (isDateKey(key)) {
    return formatDateValue(value);
  }
  if (isPhoneKey(key)) {
    return normalizePhone(value);
  }
  return value;
}

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

export function formatPresence(value: RegistrarPresence) {
  return value === RegistrarPresence.MISSING ? "Отсутствует" : "Присутствует";
}

function isDateKey(key: string) {
  return key.toLowerCase().includes("date");
}

function isPhoneKey(key: string) {
  return key.toLowerCase().includes("phone");
}

function normalizePhone(value: string) {
  return value.replace(/\s+/g, " ").trim();
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
