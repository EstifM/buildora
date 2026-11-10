import { notFound } from "next/navigation";
import { GUIDE_SLUGS, findGuide, guidePath } from "@/lib/guides";
import { localizedMetadata } from "@/lib/seo";
import { GuideArticlePage } from "@/views/GuidesPage";

// Static export: only the guides listed in messages/guides/*.json exist.
export const dynamicParams = false;

export function generateStaticParams() {
  return GUIDE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const guide = findGuide("en", (await params).slug);
  if (!guide) return {};
  return localizedMetadata("en", guidePath(guide.slug), guide.metaTitle, guide.description, "article");
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const guide = findGuide("en", (await params).slug);
  if (!guide) notFound();
  return <GuideArticlePage guide={guide} locale="en" />;
}
