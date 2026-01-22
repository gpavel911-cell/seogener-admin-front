export type AuthUser = {
  id: number;
  email: string;
};

export type AuthResponse = {
  accessToken: string;
  expiresIn: number;
  user: AuthUser;
};

export type LoginRequest = {
  email: string;
  password: string;
};
