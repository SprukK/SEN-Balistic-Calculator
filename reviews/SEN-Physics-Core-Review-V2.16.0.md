# SEN Ballistic Calculator — Physics Core Review (V2.16.0)

Review only. No code was changed, nothing was committed or pushed. Implementation target: Claude Opus 5.5, under PROJECT_INSTRUCTIONS_V8 §21 (plan → "go" → minimal change → full regression).

Value labels used throughout: **[calc]** = computed in this review (app code at d82fd52, py-ballisticcalc 3.1.1, or my own Python); **[est]** = estimate; **[assumed]** = not verified.

---

## A. Scope

**Commit:** `d82fd522` — `[V2.16.0] Chrono Advanced + Chrono Graph …`, `index.html` (7246 lines; app script 1213–7244). Working tree left clean.

**Read in full**
- Project knowledge: PROJECT_INSTRUCTIONS_V8 (as attached to the project), SEN-BALLISTICS-SKILL.md (V5.15), clean-code-rules.md; repo `CLAUDE.md`, `tests/README.md`.
- Physics core, lines 1213–1390 and 1607–1859: constants, G1/G7 tables, `interp`, `stationPres`, `wxPres`, `airDensity`, `sos`, `calcSD`, `calcSg`, `rk4traj`, `millerC`, `projC`, `mcgyro`, `mcgyroAir`, `mcgyroShape`, `twistForSg`, `bcEffSg`, `velAtDist`, `trueBCsingle`, `trueBCdrop`, `trueBCbanded`, `bandBC`, angular helpers, `vchk`, `finiteGuard`, `solveShot`, `windDrift`, `cantShift`, `crossField`, `windField`, `windDriftField`, Coriolis, aerodynamic jump, spin drift, `mvtFit`.
- Consumers: `zeroConds`, session bus (`S`, `Bus`), `sessionSg`, `sessionJump`, `homeTraj`, `renderQuick` (solution part), `renderHolds`/`printHolds`, `nearestPt`, `runTraj`, `renderTraj`, `calcBC`, `stabFromActive`, `calcStab`, `renderMcGyro`, `renderWind`, `solve`, `computeCardTraj`, `calcDope`, `dopePrintHTML`, MV–temp (`mvtRender/Add/Apply`), truing (`tuInit`, `tuLoadProj`, `tuSolve`, `tuApply`, `tdNeedMrad`, `tdReadRows`, `tdFit`, `tdSolve`, `tdApply`), `saveProj`, `saveWx`, `saveRifle`, `chVert`, `IMPORT_FIELDS`/`sanitiseRecord`, `migrateTruedBC`, `migrateMillerC`, the `FORMULAS` registry, `stnState`/`stnField`.

**Run**
- `node --check` on the extracted script: OK.
- `runtests.js` 149/0 · `formulatest` 19/0 · `stabtest` 12/0 · `mcgyrotest` 30/0 · `flighttest` 16/0 · `ajtest` 18/0 · `truedroptest` 20/0 · `bcmigtest` 11/0 · `pressuretest` 12/0 · `samezerotest` 13/0 · `chronotest` 45/0 · `importtest` 28/0. All green.
- Independent reproductions: Python (anchors, CIPM-2007 density, own RK4 at dt = 0.2 ms), py-ballisticcalc 3.1.1 (tables, trajectories, two-atmosphere zero), headless probes of the core functions, and the real app in jsdom for every consumer-level finding.

**Not reviewed**
- BLE/SenBle drivers, Calypso/LabRadar/rangefinder decoding, wind averaging, station geometry (`stnComponents`, `stnMarkRel`, `stnPos`) beyond what `windField` receives.
- Design Bench geometry (`benchGeom`, `benchMass`) — read, not audited.
- Reticle rendering, layouts, storage/IndexedDB, sharing, Drive, service worker.
- The remaining suites (dom/layout/render/type and the device suites) were not run; nothing was changed, so this affects coverage of the review only.
- Berger's web page was not re-queried (its anchors were reproduced from Miller's formula at the ISA pressure for 978 ft). McCoy's BASIC was not re-run in pcbasic (the port was checked only through `mcgyrotest`). Litz's book pages for spin drift and aerodynamic jump were not re-sourced; the coefficients match the published fits as I know them. The owner's Element table was not available to me.

---

## B. Open data gaps and questions for the owner

Rulings needed before Opus builds the items marked ⚖ in section D.

