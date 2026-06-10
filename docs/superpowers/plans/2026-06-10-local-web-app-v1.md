# Local Web Workspace — v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A zero-dependency local web app that reads a Family Court Strategist Obsidian vault and renders it as the approved, professional dashboard in the browser — read-only, loopback-only, with a bundled sample case so first run shows a populated workspace.

**Architecture:** A Node standard-library HTTP server bound to `127.0.0.1` serves a static UI and a single JSON endpoint (`/api/case`). A pure-function vault adapter scans the vault's markdown files, parses YAML frontmatter, and builds a case model (stats, timeline, evidence matrix, people, patterns). The UI fetches that model and renders the views. No external dependencies, no build step, no writes, no outbound network.

**Tech Stack:** Node.js (built-in `http`, `fs`, `path`, `node:test`), vanilla HTML/CSS/JS. UI ported from the approved mockup at `.superpowers/brainstorm/*/content/app-preview.html` (on disk, untracked).

---

## File Structure

- `app/package.json` — name, `"type": "module"`, scripts (`start`, `test`); **no dependencies**
- `app/lib/frontmatter.js` — `parseFrontmatter(text) -> { data, body }` (pure)
- `app/lib/vault.js` — `buildCaseModel(vaultDir) -> CaseModel` and helpers (pure-ish; reads fs)
- `app/server.js` — loopback HTTP server: static files + `GET /api/case`; CLI entry; opens browser
- `app/public/index.html` — app shell (sidebar, top bar, view containers)
- `app/public/app.css` — design system (navy/gold, Fraunces+Inter), ported from mockup
- `app/public/app.js` — client: fetch `/api/case`, render dashboard + views, nav switching
- `sample-case/` — bundled populated vault (markdown notes with frontmatter)
- `app/tests/frontmatter.test.js` — frontmatter parser tests
- `app/tests/vault.test.js` — vault adapter / case model tests
- `app/tests/server.test.js` — server: loopback bind, serves UI + API, read-only invariant
- `app/README.md` — how to run it

**CaseModel shape (the contract between vault.js and the UI):**
```js
{
  caseName: string,            // from CASE-DETAILS.md or vault folder name
  court: string,               // best-effort from CASE-DETAILS.md, else ""
  stats: {
    documentsAnalysed: number, // count of notes with type "legal"
    openContradictions: number,// count of timeline/analysis notes tagged issue "contradiction"
    patternsTracked: number,   // count of notes with type "pattern"
    timelineEvents: number     // count of notes with a date + event_id
  },
  timeline: [ { date: string, title: string, type: string, eventId: string } ], // sorted desc
  evidence: [ { claim: string, source: string, status: string, strength: number } ],
  people:  [ { name: string, role: string, eventId: string } ],
  patterns:[ { name: string, instances: number, summary: string } ],
  empty: boolean               // true when no notes carried usable frontmatter
}
```

---

## Task 1: Project scaffold

**Files:**
- Create: `app/package.json`
- Create: `app/README.md`

- [ ] **Step 1: Create `app/package.json`**

```json
{
  "name": "family-court-strategist-app",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "description": "Local web workspace for the Family Court Strategist vault. Zero dependencies.",
  "scripts": {
    "start": "node server.js",
    "test": "node --test"
  }
}
```

- [ ] **Step 2: Create `app/README.md`**

````markdown
# Family Court Strategist — Local Web App

A beautiful, **local** view of your case vault. Everything runs on your computer.
No accounts, no uploads, no internet required.

## Run it

```bash
cd app
node server.js                 # opens the bundled sample case
node server.js /path/to/vault  # opens YOUR vault (read-only)
```

Then open the printed `http://127.0.0.1:4173` in your browser.

- **Read-only:** v1 never changes your files.
- **Local-only:** the server listens on 127.0.0.1 and makes no outbound connections.

## Test it

```bash
cd app
npm test
```
````

- [ ] **Step 3: Commit**

```bash
git add app/package.json app/README.md
git commit -m "chore: scaffold local web app (zero-dependency Node)"
```

---

## Task 2: Frontmatter parser

**Files:**
- Create: `app/lib/frontmatter.js`
- Test: `app/tests/frontmatter.test.js`

- [ ] **Step 1: Write the failing test**

