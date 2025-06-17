
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
  lengthPreference: z.enum(['brief', 'medium'])
    .default('medium')
    .describe('The desired length of the teaching: brief (approx. 3 sentences), medium (approx. 1-3 paragraphs).'),
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
{{lengthInstruction}}
This teaching should offer clear spiritual revelation and practical insights related to the user's query.
Seamlessly integrate the essence of these verses into your message.

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

    let lengthInstructionText = "This teaching should be approximately 1-3 paragraphs.";
    if (input.lengthPreference === 'brief') {
      lengthInstructionText = "This teaching should be very concise, aiming for approximately three sentences.";
    }
    // TODO: Add translations for lengthInstructionText if needed, or pass to AI to handle

    const {output} = await teachingPrompt({
      query: input.query,
      verses: input.verses,
      lengthInstruction: lengthInstructionText,
      language: input.language,
      bibleTranslation: input.bibleTranslation,
    });
    return output!;
  }
);