1. ⚖ **Sg < 1.0 (P-08).** The skill says the penalty holds only for 1.0 ≤ Sg < 1.5 and that Sg < 1.0 is a failed design. Today the app extrapolates the penalty and shows dope with no warning. Choose: (a) warn loudly and keep the dope, or (b) block the trajectory like "BC pending" until a trued BC exists. Miller is unvalidated for airgun slugs, so (a) is my recommendation.
2. ⚖ **Transonic warnings setting (P-09).** `APP.transonicWarn` exists in Settings but nothing reads it. Should it hide the slug transonic warning only (the diabolo warning is mandatory under §9I), or be removed?
3. ⚖ **Holds "Reticle mark" (P-04).** Confirm the intended reading: for a hold-over (bullet below the line of sight) the mark is the hash *below* centre. That is what the code comment says; the code does the opposite.
4. ⚖ **Coriolis and the zero (P-18).** Spin drift and aerodynamic jump are referenced to the zero (owner ruling 2026-11-05). Horizontal Coriolis is not. Same rule, or leave as is?
5. **King G7 0.127 and AEA CP G7 0.061 (P-17).** Both look like conversions, not measurements (0.250 × 0.509 = 0.127). Are they maker figures, or should they be marked estimated / left pending?
6. **Instrument uncertainty for velocity truing (P-11).** §7 gives the Xero as ±0.3 m/s. I have no verified figure for the LabRadar's downrange velocity. A band can't be shown honestly without one.
7. **Garmin "sea-level pressure".** The app converts with the ICAO formula, which is exact for QNH. Whether the Fenix shows QNH or a temperature-compensated value is unverified. **[est]** the difference at 300 m is on the order of 1 hPa (≈ 0.1 % density) — small, but unconfirmed.
8. **Measured dimensions.** All Sg numbers use nominal 6.35 mm and maker lengths 12.9 / 13.9 mm. No measured diameters or lengths are on file.

---

## C. Findings

### C.1 What reproduced correctly

| Check | App | Independent | Source |
|---|---|---|---|
| Queen G7 0.128 → kg/m² | 89.99 (×703.07) | 89.99; exact factor 703.0696 | lb and inch definitions **[calc]** |
| SD Queen (§9H, no π/4) | 0.13714 | 0.13714; /1.070 = 0.1282 | **[calc]** |
| Station pressure, 1010 hPa QNH at 298 m | 974.82 hPa | 974.82; 1013.25 at 1000 m → 898.75 | ICAO Doc 7488 formula **[calc]** |
| Ljubljana default ρ | 1.15159 | 1.15159 (same formula); 1.15205 CIPM-2007 (−0.04 %) | Picard et al. 2008 **[calc]** |
| Speed of sound 20 °C | 343.237 | 343.237 dry | √(γRT) **[calc]** |
| Worst case ρ (−5 °C, 1013, 80 %) | 1.3144 | 1.3144; CIPM 1.3153 | **[calc]** |
| Berger Queen 1:20″ | 1.181 | 1.183 at ISA 978 ft (977.9 hPa), 1.181 at 980 hPa → 1.18 | Miller Eq. 1 **[calc]** |
| Berger King 1:20 / 17 / 16″ | 1.068 / 1.478 / 1.668 | 1.071 / 1.483 / 1.674 at ISA → 1.07 / 1.48 / 1.67 | Miller **[calc]** |
| Penalty at Sg 1.18 | ×0.908 | Berger 0.221/0.245 = ×0.902 | skill §4B |
| G1 / G7 tables | 79 / 84 points | identical at every point | py-ballisticcalc `TableG1`, `TableG7` **[calc]** |
| Queen 255 m/s, default air, drop at 100 / 200 / 300 m | −356.77 / −2374.14 / −6314.66 mm | pbc −356.78 / −2374.21 / −6314.89; own RK4 dt 0.2 ms −356.78 / −2374.16 | **[calc]** |
| Same, velocity and TOF at 200 m | 226.047 m/s, 0.833815 s | pbc 226.042, 0.833825; own RK4 226.047, 0.833815 | **[calc]** |
| Transonic launch 330 m/s (M 0.96), drop at 200 m | −1428.61 mm | own RK4 dt 0.2 ms −1428.62; pbc −1427.39 (its own air model) | **[calc]** |
| Two-pass zero: zero in 0 °C / 979.6 hPa / 80 %, fire in default air | +0.362 mm at 50 m, −2372.70 at 200 m | pbc +0.363, −2372.76 | **[calc]** |
| Eötvös, 250 m/s constant, 500 m, lat 46.05°, east / west | +50.61 / −50.61 mm | Ω·cos(lat)·X·T = 50.61 | analytic **[calc]** |
| `twistForSg`, Queen, Sg 1.5 at worst case | 16.634″ | 20·√(1.0376/1.5) = 16.634″ | closed form **[calc]** |

Also confirmed by reading: the drag term carries π/8 (`Math.PI/4·ρv²Cd/(2·BC)`, line 1278); RK4 integrates velocity and position; the zero pass is level, in zero air, and never sees the wind field; cant changes only the reported impact shift; Coriolis, spin-drift and jump signs match their stated conventions; no path solves MV and BC together; drop truing shows ±½ click and MV +1 m/s; `homeTraj`, `runTraj` and `computeCardTraj` all skip the penalty when `bcIsTrued`.

