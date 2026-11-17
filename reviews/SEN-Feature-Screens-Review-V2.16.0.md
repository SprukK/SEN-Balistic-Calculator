# SEN Ballistic Calculator — Feature Screens and Workflows Review (V2.16.0)

Review only. No app code was changed. Implementation target: Claude Opus 5.5, under PROJECT_INSTRUCTIONS_V8 §21. The physics behind these screens is segment 1; here: how the screens call it, what they show, and what the shooter's workflow does.

Confidence: **Reproduced** = shown in the running app (jsdom with fake-indexeddb for restarts); **Likely** = clear from code reading; **Suspected** = needs the phone.

---

## A. Scope

**Commit:** `d82fd522` (V2.16.0), `index.html`.

**Read**
- Project knowledge: PROJECT_INSTRUCTIONS_V8 (§3–6, §10A, §20E, standing conventions), SEN-Feature-Register (CORE-12, CORE-16, CALC-22, BENCH-01…05), the skill's §11–§12 (Bench), clean-code-rules.md. RTI-SEN-Project-Reference-V2 was only searched for manufacturability rules (via the register and skill), not read in full.
- Code: Design Bench (1427–1606); turret and reticle drawing (2848–3075, `drawVCT34`, `drawGenericReticle`, turret state); Home wind source (3079–3106); Holds (3028–3064); dope cards (3656–3882: `newDope`, `loadDope`, `renderDopeZero`, `dopeFromSession`, `touchDope`, `renderStages`, `distRow`, `distDetail`, `computeCardTraj`, `calcDope`, `printDope`, `dopePrintHTML`, rangefinder-filled stages, `deleteDope`); profile lists and forms (3884–4171: `confirmDelete`, `fldHtml`, rifle, scope, reticle, projectile, weather forms and saves, `onScopeImport`); MV–temp (4179–4215); course runner (6168–6229); session bus (`Bus`, `pullFromProfiles`).
- Tests run green at d82fd52: benchtest 49/0, coursetest 22/0, courserunnertest 20/0, rfdopetest 33/0, samezerotest 13/0, customtest 26/0. Review harnesses: `work.js` (stale session after profile edits, scope reticle default, estimated reticle on Holds, overrides across a restart, deleting referenced profiles), `course.js` (empty course card, empty stage), `dopematch.js` (card vs Home at the same inputs).

**Not reviewed**
- Printing on a real printer or a phone print dialog (only the print HTML and CSS).
- The Lab app; reticle geometry against Vector's manuals (taken as recorded in `RETICLE_LIB`).
- The physics the screens call (segment 1), storage and import (segment 2), shell and layout (segment 4).

---

## B. Open questions for the owner

1. **Overrides across a restart (W-04):** today a chrono MV, an MV-temp MV or a manual BC disappears at the next start and the profile value comes back, with no notice. Keep them (with their source mark, plus "kept from last session") or drop them with a one-line notice? I recommend keeping them — the phone can kill the app between shots.
2. **Deleting a profile a dope card uses (W-07):** block it (as scopes and reticles already are) or warn and list the cards? I recommend warn-and-list.
3. **A new scope's reticle (W-03):** default to "no reticle (dial only)" until you pick a verified one? That is the standing convention; please confirm.
4. **Printed dope cards (W-13, F-9):** which sizes do you print — A4, A5, a pocket or wrist card? What must be on it besides drop and clicks (date, BC and drag model, atmosphere, MV)?
5. **End of a course (W-11):** after the last target of the last stage, stay where it is, or show a summary (hits per stage, time)?
6. **Duplicate profile names (W-12):** allow (as today) or refuse on save? Import matching uses names, so duplicates make the review sheet ambiguous.

---

## C. Findings (bugs)

