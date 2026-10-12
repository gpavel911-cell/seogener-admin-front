import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";

import { baseApi } from "./base-api";
import authReducer from "./auth-slice";
import toastReducer from "./toast-slice";

export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
    auth: authReducer,
    toast: toastReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
  devTools: {
    actionSanitizer: (action) => {
      const sensitive = action as typeof action & {
        meta?: { arg?: { endpointName?: string; originalArgs?: unknown }; baseQueryMeta?: unknown };
      };
      if (sensitive.meta?.arg?.endpointName !== "saveNameSiloProfile") return action;
      // RTK action metadata contains mutation arguments; omit credential-bearing metadata from DevTools.
      return { ...action, payload: undefined, error: undefined, meta: { arg: { endpointName: "saveNameSiloProfile" } } };
    },
  },
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