**§10A:** no theoretical SEN design appears as an anchor, seed or test datum in `index.html` or `tests/`. The only hits are the old seeded C values inside `migrateMillerC`, which exist to remove them.

### C.2 Findings table

Line numbers refer to `index.html` at d82fd52.

| ID | Sev | Confidence | Location | Evidence | Impact |
|---|---|---|---|---|---|
| P-01 | S1 | Reproduced | `tuApply` 4273–4289 | After applying a velocity-trued BC (23 m, 280 → 275.0 m/s) the profile holds G7 0.1026, but the session still has `S.bc` 0.128 with source "profile". `tdApply` (4379) re-pulls; `tuApply` does not. | Dope keeps the old BC, and because the profile is now flagged trued the Sg penalty is dropped too. At 280 m/s: 9.76 mrad shown vs 10.03 needed at 200 m **[calc]**. Lasts until the projectile is re-selected. |
| P-02 | S1 | Reproduced | `IMPORT_FIELDS.projectiles` 4474 | The whitelist has no `bcTrued` or `bcBands`. A Queen with trued G7 0.119 comes back from export → import as `{bcg7: 0.119}` only. | Every restore, share or Drive restore turns a measured BC into a "maker" BC: the penalty ×0.921 is applied on top (violates §9S) and banded BCs collapse to one number. Home at 200 m: 11.97 → 12.09 mrad (24 mm), at 300 m 0.30 mrad **[calc]**. |
| P-03 | S1 | Reproduced | Truing inputs 786–788; `tuSolve` 4237–4245 | Air fields are fixed at 20 °C / **1010** hPa / 65 %, unlabelled, never filled from the session, and 1010 is used as station pressure. With the session on Everyday Default (station 974.8 hPa) a slug that truly has BC 0.128 trues to **0.1326**. | Trued BC 3.63 % high (= the density ratio 1.1934 / 1.1516). Dope low by 0.045 mrad at 200 m and 0.11 mrad at 300 m **[calc]**. Breaks the "every pressure marked station or sea-level" rule. |
| P-04 | S1 | Reproduced | `renderHolds` 3048; `printHolds` ~3061 | Condition is `hold<=0 ? mark(-hold) : 'above center'`. Queen, zero 50 m: 100 m row reads "↑3.59 mrad · above center"; 25 m row (bullet above the line of sight) reads "1 mrad line +0.07". The printed sheet shows "—" for every row beyond the zero. | The reticle-mark column is inverted against the function's own comment ("nearest hash DOWN from center"): no mark where hold-over is needed, a lower-hash mark where hold-under is needed. The mrad and click columns are correct. |
| P-05 | S1 | Reproduced | `saveProj` 4402–4426 | Editing a projectile keeps `bcTrued` and `bcBands` (`Object.assign`). After typing G7 0.128 into a banded-trued profile: `bcTrued` still set, bands still present. | A maker BC entered after a truing is treated as measured: no Sg penalty (Queen ×0.921 skipped), and old bands still override it (see P-07). |
| P-06 | S2 | Reproduced | `velAtDist` 1620–1625 | Reads the velocity at the nearest whole metre. True BC 0.128 comes back as 0.1287 at 22.86 m (25 yd), 0.1260 at 27.43 m (30 yd), 0.1259 at 18.3 m, 0.1228 at 12.5 m. | Trued BC wrong by up to ≈ 0.5 m / d: −4 % at 12.5 m, ±0.6–1.7 % at yard distances. Hits anyone working in yards or with a short track. |
| P-07 | S2 | Reproduced | `rk4traj` `bcSiAt` 1256; `homeTraj` 2816–2822; `tdFit` 4324 | With bands on the profile, a manual BC of 0.200 leaves Home at 3.59 mrad (unchanged). Drop truing on a banded projectile returns "No BC fits: needs less elevation than any BC below 1.5 gives". | Manual override silently blocked (§20E) and the truing trial BC ignored, with a misleading message. |
| P-08 | S2 | Reproduced | `bcEffSg` 1614; callers 2812–2813, 3274–3276, 3770–3771 | King, worst case (−5 °C, 1013 hPa, 229 m/s): Sg 0.938. Home shows "Sg 0.94 BC×0.829" and a normal solution; Solver shows no flag. The Formulas page states the rule as 1.0 ≤ Sg < 1.5. | Penalty model used outside its stated range and a predicted-tumbling projectile gets ordinary dope with no warning. |
| P-09 | S2 | Reproduced | `renderTraj` 3338–3340; `APP.transonicWarn` 1884 / 2000 | Warnings exist only on the Trajectory tab. Pellet at 290 m/s (M 0.845): Home status has no warning. They key on the drag model, not the projectile: a slug on G1 gets the "Diabolo" text, a pellet on G7 gets only the generic one. Launch at M 1.22: no warning although the flight passes through M 0.8–1.2. Setting `transonicWarn` off changes nothing. | The mandatory diabolo warning (§9I) and the transonic warning (§9) are missing on Home/Field, Solver, Holds and dope cards — where dope is actually read. |
| P-10 | S2 | Reproduced | `solveShot` 1719–1726; `homeInput` 2998; Solver `sv-tdist` 991; `calcStab` 3434 | Home with the distance field emptied: "↑Infinity", "Infinity mrad", "←NaN". Stability with the pressure field emptied: "Infinity · stable ✓". `solveShot` with an undefined or NaN angle returns NaN. | Non-finite values reach the dope display (§20A input rule). |
| P-11 | S2 | Reproduced | `tuSolve` 4247–4266 | Velocity truing prints one BC with no band. Sensitivity at 23 m, 280 m/s (loss 4.0 m/s): ±0.3 m/s on either velocity moves BC 0.128 to 0.119 … 0.138 (±7.5 %); ±1 m/s gives 0.102 … 0.171 **[calc]**. | §9T requires the uncertainty to be shown. A near-field BC looks exact when it is not. |
| P-12 | S2 | Reproduced / Likely | "Cur pres hPa" 762 + `Bus.manual` 2634; Stability 880; `zeroConds` fallback 2572; `wxPres` 1237 | The manual current-pressure field is unlabelled and taken as station: typing the Garmin's 1010 at 298 m gives ρ 3.6 % high → 0.05 mrad at 200 m, 0.12 at 300 m **[calc]**. `wxPres({pres:1010, presType:'sea'})` with no altitude returns 1010, and the importer accepts such a profile (reproduced). The `zeroConds` fallback `1010` is unmarked (code reading). | Pressure kind is not stated at three entry points; a sea-level profile without altitude is silently used as station. |
| P-13 | S3 | Reproduced | `trueBCbanded` 1653–1662; `tuSolve` 4244, 4258 | Points 274.6 m/s at 23 m and 275.0 m/s at 50 m produce a band `{vHi 274.6, vLo 275, bc 2}`; the `flag` from `trueBCsingle` is dropped. Only "v ≥ muzzle" is checked, not that velocity falls point to point. | A clamp value (2.0 or 0.005) is shown and stored as a BC. The band can never be selected, so trajectories are not affected. |
| P-14 | S3 | Reproduced | `solveShot` 1737 | The drift baked into the zero uses the current-air TOF at the zero range. Zero in winter air, fire in default air: lag 3.293 ms (zero pass) vs 3.014 ms used. | Windage off by 0.017 mrad for a 3 m/s zero wind, 0.028 mrad for 5 m/s **[calc]** — under a third of a click. `pts.zeroTof` already holds the right number. |
| P-15 | S3 | Reproduced | `rk4traj` 1289–1300, 1314 | Bisection is bounded at ±0.1 rad with no check: zero 1000 m returns za = 0.1000 and −18.5 m "drop at zero". The flight loop has no step cap: look 90° with a range the bullet cannot reach never returns (killed after 20 s). | Silent wrong result for an unreachable zero; a tab hang for a contrived input. Neither is reachable with normal airgun inputs. |
| P-16 | S3 | Likely (code reading) | `calcStab` 3438–3439; `computeCardTraj` 3760 | A typed C ≥ 0.5 is accepted before the pellet check, so a pellet gets an Sg on the Stability tab (`projC` checks the type first; `calcStab` does not). A dope card whose rifle was deleted calls `zeroConds(undefined, …)`, which falls back to the *active* rifle's zero conditions. | Pellet rule (§9S) bypassable on one screen; a card can silently use another rifle's zero air and wind. |
| P-17 | S3 | Likely | Seeds 2546–2547 | King `bcg7: 0.127` and AEA CP `bcg7: 0.061` sit under "Confirmed BC (seeded complete)". 0.250 × 0.509 = 0.127. | King trajectories run on a converted G7 (±5–8 % per the skill) with no EST mark — a silent estimate. |
| P-18 | S4 | Reproduced | `coriolisH_mm` 1822; `solve` 3608, 3618 | Horizontal Coriolis at 200 m: 8.93 mm, of which 2.10 mm is already inside a 50 m zero; at 300 m 20.9 mm and 3.2 mm **[calc]**. | Inconsistent with the "measured from the zero" ruling; about 0.01 mrad. |
| P-19 | S4 | Likely (code reading) | `solveShot` 1725 | `dropAbs = P===pts ? tp.drop*cosd : tp.drop` is the withdrawn Rifleman's rule. It runs only when a trajectory without `recalc` is solved at an angle, which no current caller does. | Dead path that would silently reintroduce a withdrawn formula. |
| P-20 | S4 | Reproduced | `sos` 1239; `airDensity` 1238 | Humidity is ignored in the speed of sound: **[est]** +0.25 % at default air, +0.5 % at 30 °C / 65 %. Effect at 200 m: 0.3 mm at 280 m/s, 0.6 mm at 300 m/s **[calc]**. Density is 0.03–0.07 % below CIPM-2007. | Negligible. Document as a known approximation; no code change. |
| P-21 | S4 | Reproduced | docs, constants | `tests/README.md`: "twenty-nine" suites, "135" anchors (now 149), Berger note "986 hPa" (code uses 980). `CLAUDE.md` points to V7 and still has the "C is calibre-specific" rule. Skill header still says V1.9.0 is canonical and mentions per-design C. Formulas label "Everyday default 20 °C / 1010 hPa / 65 % → 1.1934" is a raw-input check, not the Everyday Default (1.1516). Literals `0.290888` (4299) and `3.43775` (1869) duplicate `MOA2MRAD`; inHg is 33.8639 in `calcSg` and 33.8638866667 in `QDEF`. Seeded rifles zero at 300 m altitude, the seeded weather at 298 m (0.23 hPa). | Maintainability; a reader can be misled about which anchor is which. |

