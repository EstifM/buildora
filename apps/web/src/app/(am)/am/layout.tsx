import { RootShell } from "@/components/RootShell";

export default function AmharicLayout({ children }: { children: React.ReactNode }) {
  return <RootShell locale="am">{children}</RootShell>;
}
