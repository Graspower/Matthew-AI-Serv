
'use client';

import type { ReactNode } from 'react';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile, type User, type Auth } from 'firebase/auth';
import { auth, isConfigured } from '@/lib/firebase';
import { LoadingScreen } from '@/components/LoadingScreen';

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

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (name: string, email: string, pass: string) => Promise<any>;
  logIn: (email: string, pass: string) => Promise<any>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  if (!isConfigured) {
    return <FirebaseNotConfigured />;
  }
  return <AuthComponent>{children}</AuthComponent>;
}

function AuthComponent({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth as Auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signUp = async (name: string, email: string, pass: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth as Auth, email, pass);
    if (userCredential.user) {
        await updateProfile(userCredential.user, { displayName: name });
    }
    // Manually set user to re-render consumers immediately
    setUser(userCredential.user);
    return userCredential;
  };

  const logIn = async (email: string, pass: string) => {
    return signInWithEmailAndPassword(auth as Auth, email, pass);
  };

  const logout = async () => {
    await signOut(auth as Auth);
  };
  
  if (loading) {
    return <LoadingScreen />;
  }
  
  const value = { user, loading, signUp, logIn, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    return {
      user: null,
      loading: false,
      signUp: async () => console.error("Auth call failed: Firebase is not configured."),
      logIn: async () => console.error("Auth call failed: Firebase is not configured."),
      logout: async () => {},
    };
  }
  return context;
}
