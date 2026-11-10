"use client";

import { useEffect, useRef, useState } from "react";
import type { ApiErrorCode } from "@resume-builder/shared";
import { DownloadPanel } from "@/components/DownloadPanel";
import { ProtectedPreview } from "@/components/ProtectedPreview";
import { useT } from "@/components/LocaleProvider";
import { aiCoverLetter } from "@/lib/api";

type State =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "done"; letter: string; truncated: boolean }
  | { phase: "error"; error: ApiErrorCode | "network" };

// Shown under a finished AI resume. The letter is written from the final resume text,
// so it only ever mentions what the resume says.
export function CoverLetterPanel({
  resumeText,
  jobDescription,
  instructions,
  accessToken,
  onAccessProblem,
}: {
  resumeText: string;
  jobDescription: string;
  instructions: string;
  accessToken: string;
  onAccessProblem: () => void;
}) {
  const t = useT();
  const [state, setState] = useState<State>({ phase: "idle" });
  const controllerRef = useRef<AbortController | null>(null);

  // Stop a request that is still running when the result is closed.
  useEffect(() => () => controllerRef.current?.abort(), []);

  async function generate() {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState({ phase: "loading" });
    try {
      const response = await aiCoverLetter(
        accessToken,
        { resumeText, jobDescription, instructions: instructions.trim() || undefined },
        controller.signal,
      );
      if (response.ok) setState({ phase: "done", letter: response.data.coverLetter, truncated: response.data.truncated });
      else setState({ phase: "error", error: response.error });
    } catch {
      // Aborted; nothing to show.
    }
  }

  const needsPayment =
    state.phase === "error" && (state.error === "payment_required" || state.error === "not_found" || state.error === "unauthorized");

  return (
    <section aria-labelledby="cover-letter-title" className="rounded-2xl border border-violet-200 bg-violet-50/50 p-5 sm:p-6">
      <h3 id="cover-letter-title" className="font-semibold text-slate-900">
        {t("builder.coverLetter.title")}
      </h3>

      {state.phase === "idle" && (
        <>
          <p className="mt-1 text-sm text-slate-600">{t("builder.coverLetter.hint")}</p>
          <button
            type="button"
            onClick={generate}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3 font-semibold text-white shadow-md shadow-violet-200 transition hover:from-violet-700 hover:to-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 sm:w-auto"
          >
            <span aria-hidden="true">✦</span>
            {t("builder.coverLetter.generate")}
          </button>
        </>
      )}

      {state.phase === "loading" && (
        <div role="status" className="mt-4 flex items-center gap-3 text-sm text-violet-900">
          <span
            aria-hidden="true"
            className="h-6 w-6 shrink-0 animate-spin rounded-full border-[3px] border-violet-200 border-t-violet-600"
          />
          <span>
            <span className="font-semibold">{t("builder.coverLetter.loading")}</span>{" "}
            <span className="text-violet-700">{t("builder.ai.loadingHint")}</span>
          </span>
        </div>
      )}

      {state.phase === "error" && (
        <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-center">
          <p className="font-semibold text-red-800">{t("builder.coverLetter.errorTitle")}</p>
          <p className="mt-1 text-sm text-red-700">{t(`payment.errors.${state.error}`, { min: 0, max: 0 })}</p>
          <button
            type="button"
            onClick={needsPayment ? onAccessProblem : generate}
            className="mt-3 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
          >
            {needsPayment ? t("builder.ai.renewAccess") : t("builder.ai.retry")}
          </button>
        </div>
      )}

      {state.phase === "done" && (
        <div className="mt-4 space-y-4">
          <p className="rounded-xl bg-white p-3 text-sm text-violet-900 ring-1 ring-violet-100">
            {t("builder.coverLetter.honestyNote")}
          </p>
          {state.truncated && (
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{t("builder.coverLetter.truncated")}</p>
          )}
          <ProtectedPreview watermark={t("builder.result.watermark")}>
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-800">{state.letter}</p>
          </ProtectedPreview>
          <DownloadPanel resumeText={resumeText} coverLetter={state.letter} />
          <div className="text-center">
            <button
              type="button"
              onClick={generate}
              className="rounded-xl border-2 border-violet-600 bg-white px-5 py-2.5 text-sm font-semibold text-violet-700 hover:bg-violet-50"
            >
              {t("builder.coverLetter.regenerate")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
