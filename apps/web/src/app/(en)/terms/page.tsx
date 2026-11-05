import { englishOnlyMetadata } from "@/lib/seo";
import { LegalPage, legalMetadataText } from "@/views/LegalPage";

const { title, description } = legalMetadataText("terms");
export const metadata = englishOnlyMetadata("/terms", title, description);

export default function Page() {
  return <LegalPage doc="terms" />;
}
