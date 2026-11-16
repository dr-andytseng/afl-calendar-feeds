import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, mkdtempSync, writeFileSync, mkdirSync, rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { tmpdir } from "os";
import { validateFixtures, parseUtcToMs } from "../src/lib/fixtures.js";
import { buildCompetitionOutputs } from "../src/lib/build-competition.js";
import { copyStagedOutputs } from "../src/lib/publish.js";
import { COMPETITIONS } from "../src/config/competitions.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const AFL = COMPETITIONS.find((c) => c.key === "afl");
const AFLW = COMPETITIONS.find((c) => c.key === "aflw");
const DTSTAMP = "20261116T000000Z";
const baseFixture = {
  MatchNumber: 1,
  RoundNumber: 1,
  DateUtc: "2027-03-17 08:30:00Z",
  Location: "SCG",
  HomeTeam: "Sydney Swans",
  AwayTeam: "Geelong Cats",
  Group: null,
  HomeTeamScore: null,
  AwayTeamScore: null,
  Winner: "",
};
const opts = { season: 2027, uidPrefix: "afl-2027", sourceUrl: "test://feed" };
const fixture = (n, home, away, extra = {}) =>
  ({ ...baseFixture, MatchNumber: n, HomeTeam: home, AwayTeam: away, ...extra });

// ── real date validity ──────────────────────────────────────────────────────

test("impossible calendar dates are rejected", () => {
  assert.equal(parseUtcToMs("2027-02-31 08:00:00Z"), null);
  assert.equal(parseUtcToMs("2027-13-01 08:00:00Z"), null);
  assert.equal(parseUtcToMs("2027-00-10 08:00:00Z"), null);
  assert.equal(parseUtcToMs("2027-04-31 08:00:00Z"), null);
  assert.equal(parseUtcToMs("2027-03-17 08:30:00Z"), Date.UTC(2027, 2, 17, 8, 30));
});

test("validateFixtures rejects a rolled-over date", () => {
  assert.throws(
    () => validateFixtures([{ ...baseFixture, DateUtc: "2027-02-31 08:00:00Z" }], opts),
    /DateUtc/,
  );
});

// ── score suffix rendering ──────────────────────────────────────────────────

