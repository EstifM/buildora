"use client";

import { useMemo, useState } from "react";
import {
  improveResume,
  type AtsChange,
  type AtsKeyword,
} from "@resume-builder/shared";
import { DownloadPanel } from "@/components/DownloadPanel";
import { AddedSkillChips, KeywordGroup, ResumePreview, ScoreCard } from "@/components/ResultParts";
import { getAtsTemplates } from "@/lib/atsTemplates";
import { useT } from "@/components/LocaleProvider";
import type { Translator } from "@/lib/i18n";

// Below this many keywords the job post is probably too short to score reliably.
const MIN_RELIABLE_KEYWORDS = 5;

function joinTerms(terms: readonly string[], t: Translator): string {
  return terms.join(t("atsTemplates.listSeparator"));
}

function describeChange(change: AtsChange, t: Translator): string {
  switch (change.type) {
    case "createdSkillsSection":
      return t("builder.changes.createdSkillsSection");
    case "addedSkills":
      return t("builder.changes.addedSkills", { count: change.keywords.length });
    case "createdSummary":
      return t("builder.changes.createdSummary", { keywords: joinTerms(change.keywords, t) });
    case "improvedSummary":
      return t("builder.changes.improvedSummary", { keywords: joinTerms(change.keywords, t) });
    case "strengthenedBullet":
      return t("builder.changes.strengthenedBullet", { before: change.before, after: change.after });
    case "normalizedTerm":
      return t("builder.changes.normalizedTerm", { from: change.from, to: change.to });
  }
}

export function FreeBuildResult({ resumeText, jobDescription }: { resumeText: string; jobDescription: string }) {
  const t = useT();
  const [excluded, setExcluded] = useState<string[]>([]);

  const result = useMemo(
    () => improveResume(resumeText, jobDescription, { templates: getAtsTemplates(), excludedKeywords: excluded }),
    [resumeText, jobDescription, excluded],
  );

  // Show added and user-removed skills together so removed ones can be restored.
  const skillChips = result.keywords.filter(
    (keyword) => result.addedKeywords.includes(keyword) || excluded.includes(keyword.key),
  );
  const suggestions = result.missingKeywords.filter((keyword) => keyword.source === "term");

  function toggleKeyword(key: string) {
    setExcluded((current) => (current.includes(key) ? current.filter((k) => k !== key) : [...current, key]));
  }

  const addedTerms = result.addedKeywords.map((keyword) => keyword.term);

  return (
    <div className="space-y-6">
      <ScoreCard oldScore={result.oldScore} newScore={result.newScore} />

      {result.keywords.length < MIN_RELIABLE_KEYWORDS && (
        <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">{t("builder.score.lowKeywords")}</p>
      )}

      <AddedSkillChips keywords={skillChips} excluded={excluded} onToggle={toggleKeyword} />

      <ResumePreview
        title={t("builder.result.previewTitleFree")}
        improvedText={result.improvedText}
        originalText={result.originalText}
        highlight={addedTerms}
      />

      {/* Downloads always use the improved version, including any keywords the user removed. */}
      <DownloadPanel resumeText={result.improvedText} />

      <details className="group rounded-2xl border border-slate-200 bg-white p-5">
        <summary className="cursor-pointer list-none font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
          <span className="mr-2 inline-block transition-transform group-open:rotate-90" aria-hidden="true">
            ›
          </span>
          {t("builder.changes.title", { count: result.changes.length })}
        </summary>
        {result.changes.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">{t("builder.changes.none")}</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {result.changes.map((change, index) => (
              <li key={index} className="flex gap-2">
                <span aria-hidden="true" className="font-bold text-emerald-600">
                  ✓
                </span>
                <span className="min-w-0 break-words">{describeChange(change, t)}</span>
              </li>
            ))}
          </ul>
        )}
      </details>

      {result.matchedKeywords.length > 0 && (
        <KeywordGroup title={t("builder.keywords.matchedTitle")}>
          {result.matchedKeywords.map((keyword) => (
            <StaticChip key={keyword.key} keyword={keyword} />
          ))}
        </KeywordGroup>
      )}

      {suggestions.length > 0 && (
        <KeywordGroup title={t("builder.keywords.suggestionsTitle")} hint={t("builder.keywords.suggestionsHint")}>
          {suggestions.map((keyword) => (
            <StaticChip key={keyword.key} keyword={keyword} muted />
          ))}
        </KeywordGroup>
      )}
    </div>
  );
}

function StaticChip({ keyword, muted = false }: { keyword: AtsKeyword; muted?: boolean }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-sm ${
        muted ? "bg-slate-100 text-slate-600" : "bg-emerald-50 text-emerald-800"
      }`}
    >
      {keyword.term}
    </span>
  );
}
