import { useMemo, useState } from "react";
import styled from "styled-components";
import { useGetCountersQuery, useLazyGetStatisticsQuery } from "@entities/analytics/api";
import { AnalyticsProvider, type AnalyticsCounterStatisticsResponse } from "@entities/analytics/types";
import { Button, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, TableWrapper, useToast } from "@shared/ui";
import { formatDecimal, formatDurationSeconds } from "../lib/formatters";

const DEFAULT_PROVIDER = AnalyticsProvider.YANDEX_METRICA;

const formatDate = (value: Date) => value.toISOString().slice(0, 10);

const buildDefaultDateRange = () => {
  const today = new Date();
  const date2 = formatDate(today);
  const date1 = formatDate(new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000));
  return { date1, date2 };
};

export const MetricsSectionViewCounterStatistics = () => {
  const { date1: defaultDate1, date2: defaultDate2 } = buildDefaultDateRange();
  const [counterId, setCounterId] = useState("");
  const [date1, setDate1] = useState(defaultDate1);
  const [date2, setDate2] = useState(defaultDate2);
  const [statistics, setStatistics] = useState<AnalyticsCounterStatisticsResponse | null>(null);

  const { showToast } = useToast();
  const { data: countersData, isFetching: isCountersFetching } = useGetCountersQuery({
    provider: DEFAULT_PROVIDER,
    pageNumber: 0,
    pageSize: 100,
  });
  const counters = countersData?.content ?? [];
  const [loadStatistics, { isFetching: isStatisticsLoading }] = useLazyGetStatisticsQuery();

  const counterOptions = useMemo(
    () =>
      counters.map((counter) => ({
        value: counter.counterId,
        label: counter.siteUrl ? `${counter.counterId} · ${counter.siteUrl}` : counter.counterId,
      })),
    [counters],
  );

  const handleStatistics = async () => {
    if (!counterId) {
      showToast({ variant: "error", message: "Выберите счетчик." });
      return;
    }
    try {
      const response = await loadStatistics({
        counterId,
        provider: DEFAULT_PROVIDER,
        date1,
        date2,
      }).unwrap();
      setStatistics(response);
    } catch {
      showToast({ variant: "error", message: "Ошибка загрузки статистики." });
    }
  };

  return (
    <Section>
      <SectionTitle>Посмотреть статистику</SectionTitle>
      <FieldRow>
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
      </FieldRow>
      <FieldRow>
        <Label>Дата начала</Label>
        <Input type="date" value={date1} onChange={(event) => setDate1(event.target.value)} />
      </FieldRow>
      <FieldRow>
        <Label>Дата конца</Label>
        <Input type="date" value={date2} onChange={(event) => setDate2(event.target.value)} />
      </FieldRow>
      <Actions>
        <Button type="button" onClick={handleStatistics} disabled={isStatisticsLoading}>
          {isStatisticsLoading ? "Загрузка..." : "Показать"}
        </Button>
      </Actions>
      {statistics && (
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
    </Section>
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

const Section = styled.section`
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const SectionTitle = styled.h2`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #111827;
`;

const FieldRow = styled.label`
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: 12px;
  align-items: center;
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
`;

const Select = styled.select`
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 14px;
`;

const Actions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
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