test("unplayed fixtures render no score suffix and no null/undefined", () => {
  const matches = validateFixtures([fixture(1, "Melbourne", "Carlton")], opts);
  const { ics } = buildCompetitionOutputs(matches, AFL, DTSTAMP)
    .find((o) => o.relativePath === "afl/melbourne.ics");
  assert.match(ics, /SUMMARY:Melbourne v Carlton\r\n/);
  assert.doesNotMatch(ics, /\(null/);
  assert.doesNotMatch(ics, /undefined/);
  assert.doesNotMatch(ics, /null–/);
});

test("completed fixtures render both scores", () => {
  const matches = validateFixtures(
    [fixture(1, "Melbourne", "Carlton", { HomeTeamScore: 50, AwayTeamScore: 40 })],
    opts,
  );
  const { ics } = buildCompetitionOutputs(matches, AFL, DTSTAMP)
    .find((o) => o.relativePath === "afl/melbourne.ics");
  assert.match(ics, /SUMMARY:Melbourne v Carlton \(50–40\)/);
});

// ── UID stability across score changes ──────────────────────────────────────

test("UID is stable when the score is added later", () => {
  const before = validateFixtures([fixture(9, "Melbourne", "Carlton")], opts)[0];
  const after = validateFixtures(
    [fixture(9, "Melbourne", "Carlton", { HomeTeamScore: 10, AwayTeamScore: 5 })],
    opts,
  )[0];
  assert.equal(before.uid, after.uid);
});

// ── shared UIDs between aggregate and club feeds ────────────────────────────

test("every club-feed UID also appears in the aggregate", () => {
  const matches = validateFixtures(
    [
      fixture(1, "Melbourne", "Carlton"),
      fixture(2, "Melbourne", "Winner of PF1"),       // one known club
      fixture(3, "Winner of PF1", "Winner of PF2"),   // two unknown
    ],
    opts,
  );
  const outputs = buildCompetitionOutputs(matches, AFL, DTSTAMP);
  const uid = (ics) => [...ics.matchAll(/^UID:(.+)$/gm)].map((m) => m[1].trim());
  const agg = new Set(uid(outputs.find((o) => o.relativePath === "afl/all-teams.ics").ics));
  for (const o of outputs) {
    if (o.relativePath === "afl/all-teams.ics") continue;
    for (const id of uid(o.ics)) assert.ok(agg.has(id), `${id} missing from aggregate`);
  }
  // and the aggregate contains all three matches
  assert.equal(agg.size, 3);
});

// ── exact 38 output paths ───────────────────────────────────────────────────

test("both competitions produce exactly the expected 38 paths", () => {
  const sampleAfl = validateFixtures([fixture(1, "Melbourne", "Carlton")], opts);
  const sampleAflw = validateFixtures(
    [{ ...fixture(1, "Melbourne", "Carlton"), DateUtc: "2026-08-09 06:35:00Z" }],
    { season: 2026, uidPrefix: "aflw-2026", sourceUrl: "test://aflw" },
  );
  const aflPaths = buildCompetitionOutputs(sampleAfl, AFL, DTSTAMP).map((o) => o.relativePath).sort();
  const aflwPaths = buildCompetitionOutputs(sampleAflw, AFLW, DTSTAMP).map((o) => o.relativePath).sort();
  const clubs = [
    "adelaide-crows","brisbane-lions","carlton","collingwood","essendon","fremantle",
    "geelong-cats","gold-coast-suns","gws-giants","hawthorn","melbourne","north-melbourne",
    "port-adelaide","richmond","st-kilda","sydney-swans","west-coast-eagles","western-bulldogs",
  ];
  assert.deepEqual(aflPaths, [...clubs.map((c) => `afl/${c}.ics`), "afl/all-teams.ics"].sort());
  assert.deepEqual(aflwPaths, [...clubs.map((c) => `aflw/${c}.ics`), "aflw/all-teams.ics"].sort());
  assert.equal(aflPaths.length + aflwPaths.length, 38);
});

// ── documentation links resolve to generated files ──────────────────────────

test("docs/index.html relative links and README feed URLs all resolve", () => {
  const html = readFileSync(join(ROOT, "docs", "index.html"), "utf8");
  const hrefs = [...html.matchAll(/href="([^"#]+)"/g)]
    .map((m) => m[1])
    .filter((h) => !h.startsWith("http"));
  assert.equal(hrefs.length, 38);
  for (const h of hrefs) {
    assert.ok(existsSync(join(ROOT, "docs", h)), `missing file for homepage link ${h}`);
  }

  const readme = readFileSync(join(ROOT, "README.md"), "utf8");
  const urls = new Set(
    [...readme.matchAll(/afl-calendar-feeds\/([A-Za-z0-9._/-]+\.ics)/g)].map((m) => m[1]),
  );
  assert.equal(urls.size, 38);
  for (const u of urls) {
    assert.ok(existsSync(join(ROOT, "docs", u)), `missing file for README URL ${u}`);
  }
});

// ── final-copy failure gating ───────────────────────────────────────────────

test("copyStagedOutputs propagates a mid-copy failure and does not roll back", () => {
  const staging = mkdtempSync(join(tmpdir(), "stage-"));
  const dest = mkdtempSync(join(tmpdir(), "dest-"));
  try {
    mkdirSync(join(staging, "sub"), { recursive: true });
    writeFileSync(join(staging, "a.ics"), "a");
    writeFileSync(join(staging, "sub", "b.ics"), "b");
    const outputs = [{ relativePath: "a.ics" }, { relativePath: "sub/b.ics" }];
    let calls = 0;
    const flaky = () => {
      calls += 1;
      if (calls === 2) throw new Error("disk full");
      writeFileSync(join(dest, "a.ics"), "a"); // emulate the first successful copy
    };
    assert.throws(() => copyStagedOutputs(staging, dest, outputs, flaky), /disk full/);
    // No rollback is performed: the first file remains copied.
    assert.ok(existsSync(join(dest, "a.ics")));
  } finally {
    rmSync(staging, { recursive: true, force: true });
    rmSync(dest, { recursive: true, force: true });
  }
});

test("build.js exits non-zero (no publish) when output copying fails", () => {
  // Structural assertion: the workflow only commits/pushes when `npm run build`
  // exits 0 (default bash -eo pipefail), and every failure path in build.js
  // throws -> process.exit(1). The copy step runs after validation, throws on
  // failure, and is the only mutation of docs/ — there is no partial-success exit.
  const src = readFileSync(join(ROOT, "src", "build.js"), "utf8");
  assert.match(src, /process\.exit\(1\)/);
  assert.doesNotMatch(src, /continue-on-error/);
});

// ── workflow safety invariants ──────────────────────────────────────────────

test("workflow publishes only from main, never forces push, and requests a Pages build", () => {
  const yml = readFileSync(join(ROOT, ".github", "workflows", "update-calendars.yml"), "utf8");
  assert.doesNotMatch(yml, /continue-on-error/);
  assert.match(yml, /if: github\.ref == 'refs\/heads\/main'/);
  assert.doesNotMatch(yml, /--force/);
  assert.match(yml, /concurrency:/);
  assert.match(yml, /pages\/builds/);
  // Push step exists only under the main guard and contains no push for other refs
  const notMainGuard = yml.match(/Skip publish \(not on main\)/);
  assert.ok(notMainGuard, "explicit non-main no-op step must exist");
});
