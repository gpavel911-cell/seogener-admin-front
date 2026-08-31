"use client";

import { useMemo, useState } from "react";
import styled from "styled-components";
import { useSuggestGeneratorDomainsMutation, useUpdateGeneratorDomainsMutation } from "@entities/generator/api";
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
  keywords: string[];
};

function clusterIdOf(cluster: GeneratorCluster, index: number): string {
  return String(cluster.cluster_id ?? cluster.clusterId ?? index + 1);
}

function clusterH1(cluster: GeneratorCluster): string {
  return String(cluster.h1_main ?? cluster.service ?? cluster.h1 ?? "");
}

function clusterKeywords(cluster: GeneratorCluster): string[] {
  const raw = cluster.keywords;
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }
      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        return String(record.keyword ?? record.key ?? record.phrase ?? "");
      }
      return "";
    })
    .filter((item) => item.length > 0);
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

function savedProjectDomains(snapshot: GeneratorProjectSnapshot): string[] {
  if (!snapshot.completedSteps.domains) {
    return [];
  }
  return Array.from(new Set((snapshot.domains ?? []).map((item) => item.domain).filter(Boolean)));
}

export function DomainsStep({ snapshot, onSaved, onContinue }: Props) {
  const { showToast } = useToast();
  const saved = snapshot.completedSteps.domains;
  const [textarea, setTextarea] = useState("");
  const [projectDomains, setProjectDomains] = useState<string[]>(() => savedProjectDomains(snapshot));
  const [updateDomains, { isLoading }] = useUpdateGeneratorDomainsMutation();
  const [suggestDomains, { isLoading: isSuggesting }] = useSuggestGeneratorDomainsMutation();
  const clusters = snapshot.clusters ?? [];
  const [rows, setRows] = useState<RowState[]>(() =>
    clusters.map((cluster, index) => {
      const clusterId = clusterIdOf(cluster, index);
      const mapped = snapshot.domains.find((item) => item.clusterId === clusterId);
      return {
        clusterId,
        h1: mapped?.h1 || clusterH1(cluster),
        domain: saved ? (mapped?.domain ?? "") : "",
        siteName: mapped?.siteName ?? "",
        siteType: mapped?.siteType ?? snapshot.siteType ?? "NICHE",
        keywords: clusterKeywords(cluster),
      };
    }),
  );

  const assignedCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    rows.forEach((row) => {
      if (!row.domain) {
        return;
      }
      counts[row.domain] = (counts[row.domain] ?? 0) + 1;
    });
    return counts;
  }, [rows]);

  const handleAdd = () => {
    const domains = parseDomainList(textarea);
    if (!domains.length) {
      showToast({ variant: "error", message: "Укажите хотя бы один домен" });
      return;
    }
    setProjectDomains((current) => {
      const next = [...current];
      domains.forEach((domain) => {
        if (!next.includes(domain)) {
          next.push(domain);
        }
      });
      return next;
    });
    setTextarea("");
  };

  const handleRemoveDomain = (domain: string) => {
    setProjectDomains((current) => current.filter((item) => item !== domain));
    setRows((current) => current.map((row) => (row.domain === domain ? { ...row, domain: "" } : row)));
  };

  const handleDistribute = () => {
    if (!projectDomains.length) {
      showToast({ variant: "error", message: "Сначала добавьте хотя бы один домен" });
      return;
    }
    const unassigned = rows.filter((row) => !row.domain);
    if (!unassigned.length) {
      showToast({ variant: "success", message: "Все кластеры уже привязаны к доменам" });
      return;
    }
    setRows((current) => {
      let offset = 0;
      return current.map((row) => {
        if (row.domain) {
          return row;
        }
        const domain = projectDomains[offset % projectDomains.length];
        offset += 1;
        return { ...row, domain };
      });
    });
    showToast({
      variant: "success",
      message: `Распределено ${unassigned.length} кластер(ов) по ${projectDomains.length} домен(ам)`,
    });
  };

  const handleSuggest = async () => {
    if (!projectDomains.length) {
      showToast({ variant: "error", message: "Сначала добавьте хотя бы один домен" });
      return;
    }
    const unassigned = rows.filter((row) => !row.domain);
    if (!unassigned.length) {
      showToast({ variant: "success", message: "Все кластеры уже привязаны к доменам" });
      return;
    }
    try {
      const result = await suggestDomains({
        id: snapshot.id,
        domains: projectDomains,
        clusters: unassigned.map((row) => ({
          cluster_id: row.clusterId,
          h1_main: row.h1,
          keywords: row.keywords,
        })),
      }).unwrap();
      const suggestions = result.suggestions ?? {};
      let applied = 0;
      const nextRows = rows.map((row) => {
        if (row.domain) {
          return row;
        }
        const domain = suggestions[row.clusterId];
        if (domain && projectDomains.includes(domain)) {
          applied += 1;
          return { ...row, domain };
        }
        return row;
      });
      setRows(nextRows);
      if (!applied) {
        showToast({ variant: "success", message: "ИИ не нашёл уверенных соответствий — распределите вручную" });
        return;
      }
      showToast({
        variant: "success",
        message: `Подобрано ${applied} домен(ов) по смыслу — проверьте перед сохранением`,
      });
    } catch (error) {
      showToast({ variant: "error", message: apiErrorMessage(error, "Не удалось подсказать домены.") });
    }
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
        <FormSectionHeading>Домены проекта</FormSectionHeading>
        <ConstrainedField>
          <WizardFieldLabel>Список доменов</WizardFieldLabel>
          <WizardTextArea
            value={textarea}
            onChange={(event) => setTextarea(event.target.value)}
            placeholder={"example.ru\nsecond.ru"}
          />
        </ConstrainedField>
        <WizardActions>
          <Button type="button" onClick={handleAdd}>
            Добавить домен(ы)
          </Button>
        </WizardActions>
        {projectDomains.length ? (
          <DomainChips>
            {projectDomains.map((domain) => (
              <DomainChip key={domain}>
                {domain} <ChipCount>({assignedCounts[domain] ?? 0})</ChipCount>
                <ChipRemove type="button" aria-label={`Удалить ${domain}`} onClick={() => handleRemoveDomain(domain)}>
                  ×
                </ChipRemove>
              </DomainChip>
            ))}
          </DomainChips>
        ) : null}
        <WizardActions>
          <Button type="button" disabled={!projectDomains.length} onClick={handleDistribute}>
            Распределить поровну
          </Button>
          <Button type="button" disabled={!projectDomains.length || isSuggesting} onClick={() => void handleSuggest()}>
            {isSuggesting ? "Подбираю..." : "Подсказать домены по смыслу"}
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
                    <SelectControl
                      value={row.domain}
                      onValueChange={(value) =>
                        setRows((current) => current.map((item, idx) => (idx === index ? { ...item, domain: value } : item)))
                      }
                      options={Array.from(new Set([...projectDomains, row.domain].filter(Boolean))).map((domain) => ({
                        value: domain,
                        label: domain,
                      }))}
                      placeholder="— выберите домен —"
                    />
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
          Сохранить маппинг
        </Button>
      </WizardActions>
    </StepStack>
  );
}

const DomainChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const DomainChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 999px;
  background: ${({ theme }) => theme.tokens.color.accentMuted};
  color: ${({ theme }) => theme.tokens.color.textPrimary};
  font-size: 13px;
`;

const ChipCount = styled.span`
  color: ${({ theme }) => theme.tokens.color.textMuted};
`;

const ChipRemove = styled.button`
  border: 0;
  background: transparent;
  color: ${({ theme }) => theme.tokens.color.textMuted};
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  padding: 0;
`;
