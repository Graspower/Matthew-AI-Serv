'use server';
/**
 * @fileOverview Generates a spiritual message of adoration inspired by a given Bible verse.
 *
 * - generateVerseExplanation - A function that provides a deeply spiritual message inspired by a Bible verse.
 * - GenerateVerseExplanationInput - The input type for the generateVerseExplanation function.
 * - GenerateVerseExplanationOutput - The return type for the generateVerseExplanation function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const GenerateVerseExplanationInputSchema = z.object({
  verseReference: z.string().describe('The reference of the verse (e.g., "Psalm 103:1").'),
  verseText: z.string().describe('The full text of the Bible verse.'),
});
export type GenerateVerseExplanationInput = z.infer<typeof GenerateVerseExplanationInputSchema>;

const GenerateVerseExplanationOutputSchema = z.object({
  explanation: z.string().describe('A single, uplifting paragraph of encouragement and adoration that glorifies God, inspired by the provided verse.'),
});
export type GenerateVerseExplanationOutput = z.infer<typeof GenerateVerseExplanationOutputSchema>;

export async function generateVerseExplanation(input: GenerateVerseExplanationInput): Promise<GenerateVerseExplanationOutput> {
  return generateVerseExplanationFlow(input);
}

const explanationPrompt = ai.definePrompt({
  name: 'generateVerseExplanationPrompt',
  input: {schema: GenerateVerseExplanationInputSchema},
  output: {schema: GenerateVerseExplanationOutputSchema},
  prompt: `You are a warm and insightful spiritual guide. Your purpose is to write a single, uplifting paragraph of encouragement and adoration that glorifies God.

This message should be inspired by the truth and spirit of the following Bible verse, but it should NOT be a direct explanation of the verse. Instead, use the verse as a foundation to express thankfulness, bless God, and highlight His magnificent nature in a heartfelt, one-paragraph message that ministers to the reader's spirit and directs their heart towards praise.

Verse to draw inspiration from: {{verseReference}} - "{{verseText}}"`,
});

const generateVerseExplanationFlow = ai.defineFlow(
  {
    name: 'generateVerseExplanationFlow',
    inputSchema: GenerateVerseExplanationInputSchema,
    outputSchema: GenerateVerseExplanationOutputSchema,
  },
  async (input) => {
    const {output} = await explanationPrompt(input);
    if (!output) {
      throw new Error('The AI failed to generate a verse explanation.');
    }
    return output;
  }
);
