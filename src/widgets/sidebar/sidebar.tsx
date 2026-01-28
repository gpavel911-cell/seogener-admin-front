"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styled from "styled-components";
import { SIDEBAR_ITEMS } from "@shared/config/navigation";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <SidebarContainer>
      <Navigation aria-label="Основная навигация">
        <NavList>
          {SIDEBAR_ITEMS.map((item) => {
            const currentPath = pathname ?? "";
            const isActive = currentPath === item.path || currentPath.startsWith(`${item.path}/`);
            return (
              <NavItem key={item.id}>
                <NavLink href={item.path} $active={isActive} aria-current={isActive ? "page" : undefined}>
                  {item.label}
                </NavLink>
              </NavItem>
            );
          })}
        </NavList>
      </Navigation>
    </SidebarContainer>
  );
}

const SidebarContainer = styled.aside`
  width: 250px;
  min-width: 250px;
  max-width: 250px;
  flex: 0 0 250px;
  background: #ffffff;
  border-right: 1px solid #e5e7eb;
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const Brand = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: #111827;
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

const NavLink = styled(Link)<{ $active: boolean }>`
  display: block;
  padding: 10px 12px;
  border-radius: 8px;
  color: ${(props) => (props.$active ? "#111827" : "#4b5563")};
  background: ${(props) => (props.$active ? "#f3f4f6" : "transparent")};
  font-weight: ${(props) => (props.$active ? 600 : 500)};
  text-decoration: none;

  &:hover {
    background: #f3f4f6;
    color: #111827;
  }
`;
