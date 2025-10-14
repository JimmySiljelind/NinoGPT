import OpenAI from 'openai';

import { env } from '../config/env';

let cachedClient: OpenAI | null = null;

export function getOpenAiClient(): OpenAI {
   if (cachedClient) {
      return cachedClient;
   }

   if (!env.openAiApiKey) {
      throw new Error('OpenAI API key is not configured.');
   }

   cachedClient = new OpenAI({
      apiKey: env.openAiApiKey,
   });

   return cachedClient;
}
