"use client";

import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import {
  BUILDER_LIMITS,
  DEFAULT_AI_STYLE,
  RESUME_FILE_EXTENSIONS,
  type AiStyle,
  type BuildMode,
} from "@resume-builder/shared";
import { AiBuildResult } from "@/components/AiBuildResult";
import { AiStyleSelector } from "@/components/AiStyleSelector";
import { FreeBuildResult } from "@/components/FreeBuildResult";
import { PaymentDialog, formatAccessDate } from "@/components/PaymentDialog";
import { recordLead } from "@/lib/api";
import { readUnlockedEmail } from "@/lib/browserStorage";
import { useLocale, useT } from "@/components/LocaleProvider";
import type { Translator } from "@/lib/i18n";
import { usePaidAccess, type PaidAccess } from "@/lib/usePaidAccess";

const MAX_FILE_MB = BUILDER_LIMITS.resumeFileMaxBytes / (1024 * 1024);

function validateResumeFile(file: File, t: Translator): string | null {
  const name = file.name.toLowerCase();
  if (!RESUME_FILE_EXTENSIONS.some((ext) => name.endsWith(ext))) {
    return t("builder.errors.fileType");
  }
  if (file.size > BUILDER_LIMITS.resumeFileMaxBytes) {
    return t("builder.errors.fileTooLarge", { maxMb: MAX_FILE_MB });
  }
  return null;
}

