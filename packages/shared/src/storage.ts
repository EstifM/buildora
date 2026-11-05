// Retention rules for files we store (Cloudflare R2), used once uploads are saved server-side.
//
// IMPORTANT: Uploaded resume files AND final generated resumes must be deleted
// automatically no later than 3 hours after they are stored. Resumes contain personal
// data, so we keep them only as long as the user needs to download them.
// When R2 storage is added, enforce this with an R2 object lifecycle rule and/or a
// scheduled Worker (cron) that deletes expired objects, and never store these files
// anywhere else (e.g. in Neon) without the same limit.
export const FILE_RETENTION_HOURS = 3;
