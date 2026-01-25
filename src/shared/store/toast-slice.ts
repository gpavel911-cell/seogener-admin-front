import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type ToastVariant = "success" | "error";

type ToastPayload = {
  message: string;
  variant: ToastVariant;
  durationMs?: number;
};

export type ToastItem = {
  id: number;
  message: string;
  variant: ToastVariant;
  durationMs: number;
};

type ToastState = {
  toasts: ToastItem[];
};

const initialState: ToastState = {
  toasts: [],
};

const toastSlice = createSlice({
  name: "toast",
  initialState,
  reducers: {
    showToast: (state, action: PayloadAction<ToastPayload>) => {
      const toast: ToastItem = {
        id: Date.now(),
        message: action.payload.message,
        variant: action.payload.variant,
        durationMs: action.payload.durationMs ?? 3000,
      };
      state.toasts = [...state.toasts, toast].slice(-3);
    },
    clearToast: (state, action: PayloadAction<number>) => {
      state.toasts = state.toasts.filter((toast) => toast.id !== action.payload);
    },
  },
});

export const { showToast, clearToast } = toastSlice.actions;
export default toastSlice.reducer;
