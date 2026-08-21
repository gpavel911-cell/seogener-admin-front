"use client";

import { useState } from "react";
import {
  useCreateGeneratorProjectMutation,
  useUpdateGeneratorProjectMutation,
} from "@entities/generator/api";
import type { GeneratorProjectSnapshot, GeneratorSiteType } from "@entities/generator/types";
import { Button, SelectControl, useToast } from "@shared/ui";
import { apiErrorMessage } from "../../lib/api-error";
import {
  ConstrainedField,
  FieldRow,
  FormSection,
  StepStack,
  WizardActions,
  WizardFieldLabel,
  WizardInput,
} from "../fields";

type Props = {
  snapshot?: GeneratorProjectSnapshot;
  onSaved: (next: GeneratorProjectSnapshot) => void;
  onContinue: (next: GeneratorProjectSnapshot) => void;
};

export function ProjectStep({ snapshot, onSaved, onContinue }: Props) {
  const { showToast } = useToast();
  const [niche, setNiche] = useState(snapshot?.niche ?? "");
  const [geo, setGeo] = useState(snapshot?.geo ?? "");
  const [siteType, setSiteType] = useState<GeneratorSiteType>(snapshot?.siteType ?? "NICHE");
  const [createProject, { isLoading: isCreating }] = useCreateGeneratorProjectMutation();
  const [updateProject, { isLoading: isUpdating }] = useUpdateGeneratorProjectMutation();
  const isSaving = isCreating || isUpdating;

  const handleContinue = async () => {
    if (!niche.trim()) {
      showToast({ variant: "error", message: "Ниша обязательна" });
      return;
    }
    try {
      if (snapshot?.id) {
        const next = await updateProject({ id: snapshot.id, niche: niche.trim(), geo: geo.trim(), siteType }).unwrap();
        onSaved(next);
        onContinue(next);
      } else {
        const next = await createProject({ niche: niche.trim(), geo: geo.trim() || undefined, siteType }).unwrap();
        onSaved(next);
        onContinue(next);
      }
    } catch (error) {
      showToast({ variant: "error", message: apiErrorMessage(error, "Не удалось сохранить проект.") });
    }
  };

  return (
    <StepStack>
      <FormSection>
        <FieldRow>
          <ConstrainedField>
            <WizardFieldLabel required tooltip="Основное направление бизнеса — определяет дизайн и контент">
              Ниша
            </WizardFieldLabel>
            <WizardInput value={niche} onChange={(event) => setNiche(event.target.value)} placeholder="Металлообработка" />
          </ConstrainedField>
          <ConstrainedField>
            <WizardFieldLabel tooltip="Город или регион">Гео</WizardFieldLabel>
            <WizardInput value={geo} onChange={(event) => setGeo(event.target.value)} placeholder="Москва" />
          </ConstrainedField>
        </FieldRow>
        <ConstrainedField>
          <WizardFieldLabel>Тип сайта</WizardFieldLabel>
          <SelectControl
            value={siteType}
            onValueChange={(value) => setSiteType(value as GeneratorSiteType)}
            options={[
              { value: "NICHE", label: "Нишевый" },
              { value: "AGGREGATOR", label: "Агрегатор" },
            ]}
          />
        </ConstrainedField>
      </FormSection>
      <WizardActions>
        <Button type="button" variant="primary" disabled={isSaving} onClick={() => void handleContinue()}>
          Далее
        </Button>
      </WizardActions>
    </StepStack>
  );
}