---

## D. Fix guidelines for Opus

General rules for every item: minimal change, no renames or reformatting, no new abstractions; each fix ships with its test in the same commit; `FORMULAS` gets an entry or anchor where a formula or its range changes; physics changes are reproduced independently (§20A). Items marked ⚖ wait for the owner's ruling in section B.

**P-01 — session BC after velocity truing** · patch
- Scope: one line in `tuApply`, before `saveDB()`: `if(S.projId===p.id)Bus.pullFromProfiles(['bc']);` — the same line `tdApply` has. Nothing else.
- Test: extend `truedroptest.js` (it already covers "velocity-trued G7 BCs skip the penalty"): after `tuSolve(); tuApply()` on the session projectile, `S.bc === getProj().bcg7` and `S.src.bc === 'profile'`; Home's dial changes accordingly. A manual BC is replaced by the pull — say so in the patch log.
- Risk: low.

**P-02 — trued state through export / import** · patch
- Scope: add `bcTrued` (string) and `bcBands` to `IMPORT_FIELDS.projectiles`, with a new `IMPORT_CHECK` kind for bands: object with `drag` ∈ {g1, g7} and `bands` an array (≤ 16) of `{vHi, vLo, bc}`, all finite, `bc` > 0, `vHi > vLo`. Rebuild the bands field by field (whitelist), as `stages` is rebuilt. Also carry `bcConv` so `migrateTruedBC` does not convert an already-converted BC a second time; an import that has `bcTrued` but no `bcConv` and comes from a pre-V1.24.2 export must still be migrated — check how `importData` orders the migrations before touching this.
- Test: `importtest.js` — own export of a drops-trued and a banded-trued projectile comes back identical; malformed bands are dropped; Home's `sgP` is 1 after the round trip. Known answer **[calc]**: Queen trued 0.119, 255 m/s, default air, 200 m → 11.97 mrad before and after (12.09 today).
- Risk: medium (schema). Run `importtest`, `sharetest`, `bcmigtest`, `storagetest`, `drivetest`.