| ID | Sev | Confidence | Location | Evidence | Impact |
|---|---|---|---|---|---|
| W-01 | S1 | Reproduced | `saveProj` 4402–4426, `saveRifle` 4053–4085, `saveWx` 4435–4449; `Bus.pullFromProfiles` 2623 | Session on Queen + .25 rifle + Everyday Default. Edit the **active** projectile's G7 0.128 → 0.100 and save: profile 0.100, `S.bc` **0.128**, source still "profile", Home unchanged (↑77 · 7.65 mrad at 150 m). Same for the active rifle's MV (255 → 280: `S.mv` stays 255) and the active weather's temperature (20 → 0 °C: `S.ct` stays 20). The old value stays until the profile is re-selected. Same root cause as segment 1 P-01 (`tuApply`). | The dope uses values the profile no longer has, while the source button says "profile". |
| W-02 | S1 | Reproduced | `renderCourse` 6203–6213, `courseStage` 6179; `boot` | With the PRS or Big bore layout (course module on), delete the last stage of the selected course card (or select a card with no stages): `renderCourse` reads `st.name` of null → Home rendering throws; after a restart **"SEN boot failed: Cannot read properties of null (reading 'name')"** at every start. | The app is unusable after an ordinary edit. |
| W-03 | S1 | Reproduced | `openScopeForm` 4089–4091, `saveScope` 4116–4132; `onScopeImport` 4147 | The reticle select has no "none" option. SCFF-31 (`reticleId: null`, no verified geometry) → open its form → Save without touching the reticle → `reticleId` **"milgrid"**. A new scope defaults to the first reticle (Mil-Grid) too, and a scope file whose reticle isn't found falls back to Mil-Grid. Home then shows Mil-Grid as the scope's own, verified reticle (the "generic grid — no verified reticle ⚠" label only appears for `null`), and the hold dot sits on marks the real reticle doesn't have. | Wrong holdover reference, against the standing reticle convention ("unverified reticle → `reticleId: null`, holdovers wait"). |
| W-04 | S2 | Reproduced | `snapshotJSON` 2119 (session has ids and distances only); `boot` 7212 | Set the session MV from the chrono (281.4, source "chrono") and a manual BC 0.119, save, restart: MV and BC come back as the profile values, source "profile", no notice. | A phone that kills the app between strings silently changes MV and BC. |
| W-05 | S2 | Reproduced | `renderHolds` 3028–3054 | On the seeded SCFF-70 (reticle VEC-MBR2, `verified:false`, "ladder ESTIMATED 0.5 mrad"), the Holds page shows reticle marks with no warning (only the Sg note). Home's caption does say "est. subtensions ⚠". | Holdover marks taken from an estimated ladder look verified. (The marks are also inverted until segment 1 P-04 is fixed.) |
| W-06 | S2 | Likely | `drawGenericReticle`, `renderHolds`, reticle model | SFP reticles are drawn and used as if FFP: no calibration magnification is stored, the zoom always scales as FFP, and holds are constant mrad at every magnification. No warning for an SFP reticle. | On an SFP scope, holds are right only at the one magnification the maker specifies. All seeded verified reticles are FFP, so only user-made SFP reticles are affected — S1 for that user. |
| W-07 | S2 | Reproduced | `confirmDelete` 3963–3975; `runTraj` 3243–3297 | Deleting a rifle, projectile or weather that dope cards use: no warning, cards keep the dangling id and stop computing ("select rifle…"). Deleting the **active** rifle: Home shows "—", but Trajectory and the Solver keep computing with the deleted rifle's MV and sight height and the fallback zero air (`runTraj` doesn't require a rifle). | Broken cards discovered at the match; Solver dope without a rifle. |
| W-08 | S2 | Reproduced | `courseCall` 6189–6194 | Hit or Miss on a course stage with no targets throws (`d.id` of undefined). | Dead button / console error during a match. |
| W-09 | S2 | Likely | `onScopeImport` 4134–4155 | The scope-file import bypasses `sanitiseRecord`: the bundled reticle is pushed as-is (`{...d.reticle}`, any fields, any id — the segment-2 D-02/D-03 payloads apply), the preview says "Click: … mrad" even for MOA scopes, and magnification isn't imported. | A second, unsanitised import path; wrong unit in the confirmation. |
| W-10 | S3 | Reproduced | `openReticleForm` 4158 | A new reticle's "Verified?" defaults to **verified**, although the form's own note says to mark it estimated unless confirmed. | Easy to create a "verified" reticle by accident. |
| W-11 | S3 | Likely | `courseTimer` 6195, `boot` | A running stage timer (`APP.run.start`) survives a restart but its interval isn't restarted: the countdown only moves when something else re-renders Home. After the last target of the last stage nothing happens (no end state). | Timer looks frozen after a restart; no course end. |
| W-12 | S3 | Likely | `saveProj`, `saveRifle`, `saveScope`, `saveWx` | Duplicate names are accepted. The projectile form doesn't warn when OAL > 22 mm (magazine) — the BC tab and Bench do — or when the diameter doesn't fit the calibre tag (`.25` with 7.62 mm). The rifle form doesn't note a twist different from the stock Mora barrel for its calibre (custom barrels are legitimate, so a note, not a refusal). | Friction and silent mismatches (calibre filter, import matching). |
| W-13 | S4 | Reproduced | `dopePrintHTML` 3815–3830, print CSS 443–453 | The printed card says "Zero atmos: 20.0 °C 975 hPa 65 %" without "station"; no print date, no BC/drag model; one layout: 7.5 pt table, 185 mm wide (A4). | Hard to read at arm's length; pressure kind unstated (§2 rule). |
| W-14 | S4 | Likely | `loadDope` 3683, `newDope` 3664 | The card MV field falls back to 255 m/s silently when empty (`c.mv||255`). | A blank MV becomes 255 without a mark. |

