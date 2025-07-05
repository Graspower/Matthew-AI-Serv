
'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { FirebaseError } from 'firebase/app';
import type { ConfirmationResult } from 'firebase/auth';

import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


const signupSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

const loginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

const phoneSchema = z.object({
  phone: z.string().regex(/^\d{7,15}$/, { message: 'Please enter a valid phone number (digits only).' }),
});

const otpSchema = z.object({
  otp: z.string().min(6, { message: 'OTP must be 6 characters.' }),
});

type SignupFormData = z.infer<typeof signupSchema>;
type LoginFormData = z.infer<typeof loginSchema>;
type PhoneFormData = z.infer<typeof phoneSchema>;
type OtpFormData = z.infer<typeof otpSchema>;

interface AuthFormProps {
    onAuthSuccess: () => void;
}

const countries = [
    { name: 'USA (+1)', dial_code: '+1' },
    { name: 'UK (+44)', dial_code: '+44' },
    { name: 'Nigeria (+234)', dial_code: '+234' },
    { name: 'India (+91)', dial_code: '+91' },
    { name: 'Canada (+1)', dial_code: '+1' },
    { name: 'Australia (+61)', dial_code: '+61' },
    { name: 'Germany (+49)', dial_code: '+49' },
    { name: 'Brazil (+55)', dial_code: '+55' },
    { name: 'Japan (+81)', dial_code: '+81' },
    { name: 'South Africa (+27)', dial_code: '+27' },
].sort((a, b) => a.name.localeCompare(b.name));


const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 48 48" {...props}><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C39.983,36.236,44,30.651,44,24C44,22.659,43.862,21.35,43.611,20.083z"/></svg>
);