**P-03 — truing air** · patch
- Scope: in `tuInit`, fill `tu-temp`, `tu-pres`, `tu-rh` from the session (`S.ct`, `S.cp`, `S.crh`) when the session has them; relabel the pressure field "Pressure hPa (station)"; add the §20E source button ("Get from session") rather than overwriting what the user typed on later visits. Without a session, leave the pressure blank rather than 1010, and add `hPa>0` to the guard in `tuSolve` — today an empty field reads as 0 hPa and passes `finiteGuard`.
- Formula: unchanged. Density must come from station pressure (skill §5B-1).
- Test: `truedroptest.js` or a small new block — session on Everyday Default → `tu-pres` reads 974.8; a velocity produced by the model for BC 0.128 trues back to 0.128 ± 1e-4 (today 0.1326). `unittest.js` classifies these inputs and will need its expectations checked.
- Risk: low.

**P-04 — Holds reticle mark** ⚖ · patch
- Scope: two conditions. In `renderHolds`, hold-over rows (`hold > 0`) get `mark(hold)`; hold-under rows get the plain text "above center" (or the upper hash if the owner wants that — the reticle model may not carry upper hashes, do not invent them). Mirror the same sign in `printHolds`. Leave `mark()` itself alone.
- Test: new assertions in `striptest.js` or `unittest.js` (both already open the Holds page): Queen, zero 50 m, VCT-34: 100 m row (3.59 mrad) → "4 mrad line −0.41"; 25 m row → "above center"; the printed sheet shows 4 for 100 m.
- Risk: low; display only.

**P-05 — profile edit after truing** · patch
- Scope: in `saveProj`, when editing an existing projectile and the BC of the trued model changed (compare `bcg7`/`bcg1` to the stored value at 4 decimals), clear `bcTrued` and `bcBands` and append a short note ("trued BC replaced by a typed value"). Unchanged BC → keep both.
- Test: `truedroptest.js` — true, edit name only → still trued; edit the BC → `bcTrued` gone, `sgP < 1` again on Home.
- Risk: low.

