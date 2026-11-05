# Phase 5 – Real AI Builder (Qwen3-30B-A3B-FP8)

## Goal
Make the “Use AI Builder” button rewrite the resume using Cloudflare Workers AI with the model `@cf/qwen/qwen3-30b-a3b-fp8`.

## Model
- Model ID: `@cf/qwen/qwen3-30b-a3b-fp8`
- Keep max_tokens low (around 1500) to stay inside free tier neurons
- Prefer short, structured output

## Requirements
1. Only users with active paid access can use AI Builder.
2. When clicked, send:
   - Original resume
   - Job description
   - User’s extra instructions (if any)
3. The AI must:
   - Rewrite the Professional Summary
   - Strengthen experience bullets (honestly)
   - Optimize the Skills section with relevant keywords
   - Keep the same facts (no invented experience)
   - Return clean, ATS-friendly text
4. Show result in the protected preview (watermark + uncopyable).
5. Free Build must continue to work as before.
6. All new UI text goes into en.json.
7. Follow CLAUDE.md security rules.

## Technical Notes
- Call the model from the API (apps/api) using the Workers AI binding
- Use a clear system + user prompt
- Handle errors gracefully
- Limit output length