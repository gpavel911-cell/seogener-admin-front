"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useGetGeneratorProjectQuery } from "@entities/generator/api";
import { PlaceholderText, ResultLoader, useToast } from "@shared/ui";
import { apiErrorMessage } from "../lib/api-error";
import { wizardHref } from "../lib/wizard";

export function GeneratorProjectRedirectPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const id = Number(params.id);
  const { data, error, isLoading } = useGetGeneratorProjectQuery(id, { skip: Number.isNaN(id) });

  useEffect(() => {
    if (!error) {
      return;
    }
    showToast({ variant: "error", message: apiErrorMessage(error, "Не удалось открыть проект.") });
  }, [error, showToast]);

  useEffect(() => {
    if (!data) {
      return;
    }
    if (data.status === "RUNNING" || data.status === "ERROR" || data.currentStep === "RESULTS") {
      router.replace(wizardHref(data.id, "DOMAINS"));
      return;
    }
    router.replace(wizardHref(data.id, data.currentStep));
  }, [data, router]);

  if (isLoading) {
    return <ResultLoader label="Открытие проекта..." />;
  }
  if (error) {
    return <PlaceholderText>{apiErrorMessage(error, "Проект не найден.")}</PlaceholderText>;
  }
  return <ResultLoader label="Открытие проекта..." />;
}
