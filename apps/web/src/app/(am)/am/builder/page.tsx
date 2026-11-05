import { pageMetadata } from "@/lib/seo";
import { BuilderPage } from "@/views/BuilderPage";

export const metadata = pageMetadata("am", "builder");

export default function Page() {
  return <BuilderPage locale="am" />;
}
