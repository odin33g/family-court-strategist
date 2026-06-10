// Client: fetch the case model and render the dashboard. Read-only.
const STATUS_CLASS = { PROVEN: "proven", DISPUTED: "disp", UNRESOLVED: "unres", DISPROVEN: "dispr" };
const TYPE_CLASS = {
  court: "court", contact: "contact", incident: "incident",
  legal: "court", professional: "pro", communication: "com",
};

function set(id, text) { const el = document.getElementById(id); if (el) el.textContent = text; }
function html(id, markup) { const el = document.getElementById(id); if (el) el.innerHTML = markup; }
function esc(s) { return String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])); }
function titleCase(s) { return String(s).charAt(0).toUpperCase() + String(s).slice(1).toLowerCase(); }

function stars(n) {
  const full = "★".repeat(n);
  const empty = n < 3 ? `<span class="o">${"★".repeat(3 - n)}</span>` : "";
  return `<span class="stars">${full}${empty}</span>`;
}

function renderTimeline(items) {
  if (!items.length) { html("timeline-list", `<p class="empty">No dated events yet. Add notes with a date and event_id to build your timeline.</p>`); return; }
  html("timeline-list", items.slice(0, 6).map((e) => {
    const c = TYPE_CLASS[e.type] || "court";
    const day = e.date.length >= 10 ? e.date.slice(5).replace("-", "/") : e.date;
    return `<div class="ev"><span class="when">${esc(day)}</span><span class="mk m-${c}"></span>
      <span class="tx"><b>${esc(e.title)}</b><span class="ty c-${c}">${esc(e.type)}</span></span></div>`;
  }).join(""));
}

function renderEvidence(items) {
  if (!items.length) {
    html("evidence-body", `<tr><td colspan="3" class="empty">Evidence matrix parsing arrives in v2. For now, edit EVIDENCE-MATRIX.md in your vault.</td></tr>`);
    return;
  }
  html("evidence-body", items.map((r) =>
    `<tr><td class="claim">${esc(r.claim)}<div class="src">${esc(r.source)}</div></td>
     <td><span class="pill ${STATUS_CLASS[r.status] || "unres"}">${titleCase(r.status)}</span></td>
     <td>${stars(r.strength || 1)}</td></tr>`).join(""));
}

function renderPattern(patterns) {
  if (!patterns.length) { html("pattern-card", `<p class="empty">No patterns tracked yet.</p>`); return; }
  const p = patterns[0];
  html("pattern-card", `
    <div class="top"><span class="nm">${esc(p.name)}</span><span class="ct">tracked</span></div>
    <div class="desc">${esc(p.summary || "Log at least 3 dated instances to make this court-ready.")}</div>
    <div class="leg">Patterns become compelling at 3+ instances — two is coincidence, three is a pattern.</div>`);
}

function renderPillars() {
  // v1: the three case pillars as a framing aid (fills as evidence accrues in later versions).
  const pillars = [
    ["Child's best interests", "Build", "var(--amber)", 40],
    ["Credibility contrast", "Build", "var(--amber)", 40],
    ["System accountability", "Build", "var(--amber)", 40],
  ];
  html("pillars", pillars.map(([name, label, color, pct]) =>
    `<div class="plr"><div class="t"><span>${name}</span><span style="color:${color}">${label}</span></div>
     <div class="meter"><i style="width:${pct}%;background:${color}"></i></div></div>`).join(""));
}

function renderBanner(model) {
  const b = document.getElementById("data-banner");
  if (!b) return;
  if (model.empty) {
    b.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01" stroke-linecap="round"/></svg>
      <span><b>This vault looks empty.</b> Add notes with frontmatter (date, type, event_id) and they'll appear here. Nothing is uploaded.</span>`;
    return;
  }
  if (model.caseName === "sample-case") return; // keep the sample banner
  b.style.display = "none"; // real, populated vault
}

async function main() {
  let model;
  try {
    const res = await fetch("/api/case");
    model = await res.json();
  } catch {
    set("case-title", "Could not load vault");
    return;
  }
  set("case-name", model.caseName || "Case");
  set("case-title", model.court ? "Case overview" : (model.caseName || "Case overview"));
  set("case-court", model.court || "local vault");
  set("stat-docs", model.stats.documentsAnalysed);
  set("stat-contradictions", model.stats.openContradictions);
  set("stat-patterns", model.stats.patternsTracked);
  set("stat-timeline", model.stats.timelineEvents);
  set("count-timeline", model.stats.timelineEvents);
  set("count-evidence", model.evidence.length);
  set("count-patterns", model.patterns.length);
  set("count-people", model.people.length);
  renderTimeline(model.timeline);
  renderEvidence(model.evidence);
  renderPattern(model.patterns);
  renderPillars();
  renderBanner(model);
}
main();
