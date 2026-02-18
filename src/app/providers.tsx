"use client";

import { type ReactNode } from "react";
import { Provider } from "react-redux";
import { ThemeProvider } from "styled-components";

import { appTheme } from "@shared/styles";
import { store } from "@shared/store";
import { ToastProvider } from "@shared/ui";

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  return (
    <Provider store={store}>
      <ThemeProvider theme={appTheme}>
        <ToastProvider>{children}</ToastProvider>
      </ThemeProvider>
    </Provider>
  );
}
