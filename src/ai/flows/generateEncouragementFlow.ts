
'use server';
/**
 * @fileOverview Generates an encouraging message based on God's word, focusing on a random spiritual topic and a specific Bible verse from the King James Version (KJV).
 *
 * - generateEncouragement - A function that crafts an encouraging message.
 * - GenerateEncouragementInput - The input type for the generateEncouragement function (currently empty).
 * - GenerateEncouragementOutput - The return type for the generateEncouragement function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

// List of potential topics for encouragement
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
  // No specific input needed for now, but schema can be extended later.
  // topic: z.string().optional().describe("Optional specific topic for encouragement."),
}).describe("Input for generating an encouraging message. If no topic is provided, a random one will be selected.");
export type GenerateEncouragementInput = z.infer<typeof GenerateEncouragementInputSchema>;

const GenerateEncouragementOutputSchema = z.object({
  message: z.string().describe("An uplifting and encouraging message (1-2 paragraphs) based on the selected Bible verse and topic."),
  topic: z.string().describe("The spiritual topic the message is focused on."),
  bibleVerseReference: z.string().describe("The King James Version (KJV) Bible verse reference (e.g., John 3:16) the encouragement is based on."),
  bibleVerseText: z.string().describe("The text of the King James Version (KJV) Bible verse."),
});
export type GenerateEncouragementOutput = z.infer<typeof GenerateEncouragementOutputSchema>;

export async function generateEncouragement(input: GenerateEncouragementInput): Promise<GenerateEncouragementOutput> {
  return generateEncouragementFlow(input);
}

const encouragementPrompt = ai.definePrompt({
  name: 'generateEncouragementPrompt',
  // model: 'openai/gpt-3.5-turbo', // Temporarily commented out
  input: { schema: z.object({ selectedTopic: z.string() }) }, // Internal input for the prompt
  output: { schema: GenerateEncouragementOutputSchema },
  prompt: `You are a warm, insightful, and uplifting spiritual guide.
Your purpose is to provide an encouraging message rooted in God's word.

Please select a single, fitting Bible verse from the **King James Version (KJV)** related to the topic of: **{{{selectedTopic}}}**.

Then, craft an encouraging message that is:
- Positive and hopeful.
- Concise (ideally 1-2 short paragraphs).
- Directly explains or elaborates on the chosen KJV Bible verse in an easy-to-understand and relatable way.
- Spiritually nourishing.

Avoid platitudes and aim for genuine, heartfelt encouragement based on the verse.
Your response MUST include:
1. The KJV Bible verse reference (e.g., 'John 3:16') for the 'bibleVerseReference' field.
2. The full text of the chosen KJV Bible verse for the 'bibleVerseText' field.
3. Your encouraging message for the 'message' field.
4. The original topic for the 'topic' field.

Topic: {{{selectedTopic}}}
`,
});

const generateEncouragementFlow = ai.defineFlow(
  {
    name: 'generateEncouragementFlow',
    inputSchema: GenerateEncouragementInputSchema,
    outputSchema: GenerateEncouragementOutputSchema,
  },
  async (input) => {
    // Select a random topic from the list
    const randomTopic = spiritualTopics[Math.floor(Math.random() * spiritualTopics.length)];

    const {output} = await encouragementPrompt({ selectedTopic: randomTopic });

    if (!output) {
      throw new Error('The AI failed to generate an encouraging message.');
    }
    
    return {
        message: output.message,
        topic: output.topic || randomTopic, // Fallback for topic if AI misses it
        bibleVerseReference: output.bibleVerseReference || "N/A",
        bibleVerseText: output.bibleVerseText || "Verse text not provided by AI.",
    };
  }
);
