import { guidesIndex } from "@/lib/guides";
import { localizedMetadata } from "@/lib/seo";
import { GuidesIndexPage } from "@/views/GuidesPage";

const index = guidesIndex("en");
export const metadata = localizedMetadata("en", "/guides", index.metaTitle, index.description);

export default function Page() {
  return <GuidesIndexPage locale="en" />;
}
