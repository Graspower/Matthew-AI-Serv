'use server';
/**
 * @fileOverview Generates a teaching or sermonette based on a user's query and relevant Bible verses.
 *
 * - generateTeaching - A function that crafts a teaching using AI.
 * - GenerateTeachingInput - The input type for the generateTeaching function.
 * - GenerateTeachingOutput - The return type for the generateTeaching function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';
import type {Verse} from '@/services/bible';

const GenerateTeachingInputSchema = z.object({
  query: z.string().describe("The user's original search query or topic of interest."),
  verses: z.array(
    z.object({
      book: z.string().describe('The book of the Bible the verse is from.'),
      chapter: z.number().describe('The chapter of the Bible the verse is from.'),
      verse: z.number().describe('The verse number.'),
      text: z.string().describe('The text of the verse.'),
    })
  ).describe('A list of relevant Bible verses related to the query.'),
});
export type GenerateTeachingInput = z.infer<typeof GenerateTeachingInputSchema>;

const GenerateTeachingOutputSchema = z.object({
  teaching: z.string().describe('A concise (1-3 paragraphs), engaging, and uplifting teaching that provides clear spiritual revelation and practical insights related to the user query, seamlessly integrating the essence of the provided verses.'),
});
export type GenerateTeachingOutput = z.infer<typeof GenerateTeachingOutputSchema>;

export async function generateTeaching(input: GenerateTeachingInput): Promise<GenerateTeachingOutput> {
  return generateTeachingFlow(input);
}

const teachingPrompt = ai.definePrompt({
  name: 'generateTeachingPrompt',
  input: {schema: GenerateTeachingInputSchema},
  output: {schema: GenerateTeachingOutputSchema},
  prompt: `You are an insightful Bible teacher, skilled at making scripture come alive. The user is exploring the topic: '{{query}}'.
Based on this topic and the following relevant Bible verses you've identified, please craft a concise, engaging, and uplifting teaching.
This teaching should be 1-3 paragraphs and offer clear spiritual revelation and practical insights related to the user's query.
Seamlessly integrate the essence of these verses into your message.

User's Query/Topic: '{{query}}'

Relevant Verses:
{{#each verses}}
- {{book}} {{chapter}}:{{verse}}: "{{text}}"
{{/each}}

Your Teaching:`,
});

const generateTeachingFlow = ai.defineFlow<
  typeof GenerateTeachingInputSchema,
  typeof GenerateTeachingOutputSchema
>(
  {
    name: 'generateTeachingFlow',
    inputSchema: GenerateTeachingInputSchema,
    outputSchema: GenerateTeachingOutputSchema,
  },
  async (input) => {
    // Ensure there are verses to teach from, otherwise, it might not make sense.
    if (!input.verses || input.verses.length === 0) {
      return { teaching: "No specific verses were found for this query to base a teaching on. Please try a different search." };
    }
    const {output} = await teachingPrompt(input);
    return output!;
  }
);
