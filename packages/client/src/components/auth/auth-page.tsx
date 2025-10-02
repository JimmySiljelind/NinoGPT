import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { AuthActionResult } from '@/hooks/useAuth';

const PHONE_COUNTRY_OPTIONS = [
   { code: '+46', label: '+46' },
   { code: '+1', label: '+1' },
   { code: '+44', label: '+44' },
   { code: '+61', label: '+61' },
   { code: '+91', label: '+91' },
] as const;

type RegisterFormState = {
   name: string;
   email: string;
   password: string;
   dateOfBirth: string;
   phoneCountry: string;
   phone: string;
};

const INITIAL_REGISTER_STATE: RegisterFormState = {
   name: '',
   email: '',
   password: '',
   dateOfBirth: '',
   phoneCountry: PHONE_COUNTRY_OPTIONS[0].code,
   phone: '',
};

const INITIAL_LOGIN_STATE = {
   email: '',
   password: '',
};

type AuthPageProps = {
   onLogin: (input: {
      email: string;
      password: string;
   }) => Promise<AuthActionResult>;
   onRegister: (input: {
      name: string;
      email: string;
      password: string;
      dateOfBirth: string;
      phone: string;
   }) => Promise<AuthActionResult>;
   isSubmitting: boolean;
   error: string | null;
   resetError: () => void;
};

type AuthMode = 'login' | 'register';

