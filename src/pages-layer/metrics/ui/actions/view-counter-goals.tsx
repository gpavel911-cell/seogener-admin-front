import { useState } from "react";
import styled from "styled-components";
import { useLazyGetMetricsGoalsQuery } from "@entities/metrics/api";
import { useMetricsSelectOptions } from "@entities/metrics/select-options";
import {
  MetricsProviderType,
  type MetricsGoalDto,
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
  SelectControl,
  useToast,
} from "@shared/ui";
import { GoalInfo } from "./components/goal-info";

const DEFAULT_PROVIDER = MetricsProviderType.YANDEX_METRICA;
const DAY_MS = 24 * 60 * 60 * 1000;

const formatDate = (value: Date) => value.toISOString().slice(0, 10);

const buildDefaultDateRange = () => {
  const today = new Date();
  const date2 = formatDate(today);
  const date1 = formatDate(new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000));
  return { date1, date2 };
};

type ActionsSectionViewCounterGoalsProps = {
  fixedProfile?: string | null;
};

export const ViewCounterGoals = ({ fixedProfile }: ActionsSectionViewCounterGoalsProps = {}) => {
  const { date1: defaultDate1, date2: defaultDate2 } = buildDefaultDateRange();
  const [counterId, setCounterId] = useState("");
  const [date1, setDate1] = useState(defaultDate1);
  const [date2, setDate2] = useState(defaultDate2);
  const [goals, setGoals] = useState<MetricsGoalDto[] | null>(null);
  const [activeProfile, setActiveProfile] = useState<string | null>(null);

  const { showToast } = useToast();
  const {
    resolvedProfile,
    isProfilesFetching: isAccountsFetching,
    isCountersFetching,
    resolvedCounterId,
    profileOptions,
    counterOptions: counterSelectOptions,
  } = useMetricsSelectOptions({
    activeProfile,
    fixedProfile: fixedProfile ?? null,
    fixedProvider: DEFAULT_PROVIDER,
    activeCounterId: counterId,
  });
  const effectiveCounterId = resolvedCounterId || counterId;
  const [loadGoals, { isFetching: isGoalsLoading }] = useLazyGetMetricsGoalsQuery();

  const handleProfileChange = (value: string) => {
    setActiveProfile(value || null);
    setCounterId("");
    setGoals(null);
  };

  const handleLoadGoals = async () => {
    if (!effectiveCounterId) {
      showToast({ variant: "error", message: "Выберите счетчик." });
      return;
    }
    if (!resolvedProfile) {
      showToast({ variant: "error", message: "Выберите профиль Метрики." });
      return;
    }
    if (!isValidOneMonthRange(date1, date2)) {
      showToast({ variant: "error", message: "Период не может превышать 1 месяц." });
      return;
    }
    try {
      const response = await loadGoals({
        counterId: effectiveCounterId,
        provider: DEFAULT_PROVIDER,
        profile: resolvedProfile,
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
