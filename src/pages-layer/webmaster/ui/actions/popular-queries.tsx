"use client";

import { useMemo, useState } from "react";
import {
  useLazyGetWebmasterPopularQueriesQuery,
} from "@entities/webmaster/api";
import { useWebmasterSelectOptions } from "@entities/webmaster/select-options";
import { type WebmasterPopularQueryDto, WebmasterProviderType } from "@entities/webmaster/types";
import {
  Button,
  CenteredState,
  DateInput,
  FieldLabel,
  FormActions,
  FormCard,
  FormField,
  FormFields,
  FormRow,
  FormStack,
  PlaceholderText,
  ResultLoader,
  ResultCard,
  SelectControl,
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

  const {
    resolvedProfile,
    profileOptions,
    hostOptions,
    resolvedHostId,
    isProfilesFetching,
    isHostsFetching,
  } = useWebmasterSelectOptions({
    activeProfile,
    fixedProfile: fixedProfile ?? null,
    fixedProvider: DEFAULT_PROVIDER,
    activeHostId: hostId,
  });
  const result = useMemo(
    () => (resolvedProfile && resultByProfile?.profile === resolvedProfile ? resultByProfile.data : null),
    [resolvedProfile, resultByProfile],
  );
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
    <FormStack>
      <FormCard>
        <FormRow>
          <FormFields>
            {!fixedProfile && (
              <FormField>
                <FieldLabel>Профиль Вебмастера</FieldLabel>
                <SelectControl
                  value={resolvedProfile ?? ""}
                  onValueChange={setActiveProfile}
                  disabled={isProfilesFetching}
                  options={profileOptions}
                  placeholder="Выберите профиль"
                />
              </FormField>
            )}
            <FormField>
              <FieldLabel>Сайт</FieldLabel>
              <SelectControl
                value={resolvedHostId}
                onValueChange={setHostId}
                disabled={isHostsFetching}
                options={hostOptions}
                placeholder={hostOptions.length ? "Выберите сайт" : "Нет сайтов"}
              />
            </FormField>
            <FormField>
              <FieldLabel>Дата начала</FieldLabel>
              <DateInput value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
            </FormField>
            <FormField>
              <FieldLabel>Дата конца</FieldLabel>
              <DateInput value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
            </FormField>
          </FormFields>
          <FormActions>
            <Button type="button" variant="primary" onClick={handleLoad} disabled={isFetching}>
              {isFetching ? "Загрузка..." : "Показать"}
            </Button>
          </FormActions>
        </FormRow>
      </FormCard>
      <ResultCard>
        {isFetching ? (
          <ResultLoader label="Загрузка отчета..." />
        ) : !result ? (
          <CenteredState>
            <PlaceholderText>Нет данных для отображения.</PlaceholderText>
          </CenteredState>
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
                    <TableCell colSpan={3}>Нет данных для отображения.</TableCell>
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
    </FormStack>
  );
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

