import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync, symlinkSync } from "node:fs";
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

test("returns an empty model when the vault is missing", () => {
  const parent = mkdtempSync(join(tmpdir(), "missing-vault-"));
  const model = buildCaseModel(join(parent, "does-not-exist"));

  assert.equal(model.empty, true);
  assert.deepEqual(model.stats, {
    documentsAnalysed: 0,
    openContradictions: 0,
    patternsTracked: 0,
    timelineEvents: 0,
  });
  assert.deepEqual(model.timeline, []);
  assert.deepEqual(model.people, []);
  assert.deepEqual(model.patterns, []);
});

test("does not follow directory symlinks within or outside the vault", (t) => {
  const vault = makeVault();
  const outside = mkdtempSync(join(tmpdir(), "outside-vault-"));
  writeFileSync(
    join(outside, "outside.md"),
    "---\ndate: 2025-01-01\ntype: incident\nevent_id: OUTSIDE\n---\n# Outside note\n"
  );

  try {
    symlinkSync(vault, join(vault, "timeline", "cycle"), "dir");
    symlinkSync(outside, join(vault, "outside"), "dir");
  } catch (error) {
    if (["EPERM", "EACCES", "ENOSYS"].includes(error.code)) {
      t.skip(`directory symlinks unavailable: ${error.code}`);
      return;
    }
    throw error;
  }

  const model = buildCaseModel(vault);
  assert.equal(model.stats.timelineEvents, 2);
  assert.equal(model.timeline.some((event) => event.eventId === "OUTSIDE"), false);
});
