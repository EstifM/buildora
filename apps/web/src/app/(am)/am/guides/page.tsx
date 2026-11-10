import { guidesIndex } from "@/lib/guides";
import { localizedMetadata } from "@/lib/seo";
import { GuidesIndexPage } from "@/views/GuidesPage";

const index = guidesIndex("am");
export const metadata = localizedMetadata("am", "/guides", index.metaTitle, index.description);

export default function Page() {
  return <GuidesIndexPage locale="am" />;
}
