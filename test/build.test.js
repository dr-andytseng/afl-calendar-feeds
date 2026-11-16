import test from "node:test";
import assert from "node:assert/strict";
import { escapeText, foldLine, toUtcStamp, renderCalendar } from "../src/lib/ics.js";
import { validateFixtures, parseUtcToMs, isPlaceholder } from "../src/lib/fixtures.js";
import { buildCompetitionOutputs } from "../src/lib/build-competition.js";
import { COMPETITIONS } from "../src/config/competitions.js";

const AFL = COMPETITIONS.find((c) => c.key === "afl");
const AFLW = COMPETITIONS.find((c) => c.key === "aflw");

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

// ── folding / escaping ──────────────────────────────────────────────────────

test("escapeText escapes commas, semicolons, backslashes and newlines", () => {
  assert.equal(escapeText('a,b;c\\d\ne'), "a\\,b\\;c\\\\d\\ne");
});

test("foldLine leaves short lines untouched", () => {
  assert.equal(foldLine("SUMMARY:short"), "SUMMARY:short");
});

test("foldLine folds at 75 UTF-8 octets, not characters", () => {
  // 60 ASCII chars + em-dashes (3 bytes each): char count < 75 but byte count > 75
  const line = "X".repeat(60) + "–".repeat(10); // 60 + 30 bytes = 90 bytes
  const folded = foldLine(line);
  for (const l of folded.split("\r\n")) {
    assert.ok(Buffer.byteLength(l, "utf8") <= 75, `line too long: ${Buffer.byteLength(l)}`);
  }
  // Unfolding (remove CRLF + leading space) restores the original
  assert.equal(folded.replace(/\r\n /g, ""), line);
});

test("foldLine never splits a multi-byte character", () => {
  const line = "A".repeat(74) + "–BC"; // dash would straddle the 75-octet boundary
  const folded = foldLine(line);
  assert.ok(Buffer.byteLength(folded.split("\r\n")[0], "utf8") <= 75);
  assert.equal(folded.replace(/\r\n /g, ""), line);
});

test("toUtcStamp formats as basic UTC", () => {
  assert.equal(toUtcStamp(Date.UTC(2027, 2, 17, 8, 30)), "20270317T083000Z");
});

// ── parsing / validation ─────────────────────────────────────────────────────

test("parseUtcToMs parses fixturedownload format", () => {
  assert.equal(parseUtcToMs("2027-03-17 08:30:00Z"), Date.UTC(2027, 2, 17, 8, 30));
  assert.equal(parseUtcToMs("garbage"), null);
});

test("validateFixtures normalizes and assigns stable UIDs", () => {
  const [m] = validateFixtures([baseFixture], opts);
  assert.equal(m.uid, "afl-2027-1@afl-calendar-feeds");
  assert.equal(m.startMs, Date.UTC(2027, 2, 17, 8, 30));
});

test("validateFixtures rejects duplicate MatchNumbers", () => {
  assert.throws(() => validateFixtures([baseFixture, baseFixture], opts), /duplicate MatchNumber/);
});

test("validateFixtures rejects wrong-season dates", () => {
  assert.throws(() => validateFixtures([{ ...baseFixture, DateUtc: "2026-03-17 08:30:00Z" }], opts), /not in season/);
});

test("validateFixtures rejects unknown team labels", () => {
  assert.throws(() => validateFixtures([{ ...baseFixture, HomeTeam: "Mars Rovers" }], opts), /unrecognized HomeTeam/);
});

test("validateFixtures accepts finals placeholders", () => {
  const f = { ...baseFixture, HomeTeam: "Winner of PF1", AwayTeam: "Winner of PF2" };
  const [m] = validateFixtures([f], opts);
  assert.equal(m.homeClub, null);
  assert.equal(m.awayClub, null);
});

test("validateFixtures rejects empty feeds", () => {
  assert.throws(() => validateFixtures([], opts), /0 fixtures/);
});

test("validateFixtures rejects missing date", () => {
  assert.throws(() => validateFixtures([{ ...baseFixture, DateUtc: null }], opts), /DateUtc/);
});

test("validateFixtures rejects one-sided scores", () => {
  assert.throws(() => validateFixtures([{ ...baseFixture, HomeTeamScore: 10 }], opts), /only one/);
});

test("isPlaceholder recognises finals placeholders", () => {
  for (const p of ["Winner of QF1", "Loser of SF2", "1st", "10th", "Highest-ranked WF Winner", "Lowest-ranked WF Winner"]) {
    assert.ok(isPlaceholder(p), p);
  }
  assert.ok(!isPlaceholder("Sydney Swans"));
});

// ── placeholder routing / calendar generation ────────────────────────────────

const DTSTAMP = "20261116T000000Z";

function fixture(n, home, away) {
  return { ...baseFixture, MatchNumber: n, HomeTeam: home, AwayTeam: away };
}

test("two unknown participants: aggregate only, not in any club feed", () => {
  const matches = validateFixtures([fixture(1, "Winner of PF1", "Winner of PF2")], opts);
  const outputs = buildCompetitionOutputs(matches, AFL, DTSTAMP);
  const aggregate = outputs.find((o) => o.relativePath === "afl/all-teams.ics");
  assert.match(aggregate.ics, /Winner of PF1/);
  for (const o of outputs) {
    if (o.relativePath === "afl/all-teams.ics") continue;
    assert.doesNotMatch(o.ics, /Winner of PF1/, `${o.relativePath} should not contain the fixture`);
  }
});

