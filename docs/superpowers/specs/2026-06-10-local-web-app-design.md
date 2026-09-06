# Design — Local Web Workspace ("the beautiful face of the vault")

**Date:** 2026-06-10
**Status:** Approved (design direction), ready for implementation planning
**Branch:** `feat/local-web-app`

---

## Problem

The toolkit today is markdown opened in Obsidian. That's powerful but it scares non-technical parents — installing Obsidian, enabling Dataview, editing raw markdown and YAML frontmatter is a wall. Most dads who need this will bounce off it. They need the same methodology presented as **software that looks and feels professional**, and they need **court-ready documents** (chronologies, evidence summaries, solicitor letters) out the other end.

## Goal

A beautiful local web application that turns a parent's Obsidian vault — and their own Claude — into a polished, court-ready case workspace, **without anything ever leaving their computer**.

## Non-negotiable constraints (decided in brainstorming)

1. **Local-first.** Case data (children's names, allegations, court documents) never leaves the user's device. No servers, no accounts, no uploads, no telemetry. This is both an ethical line and what the toolkit's own privacy guidance demands.
2. **Uses the user's own Claude.** No API key required in the common path; the AI is powered by the user's existing Claude subscription via the plugin / Claude Code. (Optional bring-your-own-API-key mode is a secondary path, not the front door.)
3. **The vault stays the single source of truth.** The app reads and writes the *same* Obsidian markdown + YAML frontmatter files. Obsidian and the app are two windows onto one vault and must never corrupt each other's files.

## Architecture — one vault, three faces

```
                        ┌─────────────────────────┐
                        │   THE VAULT (markdown)   │  ← single source of truth
                        │  timeline / evidence /   │
                        │  people / analyses /…    │
                        └───────────┬─────────────┘
            ┌───────────────────────┼───────────────────────┐
            ↕                       ↕                         ↕
        Obsidian              The Web App                His Claude
      (optional,          (we build this — a          (side-by-side now;
       power users)        local server + UI           in-app buttons later)
                           on localhost)
                                    │
                                    ↓
                         Document Studio → PDF
                  (chronology, evidence summary, letters)

        🔒 everything above runs on his machine — no network egress
```

### Components

- **Launcher** — a plugin command/skill (`open my case`) and/or a CLI entry (`node app/server.js <vault-path>`) that starts the local server and opens the browser. Falls back to a plain command for non-plugin users.
- **Local server** — reads a configured vault directory; parses markdown + YAML frontmatter; exposes a small local HTTP/JSON interface to the UI; writes changes back as valid markdown. Binds to `127.0.0.1` only.
- **Web UI** — the designed interface (navy/gold legal aesthetic, Fraunces + Inter, light theme; see `app-preview.html` mockup). Views: Dashboard, Timeline, Evidence Matrix, Patterns, People, Documents, Legal Research.
- **Vault adapter** — the read/write layer that maps markdown files ⇄ structured objects the UI renders. The contract: the app must round-trip a file without destroying Obsidian-authored content (preserve unknown frontmatter keys and body prose).
- **Document Studio** — renders selected vault data into court-ready HTML templates, exported to PDF locally.
- **AI bridge** — Phase 1: none in-app (user works side-by-side in Claude; UI live-reloads when files change). Phase 3: a local bridge that invokes the user's Claude Code headless to run analyses from in-app buttons.
- **Sample case** — a bundled, clearly-fictional populated vault so a new user sees the workspace full of realistic content on first run (and for empty real vaults, friendly onboarding/empty states).

### Tech choices

- **Node local server, minimal dependencies, no build step** where feasible — so a non-technical user (and the plugin) can launch it with a single command and no `npm install` ceremony. Prefer the standard library + a tiny, vetted set of deps only where they clearly earn their place (e.g. a markdown/frontmatter parser, an HTML→PDF renderer).
- **Vanilla or lightweight front-end** served by the local server. No SPA framework unless it clearly pays for itself; the mockup is achievable with plain HTML/CSS/JS.
- **PDF generation** happens locally (HTML→PDF). No external rendering service.
- **No database** — the filesystem (the vault) is the entire backend.
- **Read-only first.** The app must never be the cause of data loss; writes come in Phase 2 behind round-trip tests.

## Scope — phased

### v1 — "The vault, beautiful" (the foundation)
- Launcher starts a localhost server and opens the browser
- Dashboard (case summary, stats, recent timeline, flagged pattern, case pillars)
- **Read** views: Timeline, Evidence Matrix, People, Patterns — rendered live from the real vault markdown
- Bundled **sample case** for an instant populated demo; friendly empty states for a blank vault
- The approved design system, baked in
- **Side-by-side AI**: the user works in Claude; the UI live-reloads as files change. No new auth.
- Reads the real vault path; **read-only** (cannot corrupt files)

### v2 — "It writes back"
- Editable forms (add incident, log communication, update a person) that write valid markdown + frontmatter back, preserving existing content (guarded by round-trip tests)
- **Document Studio v1**: a court-ready **chronology PDF** + one **solicitor letter** template

### v3 — "Seamless + powerful"
- In-app "Analyze / Find contradictions" buttons via Claude Code headless (uses the subscription, still no API key)
- Full Document Studio (evidence summaries, hearing bundles)
- Optional **bring-your-own-API-key** mode for users without Claude desktop
- The polished **community website** + one-click installer (the front door for a "random dude")

## Out of scope (YAGNI)
- Hosted accounts / cloud sync / any server we operate
- Multi-user collaboration
- Mobile apps
- Anything that uploads case data anywhere

## Risks & mitigations
- **Data-loss risk on write** → read-only in v1; writes in v2 only behind round-trip preservation tests; never edit a file the app didn't fully parse.
- **"Uses his Claude" over-promise** → be explicit that Phase 1 is side-by-side (Claude desktop edits files; app reflects them); in-app AI (Phase 3) requires Claude Code installed.
- **Scope sprawl** → v1 is strictly read-only viewing; ship it before writes.
- **Non-technical launch friction** → single-command / one-click launcher and a bundled sample case so first run is value, not setup.
- **Privacy regression** → server binds to loopback only; no outbound network calls in v1; this is a tested invariant, not a hope.

## Success criteria for v1
- A user points the app at a vault folder, runs one command, and sees their real case rendered in the designed dashboard in the browser.
- With an empty/blank vault, they get clear onboarding instead of a broken-looking empty screen.
- The sample case renders fully and looks like the approved mockup.
- The server makes zero outbound network connections, and never modifies a vault file (v1 is read-only).
- Obsidian and the app can both open the same vault without conflict.
