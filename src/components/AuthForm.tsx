
'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { FirebaseError } from 'firebase/app';
import type { ConfirmationResult } from 'firebase/auth';

import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';


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
    { name: 'Afghanistan', dial_code: '+93', code: 'AF' },
    { name: 'Albania', dial_code: '+355', code: 'AL' },
    { name: 'Algeria', dial_code: '+213', code: 'DZ' },
    { name: 'American Samoa', dial_code: '+1684', code: 'AS' },
    { name: 'Andorra', dial_code: '+376', code: 'AD' },
    { name: 'Angola', dial_code: '+244', code: 'AO' },
    { name: 'Anguilla', dial_code: '+1264', code: 'AI' },
    { name: 'Antigua and Barbuda', dial_code: '+1268', code: 'AG' },
    { name: 'Argentina', dial_code: '+54', code: 'AR' },
    { name: 'Armenia', dial_code: '+374', code: 'AM' },
    { name: 'Aruba', dial_code: '+297', code: 'AW' },
    { name: 'Australia', dial_code: '+61', code: 'AU' },
    { name: 'Austria', dial_code: '+43', code: 'AT' },
    { name: 'Azerbaijan', dial_code: '+994', code: 'AZ' },
    { name: 'Bahamas', dial_code: '+1242', code: 'BS' },
    { name: 'Bahrain', dial_code: '+973', code: 'BH' },
    { name: 'Bangladesh', dial_code: '+880', code: 'BD' },
    { name: 'Barbados', dial_code: '+1246', code: 'BB' },
    { name: 'Belarus', dial_code: '+375', code: 'BY' },
    { name: 'Belgium', dial_code: '+32', code: 'BE' },
    { name: 'Belize', dial_code: '+501', code: 'BZ' },
    { name: 'Benin', dial_code: '+229', code: 'BJ' },
    { name: 'Bermuda', dial_code: '+1441', code: 'BM' },
    { name: 'Bhutan', dial_code: '+975', code: 'BT' },
    { name: 'Bolivia', dial_code: '+591', code: 'BO' },
    { name: 'Bosnia and Herzegovina', dial_code: '+387', code: 'BA' },
    { name: 'Botswana', dial_code: '+267', code: 'BW' },
    { name: 'Brazil', dial_code: '+55', code: 'BR' },
    { name: 'British Indian Ocean Territory', dial_code: '+246', code: 'IO' },
    { name: 'Brunei Darussalam', dial_code: '+673', code: 'BN' },
    { name: 'Bulgaria', dial_code: '+359', code: 'BG' },
    { name: 'Burkina Faso', dial_code: '+226', code: 'BF' },
    { name: 'Burundi', dial_code: '+257', code: 'BI' },
    { name: 'Cambodia', dial_code: '+855', code: 'KH' },
    { name: 'Cameroon', dial_code: '+237', code: 'CM' },
    { name: 'Canada', dial_code: '+1', code: 'CA' },
    { name: 'Cape Verde', dial_code: '+238', code: 'CV' },
    { name: 'Cayman Islands', dial_code: '+345', code: 'KY' },
    { name: 'Central African Republic', dial_code: '+236', code: 'CF' },
    { name: 'Chad', dial_code: '+235', code: 'TD' },
    { name: 'Chile', dial_code: '+56', code: 'CL' },
    { name: 'China', dial_code: '+86', code: 'CN' },
    { name: 'Colombia', dial_code: '+57', code: 'CO' },
    { name: 'Comoros', dial_code: '+269', code: 'KM' },
    { name: 'Congo', dial_code: '+242', code: 'CG' },
    { name: 'Cook Islands', dial_code: '+682', code: 'CK' },
    { name: 'Costa Rica', dial_code: '+506', code: 'CR' },
    { name: 'Cote d\'Ivoire', dial_code: '+225', code: 'CI' },
    { name: 'Croatia', dial_code: '+385', code: 'HR' },
    { name: 'Cuba', dial_code: '+53', code: 'CU' },
    { name: 'Cyprus', dial_code: '+357', code: 'CY' },
    { name: 'Czech Republic', dial_code: '+420', code: 'CZ' },
    { name: 'Denmark', dial_code: '+45', code: 'DK' },
    { name: 'Djibouti', dial_code: '+253', code: 'DJ' },
    { name: 'Dominica', dial_code: '+1767', code: 'DM' },
    { name: 'Dominican Republic', dial_code: '+1849', code: 'DO' },
    { name: 'Ecuador', dial_code: '+593', code: 'EC' },
    { name: 'Egypt', dial_code: '+20', code: 'EG' },
    { name: 'El Salvador', dial_code: '+503', code: 'SV' },
    { name: 'Equatorial Guinea', dial_code: '+240', code: 'GQ' },
    { name: 'Eritrea', dial_code: '+291', code: 'ER' },
    { name: 'Estonia', dial_code: '+372', code: 'EE' },
    { name: 'Ethiopia', dial_code: '+251', code: 'ET' },
    { name: 'Falkland Islands (Malvinas)', dial_code: '+500', code: 'FK' },
    { name: 'Faroe Islands', dial_code: '+298', code: 'FO' },
    { name: 'Fiji', dial_code: '+679', code: 'FJ' },
    { name: 'Finland', dial_code: '+358', code: 'FI' },
    { name: 'France', dial_code: '+33', code: 'FR' },
    { name: 'French Guiana', dial_code: '+594', code: 'GF' },
    { name: 'French Polynesia', dial_code: '+689', code: 'PF' },
    { name: 'Gabon', dial_code: '+241', code: 'GA' },
    { name: 'Gambia', dial_code: '+220', code: 'GM' },
    { name: 'Georgia', dial_code: '+995', code: 'GE' },
    { name: 'Germany', dial_code: '+49', code: 'DE' },
    { name: 'Ghana', dial_code: '+233', code: 'GH' },
    { name: 'Gibraltar', dial_code: '+350', code: 'GI' },
    { name: 'Greece', dial_code: '+30', code: 'GR' },
    { name: 'Greenland', dial_code: '+299', code: 'GL' },
    { name: 'Grenada', dial_code: '+1473', code: 'GD' },
    { name: 'Guadeloupe', dial_code: '+590', code: 'GP' },
    { name: 'Guam', dial_code: '+1671', code: 'GU' },
    { name: 'Guatemala', dial_code: '+502', code: 'GT' },
    { name: 'Guinea', dial_code: '+224', code: 'GN' },
    { name: 'Guinea-Bissau', dial_code: '+245', code: 'GW' },
    { name: 'Guyana', dial_code: '+592', code: 'GY' },
    { name: 'Haiti', dial_code: '+509', code: 'HT' },
    { name: 'Honduras', dial_code: '+504', code: 'HN' },
    { name: 'Hong Kong', dial_code: '+852', code: 'HK' },
    { name: 'Hungary', dial_code: '+36', code: 'HU' },
    { name: 'Iceland', dial_code: '+354', code: 'IS' },
    { name: 'India', dial_code: '+91', code: 'IN' },
    { name: 'Indonesia', dial_code: '+62', code: 'ID' },
    { name: 'Iran', dial_code: '+98', code: 'IR' },
    { name: 'Iraq', dial_code: '+964', code: 'IQ' },
    { name: 'Ireland', dial_code: '+353', code: 'IE' },
    { name: 'Israel', dial_code: '+972', code: 'IL' },
    { name: 'Italy', dial_code: '+39', code: 'IT' },
    { name: 'Jamaica', dial_code: '+1876', code: 'JM' },
    { name: 'Japan', dial_code: '+81', code: 'JP' },
    { name: 'Jordan', dial_code: '+962', code: 'JO' },
    { name: 'Kazakhstan', dial_code: '+7', code: 'KZ' },
    { name: 'Kenya', dial_code: '+254', code: 'KE' },
    { name: 'Kiribati', dial_code: '+686', code: 'KI' },
    { name: 'Kuwait', dial_code: '+965', code: 'KW' },
    { name: 'Kyrgyzstan', dial_code: '+996', code: 'KG' },
    { name: 'Laos', dial_code: '+856', code: 'LA' },
    { name: 'Latvia', dial_code: '+371', code: 'LV' },
    { name: 'Lebanon', dial_code: '+961', code: 'LB' },
    { name: 'Lesotho', dial_code: '+266', code: 'LS' },
    { name: 'Liberia', dial_code: '+231', code: 'LR' },
    { name: 'Libya', dial_code: '+218', code: 'LY' },
    { name: 'Liechtenstein', dial_code: '+423', code: 'LI' },
    { name: 'Lithuania', dial_code: '+370', code: 'LT' },
    { name: 'Luxembourg', dial_code: '+352', code: 'LU' },
    { name: 'Macau', dial_code: '+853', code: 'MO' },
    { name: 'Macedonia', dial_code: '+389', code: 'MK' },
    { name: 'Madagascar', dial_code: '+261', code: 'MG' },
    { name: 'Malawi', dial_code: '+265', code: 'MW' },
    { name: 'Malaysia', dial_code: '+60', code: 'MY' },
    { name: 'Maldives', dial_code: '+960', code: 'MV' },
    { name: 'Mali', dial_code: '+223', code: 'ML' },
    { name: 'Malta', dial_code: '+356', code: 'MT' },
    { name: 'Marshall Islands', dial_code: '+692', code: 'MH' },
    { name: 'Martinique', dial_code: '+596', code: 'MQ' },
    { name: 'Mauritania', dial_code: '+222', code: 'MR' },
    { name: 'Mauritius', dial_code: '+230', code: 'MU' },
    { name: 'Mayotte', dial_code: '+262', code: 'YT' },
    { name: 'Mexico', dial_code: '+52', code: 'MX' },
    { name: 'Micronesia', dial_code: '+691', code: 'FM' },
    { name: 'Moldova', dial_code: '+373', code: 'MD' },
    { name: 'Monaco', dial_code: '+377', code: 'MC' },
    { name: 'Mongolia', dial_code: '+976', code: 'MN' },
    { name: 'Montenegro', dial_code: '+382', code: 'ME' },
    { name: 'Montserrat', dial_code: '+1664', code: 'MS' },
    { name: 'Morocco', dial_code: '+212', code: 'MA' },
    { name: 'Mozambique', dial_code: '+258', code: 'MZ' },
    { name: 'Myanmar', dial_code: '+95', code: 'MM' },
    { name: 'Namibia', dial_code: '+264', code: 'NA' },
    { name: 'Nauru', dial_code: '+674', code: 'NR' },
    { name: 'Nepal', dial_code: '+977', code: 'NP' },
    { name: 'Netherlands', dial_code: '+31', code: 'NL' },
    { name: 'New Caledonia', dial_code: '+687', code: 'NC' },
    { name: 'New Zealand', dial_code: '+64', code: 'NZ' },
    { name: 'Nicaragua', dial_code: '+505', code: 'NI' },
    { name: 'Niger', dial_code: '+227', code: 'NE' },
    { name: 'Nigeria', dial_code: '+234', code: 'NG' },
    { name: 'Niue', dial_code: '+683', code: 'NU' },
    { name: 'Norfolk Island', dial_code: '+672', code: 'NF' },
    { name: 'North Korea', dial_code: '+850', code: 'KP' },
    { name: 'Northern Mariana Islands', dial_code: '+1670', code: 'MP' },
    { name: 'Norway', dial_code: '+47', code: 'NO' },
    { name: 'Oman', dial_code: '+968', code: 'OM' },
    { name: 'Pakistan', dial_code: '+92', code: 'PK' },
    { name: 'Palau', dial_code: '+680', code: 'PW' },
    { name: 'Palestine', dial_code: '+970', code: 'PS' },
    { name: 'Panama', dial_code: '+507', code: 'PA' },
    { name: 'Papua New Guinea', dial_code: '+675', code: 'PG' },
    { name: 'Paraguay', dial_code: '+595', code: 'PY' },
    { name: 'Peru', dial_code: '+51', code: 'PE' },
    { name: 'Philippines', dial_code: '+63', code: 'PH' },
    { name: 'Poland', dial_code: '+48', code: 'PL' },
    { name: 'Portugal', dial_code: '+351', code: 'PT' },
    { name: 'Puerto Rico', dial_code: '+1939', code: 'PR' },
    { name: 'Qatar', dial_code: '+974', code: 'QA' },
    { name: 'Romania', dial_code: '+40', code: 'RO' },
    { name: 'Russia', dial_code: '+7', code: 'RU' },
    { name: 'Rwanda', dial_code: '+250', code: 'RW' },
    { name: 'Réunion', dial_code: '+262', code: 'RE' },
    { name: 'Samoa', dial_code: '+685', code: 'WS' },
    { name: 'San Marino', dial_code: '+378', code: 'SM' },
    { name: 'Sao Tome and Principe', dial_code: '+239', code: 'ST' },
    { name: 'Saudi Arabia', dial_code: '+966', code: 'SA' },
    { name: 'Senegal', dial_code: '+221', code: 'SN' },
    { name: 'Serbia', dial_code: '+381', code: 'RS' },
    { name: 'Seychelles', dial_code: '+248', code: 'SC' },
    { name: 'Sierra Leone', dial_code: '+232', code: 'SL' },
    { name: 'Singapore', dial_code: '+65', code: 'SG' },
    { name: 'Slovakia', dial_code: '+421', code: 'SK' },
    { name: 'Slovenia', dial_code: '+386', code: 'SI' },
    { name: 'Solomon Islands', dial_code: '+677', code: 'SB' },
    { name: 'Somalia', dial_code: '+252', code: 'SO' },
    { name: 'South Africa', dial_code: '+27', code: 'ZA' },
    { name: 'South Korea', dial_code: '+82', code: 'KR' },
    { name: 'Spain', dial_code: '+34', code: 'ES' },
    { name: 'Sri Lanka', dial_code: '+94', code: 'LK' },
    { name: 'Sudan', dial_code: '+249', code: 'SD' },
    { name: 'Suriname', dial_code: '+597', code: 'SR' },
    { name: 'Swaziland', dial_code: '+268', code: 'SZ' },
    { name: 'Sweden', dial_code: '+46', code: 'SE' },
    { name: 'Switzerland', dial_code: '+41', code: 'CH' },
    { name: 'Syrian Arab Republic', dial_code: '+963', code: 'SY' },
    { name: 'Taiwan', dial_code: '+886', code: 'TW' },
    { name: 'Tanzania', dial_code: '+255', code: 'TZ' },
    { name: 'Thailand', dial_code: '+66', code: 'TH' },
    { name: 'Timor-Leste', dial_code: '+670', code: 'TL' },
    { name: 'Togo', dial_code: '+228', code: 'TG' },
    { name: 'Tokelau', dial_code: '+690', code: 'TK' },
    { name: 'Tonga', dial_code: '+676', code: 'TO' },
    { name: 'Trinidad and Tobago', dial_code: '+1868', code: 'TT' },
    { name: 'Tunisia', dial_code: '+216', code: 'TN' },
    { name: 'Turkey', dial_code: '+90', code: 'TR' },
    { name: 'Turkmenistan', dial_code: '+993', code: 'TM' },
    { name: 'Tuvalu', dial_code: '+688', code: 'TV' },
    { name: 'Uganda', dial_code: '+256', code: 'UG' },
    { name: 'Ukraine', dial_code: '+380', code: 'UA' },
    { name: 'United Arab Emirates', dial_code: '+971', code: 'AE' },
    { name: 'United Kingdom', dial_code: '+44', code: 'GB' },
    { name: 'United States', dial_code: '+1', code: 'US' },
    { name: 'Uruguay', dial_code: '+598', code: 'UY' },
    { name: 'Uzbekistan', dial_code: '+998', code: 'UZ' },
    { name: 'Vanuatu', dial_code: '+678', code: 'VU' },
    { name: 'Venezuela', dial_code: '+58', code: 'VE' },
    { name: 'Vietnam', dial_code: '+84', code: 'VN' },
    { name: 'Yemen', dial_code: '+967', code: 'YE' },
    { name: 'Zambia', dial_code: '+260', code: 'ZM' },
    { name: 'Zimbabwe', dial_code: '+263', code: 'ZW' },
].sort((a, b) => a.name.localeCompare(b.name));