export function BuilderForm() {
  const t = useT();
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [showAiInstructions, setShowAiInstructions] = useState(false);
  const [aiInstructions, setAiInstructions] = useState("");
  const [aiStyle, setAiStyle] = useState<AiStyle>(DEFAULT_AI_STYLE);
  // Which build the user last ran; null means no result yet.
  const [builtMode, setBuiltMode] = useState<BuildMode | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const access = usePaidAccess();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLElement>(null);

  // Bring the result into view after building; on phones it is below the fold.
  useEffect(() => {
    if (builtMode) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [builtMode]);

  const resumeTooLong = resumeText.length > BUILDER_LIMITS.resumeMaxChars;
  const jobTooLong = jobDescription.length > BUILDER_LIMITS.jobDescriptionMaxChars;
  const hasResume = resumeFile !== null || resumeText.trim().length > 0;
  const hasJob = jobDescription.trim().length > 0;
  const canBuild = hasResume && hasJob && !resumeTooLong && !jobTooLong && !fileError;
  // The free algorithm needs pasted text; file reading comes later.
  const hasPastedResume = resumeText.trim().length > 0;
  const canBuildFree = canBuild && hasPastedResume;
  const aiInstructionsTooLong = aiInstructions.length > BUILDER_LIMITS.aiInstructionsMaxChars;
  const canBuildAi = canBuildFree && !aiInstructionsTooLong;

  function resetResult() {
    setBuiltMode(null);
  }

  // Files stay in the browser for now. When uploads are stored on R2, they must be
  // deleted automatically within FILE_RETENTION_HOURS (see packages/shared/src/storage.ts).
  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    resetResult();
    const file = event.target.files?.[0];
    if (!file) return;

    const error = validateResumeFile(file, t);
    setFileError(error);
    setResumeFile(error ? null : file);
    if (error) event.target.value = "";
  }

  function removeFile() {
    resetResult();
    setResumeFile(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function build(mode: BuildMode) {
    if (mode === "free" ? !canBuildFree : !canBuildAi) return;
    setBuiltMode(mode);
  }

  // First click reveals the instructions box. The next click runs the AI build if the
  // user has paid access, otherwise it opens the payment popup.
  function handleAiClick() {
    if (!showAiInstructions) {
      setShowAiInstructions(true);
      return;
    }
    if (access.isActive) {
      build("ai");
      return;
    }
    // Tried the AI Builder without paid access: keep the email if we already have it.
    const knownEmail = readUnlockedEmail();
    if (knownEmail) recordLead(knownEmail, "ai_builder");
    setPaymentOpen(true);
  }

  function handleStartAi() {
    setPaymentOpen(false);
    setShowAiInstructions(true);
    build("ai");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // "Free Build" is the form's submit button.
    event.preventDefault();
    build("free");
  }

  return (
    <div className="mt-10">
      <form onSubmit={handleSubmit} noValidate>
        <div className="grid gap-6 md:grid-cols-2">
          <InputCard stepLabel={t("builder.resume.stepLabel")} heading={t("builder.resume.heading")}>
            <div>
              <p className="text-sm font-medium text-slate-700">{t("builder.resume.uploadLabel")}</p>
              <p className="mt-1 text-xs text-slate-500">
                {t("builder.resume.uploadHint", { maxMb: MAX_FILE_MB })}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <label className="cursor-pointer rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-emerald-600 hover:text-emerald-700 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-emerald-600">
                  {t("builder.resume.chooseFile")}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={RESUME_FILE_EXTENSIONS.join(",")}
                    onChange={handleFileChange}
                    className="sr-only"
                  />
                </label>
                {resumeFile && (
                  <span className="flex min-w-0 items-center gap-2 text-sm text-slate-700">
                    <span className="truncate">
                      {t("builder.resume.selectedFile", { fileName: resumeFile.name })}
                    </span>
                    <button
                      type="button"
                      onClick={removeFile}
                      className="shrink-0 rounded px-1 text-sm font-medium text-red-600 hover:underline"
                    >
                      {t("builder.resume.removeFile")}
                    </button>
                  </span>
                )}
              </div>
              {fileError && (
                <p role="alert" className="mt-2 text-sm text-red-600">
                  {fileError}
                </p>
              )}
            </div>

            <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wide text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />
              {t("builder.resume.orPaste")}
              <span className="h-px flex-1 bg-slate-200" />
            </div>

            <TextAreaField
              label={t("builder.resume.pasteLabel")}
              placeholder={t("builder.resume.pastePlaceholder")}
              value={resumeText}
              maxChars={BUILDER_LIMITS.resumeMaxChars}
              onChange={(value) => {
                resetResult();
                setResumeText(value);
              }}
            />
          </InputCard>

          <InputCard
            stepLabel={t("builder.jobDescription.stepLabel")}
            heading={t("builder.jobDescription.heading")}
          >
            <TextAreaField
              label={t("builder.jobDescription.pasteLabel")}
              placeholder={t("builder.jobDescription.pastePlaceholder")}
              value={jobDescription}
              maxChars={BUILDER_LIMITS.jobDescriptionMaxChars}
              rows={16}
              onChange={(value) => {
                resetResult();
                setJobDescription(value);
              }}
            />
          </InputCard>
        </div>

        {showAiInstructions && (
          <div
            id="ai-instructions"
            className="mx-auto mt-8 max-w-2xl rounded-2xl border border-violet-200 bg-violet-50/50 p-5 sm:p-6"
          >
            <TextAreaField
              label={t("builder.aiInstructions.label")}
              placeholder={t("builder.aiInstructions.placeholder")}
              value={aiInstructions}
              maxChars={BUILDER_LIMITS.aiInstructionsMaxChars}
              rows={4}
              autoFocus
              onChange={(value) => {
                resetResult();
                setAiInstructions(value);
              }}
            />
            <p className="mt-1 text-xs text-slate-500">{t("builder.aiInstructions.hint")}</p>
          </div>
        )}

        <div className="mt-8 flex flex-col items-center gap-3">
          <AccessBadge access={access} onOpen={() => setPaymentOpen(true)} />
          <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
            <button
              type="submit"
              disabled={!canBuildFree}
              className="w-full rounded-2xl border-2 border-emerald-600 bg-white px-8 py-4 text-lg font-semibold text-emerald-700 transition hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400 disabled:hover:bg-white sm:w-auto"
            >
              {t("builder.buttons.free")}
            </button>
            <button
              type="button"
              onClick={handleAiClick}
              disabled={showAiInstructions && !canBuildAi}
              aria-expanded={showAiInstructions}
              aria-controls="ai-instructions"
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-violet-300 transition hover:from-violet-700 hover:to-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none sm:w-auto"
            >
              <span aria-hidden="true">✦</span>
              {showAiInstructions ? t("builder.buttons.buildWithAi") : t("builder.buttons.useAi")}
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide">
                {t("builder.buttons.aiBadge")}
              </span>
            </button>
            {showAiInstructions && (
              <AiStyleSelector
                value={aiStyle}
                onChange={(style) => {
                  resetResult();
                  setAiStyle(style);
                }}
              />
            )}
          </div>
          {!canBuild && <p className="text-sm text-slate-500">{t("builder.buildHint")}</p>}
          {canBuild && !hasPastedResume && (
            <p className="text-center text-sm text-slate-500">{t("builder.pasteTextForFree")}</p>
          )}
        </div>

      </form>

      {/* Outside the form: the result contains its own form (email unlock), and forms can't be nested. */}
      <section ref={resultRef} aria-labelledby="result-heading" className="mt-10 scroll-mt-20">
        <h2 id="result-heading" className="sr-only">
          {t("builder.result.heading")}
        </h2>
        <div>
          {builtMode === "free" && (
            <FreeBuildResult resumeText={resumeText} jobDescription={jobDescription} />
          )}
          {builtMode === "ai" && access.accessToken && (
            <AiBuildResult
              resumeText={resumeText}
              jobDescription={jobDescription}
              instructions={aiInstructions}
              style={aiStyle}
              accessToken={access.accessToken}
              onAccessProblem={() => {
                access.refresh();
                setPaymentOpen(true);
              }}
            />
          )}
          {builtMode === null && (
            <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-8 text-center text-slate-400">
              {t("builder.result.placeholder")}
            </div>
          )}
        </div>
      </section>

      <PaymentDialog
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        access={access}
        onStartAi={handleStartAi}
      />
    </div>
  );
}

function AccessBadge({ access, onOpen }: { access: PaidAccess; onOpen: () => void }) {
  const t = useT();
  const locale = useLocale();
  if (access.isActive && access.expiresAt) {
    return (
      <p className="flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200">
        <span
          aria-hidden="true"
          className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-xs text-white"
        >
          ✓
        </span>
        {t("payment.statusActive", { date: formatAccessDate(access.expiresAt, locale) })}
      </p>
    );
  }
  if (access.status === "pending") {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="rounded-full bg-amber-50 px-4 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100"
      >
        {t("payment.statusPending")}
      </button>
    );
  }
  return null;
}

function InputCard({
  stepLabel,
  heading,
  children,
}: {
  stepLabel: string;
  heading: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">{stepLabel}</p>
      <h2 className="mb-4 mt-1 text-lg font-semibold text-slate-900">
        {heading}
      </h2>
      {children}
    </section>
  );
}

function TextAreaField({
  label,
  placeholder,
  value,
  maxChars,
  rows = 10,
  autoFocus = false,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  maxChars: number;
  rows?: number;
  autoFocus?: boolean;
  onChange: (value: string) => void;
}) {
  const t = useT();
  const id = useId();
  const tooLong = value.length > maxChars;

  return (
    <div className="flex flex-1 flex-col">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        autoFocus={autoFocus}
        value={value}
        placeholder={placeholder}
        aria-invalid={tooLong}
        aria-describedby={`${id}-count`}
        onChange={(event) => onChange(event.target.value)}
        className={`mt-2 w-full flex-1 resize-y rounded-xl border bg-slate-50 p-3 text-sm leading-6 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 ${
          tooLong
            ? "border-red-400 focus:ring-red-200"
            : "border-slate-300 focus:border-emerald-600 focus:ring-emerald-100"
        }`}
      />
      <p
        id={`${id}-count`}
        className={`mt-1 text-right text-xs ${tooLong ? "text-red-600" : "text-slate-400"}`}
      >
        {tooLong
          ? t("builder.errors.tooLong", { max: maxChars })
          : t("builder.charCount", { count: value.length, max: maxChars })}
      </p>
    </div>
  );
}
