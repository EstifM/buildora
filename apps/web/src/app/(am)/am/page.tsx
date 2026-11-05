import { pageMetadata } from "@/lib/seo";
import { HomePage } from "@/views/HomePage";

export const metadata = pageMetadata("am", "home");

export default function Page() {
  return <HomePage locale="am" />;
}
