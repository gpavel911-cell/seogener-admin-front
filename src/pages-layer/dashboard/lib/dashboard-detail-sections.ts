export const DASHBOARD_SECTION_PREVIEW_ROWS = 5;

export const getVisibleDashboardSectionRows = <TRow>(rows: TRow[], expanded: boolean) => {
  if (expanded) {
    return rows;
  }
  return rows.slice(0, DASHBOARD_SECTION_PREVIEW_ROWS);
};

export const canToggleDashboardSection = <TRow>(rows: TRow[]) => rows.length > DASHBOARD_SECTION_PREVIEW_ROWS;
