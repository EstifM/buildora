import { pageMetadata } from "@/lib/seo";
import { HomePage } from "@/views/HomePage";

export const metadata = pageMetadata("en", "home");

export default function Page() {
  return <HomePage locale="en" />;
}
