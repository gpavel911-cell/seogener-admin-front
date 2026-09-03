import { useEffect, useMemo, useState } from "react";
import { useLazyGetRegistrarDnsRecordsQuery } from "@entities/registrars/api";
import type { ListDnsRecordsResponse, RegistrarProviderType } from "@entities/registrars/types";
import {
  CenteredState,
  PlaceholderText,
  ResultLoader,
  ResultCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableWrapper,
} from "@shared/ui";

type ViewDnsRecordsProps = {
  registrar: RegistrarProviderType;
  profile: string;
  domain: string;
};

export const ViewDnsRecords = ({
  registrar,
  profile,
  domain,
}: ViewDnsRecordsProps) => {
  const [recordsResponse, setRecordsResponse] = useState<ListDnsRecordsResponse | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loadRecords, { isFetching: isListFetching }] = useLazyGetRegistrarDnsRecordsQuery();

  useEffect(() => {
    let cancelled = false;
    const loadBoundDomain = async () => {
      try {
        const response = await loadRecords({
          registrar,
          profileId: profile,
          domain,
        }).unwrap();
        if (cancelled) {
          return;
        }
        setRecordsResponse(response);
        setLoadError("");
      } catch (error) {
        if (cancelled) {
          return;
        }
        setRecordsResponse(null);
        const message =
          typeof error === "object" && error !== null && "data" in error
            ? (error as { data?: { message?: string } }).data?.message
            : undefined;
        setLoadError(message || "Ошибка загрузки записей.");
      }
    };
    void loadBoundDomain();
    return () => {
      cancelled = true;
    };
  }, [domain, loadRecords, profile, registrar]);

  const sortedRecords = useMemo(() => {
    if (!recordsResponse?.groups) {
      return [];
    }
    const items = recordsResponse.groups.flatMap((group) =>
      group.records.map((record) => ({
        ...record,
        rectype: record.rectype || group.rectype,
      })),
    );
    return items.sort((left, right) => String(left.rectype).localeCompare(String(right.rectype)));
  }, [recordsResponse]);
  const hasRecords = sortedRecords.length > 0;
  const domainName = recordsResponse?.domain ?? "";
  const ttlSeconds = useMemo(() => {
    const rawTtl = recordsResponse?.soa?.ttl ?? recordsResponse?.soa?.minimumTtl ?? "";
    const trimmed = rawTtl.trim();
    if (!trimmed) {
      return null;
    }
    const match = trimmed.match(/^(\d+)([smhdw])?$/i);
    if (!match) {
      return null;
    }
    const value = Number(match[1]);
    if (Number.isNaN(value)) {
      return null;
    }
    const unit = (match[2] || "s").toLowerCase();
    const multiplier = unit === "m"
      ? 60
      : unit === "h"
        ? 3600
        : unit === "d"
          ? 86400
          : unit === "w"
            ? 604800
            : 1;
    return value * multiplier;
  }, [recordsResponse]);

  const formatRecordName = (subname: string | null | undefined) => {
    if (!domainName) {
      return subname || "@";
    }
    const normalized = subname && subname.trim().length > 0 ? subname.trim() : "@";
    if (normalized === "@") {
      return `${domainName}.`;
    }
    return `${normalized}.${domainName}.`;
  };

  return (
    <ResultCard>
      {isListFetching ? (
        <ResultLoader label="Загрузка записей..." />
      ) : loadError ? (
        <CenteredState>
          <PlaceholderText>{loadError}</PlaceholderText>
        </CenteredState>
      ) : recordsResponse === null || !hasRecords ? (
        <CenteredState>
          <PlaceholderText>Нет данных для отображения.</PlaceholderText>
        </CenteredState>
      ) : (
        <TableWrapper>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Название</TableHeaderCell>
                <TableHeaderCell>TTL, сек</TableHeaderCell>
                <TableHeaderCell>Тип</TableHeaderCell>
                <TableHeaderCell>Значение</TableHeaderCell>
                <TableHeaderCell>Приоритет</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedRecords.map((record, index) => (
                <TableRow key={`${record.subname}-${record.content}-${index}`}>
                  <TableCell>{formatRecordName(record.subname)}</TableCell>
                  <TableCell>{ttlSeconds ?? "-"}</TableCell>
                  <TableCell>{record.rectype || "-"}</TableCell>
                  <TableCell>{record.content || "-"}</TableCell>
                  <TableCell>{record.priority ?? "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableWrapper>
      )}
    </ResultCard>
  );
};
