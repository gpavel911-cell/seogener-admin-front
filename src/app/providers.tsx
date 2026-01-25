"use client";

import { type ReactNode } from "react";
import { Provider } from "react-redux";

import { store } from "@shared/store";
import { ToastProvider } from "@shared/ui";

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  return (
    <Provider store={store}>
      <ToastProvider>{children}</ToastProvider>
    </Provider>
  );
}
