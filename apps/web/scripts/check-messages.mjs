// Checks that every messages/*.json file has the same keys and {placeholders} as en.json.
// Usage: npm run check:i18n --workspace=apps/web
import { readFileSync, readdirSync } from "node:fs";

const dir = new URL("../messages/", import.meta.url);
const flatten = (obj, prefix = "") =>
  Object.entries(obj).flatMap(([key, value]) =>
    typeof value === "string" ? [[`${prefix}${key}`, value]] : flatten(value, `${prefix}${key}.`),
  );
const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");

const base = new Map(flatten(JSON.parse(readFileSync(new URL("en.json", dir), "utf8"))));
let failed = false;

for (const file of readdirSync(dir).filter((f) => f.endsWith(".json") && f !== "en.json")) {
  const other = new Map(flatten(JSON.parse(readFileSync(new URL(file, dir), "utf8"))));
  const problems = [];
  for (const [key, value] of base) {
    if (!other.has(key)) problems.push(`missing key: ${key}`);
    else if (placeholders(value) !== placeholders(other.get(key))) problems.push(`placeholders differ: ${key}`);
  }
  for (const key of other.keys()) if (!base.has(key)) problems.push(`extra key: ${key}`);
  const same = [...base].filter(([key, value]) => other.get(key) === value).map(([key]) => key);

  console.log(`${file}: ${other.size}/${base.size} keys, ${problems.length} problem(s)`);
  for (const problem of problems) console.log(`  ✗ ${problem}`);
  if (same.length) console.log(`  (identical to English, e.g. brand names: ${same.join(", ")})`);
  failed ||= problems.length > 0;
}
process.exit(failed ? 1 : 0);