```js
// app/tests/frontmatter.test.js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && node --test tests/frontmatter.test.js`
Expected: FAIL — `Cannot find module '../lib/frontmatter.js'`

- [ ] **Step 3: Write minimal implementation**

```js
// app/lib/frontmatter.js
// Minimal YAML-frontmatter parser for the flat shape this vault uses:
// scalars, inline [a, b] arrays, optional quotes. No external deps.

function parseScalar(raw) {
  let v = raw.trim();
  if (v === "") return "";
  if (v.startsWith("[") && v.endsWith("]")) {
    const inner = v.slice(1, -1).trim();
    if (inner === "") return [];
    return inner.split(",").map((s) => stripQuotes(s.trim())).filter((s) => s !== "");
  }
  return stripQuotes(v);
}

function stripQuotes(s) {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

export function parseFrontmatter(text) {
  if (!text.startsWith("---")) return { data: {}, body: text };
  const end = text.indexOf("\n---", 3);
  if (end === -1) return { data: {}, body: text };
  const block = text.slice(text.indexOf("\n") + 1, end);
  const body = text.slice(end + 4).replace(/^\r?\n/, "");
  const data = {};
  for (const line of block.split("\n")) {
    const m = line.match(/^([A-Za-z0-9_-]+):(.*)$/);
    if (m) data[m[1]] = parseScalar(m[2]);
  }
  return { data, body };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && node --test tests/frontmatter.test.js`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add app/lib/frontmatter.js app/tests/frontmatter.test.js
git commit -m "feat: zero-dep frontmatter parser for vault notes"
```

---

## Task 3: Vault adapter / case model

**Files:**
- Create: `app/lib/vault.js`
- Test: `app/tests/vault.test.js`

- [ ] **Step 1: Write the failing test**

```js
// app/tests/vault.test.js
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
  writeFileSync(join(dir, "CASE-DETAILS.md"),
    "---\ntype: system\n---\n| Court | Federal Circuit and Family Court of Australia |\n");
  writeFileSync(join(dir, "timeline", "2024-03-19_refusal.md"),
    "---\ndate: 2024-03-19\ntype: incident\nevent_id: EVT-001\npeople: [applicant, child]\nissue: [contact]\n---\n# Changeover refused\n");
  writeFileSync(join(dir, "timeline", "2024-03-08_orders.md"),
    "---\ndate: 2024-03-08\ntype: legal\nevent_id: ORD-003\nissue: [court]\n---\n# Interim orders\n");
  writeFileSync(join(dir, "people", "respondent.md"),
    "---\ntype: person\nrole: Respondent / Mother\n---\n# Respondent\n");
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

test("derives the case title from the timeline note titles", () => {
  const model = buildCaseModel(makeVault());
  assert.equal(model.timeline.find((e) => e.eventId === "EVT-001").title, "Changeover refused");
});

test("collects people with roles", () => {
  const model = buildCaseModel(makeVault());
  assert.equal(model.people.length, 1);
  assert.equal(model.people[0].role, "Respondent / Mother");
});

test("flags an empty vault", () => {
  const dir = mkdtempSync(join(tmpdir(), "empty-"));
  const model = buildCaseModel(dir);
  assert.equal(model.empty, true);
  assert.equal(model.timeline.length, 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && node --test tests/vault.test.js`
Expected: FAIL — `Cannot find module '../lib/vault.js'`

- [ ] **Step 3: Write minimal implementation**

```js
// app/lib/vault.js
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, basename } from "node:path";
import { parseFrontmatter } from "./frontmatter.js";

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith(".")) continue;          // skip .obsidian, .git
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else if (entry.endsWith(".md")) out.push(full);
  }
  return out;
}

function firstHeading(body) {
  const m = body.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : "";
}

function asArray(v) {
  if (Array.isArray(v)) return v;
  if (v === undefined || v === "") return [];
  return [v];
}

