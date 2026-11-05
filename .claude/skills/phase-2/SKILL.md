# Phase 2 – Free Deterministic Algorithm

## Goal
Implement a simple but effective free algorithm that improves a resume based on a job description without using any AI/LLM.

## What the algorithm must do
1. Take resume text + job description text
2. Extract important keywords from the Job Description (skills, tools, technologies, action verbs, requirements)
3. Compare them with the resume
4. Calculate a match score (0–100%)
5. Improve the resume by:
   - Adding missing important keywords to the Skills section (create one if missing)
   - Improving / rewriting the Professional Summary using key terms from the JD
   - Lightly enhancing experience bullets by weaving in relevant keywords (without inventing fake experience)
6. Return:
   - Original resume
   - Improved resume
   - Old score vs New score
   - List of changes made
   - Missing keywords that were added

## Technical Requirements
- Keep everything client-side for now (or simple API route if needed)
- Use pure TypeScript / JavaScript (no external AI)
- Put all new user-facing text into `apps/web/messages/en.json`
- Follow all rules in CLAUDE.md (especially security and i18n)
- The result must still appear inside the protected preview (uncopyable + watermark)
- The free button should now actually work and show a real improved result

## Acceptance Criteria
- Clicking “Build with Free Algorithm” produces a real improved resume
- Score improves in most cases
- Keywords from the JD appear naturally in the new resume
- Preview remains protected
- No hard-coded English text
- Code is simple and readable

## Out of scope
- Real AI / LLM
- File parsing (PDF/DOCX) – still use pasted text only
- Saving to database
- Payment