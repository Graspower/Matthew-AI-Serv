import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
// import {openai} from '@genkit-ai/openai';

export const ai = genkit({
  promptDir: './prompts',
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_GENAI_API_KEY,
    }),
    // openai({
    //   apiKey: process.env.OPENAI_API_KEY,
    // }),
  ],
  model: 'googleai/gemini-2.5-flash', // Default model for the app
});

