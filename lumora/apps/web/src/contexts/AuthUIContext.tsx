'use client';

import { createContext, useContext } from 'react';

interface AuthUIContextValue {
  requestLogin: () => void;
}

const AuthUIContext = createContext<AuthUIContextValue>({
  requestLogin: () => {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('AuthUIContext not initialised before calling requestLogin');
    }
  },
});

export function AuthUIProvider({
  value,
  children,
}: {
  value: AuthUIContextValue;
  children: React.ReactNode;
}) {
  return <AuthUIContext.Provider value={value}>{children}</AuthUIContext.Provider>;
}

export function useAuthUI(): AuthUIContextValue {
  return useContext(AuthUIContext);
}
