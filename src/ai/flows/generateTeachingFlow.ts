
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
  lengthPreference: z.enum(['brief', 'medium', 'detailed'])
    .default('medium')
    .describe('The desired length of the teaching: brief (approx. 3 sentences), medium (approx. 1-3 paragraphs), detailed (approx. 3-5 paragraphs).')
});
export type GenerateTeachingInput = z.infer<typeof GenerateTeachingInputSchema>;

const GenerateTeachingOutputSchema = z.object({
  teaching: z.string().describe('A concise, engaging, and uplifting teaching that provides clear spiritual revelation and practical insights related to the user query, seamlessly integrating the essence of the provided verses, and adhering to the requested length.'),
});
export type GenerateTeachingOutput = z.infer<typeof GenerateTeachingOutputSchema>;

export async function generateTeaching(input: GenerateTeachingInput): Promise<GenerateTeachingOutput> {
  return generateTeachingFlow(input);
}

// Define a more specific input schema for the prompt itself
const TeachingPromptInputSchema = z.object({
  query: z.string(),
  verses: z.array(
    z.object({
      book: z.string(),
      chapter: z.number(),
      verse: z.number(),
      text: z.string(),
    })
  ),
  lengthInstruction: z.string(), // This will carry the dynamic instruction
});


const teachingPrompt = ai.definePrompt({
  name: 'generateTeachingPrompt',
  input: {schema: TeachingPromptInputSchema}, // Use the specific prompt input schema
  output: {schema: GenerateTeachingOutputSchema},
  prompt: `You are an insightful Bible teacher, skilled at making scripture come alive. The user is exploring the topic: '{{query}}'.
Based on this topic and the following relevant Bible verses you've identified, please craft an engaging and uplifting teaching.
{{lengthInstruction}}
This teaching should offer clear spiritual revelation and practical insights related to the user's query.
Seamlessly integrate the essence of these verses into your message.

User's Query/Topic: '{{query}}'

Relevant Verses:
{{#each verses}}
- {{book}} {{chapter}}:{{verse}}: "{{text}}"
{{/each}}

Your Teaching:`,
});

const generateTeachingFlow = ai.defineFlow(
  {
    name: 'generateTeachingFlow',
    inputSchema: GenerateTeachingInputSchema, // Flow input schema
    outputSchema: GenerateTeachingOutputSchema,
  },
  async (input) => {
    if (!input.verses || input.verses.length === 0) {
      return { teaching: "No specific verses were found for this query to base a teaching on. Please try a different search." };
    }

    let lengthInstructionText = "This teaching should be approximately 1-3 paragraphs."; // Default for medium
    if (input.lengthPreference === 'brief') {
      lengthInstructionText = "This teaching should be very concise, aiming for approximately three sentences.";
    } else if (input.lengthPreference === 'detailed') {
      lengthInstructionText = "This teaching should be more detailed, aiming for approximately 3-5 paragraphs.";
    }

    const {output} = await teachingPrompt({
      query: input.query,
      verses: input.verses,
      lengthInstruction: lengthInstructionText, // Pass the constructed instruction
    });
    return output!;
  }
);

