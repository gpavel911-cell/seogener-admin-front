import { useState } from "react";
import styled from "styled-components";
import { useLazyGetMetricsStatisticsQuery } from "@entities/metrics/api";
import { useMetricsSelectOptions } from "@entities/metrics/select-options";
import { MetricsProviderType, type MetricsCounterStatisticsResponse } from "@entities/metrics/types";
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
  const [loadStatistics, { isFetching: isStatisticsLoading }] = useLazyGetMetricsStatisticsQuery();
  const {
    resolvedProfile,
    resolvedCounterId,
    profileOptions,
    counterOptions: counterSelectOptions,
    isProfilesFetching: isAccountsFetching,
    isCountersFetching,
  } = useMetricsSelectOptions({
    activeProfile,
    fixedProfile: fixedProfile ?? null,
    fixedProvider: DEFAULT_PROVIDER,
    activeCounterId: counterId,
  });
  const effectiveCounterId = resolvedCounterId || counterId;

  const handleProfileChange = (value: string) => {
    setActiveProfile(value || null);
    setCounterId("");
    setStatistics(null);
  };

  const handleStatistics = async () => {
    if (!effectiveCounterId) {
      showToast({ variant: "error", message: "Выберите счетчик." });
      return;
    }
    if (!resolvedProfile) {
      showToast({ variant: "error", message: "Выберите профиль Метрики." });
      return;
    }
    try {
      const response = await loadStatistics({
        counterId: effectiveCounterId,
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
    <FormStack>
      <FormCard>
        <FormRow>
          <FormFields>
            {!fixedProfile && (
              <FormField>
                <FieldLabel>Профиль Метрики</FieldLabel>
                <SelectControl
                  value={resolvedProfile ?? ""}
                  onValueChange={handleProfileChange}
                  disabled={isAccountsFetching}
                  options={profileOptions}
                  placeholder="Выберите профиль"
                />
              </FormField>
            )}
            <FormField>
              <FieldLabel>Счетчик</FieldLabel>
              <SelectControl
                value={effectiveCounterId}
                onValueChange={setCounterId}
                disabled={isCountersFetching}
                options={counterSelectOptions}
                placeholder="Выберите счетчик"
              />
            </FormField>
            <FormField>
              <FieldLabel>Дата начала</FieldLabel>
              <DateInput value={date1} onChange={(event) => setDate1(event.target.value)} />
            </FormField>
            <FormField>
              <FieldLabel>Дата конца</FieldLabel>
              <DateInput value={date2} onChange={(event) => setDate2(event.target.value)} />
            </FormField>
          </FormFields>
          <FormActions>
            <Button type="button" variant="primary" onClick={handleStatistics} disabled={isStatisticsLoading}>
              {isStatisticsLoading ? "Загрузка..." : "Показать"}
            </Button>
          </FormActions>
        </FormRow>
      </FormCard>
      <ResultCard>
        {isStatisticsLoading ? (
          <ResultLoader label="Загрузка статистики..." />
        ) : statistics === null ? (
          <CenteredState>
            <PlaceholderText>Нет данных для отображения.</PlaceholderText>
          </CenteredState>
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
    </FormStack>
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
              <TableCell colSpan={headers.length}>Нет данных для отображения.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableWrapper>
  );
};


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
  color: ${({ theme }) => theme.tokens.color.textPrimary};
`;

const Hint = styled.p`
  margin: 0;
  font-size: 12px;
  color: ${({ theme }) => theme.tokens.color.textMuted};
`;
