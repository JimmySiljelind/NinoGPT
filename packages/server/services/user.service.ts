import bcrypt from 'bcryptjs';

import {
   userRepository,
   type UserRecord,
} from '../repositories/user.repository';

const PASSWORD_SALT_ROUNDS = 12;

function hashPassword(password: string): string {
   const trimmed = password.trim();

   if (!trimmed) {
      throw new Error('Password cannot be empty.');
   }

   return bcrypt.hashSync(trimmed, PASSWORD_SALT_ROUNDS);
}

function verifyPassword(password: string, hash: string): boolean {
   if (!password) {
      return false;
   }

   return bcrypt.compareSync(password, hash);
}

function normalizeEmail(email: string): string {
   return email.trim().toLowerCase();
}

export const userService = {
   updateProfile(params: {
      userId: string;
      email: string;
      name: string;
      phone: string;
   }): UserRecord {
      const email = normalizeEmail(params.email);

      return userRepository.updateProfile(params.userId, {
         email,
         name: params.name,
         phone: params.phone,
      });
   },

   changePassword(params: {
      userId: string;
      currentPassword: string;
      newPassword: string;
   }): UserRecord {
      const user = userRepository.findById(params.userId);

      if (!user) {
         throw new Error('User not found.');
      }

      if (!verifyPassword(params.currentPassword, user.passwordHash)) {
         throw new Error('Current password is incorrect.');
      }

      const nextHash = hashPassword(params.newPassword);

      return userRepository.updatePassword(params.userId, nextHash);
   },
};
