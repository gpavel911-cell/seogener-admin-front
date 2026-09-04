export type MetricsOverlay =
  | { type: "create-counter" }
  | { type: "create-counters-bulk" }
  | { type: "statistics"; counterId: string }
  | { type: "goals"; counterId: string };

export const METRICS_WIDE_OVERLAY_WIDTH = "1180px";

export function getMetricsOverlayTitle(overlay: MetricsOverlay): string {
  switch (overlay.type) {
    case "create-counter":
      return "Создать счетчик";
    case "create-counters-bulk":
      return "Создать счетчики";
    case "statistics":
      return "Посмотреть статистику";
    case "goals":
      return "Посмотреть цели";
  }
}

export function isWideMetricsOverlay(overlay: MetricsOverlay): boolean {
  return overlay.type === "create-counters-bulk";
}
