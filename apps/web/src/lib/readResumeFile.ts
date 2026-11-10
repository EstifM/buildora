// Reads the text of a resume file INSIDE the browser. The file is never uploaded.
// (If uploads are ever stored server-side, see FILE_RETENTION_HOURS in packages/shared/src/storage.ts.)

export type ReadFileError = "unreadable" | "noText";

export type ReadFileResult = { ok: true; text: string } | { ok: false; error: ReadFileError };

// Scanned PDFs are pictures of text: they open fine but contain almost no characters.
const MIN_TEXT_CHARS = 30;

interface PdfTextItem {
  str?: string;
  hasEOL?: boolean;
}

async function readPdf(data: ArrayBuffer): Promise<string> {
  // Loaded only when a PDF is chosen, to keep the page fast. The "legacy" build also works
  // on older phones and browsers.
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();

  // No font loading: we only need the text.
  const loadingTask = pdfjs.getDocument({ data, disableFontFace: true });
  try {
    const pdf = await loadingTask.promise;
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      let text = "";
      for (const item of content.items as PdfTextItem[]) {
        if (typeof item.str !== "string") continue;
        text += item.str + (item.hasEOL ? "\n" : "");
      }
      pages.push(text);
    }
    return pages.join("\n\n");
  } finally {
    await loadingTask.destroy();
  }
}

async function readDocx(data: ArrayBuffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ arrayBuffer: data });
  // mammoth puts a blank line after every paragraph; resumes read better (and section and
  // contact-line detection works) with one line per paragraph.
  return result.value.replace(/\n\n/g, "\n");
}

function tidy(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function readResumeFile(file: File): Promise<ReadFileResult> {
  const name = file.name.toLowerCase();
  try {
    let text: string;
    if (name.endsWith(".pdf")) text = await readPdf(await file.arrayBuffer());
    else if (name.endsWith(".docx")) text = await readDocx(await file.arrayBuffer());
    else text = await file.text();

    text = tidy(text);
    return text.length >= MIN_TEXT_CHARS ? { ok: true, text } : { ok: false, error: "noText" };
  } catch (error) {
    console.error("Could not read the resume file", error);
    return { ok: false, error: "unreadable" };
  }
}
