"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import { FaChevronDown, FaUserCircle } from "react-icons/fa";
import { useLogoutMutation } from "@entities/auth/api";
import { ROUTES } from "@shared/config/routes";
import { clearCredentials, selectAuth, useAppDispatch, useAppSelector } from "@shared/store";

export function TopBar() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(selectAuth);
  const [logout] = useLogoutMutation();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const handleLogout = async () => {
    try {
      await logout().unwrap();
    } catch {
      // Ignore logout errors and clear local session.
    } finally {
      dispatch(clearCredentials());
      router.replace(ROUTES.LOGIN);
    }
  };

  return (
    <Bar>
      <Profile ref={menuRef}>
        <ProfilePanel $open={isOpen}>
          <ProfileButton type="button" onClick={() => setIsOpen((prev) => !prev)} $open={isOpen}>
            <AvatarIcon aria-hidden="true" />
            <UserEmail>{user?.email}</UserEmail>
            <ChevronIcon aria-hidden="true" $open={isOpen} />
          </ProfileButton>
          <MenuSection $open={isOpen} role="menu" aria-hidden={!isOpen}>
            <MenuInner $open={isOpen}>
              <MenuButton type="button" role="menuitem" onClick={handleLogout} tabIndex={isOpen ? 0 : -1}>
                Выйти
              </MenuButton>
            </MenuInner>
          </MenuSection>
        </ProfilePanel>
      </Profile>
    </Bar>
  );
}

const Bar = styled.header`
  position: sticky;
  top: 10px;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 32px;
  margin: 12px 16px 0;
  border-radius: 16px;
  background: linear-gradient(180deg, #f2f8ff 0%, #e4efff 100%);
  border: 1px solid ${({ theme }) => theme.tokens.color.borderSubtle};
  box-shadow: none;
`;

const Profile = styled.div`
  position: relative;
  margin-left: auto;
  height: 42px;
`;

const ProfilePanel = styled.div<{ $open: boolean }>`
  position: absolute;
  right: 0;
  top: 0;
  height: ${({ $open }) => ($open ? "auto" : "42px")};
  display: inline-flex;
  flex-direction: column;
  align-items: stretch;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.tokens.color.borderSubtle};
  border-radius: 20px;
  background: ${({ theme }) => theme.tokens.color.bgSurface};
  font-family: "Segoe UI", Roboto, Arial, sans-serif;
  box-shadow: ${({ theme, $open }) => ($open ? theme.tokens.shadow.popup : "none")};
  transition: box-shadow 0.09s ease, border-color 0.09s ease;

  ${({ theme, $open }) =>
    $open
      ? `
    border-color: ${theme.tokens.color.borderStrong};
  `
      : ""}
`;

const ProfileButton = styled.button<{ $open: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px;
  min-height: 42px;
  border: none;
  border-bottom: none;
  border-radius: inherit;
  background: transparent;
  cursor: pointer;
  color: ${({ theme }) => theme.tokens.color.textPrimary};
  font-weight: 600;
  transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
  white-space: nowrap;

  ${({ theme, $open }) =>
    $open
      ? `
    border-bottom-color: ${theme.tokens.color.borderSubtle};
  `
      : ""}

  &:hover {
    background: ${({ theme }) => theme.tokens.color.accentMuted};
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.tokens.shadow.focus};
    border-color: ${({ theme }) => theme.tokens.color.accent};
  }
`;

const AvatarIcon = styled(FaUserCircle)`
  font-size: 28px;
  color: ${({ theme }) => theme.tokens.color.accent};
`;

const UserEmail = styled.span`
  font-size: 14px;
  color: ${({ theme }) => theme.tokens.color.textPrimary};
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ChevronIcon = styled(FaChevronDown)<{ $open: boolean }>`
  font-size: 12px;
  color: ${({ theme }) => theme.tokens.color.textMuted};
  transform: ${({ $open }) => ($open ? "rotate(180deg)" : "rotate(0deg)")};
  transition: transform 0.15s ease;
`;

const MenuSection = styled.div<{ $open: boolean }>`
  display: grid;
  grid-template-rows: ${({ $open }) => ($open ? "1fr" : "0fr")};
  transition: grid-template-rows 0.1s ease;
  pointer-events: ${({ $open }) => ($open ? "auto" : "none")};
`;

const MenuInner = styled.div<{ $open: boolean }>`
  overflow: hidden;
  padding: ${({ $open }) => ($open ? "8px" : "0 8px")};
  opacity: ${({ $open }) => ($open ? 1 : 0)};
  transform: translateY(${({ $open }) => ($open ? "0" : "-4px")});
  transition: opacity 0.07s ease, transform 0.1s ease;
  will-change: opacity, transform;
`;

const MenuButton = styled.button`
  width: 100%;
  text-align: left;
  padding: 10px 12px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  color: ${({ theme }) => theme.tokens.color.textPrimary};

  &:hover {
    background: ${({ theme }) => theme.tokens.color.accentMuted};
  }
`;
