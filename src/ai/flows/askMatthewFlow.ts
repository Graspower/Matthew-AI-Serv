
'use server';
/**
 * @fileOverview A conversational AI agent for the Matthew AI application.
 *
 * - askMatthew - A function that handles conversational queries.
 * - AskMatthewInput - The input type for the askMatthew function.
 * - AskMatthewOutput - The return type for the askMatthew function.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';

const AskMatthewInputSchema = z.object({
  query: z.string().describe("The user's current question or message."),
  history: z.array(z.object({
    role: z.enum(['user', 'ai']),
    content: z.string(),
  })).optional().describe("The history of the conversation so far.")
});
export type AskMatthewInput = z.infer<typeof AskMatthewInputSchema>;

const AskMatthewOutputSchema = z.object({
  response: z.string().describe('A helpful, kind, and insightful response to the user, drawing upon biblical wisdom where appropriate.'),
});
export type AskMatthewOutput = z.infer<typeof AskMatthewOutputSchema>;

export async function askMatthew(input: AskMatthewInput): Promise<AskMatthewOutput> {
  return askMatthewFlow(input);
}

const askMatthewPrompt = ai.definePrompt({
  name: 'askMatthewPrompt',
  input: { schema: AskMatthewInputSchema },
  output: { schema: AskMatthewOutputSchema },
  prompt: `You are Matthew, a helpful and kind AI assistant for a Bible study application. Your purpose is to help users explore questions about faith, the Bible, and life in an encouraging and insightful way.

  - If the user asks a question, provide a clear and concise answer.
  - If the question is related to the Bible, use your knowledge to provide context and relevant perspectives.
  - Always maintain a warm, uplifting, and pastoral tone.
  - Do not give medical, legal, or financial advice. Gently redirect the user to a qualified professional if they ask for it.
  - Keep your answers relatively brief and easy to understand.

  Conversation History:
  {{#each history}}
  {{#if (eq role 'user')}}User: {{content}}{{/if}}
  {{#if (eq role 'ai')}}Matthew: {{content}}{{/if}}
  {{/each}}

  New User Query: {{{query}}}

  Your Response:`,
});


const askMatthewFlow = ai.defineFlow(
  {
    name: 'askMatthewFlow',
    inputSchema: AskMatthewInputSchema,
    outputSchema: AskMatthewOutputSchema,
  },
  async (input) => {
    const { output } = await askMatthewPrompt(input);
    return output!;
  }
);
