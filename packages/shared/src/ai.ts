// API contract for the paid AI Builder.

// Writing styles for the same AI model (the UI shows them as ChatGPT / Claude / Gemini style).
export const AI_STYLES = ["natural", "structured", "concise"] as const;
export type AiStyle = (typeof AI_STYLES)[number];
export const DEFAULT_AI_STYLE: AiStyle = "structured";

export interface AiRewriteRequest {
  resumeText: string;
  jobDescription: string;
  // Optional extra instructions from the user (emphasis, tone). Treated as data, not commands.
  instructions?: string;
  style?: AiStyle;
}

export interface AiRewriteResponse {
  improvedText: string;
  // True if the model hit its output limit, so the result may be missing the end.
  truncated: boolean;
}
