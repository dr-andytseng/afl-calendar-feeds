#!/usr/bin/env node
// Builds BOTH competitions' calendars in a staging directory, validates the
// staged output, and only then writes into docs/. If anything fails before
// the copy step, the existing published files in docs/ remain unchanged.
//
// Usage: node src/build.js

import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { COMPETITIONS } from "./config/competitions.js";
import { fetchAndValidate } from "./lib/fixtures.js";
import { buildCompetitionOutputs } from "./lib/build-competition.js";
import { validateStagedIcs } from "./lib/validate-output.js";
import { copyStagedOutputs } from "./lib/publish.js";
import { toUtcStamp } from "./lib/ics.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DOCS = join(ROOT, "docs");
const EXPECTED_OUTPUTS = 38; // (18 club feeds + 1 aggregate) x 2 competitions

async function main() {
  console.log("Fetching and validating both competitions…");
  // Both competitions are fetched and validated BEFORE any output is produced.
  const datasets = [];
  for (const competition of COMPETITIONS) {
    const matches = await fetchAndValidate(competition);
    console.log(`  ✓ ${competition.label} ${competition.season}: ${matches.length} validated fixtures`);
    datasets.push({ competition, matches });
  }

  const dtstamp = toUtcStamp(Date.now());
  const staging = mkdtempSync(join(tmpdir(), "afl-calendar-build-"));
  console.log(`Staging output in ${staging}`);

  try {
    const outputs = [];
    for (const { competition, matches } of datasets) {
      outputs.push(...buildCompetitionOutputs(matches, competition, dtstamp));
    }

    if (outputs.length !== EXPECTED_OUTPUTS) {
      throw new Error(`expected ${EXPECTED_OUTPUTS} output files, got ${outputs.length}`);
    }

    // Write and validate all staged files; docs/ is untouched at this point.
    for (const { relativePath, ics } of outputs) {
      const dest = join(staging, relativePath);
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, ics, "utf8");
      const vevents = validateStagedIcs(relativePath, ics);
      console.log(`  ✓ staged ${relativePath} (${vevents} events)`);
    }

    // All validation passed — copy staged files into docs/.
    // Non-generated files (docs/index.html, docs/.gitkeep, …) are preserved.
    // NOTE: sequential multi-file copy, NOT atomic. Any failure here is
    // fatal and must not reach git/GitHub Pages — the workflow only
    // commits when this script exits 0. There is no rollback.
    copyStagedOutputs(staging, DOCS, outputs);
    console.log(`\nDone: wrote ${outputs.length} calendar files into docs/.`);
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(`\nBuild FAILED: ${err.message}`);
  console.error("docs/ was NOT modified (or only validated output was copied).");
  process.exit(1);
});
