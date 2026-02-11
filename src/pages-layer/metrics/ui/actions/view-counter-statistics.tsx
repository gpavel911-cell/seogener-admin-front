import { useMemo, useState } from "react";
import styled from "styled-components";
import { skipToken } from "@reduxjs/toolkit/query";
import { useGetMetricsCountersQuery, useGetMetricsProfilesQuery, useLazyGetMetricsStatisticsQuery } from "@entities/metrics/api";
import { MetricsProviderType, type MetricsCounterStatisticsResponse } from "@entities/metrics/types";
import { Button, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, TableWrapper, useToast } from "@shared/ui";
import { formatDecimal, formatDurationSeconds } from "../../lib/formatters";

const DEFAULT_PROVIDER = MetricsProviderType.YANDEX_METRICA;

const formatDate = (value: Date) => value.toISOString().slice(0, 10);

const buildDefaultDateRange = () => {
  const today = new Date();
  const date2 = formatDate(today);
  const date1 = formatDate(new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000));
  return { date1, date2 };
};

type ActionsSectionViewCounterStatisticsProps = {
  fixedProfile?: string | null;
};

export const ViewCounterStatistics = ({ fixedProfile }: ActionsSectionViewCounterStatisticsProps = {}) => {
  const { date1: defaultDate1, date2: defaultDate2 } = buildDefaultDateRange();
  const [counterId, setCounterId] = useState("");
  const [date1, setDate1] = useState(defaultDate1);
  const [date2, setDate2] = useState(defaultDate2);
  const [statistics, setStatistics] = useState<MetricsCounterStatisticsResponse | null>(null);
  const [activeProfile, setActiveProfile] = useState<string | null>(null);

  const { showToast } = useToast();
  const { data: accountProfilesRaw, isFetching: isAccountsFetching } = useGetMetricsProfilesQuery();
  const accountProfiles = useMemo(
    () => (accountProfilesRaw ?? []).filter((profile) => profile.provider === DEFAULT_PROVIDER),
    [accountProfilesRaw],
  );
  const resolvedProfile = useMemo(
    () => fixedProfile ?? activeProfile ?? accountProfiles?.[0]?.profile ?? null,
    [fixedProfile, activeProfile, accountProfiles],
  );
  const countersQueryArgs = resolvedProfile
    ? { provider: DEFAULT_PROVIDER, profile: resolvedProfile, pageNumber: 0, pageSize: 100 }
    : skipToken;
  const { data: countersData, isFetching: isCountersFetching } = useGetMetricsCountersQuery(countersQueryArgs);
  const counters = countersData?.content ?? [];
  const [loadStatistics, { isFetching: isStatisticsLoading }] = useLazyGetMetricsStatisticsQuery();

  const counterOptions = useMemo(
    () =>
      counters.map((counter) => ({
        value: counter.counterId,
        label: counter.siteUrl ? `${counter.counterId} · ${counter.siteUrl}` : counter.counterId,
      })),
    [counters],
  );

  const handleProfileChange = (value: string) => {
    setActiveProfile(value || null);
    setCounterId("");
    setStatistics(null);
  };

  const handleStatistics = async () => {
    if (!counterId) {
      showToast({ variant: "error", message: "Выберите счетчик." });
      return;
    }
    if (!resolvedProfile) {
      showToast({ variant: "error", message: "Выберите профиль Метрики." });
      return;
    }
    try {
      const response = await loadStatistics({
        counterId,
        provider: DEFAULT_PROVIDER,
        profile: resolvedProfile,
        date1,
        date2,
      }).unwrap();
      setStatistics(response);
    } catch {
      showToast({ variant: "error", message: "Ошибка загрузки статистики." });
    }
  };

  return (
    <Stack>
      <FormCard>
        <FormRow>
          <FormFields>
            {!fixedProfile && (
              <FormField>
                <Label>Профиль Метрики</Label>
                <Select
                  value={resolvedProfile ?? ""}
                  onChange={(event) => handleProfileChange(event.target.value)}
                  disabled={isAccountsFetching}
                >
                  <option value="">Выберите профиль</option>
                  {(accountProfiles ?? []).map((profile) => (
                    <option key={profile.profile} value={profile.profile}>
                      {profile.profile}
                    </option>
                  ))}
                </Select>
              </FormField>
            )}
            <FormField>
              <Label>Счетчик</Label>
              <Select
                 value={counterId}
                 onChange={(event) => setCounterId(event.target.value)}
                 disabled={isCountersFetching}
              >
                <option value="">Выберите счетчик</option>
                {counterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField>
              <Label>Дата начала</Label>
              <Input type="date" value={date1} onChange={(event) => setDate1(event.target.value)} />
            </FormField>
            <FormField>
              <Label>Дата конца</Label>
              <Input type="date" value={date2} onChange={(event) => setDate2(event.target.value)} />
            </FormField>
          </FormFields>
          <Actions>
            <ActionButton type="button" onClick={handleStatistics} disabled={isStatisticsLoading}>
              {isStatisticsLoading ? "Загрузка..." : "Показать"}
            </ActionButton>
          </Actions>
        </FormRow>
      </FormCard>
      <ResultCard>
        {isStatisticsLoading ? (
          <EmptyState>
            <Placeholder>Загрузка статистики...</Placeholder>
          </EmptyState>
        ) : statistics === null ? (
          <EmptyState>
            <Placeholder>Нет данных для отображения.</Placeholder>
          </EmptyState>
        ) : (
          <>
            <StatisticsSection>
              <StatisticsTitle>Источники трафики</StatisticsTitle>
              <StatisticsTable
                headers={[
                  "Источник трафика",
                  "Просмотры",
                  "Визиты",
                  "Посетители",
                  "Время на сайте",
                  "Глубина просмотра",
                ]}
                rows={[
                  [
                    "Итого и средние",
                    statistics.visits.totals?.[0] ?? 0,
                    statistics.visits.totals?.[1] ?? 0,
                    statistics.visits.totals?.[2] ?? 0,
                    formatDurationSeconds(statistics.visits.totals?.[3]),
                    formatDecimal(statistics.visits.totals?.[4]),
                  ],
                  ...statistics.visits.rows.map((row) => [
                    row.dimensionValues.join(" / ") || "-",
                    row.metricValues[0] ?? 0,
                    row.metricValues[1] ?? 0,
                    row.metricValues[2] ?? 0,
                    formatDurationSeconds(row.metricValues[3]),
                    formatDecimal(row.metricValues[4]),
                  ]),
                ]}
              />
              {statistics.visits.containsSensitiveData && <Hint>Данные ограничены политикой раскрытия.</Hint>}
            </StatisticsSection>
            <StatisticsRow>
              <StatisticsSection>
                <StatisticsTitle>Страницы входа</StatisticsTitle>
                <StatisticsTable
                  headers={["Страница входа", "Просмотры"]}
                  rows={statistics.entryPages.rows.map((row) => [
                    row.dimensionValues.join(" / ") || "-",
                    row.metricValues[0] ?? 0,
                  ])}
                />
                {statistics.entryPages.containsSensitiveData && <Hint>Данные ограничены политикой раскрытия.</Hint>}
              </StatisticsSection>
              <StatisticsSection>
                <StatisticsTitle>Просмотры URL</StatisticsTitle>
                <StatisticsTable
                  headers={["Адрес страницы", "Просмотры"]}
                  rows={statistics.urlViews.rows.map((row) => [
                    row.dimensionValues.join(" / ") || "-",
                    row.metricValues[0] ?? 0,
                  ])}
                />
                {statistics.urlViews.containsSensitiveData && <Hint>Данные ограничены политикой раскрытия.</Hint>}
              </StatisticsSection>
            </StatisticsRow>
          </>
        )}
      </ResultCard>
    </Stack>
  );
};

const StatisticsTable = ({ headers, rows }: { headers: string[]; rows: Array<Array<string | number>> }) => {
  return (
    <TableWrapper>
      <Table>
        <TableHead>
          <TableRow>
            {headers.map((header) => (
              <TableHeaderCell key={header}>{header}</TableHeaderCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={`${row.join("-")}-${index}`}>
              {row.map((cell, cellIndex) => (
                <TableCell key={`${index}-${cellIndex}`}>{cell ?? "-"}</TableCell>
              ))}
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={headers.length}>Нет данных</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableWrapper>
  );
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

const ResultCard = styled.div`
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: #ffffff;
  min-height: 160px;
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

const Input = styled.input`
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 14px;
  width: 100%;
  max-width: 300px;
`;

const Select = styled.select`
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 14px;
  width: 100%;
  max-width: 300px;
`;

const Placeholder = styled.div`
  color: #6b7280;
  font-size: 14px;
`;

const EmptyState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  flex: 1;
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

const StatisticsSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const StatisticsRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  align-items: flex-start;
`;

const StatisticsTitle = styled.h3`
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #111827;
`;

const Hint = styled.p`
  margin: 0;
  font-size: 12px;
  color: #6b7280;
`;
