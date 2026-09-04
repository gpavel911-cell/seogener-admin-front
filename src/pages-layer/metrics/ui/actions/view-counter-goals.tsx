import { useState } from "react";
import styled from "styled-components";
import { useLazyGetMetricsGoalsQuery } from "@entities/metrics/api";
import {
  type MetricsGoalDto,
  type MetricsProviderType,
} from "@entities/metrics/types";
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
  useToast,
} from "@shared/ui";
import { GoalInfo } from "./components/goal-info";

const DAY_MS = 24 * 60 * 60 * 1000;

const formatDate = (value: Date) => value.toISOString().slice(0, 10);

const buildDefaultDateRange = () => {
  const today = new Date();
  const date2 = formatDate(today);
  const date1 = formatDate(new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000));
  return { date1, date2 };
};

type ViewCounterGoalsProps = {
  profile: string;
  counterId: string;
  provider: MetricsProviderType;
};

export const ViewCounterGoals = ({
  profile,
  counterId,
  provider,
}: ViewCounterGoalsProps) => {
  const { date1: defaultDate1, date2: defaultDate2 } = buildDefaultDateRange();
  const [date1, setDate1] = useState(defaultDate1);
  const [date2, setDate2] = useState(defaultDate2);
  const [goals, setGoals] = useState<MetricsGoalDto[] | null>(null);

  const { showToast } = useToast();
  const [loadGoals, { isFetching: isGoalsLoading }] = useLazyGetMetricsGoalsQuery();

  const handleLoadGoals = async () => {
    if (!isValidOneMonthRange(date1, date2)) {
      showToast({ variant: "error", message: "Период не может превышать 1 месяц." });
      return;
    }
    try {
      const response = await loadGoals({
        counterId,
        provider,
        profile,
        date1,
        date2,
      }).unwrap();
      setGoals(response.goals ?? []);
    } catch {
      showToast({ variant: "error", message: "Ошибка загрузки целей." });
    }
  };

  return (
    <FormStack>
      <FormCard>
        <FormRow>
          <FormFields>
            <FormField>
              <FieldLabel>Дата начала</FieldLabel>
              <DateInput value={date1} max={date2} onChange={(event) => setDate1(event.target.value)} />
            </FormField>
            <FormField>
              <FieldLabel>Дата конца</FieldLabel>
              <DateInput value={date2} min={date1} onChange={(event) => setDate2(event.target.value)} />
            </FormField>
          </FormFields>
          <FormActions>
            <Button type="button" variant="primary" onClick={handleLoadGoals} disabled={isGoalsLoading}>
              {isGoalsLoading ? "Загрузка..." : "Показать"}
            </Button>
          </FormActions>
        </FormRow>
      </FormCard>
      <ResultCard>
        {isGoalsLoading ? (
          <ResultLoader label="Загрузка целей..." />
        ) : goals === null ? (
          <CenteredState>
            <PlaceholderText>Нет данных для отображения.</PlaceholderText>
          </CenteredState>
        ) : goals.length === 0 ? (
          <CenteredState>
            <PlaceholderText>Целей нет.</PlaceholderText>
          </CenteredState>
        ) : (
          <GoalsGrid>
            {goals.map((goal) => (
              <GoalInfo key={goal.id} goal={goal} />
            ))}
          </GoalsGrid>
        )}
      </ResultCard>
    </FormStack>
  );
};


const GoalsGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

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
  return Number.isNaN(parsed.getTime()) ? null : parsed;
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
