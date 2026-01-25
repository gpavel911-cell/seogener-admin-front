"use client";

import { type ReactNode } from "react";

import { AuthGuard } from "@shared/ui/auth-guard";
import { AppLayout } from "@widgets/app-layout/app-layout";

type LayoutProps = {
  children: ReactNode;
};

export default function Layout({ children }: LayoutProps) {
  return (
    <AuthGuard>
      <AppLayout>{children}</AppLayout>
    </AuthGuard>
  );
}
