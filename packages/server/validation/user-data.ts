const MAX_TEXT_LENGTH = 256;
const MAX_PHONE_LENGTH = 32;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+$/;

export function ensureNonEmptyString(
   value: unknown,
   fieldName: string,
   maxLength = MAX_TEXT_LENGTH
): string {
   if (typeof value !== 'string') {
      throw new TypeError(`${fieldName} must be a string.`);
   }

   const trimmed = value.trim();

   if (!trimmed) {
      throw new Error(`${fieldName} cannot be empty.`);
   }

   if (trimmed.length > maxLength) {
      throw new Error(`${fieldName} is too long.`);
   }

   return trimmed;
}

export function normalizeEmail(emailInput: unknown): string {
   const email = ensureNonEmptyString(emailInput, 'email');

   if (!EMAIL_REGEX.test(email)) {
      throw new Error('Email address is invalid.');
   }

   return email.toLowerCase();
}

export function normalizeName(nameInput: unknown): string {
   return ensureNonEmptyString(nameInput, 'name');
}

export function normalizePhone(value: unknown): string {
   const phone = ensureNonEmptyString(value, 'phone', MAX_PHONE_LENGTH);
   const digits = phone.replace(/\D/g, '');

   if (digits.length < 10) {
      throw new Error('Phone number must include at least 10 digits.');
   }

   return phone;
}

export function normalizeDateOfBirth(value: unknown): Date {
   let date: Date | null = null;

   if (value instanceof Date) {
      date = value;
   } else if (typeof value === 'string' || typeof value === 'number') {
      date = new Date(value);
   }

   if (!date || Number.isNaN(date.getTime())) {
      throw new Error('dateOfBirth must be a valid date.');
   }

   const now = new Date();

   if (date > now) {
      throw new Error('dateOfBirth cannot be in the future.');
   }

   return date;
}
