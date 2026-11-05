// Input limits shared by the web app (client-side checks) and the API (server-side checks).
export const BUILDER_LIMITS = {
  resumeMaxChars: 20000,
  jobDescriptionMaxChars: 10000,
  aiInstructionsMaxChars: 1000,
  resumeFileMaxBytes: 8 * 1024 * 1024,
} as const;

export const RESUME_FILE_EXTENSIONS = [".pdf", ".docx", ".txt"] as const;

// "free" = deterministic keyword algorithm, "ai" = paid AI rewrite.
export type BuildMode = "free" | "ai";

export interface BuilderInput {
  mode: BuildMode;
  resumeText: string;
  jobDescription: string;
  // Only used when mode is "ai".
  aiInstructions?: string;
}
