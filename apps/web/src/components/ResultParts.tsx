"use client";

import { useState, type ReactNode } from "react";
import { escapeRegExp, type AtsKeyword } from "@resume-builder/shared";
import { ProtectedPreview } from "@/components/ProtectedPreview";
import { useT } from "@/components/LocaleProvider";

// Pieces shared by the Free Build and AI Builder results.

type View = "improved" | "original";

// Wraps added keywords in <mark> so the user can see what was inserted.
export function highlightTerms(text: string, terms: readonly string[]): ReactNode[] {
  if (terms.length === 0) return [text];
  const alternatives = [...terms]
    .sort((a, b) => b.length - a.length)
    .map((term) => `(?<![\\p{L}\\p{N}])${escapeRegExp(term)}(?![\\p{L}\\p{N}])`);
  const pattern = new RegExp(alternatives.join("|"), "giu");

  const parts: ReactNode[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(pattern)) {
    parts.push(text.slice(lastIndex, match.index));
    parts.push(
      <mark key={match.index} className="rounded bg-emerald-100 px-0.5 text-emerald-900">
        {match[0]}
      </mark>,
    );
    lastIndex = match.index + match[0].length;
  }
  parts.push(text.slice(lastIndex));
  return parts;
}

export function ScoreCard({
  oldScore,
  newScore,
  noImprovementText,
}: {
  oldScore: number;
  newScore: number;
  noImprovementText?: string;
}) {
  const t = useT();
  const points = newScore - oldScore;
  return (
    <div className="rounded-2xl border border-emerald-200 bg-white p-6 text-center shadow-[0_0_48px_-12px_rgb(16_185_129/0.6)] sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t("builder.score.title")}</p>
      <div className="mt-4 flex items-center justify-center gap-4 sm:gap-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t("builder.score.before")}</p>
          <p className="mt-1 text-5xl font-bold text-slate-400 sm:text-6xl">{oldScore}</p>
        </div>
        <span aria-hidden="true" className="text-3xl text-slate-300">
          →
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{t("builder.score.after")}</p>
          <p className="mt-1 text-7xl font-extrabold text-emerald-600 [text-shadow:0_0_28px_rgb(16_185_129/0.45)] sm:text-8xl">
            {newScore}
          </p>
        </div>
      </div>
      <p className="mt-1 text-sm text-slate-500">{t("builder.score.outOf")}</p>
      <p className="mt-4">
        {points > 0 ? (
          <span className="inline-block rounded-full bg-emerald-600 px-4 py-1.5 text-sm font-bold text-white">
            {t("builder.score.improvement", { points })}
          </span>
        ) : (
          <span className="text-sm text-slate-600">{noImprovementText ?? t("builder.score.noImprovement")}</span>
        )}
      </p>
    </div>
  );
}

export function KeywordGroup({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
      <div className="mt-2 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

// Job skills the algorithm added. Tapping one removes it from the resume (or restores it).
export function AddedSkillChips({
  keywords,
  excluded,
  onToggle,
}: {
  keywords: readonly AtsKeyword[];
  excluded: readonly string[];
  onToggle: (key: string) => void;
}) {
  const t = useT();
  if (keywords.length === 0) return null;
  return (
    <KeywordGroup title={t("builder.keywords.addedTitle")} hint={t("builder.keywords.addedHint")}>
      {keywords.map((keyword) => {
        const isExcluded = excluded.includes(keyword.key);
        return (
          <button
            key={keyword.key}
            type="button"
            onClick={() => onToggle(keyword.key)}
            aria-pressed={!isExcluded}
            aria-label={t(isExcluded ? "builder.keywords.restoreLabel" : "builder.keywords.removeLabel", {
              keyword: keyword.term,
            })}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition ${
              isExcluded
                ? "border-slate-200 bg-white text-slate-400 line-through hover:border-slate-400"
                : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-400"
            }`}
          >
            {keyword.term}
            <span aria-hidden="true">{isExcluded ? "+" : "×"}</span>
          </button>
        );
      })}
    </KeywordGroup>
  );
}

// Improved/Original toggle inside the protected (watermarked, uncopyable) preview.
export function ResumePreview({
  title,
  improvedText,
  originalText,
  highlight = [],
}: {
  title: string;
  improvedText: string;
  originalText: string;
  highlight?: readonly string[];
}) {
  const t = useT();
  const [view, setView] = useState<View>("improved");

  return (
    <div>
      <div role="group" aria-label={t("builder.preview.toggleLabel")} className="mb-3 inline-flex rounded-xl bg-slate-100 p-1">
        {(["improved", "original"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setView(option)}
            aria-pressed={view === option}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
              view === option ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {t(`builder.preview.${option}`)}
          </button>
        ))}
      </div>

      <ProtectedPreview watermark={t("builder.result.watermark")}>
        <h3 className="sr-only">{title}</h3>
        <p className="whitespace-pre-wrap text-sm leading-6 text-slate-800">
          {view === "improved" ? highlightTerms(improvedText, highlight) : originalText}
        </p>
        <p className="mt-6 border-t border-slate-200 pt-4 text-xs text-slate-500">{t("builder.result.protectedNote")}</p>
      </ProtectedPreview>
    </div>
  );
}
