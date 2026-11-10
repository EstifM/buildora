import type { AiRewriteRequest } from "@resume-builder/shared";
import { cleanAiOutput } from "./clean";
import { buildMessages } from "./prompt";

export const AI_MODEL = "@cf/qwen/qwen3-30b-a3b-fp8";
// Low on purpose to stay inside the Workers AI free tier.
export const AI_MAX_TOKENS = 1500;
// Rewrites per paying user per rolling 24 hours (free tier is ~100 rewrites/day for ALL users).
export const AI_DAILY_LIMIT = 20;
// Low temperature: consistent, factual rewrites.
const AI_TEMPERATURE = 0.3;

// The subset of the Workers AI binding we use (lets tests pass a fake).
export interface AiRunner {
  run(model: string, input: Record<string, unknown>): Promise<unknown>;
}

export interface RewriteResult {
  text: string;
  truncated: boolean;
  promptTokens?: number;
  completionTokens?: number;
}

interface ChatCompletion {
  response?: string;
  choices?: { message?: { content?: string | null; reasoning_content?: string | null }; finish_reason?: string }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

// One chat call to the model, returning cleaned plain text plus usage numbers.
export async function runChat(
  ai: AiRunner,
  messages: { role: string; content: string }[],
  maxTokens: number,
): Promise<RewriteResult> {
  const output = (await ai.run(AI_MODEL, {
    messages,
    max_tokens: maxTokens,
    temperature: AI_TEMPERATURE,
  })) as ChatCompletion | string;

  // The model returns an OpenAI-style chat completion; older formats are handled just in case.
  // Any separate `reasoning_content` is ignored on purpose.
  const completion = typeof output === "string" ? { response: output } : output;
  const choice = completion.choices?.[0];
  const raw = choice?.message?.content ?? completion.response ?? "";

  // We ask for no reasoning (/no_think). If the model reasons anyway, it eats the token budget
  // and the answer can be cut short, so make it visible in the Worker logs.
  const reasoning = choice?.message?.reasoning_content ?? raw.match(/<think>([\s\S]*?)(<\/think>|$)/)?.[1] ?? "";
  if (reasoning.trim()) {
    console.warn(`AI returned ${reasoning.length} characters of reasoning despite /no_think`, {
      finishReason: choice?.finish_reason,
      completionTokens: completion.usage?.completion_tokens,
    });
  }

  return {
    text: cleanAiOutput(raw),
    truncated: choice?.finish_reason === "length",
    promptTokens: completion.usage?.prompt_tokens,
    completionTokens: completion.usage?.completion_tokens,
  };
}

export function rewriteResume(ai: AiRunner, input: AiRewriteRequest): Promise<RewriteResult> {
  return runChat(ai, buildMessages(input), AI_MAX_TOKENS);
}
