import { englishOnlyMetadata } from "@/lib/seo";
import { LegalPage, legalMetadataText } from "@/views/LegalPage";

const { title, description } = legalMetadataText("privacy");
export const metadata = englishOnlyMetadata("/privacy", title, description);

export default function Page() {
  return <LegalPage doc="privacy" />;
}
