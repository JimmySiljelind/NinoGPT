import database from '../database';

export type UserRecord = {
   id: string;
   email: string;
   passwordHash: string;
   name: string;
   dateOfBirth: Date;
   phone: string;
   createdAt: Date;
   updatedAt: Date;
};

type UserRow = {
   id: string;
   email: string;
   password_hash: string;
   name: string;
   date_of_birth: string;
   phone: string;
   created_at: string;
   updated_at: string;
};

const insertUserStmt = database.query<
   Record<string, never>,
   {
      $id: string;
      $email: string;
      $passwordHash: string;
      $name: string;
      $dateOfBirth: string;
      $phone: string;
      $createdAt: string;
      $updatedAt: string;
   }
>(
   `INSERT INTO users (id, email, password_hash, name, date_of_birth, phone, created_at, updated_at)
    VALUES ($id, $email, $passwordHash, $name, $dateOfBirth, $phone, $createdAt, $updatedAt)`
);

const selectUserByEmailStmt = database.query<UserRow, { $email: string }>(
   `SELECT id, email, password_hash, name, date_of_birth, phone, created_at, updated_at
    FROM users
    WHERE LOWER(email) = LOWER($email)`
);

const selectUserByIdStmt = database.query<UserRow, { $id: string }>(
   `SELECT id, email, password_hash, name, date_of_birth, phone, created_at, updated_at
    FROM users
    WHERE id = $id`
);

const updateUserTimestampStmt = database.query<
   Record<string, never>,
   { $id: string; $updatedAt: string }
>(
   `UPDATE users
    SET updated_at = $updatedAt
    WHERE id = $id`
);

const updateUserProfileStmt = database.query<
   Record<string, never>,
   {
      $id: string;
      $email: string;
      $name: string;
      $phone: string;
      $updatedAt: string;
   }
>(
   `UPDATE users
    SET email = $email,
        name = $name,
        phone = $phone,
        updated_at = $updatedAt
    WHERE id = $id`
);

const updateUserPasswordStmt = database.query<
   Record<string, never>,
   { $id: string; $passwordHash: string; $updatedAt: string }
>(
   `UPDATE users
    SET password_hash = $passwordHash,
        updated_at = $updatedAt
    WHERE id = $id`
);

function rowToUser(row: UserRow): UserRecord {
   return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      name: row.name,
      dateOfBirth: new Date(row.date_of_birth),
      phone: row.phone,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
   };
}

export const userRepository = {
   create(params: {
      id: string;
      email: string;
      passwordHash: string;
      name: string;
      dateOfBirth: Date;
      phone: string;
   }): UserRecord {
      const createdAt = new Date();

      insertUserStmt.run({
         $id: params.id,
         $email: params.email.trim().toLowerCase(),
         $passwordHash: params.passwordHash,
         $name: params.name.trim(),
         $dateOfBirth: params.dateOfBirth.toISOString(),
         $phone: params.phone.trim(),
         $createdAt: createdAt.toISOString(),
         $updatedAt: createdAt.toISOString(),
      });

      const created = selectUserByIdStmt.get({ $id: params.id }) as
         | UserRow
         | undefined
         | null;

      if (!created) {
         throw new Error('User could not be created.');
      }

      return rowToUser(created);
   },

   findByEmail(email: string): UserRecord | null {
      const row = selectUserByEmailStmt.get({ $email: email }) as
         | UserRow
         | undefined
         | null;

      if (!row) {
         return null;
      }

      return rowToUser(row);
   },

   findById(userId: string): UserRecord | null {
      const row = selectUserByIdStmt.get({ $id: userId }) as
         | UserRow
         | undefined
         | null;

      if (!row) {
         return null;
      }

      return rowToUser(row);
   },

   touch(userId: string): void {
      updateUserTimestampStmt.run({
         $id: userId,
         $updatedAt: new Date().toISOString(),
      });
   },

   updateProfile(
      userId: string,
      params: { email: string; name: string; phone: string }
   ): UserRecord {
      const existing = selectUserByIdStmt.get({ $id: userId }) as
         | UserRow
         | undefined
         | null;

      if (!existing) {
         throw new Error('User not found.');
      }

      const normalizedEmail = params.email.trim().toLowerCase();

      if (normalizedEmail !== existing.email.toLowerCase()) {
         const conflicting = selectUserByEmailStmt.get({
            $email: normalizedEmail,
         }) as UserRow | undefined | null;

         if (conflicting && conflicting.id !== userId) {
            throw new Error('Email is already registered.');
         }
      }

      const now = new Date().toISOString();

      updateUserProfileStmt.run({
         $id: userId,
         $email: normalizedEmail,
         $name: params.name.trim(),
         $phone: params.phone.trim(),
         $updatedAt: now,
      });

      const updated = selectUserByIdStmt.get({ $id: userId }) as
         | UserRow
         | undefined
         | null;

      if (!updated) {
         throw new Error('Failed to load user after update.');
      }

      return rowToUser(updated);
   },

   updatePassword(userId: string, passwordHash: string): UserRecord {
      const existing = selectUserByIdStmt.get({ $id: userId }) as
         | UserRow
         | undefined
         | null;

      if (!existing) {
         throw new Error('User not found.');
      }

      const now = new Date().toISOString();

      updateUserPasswordStmt.run({
         $id: userId,
         $passwordHash: passwordHash,
         $updatedAt: now,
      });

      const updated = selectUserByIdStmt.get({ $id: userId }) as
         | UserRow
         | undefined
         | null;

      if (!updated) {
         throw new Error('Failed to load user after password update.');
      }

      return rowToUser(updated);
   },
};