**P-06 — `velAtDist` at any distance** · patch
- Scope: inside `velAtDist` only. Call `rk4traj(…, Math.max(10,d_m), d_m, 0, rho, aS, d_m, drag, bc)` (max = step = d) so the dense output lands exactly on `d_m`, and read the last point after checking `Math.abs(p.range-d_m) < 1e-9`; otherwise return `mv` as today. No change to `rk4traj`.
- Test: `runtests.js` — BC 0.128, 280 m/s, default air, velocities taken from a 0.01 m-step trajectory: at 12.5, 18.3, 22.86, 27.43, 45.72 m `trueBCsingle` returns 0.128 ± 2e-4 (today 0.1228 / 0.1259 / 0.1287 / 0.1260 / 0.1288). I ran this read against the unmodified engine: it gives 0.12794–0.12799 at those distances **[calc]**; the residual comes from my reference using a 50 m zero, so generate the test velocities with the same zero and sight as `velAtDist` (zero = max(10, d), sight 0). The existing 100 m anchor must not move.
- Risk: low. `bcmigtest` and `formulatest` use this path — rerun both.

**P-07 — bands vs manual and trial BC** · patch
- Scope: at the three callers, not in `rk4traj`: pass `null` instead of `projBands(p,drag)` when the BC is not the profile's own — `runTraj` (when `S.src.bc==='manual'`) and `homeTraj` (when `S.src.bc==='manual'` or `bcOverride!=null`). `computeCardTraj` uses profile BCs only and stays as is.
- Test: `truedroptest.js` — banded projectile: a manual BC changes Home's dial; drop truing returns a BC instead of "No BC fits". Known answer **[calc]**: Queen 280 m/s, drop at 200 m with BC 0.200 and no bands −1874.69 mm; with bands 0.120 / 0.110 it is −1975.68 mm whatever the fallback BC.
- Risk: low.

**P-08 — Sg below 1.0** ⚖ · minor (new warning)
- Scope after the ruling. Option (a): keep the numbers, add one shared helper that returns the warning text when `sg < 1`, and show it in Home's status, the Trajectory flag line, the Solver flags, Holds and the dope-card note; change the Stability note that already says "tumbles ✗" only if needed. Option (b): return a `sgFail` state from `homeTraj`/`runTraj`/`computeCardTraj` handled like `bcPending`. In both, `bcEffSg` keeps its formula; make the Formulas text match what the code does.
- Source: skill §4B, §8F; Miller's rule (Courtney & Miller).
- Test: `stabtest.js` — King at −5 °C / 1013 hPa / 229 m/s → Sg 0.938 **[calc]** → warning present on each screen; a trued BC shows the Sg warning but no penalty.
- Risk: medium (several screens; run `domtest`, `fieldtest`, `rendertest` at 412 and 780 px).
- Register: needs a Feature Register entry before building (§21.7).

**P-09 — transonic and diabolo warnings where dope is read** ⚖ · minor
- Scope: one helper `machWarn(pts, projType)` returning `'diabolo'` when the projectile is a pellet and any point is above M 0.80, `'transonic'` when a slug's flight has any point inside M 0.8–1.2 (`maxM >= 0.8 && minM <= 1.2` over the points up to the target), else null. Use it in `renderTraj` (replacing the two drag-keyed conditions), Home status, Solver flags, Holds flags and the dope-card note / print header. Honour `APP.transonicWarn` for the slug warning only, or remove the setting, per the ruling.
- Source: PROJECT_INSTRUCTIONS §9, §9I; skill §0 rules 4–5.
- Test: new assertions in `flighttest.js`: pellet at 290 m/s → diabolo text on Home, Solver and the card; Queen at 300 m/s → transonic on Home; Queen at 420 m/s → transonic (today none); Queen at 255 m/s → none; slug on G1 never gets the diabolo text.
- Risk: medium (status-line length on the 412 px screen).
- Register: entry needed.

**P-10 — non-finite inputs** · patch
- Scope: (1) in `solveShot`, after the `zp`/`tp` check: `if(!(dist_m>0)||!isFinite(angle_deg||0)||!isFinite(wind_ms||0)||!isFinite(windDir_deg||0))return null;` and compute `cosd` from `angle_deg||0`. Callers already handle `null` as out of range. (2) in `calcStab`, extend the early return to `!(hPa>0)||!(mv>0)||!(twIn>0)` and clear the outputs instead of leaving the previous result on screen.
- Test: `runtests.js` — `solveShot(…, dist 0 …)` → null; undefined angle with zero wind → finite. `stabtest.js` — empty pressure → no Sg number. `fieldtest.js`/`domtest.js` — emptied distance shows the out-of-range state, never "Infinity" or "NaN".
- Risk: low. Check that no caller relies on a 0 m solution (the benchrest and course modules pass session distances).

