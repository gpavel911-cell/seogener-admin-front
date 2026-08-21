"use client";

import { useMemo, useState } from "react";
import { useUpdateGeneratorDomainsMutation } from "@entities/generator/api";
import type { GeneratorCluster, GeneratorProjectSnapshot, GeneratorSiteType } from "@entities/generator/types";
import { Button, SelectControl, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, TableWrapper, useToast } from "@shared/ui";
import { apiErrorMessage } from "../../lib/api-error";
import {
  ConstrainedField,
  FormSection,
  FormSectionHeading,
  StepStack,
  WizardActions,
  WizardFieldLabel,
  WizardHint,
  WizardInput,
  WizardTextArea,
} from "../fields";

type Props = {
  snapshot: GeneratorProjectSnapshot;
  onSaved: (next: GeneratorProjectSnapshot) => void;
  onContinue: (next: GeneratorProjectSnapshot) => void;
};

type RowState = {
  clusterId: string;
  h1: string;
  domain: string;
  siteName: string;
  siteType: GeneratorSiteType;
};

function clusterIdOf(cluster: GeneratorCluster, index: number): string {
  return String(cluster.cluster_id ?? cluster.clusterId ?? index + 1);
}

function clusterH1(cluster: GeneratorCluster): string {
  return String(cluster.h1_main ?? cluster.service ?? cluster.h1 ?? "");
}

function parseDomainList(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/[\n,;]+/)
        .map((line) => line.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, ""))
        .filter(Boolean),
    ),
  );
}

export function DomainsStep({ snapshot, onSaved, onContinue }: Props) {
  const { showToast } = useToast();
  const existingDomains = snapshot.domains?.map((item) => item.domain).filter(Boolean) ?? [];
  const [textarea, setTextarea] = useState(existingDomains.join("\n"));
  const [updateDomains, { isLoading }] = useUpdateGeneratorDomainsMutation();
  const clusters = snapshot.clusters ?? [];
  const [rows, setRows] = useState<RowState[]>(() =>
    clusters.map((cluster, index) => {
      const clusterId = clusterIdOf(cluster, index);
      const mapped = snapshot.domains.find((item) => item.clusterId === clusterId);
      return {
        clusterId,
        h1: mapped?.h1 || clusterH1(cluster),
        domain: mapped?.domain ?? "",
        siteName: mapped?.siteName ?? "",
        siteType: mapped?.siteType ?? snapshot.siteType ?? "NICHE",
      };
    }),
  );

  const domainOptions = useMemo(() => parseDomainList(textarea), [textarea]);

  const handleAdd = () => {
    const domains = parseDomainList(textarea);
    if (!domains.length) {
      showToast({ variant: "error", message: "Укажите хотя бы один домен" });
      return;
    }
    setRows((current) =>
      current.map((row, index) => ({
        ...row,
        domain: domains[index] ?? row.domain,
      })),
    );
  };

  const handleContinue = async () => {
    const mappings = rows
      .filter((row) => row.domain.trim() && row.clusterId)
      .map((row) => ({
        domain: row.domain.trim(),
        clusterId: row.clusterId,
        h1: row.h1,
        siteName: row.siteName,
        siteType: row.siteType,
      }));
    try {
      const next = await updateDomains({ id: snapshot.id, mappings }).unwrap();
      onSaved(next);
      onContinue(next);
    } catch (error) {
      showToast({ variant: "error", message: apiErrorMessage(error, "Не удалось сохранить домены.") });
    }
  };

  if (!clusters.length) {
    return (
      <StepStack>
        <FormSection>
          <WizardHint>Нет кластеров — вернитесь к шагу Ключи и подтвердите кластеры.</WizardHint>
        </FormSection>
      </StepStack>
    );
  }

  return (
    <StepStack>
      <FormSection>
        <FormSectionHeading tooltip="Один домен на строку или через запятую. Затем привяжите услугу, домен, тип и название сайта.">
          Домены проекта
        </FormSectionHeading>
        <ConstrainedField>
          <WizardFieldLabel tooltip="Можно вставить сразу несколько доменов — по одному на строку или через запятую.">
            Список доменов
          </WizardFieldLabel>
          <WizardTextArea
            value={textarea}
            onChange={(event) => setTextarea(event.target.value)}
            placeholder={"example.ru\nsecond.ru"}
          />
        </ConstrainedField>
        <WizardActions>
          <Button type="button" onClick={handleAdd}>
            Добавить
          </Button>
        </WizardActions>
        <TableWrapper>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Услуга</TableHeaderCell>
                <TableHeaderCell>Домен</TableHeaderCell>
                <TableHeaderCell>Тип</TableHeaderCell>
                <TableHeaderCell>Название сайта</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={row.clusterId}>
                  <TableCell>
                    <WizardInput
                      value={row.h1}
                      onChange={(event) =>
                        setRows((current) => current.map((item, idx) => (idx === index ? { ...item, h1: event.target.value } : item)))
                      }
                    />
                  </TableCell>
                  <TableCell>
                    {domainOptions.length ? (
                      <SelectControl
                        value={row.domain}
                        onValueChange={(value) =>
                          setRows((current) => current.map((item, idx) => (idx === index ? { ...item, domain: value } : item)))
                        }
                        options={Array.from(new Set([...domainOptions, row.domain].filter(Boolean))).map((domain) => ({
                          value: domain,
                          label: domain,
                        }))}
                        placeholder="Домен"
                      />
                    ) : (
                      <WizardInput
                        value={row.domain}
                        onChange={(event) =>
                          setRows((current) =>
                            current.map((item, idx) => (idx === index ? { ...item, domain: event.target.value } : item)),
                          )
                        }
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <SelectControl
                      value={row.siteType}
                      onValueChange={(value) =>
                        setRows((current) =>
                          current.map((item, idx) => (idx === index ? { ...item, siteType: value as GeneratorSiteType } : item)),
                        )
                      }
                      options={[
                        { value: "NICHE", label: "Нишевый" },
                        { value: "AGGREGATOR", label: "Агрегатор" },
                      ]}
                    />
                  </TableCell>
                  <TableCell>
                    <WizardInput
                      value={row.siteName}
                      onChange={(event) =>
                        setRows((current) =>
                          current.map((item, idx) => (idx === index ? { ...item, siteName: event.target.value } : item)),
                        )
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableWrapper>
      </FormSection>
      <WizardActions>
        <Button type="button" variant="primary" disabled={isLoading} onClick={() => void handleContinue()}>
          Далее
        </Button>
      </WizardActions>
    </StepStack>
  );
}