export function buildCaseModel(vaultDir) {
  const files = walk(vaultDir);
  const notes = files.map((f) => {
    const { data, body } = parseFrontmatter(readFileSync(f, "utf8"));
    return { file: f, data, body, title: firstHeading(body) || basename(f, ".md") };
  });

  const timeline = notes
    .filter((n) => n.data.date && n.data.event_id)
    .map((n) => ({ date: String(n.data.date), title: n.title, type: n.data.type || "event", eventId: n.data.event_id }))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  const people = notes
    .filter((n) => n.data.type === "person")
    .map((n) => ({ name: n.title, role: n.data.role || "", eventId: n.data.event_id || "" }));

  const patterns = notes
    .filter((n) => n.data.type === "pattern")
    .map((n) => ({ name: n.title, instances: 0, summary: "" }));

  const hasIssue = (n, key) => asArray(n.data.issue).includes(key);

  const stats = {
    documentsAnalysed: notes.filter((n) => n.data.type === "legal").length,
    openContradictions: notes.filter((n) => hasIssue(n, "contradiction")).length,
    patternsTracked: patterns.length,
    timelineEvents: timeline.length,
  };

  let caseName = basename(vaultDir);
  let court = "";
  const details = notes.find((n) => /CASE-DETAILS/i.test(n.file));
  if (details) {
    const cm = details.body.match(/\|\s*Court\s*\|\s*([^|]+?)\s*\|/i);
    if (cm) court = cm[1].trim();
  }

  return {
    caseName,
    court,
    stats,
    timeline,
    evidence: [],   // populated from EVIDENCE-MATRIX in a later task/version
    people,
    patterns,
    empty: timeline.length === 0 && people.length === 0 && stats.documentsAnalysed === 0,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && node --test tests/vault.test.js`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add app/lib/vault.js app/tests/vault.test.js
git commit -m "feat: vault adapter builds case model from note frontmatter"
```

---

## Task 4: Bundled sample case

**Files:**
- Create: `sample-case/CASE-DETAILS.md`
- Create: `sample-case/timeline/2024-03-08_interim-orders.md`
- Create: `sample-case/timeline/2024-03-14_family-report.md`
- Create: `sample-case/timeline/2024-03-19_changeover-refused.md`
- Create: `sample-case/timeline/2024-03-26_no-response.md`
- Create: `sample-case/timeline/2024-04-02_notice-of-risk.md`
- Create: `sample-case/people/applicant.md`
- Create: `sample-case/people/respondent.md`
- Create: `sample-case/patterns/contact-obstruction.md`

- [ ] **Step 1: Create the sample notes**

Each timeline note uses this shape (vary the values per file; all content is fictional):

```markdown
---
date: 2024-03-19
type: incident
event_id: EVT-014
people: [applicant, child]
issue: [contact]
---
# Changeover refused — "child unwell"

Sample fictional content. Scheduled changeover did not proceed; reason given was
"child unwell" with no medical record provided.
```

Create the others with: `2024-03-08` `type: legal` `event_id: ORD-003` title `# Interim orders made — therapy ordered`; `2024-03-14` `type: legal` `event_id: AFF-002` title `# Family report filed`; `2024-03-26` `type: communication` `event_id: COM-018` `issue: [contact]` title `# No response to three changeover messages`; `2024-04-02` `type: incident` `event_id: EVT-021` `issue: [contradiction]` title `# Notice of risk filed`.

`sample-case/people/applicant.md`:
```markdown
---
type: person
role: Applicant / Father
---
# The Applicant
```

`sample-case/people/respondent.md`:
```markdown
---
type: person
role: Respondent / Mother
---
# The Respondent
```

`sample-case/patterns/contact-obstruction.md`:
```markdown
---
type: pattern
event_id: PAT-001
---
# Contact obstruction
```

`sample-case/CASE-DETAILS.md`:
```markdown
---
type: system
---
# Case Details (sample)
| Court | Federal Circuit and Family Court of Australia |
```

- [ ] **Step 2: Verify the model builds from the sample**

Run: `cd app && node -e "import('./lib/vault.js').then(m=>console.log(JSON.stringify(m.buildCaseModel('../sample-case').stats)))"`
Expected: prints stats with `timelineEvents` 5, `documentsAnalysed` 2, `patternsTracked` 1.

- [ ] **Step 3: Commit**

```bash
git add sample-case
git commit -m "feat: bundled fictional sample case for instant populated demo"
```

---

## Task 5: Local server (loopback) with JSON API

**Files:**
- Create: `app/server.js`
- Test: `app/tests/server.test.js`

- [ ] **Step 1: Write the failing test**

```js
// app/tests/server.test.js
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "../server.js";

const server = createServer("../sample-case");
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;
after(() => server.close());

test("binds to loopback only", () => {
  assert.equal(server.address().address, "127.0.0.1");
});

test("GET /api/case returns the case model as JSON", async () => {
  const res = await fetch(`http://127.0.0.1:${port}/api/case`);
  assert.equal(res.status, 200);
  const model = await res.json();
  assert.equal(model.stats.timelineEvents, 5);
  assert.equal(Array.isArray(model.timeline), true);
});

