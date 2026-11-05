"use client";

import Image from "next/image";
import type { AiStyle } from "@resume-builder/shared";
import { useT } from "@/components/LocaleProvider";
import type { MessageKey } from "@/lib/i18n";

// Icon-only style picker. All three are writing styles for the SAME AI model; the icons
// are the familiar assistants' logos so users recognize the style at a glance.
// NOTE: these logos are trademarks of OpenAI, Anthropic and Google and are used for
// local/demo purposes only. Replace them before any public launch (see public/brand/ai-styles/NOTICE.txt).
const OPTIONS: { style: AiStyle; icon: string; labelKey: MessageKey }[] = [
  { style: "natural", icon: "/brand/ai-styles/chatgpt.svg", labelKey: "builder.aiStyles.chatgpt" },
  { style: "structured", icon: "/brand/ai-styles/claude.svg", labelKey: "builder.aiStyles.claude" },
  { style: "concise", icon: "/brand/ai-styles/gemini.svg", labelKey: "builder.aiStyles.gemini" },
];

export function AiStyleSelector({ value, onChange }: { value: AiStyle; onChange: (style: AiStyle) => void }) {
  const t = useT();
  return (
    <fieldset className="flex shrink-0 justify-center">
      <legend className="sr-only">{t("builder.aiStyles.groupLabel")}</legend>
      <div className="inline-flex gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
        {OPTIONS.map(({ style, icon, labelKey }) => {
          const label = t(labelKey);
          return (
            // Real radio inputs: arrow keys and screen readers work out of the box.
            <label key={style} title={label} className="cursor-pointer">
              <input
                type="radio"
                name="ai-style"
                value={style}
                checked={value === style}
                onChange={() => onChange(style)}
                aria-label={label}
                className="peer sr-only"
              />
              <span className="flex h-12 w-12 items-center justify-center rounded-xl opacity-50 grayscale transition peer-checked:bg-violet-50 peer-checked:opacity-100 peer-checked:grayscale-0 peer-checked:ring-2 peer-checked:ring-violet-600 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-violet-600 hover:opacity-80">
                <Image src={icon} alt="" width={24} height={24} unoptimized />
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
