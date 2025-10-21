export type UserRole = 'user' | 'admin';

export type AppUser = {
   id: string;
   email: string;
   name: string;
   dateOfBirth: Date;
   phone: string;
   role: UserRole;
   isActive: boolean;
   createdAt: Date;
   updatedAt: Date;
};