**P-11 — uncertainty on velocity truing** · minor
- Scope: in `tuSolve` (single-point mode first), re-run `trueBCsingle` with the measured velocity ± δ and with MV ± δ and print the BC range, as drop truing does. δ needs the owner's figure (question B-6); until then show the sensitivity per 1 m/s and label it as such rather than as a band.
- Test: known answers **[calc]** (BC 0.128, 280 m/s, 23 m, default air): V₂₃ −0.3 / +0.3 m/s → 0.1190 / 0.1384; V₀ −0.3 / +0.3 → 0.1381 / 0.1192; V₂₃ ±1 m/s → 0.1022 / 0.1708.
- Risk: low. Do P-06 first, or these numbers shift.

**P-12 — pressure kind at every entry point** · patch
- Scope: label changes "Cur pres hPa (station)", "Pressure hPa (station)" on Stability; one sentence of help text pointing to a sea-level weather profile for Garmin readings. In `wxPres`, a `'sea'` profile whose altitude is missing (not a finite number) must not be converted silently: return `undefined` so the existing "select weather" guards fire, and make `sanitiseRecord('weathers')` reject such records or bring them in as station with a note — pick one and state it in the patch log. Altitude 0 stays valid: the seeded Global Worst-Case profile is `presType:'sea', alt:0`. Mark the `zeroConds` fallback as station in a comment; no behaviour change.
- Test: `pressuretest.js` — sea-level profile without altitude never yields a density; `importtest.js` — such a record is handled as chosen. `unittest.js`/`helptest.js` for the label text.
- Risk: low to medium (existing stored profiles: `migratePressureType` already guarantees altitude for the seeded ones; check a user profile with altitude 0 at a real sea-level site still works as station).

**P-13 — banded truing validation** · patch
- Scope: in `tuSolve`, after sorting, refuse points whose velocity does not fall from the previous one (extend the existing "≥ muzzle velocity" loop to compare with the previous point); surface a segment's `flag` in the table instead of dropping it. `trueBCbanded` itself unchanged.
- Test: points (23 m, 274.6) and (50 m, 275.0) → refusal message, no result, no Apply.
- Risk: low.

**P-14 — zero wind in zero air** · patch
- Scope: `solveShot` line 1737 only: when `pts.zeroTof != null`, use `windDrift(pts.zeroTof, zero_m, mv, zCrossSigned)`; else today's expression.
- Test: `runtests.js` — zero in 0 °C / 979.6 hPa / 80 %, current default air, Queen 255 m/s, 3 m/s from the right in the zero session: baked drift 9.88 mm (today 9.04) **[calc]**. With equal air the result must be bit-identical to today — assert that too, and rerun `samezerotest`, `windtest`, `stationtest`.
- Risk: low; changes windage by ≤ 0.03 mrad only when zero air ≠ current air and the zero had crosswind.

**P-15 — solver bounds** · patch
- Scope: `rk4traj` only. After the bisection, if `za` sits within 1e-9 of ±0.1, set `out.zeroFail=true` and return an empty point list (callers then show out of range). Add the same `n++<1e5` cap the zero pass has to the flight loop's `while`.
- Test: `runtests.js` — zero 1000 m, Queen 255 m/s → no points / `zeroFail`; look 90°, max 3000 m → returns within the cap; all existing trajectory anchors bit-identical.
- Risk: this touches the verified integrator — keep to those two lines and rerun every suite listed in `tests/README.md`. `chVert` (5163) calls `nearestPt(…).drop` without a null check, so confirm it cannot receive an empty list.