export function AuthPage({
   onLogin,
   onRegister,
   isSubmitting,
   error,
   resetError,
}: AuthPageProps) {
   const [mode, setMode] = useState<AuthMode>('login');
   const [loginState, setLoginState] = useState(INITIAL_LOGIN_STATE);
   const [registerState, setRegisterState] = useState<RegisterFormState>(
      INITIAL_REGISTER_STATE
   );
   const [formError, setFormError] = useState<string | null>(null);

   const activeError = useMemo(() => formError ?? error, [formError, error]);

   const toggleMode = (nextMode: AuthMode) => {
      if (mode === nextMode) {
         return;
      }

      setMode(nextMode);
      setFormError(null);
      resetError();
   };

   const handleLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setFormError(null);

      const result = await onLogin({
         email: loginState.email.trim(),
         password: loginState.password,
      });

      if (!result.success) {
         setFormError(
            result.error ?? 'Unable to sign in with those credentials.'
         );
      }
   };

   const handleRegisterSubmit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setFormError(null);

      const trimmedName = registerState.name.trim();
      const trimmedEmail = registerState.email.trim();
      const digitsOnlyPhone = registerState.phone.replace(/[^0-9]/g, '');
      const password = registerState.password;

      if (!trimmedName) {
         setFormError('Please provide your name.');
         return;
      }

      if (!registerState.dateOfBirth) {
         setFormError('Date of birth is required.');
         return;
      }

      if (digitsOnlyPhone.length < 10) {
         setFormError('Phone number must include at least 10 digits.');
         return;
      }

      if (
         password.length < 8 ||
         !/[A-Z]/.test(password) ||
         !/[^A-Za-z0-9]/.test(password)
      ) {
         setFormError(
            'Password must be at least 8 characters long and include an uppercase letter and special character.'
         );
         return;
      }

      const result = await onRegister({
         name: trimmedName,
         email: trimmedEmail,
         password,
         dateOfBirth: registerState.dateOfBirth,
         phone: `${registerState.phoneCountry}${digitsOnlyPhone}`,
      });

      if (!result.success) {
         setFormError(
            result.error ??
               'We could not create your account. Please try again.'
         );
      }
   };

   const sharedClassName =
      'flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
   const selectClassName =
      'h-10 min-w-[120px] rounded-md border border-input bg-card/60 px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

   return (
      <div className="min-h-screen bg-background">
         <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center px-4 py-10">
            <div className="w-full max-w-md space-y-8 rounded-2xl border border-border/70 bg-card/80 p-8 shadow-xl backdrop-blur">
               <div className="space-y-2 text-center">
                  <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                     {mode === 'login' ? 'NinoGPT' : 'Create your account'}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                     {mode === 'login'
                        ? 'Sign in to access your conversations.'
                        : 'A few details so we can keep your work in sync.'}
                  </p>
               </div>
               <div className="flex items-center justify-center gap-2 rounded-full border border-border/60 bg-muted/40 p-1 text-sm font-medium">
                  <button
                     type="button"
                     onClick={() => toggleMode('login')}
                     className={`flex-1 rounded-full px-4 py-2 transition ${mode === 'login' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                     disabled={isSubmitting}
                  >
                     Sign in
                  </button>
                  <button
                     type="button"
                     onClick={() => toggleMode('register')}
                     className={`flex-1 rounded-full px-4 py-2 transition ${mode === 'register' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                     disabled={isSubmitting}
                  >
                     Register
                  </button>
               </div>
               {mode === 'login' ? (
                  <form className="space-y-5" onSubmit={handleLoginSubmit}>
                     <div className="space-y-2 text-left">
                        <label className="text-sm font-medium text-foreground">
                           Email address
                        </label>
                        <Input
                           type="email"
                           value={loginState.email}
                           onChange={(event) =>
                              setLoginState((prev) => ({
                                 ...prev,
                                 email: event.target.value,
                              }))
                           }
                           placeholder="you@example.com"
                           required
                           className={sharedClassName}
                           autoComplete="email"
                        />
                     </div>
                     <div className="space-y-2 text-left">
                        <label className="text-sm font-medium text-foreground">
                           Password
                        </label>
                        <Input
                           type="password"
                           value={loginState.password}
                           onChange={(event) =>
                              setLoginState((prev) => ({
                                 ...prev,
                                 password: event.target.value,
                              }))
                           }
                           placeholder="Enter your password"
                           required
                           className={sharedClassName}
                           autoComplete="current-password"
                        />
                     </div>
                     {activeError ? (
                        <p className="text-sm text-destructive">
                           {activeError}
                        </p>
                     ) : null}
                     <Button
                        type="submit"
                        className="w-full"
                        disabled={isSubmitting}
                     >
                        {isSubmitting ? 'Signing in...' : 'Sign in'}
                     </Button>
                  </form>
               ) : (
                  <form className="space-y-5" onSubmit={handleRegisterSubmit}>
                     <div className="space-y-4">
                        <div className="space-y-2 text-left">
                           <label className="text-sm font-medium text-foreground">
                              Name
                           </label>
                           <Input
                              value={registerState.name}
                              onChange={(event) =>
                                 setRegisterState((prev) => ({
                                    ...prev,
                                    name: event.target.value,
                                 }))
                              }
                              placeholder="Enter name"
                              required
                              className={sharedClassName}
                              autoComplete="name"
                           />
                        </div>

                        <div className="space-y-2 text-left">
                           <label className="text-sm font-medium text-foreground">
                              Phone number
                           </label>
                           <div className="flex flex-col gap-2 sm:flex-row">
                              <select
                                 value={registerState.phoneCountry}
                                 onChange={(event) =>
                                    setRegisterState((prev) => ({
                                       ...prev,
                                       phoneCountry: event.target.value,
                                    }))
                                 }
                                 className={selectClassName}
                                 aria-label="Select country code"
                              >
                                 {PHONE_COUNTRY_OPTIONS.map((option) => (
                                    <option
                                       key={option.code}
                                       value={option.code}
                                    >
                                       {option.label}
                                    </option>
                                 ))}
                              </select>
                              <Input
                                 value={registerState.phone}
                                 onChange={(event) =>
                                    setRegisterState((prev) => ({
                                       ...prev,
                                       phone: event.target.value,
                                    }))
                                 }
                                 placeholder="07XXXXXXXX"
                                 required
                                 className={`${sharedClassName} sm:flex-1`}
                                 autoComplete="tel-national"
                                 inputMode="tel"
                              />
                           </div>
                           <p className="text-xs text-muted-foreground">
                              Enter digits only; the selected country code is
                              added automatically.
                           </p>
                        </div>
                     </div>
                     <div className="space-y-2 text-left">
                        <label className="text-sm font-medium text-foreground">
                           Email address
                        </label>
                        <Input
                           type="email"
                           value={registerState.email}
                           onChange={(event) =>
                              setRegisterState((prev) => ({
                                 ...prev,
                                 email: event.target.value,
                              }))
                           }
                           placeholder="name@example.com"
                           required
                           className={sharedClassName}
                           autoComplete="email"
                        />
                     </div>
                     <div className="space-y-2 text-left">
                        <label className="text-sm font-medium text-foreground">
                           Password
                        </label>
                        <Input
                           type="password"
                           value={registerState.password}
                           onChange={(event) =>
                              setRegisterState((prev) => ({
                                 ...prev,
                                 password: event.target.value,
                              }))
                           }
                           placeholder="Create a secure password"
                           required
                           className={sharedClassName}
                           autoComplete="new-password"
                        />
                     </div>
                     <div className="space-y-2 text-left">
                        <label className="text-sm font-medium text-foreground">
                           Date of birth
                        </label>
                        <Input
                           type="date"
                           value={registerState.dateOfBirth}
                           onChange={(event) =>
                              setRegisterState((prev) => ({
                                 ...prev,
                                 dateOfBirth: event.target.value,
                              }))
                           }
                           required
                           className={`${sharedClassName}`}
                        />
                        <p className="text-xs text-muted-foreground">
                           This is used to confirm you meet the minimum age
                           requirement.
                        </p>
                     </div>
                     {activeError ? (
                        <p className="text-sm text-destructive">
                           {activeError}
                        </p>
                     ) : null}
                     <Button
                        type="submit"
                        className="w-full"
                        disabled={isSubmitting}
                     >
                        {isSubmitting
                           ? 'Creating account...'
                           : 'Create account'}
                     </Button>
                  </form>
               )}
            </div>
         </div>
      </div>
   );
}
