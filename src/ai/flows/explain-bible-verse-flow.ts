'use server';
/**
 * @fileOverview Explains a given Bible verse using AI.
 *
 * - explainBibleVerse - A function that provides an explanation for a Bible verse.
 * - ExplainBibleVerseInput - The input type for the explainBibleVerse function.
 * - ExplainBibleVerseOutput - The return type for the explainBibleVerse function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';
import type {Verse} from '@/services/bible';

const ExplainBibleVerseInputSchema = z.object({
  verse: z.object({
    book: z.string().describe('The book of the Bible the verse is from.'),
    chapter: z.number().describe('The chapter of the Bible the verse is from.'),
    verse: z.number().describe('The verse number.'),
    text: z.string().describe('The text of the verse.'),
  }),
});
export type ExplainBibleVerseInput = z.infer<typeof ExplainBibleVerseInputSchema>;

const ExplainBibleVerseOutputSchema = z.object({
  explanation: z.string().describe('A comprehensive yet accessible explanation of the Bible verse, covering its meaning, context, and spiritual revelation.'),
});
export type ExplainBibleVerseOutput = z.infer<typeof ExplainBibleVerseOutputSchema>;

export async function explainBibleVerse(input: ExplainBibleVerseInput): Promise<ExplainBibleVerseOutput> {
  return explainBibleVerseFlow(input);
}

const explainVersePrompt = ai.definePrompt({
  name: 'explainBibleVersePrompt',
  input: {schema: ExplainBibleVerseInputSchema},
  output: {schema: ExplainBibleVerseOutputSchema},
  prompt: `You are a theological scholar providing insights into Bible verses. Explain the meaning, context, and spiritual revelation of the following verse:

{{verse.book}} {{verse.chapter}}:{{verse.verse}} - {{verse.text}}

Provide a comprehensive yet accessible explanation. Focus on clarity and depth.`,
});

const explainBibleVerseFlow = ai.defineFlow<
  typeof ExplainBibleVerseInputSchema,
  typeof ExplainBibleVerseOutputSchema
>(
  {
    name: 'explainBibleVerseFlow',
    inputSchema: ExplainBibleVerseInputSchema,
    outputSchema: ExplainBibleVerseOutputSchema,
  },
  async (input) => {
    const {output} = await explainVersePrompt(input);
    return output!;
  }
);
