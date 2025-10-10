import { ChatRequestError, makeJsonRequest } from './chat-client';
import type { AppUser } from '@/types/user';

type UserDto = {
   id: string;
   email: string;
   name: string;
   dateOfBirth: string;
   phone: string;
   createdAt: string;
   updatedAt: string;
};

function parseUser(dto: UserDto): AppUser {
   return {
      id: dto.id,
      email: dto.email,
      name: dto.name,
      dateOfBirth: new Date(dto.dateOfBirth),
      phone: dto.phone,
      createdAt: new Date(dto.createdAt),
      updatedAt: new Date(dto.updatedAt),
   };
}

function extractErrorMessage(error: unknown): string {
   if (error instanceof ChatRequestError) {
      return error.message;
   }

   if (error instanceof Error) {
      return error.message;
   }

   return 'Something went wrong. Please try again.';
}

export async function getCurrentUser(): Promise<AppUser | null> {
   try {
      const data = await makeJsonRequest('/api/auth/me');

      if (!data || typeof data !== 'object' || !('user' in data)) {
         return null;
      }

      return parseUser(data.user as UserDto);
   } catch (error) {
      if (error instanceof ChatRequestError && error.status === 401) {
         return null;
      }

      throw error;
   }
}

export async function login(params: {
   email: string;
   password: string;
}): Promise<AppUser> {
   try {
      const data = await makeJsonRequest('/api/auth/login', {
         method: 'POST',
         headers: {
            'Content-Type': 'application/json',
         },
         body: JSON.stringify(params),
      });

      if (!data || typeof data !== 'object' || !('user' in data)) {
         throw new ChatRequestError('Unexpected response from login.');
      }

      return parseUser(data.user as UserDto);
   } catch (error) {
      if (error instanceof ChatRequestError) {
         throw error;
      }

      throw new ChatRequestError(extractErrorMessage(error));
   }
}

export async function register(params: {
   email: string;
   password: string;
   name: string;
   dateOfBirth: string;
   phone: string;
}): Promise<AppUser> {
   try {
      const data = await makeJsonRequest('/api/auth/register', {
         method: 'POST',
         headers: {
            'Content-Type': 'application/json',
         },
         body: JSON.stringify(params),
      });

      if (!data || typeof data !== 'object' || !('user' in data)) {
         throw new ChatRequestError('Unexpected response from registration.');
      }

      return parseUser(data.user as UserDto);
   } catch (error) {
      if (error instanceof ChatRequestError) {
         throw error;
      }

      throw new ChatRequestError(extractErrorMessage(error));
   }
}

export async function logout(): Promise<void> {
   try {
      await makeJsonRequest('/api/auth/logout', {
         method: 'POST',
      });
   } catch (error) {
      if (error instanceof ChatRequestError && error.status === 401) {
         return;
      }

      throw error;
   }
}

export async function updateProfile(params: {
   email: string;
   name: string;
   phone: string;
}): Promise<AppUser> {
   try {
      const data = await makeJsonRequest('/api/users/me', {
         method: 'PATCH',
         headers: {
            'Content-Type': 'application/json',
         },
         body: JSON.stringify(params),
      });

      if (!data || typeof data !== 'object' || !('user' in data)) {
         throw new ChatRequestError('Unexpected response from profile update.');
      }

      return parseUser(data.user as UserDto);
   } catch (error) {
      if (error instanceof ChatRequestError) {
         throw error;
      }

      throw new ChatRequestError(extractErrorMessage(error));
   }
}

export async function changePassword(params: {
   currentPassword: string;
   newPassword: string;
}): Promise<AppUser> {
   try {
      const data = await makeJsonRequest('/api/users/me/password', {
         method: 'PATCH',
         headers: {
            'Content-Type': 'application/json',
         },
         body: JSON.stringify(params),
      });

      if (!data || typeof data !== 'object' || !('user' in data)) {
         throw new ChatRequestError(
            'Unexpected response from password change.'
         );
      }

      return parseUser(data.user as UserDto);
   } catch (error) {
      if (error instanceof ChatRequestError) {
         throw error;
      }

      throw new ChatRequestError(extractErrorMessage(error));
   }
}
