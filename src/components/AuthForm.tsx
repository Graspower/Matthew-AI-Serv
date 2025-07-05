
'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { FirebaseError } from 'firebase/app';

const signupSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

const loginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

type SignupFormData = z.infer<typeof signupSchema>;
type LoginFormData = z.infer<typeof loginSchema>;

interface AuthFormProps {
    mode: 'login' | 'signup';
    onModeChange: (mode: 'login' | 'signup') => void;
    onAuthSuccess: () => void;
}

export function AuthForm({ mode, onModeChange, onAuthSuccess }: AuthFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { signUp, logIn } = useAuth();
  const { toast } = useToast();

  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const handleSignup = async (data: SignupFormData) => {
    setIsLoading(true);
    try {
      await signUp(data.name, data.email, data.password);
      toast({ title: 'Success!', description: 'Your account has been created.' });
      onAuthSuccess();
    } catch (error: any) {
        const firebaseError = error as FirebaseError;
        let description = 'An unexpected error occurred. Please try again.';
        if (firebaseError.code === 'auth/email-already-in-use') {
            description = 'This email is already in use. Please try logging in.';
        } else if (firebaseError.code === 'auth/operation-not-allowed') {
            description = 'Email/Password sign-up is not enabled. Please enable it in your Firebase console.';
        }
        toast({ title: 'Signup Failed', description, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      await logIn(data.email, data.password);
      toast({ title: 'Welcome back!' });
      onAuthSuccess();
    } catch (error: any) {
        const firebaseError = error as FirebaseError;
        let description = 'An unexpected error occurred. Please try again.';
        if (firebaseError.code === 'auth/user-not-found' || firebaseError.code === 'auth/wrong-password' || firebaseError.code === 'auth/invalid-credential') {
            description = 'Invalid email or password. Please try again.';
        } else if (firebaseError.code === 'auth/operation-not-allowed') {
            description = 'Email/Password sign-in is not enabled. Please enable it in your Firebase console.';
        }
        toast({ title: 'Login Failed', description, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Tabs value={mode} onValueChange={(val) => onModeChange(val as 'login' | 'signup')} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="login">Login</TabsTrigger>
        <TabsTrigger value="signup">Sign Up</TabsTrigger>
      </TabsList>
      <TabsContent value="login">
        <Form {...loginForm}>
          <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-6 pt-4">
            <FormField control={loginForm.control} name="email" render={({ field }) => ( <FormItem> <FormLabel>Email</FormLabel> <FormControl><Input placeholder="you@example.com" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
            <FormField control={loginForm.control} name="password" render={({ field }) => ( <FormItem> <FormLabel>Password</FormLabel> <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
            <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Login
            </Button>
          </form>
        </Form>
      </TabsContent>
      <TabsContent value="signup">
        <Form {...signupForm}>
          <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-6 pt-4">
            <FormField control={signupForm.control} name="name" render={({ field }) => ( <FormItem> <FormLabel>Name</FormLabel> <FormControl><Input placeholder="Your Name" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
            <FormField control={signupForm.control} name="email" render={({ field }) => ( <FormItem> <FormLabel>Email</FormLabel> <FormControl><Input placeholder="you@example.com" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
            <FormField control={signupForm.control} name="password" render={({ field }) => ( <FormItem> <FormLabel>Password</FormLabel> <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
            <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Account
            </Button>
          </form>
        </Form>
      </TabsContent>
    </Tabs>
  );
}
