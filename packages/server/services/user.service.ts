import {
   userRepository,
   type UserRecord,
} from '../repositories/user.repository';
import { hashPassword, verifyPassword } from '../security/password';
import {
   normalizeEmail,
   normalizeName,
   normalizePhone,
} from '../validation/user-data';

export const userService = {
   updateProfile(params: {
      userId: string;
      email: string;
      name: string;
      phone: string;
   }): UserRecord {
      const email = normalizeEmail(params.email);
      const name = normalizeName(params.name);
      const phone = normalizePhone(params.phone);

      return userRepository.updateProfile(params.userId, {
         email,
         name,
         phone,
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
