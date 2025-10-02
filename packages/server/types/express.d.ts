import type { UserRecord } from '../repositories/user.repository';

declare global {
   namespace Express {
      interface Request {
         user?: UserRecord | null;
      }
   }
}

export {};
