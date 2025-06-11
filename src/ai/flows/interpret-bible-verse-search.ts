'use server';
/**
 * @fileOverview A Bible verse search interpretation AI agent.
 *
 * - interpretBibleVerseSearch - A function that interprets the search query and identifies relevant Bible verse references.
 * - InterpretBibleVerseSearchInput - The input type for the interpretBibleVerseSearch function.
 * - InterpretBibleVerseSearchOutput - The return type for the interpretBibleVerseSearch function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const InterpretBibleVerseSearchInputSchema = z.object({
  query: z.string().describe('The search query for Bible verses.'),
});
export type InterpretBibleVerseSearchInput = z.infer<
  typeof InterpretBibleVerseSearchInputSchema
>;

// Output schema updated to return only references, not text.
const InterpretBibleVerseSearchOutputSchema = z.object({
  verseReferences: z.array(
    z.object({
      book: z.string().describe('The book of the Bible the verse is from (e.g., Genesis, John).'),
      chapter: z.number().describe('The chapter number of the Bible verse.'),
      verse: z.number().describe('The verse number.'),
    })
  ).describe('The relevant Bible verse references found (book, chapter, verse).'),
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
  output: { // Output schema updated for the prompt
    schema: z.object({
      verseReferences: z.array(
        z.object({
          book: z.string().describe('The book of the Bible the verse is from (e.g., Genesis, John).'),
          chapter: z.number().describe('The chapter number of the Bible verse.'),
          verse: z.number().describe('The verse number.'),
        })
      ).describe('The relevant Bible verse references found (book, chapter, verse). Return up to 5 relevant references.'),
    }),
  },
  prompt: `You are a helpful AI assistant that helps users find relevant Bible verse references based on their search query.

  Based on the user's query, identify specific Bible verse references (book name, chapter number, and verse number) that are relevant to the query, even if the query does not exactly match the verse text.
  For book names, use the common English name (e.g., "Genesis", "Psalms", "John", "Revelation").
  Return up to 5 of the most relevant verse references.

  Query: {{{query}}}`,
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
    const {output} = await prompt(input);
    return output!; // The output now matches InterpretBibleVerseSearchOutputSchema
  }
);
