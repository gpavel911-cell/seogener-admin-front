"use client";

import { useMemo, useState } from "react";
import styled from "styled-components";
import {
  useGetCountersQuery,
  useLazyGetReportQuery,
} from "@entities/analytics/api";
import {
  AnalyticsProvider,
  type AnalyticsCounterReportsResponse,
} from "@entities/analytics/types";
import {
  Button,
  PageTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableWrapper,
  useToast,
} from "@shared/ui";

type AnalyticsAction = "reports" | "createCounter" | "linkCounter" | "goal";

const ACTIONS: { id: AnalyticsAction; label: string }[] = [
  { id: "reports", label: "Отчеты" },
  { id: "createCounter", label: "Создать счетчик" },
  { id: "linkCounter", label: "Привязать счетчик" },
  { id: "goal", label: "Создать цель" },
];

const DEFAULT_PROVIDER = AnalyticsProvider.YANDEX_METRICA;

const formatDate = (value: Date) => value.toISOString().slice(0, 10);

const buildDefaultDateRange = () => {
  const today = new Date();
  const date2 = formatDate(today);
  const date1 = formatDate(new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000));
  return { date1, date2 };
};

export function YandexPage() {
  const { date1: defaultDate1, date2: defaultDate2 } = buildDefaultDateRange();
  const [activeAction, setActiveAction] = useState<AnalyticsAction>(ACTIONS[0].id);
  const [counterId, setCounterId] = useState("");
  const [date1, setDate1] = useState(defaultDate1);
  const [date2, setDate2] = useState(defaultDate2);
  const [reports, setReports] = useState<AnalyticsCounterReportsResponse | null>(null);

  const { showToast } = useToast();
  const { data: countersData, isFetching: isCountersFetching } = useGetCountersQuery({
    provider: DEFAULT_PROVIDER,
    pageNumber: 0,
    pageSize: 100,
  });
  const counters = countersData?.content ?? [];

  const [loadReport, { isFetching: isReportLoading }] = useLazyGetReportQuery();

  const counterOptions = useMemo(
    () =>
      counters.map((counter) => ({
        value: counter.counterId,
        label: counter.siteUrl ? `${counter.counterId} · ${counter.siteUrl}` : counter.counterId,
      })),
    [counters],
  );

  const ensureCounterSelected = (value: string) => {
    if (!value) {
      showToast({ variant: "error", message: "Выберите счетчик." });
      return false;
    }
    return true;
  };

  const handleReport = async () => {
    if (!ensureCounterSelected(counterId)) return;
    try {
      const response = await loadReport({
        counterId,
        provider: DEFAULT_PROVIDER,
        date1,
        date2,
      }).unwrap();
      setReports(response);
    } catch {
      showToast({ variant: "error", message: "Ошибка загрузки отчетов." });
    }
  };

  return (
    <Wrapper>
      <Header>
        <PageTitle>Метрика</PageTitle>
      </Header>
      <Body>
        <Sidebar>
          <SidebarTitle>Действия</SidebarTitle>
          {ACTIONS.map((action) => (
            <ActionButton
              key={action.id}
              type="button"
              $active={activeAction === action.id}
              onClick={() => setActiveAction(action.id)}
            >
              {action.label}
            </ActionButton>
          ))}
        </Sidebar>

        <Content>
          {activeAction === "reports" && (
            <Section>
              <SectionTitle>Отчеты</SectionTitle>
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
                <Button type="button" onClick={handleReport} disabled={isReportLoading}>
                  {isReportLoading ? "Загрузка..." : "Показать"}
                </Button>
              </Actions>
              {reports && (
                <>
                  <ReportSection>
                    <ReportTitle>Источники трафики</ReportTitle>
                    <ReportTable
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
                          reports.visits.totals?.[0] ?? 0,
                          reports.visits.totals?.[1] ?? 0,
                          reports.visits.totals?.[2] ?? 0,
                          formatDurationSeconds(reports.visits.totals?.[3]),
                          formatDecimal(reports.visits.totals?.[4]),
                        ],
                        ...reports.visits.rows.map((row) => [
                          row.dimensionValues.join(" / ") || "-",
                          row.metricValues[0] ?? 0,
                          row.metricValues[1] ?? 0,
                          row.metricValues[2] ?? 0,
                          formatDurationSeconds(row.metricValues[3]),
                          formatDecimal(row.metricValues[4]),
                        ]),
                      ]}
                    />
                    {reports.visits.containsSensitiveData && <Hint>Данные ограничены политикой раскрытия.</Hint>}
                  </ReportSection>
                  <ReportRow>
                    <ReportSection>
                      <ReportTitle>Страницы входа</ReportTitle>
                      <ReportTable
                        headers={["Страница входа", "Просмотры"]}
                        rows={reports.entryPages.rows.map((row) => [
                          row.dimensionValues.join(" / ") || "-",
                          row.metricValues[0] ?? 0,
                        ])}
                      />
                      {reports.entryPages.containsSensitiveData && <Hint>Данные ограничены политикой раскрытия.</Hint>}
                    </ReportSection>
                    <ReportSection>
                      <ReportTitle>Просмотры URL</ReportTitle>
                      <ReportTable
                        headers={["Адрес страницы", "Просмотры"]}
                        rows={reports.urlViews.rows.map((row) => [
                          row.dimensionValues.join(" / ") || "-",
                          row.metricValues[0] ?? 0,
                        ])}
                      />
                      {reports.urlViews.containsSensitiveData && <Hint>Данные ограничены политикой раскрытия.</Hint>}
                    </ReportSection>
                  </ReportRow>
                </>
              )}
            </Section>
          )}

          {activeAction === "createCounter" && <Placeholder>Раздел находится в разработке</Placeholder>}
          {activeAction === "linkCounter" && <Placeholder>Раздел находится в разработке</Placeholder>}
          {activeAction === "goal" && <Placeholder>Раздел находится в разработке</Placeholder>}
        </Content>
      </Body>
    </Wrapper>
  );
}

const ReportTable = ({ headers, rows }: { headers: string[]; rows: Array<Array<string | number>> }) => {
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

const formatDecimal = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-";
  }
  return value.toFixed(2);
};

const formatDurationSeconds = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-";
  }
  const totalSeconds = Math.max(0, Math.floor(value));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts: string[] = [];
  if (hours > 0) {
    parts.push(`${hours} ч`);
  }
  if (minutes > 0) {
    parts.push(`${minutes} м`);
  }
  parts.push(`${seconds} с`);
  return parts.join(" ");
};

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Body = styled.div`
  display: grid;
  grid-template-columns: 250px 1fr;
  gap: 24px;
  align-items: flex-start;
`;

const Sidebar = styled.aside`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #ffffff;
  width: 250px;
`;

const SidebarTitle = styled.h2`
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 600;
  color: #111827;
`;

const ActionButton = styled.button<{ $active?: boolean }>`
  padding: 10px 12px;
  text-align: left;
  border-radius: 8px;
  border: 1px solid ${({ $active }) => ($active ? "#2563eb" : "#e5e7eb")};
  background: ${({ $active }) => ($active ? "#eff6ff" : "#ffffff")};
  color: ${({ $active }) => ($active ? "#1d4ed8" : "#111827")};
  font-size: 14px;
  cursor: pointer;
`;

const Content = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const Placeholder = styled.div`
  border: 1px dashed #d1d5db;
  background: #f9fafb;
  padding: 20px;
  border-radius: 12px;
  font-size: 14px;
  color: #4b5563;
`;

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

const ReportSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ReportRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  align-items: flex-start;
`;

const ReportTitle = styled.h3`
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
