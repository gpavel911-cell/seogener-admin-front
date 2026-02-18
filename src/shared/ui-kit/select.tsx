import * as RadixSelect from "@radix-ui/react-select";
import { useEffect, useRef, useState } from "react";
import { FaChevronDown } from "react-icons/fa6";
import styled from "styled-components";

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type SelectControlProps = {
  value: string;
  options: SelectOption[];
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
};

export function SelectControl({
  value,
  options,
  onValueChange,
  placeholder = "Выберите значение",
  disabled = false,
  invalid = false,
}: SelectControlProps) {
  const [open, setOpen] = useState(false);
  const [thumbTop, setThumbTop] = useState(0);
  const [thumbHeight, setThumbHeight] = useState(28);
  const [showScrollbar, setShowScrollbar] = useState(false);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    const updateScrollbar = () => {
      const { scrollTop, scrollHeight, clientHeight } = viewport;
      const hasOverflow = scrollHeight > clientHeight + 1;
      setShowScrollbar(hasOverflow);

      if (!hasOverflow) {
        setThumbTop(0);
        setThumbHeight(28);
        return;
      }

      const nextThumbHeight = Math.max((clientHeight / scrollHeight) * clientHeight, 24);
      const scrollRange = scrollHeight - clientHeight;
      const thumbRange = clientHeight - nextThumbHeight;
      const nextThumbTop = scrollRange > 0 ? (scrollTop / scrollRange) * thumbRange : 0;

      setThumbHeight(nextThumbHeight);
      setThumbTop(nextThumbTop);
    };

    updateScrollbar();
    viewport.addEventListener("scroll", updateScrollbar, { passive: true });
    window.addEventListener("resize", updateScrollbar);

    return () => {
      viewport.removeEventListener("scroll", updateScrollbar);
      window.removeEventListener("resize", updateScrollbar);
    };
  }, [open, options]);

  return (
    <RadixSelect.Root value={value} onValueChange={onValueChange} disabled={disabled} onOpenChange={setOpen}>
      <Trigger $invalid={invalid}>
        <Value placeholder={placeholder} />
        <SelectIcon aria-hidden="true">
          <FaChevronDown />
        </SelectIcon>
      </Trigger>
      <RadixSelect.Portal>
        <Content position="popper" sideOffset={6}>
          <Viewport ref={viewportRef}>
            {options.map((option) => (
              <Item key={option.value} value={option.value} disabled={option.disabled}>
                <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
              </Item>
            ))}
          </Viewport>
          {showScrollbar ? (
            <ScrollbarTrack aria-hidden="true">
              <ScrollbarThumb $top={thumbTop} $height={thumbHeight} />
            </ScrollbarTrack>
          ) : null}
        </Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}

const Trigger = styled(RadixSelect.Trigger)<{ $invalid: boolean }>`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  border: 1px solid
    ${({ theme, $invalid }) => ($invalid ? theme.tokens.color.danger : theme.tokens.color.borderStrong)};
  border-radius: ${({ theme }) => theme.tokens.radius.sm};
  padding: 8px 12px;
  font-size: ${({ theme }) => theme.tokens.fontSize.md};
  text-align: left;
  color: ${({ theme }) => theme.tokens.color.textPrimary};
  background: ${({ theme }) => theme.tokens.color.bgSurface};
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;

  &:hover:not([data-disabled]) {
    border-color: ${({ theme, $invalid }) => ($invalid ? theme.tokens.color.danger : theme.tokens.color.accent)};
    background: #f9fbff;
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.tokens.shadow.focus};
    border-color: ${({ theme, $invalid }) => ($invalid ? theme.tokens.color.danger : theme.tokens.color.accent)};
  }

  &[data-disabled] {
    cursor: not-allowed;
  }

  & > span:first-child {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const SelectIcon = styled(RadixSelect.Icon)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.tokens.color.textSecondary};
  font-size: 12px;
  flex: 0 0 auto;
`;

const Value = styled(RadixSelect.Value)`
  display: block;
  flex: 1 1 auto;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
`;

const Content = styled(RadixSelect.Content)`
  position: relative;
  z-index: 100;
  min-width: var(--radix-select-trigger-width);
  max-height: 270px;
  overflow: hidden;
  border-radius: ${({ theme }) => theme.tokens.radius.sm};
  border: 1px solid ${({ theme }) => theme.tokens.color.borderSubtle};
  background: ${({ theme }) => theme.tokens.color.bgSurface};
  box-shadow: ${({ theme }) => theme.tokens.shadow.popup};
`;

const Viewport = styled(RadixSelect.Viewport)`
  padding: 6px 16px 6px 6px;
  max-height: 270px;
  overflow-y: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    width: 0;
    height: 0;
  }
`;

const ScrollbarTrack = styled.div`
  position: absolute;
  top: 8px;
  right: 4px;
  bottom: 8px;
  width: 8px;
  border-radius: 999px;
  background: #eef5ff;
`;

const ScrollbarThumb = styled.div<{ $top: number; $height: number }>`
  position: absolute;
  left: 1px;
  right: 1px;
  top: ${({ $top }) => `${$top}px`};
  height: ${({ $height }) => `${$height}px`};
  border-radius: 999px;
  background: ${({ theme }) => theme.tokens.color.borderStrong};
`;

const Item = styled(RadixSelect.Item)`
  font-size: ${({ theme }) => theme.tokens.fontSize.md};
  line-height: 1;
  color: ${({ theme }) => theme.tokens.color.textPrimary};
  border-radius: ${({ theme }) => theme.tokens.radius.sm};
  display: flex;
  align-items: center;
  height: 34px;
  padding: 0 10px;
  user-select: none;
  cursor: pointer;

  &[data-disabled] {
    opacity: 0.55;
    cursor: not-allowed;
  }

  &[data-highlighted] {
    outline: none;
    background: ${({ theme }) => theme.tokens.color.accentMuted};
    color: ${({ theme }) => theme.tokens.color.accentText};
  }
`;
