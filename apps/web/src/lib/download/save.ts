// Triggers a browser download for a file generated on the device.
// Nothing is uploaded or stored. If generation ever moves to the server, the files
// must be stored on R2 and deleted within FILE_RETENTION_HOURS (packages/shared/src/storage.ts).
export function saveFile(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser a moment to start the download before freeing the memory.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

// "Abebe Kebede" -> "abebe-kebede-resume"
export function buildFileName(name: string, suffix: string, extension: "pdf" | "docx"): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 60);
  return `${slug ? `${slug}-` : ""}${suffix}.${extension}`;
}
