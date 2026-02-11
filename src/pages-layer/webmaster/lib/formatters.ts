export const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("ru-RU");
};

export const formatPresence = (presence?: string | null) => {
  if (!presence) return "—";
  return presence === "MISSING" ? "Отсутствует" : "Присутствует";
};

export const formatVerified = (value?: boolean | null) => {
  if (value === true) return "Да";
  if (value === false) return "Нет";
  return "—";
};
