import Link from "next/link";
import legal from "../../messages/legal/en.json";

// English-only legal pages. Text lives in messages/legal/en.json.
type LegalDoc = "privacy" | "terms";

interface Section {
  heading: string;
  paragraphs?: string[];
  list?: string[];
}

function fill(text: string): string {
  return text.replace(/\{contactEmail\}/g, legal.common.contactEmail);
}

export function legalMetadataText(doc: LegalDoc) {
  return { title: legal[doc].metaTitle, description: legal[doc].description };
}

export function LegalPage({ doc }: { doc: LegalDoc }) {
  const page = legal[doc];
  const sections: Section[] = page.sections;

  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{page.title}</h1>
      <p className="mt-2 text-sm text-slate-500">{legal.common.lastUpdated.replace("{date}", legal.common.date)}</p>
      <p className="mt-6 leading-7 text-slate-700">{fill(page.intro)}</p>

      <div className="mt-10 space-y-8">
        {sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-lg font-semibold text-slate-900">{section.heading}</h2>
            {section.paragraphs?.map((paragraph) => (
              <p key={paragraph} className="mt-3 leading-7 text-slate-700">
                {fill(paragraph)}
              </p>
            ))}
            {section.list && (
              <ul className="mt-3 list-disc space-y-2 pl-5 leading-7 text-slate-700 marker:text-emerald-600">
                {section.list.map((item) => (
                  <li key={item}>{fill(item)}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <Link href="/" className="mt-12 inline-block text-sm font-semibold text-emerald-700 hover:underline">
        ← {legal.common.backHome}
      </Link>
    </article>
  );
}
