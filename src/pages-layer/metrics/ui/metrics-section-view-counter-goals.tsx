import { useMemo, useState } from "react";
import styled from "styled-components";
import { useGetCountersQuery, useLazyGetGoalsQuery } from "@entities/analytics/api";
import {
  AnalyticsCounterPresence,
  AnalyticsCounterStatus,
  AnalyticsProvider,
  type AnalyticsGoalDto,
} from "@entities/analytics/types";
import { Button, useToast } from "@shared/ui";
import { GoalInfo } from "./components/GoalInfo";

const DEFAULT_PROVIDER = AnalyticsProvider.YANDEX_METRICA;

const formatDate = (value: Date) => value.toISOString().slice(0, 10);

const buildDefaultDateRange = () => {
  const today = new Date();
  const date2 = formatDate(today);
  const date1 = formatDate(new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000));
  return { date1, date2 };
};

export const MetricsSectionViewCounterGoals = () => {
  const { date1: defaultDate1, date2: defaultDate2 } = buildDefaultDateRange();
  const [counterId, setCounterId] = useState("");
  const [date1, setDate1] = useState(defaultDate1);
  const [date2, setDate2] = useState(defaultDate2);
  const [goals, setGoals] = useState<AnalyticsGoalDto[] | null>(null);

  const { showToast } = useToast();
  const { data: countersData, isFetching: isCountersFetching } = useGetCountersQuery({
    provider: DEFAULT_PROVIDER,
    pageNumber: 0,
    pageSize: 100,
  });
  const counters = countersData?.content ?? [];
  const [loadGoals, { isFetching: isGoalsLoading }] = useLazyGetGoalsQuery();

  const counterOptions = useMemo(
    () =>
      counters
        .filter(
          (counter) =>
            counter.status === AnalyticsCounterStatus.ACTIVE &&
            counter.presence === AnalyticsCounterPresence.PRESENT,
        )
        .map((counter) => ({
          value: counter.counterId,
          label: counter.siteUrl ? `${counter.counterId} · ${counter.siteUrl}` : counter.counterId,
        })),
    [counters],
  );

  const handleLoadGoals = async () => {
    if (!counterId) {
      showToast({ variant: "error", message: "Выберите счетчик." });
      return;
    }
    try {
      const response = await loadGoals({
        counterId,
        provider: DEFAULT_PROVIDER,
        date1,
        date2,
      }).unwrap();
      setGoals(response.goals ?? []);
    } catch {
      showToast({ variant: "error", message: "Ошибка загрузки целей." });
    }
  };

  return (
    <Stack>
      <FormCard>
        <FormRow>
          <FormFields>
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
            <ActionButton type="button" onClick={handleLoadGoals} disabled={isGoalsLoading}>
              {isGoalsLoading ? "Загрузка..." : "Показать"}
            </ActionButton>
          </Actions>
        </FormRow>
      </FormCard>
      <ResultCard>
        {isGoalsLoading ? (
          <EmptyState>
            <Placeholder>Загрузка целей...</Placeholder>
          </EmptyState>
        ) : goals === null ? (
          <EmptyState>
            <Placeholder>Нет данных для отображения.</Placeholder>
          </EmptyState>
        ) : goals.length === 0 ? (
          <EmptyState>
            <Placeholder>Целей нет.</Placeholder>
          </EmptyState>
        ) : (
          <GoalsGrid>
            {goals.map((goal) => (
              <GoalCard key={goal.id}>
                <GoalInfo goal={goal} />
              </GoalCard>
            ))}
          </GoalsGrid>
        )}
      </ResultCard>
    </Stack>
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
  flex-wrap: wrap;
  gap: 16px;
  align-items: flex-end;
`;

const FormFields = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
  flex: 1 1 420px;
`;

const FormField = styled.label`
  display: flex;
  flex-direction: column;
  gap: 6px;
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
`;

const Select = styled.select`
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 14px;
  width: 100%;
`;

const Actions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  align-items: flex-end;
  flex: 0 0 auto;
`;

const ActionButton = styled(Button)`
  font-weight: 600;
  box-shadow: 0 10px 18px rgba(37, 99, 235, 0.2);
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

const GoalsGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const GoalCard = styled.article`
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: #ffffff;
`;
