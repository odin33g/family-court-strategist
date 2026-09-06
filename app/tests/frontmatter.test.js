import { test } from "node:test";
import assert from "node:assert/strict";
import { parseFrontmatter } from "../lib/frontmatter.js";

test("parses simple key/value frontmatter", () => {
  const { data, body } = parseFrontmatter("---\ntype: incident\ndate: 2024-03-19\n---\nHello");
  assert.equal(data.type, "incident");
  assert.equal(data.date, "2024-03-19");
  assert.equal(body.trim(), "Hello");
});

test("parses inline arrays and quoted values", () => {
  const { data } = parseFrontmatter('---\npeople: [applicant, child]\nissue: ["contact", "contradiction"]\n---\n');
  assert.deepEqual(data.people, ["applicant", "child"]);
  assert.deepEqual(data.issue, ["contact", "contradiction"]);
});

test("returns empty data when no frontmatter present", () => {
  const { data, body } = parseFrontmatter("# Just a heading\ntext");
  assert.deepEqual(data, {});
  assert.equal(body.startsWith("# Just a heading"), true);
});
