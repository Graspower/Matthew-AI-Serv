'use client';

import type { ReactNode } from 'react';
import React, { createContext, useContext } from 'react';

// A shell context that provides no user data.
interface AuthContextType {
  user: null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // The provider now simply renders children without any auth logic.
  const value = {
    user: null,
    loading: false,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  // The hook now returns a static object, effectively disabling auth checks.
  return context;
}
