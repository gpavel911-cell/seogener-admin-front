"use client";

import { useMemo, useState } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import styled from "styled-components";
import {
  useGetWebmasterHostsQuery,
  useGetWebmasterProfilesQuery,
  useLazyGetWebmasterSearchEventsHistoryQuery,
} from "@entities/webmaster/api";
import {
  type WebmasterHostDto,
  type WebmasterSearchEventHistoryPointDto,
  WebmasterProviderType,
} from "@entities/webmaster/types";
import { Button, useToast } from "@shared/ui";

const DEFAULT_PROVIDER = WebmasterProviderType.YANDEX_WEBMASTER;
const DEFAULT_RANGE_DAYS = 7;
const MAX_RANGE_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

const formatDate = (value: Date) => value.toISOString().slice(0, 10);

const buildDefaultDateRange = () => {
  const today = new Date();
  const dateTo = formatDate(today);
  const dateFrom = formatDate(new Date(today.getTime() - (DEFAULT_RANGE_DAYS - 1) * 24 * 60 * 60 * 1000));
  return { dateFrom, dateTo };
};

type ActionsSectionWebmasterSearchUrlsProps = {
  fixedProfile?: string | null;
};

export const SearchUrls = ({ fixedProfile }: ActionsSectionWebmasterSearchUrlsProps = {}) => {
  const { showToast } = useToast();
  const { dateFrom: defaultFrom, dateTo: defaultTo } = buildDefaultDateRange();
  const [activeProfile, setActiveProfile] = useState<string | null>(null);
  const [hostId, setHostId] = useState("");
  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(defaultTo);
  const [resultByProfile, setResultByProfile] = useState<{
    profile: string;
    data: WebmasterSearchEventHistoryPointDto[];
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
  const rows = useMemo(
    () => (result ? buildRowsWithFullRange(result.data, result.dateFrom, result.dateTo) : []),
    [result],
  );
  const maxValue = useMemo(() => {
    const values = rows.flatMap((item) => [item.added ?? 0, item.removed ?? 0]);
    const max = Math.max(0, ...values);
    return max > 0 ? max : 1;
  }, [rows]);
  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => ({
          added: acc.added + (row.added ?? 0),
          removed: acc.removed + (row.removed ?? 0),
        }),
        { added: 0, removed: 0 },
      ),
    [rows],
  );

  const [loadHistory, { isFetching }] = useLazyGetWebmasterSearchEventsHistoryQuery();

  const handleLoad = async () => {
    if (!resolvedProfile) {
      showToast({ variant: "error", message: "Выберите профиль Вебмастера." });
      return;
    }
    if (!resolvedHostId) {
      showToast({ variant: "error", message: "Выберите сайт." });
      return;
    }
    if (!isValidDateRange(dateFrom, dateTo)) {
      showToast({ variant: "error", message: "Период не может превышать 30 дней." });
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
        data: response,
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
        ) : rows.length === 0 ? (
          <Placeholder>Нет данных по выбранному периоду.</Placeholder>
        ) : (
          <ChartWrapper>
            <Legend>
              <LegendItem>
                <LegendDot data-kind="added" />
                Добавлено
              </LegendItem>
              <LegendItem>
                <LegendDot data-kind="removed" />
                Удалено
              </LegendItem>
            </Legend>
            <ChartScroll>
              <Bars $columns={rows.length}>
                {rows.map((row) => {
                  const added = row.added ?? 0;
                  const removed = row.removed ?? 0;
                  const addedHeight = added > 0 ? Math.max(2, Math.round((added / maxValue) * 100)) : 0;
                  const removedHeight = removed > 0 ? Math.max(2, Math.round((removed / maxValue) * 100)) : 0;
                  return (
                    <DayGroup key={row.date}>
                      <BarsPair>
                        <Bar
                          data-kind="added"
                          data-value={formatMetricValue(added)}
                          style={{ height: `${addedHeight}%` }}
                          title={`${row.date}: Добавлено ${added}`}
                        />
                        <Bar
                          data-kind="removed"
                          data-value={formatMetricValue(removed)}
                          style={{ height: `${removedHeight}%` }}
                          title={`${row.date}: Удалено ${removed}`}
                        />
                      </BarsPair>
                      <DayLabel>{formatDayLabel(row.date)}</DayLabel>
                    </DayGroup>
                  );
                })}
              </Bars>
            </ChartScroll>
            <Totals>
              <TotalItem data-kind="added">Добавлено: {formatMetricValue(totals.added)}</TotalItem>
              <TotalItem data-kind="removed">Удалено: {formatMetricValue(totals.removed)}</TotalItem>
            </Totals>
          </ChartWrapper>
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

const formatMetricValue = (value: number): string => value.toLocaleString("ru-RU");

const buildRowsWithFullRange = (
  data: WebmasterSearchEventHistoryPointDto[],
  dateFrom: string,
  dateTo: string,
): WebmasterSearchEventHistoryPointDto[] => {
  const fromDate = parseDate(dateFrom);
  const toDate = parseDate(dateTo);
  if (!fromDate || !toDate || fromDate > toDate) {
    return data;
  }

  const byDate = new Map<string, { added: number; removed: number }>();
  for (const row of data) {
    if (!row.date) {
      continue;
    }
    const existing = byDate.get(row.date) ?? { added: 0, removed: 0 };
    existing.added += row.added ?? 0;
    existing.removed += row.removed ?? 0;
    byDate.set(row.date, existing);
  }

  const rows: WebmasterSearchEventHistoryPointDto[] = [];
  for (let current = new Date(fromDate.getTime()); current <= toDate; current = new Date(current.getTime() + DAY_MS)) {
    const date = formatDate(current);
    const point = byDate.get(date);
    rows.push({
      date,
      added: point?.added ?? 0,
      removed: point?.removed ?? 0,
    });
  }
  return rows;
};

const isValidDateRange = (from: string, to: string): boolean => {
  const fromDate = parseDate(from);
  const toDate = parseDate(to);
  if (!fromDate || !toDate || fromDate > toDate) {
    return false;
  }
  const dayDiff = Math.floor((toDate.getTime() - fromDate.getTime()) / DAY_MS);
  return dayDiff <= MAX_RANGE_DAYS - 1;
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

const ChartWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const Legend = styled.div`
  display: flex;
  gap: 16px;
  align-items: center;
`;

const LegendItem = styled.div`
  display: inline-flex;
  gap: 6px;
  align-items: center;
  color: #374151;
  font-size: 13px;
`;

const LegendDot = styled.span`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #16a34a;

  &[data-kind="removed"] {
    background: #dc2626;
  }
`;

const ChartScroll = styled.div`
  width: 100%;
  padding-bottom: 6px;
`;

const Bars = styled.div<{ $columns: number }>`
  display: grid;
  grid-template-columns: repeat(${({ $columns }) => Math.max($columns, 1)}, minmax(0, 1fr));
  align-items: flex-end;
  gap: clamp(2px, 0.6vw, 10px);
  min-height: 220px;
  width: 100%;
`;

const DayGroup = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 0;
`;

const BarsPair = styled.div`
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: 2px;
  height: 180px;
  width: 100%;
`;

const Bar = styled.div`
  position: relative;
  width: calc((100% - 2px) / 2);
  min-width: 2px;
  max-width: 10px;
  border-radius: 4px 4px 0 0;
  background: #16a34a;
  cursor: pointer;

  &[data-kind="removed"] {
    background: #dc2626;
  }

  &::after {
    content: attr(data-value);
    position: absolute;
    left: 50%;
    bottom: calc(100% + 4px);
    transform: translateX(-50%);
    background: #111827;
    color: #ffffff;
    border-radius: 4px;
    padding: 2px 6px;
    font-size: 11px;
    line-height: 1.2;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition: opacity 120ms ease;
  }

  &:hover::after {
    opacity: 1;
  }
`;

const DayLabel = styled.span`
  font-size: 11px;
  color: #6b7280;
  width: 100%;
  text-align: center;
`;

const Totals = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;

const TotalItem = styled.span`
  display: inline-flex;
  align-items: center;
  font-size: 13px;
  font-weight: 500;
  color: #374151;

  &[data-kind="added"] {
    color: #15803d;
  }

  &[data-kind="removed"] {
    color: #b91c1c;
  }
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
