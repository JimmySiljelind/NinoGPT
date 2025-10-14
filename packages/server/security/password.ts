import bcrypt from 'bcryptjs';

export const PASSWORD_BCRYPT_COST = 12;
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 72; // bcrypt truncates beyond 72 chars.

const UPPERCASE_REGEX = /[A-Z]/;
const SPECIAL_CHAR_REGEX = /[^A-Za-z0-9]/;

export class PasswordPolicyError extends Error {
   constructor(message: string) {
      super(message);
      this.name = 'PasswordPolicyError';
   }
}

export function normalizePassword(input: unknown): string {
   if (typeof input !== 'string') {
      throw new PasswordPolicyError('Password must be a string.');
   }

   const trimmed = input.trim();

   if (!trimmed) {
      throw new PasswordPolicyError('Password cannot be empty.');
   }

   if (trimmed.length < PASSWORD_MIN_LENGTH) {
      throw new PasswordPolicyError(
         `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`
      );
   }

   if (trimmed.length > PASSWORD_MAX_LENGTH) {
      throw new PasswordPolicyError('Password is too long.');
   }

   if (!UPPERCASE_REGEX.test(trimmed)) {
      throw new PasswordPolicyError(
         'Password must include at least one uppercase letter.'
      );
   }

   if (!SPECIAL_CHAR_REGEX.test(trimmed)) {
      throw new PasswordPolicyError(
         'Password must include at least one special character.'
      );
   }

   return trimmed;
}

export function hashPassword(input: unknown): string {
   const normalized = normalizePassword(input);
   return bcrypt.hashSync(normalized, PASSWORD_BCRYPT_COST);
}

export function verifyPassword(input: unknown, hash: string): boolean {
   if (typeof hash !== 'string' || !hash) {
      return false;
   }

   try {
      const normalized =
         typeof input === 'string' && input
            ? input.trim().slice(0, PASSWORD_MAX_LENGTH)
            : '';

      if (!normalized) {
         return false;
      }

      return bcrypt.compareSync(normalized, hash);
   } catch {
      // Treat malformed inputs as non-matching to avoid leaking details.
      return false;
   }
}
