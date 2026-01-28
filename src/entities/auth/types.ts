export type AuthUserResponse = {
  id: number;
  email: string;
};

export type AuthResponse = {
  accessToken: string;
  expiresIn: number;
  user: AuthUserResponse;
};

export type LoginRequest = {
  email: string;
  password: string;
};