test("one known club + placeholder: aggregate plus the known club's feed only", () => {
  const matches = validateFixtures([fixture(1, "Melbourne", "Winner of PF1")], opts);
  const outputs = buildCompetitionOutputs(matches, AFL, DTSTAMP);
  for (const o of outputs) {
    const has = /Melbourne v Winner of PF1/.test(o.ics);
    if (o.relativePath === "afl/all-teams.ics" || o.relativePath === "afl/melbourne.ics") {
      assert.ok(has, `${o.relativePath} should contain the fixture`);
    } else {
      assert.ok(!has, `${o.relativePath} should NOT contain the fixture`);
    }
  }
});

test("two known clubs: aggregate plus both club feeds", () => {
  const matches = validateFixtures([fixture(1, "Melbourne", "Carlton")], opts);
  const outputs = buildCompetitionOutputs(matches, AFL, DTSTAMP);
  for (const o of outputs) {
    const has = /Melbourne v Carlton/.test(o.ics);
    if (["afl/all-teams.ics", "afl/melbourne.ics", "afl/carlton.ics"].includes(o.relativePath)) {
      assert.ok(has, `${o.relativePath} should contain the fixture`);
    } else {
      assert.ok(!has, `${o.relativePath} should NOT contain the fixture`);
    }
  }
});

test("UID is stable when participants, time or venue change", () => {
  const a = validateFixtures([fixture(7, "Melbourne", "Carlton")], opts)[0];
  const b = validateFixtures([
    { ...fixture(7, "Winner of QF1", "Carlton"), DateUtc: "2027-04-01 09:00:00Z", Location: "Marvel Stadium" },
  ], opts)[0];
  assert.equal(a.uid, b.uid);
});

test("buildCompetitionOutputs produces 19 files per competition with correct paths", () => {
  const matches = validateFixtures([fixture(1, "Melbourne", "Carlton")], opts);
  const afl = buildCompetitionOutputs(matches, AFL, DTSTAMP).map((o) => o.relativePath).sort();
  const aflw = buildCompetitionOutputs(matches, AFLW, DTSTAMP).map((o) => o.relativePath).sort();
  assert.equal(afl.length, 19);
  assert.equal(aflw.length, 19);
  assert.ok(afl.includes("afl/all-teams.ics"));
  assert.ok(aflw.includes("aflw/all-teams.ics"));
  assert.ok(aflw.includes("aflw/melbourne.ics"));
  assert.ok(!afl.some((p) => p.startsWith("aflw/")));
});

test("estimated durations and labels come from competition config", () => {
  const matches = validateFixtures([fixture(1, "Melbourne", "Carlton")], opts);
  const afl = buildCompetitionOutputs(matches, AFL, DTSTAMP).find((o) => o.relativePath === "afl/melbourne.ics");
  assert.match(afl.ics, /DTEND:20270317T110000Z/); // 08:30 + 150 min
  assert.match(afl.ics, /X-WR-CALNAME:AFL 2027 – /);
  const aflwMatches = validateFixtures(
    [{ ...fixture(1, "Melbourne", "Carlton"), DateUtc: "2026-08-09 06:35:00Z" }],
    { season: 2026, uidPrefix: "aflw-2026", sourceUrl: "test://aflw" },
  );
  const aflw = buildCompetitionOutputs(aflwMatches, AFLW, DTSTAMP).find((o) => o.relativePath === "aflw/melbourne.ics");
  assert.match(aflw.ics, /DTEND:20260809T083500Z/); // 06:35 + 120 min
  assert.match(aflw.ics, /X-WR-CALNAME:AFLW 2026 – /);
  assert.match(aflw.ics, /UID:aflw-2026-1@afl-calendar-feeds/);
});

test("score presentation matches existing style for completed matches", () => {
  const played = { ...fixture(1, "Melbourne", "St Kilda"), HomeTeamScore: 120, AwayTeamScore: 107 };
  const matches = validateFixtures([played], opts);
  const { ics } = buildCompetitionOutputs(matches, AFL, DTSTAMP).find((o) => o.relativePath === "afl/melbourne.ics");
  assert.match(ics, /SUMMARY:Melbourne v St Kilda \(120–107\)/);
  assert.match(ics, /DESCRIPTION:Round 1 – Melbourne v St Kilda \(120–107\)/);
});

test("every generated line is at most 75 octets", () => {
  const played = {
    ...fixture(1, "North Melbourne", "Port Adelaide"),
    HomeTeamScore: 111,
    AwayTeamScore: 99,
    Location: "Corroboree Group Oval Manuka",
  };
  const matches = validateFixtures([played], opts);
  for (const o of buildCompetitionOutputs(matches, AFL, DTSTAMP)) {
    for (const line of o.ics.split("\r\n")) {
      assert.ok(Buffer.byteLength(line, "utf8") <= 75, `line too long in ${o.relativePath}: ${line}`);
    }
  }
});
