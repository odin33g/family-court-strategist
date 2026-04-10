# Vault File Templates

Reference content for the case-setup skill. When creating a new vault, use these as the basis for each file.

## YAML Frontmatter Standard

Every document in the vault should include:

```yaml
---
date: YYYY-MM-DD
type: incident / communication / legal / evidence / pattern / strategy
event_id: EVT-### / COM-### / ORD-### / LTR-### / AFF-### / PAT-### / STR-###
people: []
issue: []
source_file: 
reliability: primary / secondary / analysis
---
```

## Event ID System

| Prefix | Type |
|--------|------|
| EVT-### | Incidents |
| COM-### | Communications |
| ORD-### | Court orders |
| LTR-### | Legal letters |
| AFF-### | Affidavit claims |
| PAT-### | Patterns |
| STR-### | Strategy notes |

## Evidence Strength Ratings

- ★★★ Strong — Multiple independent sources, professional findings, documentary evidence
- ★★☆ Moderate — Single credible source, consistent with pattern, some corroboration
- ★☆☆ Weak — Single party claim, no corroboration, potentially self-serving

## Document Analysis Status Codes

- PROVEN — Multiple independent sources confirm
- DISPUTED — Evidence on both sides
- UNRESOLVED — Insufficient evidence either way
- DISPROVEN — Evidence contradicts the claim

## Key Obsidian Plugins Needed

- **Dataview** (community plugin) — Required for the Dashboard queries
- **Templates** (core plugin) — For using the document templates
