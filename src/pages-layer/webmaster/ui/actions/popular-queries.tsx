"use client";

import { useMemo, useState } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import styled from "styled-components";
import {
  useGetWebmasterHostsQuery,
  useGetWebmasterProfilesQuery,
  useLazyGetWebmasterPopularQueriesQuery,
} from "@entities/webmaster/api";
import { type WebmasterHostDto, type WebmasterPopularQueryDto, WebmasterProviderType } from "@entities/webmaster/types";
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableWrapper,
  useToast,
} from "@shared/ui";

const DEFAULT_PROVIDER = WebmasterProviderType.YANDEX_WEBMASTER;
const DEFAULT_RANGE_DAYS = 30;

const formatDate = (value: Date) => value.toISOString().slice(0, 10);

const buildDefaultDateRange = () => {
  const today = new Date();
  const dateTo = formatDate(today);
  const dateFrom = formatDate(new Date(today.getTime() - DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000));
  return { dateFrom, dateTo };
};

type ActionsSectionWebmasterPopularQueriesProps = {
  fixedProfile?: string | null;
};

export const PopularQueries = ({ fixedProfile }: ActionsSectionWebmasterPopularQueriesProps = {}) => {
  const { showToast } = useToast();
  const { dateFrom: defaultFrom, dateTo: defaultTo } = buildDefaultDateRange();
  const [activeProfile, setActiveProfile] = useState<string | null>(null);
  const [hostId, setHostId] = useState("");
  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(defaultTo);
  const [resultByProfile, setResultByProfile] = useState<{
    profile: string;
    data: unknown;
  } | null>(null);

  const { data: profilesRaw, isFetching: isProfilesFetching } = useGetWebmasterProfilesQuery();
  const profiles = useMemo(
    () => (profilesRaw ?? []).filter((profile) => profile.provider === DEFAULT_PROVIDER),
    [profilesRaw],
  );
  const resolvedProfile = useMemo(
    () => fixedProfile ?? activeProfile ?? profiles?.[0]?.profile ?? null,
    [fixedProfile, activeProfile, profiles],
  );
  const result = useMemo(
    () => (resolvedProfile && resultByProfile?.profile === resolvedProfile ? resultByProfile.data : null),
    [resolvedProfile, resultByProfile],
  );
  const hostsQueryArgs = resolvedProfile
    ? { provider: DEFAULT_PROVIDER, profile: resolvedProfile, pageNumber: 0, pageSize: 500 }
    : skipToken;
  const { data: hostsData, isFetching: isHostsFetching } = useGetWebmasterHostsQuery(hostsQueryArgs);
  const hosts = useMemo(() => hostsData?.content ?? [], [hostsData?.content]);
  const resolvedHostId = useMemo(() => {
    if (!hosts.length) {
      return "";
    }
    if (hostId && hosts.some((item) => item.hostId === hostId)) {
      return hostId;
    }
    return hosts[0]?.hostId ?? "";
  }, [hostId, hosts]);
  const rows = useMemo(() => normalizePopularRows(result), [result]);

  const [loadPopular, { isFetching }] = useLazyGetWebmasterPopularQueriesQuery();

  const handleLoad = async () => {
    if (!resolvedProfile) {
      showToast({ variant: "error", message: "Выберите профиль Вебмастера." });
      return;
    }
    if (!resolvedHostId) {
      showToast({ variant: "error", message: "Выберите сайт." });
      return;
    }
    try {
      const response = await loadPopular({
        provider: DEFAULT_PROVIDER,
        profile: resolvedProfile,
        hostId: resolvedHostId,
        dateFrom,
        dateTo,
      }).unwrap();
      setResultByProfile({
        profile: resolvedProfile,
        data: response,
      });
    } catch {
      showToast({ variant: "error", message: "Ошибка загрузки отчета." });
    }
  };

  return (
    <Stack>
      <FormCard>
        <FormRow>
          <FormFields>
            {!fixedProfile && (
              <FormField>
                <Label>Профиль Вебмастера</Label>
                <Select
                  value={resolvedProfile ?? ""}
                  onChange={(event) => setActiveProfile(event.target.value)}
                  disabled={isProfilesFetching}
                >
                  <option value="">Выберите профиль</option>
                  {(profiles ?? []).map((profile) => (
                    <option key={profile.profile} value={profile.profile}>
                      {profile.profile}
                    </option>
                  ))}
                </Select>
              </FormField>
            )}
            <FormField>
              <Label>Сайт</Label>
              <Select value={resolvedHostId} onChange={(event) => setHostId(event.target.value)} disabled={isHostsFetching}>
                {!hosts.length && <option value="">Нет сайтов</option>}
                {hosts.map((host) => (
                  <option key={`${host.id}-${host.hostId}`} value={host.hostId}>
                    {formatHostOptionLabel(host)}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField>
              <Label>Дата начала</Label>
              <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
            </FormField>
            <FormField>
              <Label>Дата конца</Label>
              <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
            </FormField>
          </FormFields>
          <Actions>
            <ActionButton type="button" onClick={handleLoad} disabled={isFetching}>
              {isFetching ? "Загрузка..." : "Показать"}
            </ActionButton>
          </Actions>
        </FormRow>
      </FormCard>
      <ResultCard>
        {!result ? (
          <Placeholder>Нет данных.</Placeholder>
        ) : (
          <TableWrapper>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Запрос</TableHeaderCell>
                  <TableHeaderCell>Показы</TableHeaderCell>
                  <TableHeaderCell>Клики</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3}>Нет данных.</TableCell>
                  </TableRow>
                ) : (
                  rows.map((row, index) => (
                    <TableRow key={`${row.query}-${index}`}>
                      <TableCell>{row.query}</TableCell>
                      <TableCell>{formatMetricValue(row.shows)}</TableCell>
                      <TableCell>{formatMetricValue(row.clicks)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableWrapper>
        )}
      </ResultCard>
    </Stack>
  );
};

const formatHostOptionLabel = (host: WebmasterHostDto): string => {
  const website = extractWebsite(host.hostUrl, host.hostId);
  if (website) {
    return website;
  }
  return host.hostId;
};

const formatMetricValue = (value: number | null): string => (value === null ? "—" : String(value));

const normalizePopularRows = (data: unknown): WebmasterPopularQueryDto[] => {
  if (Array.isArray(data)) {
    return data.map((item, index) => {
      if (isPopularQueryDto(item)) {
        return item;
      }
      return {
        query: `Запрос #${index + 1}`,
        shows: null,
        clicks: null,
      };
    });
  }

  if (data && typeof data === "object") {
    const queries = (data as { queries?: unknown }).queries;
    if (Array.isArray(queries)) {
      return queries.map((item, index) => {
        if (!item || typeof item !== "object") {
          return {
            query: `Запрос #${index + 1}`,
            shows: null,
            clicks: null,
          };
        }
        const row = item as Record<string, unknown>;
        const rawQuery = row.query ?? row.query_text ?? row.queryText;
        const query = typeof rawQuery === "string" && rawQuery.trim() ? rawQuery.trim() : `Запрос #${index + 1}`;
        return {
          query,
          shows: toNumberOrNull(row.shows ?? row.total_shows ?? row.TOTAL_SHOWS),
          clicks: toNumberOrNull(row.clicks ?? row.total_clicks ?? row.TOTAL_CLICKS),
        };
      });
    }
  }

  return [];
};

const toNumberOrNull = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const isPopularQueryDto = (value: unknown): value is WebmasterPopularQueryDto => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const row = value as Record<string, unknown>;
  return typeof row.query === "string" && "shows" in row && "clicks" in row;
};

const extractWebsite = (hostUrl?: string | null, hostId?: string | null): string | null => {
  if (hostUrl) {
    try {
      const parsed = new URL(hostUrl);
      if (parsed.hostname) {
        return parsed.hostname;
      }
    } catch {
      const withoutProtocol = hostUrl.replace(/^https?:\/\//, "");
      const firstPart = withoutProtocol.split("/")[0]?.trim();
      if (firstPart) {
        return firstPart;
      }
    }
  }

  if (hostId) {
    const parts = hostId.split(":").filter(Boolean);
    if (parts.length >= 2) {
      return parts[1];
    }
    return hostId;
  }

  return null;
};

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const FormCard = styled.div`
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: #ffffff;
`;

const FormRow = styled.div`
  display: flex;
  flex-wrap: nowrap;
  gap: 16px;
  align-items: flex-end;
  overflow-x: auto;
  padding-bottom: 4px;
`;

const FormFields = styled.div`
  display: flex;
  flex-wrap: nowrap;
  gap: 12px;
  flex: 0 1 auto;
  align-items: flex-end;
  justify-content: flex-start;
`;

const FormField = styled.label`
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 0 1 300px;
  min-width: 220px;
  max-width: 300px;
`;

const Label = styled.span`
  font-size: 14px;
  color: #374151;
`;

const Select = styled.select`
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 14px;
  width: 100%;
  max-width: 300px;
`;

const Input = styled.input`
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 14px;
  width: 100%;
  max-width: 300px;
`;

const Actions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-start;
  align-items: flex-end;
  flex: 0 0 auto;
`;

const ActionButton = styled(Button)`
  font-weight: 600;
  box-shadow: 0 10px 18px rgba(37, 99, 235, 0.2);
`;

const ResultCard = styled.div`
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
  background: #ffffff;
  min-height: 160px;
`;

const Placeholder = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 128px;
  width: 100%;
  color: #6b7280;
  font-size: 14px;
  text-align: center;
`;
