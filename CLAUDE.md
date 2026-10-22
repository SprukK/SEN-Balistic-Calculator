# CLAUDE.md — SEN Main App (SprukK/SEN-Balistic-Calculator)

Standing instructions for Claude working in this repo.

## Read first

All project work happens in the **"SEN - Ballistic Calculator" Claude Project** (web chat). Its knowledge holds the authoritative docs:

| Task | Doc in Project knowledge |
|---|---|
| Rules for everything | `PROJECT_INSTRUCTIONS_V7` (also pasted into the Project instructions) |
| Any ballistic calculation or physics code | `SEN-BALLISTICS-SKILL.md` |
| Any code at all | `clean-code-rules.md` |
| Proposing or building a feature | `claude/SEN-Feature-Register.md` (check status and ID first) |

If this file and V7 disagree, V7 wins. Do not recall ballistic equations from memory without checking the skill.

## What lives where

- **This repo:** app code, `tests/`, and `SEN-Patch-Log.md` (the single changelog).
- **Project knowledge:** documents only — never app code (register decision A-08).
- **Lab app:** separate repo `SprukK/SEN-Testing` (BLE probes, module testers). Modules move here only after passing the graduation checklist (register LAB-07).
- Deployment: https://sprukk.github.io/SEN-Balistic-Calculator/
- Legacy repo (archived, history migrated): github.com/lnQNtrol/SEN-Balistic-Calcutalor

## Non-negotiable rules (summary — full text in V7)

1. **Never build without an explicit "go".** Present the plan, wait.
2. **Single-file HTML PWA, no build step.** No bundler, no node_modules committed.
3. **Minimal change.** Touch only what the task needs. No refactoring, renaming or reformatting unrelated code. No abstraction for hypothetical needs.
4. **Formula integrity first (§20A).** Every formula is verified against an external authority and an independent reproduction before it ships. Trust the reproduced number over any stated anchor.
5. **§9H BC convention.** SD = mass_gr / (7000·d_in²), with no π/4 term; the area-based formula inflates BC by 4/π = 1.273. BC[kg/m²] = BC[lb/in²] × 703.07. Anchor: Altaros Queen .25 G7 0.128 = 90.0 kg/m².
6. **Stability constant C is calibre-specific and never interpolated or transferred.** Outside the verified range, Sg is "not computed".
7. **Security.** No `innerHTML` sinks; JSON import uses schema-whitelist sanitisation.
8. **Metric first.** Mass always grains, BC always lb/in².

## Verification (every change)

See `tests/README.md` for the exact commands.

- `node --check` on the extracted script.
- `tests/runtests.js` — 20 physics anchors, all green.
- **Any change to navigation, sheets or event wiring also runs `tests/domtest.js`** (real-DOM jsdom click test).
- If a change alters what a test asserts, update the test in the same commit.
- `index.html` must be byte-identical to the versioned HTML.

## Release checklist

Semantic versioning: **patch** = bug fix · **minor** = feature or feature upgrade · **major** = architecture change.

1. Bump **live version strings only** (title, header, settings note, export `app:` fields) — never comment annotations.
2. Bump `sw.js` CACHE (`sen-ballistics-vX.Y.Z`) in the same commit.
3. Run the tests → all green.
4. Commit together:
   - `RTI-SEN-Ballistic-Calculator-V{major}.{minor}.{patch}.html`
   - byte-identical `index.html`
   - `sw.js`
   - `SEN-Patch-Log.md` with the new entry on top
5. Update the Feature Register status in Project knowledge.

## Git workflow

- Commit message format: `[V{version}] {what changed} — {Calc|Bench|Core}`
- Before any commit, show `git status` and `git diff --stat`.
- **Never push without explicit confirmation.** Confirm what will be pushed first.
- Never use `sudo` with npm.