const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 48 48" {...props}><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C39.983,36.236,44,30.651,44,24C44,22.659,43.862,21.35,43.611,20.083z"/></svg>
);


export function AuthForm({ onAuthSuccess }: AuthFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  const [selectedCountryCode, setSelectedCountryCode] = useState('+254'); // Default to Kenya
  const [isCountryPopoverOpen, setIsCountryPopoverOpen] = useState(false);


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
    } else if (context === 'google' && firebaseError.code === 'auth/popup-closed-by-user') {
        description = 'The sign-in window was closed. Please try again.';
        // This is a less severe error, so we just inform the user without being too alarming.
        toast({ title: 'Sign-in Cancelled', description, variant: 'default' });
        return; // Early return to avoid the "Authentication Failed" title
    } else if (context === 'signup' && firebaseError.code === 'auth/email-already-in-use') {
        description = 'This email is already in use. Please try logging in.';
    } else if ((context === 'login' || context === 'signup') && firebaseError.code === 'auth/operation-not-allowed') {
        description = 'Email/Password sign-in is not enabled in Firebase.';
    } else if (context === 'login' && (firebaseError.code === 'auth/user-not-found' || firebaseError.code === 'auth/wrong-password' || firebaseError.code === 'auth/invalid-credential')) {
        description = 'Invalid email or password. Please try again.';
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
                                            <Popover open={isCountryPopoverOpen} onOpenChange={setIsCountryPopoverOpen}>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        role="combobox"
                                                        aria-expanded={isCountryPopoverOpen}
                                                        className="w-[180px] justify-between"
                                                    >
                                                        {selectedCountryCode
                                                            ? `${countries.find((c) => c.dial_code === selectedCountryCode)?.name} (${selectedCountryCode})`
                                                            : "Select country..."}
                                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[300px] p-0">
                                                    <Command>
                                                        <CommandInput placeholder="Search country..." />
                                                        <CommandList>
                                                            <CommandEmpty>No country found.</CommandEmpty>
                                                            <CommandGroup>
                                                                {countries.map((country) => (
                                                                    <CommandItem
                                                                        key={country.code}
                                                                        value={country.name}
                                                                        onSelect={() => {
                                                                            setSelectedCountryCode(country.dial_code);
                                                                            setIsCountryPopoverOpen(false);
                                                                        }}
                                                                    >
                                                                        <Check
                                                                            className={cn(
                                                                                "mr-2 h-4 w-4",
                                                                                selectedCountryCode === country.dial_code ? "opacity-100" : "opacity-0"
                                                                            )}
                                                                        />
                                                                        {country.name} ({country.dial_code})
                                                                    </CommandItem>
                                                                ))}
                                                            </CommandGroup>
                                                        </CommandList>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>
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
