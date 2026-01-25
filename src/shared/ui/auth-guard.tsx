"use client";

import { type ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useRefreshMutation } from "@entities/auth/api";
import { ROUTES } from "@shared/config/routes";
import { clearCredentials, selectAuth, setCredentials, useAppDispatch, useAppSelector } from "@shared/store";

type AuthGuardProps = {
  children: ReactNode;
};

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { accessToken } = useAppSelector(selectAuth);
  const [refresh, { isLoading }] = useRefreshMutation();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const ensureSession = async () => {
      if (accessToken) {
        setChecked(true);
        return;
      }

      try {
        const result = await refresh().unwrap();
        if (!isMounted) {
          return;
        }
        dispatch(setCredentials(result));
        setChecked(true);
      } catch {
        dispatch(clearCredentials());
        router.replace(ROUTES.LOGIN);
        setChecked(true);
      }
    };

    ensureSession();

    return () => {
      isMounted = false;
    };
  }, [accessToken, refresh, dispatch, router]);

  if (!checked || isLoading) {
    return null;
  }

  return <>{children}</>;
}
