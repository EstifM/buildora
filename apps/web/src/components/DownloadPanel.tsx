"use client";

import { useState, type FormEvent } from "react";
import { EMAIL_MAX_LENGTH, isValidEmail, normalizeEmail, toResumeDocument } from "@resume-builder/shared";
import { readUnlockedEmail, storeUnlockedEmail } from "@/lib/browserStorage";
import { recordLead } from "@/lib/api";
import { buildFileName, saveFile } from "@/lib/download/save";
import { useT } from "@/components/LocaleProvider";

type Format = "pdf" | "docx";

export function DownloadPanel({ resumeText }: { resumeText: string }) {
  const t = useT();
  // This component only renders after a build (client-side), so reading storage here is safe.
  const [unlockedEmail, setUnlockedEmail] = useState<string | null>(readUnlockedEmail);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Format | null>(null);
  const [downloadError, setDownloadError] = useState(false);
  const [pdfDroppedChars, setPdfDroppedChars] = useState(false);

  // SIMULATED UNLOCK: for now any valid email unlocks downloads in this browser.
  // Later (Resend phase) this must become: send a one-time code by email, verify it on the
  // server, and only then allow downloads. A client-side check like this can be bypassed.
  function handleUnlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isValidEmail(email)) {
      setEmailError(t("builder.download.invalidEmail"));
      return;
    }
    const normalized = normalizeEmail(email);
    setEmailError(null);
    setUnlockedEmail(normalized);
    storeUnlockedEmail(normalized);
    recordLead(normalized, "download_unlock");
  }

  function handleChangeEmail() {
    setUnlockedEmail(null);
    storeUnlockedEmail(null);
  }

  async function handleDownload(format: Format) {
    if (!unlockedEmail || busy) return;
    setBusy(format);
    setDownloadError(false);
    try {
      const doc = toResumeDocument(resumeText);
      const title = doc.name ? t("builder.download.documentTitle", { name: doc.name }) : t("builder.download.fileName");
      const fileName = buildFileName(doc.name, t("builder.download.fileName"), format);

      // The libraries are loaded only when needed to keep the page fast.
      if (format === "pdf") {
        const { createResumePdf } = await import("@/lib/download/pdf");
        const { blob, droppedCharacters } = createResumePdf(doc, title);
        setPdfDroppedChars(droppedCharacters);
        saveFile(blob, fileName);
      } else {
        const { createResumeDocx } = await import("@/lib/download/docx");
        saveFile(await createResumeDocx(doc, title), fileName);
      }
    } catch (error) {
      console.error("Download failed", error);
      setDownloadError(true);
    } finally {
      setBusy(null);
    }
  }

  const isLocked = unlockedEmail === null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <h3 className="font-semibold text-slate-900">{t("builder.download.title")}</h3>

      {isLocked ? (
        <form onSubmit={handleUnlock} noValidate className="mt-3">
          <p className="text-sm text-slate-600">{t("builder.download.lockedHint")}</p>
          <label htmlFor="unlock-email" className="sr-only">
            {t("builder.download.emailLabel")}
          </label>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              id="unlock-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              maxLength={EMAIL_MAX_LENGTH}
              value={email}
              placeholder={t("builder.download.emailPlaceholder")}
              aria-invalid={emailError !== null}
              aria-describedby={emailError ? "unlock-email-error" : undefined}
              onChange={(event) => {
                setEmail(event.target.value);
                setEmailError(null);
              }}
              className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
            <button
              type="submit"
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
            >
              {t("builder.download.unlock")}
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">{t("builder.download.emailNotice")}</p>
          {emailError && (
            <p id="unlock-email-error" role="alert" className="mt-2 text-sm text-red-600">
              {emailError}
            </p>
          )}
        </form>
      ) : (
        <p className="mt-2 flex flex-wrap items-center gap-x-2 text-sm text-slate-600">
          <span className="min-w-0 break-all">{t("builder.download.unlockedFor", { email: unlockedEmail })}</span>
          <button
            type="button"
            onClick={handleChangeEmail}
            className="font-medium text-emerald-700 hover:underline"
          >
            {t("builder.download.changeEmail")}
          </button>
        </p>
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {(["pdf", "docx"] as const).map((format) => (
          <button
            key={format}
            type="button"
            disabled={isLocked || busy !== null}
            onClick={() => handleDownload(format)}
            className="flex items-center justify-center gap-2 rounded-xl border-2 border-slate-900 bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
          >
            {isLocked && <LockIcon />}
            {isLocked && <span className="sr-only">{t("builder.download.locked")}</span>}
            {busy === format ? t("builder.download.preparing") : t(`builder.download.${format}`)}
          </button>
        ))}
      </div>

      {downloadError && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {t("builder.download.failed")}
        </p>
      )}
      {pdfDroppedChars && <p className="mt-3 text-sm text-amber-700">{t("builder.download.pdfCharsNote")}</p>}
    </div>
  );
}

function LockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path
        fillRule="evenodd"
        d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
