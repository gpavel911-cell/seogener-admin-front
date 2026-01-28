import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AuthResponse, AuthUserResponse } from "@entities/auth/types";
import { clearAuthState, loadAuthState, persistAuthState, type StoredAuthState } from "./auth-storage";
import type { RootState } from "./store";

type AuthState = StoredAuthState & {
  isInitialized: boolean;
};

const initialState: AuthState = {
  ...loadAuthState(),
  isInitialized: true,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<AuthResponse>) => {
      state.accessToken = action.payload.accessToken;
      state.user = action.payload.user as AuthUserResponse;
      persistAuthState({
        accessToken: state.accessToken,
        user: state.user,
      });
    },
    clearCredentials: (state) => {
      state.accessToken = null;
      state.user = null;
      clearAuthState();
    },
  },
});

export const { setCredentials, clearCredentials } = authSlice.actions;
export default authSlice.reducer;

export const selectAuth = (state: RootState) => state.auth;
export const selectIsAuthenticated = (state: RootState) => Boolean(state.auth.accessToken);
