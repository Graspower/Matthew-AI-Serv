
'use server';
/**
 * @fileOverview Generates an encouraging message based on God's word, focusing on a random spiritual topic.
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
  message: z.string().describe("An uplifting and encouraging message (1-2 paragraphs) based on God's word and the selected topic."),
  topic: z.string().describe("The spiritual topic the message is focused on."),
});
export type GenerateEncouragementOutput = z.infer<typeof GenerateEncouragementOutputSchema>;

export async function generateEncouragement(input: GenerateEncouragementInput): Promise<GenerateEncouragementOutput> {
  return generateEncouragementFlow(input);
}

const encouragementPrompt = ai.definePrompt({
  name: 'generateEncouragementPrompt',
  // model: 'openai/gpt-3.5-turbo', // Specify OpenAI model here - Temporarily commented out
  input: { schema: z.object({ selectedTopic: z.string() }) }, // Internal input for the prompt
  output: { schema: GenerateEncouragementOutputSchema },
  prompt: `You are a warm, insightful, and uplifting spiritual guide.
Your purpose is to provide an encouraging message rooted in the principles of God's word.
Please focus your message on the topic of: **{{{selectedTopic}}}**.

Craft a message that is:
- Positive and hopeful.
- Concise (ideally 1-2 short paragraphs).
- Easy to understand and relatable.
- Spiritually nourishing.

Avoid platitudes and aim for genuine, heartfelt encouragement.
You can allude to biblical concepts or themes without necessarily quoting specific verses, unless it feels natural and concise.
The goal is to uplift the reader's spirit in relation to the topic of {{{selectedTopic}}}.
Generate the message and also return the topic you focused on.`,
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
    
    // The prompt itself will fill the 'topic' field in the output schema based on its instructions.
    // However, if the prompt's output schema didn't explicitly include 'topic', we'd set it here.
    // In this case, the schema `GenerateEncouragementOutputSchema` asks for `topic`, so the AI should provide it.
    // For robustness, we can ensure it's set using our `randomTopic`.
    return {
        message: output.message,
        topic: output.topic || randomTopic // Fallback if AI doesn't set it, though it should
    };
  }
);

