
'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { FirebaseError } from 'firebase/app';

import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';


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
    onAuthSuccess: () => void;
}

export function AuthForm({ onAuthSuccess }: AuthFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  
  const { signUp, logIn } = useAuth();
  const { toast } = useToast();

  const signupForm = useForm<SignupFormData>({ resolver: zodResolver(signupSchema), defaultValues: { name: '', email: '', password: '' } });
  const loginForm = useForm<LoginFormData>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });

  const handleAuthError = (error: any, context: string) => {
    const firebaseError = error as FirebaseError;
    let description = 'An unexpected error occurred. Please try again.';
    
    if (context === 'signup' && firebaseError.code === 'auth/email-already-in-use') {
        description = 'This email is already in use. Please try logging in.';
    } else if ((context === 'login' || context === 'signup') && firebaseError.code === 'auth/operation-not-allowed') {
        description = 'Email/Password sign-in is not enabled in Firebase.';
    } else if (context === 'login' && (firebaseError.code === 'auth/user-not-found' || firebaseError.code === 'auth/wrong-password' || firebaseError.code === 'auth/invalid-credential')) {
        description = 'Invalid email or password. Please try again.';
    }
    toast({ title: 'Authentication Failed', description, variant: 'destructive' });
  };

  const handleSignup = async (data: SignupFormData) => {
    setIsLoading(true);
    try {
      await signUp(data.name, data.email, data.password);
      toast({ title: `Welcome, ${data.name}!`, description: 'Your account has been created.' });
      onAuthSuccess();
    } catch (error) {
      handleAuthError(error, 'signup');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const userCredential = await logIn(data.email, data.password);
      toast({ title: `Welcome back, ${userCredential.user.displayName || 'friend'}!` });
      onAuthSuccess();
    } catch (error) {
      handleAuthError(error, 'login');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
                <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-6 pt-4">
                    <FormField control={loginForm.control} name="email" render={({ field }) => ( <FormItem> <FormLabel>Email</FormLabel> <FormControl><Input placeholder="you@example.com" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                    <FormField control={loginForm.control} name="password" render={({ field }) => ( <FormItem> <FormLabel>Password</FormLabel> <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                    <Button type="submit" className="w-full" disabled={isLoading}> {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Login </Button>
                </form>
                </Form>
            </TabsContent>
            <TabsContent value="signup">
                <Form {...signupForm}>
                <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-6 pt-4">
                    <FormField control={signupForm.control} name="name" render={({ field }) => ( <FormItem> <FormLabel>Name</FormLabel> <FormControl><Input placeholder="Your Name" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                    <FormField control={signupForm.control} name="email" render={({ field }) => ( <FormItem> <FormLabel>Email</FormLabel> <FormControl><Input placeholder="you@example.com" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                    <FormField control={signupForm.control} name="password" render={({ field }) => ( <FormItem> <FormLabel>Password</FormLabel> <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                    <Button type="submit" className="w-full" disabled={isLoading}> {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create Account </Button>
                </form>
                </Form>
            </TabsContent>
        </Tabs>
    </>
  );
}
