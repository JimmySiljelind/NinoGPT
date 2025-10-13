import OpenAI from 'openai';

const client = new OpenAI({
   apiKey: process.env.OPENAI_API_KEY,
});

const IMAGE_MODEL = 'gpt-image-1';
const DEFAULT_SIZE = '1024x1024';

type ImageGenerationResult = {
   base64: string;
   revisedPrompt: string | null;
};

export const imageService = {
   async generateImage(prompt: string): Promise<ImageGenerationResult> {
      const response = await client.images.generate({
         model: IMAGE_MODEL,
         prompt,
         size: DEFAULT_SIZE,
         n: 1,
      });

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
   },
};