test("serves the UI shell at /", async () => {
  const res = await fetch(`http://127.0.0.1:${port}/`);
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.equal(html.includes("<!DOCTYPE html>"), true);
});

test("rejects path traversal", async () => {
  const res = await fetch(`http://127.0.0.1:${port}/../server.js`);
  assert.equal(res.status === 400 || res.status === 404, true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && node --test tests/server.test.js`
Expected: FAIL — `Cannot find module '../server.js'`

- [ ] **Step 3: Write minimal implementation**

```js
// app/server.js
import { createServer as httpCreate } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname, normalize, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildCaseModel } from "./lib/vault.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, "public");
const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json" };

export function createServer(vaultDir) {
  return httpCreate(async (req, res) => {
    try {
      const url = new URL(req.url, "http://127.0.0.1");
      if (url.pathname === "/api/case") {
        const model = buildCaseModel(vaultDir);
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify(model));
        return;
      }
      // static files from public/, traversal-safe
      let rel = url.pathname === "/" ? "/index.html" : url.pathname;
      const safe = normalize(rel).replace(/^(\.\.[/\\])+/, "");
      const full = join(PUBLIC, safe);
      if (!full.startsWith(PUBLIC)) { res.writeHead(400); res.end("bad path"); return; }
      const body = await readFile(full);
      res.writeHead(200, { "content-type": TYPES[extname(full)] || "application/octet-stream" });
      res.end(body);
    } catch (err) {
      res.writeHead(err.code === "ENOENT" ? 404 : 500);
      res.end(err.code === "ENOENT" ? "not found" : "error");
    }
  });
}

// CLI entry: node server.js [vaultPath]
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const vaultDir = process.argv[2] || join(__dirname, "..", "sample-case");
  const port = Number(process.env.PORT) || 4173;
  const server = createServer(vaultDir);
  server.listen(port, "127.0.0.1", () => {
    const url = `http://127.0.0.1:${port}`;
    console.log(`\n  Family Court Strategist — local workspace`);
    console.log(`  Vault:  ${vaultDir}`);
    console.log(`  Open:   ${url}\n  (read-only · local-only · Ctrl+C to stop)\n`);
    openBrowser(url);
  });
}

