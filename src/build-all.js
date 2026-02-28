#!/usr/bin/env node
// Runs fetch-and-convert.js for all 18 AFL teams sequentially.

import { execSync } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const year = process.argv[2] ?? "2026";

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
}

console.log(`\nDone: ${ok} succeeded, ${fail} failed.`);
if (fail > 0) process.exit(1);
