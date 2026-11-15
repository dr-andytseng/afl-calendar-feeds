import test from "node:test";
import assert from "node:assert/strict";
import { fetchAndValidate } from "../src/lib/fixtures.js";
import { validateStagedIcs } from "../src/lib/validate-output.js";
import { COMPETITIONS } from "../src/config/competitions.js";

const AFL = COMPETITIONS.find((c) => c.key === "afl");

function stubFetch(status, body) {
  return async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => (typeof body === "string" ? JSON.parse(body) : body),
  });
}

test("fetchAndValidate throws on HTTP error (docs/ stays untouched)", async () => {
  await assert.rejects(() => fetchAndValidate(AFL, stubFetch(503, null)), /HTTP 503/);
});

test("fetchAndValidate throws on invalid JSON", async () => {
  await assert.rejects(
    () => fetchAndValidate(AFL, stubFetch(200, "not json{{{")),
    /invalid JSON/,
  );
});

test("fetchAndValidate throws on schema violation", async () => {
  await assert.rejects(
    () => fetchAndValidate(AFL, stubFetch(200, [{ MatchNumber: "x" }])),
    /MatchNumber/,
  );
});

test("validateStagedIcs rejects duplicate UIDs", () => {
  const ics = "BEGIN:VCALENDAR\r\nUID:a@x\r\nBEGIN:VEVENT\r\nUID:dup@x\r\nEND:VEVENT\r\nBEGIN:VEVENT\r\nUID:dup@x\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n";
  assert.throws(() => validateStagedIcs("test.ics", ics), /duplicate UIDs/);
});

test("validateStagedIcs rejects over-long lines", () => {
  const ics = `BEGIN:VCALENDAR\r\n${"X".repeat(76)}\r\nEND:VCALENDAR\r\n`;
  assert.throws(() => validateStagedIcs("test.ics", ics), /75 octets/);
});

test("validateStagedIcs rejects unbalanced VEVENT blocks", () => {
  const ics = "BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nEND:VCALENDAR\r\n";
  // header check passes (starts correctly) but footer/structure fails
  assert.throws(() => validateStagedIcs("test.ics", ics));
});
