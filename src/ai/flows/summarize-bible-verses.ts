'use server';
/**
 * @fileOverview Summarizes a set of Bible verses to provide a concise message or theme.
 *
 * - summarizeBibleVerses - A function that summarizes Bible verses.
 * - SummarizeBibleVersesInput - The input type for the summarizeBibleVerses function.
 * - SummarizeBibleVersesOutput - The return type for the summarizeBibleVerses function.
 */

import {ai} from '@/ai/ai-instance';
import {Verse} from '@/services/bible';
import {z} from 'genkit';

const SummarizeBibleVersesInputSchema = z.object({
  verses: z.array(
    z.object({
      book: z.string().describe('The book of the Bible the verse is from.'),
      chapter: z.number().describe('The chapter of the Bible the verse is from.'),
      verse: z.number().describe('The verse number.'),
      text: z.string().describe('The text of the verse.'),
    })
  ).describe('The Bible verses to summarize.'),
});

export type SummarizeBibleVersesInput = z.infer<typeof SummarizeBibleVersesInputSchema>;

const SummarizeBibleVersesOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the combined message or theme of the verses.'),
});

export type SummarizeBibleVersesOutput = z.infer<typeof SummarizeBibleVersesOutputSchema>;

export async function summarizeBibleVerses(input: SummarizeBibleVersesInput): Promise<SummarizeBibleVersesOutput> {
  return summarizeBibleVersesFlow(input);
}

const summarizeBibleVersesPrompt = ai.definePrompt({
  name: 'summarizeBibleVersesPrompt',
  input: {
    schema: z.object({
      verses: z.array(
        z.object({
          book: z.string().describe('The book of the Bible the verse is from.'),
          chapter: z.number().describe('The chapter of the Bible the verse is from.'),
          verse: z.number().describe('The verse number.'),
          text: z.string().describe('The text of the verse.'),
        })
      ).describe('The Bible verses to summarize.'),
    }),
  },
  output: {
    schema: z.object({
      summary: z.string().describe('A concise summary of the combined message or theme of the verses.'),
    }),
  },
  prompt: `You are a theologian summarizing Bible verses to find a common theme.

  Summarize the following verses into a concise message or theme:

  {{#each verses}}
  {{book}} {{chapter}}:{{verse}} - {{text}}
  {{/each}}`,
});

const summarizeBibleVersesFlow = ai.defineFlow<
  typeof SummarizeBibleVersesInputSchema,
  typeof SummarizeBibleVersesOutputSchema
>(
  {
    name: 'summarizeBibleVersesFlow',
    inputSchema: SummarizeBibleVersesInputSchema,
    outputSchema: SummarizeBibleVersesOutputSchema,
  },
  async input => {
    const {output} = await summarizeBibleVersesPrompt(input);
    return output!;
  }
);
