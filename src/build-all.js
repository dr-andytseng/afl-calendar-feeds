#!/usr/bin/env node
// Runs fetch-and-convert.js for all 18 AFL teams sequentially.

import { execSync } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const year = process.argv[2] ?? "2026";

const sleep = ms => new Promise(r => setTimeout(r, ms));

const TEAMS = [
  "adelaide",
  "brisbane-lions",
  "carlton",
  "collingwood",
  "essendon",
  "fremantle",
  "geelong",
  "gold-coast-suns",
  "gws-giants",
  "hawthorn",
  "melbourne",
  "north-melbourne",
  "port-adelaide",
  "richmond",
  "st-kilda",
  "sydney-swans",
  "west-coast-eagles",
  "western-bulldogs",
];

let ok = 0, fail = 0;
for (const team of TEAMS) {
  try {
    execSync(`node ${join(__dir, "fetch-and-convert.js")} ${team} ${year}`, {
      stdio: "inherit",
    });
    ok++;
  } catch {
    console.error(`  ✗ Failed: ${team}`);
    fail++;
  }
  await sleep(3000); // wait 3s between requests to avoid rate limiting
}

// ── build combined all-teams feed ──────────────────────────────────────────
console.log("\nBuilding combined all-teams feed...");
import { readFileSync, writeFileSync, mkdirSync } from "fs";

const docsDir = join(__dir, "..", "docs");
const events = [];

for (const team of TEAMS) {
  const path = join(docsDir, `${team}.ics`);
  try {
    const content = readFileSync(path, "utf8");
    // Extract all VEVENT blocks
    const matches = content.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) ?? [];
    events.push(...matches);
  } catch {
    console.warn(`  ⚠ Could not read ${team}.ics for combined feed`);
  }
}

// Deduplicate by UID (same game appears in both teams' feeds)
const seen = new Set();
const unique = events.filter(e => {
  const uid = e.match(/^UID:(.+)$/m)?.[1]?.trim();
  if (!uid || seen.has(uid)) return false;
  seen.add(uid);
  return true;
});

// Sort by DTSTART
unique.sort((a, b) => {
  const da = a.match(/^DTSTART[^:]*:(.+)$/m)?.[1] ?? "";
  const db = b.match(/^DTSTART[^:]*:(.+)$/m)?.[1] ?? "";
  return da.localeCompare(db);
});

const combined = [
  "BEGIN:VCALENDAR",
  "VERSION:2.0",
  `PRODID:-//afl-ical-bot//AFL ${year} All Teams//EN`,
  "CALSCALE:GREGORIAN",
  "METHOD:PUBLISH",
  `X-WR-CALNAME:AFL ${year} – All Teams`,
  "X-WR-TIMEZONE:UTC",
  ...unique,
  "END:VCALENDAR",
].join("\r\n") + "\r\n";

mkdirSync(docsDir, { recursive: true });
writeFileSync(join(docsDir, "all-teams.ics"), combined, "utf8");
console.log(`  ✓ Written: all-teams.ics (${unique.length} unique fixtures)`);

console.log(`\nDone: ${ok} succeeded, ${fail} failed.`);
if (fail > 0) process.exit(1);
