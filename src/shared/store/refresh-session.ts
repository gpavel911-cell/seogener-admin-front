import type { AuthResponse } from "@entities/auth/types";

let inFlightRefresh: Promise<AuthResponse> | null = null;

export const runSingleFlightRefresh = (refresher: () => Promise<AuthResponse>) => {
  if (!inFlightRefresh) {
    inFlightRefresh = refresher().finally(() => {
      inFlightRefresh = null;
    });
  }

  return inFlightRefresh;
};
