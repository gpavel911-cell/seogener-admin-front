"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styled from "styled-components";
import { FaChartBar, FaChevronLeft, FaChevronRight, FaCompass, FaFolderOpen, FaGlobe, FaMagic, FaServer, FaUpload } from "react-icons/fa";
import { SIDEBAR_ITEMS } from "@shared/config/navigation";

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
};

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const currentPath = pathname ?? "";

  return (
    <SidebarContainer $collapsed={collapsed}>
      <TopControls $collapsed={collapsed}>
        <CollapseControl
          type="button"
          onClick={onToggle}
          $collapsed={collapsed}
          aria-label={collapsed ? "Развернуть боковую панель" : "Свернуть боковую панель"}
          title={collapsed ? "Развернуть меню" : "Свернуть меню"}
        >
          <CollapseIconWrap $collapsed={collapsed}>
            {collapsed ? <FaChevronRight aria-hidden="true" /> : <FaChevronLeft aria-hidden="true" />}
          </CollapseIconWrap>
        </CollapseControl>
      </TopControls>
      <Navigation aria-label="Основная навигация">
        <NavList>
          {SIDEBAR_ITEMS.map((item) => {
            const isActive = currentPath === item.path || currentPath.startsWith(`${item.path}/`);
            const ItemIcon = ICONS_BY_ITEM[item.id] ?? FaCompass;
            return (
              <NavItem key={item.id}>
                <NavLink
                  href={item.path}
                  $active={isActive}
                  $collapsed={collapsed}
                  aria-current={isActive ? "page" : undefined}
                  title={collapsed ? item.label : undefined}
                >
                  <IconWrap $active={isActive}>
                    <ItemIcon aria-hidden="true" />
                  </IconWrap>
                  <LabelText $collapsed={collapsed}>{item.label}</LabelText>
                </NavLink>
              </NavItem>
            );
          })}
        </NavList>
      </Navigation>
    </SidebarContainer>
  );
}

const ICONS_BY_ITEM: Record<string, typeof FaCompass> = {
  dashboard: FaChartBar,
  registrars: FaServer,
  metrics: FaCompass,
  webmaster: FaGlobe,
  topvisor: FaUpload,
  projects: FaFolderOpen,
  generator: FaMagic,
};

const SidebarContainer = styled.aside<{ $collapsed: boolean }>`
  width: ${({ $collapsed }) => ($collapsed ? "84px" : "250px")};
  min-width: ${({ $collapsed }) => ($collapsed ? "84px" : "250px")};
  max-width: ${({ $collapsed }) => ($collapsed ? "84px" : "250px")};
  flex: 0 0 ${({ $collapsed }) => ($collapsed ? "84px" : "250px")};
  margin: 12px 0 16px 16px;
  background: linear-gradient(180deg, #f2f8ff 0%, #e4efff 100%);
  border: 1px solid ${({ theme }) => theme.tokens.color.borderSubtle};
  border-radius: 16px;
  box-shadow: none;
  padding: ${({ $collapsed }) => ($collapsed ? "24px 12px" : "24px 16px")};
  display: flex;
  flex-direction: column;
  gap: 24px;
  transition: width 200ms ease, min-width 200ms ease, max-width 200ms ease, padding 200ms ease;
`;

const TopControls = styled.div<{ $collapsed: boolean }>`
  display: flex;
  justify-content: ${({ $collapsed }) => ($collapsed ? "center" : "flex-end")};
`;

const Navigation = styled.nav`
  display: block;
`;

const NavList = styled.ul`
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
`;

const NavItem = styled.li`
  margin: 0;
`;

const NavLink = styled(Link)<{ $active: boolean; $collapsed: boolean }>`
  display: flex;
  align-items: center;
  justify-content: ${({ $collapsed }) => ($collapsed ? "center" : "flex-start")};
  gap: ${({ $collapsed }) => ($collapsed ? "0" : "8px")};
  padding: 8px 10px;
  border: 1px solid transparent;
  border-radius: ${({ theme }) => theme.tokens.radius.sm};
  color: ${({ theme, $active }) => ($active ? theme.tokens.color.accentText : theme.tokens.color.textSecondary)};
  background: ${({ theme, $active }) => ($active ? theme.tokens.color.accentMuted : "transparent")};
  font-weight: ${(props) => (props.$active ? 500 : 400)};
  font-size: 14px;
  text-decoration: none;
  transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease;

  &:hover {
    background: ${({ theme }) => theme.tokens.color.accentMuted};
    color: ${({ theme, $active }) => ($active ? theme.tokens.color.accentText : theme.tokens.color.textPrimary)};
    border-color: rgba(37, 99, 235, 0.2);
    transform: translateX(2px);
  }
`;

const LabelText = styled.span<{ $collapsed: boolean }>`
  max-width: ${({ $collapsed }) => ($collapsed ? "0" : "150px")};
  opacity: ${({ $collapsed }) => ($collapsed ? 0 : 1)};
  overflow: hidden;
  white-space: nowrap;
  transition: max-width 150ms ease, opacity 120ms ease;
`;

const IconWrap = styled.span<{ $active: boolean }>`
  width: 26px;
  height: 26px;
  border-radius: 7px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: ${({ theme, $active }) => ($active ? theme.tokens.color.accentText : theme.tokens.color.textSecondary)};
  background: ${({ $active }) => ($active ? "rgba(37, 99, 235, 0.14)" : "#f3f4f6")};
`;

const CollapseControl = styled.button<{ $collapsed: boolean }>`
  width: 32px;
  height: 32px;
  border-radius: 10px;
  border: 1px solid ${({ theme, $collapsed }) => ($collapsed ? "rgba(37, 99, 235, 0.4)" : theme.tokens.color.borderSubtle)};
  background: ${({ theme, $collapsed }) => ($collapsed ? theme.tokens.color.accentMuted : theme.tokens.color.bgSurface)};
  color: ${({ theme, $collapsed }) => ($collapsed ? theme.tokens.color.accentText : theme.tokens.color.textSecondary)};
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
  transform: translateX(${({ $collapsed }) => ($collapsed ? "0" : "-3px")});

  &:hover {
    background: ${({ theme }) => theme.tokens.color.accentMuted};
    border-color: ${({ theme }) => theme.tokens.color.borderStrong};
    color: ${({ theme }) => theme.tokens.color.textPrimary};
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.tokens.shadow.focus};
  }
`;

const CollapseIconWrap = styled.span<{ $collapsed: boolean }>`
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  transform: ${({ $collapsed }) => ($collapsed ? "translateX(0)" : "translateX(-1px)")};
  transition: transform 0.15s ease;
`;
