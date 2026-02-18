import { useEffect, useMemo, useState } from "react";
import { FaCalendarDays, FaChevronLeft, FaChevronRight } from "react-icons/fa6";
import * as RadixPopover from "@radix-ui/react-popover";
import styled, { css, keyframes } from "styled-components";

type BaseInputProps = {
  $invalid?: boolean;
};

const sharedInputStyle = css<BaseInputProps>`
  border: 1px solid
    ${({ theme, $invalid }) => ($invalid ? theme.tokens.color.danger : theme.tokens.color.borderStrong)};
  border-radius: ${({ theme }) => theme.tokens.radius.sm};
  padding: 8px 12px;
  font-size: ${({ theme }) => theme.tokens.fontSize.md};
  font-family: inherit;
  width: 100%;
  background: ${({ theme }) => theme.tokens.color.bgSurface};
  color: ${({ theme }) => theme.tokens.color.textPrimary};
  transition: border-color 0.15s ease, background 0.15s ease;

  &:hover:not(:disabled) {
    border-color: ${({ theme, $invalid }) => ($invalid ? theme.tokens.color.danger : theme.tokens.color.accent)};
    background: #f9fbff;
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.tokens.shadow.focus};
    border-color: ${({ theme, $invalid }) => ($invalid ? theme.tokens.color.danger : theme.tokens.color.accent)};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &[type="date"] {
    font-family: inherit;
    cursor: pointer;
    color-scheme: light;
    accent-color: #2563eb;
  }

  &[type="date"]::-webkit-datetime-edit,
  &[type="date"]::-webkit-datetime-edit-text,
  &[type="date"]::-webkit-datetime-edit-month-field,
  &[type="date"]::-webkit-datetime-edit-day-field,
  &[type="date"]::-webkit-datetime-edit-year-field {
    font-family: inherit;
  }

  &[type="date"]::-webkit-calendar-picker-indicator {
    cursor: pointer;
    color: #2563eb;
  }
`;

export type TextInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  invalid?: boolean;
};

export function TextInput({ invalid, ...props }: TextInputProps) {
  return <StyledInput type="text" $invalid={invalid} {...props} />;
}

export type DateInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  invalid?: boolean;
};

type CalendarCell = {
  key: string;
  date: Date | null;
};

const WEEK_DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"] as const;

export function DateInput({
  invalid,
  value,
  onChange,
  min,
  max,
  disabled,
  placeholder = "Выберите дату",
  ...props
}: DateInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedIso = typeof value === "string" ? value : "";
  const [localValue, setLocalValue] = useState(selectedIso);
  const selectedDate = parseIsoDate(selectedIso);
  const minDate = parseIsoDate(typeof min === "string" ? min : "");
  const maxDate = parseIsoDate(typeof max === "string" ? max : "");
  const initialMonth = selectedDate ?? new Date();
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(initialMonth.getFullYear(), initialMonth.getMonth(), 1));

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const nextMonth = selectedDate ?? new Date();
    setVisibleMonth((prev) => {
      const next = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1);
      const sameMonth = prev.getFullYear() === next.getFullYear() && prev.getMonth() === next.getMonth();
      return sameMonth ? prev : next;
    });
  }, [isOpen, selectedIso]);

  useEffect(() => {
    setLocalValue(selectedIso);
  }, [selectedIso]);

  const monthLabel = useMemo(
    () => new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(visibleMonth),
    [visibleMonth],
  );

  const cells = useMemo<CalendarCell[]>(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const next: CalendarCell[] = [];

    for (let i = 0; i < firstDay; i += 1) {
      next.push({ key: `empty-start-${i}`, date: null });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, month, day);
      next.push({ key: isoDate(date), date });
    }
    while (next.length % 7 !== 0) {
      next.push({ key: `empty-end-${next.length}`, date: null });
    }
    return next;
  }, [visibleMonth]);

  const currentValue = selectedIso || localValue;
  const todayIso = isoDate(new Date());

  const emitDateChange = (nextValue: string) => {
    setLocalValue(nextValue);
    if (!onChange) {
      return;
    }
    const eventLike = {
      type: "change",
      target: { value: nextValue, name: props.name ?? "" },
      currentTarget: { value: nextValue, name: props.name ?? "" },
      preventDefault: () => undefined,
      stopPropagation: () => undefined,
    };
    onChange(eventLike as React.ChangeEvent<HTMLInputElement>);
  };

  const canGoPrev = isMonthAllowed(addMonths(visibleMonth, -1), minDate, maxDate);
  const canGoNext = isMonthAllowed(addMonths(visibleMonth, 1), minDate, maxDate);

  return (
    <DateInputRoot>
      <RadixPopover.Root open={isOpen} onOpenChange={setIsOpen}>
        <RadixPopover.Anchor asChild>
          <DateInputFieldWrap>
            <StyledInput
              {...props}
              type="text"
              $invalid={invalid}
              value={currentValue}
              onChange={(event) => {
                setLocalValue(event.target.value);
                onChange?.(event);
              }}
              placeholder={placeholder}
              disabled={disabled}
              onClick={() => {
                if (!disabled) {
                  setIsOpen(true);
                }
              }}
            />
            <CalendarIconButton
              type="button"
              onClick={() => {
                if (!disabled) {
                  setIsOpen((prev) => !prev);
                }
              }}
              disabled={disabled}
              aria-label="Открыть календарь"
            >
              <FaCalendarDays aria-hidden="true" />
            </CalendarIconButton>
          </DateInputFieldWrap>
        </RadixPopover.Anchor>

        <RadixPopover.Portal>
          <CalendarPopup
            role="dialog"
            aria-label="Календарь"
            sideOffset={8}
            align="start"
            collisionPadding={8}
          >
          <CalendarHeader>
            <NavButton
              type="button"
              onClick={() => setVisibleMonth((prev) => addMonths(prev, -1))}
              disabled={!canGoPrev}
              aria-label="Предыдущий месяц"
            >
              <FaChevronLeft aria-hidden="true" />
            </NavButton>
            <MonthTitle>{monthLabel}</MonthTitle>
            <NavButton
              type="button"
              onClick={() => setVisibleMonth((prev) => addMonths(prev, 1))}
              disabled={!canGoNext}
              aria-label="Следующий месяц"
            >
              <FaChevronRight aria-hidden="true" />
            </NavButton>
          </CalendarHeader>

          <WeekDaysRow>
            {WEEK_DAYS.map((day) => (
              <WeekDayCell key={day}>{day}</WeekDayCell>
            ))}
          </WeekDaysRow>

          <DaysGrid>
            {cells.map((cell) => {
              if (!cell.date) {
                return <EmptyCell key={cell.key} />;
              }

              const cellIso = isoDate(cell.date);
              const isSelected = cellIso === currentValue;
              const isToday = cellIso === todayIso;
              const isDisabled =
                (minDate !== null && cell.date < stripTime(minDate)) ||
                (maxDate !== null && cell.date > stripTime(maxDate));

              return (
                <DayButton
                  key={cell.key}
                  type="button"
                  onClick={() => {
                    if (isDisabled) {
                      return;
                    }
                    emitDateChange(cellIso);
                    setIsOpen(false);
                  }}
                  $selected={isSelected}
                  $today={isToday}
                  disabled={isDisabled}
                >
                  {cell.date.getDate()}
                </DayButton>
              );
            })}
          </DaysGrid>
          <CalendarFooter>
            <FooterButton
              type="button"
              onClick={() => {
                const today = isoDate(new Date());
                emitDateChange(today);
                setVisibleMonth(new Date());
                setIsOpen(false);
              }}
            >
              Сегодня
            </FooterButton>
          </CalendarFooter>
          </CalendarPopup>
        </RadixPopover.Portal>
      </RadixPopover.Root>
    </DateInputRoot>
  );
}

