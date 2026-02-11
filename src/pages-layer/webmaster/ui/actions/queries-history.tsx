"use client";

import { useMemo, useState } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import styled from "styled-components";
import {
  useGetWebmasterHostsQuery,
  useGetWebmasterProfilesQuery,
  useLazyGetWebmasterSearchQueriesHistoryQuery,
} from "@entities/webmaster/api";
import {
  type WebmasterHostDto,
  type WebmasterSearchQueryStatisticsPointDto,
  WebmasterProviderType,
} from "@entities/webmaster/types";
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
const DAY_MS = 24 * 60 * 60 * 1000;

const formatDate = (value: Date) => value.toISOString().slice(0, 10);

const buildDefaultDateRange = () => {
  const today = new Date();
  const dateTo = formatDate(today);
  const dateFrom = formatDate(new Date(today.getTime() - (DEFAULT_RANGE_DAYS - 1) * 24 * 60 * 60 * 1000));
  return { dateFrom, dateTo };
};

type ActionsSectionWebmasterQueriesHistoryProps = {
  fixedProfile?: string | null;
};

export const QueriesHistory = ({ fixedProfile }: ActionsSectionWebmasterQueriesHistoryProps = {}) => {
  const { showToast } = useToast();
  const { dateFrom: defaultFrom, dateTo: defaultTo } = buildDefaultDateRange();
  const [activeProfile, setActiveProfile] = useState<string | null>(null);
  const [hostId, setHostId] = useState("");
  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(defaultTo);
  const [resultByProfile, setResultByProfile] = useState<{
    profile: string;
    data: WebmasterSearchQueryStatisticsPointDto[];
    dateFrom: string;
    dateTo: string;
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
    () => (resolvedProfile && resultByProfile?.profile === resolvedProfile ? resultByProfile : null),
    [resolvedProfile, resultByProfile],
  );
  const resultRows = useMemo(
    () => (result ? buildRowsWithFullRange(result.data, result.dateFrom, result.dateTo) : []),
    [result],
  );
  const weekRows = useMemo(() => resultRows.slice(-7), [resultRows]);
  const displayWeekRows = useMemo(() => [...weekRows].reverse(), [weekRows]);
  const totalShows = useMemo(() => resultRows.reduce((acc, row) => acc + row.shows, 0), [resultRows]);
  const totalClicks = useMemo(() => resultRows.reduce((acc, row) => acc + row.clicks, 0), [resultRows]);
  const totalCtr = useMemo(() => (totalShows > 0 ? roundToTwoDecimals((totalClicks * 100) / totalShows) : null), [totalClicks, totalShows]);
  const totalAvgShowPosition = useMemo(() => {
    let weighted = 0;
    let weight = 0;
    for (const row of resultRows) {
      if (row.avgShowPosition === null) {
        continue;
      }
      const rowWeight = row.shows > 0 ? row.shows : 1;
      weighted += row.avgShowPosition * rowWeight;
      weight += rowWeight;
    }
    return weight > 0 ? roundToTwoDecimals(weighted / weight) : null;
  }, [resultRows]);
  const totalAvgClickPosition = useMemo(() => {
    let weighted = 0;
    let weight = 0;
    for (const row of resultRows) {
      if (row.avgClickPosition === null) {
        continue;
      }
      const rowWeight = row.clicks > 0 ? row.clicks : 1;
      weighted += row.avgClickPosition * rowWeight;
      weight += rowWeight;
    }
    return weight > 0 ? roundToTwoDecimals(weighted / weight) : null;
  }, [resultRows]);
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

  const [loadHistory, { isFetching }] = useLazyGetWebmasterSearchQueriesHistoryQuery();

  const handleLoad = async () => {
    if (!resolvedProfile) {
      showToast({ variant: "error", message: "Выберите профиль Вебмастера." });
      return;
    }
    if (!resolvedHostId) {
      showToast({ variant: "error", message: "Выберите сайт." });
      return;
    }
    if (!isValidOneMonthRange(dateFrom, dateTo)) {
      showToast({ variant: "error", message: "Период не может превышать 1 месяц." });
      return;
    }

    try {
      const response = await loadHistory({
        provider: DEFAULT_PROVIDER,
        profile: resolvedProfile,
        hostId: resolvedHostId,
        dateFrom,
        dateTo,
      }).unwrap();
      setResultByProfile({
        profile: resolvedProfile,
        data: normalizeSearchQueryStatisticsResponse(response),
        dateFrom,
        dateTo,
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
              <Input type="date" value={dateFrom} max={dateTo} onChange={(event) => setDateFrom(event.target.value)} />
            </FormField>
            <FormField>
              <Label>Дата конца</Label>
              <Input type="date" value={dateTo} min={dateFrom} onChange={(event) => setDateTo(event.target.value)} />
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
        ) : weekRows.length === 0 ? (
          <Placeholder>Нет данных по выбранному периоду.</Placeholder>
        ) : (
          <TableWrapper>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Показатель</TableHeaderCell>
                  <TableHeaderCell>Итого</TableHeaderCell>
                  {displayWeekRows.map((row) => (
                    <TableHeaderCell key={row.date}>{formatDayLabel(row.date)}</TableHeaderCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>Показы</TableCell>
                  <TableCell>{formatIntegerValue(totalShows)}</TableCell>
                  {displayWeekRows.map((row) => (
                    <TableCell key={`shows-${row.date}`}>{formatIntegerValue(row.shows)}</TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell>Клики</TableCell>
                  <TableCell>{formatIntegerValue(totalClicks)}</TableCell>
                  {displayWeekRows.map((row) => (
                    <TableCell key={`clicks-${row.date}`}>{formatIntegerValue(row.clicks)}</TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell>CTR (%)</TableCell>
                  <TableCell>{formatPercentageValue(totalCtr)}</TableCell>
                  {displayWeekRows.map((row) => (
                    <TableCell key={`ctr-${row.date}`}>{formatPercentageValue(row.ctr)}</TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell>Средняя позиция</TableCell>
                  <TableCell>{formatPositionValue(totalAvgShowPosition)}</TableCell>
                  {displayWeekRows.map((row) => (
                    <TableCell key={`avg-show-position-${row.date}`}>{formatPositionValue(row.avgShowPosition)}</TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell>Средняя позиция клика</TableCell>
                  <TableCell>{formatPositionValue(totalAvgClickPosition)}</TableCell>
                  {displayWeekRows.map((row) => (
                    <TableCell key={`avg-click-position-${row.date}`}>{formatPositionValue(row.avgClickPosition)}</TableCell>
                  ))}
                </TableRow>
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

const formatDayLabel = (date: string): string => {
  if (date.length >= 10) {
    return `${date.slice(8, 10)}.${date.slice(5, 7)}`;
  }
  return date;
};

const formatIntegerValue = (value: number): string => value.toLocaleString("ru-RU");

const formatPercentageValue = (value: number | null): string => (value === null ? "—" : `${value.toFixed(2)}%`);

const formatPositionValue = (value: number | null): string => (value === null ? "—" : value.toFixed(2));

const buildRowsWithFullRange = (
  rows: WebmasterSearchQueryStatisticsPointDto[],
  dateFrom: string,
  dateTo: string,
): WebmasterSearchQueryStatisticsPointDto[] => {
  const fromDate = parseDate(dateFrom);
  const toDate = parseDate(dateTo);
  if (!fromDate || !toDate || fromDate > toDate) {
    return rows;
  }

  const byDate = new Map(rows.map((row) => [row.date, row]));
  const result: WebmasterSearchQueryStatisticsPointDto[] = [];

  for (let cursor = new Date(fromDate.getTime()); cursor <= toDate; cursor = new Date(cursor.getTime() + DAY_MS)) {
    const date = formatDate(cursor);
    const existing = byDate.get(date);
    result.push(
      existing ?? {
        date,
        shows: 0,
        clicks: 0,
        ctr: null,
        avgShowPosition: null,
        avgClickPosition: null,
      },
    );
  }

  return result;
};

const normalizeSearchQueryStatisticsResponse = (value: unknown): WebmasterSearchQueryStatisticsPointDto[] => {
  if (Array.isArray(value)) {
    return value
      .map((row) => normalizeStatisticsRow(row))
      .filter((row): row is WebmasterSearchQueryStatisticsPointDto => row !== null)
      .sort((left, right) => left.date.localeCompare(right.date));
  }

  const root = asRecord(value);
  if (!root) {
    return [];
  }

  const byDate = new Map<string, StatisticsAccumulator>();
  accumulateIndicatorGroup(byDate, root.indicators);

  const queries = Array.isArray(root.queries) ? root.queries : [];
  for (const query of queries) {
    const queryRecord = asRecord(query);
    if (!queryRecord) {
      continue;
    }
    accumulateIndicatorGroup(byDate, queryRecord.indicators);
  }

  return Array.from(byDate.entries())
    .sort(([leftDate], [rightDate]) => leftDate.localeCompare(rightDate))
    .map(([date, acc]) => {
      const shows = Math.round(acc.shows);
      const clicks = Math.round(acc.clicks);
      const ctr = shows > 0 ? roundToTwoDecimals((clicks * 100) / shows) : null;
      const avgShowPosition =
        acc.avgShowPositionWeight > 0 ? roundToTwoDecimals(acc.avgShowPositionWeighted / acc.avgShowPositionWeight) : null;
      const avgClickPosition =
        acc.avgClickPositionWeight > 0 ? roundToTwoDecimals(acc.avgClickPositionWeighted / acc.avgClickPositionWeight) : null;

      return {
        date,
        shows,
        clicks,
        ctr,
        avgShowPosition,
        avgClickPosition,
      };
    });
};

const normalizeStatisticsRow = (value: unknown): WebmasterSearchQueryStatisticsPointDto | null => {
  const row = asRecord(value);
  if (!row) {
    return null;
  }
  const date = normalizeDateString(row.date);
  const shows = toNumber(row.shows);
  const clicks = toNumber(row.clicks);
  if (!date || shows === null || clicks === null) {
    return null;
  }
  const ctr = toNumber(row.ctr);
  const avgShowPosition = toNumber(row.avgShowPosition) ?? toNumber(row.avg_show_position);
  const avgClickPosition = toNumber(row.avgClickPosition) ?? toNumber(row.avg_click_position);
  return {
    date,
    shows,
    clicks,
    ctr,
    avgShowPosition,
    avgClickPosition,
  };
};

const accumulateIndicatorGroup = (byDate: Map<string, StatisticsAccumulator>, indicatorsValue: unknown): void => {
  const indicators = asRecord(indicatorsValue);
  if (!indicators) {
    return;
  }

  const showsByDate = resolveSeriesByDate(indicators, ["TOTAL_SHOWS", "total_shows", "shows"]);
  const clicksByDate = resolveSeriesByDate(indicators, ["TOTAL_CLICKS", "total_clicks", "clicks"]);
  const avgShowPositionByDate = resolveSeriesByDate(indicators, ["AVG_SHOW_POSITION", "avg_show_position"]);
  const avgClickPositionByDate = resolveSeriesByDate(indicators, ["AVG_CLICK_POSITION", "avg_click_position"]);

  const allDates = new Set<string>([
    ...showsByDate.keys(),
    ...clicksByDate.keys(),
    ...avgShowPositionByDate.keys(),
    ...avgClickPositionByDate.keys(),
  ]);

  for (const date of allDates) {
    const acc = byDate.get(date) ?? {
      shows: 0,
      clicks: 0,
      avgShowPositionWeighted: 0,
      avgShowPositionWeight: 0,
      avgClickPositionWeighted: 0,
      avgClickPositionWeight: 0,
    };

    const shows = showsByDate.get(date) ?? 0;
    const clicks = clicksByDate.get(date) ?? 0;
    acc.shows += shows;
    acc.clicks += clicks;

    const avgShowPosition = avgShowPositionByDate.get(date);
    if (avgShowPosition !== undefined) {
      const weight = shows > 0 ? shows : 1;
      acc.avgShowPositionWeighted += avgShowPosition * weight;
      acc.avgShowPositionWeight += weight;
    }

    const avgClickPosition = avgClickPositionByDate.get(date);
    if (avgClickPosition !== undefined) {
      const weight = clicks > 0 ? clicks : 1;
      acc.avgClickPositionWeighted += avgClickPosition * weight;
      acc.avgClickPositionWeight += weight;
    }

    byDate.set(date, acc);
  }
};

const resolveSeriesByDate = (indicators: Record<string, unknown>, aliases: string[]): Map<string, number> => {
  for (const alias of aliases) {
    const candidate = indicators[alias];
    if (!Array.isArray(candidate)) {
      continue;
    }
    const byDate = new Map<string, number>();
    for (const point of candidate) {
      const pointRecord = asRecord(point);
      if (!pointRecord) {
        continue;
      }
      const date = normalizeDateString(pointRecord.date);
      const numericValue = toNumber(pointRecord.value);
      if (!date || numericValue === null) {
        continue;
      }
      byDate.set(date, (byDate.get(date) ?? 0) + numericValue);
    }
    return byDate;
  }
  return new Map();
};

const normalizeDateString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  if (value.length >= 10) {
    return value.slice(0, 10);
  }
  return value || null;
};

const isValidOneMonthRange = (from: string, to: string): boolean => {
  const fromDate = parseDate(from);
  const toDate = parseDate(to);
  if (!fromDate || !toDate || fromDate > toDate) {
    return false;
  }
  const oneMonthEndInclusive = addDays(addMonthsClamped(fromDate, 1), -1);
  return toDate <= oneMonthEndInclusive;
};

const parseDate = (value: string): Date | null => {
  if (!value) {
    return null;
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
};

const addMonthsClamped = (value: Date, months: number): Date => {
  const year = value.getUTCFullYear();
  const month = value.getUTCMonth() + months;
  const day = value.getUTCDate();
  const lastDayOfTargetMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const clampedDay = Math.min(day, lastDayOfTargetMonth);
  return new Date(Date.UTC(year, month, clampedDay));
};

const addDays = (value: Date, days: number): Date => new Date(value.getTime() + days * DAY_MS);

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const roundToTwoDecimals = (value: number): number => Math.round(value * 100) / 100;

type StatisticsAccumulator = {
  shows: number;
  clicks: number;
  avgShowPositionWeighted: number;
  avgShowPositionWeight: number;
  avgClickPositionWeighted: number;
  avgClickPositionWeight: number;
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
