'use client';

import type { ReactNode } from 'react';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, type User } from 'firebase/auth';
import { auth, isConfigured } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';

// New error component to display when Firebase isn't configured.
function FirebaseConfigError() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="max-w-2xl p-8 mx-4 text-center border rounded-lg shadow-lg bg-card text-card-foreground">
        <h1 className="text-2xl font-bold text-destructive">Configuration Error</h1>
        <p className="mt-4 text-lg">Your Firebase environment variables are missing.</p>
        <div className="mt-6 text-left text-muted-foreground">
            <p className="mb-4">This is a setup issue, not a code bug. To fix this, please follow these steps:</p>
            <ol className="pl-5 space-y-2 list-decimal">
                <li>
                    <strong>Find your project's root folder</strong>: This is the folder that contains the <code>package.json</code> file.
                </li>
                <li>
                    <strong>Create a file named exactly <code>.env.local</code></strong> in that folder.
                </li>
                <li>
                    <strong>Copy the contents</strong> from the <code>.env.local.example</code> file into your new <code>.env.local</code> file.
                </li>
                <li>
                    <strong>Fill in your real Firebase values</strong> from your Firebase project console for each variable.
                </li>
                <li>
                    <strong>Restart your server</strong>: This is the most important step. Stop your development server (Ctrl+C in the terminal) and run <code>npm run dev</code> again.
                </li>
            </ol>
            <p className="mt-4">The app will not work correctly until the server is restarted with the correct <code>.env.local</code> file.</p>
        </div>
      </div>
    </div>
  );
}


interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // If Firebase is not configured, show a dedicated error screen instead of crashing.
  if (!isConfigured) {
    return <FirebaseConfigError />;
  }

  // The rest of the component assumes `auth` is not null because `isConfigured` is true.
  useEffect(() => {
    // We can safely assert auth is not null here due to the `isConfigured` check
    const unsubscribe = onAuthStateChanged(auth!, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async () => {
    try {
      const provider = new GoogleAuthProvider();
      // We can safely assert auth is not null here
      await signInWithPopup(auth!, provider);
    } catch (error) {
      console.error("Error during sign-in:", error);
    }
  };

  const logout = async () => {
    try {
      // We can safely assert auth is not null here
      await signOut(auth!);
    } catch (error) {
      console.error("Error during sign-out:", error);
    }
  };

  if (loading) {
      return (
          <div className="flex items-center justify-center min-h-screen">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
      );
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
