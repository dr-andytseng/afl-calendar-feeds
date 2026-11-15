// Validation of staged .ics output before anything is copied into docs/.

/** Checks one rendered calendar. Throws with a descriptive message on any problem. */
export function validateStagedIcs(relativePath, ics) {
  const problems = [];
  if (!ics.startsWith("BEGIN:VCALENDAR\r\n")) problems.push("missing VCALENDAR header");
  if (!ics.endsWith("END:VCALENDAR\r\n")) problems.push("missing VCALENDAR footer");
  const vevents = (ics.match(/BEGIN:VEVENT/g) ?? []).length;
  if (vevents !== (ics.match(/END:VEVENT/g) ?? []).length) problems.push("unbalanced VEVENT blocks");
  const uids = [...ics.matchAll(/^UID:(.+)$/gm)].map((m) => m[1].trim());
  if (new Set(uids).size !== uids.length) problems.push("duplicate UIDs within file");
  for (const rawLine of ics.split("\r\n")) {
    if (Buffer.byteLength(rawLine, "utf8") > 75) {
      problems.push(`line exceeds 75 octets: ${rawLine.slice(0, 40)}…`);
    }
  }
  if (problems.length) {
    throw new Error(`staged validation failed for ${relativePath}:\n  - ${problems.join("\n  - ")}`);
  }
  return vevents;
}
