
'use server';
/**
 * @fileOverview Generates an encouraging message based on God's word, focusing on a random spiritual topic and a specific Bible verse from the selected translation and in the selected language.
 *
 * - generateEncouragement - A function that crafts an encouraging message.
 * - GenerateEncouragementInput - The input type for the generateEncouragement function.
 * - GenerateEncouragementOutput - The return type for the generateEncouragement function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const spiritualTopics = [
  "Faith",
  "Love",
  "Prayer",
  "Giving",
  "God's plan for prosperity",
  "The Rapture",
  "Hope",
  "Forgiveness",
  "Grace",
  "Strength in God",
  "Peace",
  "Joy"
];

const GenerateEncouragementInputSchema = z.object({
  language: z.string().default('en').describe("The desired language for the encouragement message (e.g., 'en', 'fr', 'zh')."),
  bibleTranslation: z.string().default('KJV').describe("The desired Bible translation for the verse (e.g., 'KJV', 'NIV')."),
}).describe("Input for generating an encouraging message.");
export type GenerateEncouragementInput = z.infer<typeof GenerateEncouragementInputSchema>;

const GenerateEncouragementOutputSchema = z.object({
  message: z.string().describe("An uplifting and encouraging message (1-2 paragraphs) based on the selected Bible verse and topic, in the specified language."),
  topic: z.string().describe("The spiritual topic the message is focused on."),
  bibleVerseReference: z.string().describe("The Bible verse reference (e.g., John 3:16) from the specified translation, the encouragement is based on."),
  bibleVerseText: z.string().describe("The text of the Bible verse from the specified translation."),
});
export type GenerateEncouragementOutput = z.infer<typeof GenerateEncouragementOutputSchema>;

export async function generateEncouragement(input: GenerateEncouragementInput): Promise<GenerateEncouragementOutput> {
  return generateEncouragementFlow(input);
}

const encouragementPrompt = ai.definePrompt({
  name: 'generateEncouragementPrompt',
  input: { schema: z.object({ 
    selectedTopic: z.string(),
    language: z.string(),
    bibleTranslation: z.string(),
  }) },
  output: { schema: GenerateEncouragementOutputSchema },
  prompt: `You are a warm, insightful, and uplifting spiritual guide.
Your purpose is to provide an encouraging message rooted in God's word, in the language: **{{{language}}}**.

Please select a single, fitting Bible verse from the **{{{bibleTranslation}}}** translation related to the topic of: **{{{selectedTopic}}}**.

Then, craft an encouraging message in **{{{language}}}** that is:
- Positive and hopeful.
- Concise (ideally 1-2 short paragraphs).
- Directly explains or elaborates on the chosen Bible verse (from {{{bibleTranslation}}}) in an easy-to-understand and relatable way.
- Spiritually nourishing.

Avoid platitudes and aim for genuine, heartfelt encouragement based on the verse.
Your response MUST include:
1. The Bible verse reference (e.g., 'John 3:16' from {{{bibleTranslation}}}) for the 'bibleVerseReference' field.
2. The full text of the chosen Bible verse (from {{{bibleTranslation}}}, in {{{language}}} if the translation supports it, otherwise in the original language of the translation) for the 'bibleVerseText' field.
3. Your encouraging message (in {{{language}}}) for the 'message' field.
4. The original topic for the 'topic' field.

Topic: {{{selectedTopic}}}
Language: {{{language}}}
Bible Translation: {{{bibleTranslation}}}
`,
});

const generateEncouragementFlow = ai.defineFlow(
  {
    name: 'generateEncouragementFlow',
    inputSchema: GenerateEncouragementInputSchema,
    outputSchema: GenerateEncouragementOutputSchema,
  },
  async (input) => {
    const randomTopic = spiritualTopics[Math.floor(Math.random() * spiritualTopics.length)];

    const {output} = await encouragementPrompt({ 
      selectedTopic: randomTopic,
      language: input.language,
      bibleTranslation: input.bibleTranslation,
    });

    if (!output) {
      throw new Error('The AI failed to generate an encouraging message.');
    }
    
    return {
        message: output.message,
        topic: output.topic || randomTopic,
        bibleVerseReference: output.bibleVerseReference || "N/A",
        bibleVerseText: output.bibleVerseText || "Verse text not provided by AI.",
    };
  }
);
