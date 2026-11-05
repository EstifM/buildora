# Phase 3 – Download (PDF + DOCX) + Email Gate

## Goal
Allow users to download the improved resume as PDF and DOCX, but only after they sign up with their email. Keep the preview protected.

## Requirements
1. After a successful Free Build, show two download buttons:
   - Download PDF
   - Download DOCX
2. These buttons are disabled / locked until the user provides their email.
3. Simple email signup form (just email + “Send download link” or “Unlock download”).
4. For now, we can simulate the unlock (no real email sending yet). Later we will connect Resend.
5. Generate clean, ATS-friendly PDF and DOCX from the improved resume text.
6. Keep the watermark and copy protection on the preview.
7. All new text must go into `apps/web/messages/en.json`.
8. Follow the 3-hour retention rule (add comments / constants).
9. Keep the design simple and clean.

## Acceptance Criteria
- User can build a resume with Free Build
- Download buttons appear
- User must enter email to unlock download
- PDF and DOCX can be generated and downloaded
- Preview remains protected
- No hard-coded strings
- Code stays simple

## Out of scope for this phase
- Real email sending (Resend)
- Real payment / Telegram
- AI Builder
- File upload parsing