import { env } from '../config/env';
import { getOpenAiClient } from '../clients/openai';

const IMAGE_MODEL = 'gpt-image-1';
const DEFAULT_SIZE = '1024x1024';

type ImageGenerationResult = {
   base64: string;
   revisedPrompt: string | null;
};

export const imageService = {
   async generateImage(prompt: string): Promise<ImageGenerationResult> {
      const client = getOpenAiClient();
      const timeoutMs = env.openAiRequestTimeoutMs ?? 15000;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
         const response = await client.images.generate(
            {
               model: IMAGE_MODEL,
               prompt,
               size: DEFAULT_SIZE,
               n: 1,
            },
            { signal: controller.signal }
         );

         const image = response.data?.[0];

         if (!image || !image.b64_json) {
            throw new Error('Image generation failed.');
         }

         return {
            base64: image.b64_json,
            revisedPrompt:
               typeof image.revised_prompt === 'string'
                  ? image.revised_prompt
                  : null,
         };
      } catch (error) {
         if (controller.signal.aborted) {
            throw new Error('Image generation request timed out.');
         }

         throw error instanceof Error
            ? error
            : new Error('Image generation failed.');
      } finally {
         clearTimeout(timeout); // Prevent hanging timers on quick failures.
      }
   },
};
