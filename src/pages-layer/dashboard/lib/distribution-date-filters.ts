import { formatDateInputValue } from "./dashboard-analytics";

type DistributionDateFilterInput = {
  dateFrom: string;
  dateTo: string;
  today?: string;
};

export const validateDistributionDateFilters = ({
  dateFrom,
  dateTo,
  today = formatDateInputValue(new Date()),
}: DistributionDateFilterInput): string | null => {
  if (!dateFrom) {
    return "Укажите дату от.";
  }
  if (!dateTo) {
    return "Укажите дату до.";
  }
  if (dateFrom > dateTo) {
    return "Дата от не может быть позже даты до.";
  }
  if (dateFrom > today) {
    return "Дата от не может быть позже сегодняшнего дня.";
  }
  if (dateTo > today) {
    return "Дата до не может быть позже сегодняшнего дня.";
  }
  return null;
};
