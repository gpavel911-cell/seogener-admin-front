"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import { useLoginMutation } from "@entities/auth/api";
import { ROUTES } from "@shared/config/routes";
import { selectIsAuthenticated, setCredentials, useAppDispatch, useAppSelector } from "@shared/store";
import { Button, StyledInput, useToast } from "@shared/ui";

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const [login, { isLoading }] = useLoginMutation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { showToast } = useToast();

  useEffect(() => {
    if (isAuthenticated) {
      router.replace(ROUTES.DASHBOARD);
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const result = await login({ email, password }).unwrap();
      dispatch(setCredentials(result));
      router.replace(ROUTES.DASHBOARD);
    } catch {
      showToast({ variant: "error", message: "Ошибка входа" });
    }
  };

  return (
    <Page>
      <Card>
        <Title>Sign in</Title>
        <Form onSubmit={handleSubmit}>
          <Field>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              autoComplete="off"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </Field>
          <Field>
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"
              autoComplete="off"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </Field>
          <SubmitButton variant="primary" type="submit" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign in"}
          </SubmitButton>
        </Form>
      </Card>
    </Page>
  );
}

const Page = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.tokens.color.bgApp};
  padding: 24px;
`;

const Card = styled.div`
  width: 100%;
  max-width: 420px;
  background: ${({ theme }) => theme.tokens.color.bgSurface};
  border-radius: ${({ theme }) => theme.tokens.radius.lg};
  padding: 32px;
  box-shadow: ${({ theme }) => theme.tokens.shadow.popup};
`;

const Title = styled.h1`
  margin: 0 0 24px;
  font-size: 24px;
  font-weight: 600;
  color: ${({ theme }) => theme.tokens.color.textPrimary};
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.label`
  font-size: 14px;
  color: ${({ theme }) => theme.tokens.color.textSecondary};
`;

const Input = styled(StyledInput).attrs({ type: "email" })``;

const PasswordInput = styled(StyledInput).attrs({ type: "password" })``;
const SubmitButton = styled(Button)`
  border: none;
  padding: 12px 16px;
  font-size: 15px;
  font-weight: 500;
`;

