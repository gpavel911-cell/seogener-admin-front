import type { AuthUser } from "@/entities/auth/types";

export type StoredAuthState = {
  accessToken: string | null;
  user: AuthUser | null;
};

const STORAGE_KEY = "landings-admin-auth";

const emptyState: StoredAuthState = {
  accessToken: null,
  user: null,
};

export const loadAuthState = (): StoredAuthState => {
  if (typeof window === "undefined") {
    return emptyState;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return emptyState;
    }
    const parsed = JSON.parse(raw) as StoredAuthState;
    if (!parsed?.accessToken || !parsed?.user) {
      return emptyState;
    }
    return parsed;
  } catch {
    return emptyState;
  }
};

export const persistAuthState = (state: StoredAuthState) => {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const clearAuthState = () => {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.removeItem(STORAGE_KEY);
};
