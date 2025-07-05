
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useSettings, type Language, type BibleTranslation } from '@/contexts/SettingsContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { Settings, Sun, Moon, BookOpenText, LogOut, Loader2, MessageSquare } from 'lucide-react';
import { AuthForm } from './AuthForm';

export function Header() {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, bibleTranslation, setBibleTranslation } = useSettings();
  const { user, loading, logout } = useAuth();
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);

  const openAuthDialog = () => {
    setIsAuthDialogOpen(true);
  }

  const UserProfile = () => {
    if (loading) {
      return <Loader2 className="h-6 w-6 animate-spin" />;
    }
    
    if (user) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.photoURL ?? ''} alt={user.displayName ?? 'User'} />
                <AvatarFallback>{user.displayName?.charAt(0).toUpperCase() ?? 'U'}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user.displayName}</p>
                <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
             <DropdownMenuItem asChild>
                <Link href="/ask-matthew">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  <span>Ask Matthew</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>App Settings</span>
                </Link>
              </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    return (
       <div className="flex items-center gap-2">
        <Button onClick={() => openAuthDialog()} variant="outline" size="sm">
          Signup
        </Button>
        <Button onClick={() => openAuthDialog()} size="sm">
          Login
        </Button>
      </div>
    );
  };

  return (
    <>
      <header 
        data-main-header="true"
        className="sticky top-0 z-40 w-full border-b bg-background transition-transform duration-300">
        <div className="container flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center space-x-2">
            <BookOpenText className="h-6 w-6 text-primary" />
            <span className="inline-block font-bold">Matthew AI</span>
          </Link>

          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  <span className="sr-only">Toggle theme</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setTheme('light')}>Light</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('dark')}>Dark</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('system')}>System</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Bible/Language Settings */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Settings className="h-5 w-5" />
                  <span className="sr-only">Open Settings</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuLabel>Language</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={language} onValueChange={(value) => setLanguage(value as Language)}>
                  <DropdownMenuRadioItem value="en">English</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="fr">French</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="zh">Chinese</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Bible Translation</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={bibleTranslation} onValueChange={(value) => setBibleTranslation(value as BibleTranslation)}>
                  <DropdownMenuRadioItem value="KJV">KJV</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="NIV">NIV</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="NRSV">NRSV</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="ESV">ESV</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Profile / Login */}
            <UserProfile />
          </div>
        </div>
      </header>
      <Dialog open={isAuthDialogOpen} onOpenChange={setIsAuthDialogOpen}>
          <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Account Access</DialogTitle>
                <DialogDescription>
                  Log in or create an account to save your progress.
                </DialogDescription>
              </DialogHeader>
              <AuthForm onAuthSuccess={() => setIsAuthDialogOpen(false)}/>
          </DialogContent>
      </Dialog>
    </>
  );
}