export const StyledInput = styled.input<BaseInputProps>`
  ${sharedInputStyle}
`;

const DateInputRoot = styled.div`
  position: relative;
  width: 100%;
`;

const DateInputFieldWrap = styled.div`
  position: relative;
`;

const CalendarIconButton = styled.button`
  position: absolute;
  top: 50%;
  right: 8px;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #2563eb;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: rgba(37, 99, 235, 0.12);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
`;

const popupAppear = keyframes`
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const CalendarPopup = styled(RadixPopover.Content)`
  z-index: 1400;
  width: min(340px, calc(100vw - 16px));
  border-radius: 14px;
  border: 1px solid #d5e2f4;
  background: #ffffff;
  box-shadow: 0 16px 34px rgba(15, 23, 42, 0.16);
  padding: 12px;
  animation: ${popupAppear} 0.14s ease;
`;

const CalendarHeader = styled.div`
  display: grid;
  grid-template-columns: 28px 1fr 28px;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
`;

const MonthTitle = styled.div`
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  text-transform: capitalize;
`;

const NavButton = styled.button`
  width: 30px;
  height: 30px;
  border: 1px solid #d5e2f4;
  border-radius: 8px;
  background: #f6faff;
  color: #334155;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &:hover:not(:disabled) {
    border-color: rgba(37, 99, 235, 0.35);
    color: #1d4ed8;
    background: #eff6ff;
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

const WeekDaysRow = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 4px;
`;

const WeekDayCell = styled.div`
  text-align: center;
  font-size: 11px;
  font-weight: 600;
  color: #6b7f99;
  padding: 4px 0;
`;

const DaysGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
`;

const EmptyCell = styled.div`
  height: 32px;
`;

const DayButton = styled.button<{ $selected: boolean; $today: boolean }>`
  height: 34px;
  border-radius: 8px;
  border: 1px solid
    ${({ $selected, $today }) => ($selected ? "rgba(37, 99, 235, 0.45)" : $today ? "rgba(37, 99, 235, 0.35)" : "transparent")};
  background: ${({ $selected }) => ($selected ? "linear-gradient(180deg, rgba(37, 99, 235, 0.2) 0%, rgba(37, 99, 235, 0.12) 100%)" : "transparent")};
  color: ${({ $selected }) => ($selected ? "#1d4ed8" : "#1f2937")};
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: ${({ $selected }) => ($selected ? "rgba(37, 99, 235, 0.2)" : "#f1f5ff")};
  }

  &:disabled {
    opacity: 0.32;
    cursor: not-allowed;
  }
`;

const CalendarFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #edf2fa;
`;

const FooterButton = styled.button`
  border: 1px solid #d5e2f4;
  border-radius: 8px;
  background: #f7faff;
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 500;
  padding: 5px 10px;
  cursor: pointer;

  &:hover {
    background: #edf4ff;
    border-color: rgba(37, 99, 235, 0.4);
  }
`;

function parseIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

function isoDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addMonths(value: Date, shift: number): Date {
  return new Date(value.getFullYear(), value.getMonth() + shift, 1);
}

function stripTime(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function isMonthAllowed(monthDate: Date, minDate: Date | null, maxDate: Date | null): boolean {
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  if (minDate && monthEnd < stripTime(minDate)) {
    return false;
  }
  if (maxDate && monthStart > stripTime(maxDate)) {
    return false;
  }
  return true;
}
