import { z } from 'zod';

const EnvSchema = z.object({
   NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
   PORT: z
      .string()
      .optional()
      .transform((value) => {
         if (!value) {
            return 3000;
         }

         const parsed = Number.parseInt(value, 10);

         if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 65535) {
            throw new Error('PORT must be a number between 1 and 65535.');
         }

         return parsed;
      }),
   CLIENT_ORIGIN: z.string().trim().optional(),
   OPENAI_API_KEY: z.string().trim().optional(),
   OPENAI_REQUEST_TIMEOUT_MS: z
      .string()
      .optional()
      .transform((value) => {
         if (!value) {
            return 150000;
         }

         const parsed = Number.parseInt(value, 10);

         if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 60000) {
            throw new Error(
               'OPENAI_REQUEST_TIMEOUT_MS must be between 1 and 60000 milliseconds.'
            );
         }

         return parsed;
      }),
   REQUEST_BODY_LIMIT: z.string().trim().optional(),
   JWT_SECRET: z.string().trim().optional(),
   TRUST_PROXY: z.string().trim().optional(),
});

const parsed = EnvSchema.parse(process.env);

function resolveCorsOrigins(
   value: string | undefined,
   isProduction: boolean
): string[] | true {
   if (!value) {
      if (isProduction) {
         throw new Error(
            'CLIENT_ORIGIN must be configured in production to avoid open CORS.'
         );
      }

      return true;
   }

   const rawEntries = value.split(',').map((entry) => entry.trim());

   if (rawEntries.length === 0) {
      if (isProduction) {
         throw new Error('CLIENT_ORIGIN must include at least one origin.');
      }

      return true;
   }

   if (rawEntries.includes('*')) {
      if (isProduction) {
         throw new Error(
            'CLIENT_ORIGIN cannot be "*" in production due to wildcard CORS.'
         );
      }

      return true;
   }

   const origins: string[] = [];

   for (const entry of rawEntries) {
      if (!entry) {
         continue;
      }

      try {
         const url = new URL(entry);
         origins.push(url.origin);
      } catch (error) {
         throw new Error(
            `CLIENT_ORIGIN has an invalid URL: "${entry}" (${
               error instanceof Error ? error.message : 'unknown error'
            }).`
         );
      }
   }

   if (origins.length === 0) {
      if (isProduction) {
         throw new Error(
            'CLIENT_ORIGIN must resolve to at least one valid URL in production.'
         );
      }

      return true;
   }

   return origins;
}

function resolveTrustProxy(value: string | undefined) {
   if (!value) {
      return false;
   }

   const normalized = value.toLowerCase();
   return normalized === '1' || normalized === 'true';
}

const nodeEnv = parsed.NODE_ENV;
const isProduction = nodeEnv === 'production';

export const env = {
   nodeEnv,
   isProduction,
   port: parsed.PORT,
   corsOrigins: resolveCorsOrigins(parsed.CLIENT_ORIGIN, isProduction),
   requestBodyLimit: parsed.REQUEST_BODY_LIMIT ?? '512kb',
   openAiApiKey: parsed.OPENAI_API_KEY,
   openAiRequestTimeoutMs: parsed.OPENAI_REQUEST_TIMEOUT_MS,
   jwtSecret: parsed.JWT_SECRET,
   trustProxy: resolveTrustProxy(parsed.TRUST_PROXY),
};

export type EnvConfig = typeof env;
