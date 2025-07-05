
'use server';
/**
 * @fileOverview Generates a teaching or sermonette based on a user's query and relevant Bible verses, considering language and translation.
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
      text: z.string().describe('The text of the verse (expected to be from the selected translation).'),
    })
  ).describe('A list of relevant Bible verses related to the query.'),
  lengthPreference: z.enum(['brief', 'detailed'])
    .default('detailed')
    .describe('The desired length of the teaching: brief (intro and sentences, ~80 tokens), detailed (single paragraph, ~100-112 tokens).'),
  language: z.string().default('en').describe("The language for the teaching (e.g., 'en', 'fr', 'zh')."),
  bibleTranslation: z.string().default('KJV').describe("The Bible translation the provided verses are based on (e.g., 'KJV', 'NIV')."),
});
export type GenerateTeachingInput = z.infer<typeof GenerateTeachingInputSchema>;

const GenerateTeachingOutputSchema = z.object({
  teaching: z.string().describe('A concise, engaging, and uplifting teaching in the specified language, that provides clear spiritual revelation and practical insights related to the user query, seamlessly integrating the essence of the provided verses (from the specified translation), and adhering to the requested length.'),
});
export type GenerateTeachingOutput = z.infer<typeof GenerateTeachingOutputSchema>;

export async function generateTeaching(input: GenerateTeachingInput): Promise<GenerateTeachingOutput> {
  return generateTeachingFlow(input);
}

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
  lengthInstruction: z.string(),
  language: z.string(),
  bibleTranslation: z.string(),
});


const teachingPrompt = ai.definePrompt({
  name: 'generateTeachingPrompt',
  input: {schema: TeachingPromptInputSchema},
  output: {schema: GenerateTeachingOutputSchema},
  prompt: `You are an insightful Bible teacher, skilled at making scripture come alive. The user is exploring the topic: '{{query}}'.
Based on this topic and the following relevant Bible verses you've identified (which are from the **{{bibleTranslation}}** translation), please craft an engaging and uplifting teaching in **{{language}}**.

This teaching should be concise, offer clear spiritual revelation, and provide practical insights related to the user's query. Seamlessly integrate the essence of these verses into your message.

Follow these length and format instructions precisely:
{{lengthInstruction}}

User's Query/Topic: '{{query}}'
Language for Teaching: {{language}}
Bible Translation of Verses: {{bibleTranslation}}

Relevant Verses:
{{#each verses}}
- {{book}} {{chapter}}:{{verse}}: "{{text}}"
{{/each}}

Your Teaching (in {{language}}):`,
});

const generateTeachingFlow = ai.defineFlow(
  {
    name: 'generateTeachingFlow',
    inputSchema: GenerateTeachingInputSchema,
    outputSchema: GenerateTeachingOutputSchema,
  },
  async (input) => {
    if (!input.verses || input.verses.length === 0) {
      let noVerseMessage = "No specific verses were found for this query to base a teaching on. Please try a different search.";
      if (input.language === 'fr') noVerseMessage = "Aucun verset spécifique n'a été trouvé pour cette requête pour baser un enseignement. Veuillez essayer une autre recherche.";
      if (input.language === 'zh') noVerseMessage = "未能找到与此查询相关的特定经文作为教导的基础。请尝试其他搜索。";
      return { teaching: noVerseMessage };
    }

    let lengthInstructionText = "The teaching should be a single, insightful, medium-length paragraph. The total length should be between 100 and 112 tokens.";
    if (input.lengthPreference === 'brief') {
      lengthInstructionText = "The teaching should be very concise, consisting of a short introductory paragraph followed by a bulleted or numbered list of key sentences. The total response should be approximately 80 tokens.";
    }
    
    try {
      const {output} = await teachingPrompt({
        query: input.query,
        verses: input.verses,
        lengthInstruction: lengthInstructionText,
        language: input.language,
        bibleTranslation: input.bibleTranslation,
      });
      return output!;
    } catch (error: any) {
        console.error(`Error in generateTeachingFlow for query "${input.query}":`, error);
        if (error.message && (error.message.includes('429') || error.message.includes('Too Many Requests'))) {
            throw new Error("You have exceeded your daily limit for AI requests. The quota typically resets daily. Please try again tomorrow or upgrade your Google AI plan.");
        }
        // Re-throw other errors
        throw new Error(`An unexpected AI error occurred: ${error.message}`);
    }
  }
);
