'use client';

import type { ReactNode } from 'react';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, type User, type Auth } from 'firebase/auth';
import { auth, isConfigured } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// A self-contained, helpful component to display when Firebase is not configured.
const FirebaseNotConfigured = () => (
  <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background p-8 text-center">
    <div className="max-w-2xl rounded-lg border border-destructive/50 bg-destructive/10 p-8">
      <h1 className="text-2xl font-bold text-destructive">Firebase Not Configured</h1>
      <p className="mt-4 text-destructive/90">
        Your app is running, but it cannot connect to Firebase. This usually means your local environment variables are missing or incorrect.
      </p>
      <div className="mt-6 text-left text-sm text-foreground">
        <p className="font-semibold">To fix this, please follow these steps:</p>
        <ol className="ml-4 mt-2 list-decimal space-y-2">
          <li>Ensure a file named <strong>.env.local</strong> exists in your project's root folder (the same folder as `package.json`).</li>
          <li>
            Verify that this file contains all the required Firebase keys, each starting with `NEXT_PUBLIC_`. You can copy them from `.env.local.example`.
          </li>
          <li>Fill in your actual project values from the Firebase console for each variable.</li>
          <li>
            <strong>CRITICAL: Restart your development server.</strong> Stop the running server (press `Ctrl+C` in the terminal) and start it again with `npm run dev`. Changes to `.env.local` are only applied on startup.
          </li>
        </ol>
      </div>
    </div>
  </div>
);


export function AuthProvider({ children }: { children: ReactNode }) {
  // If Firebase is not configured, we show the guide and stop rendering the rest of the app.
  // This is the main guard that prevents any crashes.
  if (!isConfigured) {
    return <FirebaseNotConfigured />;
  }

  // If configured, we can safely render the component that uses Firebase.
  return <AuthComponent>{children}</AuthComponent>;
}

// This component ONLY renders when `isConfigured` is true.
function AuthComponent({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Because this component only renders when isConfigured is true, `auth` is guaranteed to be a valid Auth instance.
    const unsubscribe = onAuthStateChanged(auth as Auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    try {
      // `auth` is non-null here as well.
      await signInWithPopup(auth as Auth, provider);
    } catch (error) {
      console.error("Error during sign-in:", error);
    }
  };

  const logout = async () => {
    // `auth` is non-null here as well.
    await signOut(auth as Auth);
  };
  
  if (loading) {
    return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin" />
        </div>
    );
  }
  
  const value = { user, loading, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // This case will be hit if a component tries to useAuth without being a child of a configured AuthProvider.
    // We return a safe, "logged-out" default state.
    return {
      user: null,
      loading: false,
      login: async () => console.error("Login call failed: Firebase is not configured."),
      logout: async () => {},
    };
  }
  return context;
}