**Verified, no finding**
- **Dope card = Home** at the same inputs: 0.0000 / 3.5888 / 7.6532 mrad at 50 / 100 / 150 m, identical; ranged stages show spin-drift-only windage (rfdopetest).
- **Same as zero** (samezerotest), and editing the rifle's zero conditions flows into it (`saveRifle` → `Bus.sameAsZero`).
- **BC pending** blocks the trajectory with truing guidance on Home, Trajectory, Solver, Holds, dope cards and the course runner.
- **§10A:** designs live only in `DB.designs`; nothing converts a design into a projectile; they are absent from anchors and tests (formulatest checks it); the Bench says so on every design.
- **Bench:** mass, CG and SD per the skill (verified in segment 1 tests); OAL magazine / single-shot and boat-tail flags.
- **Reticles with `reticleId: null`:** Home draws the generic grid labelled "no verified reticle ⚠"; Holds says "holds in mrad only"; dialling works.
- **CORE-15:** every number input on these screens is unit-classified (unittest enforces it); station distances typed in yards are stored in metres (stationtest); Bench lengths follow the size unit.

---

## D. Fix guidelines for Opus

**W-01 — stale session after editing the active profile** · patch
- Scope: after a successful save, if the edited record is the active one, re-pull its fields that are still sourced from the profile: `saveProj` → `Bus.pullFromProfiles(['bc'])` when `S.src.bc==='profile'`; `saveRifle` → `['mv','sight']` for fields whose source is "profile" (and `S.zero_m` from the rifle); `saveWx` → `['ct','cp','crh']` likewise. Manual overrides stay. Do this together with segment 1 P-01 (`tuApply`), same pattern.
- Test (a new block in truedroptest or samezerotest): the three edits from C/W-01 change Home's dial immediately; with a manual BC set first, editing the profile BC leaves the manual value and its mark.
- Risk: low.

**W-02 — course card without stages** · patch
- Scope: `renderCourse` treats `!st` like "no course" (message "This card has no stages — add one in the Dope tab", empty target list); `courseStage` callers (`courseGo`, `courseNext`, `courseCall`, `courseMaxRange`) already return on null — check each. Pair with segment 4 U-01 (layout normalisation before the first render) so a bad course state can't stop the boot either.
- Test (courserunnertest): delete the only stage of the running card → Home renders the message; restart → boots.
- Risk: low.

**W-03 — scopes silently get the generic reticle** ⚖ (B-3) · patch · migration
- Scope: add `<option value="">No reticle (dial only)</option>` first in the scope form's select and select it when `reticleId` is null; `saveScope` stores `null` for the empty value; a new scope defaults to null; `onScopeImport` falls back to null, not "milgrid". Migration (one-off, flagged): scopes whose `reticleId` is "milgrid" but whose name or notes don't mention a grid and whose SKU is in the Vector catalog with `reticleId:null` → back to null, with a note. Leave scopes the owner deliberately set to Mil-Grid alone (ask if unsure: list them in the patch log).
- Test (a new profile-form block in domtest or benchtest's style): saving SCFF-31 untouched keeps `null`; Home caption shows the "no verified reticle" label; picking Mil-Grid explicitly still works.
- Risk: low.

**W-04 — overrides lost on restart** ⚖ (B-1) · patch
- Scope (recommended option): add `mv`, `bc`, `sight`, `ct`, `cp`, `crh` and `src` to the snapshot's `session` block; in `boot`, re-pull only the fields whose stored source is "profile" (today's `pullFromProfiles` call becomes per field). Show a one-line note on Home when a non-profile value was restored ("MV 281.4 from the chrono, kept from last session").
- Test (storagetest restart): chrono MV and manual BC survive a restart with their source marks; profile-sourced fields still follow an edited profile.
- Risk: low; the Lab reader must accept the extra session keys (CORE-09 contract) — check `maindatatest`.

**W-05 — Holds on an estimated reticle** · patch (with segment 1 P-04)
- Scope: in `renderHolds`, when the reticle is `verified:false` add the warning flag "Reticle subtensions are estimated — check the marks against the manual before holding" and, in the print, "(estimated)" in the Reticle column header.
- Test: SCFF-70 → Holds shows the flag; SCFF-30 (VCT-34FFP verified) → no flag.

