import { useCallback, useEffect, useRef, useState } from 'react';

import {
   getCurrentUser,
   login as loginRequest,
   logout as logoutRequest,
   register as registerRequest,
} from '@/lib/auth-client';
import type { AppUser } from '@/types/user';

function toErrorMessage(error: unknown): string {
   if (error instanceof Error) {
      return error.message;
   }

   return 'Something went wrong. Please try again.';
}

type LoginInput = {
   email: string;
   password: string;
};

type RegisterInput = {
   email: string;
   password: string;
   name: string;
   dateOfBirth: string;
   phone: string;
};

export type AuthActionResult =
   | { success: true }
   | { success: false; error: string };

type UseAuthReturn = {
   user: AppUser | null;
   isLoading: boolean;
   isAuthenticating: boolean;
   error: string | null;
   login: (input: LoginInput) => Promise<AuthActionResult>;
   register: (input: RegisterInput) => Promise<AuthActionResult>;
   logout: () => Promise<void>;
   resetError: () => void;
};

export function useAuth(): UseAuthReturn {
   const [user, setUser] = useState<AppUser | null>(null);
   const [isLoading, setIsLoading] = useState(true);
   const [isAuthenticating, setIsAuthenticating] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const userRef = useRef<AppUser | null>(null);

   useEffect(() => {
      userRef.current = user;
   }, [user]);

   useEffect(() => {
      let mounted = true;

      (async () => {
         try {
            const currentUser = await getCurrentUser();

            if (mounted) {
               setUser(currentUser);
            }
         } catch (error) {
            if (mounted) {
               setError(toErrorMessage(error));
            }
         } finally {
            if (mounted) {
               setIsLoading(false);
            }
         }
      })();

      return () => {
         mounted = false;
      };
   }, []);

   useEffect(() => {
      if (typeof window === 'undefined') {
         return;
      }

      const handleUnauthorized = () => {
         if (!userRef.current) {
            setIsAuthenticating(false);
            return;
         }

         setError('Your session has expired. Please sign in again.');
         setUser(null);
         userRef.current = null;
         setIsAuthenticating(false);
      };

      window.addEventListener('auth:unauthorized', handleUnauthorized);

      return () => {
         window.removeEventListener('auth:unauthorized', handleUnauthorized);
      };
   }, []);

   const login = useCallback(
      async (input: LoginInput): Promise<AuthActionResult> => {
         setIsAuthenticating(true);
         setError(null);

         try {
            const nextUser = await loginRequest(input);
            setUser(nextUser);
            return { success: true };
         } catch (error) {
            const message = toErrorMessage(error);
            setError(message);
            return { success: false, error: message };
         } finally {
            setIsAuthenticating(false);
         }
      },
      []
   );

   const register = useCallback(
      async (input: RegisterInput): Promise<AuthActionResult> => {
         setIsAuthenticating(true);
         setError(null);

         try {
            const nextUser = await registerRequest(input);
            setUser(nextUser);
            return { success: true };
         } catch (error) {
            const message = toErrorMessage(error);
            setError(message);
            return { success: false, error: message };
         } finally {
            setIsAuthenticating(false);
         }
      },
      []
   );

   const logout = useCallback(async () => {
      try {
         await logoutRequest();
      } finally {
         setUser(null);
         setError(null);
      }
   }, []);

   const resetError = useCallback(() => {
      setError(null);
   }, []);

   return {
      user,
      isLoading,
      isAuthenticating,
      error,
      login,
      register,
      logout,
      resetError,
   };
}