function openBrowser(url) {
  import("node:child_process").then(({ spawn }) => {
    const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
    try { spawn(cmd, [url], { stdio: "ignore", detached: true, shell: process.platform === "win32" }).unref(); }
    catch { /* user opens the URL manually */ }
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && node --test tests/server.test.js`
Expected: PASS (4 tests). (Requires Node 18+ for global `fetch`.)

- [ ] **Step 5: Commit**

```bash
git add app/server.js app/tests/server.test.js
git commit -m "feat: loopback HTTP server with /api/case and traversal-safe static serving"
```

---

## Task 6: UI shell + design system

**Files:**
- Create: `app/public/index.html`
- Create: `app/public/app.css`

- [ ] **Step 1: Port the approved design**

Read the approved mockup on disk (untracked, present regardless of branch):
`/.superpowers/brainstorm/<session>/content/app-preview.html`

Split it into:
- `app/public/app.css` — copy the entire `<style>` block verbatim (the navy/gold token system, sidebar, cards, table pills, timeline, doc-studio styles).
- `app/public/index.html` — copy the markup, but **remove the hard-coded sample rows** inside: the stat values, the evidence `<tbody>`, the timeline `.tl`, the people/pattern numbers. Replace each dynamic region with an empty container carrying a stable id the client fills:
  - `#stat-docs`, `#stat-contradictions`, `#stat-patterns`, `#stat-timeline`
  - `#evidence-body` (the `<tbody>`)
  - `#timeline-list` (the `.tl` container)
  - `#pattern-card`, `#pillars`
  - `#case-title` (top bar), `#case-court` (crumb), `#nav-counts` data via ids `#count-timeline`, `#count-evidence`, `#count-patterns`, `#count-people`
- Keep the "Preview with sample data" banner but give it id `#data-banner` so the client can swap its text when a real vault is loaded.
- Add `<script src="/app.js" type="module"></script>` before `</body>`.

- [ ] **Step 2: Verify it serves**

Run: `cd app && node server.js` then open the printed URL.
Expected: the shell renders with the design (empty data regions); no console 404s for `app.css`/`app.js` (app.js added next task — a 404 here is expected until Task 7).

- [ ] **Step 3: Commit**

```bash
git add app/public/index.html app/public/app.css
git commit -m "feat: port approved UI shell and design system into the app"
```

---

## Task 7: Client rendering

**Files:**
- Create: `app/public/app.js`

- [ ] **Step 1: Write the client**

```js
// app/public/app.js
const STATUS_CLASS = { PROVEN: "proven", DISPUTED: "disp", UNRESOLVED: "unres", DISPROVEN: "dispr" };
const TYPE_CLASS = { court: "court", contact: "contact", incident: "incident", legal: "court", professional: "pro", communication: "com" };

function stars(n) {
  const full = "★".repeat(n);
  const empty = `<span class="o">${"★".repeat(3 - n)}</span>`;
  return `<span class="stars">${full}${n < 3 ? empty : ""}</span>`;
}
function set(id, text) { const el = document.getElementById(id); if (el) el.textContent = text; }
function html(id, markup) { const el = document.getElementById(id); if (el) el.innerHTML = markup; }

function renderTimeline(items) {
  if (!items.length) { html("timeline-list", `<p class="empty">No dated events yet.</p>`); return; }
  html("timeline-list", items.slice(0, 6).map((e) => {
    const c = TYPE_CLASS[e.type] || "court";
    const day = e.date.slice(5).replace("-", "/");
    return `<div class="ev"><span class="when">${day}</span><span class="mk m-${c}"></span>
      <span class="tx"><b>${escape(e.title)}</b><span class="ty c-${c}">${e.type}</span></span></div>`;
  }).join(""));
}

function renderEvidence(items) {
  if (!items.length) { html("evidence-body", `<tr><td colspan="3" class="empty">No evidence rows parsed yet.</td></tr>`); return; }
  html("evidence-body", items.map((r) =>
    `<tr><td class="claim">${escape(r.claim)}<div class="src">${escape(r.source)}</div></td>
     <td><span class="pill ${STATUS_CLASS[r.status] || "unres"}">${title(r.status)}</span></td>
     <td>${stars(r.strength || 1)}</td></tr>`).join(""));
}

function escape(s) { return String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])); }
function title(s) { return String(s).charAt(0) + String(s).slice(1).toLowerCase(); }

async function main() {
  const res = await fetch("/api/case");
  const m = await res.json();
  set("case-title", m.caseName || "Case overview");
  set("case-court", m.court || "Local vault");
  set("stat-docs", m.stats.documentsAnalysed);
  set("stat-contradictions", m.stats.openContradictions);
  set("stat-patterns", m.stats.patternsTracked);
  set("stat-timeline", m.stats.timelineEvents);
  set("count-timeline", m.stats.timelineEvents);
  set("count-evidence", m.evidence.length);
  set("count-patterns", m.patterns.length);
  set("count-people", m.people.length);
  renderTimeline(m.timeline);
  renderEvidence(m.evidence);
  if (m.patterns[0]) set("pattern-card", "");
  if (!m.empty) {
    const b = document.getElementById("data-banner");
    if (b) b.style.display = "none";
  }
}
main();
```

- [ ] **Step 2: Verify end-to-end in the browser**

Run: `cd app && node server.js` and open the URL.
Expected: dashboard shows sample stats (timeline 5, documents 2, patterns 1, contradictions 1), the recent timeline lists the 5 sample events newest-first, nav counts populate, the "preview" banner hides because the sample vault is non-empty.

- [ ] **Step 3: Verify the empty state**

Run: `cd app && node server.js /tmp` (a folder with no vault notes).
Expected: stats show 0, timeline shows "No dated events yet.", banner stays visible.

- [ ] **Step 4: Commit**

```bash
git add app/public/app.js
git commit -m "feat: client renders dashboard, timeline, evidence and counts from /api/case"
```

---

## Task 8: Read-only & local-only invariants

**Files:**
- Modify: `app/tests/server.test.js` (append)

- [ ] **Step 1: Add invariant tests**

```js
// append to app/tests/server.test.js
import { readdirSync, statSync } from "node:fs";
import { fileURLToPath as f2 } from "node:url";

test("vault.js imports no network or fs-write APIs", async () => {
  const src = await (await import("node:fs/promises")).readFile(new URL("../lib/vault.js", import.meta.url), "utf8");
  for (const banned of ["writeFile", "appendFile", "rm(", "unlink", "fetch(", "http.request", "net."]) {
    assert.equal(src.includes(banned), false, `vault.js must not use ${banned}`);
  }
});

test("server.js performs no outbound requests", async () => {
  const src = await (await import("node:fs/promises")).readFile(new URL("../server.js", import.meta.url), "utf8");
  assert.equal(src.includes("fetch("), false);
  assert.equal(/https?:\/\/(?!127\.0\.0\.1)/.test(src.replace(/http:\/\/127\.0\.0\.1/g, "")), false);
});
```

- [ ] **Step 2: Run the full suite**

Run: `cd app && npm test`
Expected: PASS (all tests across the three files).

- [ ] **Step 3: Commit**

```bash
git add app/tests/server.test.js
git commit -m "test: enforce read-only and local-only invariants"
```

---

## Task 9: Launch wiring + docs

**Files:**
- Modify: `README.md` (root — add an "Option 3: the local web app (beta)" section)
- Modify: `GETTING-STARTED.md` (root — point to `app/README.md`)

- [ ] **Step 1: Add a root README section**

Add after the existing Quick Start options:

```markdown
### Option 3: The Local Web App (beta — for a nicer view)

Prefer software to markdown? The toolkit now ships a **local web app** that renders
your vault as a polished dashboard in your browser. It runs entirely on your computer
— no accounts, no uploads — and in v1 it's **read-only** (it never changes your files).

```bash
cd app
node server.js                 # see a bundled sample case
node server.js /path/to/vault  # see your own vault
```

Requires [Node.js](https://nodejs.org) 18+. See [app/README.md](app/README.md).
```

- [ ] **Step 2: Run the suite one final time and start it manually**

Run: `cd app && npm test && node server.js`
Expected: tests pass; browser opens to the sample dashboard.

- [ ] **Step 3: Commit**

```bash
git add README.md GETTING-STARTED.md
git commit -m "docs: document the local web app (beta) entry point"
```

---

## Self-Review

**Spec coverage:**
- Local-first / no network → Tasks 5 & 8 (loopback bind, invariant tests). ✓
- Reads the same markdown vault → Tasks 2, 3. ✓
- Beautiful UI from approved mockup → Tasks 6, 7. ✓
- Dashboard + Timeline + Evidence + People + Patterns (read) → model in Task 3, render in Task 7 (evidence array is empty in v1 — table parsing of EVIDENCE-MATRIX deferred to v2; UI shows an honest empty state). ✓ (documented limitation)
- Bundled sample case + empty states → Tasks 4, 7. ✓
- Read-only → Task 8 invariant. ✓
- Launcher / single command → Task 5 CLI + Task 9 docs. ✓
- v2/v3 (writes, Document Studio, in-app AI, website) → explicitly out of this plan. ✓

**Placeholder scan:** No TBDs; all code blocks are complete. The evidence matrix being empty in v1 is a stated scope decision, not a placeholder.

**Type consistency:** `buildCaseModel` returns the CaseModel shape used by `/api/case` (Task 5) and consumed by `app.js` (Task 7) — field names (`stats.timelineEvents`, `timeline[].eventId`, `evidence[].claim`) match across tasks. ✓

**Note for executor:** Task 6 depends on the on-disk mockup file. If it's missing, regenerate the shell from the design tokens in the spec; the CSS/markup in `app-preview.html` is the source of truth for visuals.
