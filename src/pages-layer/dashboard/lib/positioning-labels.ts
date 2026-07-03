const UNAVAILABLE_PLACEHOLDER = "–";

export const formatPositioningPosition = (position: string | null | undefined, isLoading: boolean): string => {
  if (isLoading) {
    return UNAVAILABLE_PLACEHOLDER;
  }
  if (position === null || position === undefined || position.length === 0) {
    return UNAVAILABLE_PLACEHOLDER;
  }
  if (position === "NOT_IN_TOP") {
    return "Не в топе";
  }
  if (position === "ERROR") {
    return "Ошибка";
  }
  return position;
};
