import { type ReactNode } from "react";

import { AppLayout } from "@/widgets/app-layout/app-layout";

type LayoutProps = {
  children: ReactNode;
};

export default function Layout({ children }: LayoutProps) {
  return <AppLayout>{children}</AppLayout>;
}
