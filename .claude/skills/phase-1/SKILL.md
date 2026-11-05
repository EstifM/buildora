# Phase 1 – Foundation & Landing + Basic UI

## Goal
Create a clean, simple landing page and the main builder page structure (two input sections + Build button). No real algorithm yet. Just the UI skeleton and basic navigation.

## Requirements (must follow CLAUDE.md)
- Simple, clean, mobile-first design
- All text must come from i18n JSON (create `apps/web/messages/en.json`)
- Use Tailwind
- Responsive
- Clear visual hierarchy

## Exact tasks to complete
1. Set up basic i18n structure in `apps/web/messages/en.json` with keys for:
   - Landing page texts
   - Builder page texts (upload resume, paste JD, Build button, etc.)
2. Create a clean Landing page (`/`) with:
   - Hero section (title, short description, CTA button “Start Building”)
   - Simple how-it-works section (3 steps)
   - Pricing section (50 birr/day and 200 birr/week)
   - Footer
3. Create the main Builder page (`/builder`) with:
   - Two clear sections side by side on desktop (stacked on mobile):
     - Left: Resume upload + paste textarea
     - Right: Job Description paste textarea
   - Big “Build my resume” button in the center/bottom
   - Placeholder result area (just a box saying “Result will appear here”)
4. Add basic navigation (logo + links to Home and Builder)
5. Make sure the design looks professional but very simple and interactive.

## Acceptance Criteria
- Landing page looks clean and trustworthy
- Builder page has clear two input areas + Build button
- All text comes from the JSON file
- Works well on mobile
- No console errors
- Code is simple and readable

## When finished
Show me a summary of what was created and the key files.