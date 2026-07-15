export type SortDirection = "asc" | "desc";

export const compareDashboardNumericValues = (
  left?: number | null,
  right?: number | null,
  direction: SortDirection = "asc",
) => {
  if (left == null && right == null) {
    return 0;
  }
  if (left == null) {
    return 1;
  }
  if (right == null) {
    return -1;
  }
  return direction === "asc" ? left - right : right - left;
};
