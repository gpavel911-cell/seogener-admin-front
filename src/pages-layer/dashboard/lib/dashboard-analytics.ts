export const DASHBOARD_MAX_RANGE_DAYS = 30;

type DashboardAnalyticsFilterInput = {
  projectId: string;
  dateFrom: string;
  dateTo: string;
  today?: string;
};

type DashboardDateRange = {
  dateFrom: string;
  dateTo: string;
};

export const getDefaultDashboardDateRange = (today = new Date()): DashboardDateRange => {
  const dateTo = formatDateInputValue(today);
  const previousMonth = new Date(today);
  previousMonth.setDate(previousMonth.getDate() - (DASHBOARD_MAX_RANGE_DAYS - 1));
  return {
    dateFrom: formatDateInputValue(previousMonth),
    dateTo,
  };
};

export const validateDashboardAnalyticsFilters = ({
  projectId,
  dateFrom,
  dateTo,
  today = formatDateInputValue(new Date()),
}: DashboardAnalyticsFilterInput): string | null => {
  if (!projectId) {
    return "Выберите проект.";
  }
  if (!dateFrom) {
    return "Укажите дату начала.";
  }
  if (!dateTo) {
    return "Укажите дату конца.";
  }
  if (dateFrom > dateTo) {
    return "Дата начала не может быть позже даты конца.";
  }
  if (dateFrom > today) {
    return "Дата начала не может быть позже сегодняшнего дня.";
  }
  if (dateTo > today) {
    return "Дата конца не может быть позже сегодняшнего дня.";
  }
  const daysInclusive = getDaysInclusive(dateFrom, dateTo);
  if (daysInclusive > DASHBOARD_MAX_RANGE_DAYS) {
    return `Период не может превышать ${DASHBOARD_MAX_RANGE_DAYS} дней.`;
  }
  return null;
};

const getDaysInclusive = (dateFrom: string, dateTo: string) => {
  const from = new Date(`${dateFrom}T00:00:00`);
  const to = new Date(`${dateTo}T00:00:00`);
  const diffMs = to.getTime() - from.getTime();
  return Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1;
};

export const formatDateInputValue = (value: Date) => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};
