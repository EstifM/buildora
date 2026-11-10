"use client";

import { useEffect, useMemo, useState } from "react";
import {
  improveResume,
  scoreAgainstJob,
  type AiRewriteResponse,
  type AiStyle,
  type ApiErrorCode,
} from "@resume-builder/shared";
import { CoverLetterPanel } from "@/components/CoverLetterPanel";
import { DownloadPanel } from "@/components/DownloadPanel";
import { AddedSkillChips, ResumePreview, ScoreCard } from "@/components/ResultParts";
import { aiRewrite } from "@/lib/api";
import { getAtsTemplates } from "@/lib/atsTemplates";
import { useT } from "@/components/LocaleProvider";

type State =
  | { phase: "loading" }
  | { phase: "done"; result: AiRewriteResponse }
  | { phase: "error"; error: ApiErrorCode | "network" };

export function AiBuildResult({
  resumeText,
  jobDescription,
  instructions,
  style,
  accessToken,
  onAccessProblem,
}: {
  resumeText: string;
  jobDescription: string;
  instructions: string;
  style: AiStyle;
  accessToken: string;
  // Called when the API says paid access is no longer active.
  onAccessProblem: () => void;
}) {
  const t = useT();
  const [state, setState] = useState<State>({ phase: "loading" });
  // Bumping this runs the AI again ("Rebuild" / "Try again").
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    // Start on the next tick: if the component unmounts right away (e.g. React's dev-mode
    // double effect), no request is sent, so we never pay for an AI call nobody sees.
    const timer = setTimeout(() => {
      aiRewrite(accessToken, { resumeText, jobDescription, instructions: instructions.trim() || undefined, style }, controller.signal)
        .then((response) => {
          if (response.ok) setState({ phase: "done", result: response.data });
          else setState({ phase: "error", error: response.error });
        })
        .catch(() => {
          // Aborted because the inputs changed or the result was closed; nothing to show.
        });
    }, 0);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [accessToken, resumeText, jobDescription, instructions, style, attempt]);

  function runAgain() {
    setState({ phase: "loading" });
    setAttempt((n) => n + 1);
  }

  if (state.phase === "loading") {
    return (
      <div role="status" className="rounded-2xl border border-violet-200 bg-violet-50 p-8 text-center">
        <span
          aria-hidden="true"
          className="mx-auto block h-10 w-10 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600"
        />
        <p className="mt-4 font-semibold text-violet-900">{t("builder.ai.loading")}</p>
        <p className="mt-1 text-sm text-violet-700">{t("builder.ai.loadingHint")}</p>
      </div>
    );
  }

  if (state.phase === "error") {
    const needsPayment = state.error === "payment_required" || state.error === "not_found" || state.error === "unauthorized";
    return (
      <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="font-semibold text-red-800">{t("builder.ai.errorTitle")}</p>
        <p className="mt-1 text-sm text-red-700">{t(`payment.errors.${state.error}`, { min: 0, max: 0 })}</p>
        <button
          type="button"
          onClick={needsPayment ? onAccessProblem : runAgain}
          className="mt-4 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
        >
          {needsPayment ? t("builder.ai.renewAccess") : t("builder.ai.retry")}
        </button>
      </div>
    );
  }

  return (
    <AiResultView
      aiText={state.result.improvedText}
      truncated={state.result.truncated}
      resumeText={resumeText}
      jobDescription={jobDescription}
      instructions={instructions}
      accessToken={accessToken}
      onAccessProblem={onAccessProblem}
      onRebuild={runAgain}
    />
  );
}

export function AiResultView({
  aiText,
  truncated,
  resumeText,
  jobDescription,
  instructions,
  accessToken,
  onAccessProblem,
  onRebuild,
}: {
  aiText: string;
  truncated: boolean;
  resumeText: string;
  jobDescription: string;
  instructions: string;
  accessToken: string;
  onAccessProblem: () => void;
  onRebuild: () => void;
}) {
  const t = useT();
  const [excluded, setExcluded] = useState<string[]>([]);

  // The AI rewrites the content; then the same keyword step as Free Build uses the job's exact
  // wording and adds missing job skills (as chips the user can remove). Summary and bullets stay as the AI wrote them.
  const result = useMemo(
    () => improveResume(aiText, jobDescription, { templates: getAtsTemplates(), mode: "keywordsOnly", excludedKeywords: excluded }),
    [aiText, jobDescription, excluded],
  );
  const oldScore = useMemo(() => scoreAgainstJob(resumeText, jobDescription), [resumeText, jobDescription]);

  const skillChips = result.keywords.filter(
    (keyword) => result.addedKeywords.includes(keyword) || excluded.includes(keyword.key),
  );

  function toggleKeyword(key: string) {
    setExcluded((current) => (current.includes(key) ? current.filter((k) => k !== key) : [...current, key]));
  }

  return (
    <div className="space-y-6">
      <ScoreCard oldScore={oldScore} newScore={result.newScore} noImprovementText={t("builder.ai.scoreNote")} />

      <p className="rounded-xl bg-violet-50 p-4 text-sm text-violet-900">{t("builder.ai.honestyNote")}</p>
      {truncated && <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">{t("builder.ai.truncated")}</p>}

      <AddedSkillChips keywords={skillChips} excluded={excluded} onToggle={toggleKeyword} />

      <ResumePreview
        title={t("builder.result.previewTitleAi")}
        improvedText={result.improvedText}
        originalText={resumeText}
        highlight={result.addedKeywords.map((keyword) => keyword.term)}
      />

      {/* Downloads use the final text, including any skills the user removed. */}
      <DownloadPanel resumeText={result.improvedText} />

      {/* Last step: a cover letter written from the finished resume. A new resume (key) starts a new letter. */}
      <CoverLetterPanel
        key={aiText}
        resumeText={result.improvedText}
        jobDescription={jobDescription}
        instructions={instructions}
        accessToken={accessToken}
        onAccessProblem={onAccessProblem}
      />

      <div className="text-center">
        <button
          type="button"
          onClick={onRebuild}
          className="rounded-xl border-2 border-violet-600 bg-white px-5 py-2.5 text-sm font-semibold text-violet-700 hover:bg-violet-50"
        >
          {t("builder.ai.rebuild")}
        </button>
      </div>
    </div>
  );
}