export function AuthForm({ onAuthSuccess }: AuthFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  const [selectedCountryCode, setSelectedCountryCode] = useState('+1');

  const [phoneAuthState, setPhoneAuthState] = useState<{
    confirmationResult: ConfirmationResult | null;
    isOtpSent: boolean;
  }>({ confirmationResult: null, isOtpSent: false });
  
  const { signUp, logIn, signInWithGoogle, setUpRecaptcha } = useAuth();
  const { toast } = useToast();

  const signupForm = useForm<SignupFormData>({ resolver: zodResolver(signupSchema), defaultValues: { name: '', email: '', password: '' } });
  const loginForm = useForm<LoginFormData>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });
  const phoneForm = useForm<PhoneFormData>({ resolver: zodResolver(phoneSchema), defaultValues: { phone: '' } });
  const otpForm = useForm<OtpFormData>({ resolver: zodResolver(otpSchema), defaultValues: { otp: '' } });


  const handleAuthError = (error: any, context: string) => {
    const firebaseError = error as FirebaseError;
    let description = 'An unexpected error occurred. Please try again.';
    
    if (context === 'google' && firebaseError.code === 'auth/operation-not-allowed') {
        description = 'Google Sign-In is not enabled for this project. Please enable it in your Firebase console under Authentication > Sign-in method.';
    } else if (context === 'signup' && firebaseError.code === 'auth/email-already-in-use') {
        description = 'This email is already in use. Please try logging in.';
    } else if ((context === 'login' || context === 'signup') && firebaseError.code === 'auth/operation-not-allowed') {
        description = 'Email/Password sign-in is not enabled in Firebase.';
    } else if (context === 'login' && (firebaseError.code === 'auth/user-not-found' || firebaseError.code === 'auth/wrong-password' || firebaseError.code === 'auth/invalid-credential')) {
        description = 'Invalid email or password. Please try again.';
    } else if (context === 'google') {
        description = firebaseError.message;
    } else if (context === 'otp_send') {
        description = `Failed to send OTP: ${firebaseError.message}`;
    } else if (context === 'otp_verify') {
        description = 'The code is invalid or has expired.';
    }
    toast({ title: 'Authentication Failed', description, variant: 'destructive' });
  };

  const handleSignup = async (data: SignupFormData) => {
    setIsLoading(true);
    try {
      await signUp(data.name, data.email, data.password);
      toast({ title: 'Success!', description: 'Your account has been created.' });
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
      await logIn(data.email, data.password);
      toast({ title: 'Welcome back!' });
      onAuthSuccess();
    } catch (error) {
      handleAuthError(error, 'login');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
      toast({ title: 'Welcome!' });
      onAuthSuccess();
    } catch (error) {
        handleAuthError(error, 'google');
    } finally {
      setIsGoogleLoading(false);
    }
  };
  
  const handleSendOtp = async (data: PhoneFormData) => {
    setIsLoading(true);
    try {
      const formattedPhoneNumber = `${selectedCountryCode}${data.phone}`; 
      const confirmation = await setUpRecaptcha(formattedPhoneNumber);
      setPhoneAuthState({ confirmationResult: confirmation, isOtpSent: true });
      toast({ title: 'OTP Sent!', description: 'Please check your phone for the code.' });
    } catch (error) {
      handleAuthError(error, 'otp_send');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (data: OtpFormData) => {
    if (!phoneAuthState.confirmationResult) return;
    setIsLoading(true);
    try {
      await phoneAuthState.confirmationResult.confirm(data.otp);
      toast({ title: 'Success!', description: 'You are now logged in.' });
      onAuthSuccess();
    } catch (error) {
      handleAuthError(error, 'otp_verify');
    } finally {
      setIsLoading(false);
    }
  };

  const anyLoading = isLoading || isGoogleLoading;

  return (
    <>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
                <TabsTrigger value="phone">Phone</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
                <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-6 pt-4">
                    <FormField control={loginForm.control} name="email" render={({ field }) => ( <FormItem> <FormLabel>Email</FormLabel> <FormControl><Input placeholder="you@example.com" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                    <FormField control={loginForm.control} name="password" render={({ field }) => ( <FormItem> <FormLabel>Password</FormLabel> <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                    <Button type="submit" className="w-full" disabled={anyLoading}> {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Login </Button>
                </form>
                </Form>
            </TabsContent>
            <TabsContent value="signup">
                <Form {...signupForm}>
                <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-6 pt-4">
                    <FormField control={signupForm.control} name="name" render={({ field }) => ( <FormItem> <FormLabel>Name</FormLabel> <FormControl><Input placeholder="Your Name" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                    <FormField control={signupForm.control} name="email" render={({ field }) => ( <FormItem> <FormLabel>Email</FormLabel> <FormControl><Input placeholder="you@example.com" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                    <FormField control={signupForm.control} name="password" render={({ field }) => ( <FormItem> <FormLabel>Password</FormLabel> <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                    <Button type="submit" className="w-full" disabled={anyLoading}> {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create Account </Button>
                </form>
                </Form>
            </TabsContent>
            <TabsContent value="phone">
                {!phoneAuthState.isOtpSent ? (
                    <Form {...phoneForm}>
                        <form onSubmit={phoneForm.handleSubmit(handleSendOtp)} className="space-y-6 pt-4">
                            <FormField control={phoneForm.control} name="phone" render={({ field }) => ( 
                                <FormItem> 
                                    <FormLabel>Phone Number</FormLabel>
                                    <FormControl>
                                        <div className="flex items-center gap-2">
                                            <Select value={selectedCountryCode} onValueChange={setSelectedCountryCode}>
                                                <SelectTrigger className="w-[140px]">
                                                    <SelectValue placeholder="Country" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {countries.map(c => <SelectItem key={c.dial_code + c.name} value={c.dial_code}>{c.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                            <Input placeholder="555 123 4567" {...field} />
                                        </div>
                                    </FormControl>
                                    <FormMessage /> 
                                </FormItem> 
                            )}/>
                            <div id="recaptcha-container"></div>
                            <Button type="submit" className="w-full" disabled={anyLoading}> {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Send OTP </Button>
                        </form>
                    </Form>
                ) : (
                    <Form {...otpForm}>
                        <form onSubmit={otpForm.handleSubmit(handleVerifyOtp)} className="space-y-6 pt-4">
                            <FormField control={otpForm.control} name="otp" render={({ field }) => ( 
                                <FormItem> 
                                    <FormLabel>Verification Code</FormLabel>
                                    <FormControl><Input placeholder="Enter 6-digit code" {...field} /></FormControl>
                                    <FormMessage /> 
                                </FormItem> 
                            )}/>
                            <Button type="submit" className="w-full" disabled={anyLoading}> {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Verify OTP </Button>
                        </form>
                    </Form>
                )}
            </TabsContent>
        </Tabs>

        <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
        </div>

        <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={anyLoading}>
            {isGoogleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon className="mr-2 h-5 w-5" />}
            Google
        </Button>
    </>
  );
}
