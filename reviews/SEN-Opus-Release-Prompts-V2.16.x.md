# SEN — Opus prompts for the seven releases from the V2.16.0 review

One prompt per release. Paste each into a **new chat in the "SEN - Ballistic Calculator" Project**, one release at a time, in order. Start the next one only after the previous release is pushed.

Each prompt is self-contained. They all point to the same review documents, kept in **project knowledge under `claude/reviews/`** and backed up in the repo on branch **`reviews/v2.16.0`** (folder `reviews/`; `main` is untouched):

- `SEN-Consolidated-Fix-Plan-V2.16.0.md` — the release order (this file's source)
- `SEN-Physics-Core-Review-V2.16.0.md` (P-xx), `SEN-Data-Security-Review-V2.16.0.md` (D-xx), `SEN-Device-IO-Review-V2.16.0.md` (B-xx), `SEN-App-Shell-Review-V2.16.0.md` (U-xx), `SEN-Feature-Screens-Review-V2.16.0.md` (W-xx) — each finding's evidence, fix guideline, test and risk, with the owner's rulings at the end of each file
- `SEN-Review-Backlog-V2.16.0.md` — owner device tests (T-xx) and feature proposals (F-xx)
- `harness/` (repo branch only) — the jsdom / Playwright scripts that reproduced the findings (paths inside them point to the reviewer's workspace; adapt them)

---

## Prompt 1 — V2.16.1: the app must always start

```
You are the SEN project's software engineer. Implement release V2.16.1 of the SEN Ballistic Calculator.

Setup
- Clone github.com/SprukK/SEN-Balistic-Calculator (main). Base: V2.16.0 (d82fd52).
- Read first: the Project instructions (V8), SEN-BALLISTICS-SKILL.md, clean-code-rules.md, claude/SEN-Feature-Register.md, and in project knowledge claude/reviews/SEN-Consolidated-Fix-Plan-V2.16.0.md (section R1) plus the segment files for each ID below (finding table + section D fix guideline + the owner rulings at the end).

Scope (only these; nothing else):
- U-01 (App-Shell review): normalise Home layouts before the first render (move initLayouts() ahead of the first refreshSelects/renderQuick in boot), drop layouts that are not plain objects, fall back to the templates if none are left; show a one-line note once when a layout was dropped or reset (owner ruling).
- W-02 + W-08 (Feature-Screens review): renderCourse handles a card with no stages (message instead of a crash); courseCall returns on a stage with no targets.
- D-05, validator part only (Data-Security review): validate UNITS/SUNITS (key must exist in QDEF, value must be one of its opts; SUNITS also 'off') and app2 keys (only keys present in APP's defaults with the same typeof; objects only where a cleaner exists) — on import ("Take theirs") AND in applySnapshot at load, so an already-bricked store boots again. The per-group picker is a later feature (F-3), not this release.
- D-01 (Data-Security review): tuApply and tdApply set p.bcConv='native' whenever they write p.bcTrued. Owner ruling: no BC was trued since 23 Oct 2026, so no repair migration.

Tests to add (fake-indexeddb restarts, as storagetest does): the two corrupt-layout stores from U-01 boot and render Home; a course card with no stages renders the message and survives a restart; Hit on an empty stage does nothing; {units:{range:'parsec'}} imported with Take theirs → no exception, next start boots, and a store already holding it boots with 'm'; a drops-trued BC 0.119 is still 0.119 after two restarts (bcmigtest must stay green).

Rules
- Plan first: present the exact changes per ID and wait for my "go" before editing anything.
- Minimal change (§21.2), no refactors. Run every suite in tests/README.md (all green), domtest + rendertest included, real Chromium at 412 and 780 px.
- Release checklist §21.6: live version strings only, sw.js CACHE sen-ballistics-v2.16.1, versioned HTML byte-identical to index.html, SEN-Patch-Log.md entry listing each review ID, Feature Register decision-log entry in project knowledge.
- Show git status + diff --stat; never push without my explicit "push".
- After the push, list the device checks for me (owner test T-3: true a BC, restart, check it is unchanged).
```

---

## Prompt 2 — V2.16.2: no script injection from shared data

```
You are the SEN project's software engineer. Implement release V2.16.2 of the SEN Ballistic Calculator.

Setup
- Clone github.com/SprukK/SEN-Balistic-Calculator (main, V2.16.1). Read the Project instructions (V8), clean-code-rules.md, claude/SEN-Feature-Register.md, and claude/reviews/SEN-Consolidated-Fix-Plan-V2.16.0.md (R2) plus each ID's section in the segment files (finding, section D fix guideline, owner rulings at the end). Table E of SEN-Data-Security-Review lists every innerHTML site and which are real sinks.

Scope (only these):
- D-02: one id rule ^[A-Za-z0-9_-]{1,40}$ in sanitiseRecord (bad record id → fresh uid() recorded in idMap so remapRefs still links; bad ref fields → null/''; bad stage/target ids → fresh uids; same rule in stnClean); run the same check once over stored data at load (flagged); esc() every id written into an attribute value. Do not rely on esc() inside onclick="f('…')" — the whitelist is what makes those safe.
- D-03: esc() in fldHtml (value), the Home reticle caption (reticle.fp) and the Holds BC-pending flag (projName).
- D-04: link, QR and pasted share codes always open the import review sheet, even with only new items (owner ruling: yes). File import and Drive restore unchanged.
- D-14 + D-15: duplicate ids within one file get fresh ids; idMap per type as a Map (or Object.create(null)).
- D-16: refuse share text > 64 kB, stop inflating at 1 MB, refuse import files > 10 MB, nums arrays ≤ 64.
- W-09 (Feature-Screens review): onScopeImport builds scope and reticle through sanitiseRecord; preview shows the click in the scope's unit; import magMin/magMax when present.

Tests to add (importtest / sharetest): the three payload modes from the review (HTML x"'><i data-xss="k"></i>, attribute x" data-xss="k, handler x',window.__p('k'),') in every id, ref and string field of every record type → after rendering Profiles, every sheet, every profile form, Dope cards (stage + target rows), Truing and the Trajectory selects: zero [data-xss] elements and no handler marker fires when every inline handler is invoked; a normal export/import round trip keeps all ids; a #import= link with only new items opens the review sheet and adds nothing until Import; the 50 MB decompression-bomb code is refused within a second. The review harnesses xss.js and link.js (repo branch reviews/v2.16.0, folder reviews/harness/) are starting points.

Rules
- Plan first, wait for my "go". Minimal change. All suites in tests/README.md green (importtest, sharetest, coursetest, stationtest, benchtest, drivetest, domtest especially), Chromium 412/780 clean.
- Release checklist §21.6 (sw.js CACHE sen-ballistics-v2.16.2, versioned HTML = index.html, patch-log entry with the review IDs, Feature Register decision log in knowledge). Show git status + diff --stat; push only on my "push".
```

---

## Prompt 3 — V2.16.3: trued BCs and profile values reach the dope

```
You are the SEN project's ballistics and software engineer. Implement release V2.16.3 of the SEN Ballistic Calculator.

Setup
- Clone github.com/SprukK/SEN-Balistic-Calculator (main, V2.16.2). Read the Project instructions (V8, esp. §9S, §9T, §20E), SEN-BALLISTICS-SKILL.md (§4B-1), clean-code-rules.md, claude/SEN-Feature-Register.md, and claude/reviews/SEN-Consolidated-Fix-Plan-V2.16.0.md (R3) plus each ID's section in the segment files.

Scope (only these):
- P-01 + W-01: after tuApply, and after saving the ACTIVE rifle / projectile / weather in its form, re-pull the session fields whose source is still "profile" (bc; mv + sight + zero_m; ct + cp + crh). Manual overrides stay.
- P-02 + D-07: whitelist bcTrued (string), bcConv (string) and bcBands ({drag ∈ g1/g7, bands ≤ 16 × {vHi > vLo, bc > 0}, rebuilt field by field}) on import; a record with bcTrued but no bcConv from a file whose app string is below V1.24.2 gets the same ×π/4 (G7) / pending (G1) conversion as migrateTruedBC, otherwise bcConv='native'. D-01 (V2.16.1) is already in, so imported trued BCs are not converted again at restart — test that.
- P-05: editing a trued BC by hand in the projectile form clears bcTrued/bcBands with a note; an untouched BC keeps them.
- P-07: runTraj/homeTraj pass no bands when the BC is manual or a truing trial (bcOverride).
- W-04: persist mv, bc, sight, ct, cp, crh and their sources in the snapshot's session block; at boot re-pull only profile-sourced fields; one-line Home note "… kept from last session" (owner ruling: keep). Check the Lab reader accepts the extra session keys (maindatatest in SEN-Testing).
- D-06: import range and enum checks matching the forms (reject the record with its reason, never clamp). ONLY if I have already sent my full export from the Honor (owner test T-1): run a round trip of that file first; if I haven't, leave D-06 out and say so.

Known answers (from the reviews): Queen trued G7 0.119, 255 m/s, Everyday Default (974.8 hPa station), zero 50 m → 11.97 mrad at 200 m before and after an export/import round trip and after a restart (it showed 12.09 with the penalty wrongly applied); V1.24.1 export trued G7 0.163 → imports as 0.128 trued; banded Queen: a manual BC 0.200 now changes Home's dial (drop at 200 m without bands −1874.69 mm vs −1975.68 mm with bands).

Rules
- Plan first, wait for my "go". Physics-adjacent: reproduce the known answers above in runtests/truedroptest. All suites green (bcmigtest, importtest, storagetest, truedroptest, formulatest, drivetest, sharetest especially).
- Release checklist §21.6 (sw.js CACHE sen-ballistics-v2.16.3, patch log with the review IDs, Feature Register decision log; skill §4B-1 note that the trued state survives export/import). Show git status + diff --stat; push only on my "push".
```

---

## Prompt 4 — V2.16.4: what the shooter reads is right

```
You are the SEN project's ballistics, BLE and software engineer. Implement release V2.16.4 of the SEN Ballistic Calculator.

Setup
- Clone github.com/SprukK/SEN-Balistic-Calculator (main, V2.16.3). Read the Project instructions (V8: §2 pressure, §9, §9T, §20A, reticle convention), SEN-BALLISTICS-SKILL.md, SEN-Calypso-BLE-Handoff-V3.md, claude/SEN-Lab-Graduation-Checklist.md, clean-code-rules.md, claude/SEN-Feature-Register.md, and claude/reviews/SEN-Consolidated-Fix-Plan-V2.16.0.md (R4) plus each ID's section in the segment files.

Scope (only these):
- B-01 (owner ruling: as recommended): a 1 s freshness ticker while any Calypso is connected (stops when none is) that re-runs the existing render paths; windFresh() = session unit connected, unlocked, last :WU < 3 s. Not fresh and source 'calypso': Home and the Weather pill show "wind N s old" (warning style); at 30 s, or at once on disconnect, the session wind becomes manual with the same value and a one-line note. calypsoLive never pushes an average whose newest reading is older than 3 s. Update stationtest B accordingly.
- B-07, B-08, B-14: :WU accepted only with 6 fields, numeric fields 2–4, speed 0–60, direction 0–360 (else ignored, lastWu untouched); calPacket ignores stale driver objects (!CALS.includes(d)) and respects DataView byteOffset/byteLength; gattserverdisconnected wired once per BluetoothDevice.
- P-03: Truing tab air filled from the session (S.ct/S.cp/S.crh), pressure labelled station, blank without a session, hPa > 0 guard.
- P-06: velAtDist reads the velocity exactly at d (rk4traj with max = step = d), no rk4traj change. Known answer: BC 0.128, 280 m/s, Everyday Default → trueBCsingle returns 0.128 ± 2e-4 at 12.5 / 18.3 / 22.86 / 27.43 / 45.72 m (generate the test velocities with the same zero and sight as velAtDist).
- P-13: banded truing refuses velocities that don't fall point to point and shows segment flags.
- P-12: "station" labels on Cur pres and Stability pressure; a sea-level profile without a finite altitude is not converted silently (wxPres → undefined; importer rejects or brings it in as station — say which in the patch log; altitude 0 stays valid).
- P-04 + W-05: Holds: hold-over rows name the hash below centre, hold-under rows say "above center", same in printHolds; warning flag when the reticle is estimated (owner: agreed).
- W-03 + W-10: "No reticle (dial only)" first in the scope form and the default for new scopes; saving keeps null; onScopeImport falls back to null; one-off migration for Vector catalog scopes that were silently set to "milgrid" (list them in the patch log); a new reticle defaults to estimated.
- P-10: solveShot returns null for dist ≤ 0 or a non-finite angle/wind; calcStab clears outputs for empty pressure/MV/twist; no Infinity/NaN in any dope cell.
- B-03, parser part only: chParseTyped reads decimal commas when the text uses spaces or ';' as separators, plus a 30 %-from-median sanity refusal (owner: EU formatting is the default; the app-wide number-format setting is a later feature, F-2).

Tests: the simulator scenarios in the Device-IO review section D (silent unit 5 s / 31 s, disconnect, resume; four reconnects → one handler; split and junk :WU), the Holds rows (Queen, zero 50 m, VCT-34: 100 m → "4 mrad line −0.41", 25 m → "above center"), SCFF-31 saved untouched keeps null, the non-finite cases, the chrono strings `280,5 281,2 279,8` → mean 280.50.

Rules
- Plan first, wait for my "go". §20A for every physics touch (independent reproduction of the P-06 known answers). All suites green (calypsotest, multicaltest, stationtest, windmodtest, devicetest, truedroptest, chronotest, unittest, helptest, domtest, rendertest especially); Chromium 412/780 clean.
- Release checklist §21.6 (sw.js CACHE sen-ballistics-v2.16.4, patch log with review IDs, Feature Register decision log, skill note for P-03/P-06). Push only on my "push".
- After the push list my device checks: owner test T-4 (cover / switch off a Calypso, walk out of range) and the Holds page on the Honor.
```

---

## Prompt 5 — V2.16.5: storage, service worker and workflow robustness

```
You are the SEN project's software engineer. Implement release V2.16.5 of the SEN Ballistic Calculator.

Setup
- Clone github.com/SprukK/SEN-Balistic-Calculator (main, V2.16.4). Read the Project instructions (V8 §18, §21), clean-code-rules.md, claude/SEN-Feature-Register.md (CORE-09 storage contract), SEN-Device-BLE-Handoff-V1.md (LabRadar), and claude/reviews/SEN-Consolidated-Fix-Plan-V2.16.0.md (R5) plus each ID's section in the segment files.

Scope (only these):
- D-08: retry idbOpen once; after a verified localStorage → IDB migration write a marker key in Main's namespace (sen_platform_migrated); a fallback that finds the marker shows the store warning and refuses to save until IDB opens again. The localStorage copy itself stays (rollback, Lab fallback reader).
- D-10: an unreadable stored snapshot is copied to db-unreadable-<timestamp> before anything else, and its warning is a separate loadError that storeOk() does not clear.
- D-11, D-12, D-13 (sw.js only): cache HTML only if res.ok; 3 s navigation timeout falling back to the cache; install with cache:'reload'.
- D-17: seed the projectile and Vector scope catalogs once per catalog version (APP.seeded), existing installs flagged without re-adding.
- D-18: migrateZeroFields copies the zero weather's pressure kind and altitude.
- U-02 (owner ruling): Android back and Escape close a profile form; ask "discard changes?" only when something was typed; openModal arms a back guard like openSheet.
- U-03: paneEmptySync writes hidden/textContent only when they change (no idle observer loop).
- W-07 (owner: warn and list): deleting a rifle, projectile or weather lists the dope cards (and running course card) that use it in the confirmation; runTraj requires an active rifle.
- W-11: the stage timer resumes after a restart.
- W-12 (owner: refuse): saving a profile whose name already exists in that type is refused with a message; info flags for projectile OAL > 22 mm and a diameter > 0.3 mm off its calibre tag; rifle note when the twist differs from the stock Mora barrel for that calibre (§3–6 table).
- W-13, W-14: "station" after the pressure and the print date on the printed card; an empty card MV is shown as required (no silent 255).
- B-05 (owner: yes): a new LabRadar series starts a new shot string (series stored in chronoStr, chClean whitelist).
- B-09, B-11, B-13: LabRadar parser drops one byte and rescans on a CRC failure or a 2 s stall; "no answer" after 5 s without the key reply; chrono MV range 0–600 m/s like the other MV inputs.
- U-10 (owner: archive): move the versioned RTI-SEN-Ballistic-Calculator-V*.html builds to archive/, keeping the six that tests load (V1.17.2, V1.22.0, V1.24.1, V1.25.1, V1.29.1, V1.31.0) reachable and updating their paths in tests/README.md and the suites. The new release's versioned HTML still goes in the root per §21.6.
- U-11: delete the unused `let tdRowsN=1;`.

Tests: each ID's test in its segment file section D (storagetest restarts for D-08/D-10/D-17, swtest with a simulated fetch for D-11–D-13, domtest for U-02, an idle-observer check for U-03, coursetest/courserunnertest for W-07/W-11, labradartest for B-05/B-09/B-11).

Rules
- Plan first, wait for my "go". Minimal change. All suites green incl. the Lab's maindatatest against the new Main (storage contract); Chromium 412/780 clean.
- Release checklist §21.6 (sw.js CACHE sen-ballistics-v2.16.5, patch log with review IDs and the archive move, Feature Register decision log). Show git status + diff --stat; push only on my "push".
```

---

## Prompt 6 — V2.17.0: new behaviour already ruled on by the owner (minor)

```
You are the SEN project's ballistics and software engineer. Implement minor release V2.17.0 of the SEN Ballistic Calculator.

Setup
- Clone github.com/SprukK/SEN-Balistic-Calculator (main, V2.16.5). Read the Project instructions (V8 §9, §9I, §9S, §9T, §20E, §21.7), SEN-BALLISTICS-SKILL.md, clean-code-rules.md, claude/SEN-Feature-Register.md, and claude/reviews/SEN-Consolidated-Fix-Plan-V2.16.0.md (R6) plus each ID's section in the segment files.

Before any code: check each item below has a Feature Register entry with status ✅ Confirmed (the owner rulings are recorded in the review files and in the register's 2026-11-17 decision-log rows). Anything not confirmed: stop and ask me.

Scope:
- P-08 (owner: warn, keep the dope): one shared Sg < 1.0 warning on Home, Trajectory, Solver, Holds and dope cards; the penalty formula unchanged; Formulas text says the penalty is extrapolated below 1.0. Known answer: King at −5 °C / 1013 hPa / 229 m/s → Sg 0.938.
- P-09 (owner: the setting hides only the slug warning): machWarn(pts, projType) — diabolo warning when a pellet's flight has any point above M0.80 (always shown), transonic warning when a slug's flight touches M0.8–1.2 (hidden only when APP.transonicWarn is off); on Trajectory, Home, Solver, Holds, the dope-card note and the print. Pellet 290 m/s → diabolo; Queen 300 m/s → transonic; Queen 420 m/s → transonic (today none); Queen 255 m/s → none.
- P-11: velocity-truing uncertainty — BC range for ±δ on the downrange velocity and on V0; show per 1 m/s sensitivity until I give a LabRadar accuracy figure. Known answers (BC 0.128, 280 m/s, 23 m): V23 −0.3/+0.3 → 0.1190/0.1384; V0 −0.3/+0.3 → 0.1381/0.1192 (recompute after P-06 shipped in V2.16.4).
- D-09 (owner: fix it): revision counter; saveDB checks and writes in one IDB transaction and refuses with a "changed in another window — reload" banner; optional BroadcastChannel announce. Lab reader must ignore the new key.
- F-3 import part picker (owner ruling): the review sheet lists preference groups (units, display, colours, Home layouts, bottom bar, other) with a checkbox each, default off; only ticked groups apply, each through the V2.16.1 validator.
- F-2 number format (owner ruling): EU by default (decimal comma for every input and printed value), switchable in Settings; the unit layer (readUnitInput/shownValue) is the one place to parse/format; canonical storage unchanged. unittest must cover both formats.
- F-12 course summary (owner ruling): after the last target of the last stage, a summary (hits per stage and target, time per stage) with the option to go back to any stage or target.

Rules
- Plan first, wait for my "go"; this release is large — propose splitting it (e.g. V2.17.0 warnings + D-09, V2.18.0 F-2/F-3/F-12) if the diff gets big. §20A for P-08/P-09/P-11 (Formulas entries and anchors). All suites green, Chromium 412/780 clean (status lines must fit 412 px).
- Release checklist §21.6 (sw.js CACHE, patch log, Feature Register statuses → 🚧/✔ with version). Push only on my "push".
```

---

## Prompt 7 — V2.17.1: low-impact fixes and housekeeping

```
You are the SEN project's ballistics and software engineer. Implement release V2.17.1 of the SEN Ballistic Calculator.

Setup
- Clone github.com/SprukK/SEN-Balistic-Calculator (main, V2.17.0). Read the Project instructions (V8), SEN-BALLISTICS-SKILL.md, clean-code-rules.md, claude/SEN-Feature-Register.md, and claude/reviews/SEN-Consolidated-Fix-Plan-V2.16.0.md (R7) plus each ID's section in the segment files.

Scope (only these):
- P-14: the zero session's baked wind drift uses pts.zeroTof (zero air). Known answer: zero in 0 °C / 979.6 hPa / 80 %, current Everyday Default, Queen 255 m/s, 3 m/s from the right in the zero → baked drift 9.88 mm (was 9.04); equal air → bit-identical to before.
- P-15: rk4traj flags an unreachable zero (za at ±0.1) and returns no points; the flight loop gets the same n++ < 1e5 cap as the zero pass. All trajectory anchors bit-identical. Check chVert can't receive an empty list.
- P-16: calcStab checks the pellet rule before a typed C; computeCardTraj passes null (not undefined) to zeroConds when the card's rifle is missing.
- P-18 (owner accepted): horizontal Coriolis measured from the zero, Δ(d) − Δ(z)·d/z with Δ(z) from the zero pass; vertical unchanged. Recompute the anchor from the zero pass (the review's 6.83 mm at 200 m used the current-air flight for both terms).
- P-20: Formulas "Speed of sound" note (dry air; humid air up to ~0.5 % faster; < 1 mm drop effect at 200 m) — text only.
- P-21: tests/README.md counts and the Berger pressure note (980 hPa); CLAUDE.md points to V8 and replaces rule 6 with the Miller wording; Formulas anchor renamed "formula check: 20 °C / 1010 hPa as typed / 65 %" plus an Everyday Default anchor airDensity(20, stationPres(1010,298), 65) → 1.1516 ± 5e-4; replace the literals 0.290888 (tdNeedMrad) and 3.43775 (QDEF.ang) with MOA2MRAD / MRAD2MOA.
- D-19: loadDB with a newer schema than the app → warning, read-only session.
- D-20: Drive uploads carry appProperties.senId; a retried item that already exists is dropped; folder checks once per flush.
- B-10: link.op races each GATT operation with a 5 s timeout (measure LabRadar write-with-response time on the Honor first — ask me).
- B-16 (optional — ask me first): other Calypso tokens only after the user confirms.
- B-17: on iOS, the Bluetooth connect buttons become a one-line "enter values by hand" note.
- The test gaps listed at the end of each segment file that are still open after V2.16.1–V2.17.0 (list which you cover).

Rules
- Plan first, wait for my "go". §20A for P-14/P-15/P-18 (independent reproduction, e.g. py-ballisticcalc for P-14). All suites green; Chromium 412/780 clean.
- Release checklist §21.6 (sw.js CACHE sen-ballistics-v2.17.1, patch log, Feature Register decision log, skill notes for P-14/P-18/P-20). Push only on my "push".
- Finally, tell me which device tests from claude/reviews/SEN-Review-Backlog-V2.16.0.md are still open and which waiting fixes (consolidated plan §3) they unblock.
```
