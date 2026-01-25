"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import { FaUserCircle } from "react-icons/fa";
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
        <ProfileButton type="button" onClick={() => setIsOpen((prev) => !prev)}>
          <AvatarIcon aria-hidden="true" />
          <UserEmail>{user?.email}</UserEmail>
        </ProfileButton>
        {isOpen ? (
          <Menu role="menu">
            <MenuButton type="button" role="menuitem" onClick={handleLogout}>
              Выйти
            </MenuButton>
          </Menu>
        ) : null}
      </Profile>
    </Bar>
  );
}

const Bar = styled.header`
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 16px 32px;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
`;

const Profile = styled.div`
  position: relative;
`;

const ProfileButton = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  background: #f9fafb;
  cursor: pointer;
  color: #111827;
  font-weight: 600;
  transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;

  &:hover {
    background: #f3f4f6;
    border-color: #d1d5db;
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.25);
    border-color: #2563eb;
  }
`;

const AvatarIcon = styled(FaUserCircle)`
  font-size: 28px;
  color: #2563eb;
`;

const UserEmail = styled.span`
  font-size: 14px;
  color: #111827;
`;

const Menu = styled.div`
  position: absolute;
  right: 0;
  margin-top: 8px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
  min-width: 160px;
  padding: 8px;
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
  color: #111827;

  &:hover {
    background: #f3f4f6;
  }
`;
