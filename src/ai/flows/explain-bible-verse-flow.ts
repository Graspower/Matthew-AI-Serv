
'use server';
/**
 * @fileOverview Explains a given Bible verse using AI, considering language and translation.
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
    text: z.string().describe('The text of the verse (expected to be from the selected translation).'),
  }),
  language: z.string().default('en').describe("The language for the explanation (e.g., 'en', 'fr', 'zh')."),
  bibleTranslation: z.string().default('KJV').describe("The Bible translation of the provided verse (e.g., 'KJV', 'NIV')."),
});
export type ExplainBibleVerseInput = z.infer<typeof ExplainBibleVerseInputSchema>;

const ExplainBibleVerseOutputSchema = z.object({
  explanation: z.string().describe('A clear, engaging, and uplifting explanation of the Bible verse (1-3 paragraphs) in the specified language, focusing on its core message, practical insights, and spiritual revelation, considering the provided translation.'),
});
export type ExplainBibleVerseOutput = z.infer<typeof ExplainBibleVerseOutputSchema>;

export async function explainBibleVerse(input: ExplainBibleVerseInput): Promise<ExplainBibleVerseOutput> {
  return explainBibleVerseFlow(input);
}

const explainVersePrompt = ai.definePrompt({
  name: 'explainBibleVersePrompt',
  input: {schema: ExplainBibleVerseInputSchema},
  output: {schema: ExplainBibleVerseOutputSchema},
  prompt: `You are an insightful Bible teacher, skilled at making scripture come alive. Your goal is to provide a clear, engaging, and uplifting explanation of the following verse in **{{language}}**, focusing on its core message, practical insights, and spiritual revelation.
The verse is from the **{{bibleTranslation}}** translation.

Verse: {{verse.book}} {{verse.chapter}}:{{verse.verse}} ({{bibleTranslation}}) - "{{verse.text}}"

Please present this explanation in a concise manner (ideally one to three paragraphs) in **{{language}}**, making it easy for anyone to understand and connect with the verse's meaning. Emphasize the direct revelation and actionable takeaways from the verse.`,
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