**P-16 — pellet C on the Stability tab; card without rifle** · patch
- Scope: in `calcStab`, test `stabKind.pellet` before the C override. In `computeCardTraj`, pass `r||null` to `zeroConds` so a missing rifle does not fall back to the active one (check `zeroConds`'s `rifle!==undefined` test; with `null` it uses the weather fallback).
- Test: `stabtest.js` — pellet with C 2.0 → "not computed". `coursetest.js` — card whose rifle id is unknown: zero conditions are the fallback, not the session rifle's.
- Risk: low.

**P-17 — converted seed BCs** ⚖ · patch
- Scope after the owner's answer: either mark the two values in the seed notes and show "(est)" where the BC is displayed, or seed them as pending (0) so the trajectory is blocked with truing guidance — the standing convention. Existing installs are not touched by a seed change; decide whether a one-off migration is wanted.
- Risk: `storagetest`, `homelayouttest`, `coursetest` compare against earlier releases' seeds.

**P-18 — Coriolis from the zero** ⚖ · patch, only if ruled in
- Formula: Δ(d) − Δ(z)·d/z for the horizontal part, with Δ(z) from the zero pass. The vertical part depends on azimuth, which the zero session does not record — leave it.
- Indicative numbers **[calc]**, both terms taken from the current-air flight (zero air 0 °C, current default air): Queen 255 m/s, lat 46.05°, zero 50 m: 200 m 8.93 − 2.10 = 6.83 mm; 300 m 20.93 − 3.15 = 17.78 mm. Recompute the zero term from the zero pass before using them as a test anchor.

**P-19 — withdrawn Rifleman branch** · optional
- Justification: a withdrawn formula should not be reachable. Replace `P===pts?tp.drop*cosd:tp.drop` with `tp.drop`, and return null when an angle is given but the trajectory has no `recalc`. Optional because no current caller reaches it; do it together with P-10 if at all.

**P-20 — speed of sound** · no code change
- Add one line to the Formulas "Speed of sound" entry and the skill §14: dry-air value; humid air is up to about 0.5 % faster in hot, humid weather; effect on drop at 200 m below 1 mm at the velocities checked.

**P-21 — documents and literals** · docs, with the next release
- Update `tests/README.md` counts and the Berger pressure note; point `CLAUDE.md` at V8 and replace rule 6 with the Miller wording; fix the skill header. Rename the Formulas anchor to "formula check: 20 °C / 1010 hPa as typed / 65 %" and add an Everyday Default anchor: `airDensity(20, stationPres(1010,298), 65)` → 1.1516 ± 5e-4. Replace the two angular literals with the existing constants. Literal clean-up is optional — it changes no result at the displayed precision.

### Test gaps to close (independent of the fixes above)

No known-answer test exists today for:
- `trueBCbanded` and `bandBC`, and a banded trajectory. Self-consistency anchor: bands that all carry 0.128 give a trajectory bit-identical to the single BC 0.128.
- `velAtDist` / `trueBCsingle` off the 1 m grid (P-06).
- Two-pass zero with different zero and current air against an independent solver. Use the pbc numbers in C.1: +0.363 mm at 50 m, −356.06 at 100 m, −2372.76 at 200 m, −6312.71 at 300 m (app today +0.362 / −356.05 / −2372.70 / −6312.49).
- Default-air trajectory at station pressure (all existing anchors use 1010 hPa as typed): pbc −356.78 / −2374.21 / −6314.89 mm at 100 / 200 / 300 m.
- `coriolisV_mm` (Eötvös): +50.6095 mm east, −50.6095 mm west for the case in C.1; `xTimeIntegral`.
- `twistForSg`: 16.634″ for the case in C.1; the Stability tab's worst-case Sg (Queen 1.038, King 0.938 **[calc]**).
- `cantShift` on a sloped shot, and `windDriftField` on a sloped trajectory — no reference produced in this review; needs a py-ballisticcalc run.
- Trued-BC survival through export/import (P-02) and through a profile edit (P-05).
- Any warning text (P-08, P-09) and any non-finite display (P-10).
- The Holds reticle-mark column (P-04).

---

## E. Suggested release grouping and order

| Order | Release | Items | Why together |
|---|---|---|---|
| 1 | V2.16.1 (patch) | P-01, P-02, P-05, P-07 | Trued-BC integrity: every path that stores, restores or overrides a measured BC. Run `truedroptest`, `importtest`, `sharetest`, `bcmigtest`, `storagetest`. |
| 2 | V2.16.2 (patch) | P-03, P-06, P-13, P-12 | Truing inputs and pressure kind. P-06 before P-11. Any BC trued on the Truing tab with the default 1010 hPa should be re-trued afterwards — say so in the patch log. |
| 3 | V2.16.3 (patch) | P-04, P-10 | Display correctness (Holds marks after the ruling, non-finite values). |
| 4 | V2.17.0 (minor) | P-08, P-09, P-11 | New warnings and the truing uncertainty; all three need rulings and Feature Register entries first. |
| 5 | V2.17.1 (patch) | P-14, P-15, P-16, P-17, P-21, test gaps; P-18 and P-19 if ruled in | Low-impact consistency, guards, documents. P-15 touches `rk4traj` — full regression. |

Skill and Feature Register updates (project knowledge) follow each release as §21.6 requires: skill §4B-1 (trued state survives import), §5B-1 (truing air), §14 (speed-of-sound note).

---

## F. Owner rulings (2026-11-17)

| Question | Ruling | Effect on the plan |
|---|---|---|
| B-1 Sg < 1.0 | Warn, keep the dope | P-08 option (a): warning on Home, Trajectory, Solver, Holds, dope cards; penalty unchanged; Formulas text states it is extrapolated below 1.0. |
| B-2 Transonic setting | Slug warning only | P-09: `APP.transonicWarn` hides the slug transonic warning; the diabolo warning always shows. |
| B-3 Holds reticle mark | Agreed | P-04 as written: hold-over rows name the hash below centre. |
| B-4 Coriolis from the zero | Accepted suggestion | P-18 confirmed: horizontal part referenced to the zero (Δ(d) − Δ(z)·d/z, Δ(z) from the zero pass); vertical part unchanged. Ships in V2.17.1. |
| B-5 King G7 0.127, AEA CP G7 0.061 | Maker figures | P-17 closed, no code change; treated as maker BCs (notes until trued). |
