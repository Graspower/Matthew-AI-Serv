'use server';
/**
 * @fileOverview Generates a spiritual explanation for a given Bible verse.
 *
 * - generateVerseExplanation - A function that provides a deeply spiritual explanation for a Bible verse.
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
  explanation: z.string().describe('A concise but impactful explanation (3-5 paragraphs) that ministers to the reader, glorifies God, and expresses adoration and thankfulness based on the verse.'),
});
export type GenerateVerseExplanationOutput = z.infer<typeof GenerateVerseExplanationOutputSchema>;

export async function generateVerseExplanation(input: GenerateVerseExplanationInput): Promise<GenerateVerseExplanationOutput> {
  return generateVerseExplanationFlow(input);
}

const explanationPrompt = ai.definePrompt({
  name: 'generateVerseExplanationPrompt',
  input: {schema: GenerateVerseExplanationInputSchema},
  output: {schema: GenerateVerseExplanationOutputSchema},
  prompt: `You are a profoundly wise and gentle spiritual guide. Your purpose is to illuminate the Word of God for the reader in a way that deeply ministers to their spirit.

Verse for explanation: {{verseReference}} - "{{verseText}}"

Please generate an explanation for this verse that is concise yet impactful (around 3-5 paragraphs). Your response must:
1.  **Minister to the reader:** Offer genuine encouragement and deep spiritual insight that they can apply to their life.
2.  **Glorify God:** Explicitly highlight God's magnificent attributes, His power, His nature, and His works as revealed in the verse.
3.  **Adore God:** Write with a tone of deep reverence, love, and awe for who God is.
4.  **Bless and Thank God:** Express thankfulness for His blessings, grace, and unfailing love, connecting these expressions of gratitude directly to the themes present in the verse.

Your writing should feel like a warm, personal, and divine impartation of wisdom, not a dry academic analysis. Focus on spiritual revelation and heartfelt connection.`,
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
