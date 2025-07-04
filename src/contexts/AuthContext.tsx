
'use client';
import type { ReactNode } from 'react';
import React, { createContext, useContext } from 'react';

// This is a placeholder context after undoing the auth feature.
const AuthContext = createContext<undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useAuth() {
  // Return a mock context to avoid breaking components that might still use it temporarily.
  return { 
    user: null, 
    loading: true, 
    login: async () => { console.log("Login function is not available."); }, 
    logout: async () => { console.log("Logout function is not available."); }
  };
}
