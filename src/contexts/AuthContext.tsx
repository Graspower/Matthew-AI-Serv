'use client';

import type { ReactNode } from 'react';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, type User } from 'firebase/auth';
import { auth, isConfigured } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// A component to render when Firebase is not configured.
const FirebaseNotConfigured = () => (
  <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background p-8 text-center">
    <div className="max-w-2xl rounded-lg border border-destructive/50 bg-destructive/10 p-8">
      <h1 className="text-2xl font-bold text-destructive">Firebase Not Configured</h1>
      <p className="mt-4 text-destructive/90">
        The application cannot connect to Firebase because the necessary environment variables are missing.
      </p>
      <div className="mt-6 text-left text-sm text-foreground">
        <p className="font-semibold">To fix this:</p>
        <ol className="ml-4 mt-2 list-decimal space-y-2">
          <li>Find your project's root folder (where `package.json` is located).</li>
          <li>Create a file named exactly <strong>.env.local</strong> in that folder.</li>
          <li>
            Copy the contents from the <strong>.env.local.example</strong> file into your new <strong>.env.local</strong> file.
          </li>
          <li>Fill in your actual project values from the Firebase console for each variable.</li>
          <li>
            <strong>Restart your server.</strong> This is crucial. Stop the running server (Ctrl+C in the terminal) and start it again with `npm run dev`.
          </li>
        </ol>
      </div>
    </div>
  </div>
);


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConfigured || !auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async () => {
    if (!isConfigured || !auth) {
       console.error("Login failed: Firebase is not configured.");
       alert("Firebase is not configured. Please check the console for details.");
       return;
    }
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error during sign-in:", error);
    }
  };

  const logout = async () => {
    if (auth) {
      await signOut(auth);
    }
  };
  
  if (loading && isConfigured) {
    return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin" />
        </div>
    );
  }

  if (!isConfigured) {
    return <FirebaseNotConfigured />;
  }
  
  const value = { user, loading, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
