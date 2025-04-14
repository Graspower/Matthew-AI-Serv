// noinspection ES6ConvertVarToLetConst
'use server';
/**
 * @fileOverview A Bible verse search interpretation AI agent.
 *
 * - interpretBibleVerseSearch - A function that interprets the search query and finds relevant Bible verses.
 * - InterpretBibleVerseSearchInput - The input type for the interpretBibleVerseSearch function.
 * - InterpretBibleVerseSearchOutput - The return type for the interpretBibleVerseSearch function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';
import {searchVerses, Verse} from '@/services/bible';

const InterpretBibleVerseSearchInputSchema = z.object({
  query: z.string().describe('The search query for Bible verses.'),
});
export type InterpretBibleVerseSearchInput = z.infer<
  typeof InterpretBibleVerseSearchInputSchema
>;

const InterpretBibleVerseSearchOutputSchema = z.object({
  verses: z.array(
    z.object({
      book: z.string().describe('The book of the Bible the verse is from.'),
      chapter: z.number().describe('The chapter of the Bible the verse is from.'),
      verse: z.number().describe('The verse number.'),
      text: z.string().describe('The text of the verse.'),
    })
  ).describe('The relevant Bible verses found.'),
});
export type InterpretBibleVerseSearchOutput = z.infer<
  typeof InterpretBibleVerseSearchOutputSchema
>;

export async function interpretBibleVerseSearch(
  input: InterpretBibleVerseSearchInput
): Promise<InterpretBibleVerseSearchOutput> {
  return interpretBibleVerseSearchFlow(input);
}

const prompt = ai.definePrompt({
  name: 'interpretBibleVerseSearchPrompt',
  input: {
    schema: z.object({
      query: z.string().describe('The search query for Bible verses.'),
    }),
  },
  output: {
    schema: z.object({
      verses: z.array(
        z.object({
          book: z.string().describe('The book of the Bible the verse is from.'),
          chapter: z.number().describe('The chapter of the Bible the verse is from.'),
          verse: z.number().describe('The verse number.'),
          text: z.string().describe('The text of the verse.'),
        })
      ).describe('The relevant Bible verses found.'),
    }),
  },
  prompt: `You are a helpful AI assistant that helps users find relevant Bible verses based on their search query.

  Based on the user's query, find Bible verses that are relevant to the query, even if the query does not exactly match the verse text.

  Query: {{{query}}}

  Return the verses in the following format:
  {{#each verses}}
  Book: {{this.book}}
  Chapter: {{this.chapter}}
  Verse: {{this.verse}}
  Text: {{this.text}}
  {{/each}}`,
});

const interpretBibleVerseSearchFlow = ai.defineFlow<
  typeof InterpretBibleVerseSearchInputSchema,
  typeof InterpretBibleVerseSearchOutputSchema
>(
  {
    name: 'interpretBibleVerseSearchFlow',
    inputSchema: InterpretBibleVerseSearchInputSchema,
    outputSchema: InterpretBibleVerseSearchOutputSchema,
  },
  async input => {
    // Call the bible service to get relevant verses.
    const verses: Verse[] = await searchVerses(input.query);

    // Return the verses.
    return {verses: verses};
  }
);
