import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildCaseModel } from "../lib/vault.js";

function makeVault() {
  const dir = mkdtempSync(join(tmpdir(), "vault-"));
  mkdirSync(join(dir, "timeline"));
  mkdirSync(join(dir, "people"));
  writeFileSync(
    join(dir, "CASE-DETAILS.md"),
    "---\ntype: system\n---\n| Court | Federal Circuit and Family Court of Australia |\n"
  );
  writeFileSync(
    join(dir, "timeline", "2024-03-19_refusal.md"),
    "---\ndate: 2024-03-19\ntype: incident\nevent_id: EVT-001\npeople: [applicant, child]\nissue: [contact]\n---\n# Changeover refused\n"
  );
  writeFileSync(
    join(dir, "timeline", "2024-03-08_orders.md"),
    "---\ndate: 2024-03-08\ntype: legal\nevent_id: ORD-003\nissue: [court]\n---\n# Interim orders\n"
  );
  writeFileSync(
    join(dir, "people", "respondent.md"),
    "---\ntype: person\nrole: Respondent / Mother\n---\n# Respondent\n"
  );
  return dir;
}

test("builds stats and a date-sorted timeline from frontmatter", () => {
  const model = buildCaseModel(makeVault());
  assert.equal(model.stats.timelineEvents, 2);
  assert.equal(model.stats.documentsAnalysed, 1); // type: legal
  assert.equal(model.timeline[0].date, "2024-03-19"); // newest first
  assert.equal(model.timeline[0].eventId, "EVT-001");
  assert.equal(model.empty, false);
});

test("derives note titles from the first heading", () => {
  const model = buildCaseModel(makeVault());
  assert.equal(model.timeline.find((e) => e.eventId === "EVT-001").title, "Changeover refused");
});

test("collects people with roles", () => {
  const model = buildCaseModel(makeVault());
  assert.equal(model.people.length, 1);
  assert.equal(model.people[0].role, "Respondent / Mother");
});

test("reads the court from CASE-DETAILS", () => {
  const model = buildCaseModel(makeVault());
  assert.equal(model.court, "Federal Circuit and Family Court of Australia");
});

test("flags an empty vault", () => {
  const dir = mkdtempSync(join(tmpdir(), "empty-"));
  const model = buildCaseModel(dir);
  assert.equal(model.empty, true);
  assert.equal(model.timeline.length, 0);
});
