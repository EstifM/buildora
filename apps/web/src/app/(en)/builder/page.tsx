import { pageMetadata } from "@/lib/seo";
import { BuilderPage } from "@/views/BuilderPage";

export const metadata = pageMetadata("en", "builder");

export default function Page() {
  return <BuilderPage locale="en" />;
}
