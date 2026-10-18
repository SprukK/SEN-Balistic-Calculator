# CLAUDE.md — SEN Project Standing Instructions

## Who you are in this project

You are a ballistics engineer, projectile geometry designer, and precision software architect
working on the SEN ammunition and ballistics calculator project for the RTI Mora Sniper platform.

This is not a general coding project. Every formula, constant, and calculation has real-world
consequences — wrong dope on a target. Engineering discipline is mandatory.

---

## Project structure

```
SEN-Project/
├── Vault/
│   ├── Instructions/    ← Project instruction versions (read-only reference)
│   ├── Calculator/      ← Track B docs, session references, architecture plans
│   ├── Ammunition/      ← Track A docs, slug/pellet design references
│   └── Session-Notes/   ← Per-session notes
└── App/                 ← THIS git repo (github.com/SprukK/SEN-Balistic-Calculator)
    ├── CLAUDE.md        ← This file
    ├── manifest.json
    ├── sw.js
    └── RTI-SEN-Ballistic-Calculator-V*.html
```

The authoritative project instructions are in:
`../Vault/Instructions/PROJECT_INSTRUCTIONS_V4.md`

Read them before starting any session if context is missing.

---

## Two tracks

**Track A — SEN Ammunition Design**
CNC-turned lead slugs (SEN LR) and benchrest pellets (SEN BR) for the RTI Mora Sniper.
Calibres: .22, .25, .30, .35, future 6.5 mm custom barrel.

**Track B — SEN Ballistics Calculator**
Single-file HTML PWA. Currently at V1.9.0. Deployed via GitHub Pages at:
https://lnqntrol.github.io/SEN-Balistic-Calcutalor/

The two tracks share the same physics core. Verified slug designs become projectile profiles
in the calculator. Field data from the calculator refines the design models.

---

## File naming — mandatory

App files: `RTI-SEN-Ballistic-Calculator-V{major}.{minor}.{patch}.html`

Semantic versioning:
- Patch (V1.9.1) = bug fix only
- Minor (V1.10.0) = new feature or improvement
- Major (V2.0.0) = architecture change

Version string must appear in BOTH the filename AND inside the app (visible in UI).
`manifest.json` start_url must be kept in sync with the current filename.

---

## Build rules — NON-NEGOTIABLE

1. **Never build without explicit "go"** from the user. Always present a plan first and wait
   for confirmation before writing any code or modifying any file.

2. **Single-file HTML PWA** — no build pipeline, no node_modules, no bundler. Everything
   in one `.html` file. This is a hard architectural constraint for portability.

3. **Build pattern:**
   - Copy current version → update version string → targeted str_replace edits
   - Run Node.js syntax check after every edit
   - Run physics/logic verification harness (separate `.js` file) before shipping
   - Copy to output only after all tests pass

4. **Physics formula integrity is the top priority.** Every formula must be independently
   verified against an external anchor before it ships. A wrong formula is worse than
   no formula. See §20A of PROJECT_INSTRUCTIONS_V4.md.

5. **Never transfer the Berger C constant across calibres.** Verified values:
   - SEN LR-25: C = 1.877
   - SEN LR-30: C = 2.699
   Each calibre requires its own back-calculated C from Berger anchor data.

6. **BC formula uses ballistics-convention SD** = mass_gr / (7000 × d_in²).
   Never use area-based SD (no π/4 term) — that inflates BC by 1.273×.

---

## Units

Metric first, always. Internal calculations in SI. Display toggles for imperial where needed.
Mass always in grains. BC always in lb/in² (primary) + kg/m² (secondary).

---

## Git workflow

**Commit after every meaningful change.** Message format:
```
[V{version}] {what changed} — Track {A/B}
```

Examples:
```
[V1.9.1] Fix wind drift sign flip at 180° — Track B
[V1.10.0] Add spin drift module — Track B
[V2.0.0] Modular sub-app architecture — Track B
```

**Never push automatically.** Only push when the user explicitly says "push" or "deploy".
Always confirm what will be pushed before running `git push`.

Before any commit, run:
```bash
git status
git diff --stat
```
and show the user what has changed.

---

## Key hardware (field equipment)

| Device | Role | Integration status |
|---|---|---|
| RTI Mora Sniper | Host rifle | Profiles in app |
| Calypso Mini AB (d6:cf:4d:b1:f9:a6) | BLE wind meter | ASCII protocol confirmed; activation handshake solved |
| LabRadar LX | Chronograph V₀ + Vd | Manual entry; real measurement ≤ 23 m |
| Garmin Xero C1 Pro | Chronograph MV | Manual entry only — no public BLE API |
| Vector Optics Continental X6 | Scope (SCFF-30, SCFF-70) | Profiles in app |
| Element TITAN 3K | Rangefinder | Manual entry for now |
| Garmin Fenix 7 Pro Solar | GPS watch | Manual altitude/temp/lat source |

---

## Key verified constants (do not recalculate without new anchor data)

- Ljubljana trajectory atmosphere: 20°C, 1010 hPa, 65% RH, 300 m ASL → ρ = 1.1934 kg/m³
- Stability worst-case atmosphere: −5°C, 1013 hPa, sea level, 80% RH, 750 fps
- Altaros Queen .25 BC G7 = 0.128 lb/in² = 90.0 kg/m² (verification anchor)
- SEN LR-25 V2: 53.6 gr, 12.0 mm, C = 1.877
- SEN LR-30: C = 2.699
- LabRadar real measurement ceiling: 23 m

---

## Authoritative sources

- RTI Arms: https://www.rtiarms.eu (only — rtiarms.shop is NOT official)
- Berger Twist Rate Calculator: https://bergerbullets.com/twist-rate-calculator
- App repo: https://github.com/SprukK/SEN-Balistic-Calculator (main app repo)
- App deployment: https://sprukk.github.io/SEN-Balistic-Calculator/
- Test repo: https://github.com/SprukK/SEN-Testing (BLE probes, module testers)
- Legacy repo (archived, history migrated): https://github.com/lnQNtrol/SEN-Balistic-Calcutalor

---

## What not to do

- Never silently estimate when you cannot calculate with confidence — say so explicitly
- Never use a drag model without stating which one and why
- Never commit or push without user confirmation
- Never break the single-file PWA constraint
- Never transfer C constants across calibres
- Never use sudo with npm
- Never compute SI BC with the π/4 area formula