**W-06 — SFP reticles** · minor · Feature Register 💭 Proposed (F-11)
- Scope: reticle model gains `calMag` (the magnification its subtensions are true at). For SFP: the drawing scales hashes by `calMag/mag`; Holds and the hold dot use the subtension at the current magnification, and say "true at ×calMag". Until built: a warning on Home and Holds when the active reticle is SFP.
- Risk: medium (reticle drawing). Not needed for the owner's current FFP scopes.

**W-07 — deleting referenced profiles** ⚖ (B-2) · patch
- Scope: in `confirmDelete`, list the dope cards (and the running course card) that use the rifle, projectile or weather, in the confirmation ("Used by 2 dope cards: …; they will need another rifle"), or refuse, per ruling. In `runTraj`, require an active rifle like `homeTraj` does (`trajFail('Select a rifle…')`).
- Test (coursetest): delete a rifle a card uses → the confirmation names the card; delete the active rifle → Trajectory and Solver show the "select a rifle" message.
- Risk: low.

**W-08 — Hit/Miss on an empty stage** · patch
- Scope: `courseCall` returns when the stage has no targets.
- Test (courserunnertest): stage with no targets → tapping Hit does nothing, no error.

**W-09 — scope file import** · patch (with segment 2 D-02/D-06)
- Scope: build the scope and reticle records through `sanitiseRecord('scopes', …)` and `sanitiseRecord('reticles', …)` (same rules, id rule from D-02), keep the confirm; the preview shows the click in the scope's unit (`angLabel(adjUnit)`); import `magMin`/`magMax` when present.
- Test: the segment-2 HTML payload in a scope file's reticle `fp` → no live markup; a MOA scope file → preview says MOA.

**W-10 — reticle default** · patch
- Scope: `openReticleForm` default `verified:false` for a new reticle.

**W-11 — course timer and end** ⚖ (B-5) · patch
- Scope: in `boot` (or the first `renderCourse`), restart `courseIv` when `APP.run.start` is set and time is left. The course end (summary or nothing) per ruling; if a summary is wanted it is a feature (F-12).
- Test (courserunnertest): start the timer, restart, wait 2 s → the countdown moves.

**W-12 — form checks** ⚖ (B-6) · patch
- Scope: projectile form: info flag (not refusal) for OAL > 22 mm and for a diameter more than 0.3 mm off the calibre tag's nominal; rifle form: info note when the twist differs from the stock Mora twist for that calibre (table in §3–6); names: per ruling — refuse or append " (2)".
- Test: the three flags appear with the values; saving still works.

**W-13, W-14** · patch, low priority
- W-13: "station" after the pressure and the print date in `dopePrintHTML`'s header. Sizes and content per ruling (F-9).
- W-14: show an empty MV as empty with "MV required" instead of falling back to 255; `computeCardTraj` already refuses MV ≤ 0.

### Feature ideas (separate from bugs — all 💭 Proposed, for the owner to rule)

| ID | Proposal | Why |
|---|---|---|
| F-8 | **Turret revolutions.** Show the dial as revolutions + clicks (e.g. "1 rev + 36", using the scope's clicks per revolution) on Home, the Solver, cards and the print. `cpr` is stored but never used. | ELR dials past one revolution; a revolution count prevents a whole-turn error. |
| F-9 | **Print layouts.** A4 table, A5, and a pocket/wrist card with larger type; optional date, BC + drag model, MV and atmosphere (with "station") on the card. | Readable at the rifle; the card documents what it was computed with. |
| F-10 | **BENCH-05 completion.** Manufacturability rules from the skill (§12C/§12D: bearing ≥ 0.5 cal, boat-tail 7–9°, meplat), calibre fit against the Mora bores, choke fit. Today only OAL and boat-tail angle are flagged. | The register lists BENCH-05 as only partly built. |
| F-11 | **SFP reticles** with a calibration magnification (see W-06). | Correct holds on SFP scopes. |
| F-12 | **Course summary** at the end of a course: hits per stage and target, time per stage. | Match debrief; pairs with the session record (F-1). |

---

## E. Suggested release grouping and order

| Order | Release | Items | Why together |
|---|---|---|---|
| 1 | patch | **W-02** (+ segment 4 U-01) | Both stop the app from failing at every start. |
| 2 | patch | **W-01** (+ segment 1 P-01), **W-03**, W-05 (+ segment 1 P-04), W-10 | Values and reticles the shooter reads: no stale session values, no silent generic reticle, estimated reticles flagged. |
| 3 | patch | W-04, W-07, W-08, W-09 (+ segment 2 import work), W-11, W-12, W-13, W-14 | Workflow robustness after the rulings in B. |
| 4 | minor | F-8, F-9, W-06/F-11, F-10, F-12 — only those the owner confirms | New behaviour; Feature Register entries first. |
