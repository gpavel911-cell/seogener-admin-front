export type AuthUserResponse = {
  id: number;
  email: string;
};

export type AuthResponse = {
  accessToken: string;
  accessTokenExpiresAt: string;
  sessionIdleExpiresAt: string;
  sessionAbsoluteExpiresAt: string;
  user: AuthUserResponse;
};

export type LoginRequest = {
  email: string;
  password: string;
};
