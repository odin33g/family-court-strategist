---
type: system
---

# Analysis Framework

## Default Analysis Protocol
Every document processed through this system receives the full forensic treatment:

### MASTER ANALYSIS (Applied to every file)
1. FACTS — Only verifiable facts, no assumptions
2. CLAIMS — Who is saying what
3. EVIDENCE — What supports each claim, strength rating (strong/weak/none)
4. INCONSISTENCIES — Conflicting details (dates, times, actions)
5. CONTRADICTIONS — Direct conflicts between statements or records
6. DISCREPANCIES — Subtle differences or missing details
7. POTENTIALLY FALSE/MISLEADING — Unsupported or conflicting claims
8. PATTERNS — Repeated behaviours or themes
9. RISK & IMPACT — On child + legal implications
10. OPPORTUNITIES — Weakness in opposing side
11. FOLLOW-UP REQUIRED — Missing info/evidence
12. EVENT LINKING — Assign or match EVENT_ID
13. OBSIDIAN OUTPUT — Structured markdown with links + tags

### CROSS-DOCUMENT MODE
- Timeline conflicts (same event, different dates)
- Story evolution (how narratives change over time)
- Behaviour patterns across multiple sources
- Evidence gaps (what should exist but doesn't)
- Authority overreach (professionals exceeding their role)
- Language inconsistencies (same person, different phrasing)

### CRITICAL MODE
- Logical impossibilities
- Unsupported claims presented as fact
- Manipulative framing or loaded language
- Selective omissions (what was left out and why)
- Signs of coaching or influence on the child
- Flag anything that fails under cross-examination

## Event ID System
- EVT-### for incidents
- COM-### for communications
- ORD-### for court orders
- LTR-### for legal letters
- AFF-### for affidavit claims
- PAT-### for patterns
- STR-### for strategy notes

## Core Fields (Every Note)
Every document in the vault should include this YAML frontmatter:
```yaml
---
date: YYYY-MM-DD
type: incident / communication / legal / evidence / pattern / strategy
event_id: EVT-###
people: []
issue: []
source_file: 
reliability: primary / secondary / analysis
---
```

## Strength Ratings
- ★★★ Strong — Multiple independent sources, professional findings, documentary evidence
- ★★☆ Moderate — Single credible source, consistent with pattern, some corroboration
- ★☆☆ Weak — Single party claim, no corroboration, potentially self-serving

## How to Apply

### For Affidavits
Read paragraph by paragraph. For each claim: who made it, what evidence supports it, does anything contradict it? Flag every unsupported claim.

### For Expert Reports
Focus on: what the expert observed vs what they were told. Were all relevant people assessed? Do the recommendations follow from the findings? What was buried or downplayed?

### For Communications
Note: date, sender, recipient, tone, what was requested, what was the response (or lack of). Build the pattern of engagement vs avoidance.

### For Court Documents
Track: what was ordered, what was actually done, what was the gap? Every unfollowed recommendation is a potential argument.
