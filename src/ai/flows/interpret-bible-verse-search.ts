
'use server';
/**
 * @fileOverview A Bible verse search interpretation AI agent.
 *
 * - interpretBibleVerseSearch - A function that interprets the search query and identifies relevant Bible verse references from a specific translation and in a given language.
 * - InterpretBibleVerseSearchInput - The input type for the interpretBibleVerseSearch function.
 * - InterpretBibleVerseSearchOutput - The return type for the interpretBibleVerseSearch function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const InterpretBibleVerseSearchInputSchema = z.object({
  query: z.string().describe('The search query for Bible verses.'),
  language: z.string().default('en').describe("The language context for the search and book names (e.g., 'en', 'fr', 'zh')."),
  bibleTranslation: z.string().default('KJV').describe("The Bible translation to search within (e.g., 'KJV', 'NIV')."),
});
export type InterpretBibleVerseSearchInput = z.infer<
  typeof InterpretBibleVerseSearchInputSchema
>;

const InterpretBibleVerseSearchOutputSchema = z.object({
  verseReferences: z.array(
    z.object({
      book: z.string().describe('The book of the Bible the verse is from (e.g., Genesis, John), ideally in the specified language if common.'),
      chapter: z.number().describe('The chapter number of the Bible verse.'),
      verse: z.number().describe('The verse number.'),
    })
  ).describe('The relevant Bible verse references found (book, chapter, verse) from the specified translation. Return up to 5 relevant references.'),
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
      language: z.string().describe("The language context for book names."),
      bibleTranslation: z.string().describe("The Bible translation to search within."),
    }),
  },
  output: { 
    schema: InterpretBibleVerseSearchOutputSchema, // Use the main output schema
  },
  prompt: `You are a helpful AI assistant that helps users find relevant Bible verse references based on their search query, from a specific Bible translation and in a given language context for book names.

  Based on the user's query: '{{{query}}}', identify specific Bible verse references (book name, chapter number, and verse number) from the **{{{bibleTranslation}}}** translation that are relevant to the query.
  Return book names using common names in the language '{{{language}}}' if possible (e.g., for 'en': "Genesis", "Psalms", "John"; for 'fr': "Genèse", "Psaumes", "Jean"). If a common translated book name isn't known, use the standard English name.
  Return up to 5 of the most relevant verse references from the {{{bibleTranslation}}}.

  Query: {{{query}}}
  Language for book names: {{{language}}}
  Bible Translation: {{{bibleTranslation}}}`,
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
    const {output} = await prompt(input); // Pass the full input including language and translation
    return output!;
  }
);
