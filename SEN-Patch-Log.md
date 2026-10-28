# SEN Ballistics — Patch Log

Standing rule (from V1.12.5): every release ships with this file updated in the same commit.
Format: version — type — one-line summary, then Problem / Fix / Files / Verify.
Newest entry on top. Deploy set per release: `RTI-SEN-Ballistic-Calculator-V{x}.html` + `index.html` (byte-identical) + `sw.js` (CACHE bumped).
Since 2026-10-22 this file lives in the repo root and is the project's single changelog (register decision A-09). Regression tests live in `tests/` (see `tests/README.md`).

---

## V1.33.0 — minor — True BC from impacts (CALC-04, option A); trued BCs no longer get the Sg penalty twice

**Problem.**
1. BC could only be trued from downrange *velocity* (LabRadar, real data only to ~23 m). The common field method — the dial that actually hit at a far distance — wasn't possible.
2. **Bug:** a trued BC (from velocity) was still multiplied by the under-stabilisation penalty. A measured BC already contains any stability loss, so it was counted twice. (My note at V1.30.0 that trued BCs were unaffected was wrong; this release makes it true.)

**Fix.**
- Truing tab → new panel **True BC from impacts**: distance, shot angle, the dial that centred the group (clicks, mrad or MOA, from the turret zero) and the group centre's offset (+ high / − low). Uses the live session: rifle, projectile, MV, zero conditions, current air, drag model.
- `trueBCdrop`: bisection on BC until the solved dial at the target equals the needed dial (= dial − offset/distance). `homeTraj(max, bcOverride)` runs the session model with a trial BC.
- Result: trued BC (lb/in² and kg/m²), profile BC and the % difference, needed dial, and **sensitivity** — the BC range for ±½ click and the BC for MV +1 m/s. Example (Queen, 280 m/s, 150 m): ±½ click ≈ ±8 % BC, MV +1 m/s ≈ −7 % BC — so shoot far, average several groups and use a well-measured MV.
- Apply stores it like velocity truing (`bcTrued = drops·g7·date·150m`, bands cleared).
- `bcIsTrued`: Home, Trajectory and dope cards skip the Sg penalty for a BC trued for the drag model in use (velocity or drops); a manual BC already skipped it.
- Formulas page: "BC from impacts (drop truing)" with a py-ballisticcalc anchor.

**§20A.** py-ballisticcalc 3.1.1 dial for a known BC (Queen geometry, 260 m/s, zero 50 m, 20 °C / 1010 hPa / 65 %): 7.42095 mrad at 150 m → 0.10997 (true 0.110); 3.46512 mrad at 100 m → 0.10998; 11.33227 mrad at 200 m (BC 0.140) → 0.13996. Own-model round trip exact.

**Files:** `index.html` (`trueBCdrop`, `bcIsTrued`, `homeTraj` override + trued no-penalty, runTraj / dope penalty guard, Truing panel `tdContext`/`tdSolve`/`tdApply`, FORMULAS, unit exemptions; 5 live version strings) · `sw.js` CACHE → `sen-ballistics-v1.33.0` · `tests/runtests.js` +5 (93) · new `tests/truedroptest.js` (14) · `tests/README.md` (twenty-one suites).

**Verify:** `node --check` clean · `runtests.js` 93/93 · `domtest.js` 14/14 · `storagetest.js` 22/22 · `importtest.js` 28/28 · `sharetest.js` 24/24 · `windtest.js` 22/22 · `unittest.js` 18/18 · `coursetest.js` 21/21 · `layouttest.js` 18/18 · `rendertest.js` 22/22 · `bcmigtest.js` 11/11 · `formulatest.js` 19/19 · `swtest.js` 6/6 · `homelayouttest.js` 31/31 · `courserunnertest.js` 20/20 · `calypsotest.js` 18/18 · `windavgtest.js` 28/28 · `stabtest.js` 12/12 · `flighttest.js` 16/16 · `pressuretest.js` 12/12 · **`truedroptest.js` 14/14** · real Chromium at 412 / 780 px: no sideways scroll · `index.html` byte-identical to `RTI-SEN-Ballistic-Calculator-V1.33.0.html`. Dope changes only for projectiles with a trued BC (penalty no longer doubled).

---

## V1.32.0 — minor — Cant: impact shift from a tilted rifle (CALC-06)

**Problem.** Cant wasn't modelled. Slow airgun slugs fall a long way below the bore line, so a small tilt moves the impact a lot: Queen at 260 m/s, zero 50 m, 100 m — **13.2 mm sideways per degree**; 5° → 66 mm.

**Fix.**
- `cantShift`: rotating the rifle by φ about the line of sight rotates everything fixed to the scope (bore line and the dialled/held correction) but not gravity. With S = the gravity drop below the bore line at the target, the impact moves S·sin φ sideways (right for a right cant) and S·(cos φ − 1) low.
- Trajectories expose `za` (zero angle) and `sight`; `solveShot(..., cant)` returns `cantX`, `cantY` and `cantPerDeg`. **Display only** — the dial is not changed; the fix for cant is to level the rifle (and later the FX chrono / rifle unit will report it, CALC-19 / CALC-12).
- Home: "Cant ° (+ right)" input; the status line warns "cant 2° R → impact 22.8 mm right, 0.4 mm low — level the rifle". Solver: cant input and a flag with the 1° sensitivity at the target distance.
- Formulas page: new "Cant" entry with a py-ballisticcalc anchor.

**§20A.** py-ballisticcalc 3.1.1 `cant_angle` with the dial set to the level correction (Queen, zero 50 m): 5° at 50 / 100 / 200 m → 16.14 / 65.97 / 275.55 mm sideways — reproduced to 0.01 mm; vertical −0.70 / −2.88 / −12.03 vs −0.70 / −2.90 / −12.51 mm (0.5 mm at 200 m is pbc's second-order flight-time effect of the tilted launch; immaterial next to the sideways shift).

**Files:** `index.html` (`cantShift`, `rk4traj` za/sight, `solveShot`, Home + Solver inputs and messages, FORMULAS, units exemptions; 5 live version strings) · `sw.js` CACHE → `sen-ballistics-v1.32.0` · `tests/runtests.js` +12 (88) · `tests/flighttest.js` +3 (16) · `tests/README.md`.

**Verify:** `node --check` clean · `runtests.js` 88/88 · `domtest.js` 14/14 · `storagetest.js` 22/22 · `importtest.js` 28/28 · `sharetest.js` 24/24 · `windtest.js` 22/22 · `unittest.js` 18/18 · `coursetest.js` 21/21 · `layouttest.js` 18/18 · `rendertest.js` 22/22 · `bcmigtest.js` 11/11 · `formulatest.js` 19/19 · `swtest.js` 6/6 · `homelayouttest.js` 31/31 · `courserunnertest.js` 20/20 · `calypsotest.js` 18/18 · `windavgtest.js` 28/28 · `stabtest.js` 12/12 · `flighttest.js` 16/16 · `pressuretest.js` 12/12 · `index.html` byte-identical to `RTI-SEN-Ballistic-Calculator-V1.32.0.html`. No dope change.

---

## V1.31.1 — patch — Default pressures are sea-level (QNH): seeded profiles and rifle zero converted

**Problem.** The owner's Garmin Fenix shows barometric pressure reduced to mean sea level (Garmin forum; the watch read 1022 hPa at 304 m, which can only be QNH). The seeded weather profiles (1010 / 1008 / 1015 hPa at 298 m) and the rifles' zero pressure came from it, but were used as station pressure — about 35 hPa, 3.5 % too much air on every default profile.

**Fix.**
- Seeded weather profiles (Everyday Default, Summer Hot, Winter Local, Global Worst-Case) → "Sea level (QNH)" at their stored altitude; the Everyday note now reads 1010 hPa QNH = 974.8 hPa at 298 m, ρ 1.1516 kg/m³. New weather profiles default to sea level.
- Other existing profiles → "Station" with a note to change it if the value came from a weather app or the Garmin.
- Rifle zero conditions: new "Zero pressure is: Sea level (QNH, Garmin) / Station" and "Zero altitude m"; existing rifles → sea level at 300 m. Zero conditions are converted with the same ICAO formula. Zero-condition lines say "station".
- `migratePressureType` runs once per record (type set); import keeps `zPresType` / `zAlt` (whitelisted). Global worst case is at 0 m, so 1013 hPa is unchanged.

**Dope change (Queen 60 gr, Mora .25 1:20″, 280 m/s, Everyday Default):** ρ 1.1934 → 1.1516; Sg 1.22 → 1.26 (BC_eff 0.1177 → 0.1194); drop at 300 m 5321 → 5276 mm (−45 mm, ≈ 0.15 mrad); wind 3 m/s at 200 m 157 → 149 mm, at 300 m 359 → 340 mm (≈ −5 %).

**Files:**
- `index.html`: weather seeds, `migratePressureType`, `zeroConds`, rifle seed/form/save/whitelist, weather form default, zero-condition display; 5 live version strings.
- `sw.js`: CACHE → `sen-ballistics-v1.31.1`.
- New `tests/pressuretest.js` (12); `tests/stabtest.js` (expected Sg uses the station pressure); `tests/homelayouttest.js` (sanity bands follow the lower density; equality with the solver unchanged); `tests/README.md` (twenty suites).

**Verify:** `node --check` clean · `runtests.js` 76/76 · `domtest.js` 14/14 · `storagetest.js` 22/22 · `importtest.js` 28/28 · `sharetest.js` 24/24 · `windtest.js` 22/22 · `unittest.js` 18/18 · `coursetest.js` 21/21 · `layouttest.js` 18/18 · `rendertest.js` 22/22 · `bcmigtest.js` 11/11 · `formulatest.js` 19/19 · `swtest.js` 6/6 · `homelayouttest.js` 31/31 · `courserunnertest.js` 20/20 · `calypsotest.js` 18/18 · `windavgtest.js` 28/28 · `stabtest.js` 12/12 · `flighttest.js` 13/13 · **`pressuretest.js` 12/12** · `index.html` byte-identical to `RTI-SEN-Ballistic-Calculator-V1.31.1.html`.

---

## V1.31.0 — minor — Shot angle and head/tailwind solved inside the trajectory; sea-level (QNH) pressure

**Problem.**
1. **Shot angle** used the Rifleman's rule on the drop from the line of sight. That rule is an approximation, and applied to the LOS drop (which includes sight height and zero) it is badly off for slow projectiles: Queen at 30° uphill, 100 m slant, read 2.53 mrad; the trajectory solved on the slope needs 2.06 mrad (0.47 mrad, ≈ 47 mm too much).
2. **Head/tailwind** was ignored — only the crosswind component was used.
3. **Pressure** was always treated as station pressure. Weather apps and many watches give sea-level (QNH) pressure; at 300 m that is ≈ 35 hPa too high → air density ≈ 3.5 % too high.

**Fix.**
- `rk4traj` takes an optional `flight = {look, head, zHead}` and integrates in the line-of-sight frame: gravity (−g·sin α, −g·cos α), horizontal wind rotated into the frame, drag on the velocity relative to the air. Zero pass level (rifle sighted in on the level) with the zero session's head/tailwind. Without `flight` the integration is bit-identical to before.
- Trajectories carry `recalc(look, head, zHead)` (cached). `solveShot` re-solves when the shot has an angle or the wind has an along-the-line component; distance is then the slant range and drop is from the sloped LOS. Level shots in a pure crosswind take the old path unchanged.
- The sight stays perpendicular to the bore on a slope (rigid scope). py-ballisticcalc places it vertically above the bore instead; the two differ by h·(1−cos α) (5.9 mm at 30°, 44 mm sight).
- Weather profiles: "Pressure reading is: Station / Sea level (QNH)". Sea level needs the altitude and is converted with the ICAO standard atmosphere P = QNH·(1 − 2.25577e-5·h)^5.25588. Shown as "QNH" in lists; kept through restart, export and import (`presType` whitelisted). Existing profiles stay "station" — nothing changes until you mark one.
- Formulas page: Shot angle, Head/tailwind, Station pressure from QNH, each with its anchor. Solver note and angle flag no longer mention the Rifleman's rule.

**§20A.** py-ballisticcalc 3.1.1, Queen G7 0.128 @ 260 m/s, zero 50 m, sight height 0: look 15°/30°/−20° at 100 and 200 m slant within 0.02–0.5 mm; 5 m/s headwind −387.98 / −2434.57 vs −387.99 / −2434.64 mm; 30° + 5 m/s tailwind within 0.8 mm at 200 m. ISA: 1013.25 hPa at 1000 m → 898.75 (ISA table 898.76).

**Finding for a ruling (not changed).** The seeded weather profiles (e.g. "Everyday Default 20 °C · 1010 hPa · 298 m") and the rifles' default zero pressure (1010 hPa) are almost certainly sea-level values: 1010 hPa as *station* pressure at 298 m would need a QNH of about 1046 hPa, which doesn't happen. Read as QNH, 1010 hPa at 298 m is 974.8 hPa at the station and the everyday density is 1.1516, not 1.1934 kg/m³ (−3.5 %). The skill's everyday default (ρ 1.1934) has the same issue.

**Files:**
- `index.html`: `rk4traj` (flight frame, `recalc`), `solveShot`, `stationPres`, `wxPres` (zero conditions, session pull, Home, dope cards, Stability tab), weather form + list + import whitelist, Solver note/flag, FORMULAS; 5 live version strings.
- `sw.js`: CACHE → `sen-ballistics-v1.31.0`.
- `tests/runtests.js` +14 anchors (76), new `tests/flighttest.js` (13), `tests/README.md` (nineteen suites).

**Verify:** `node --check` clean · `runtests.js` 76/76 · `domtest.js` 14/14 · `storagetest.js` 22/22 · `importtest.js` 28/28 · `sharetest.js` 24/24 · `windtest.js` 22/22 · `unittest.js` 18/18 · `coursetest.js` 21/21 · `layouttest.js` 18/18 · `rendertest.js` 22/22 · `bcmigtest.js` 11/11 · `formulatest.js` 19/19 · `swtest.js` 6/6 · `homelayouttest.js` 31/31 · `courserunnertest.js` 20/20 · `calypsotest.js` 18/18 · `windavgtest.js` 28/28 · `stabtest.js` 12/12 · **`flighttest.js` 13/13** · `index.html` byte-identical to `RTI-SEN-Ballistic-Calculator-V1.31.0.html`.

---

## V1.30.0 — minor — Built-in Miller/Berger stability; theoretical SEN designs removed from all calculations

**Problem.**
- Sg needed a per-calibre constant C typed in from Berger's website. The fallback table mixed real benchmarks with values from SEN designs that don't exist yet (LR-25 1.877, .30 2.699, .35 3.822), and those fed the BC under-stabilisation penalty — so a real .30/.35 slug could get its dope changed by a theoretical design's constant.
- Berger's calculator is the Miller twist rule. With twist in inches Miller's 30 becomes C = 30·d² — a unit conversion. King (1.886), .30 and .35 were already that; **Queen 2.283 was not**: the owner re-ran Berger on 2026-10-28 with the real 0.508″ length and got **Sg 1.18** (adjusted BC 0.221, −10 %), not 1.43. The old anchor came from a wrong-length run, so the Queen profile overstated stability and under-applied the BC penalty.

**Fix.**
- `millerC` (C = 30·d²) + `projC`: every slug gets a Miller Sg from its own mass, diameter, length, twist, MV, temperature and pressure. A C stored in a profile is an override.
- Not computed: L/D < 2.0 (outside Miller's fitted range, as before) and **pellets** (drag-stabilised — the Stability tab says so; Home shows nothing instead of a warning; no BC penalty).
- Hollow-point flag on the Stability tab (Miller assumes even density). Stability tab C field: "C override (0 = Miller 30·d²)".
- Migration (`migrateMillerC`, at start-up and after every import): profiles holding exactly one of the C values the app handed out (2.283, 1.886, 1.877, 2.699, 3.822) go back to Miller, with a note; any other C is kept. Seeds: Queen and King C → 0.
- Formulas page: "Miller twist rule (= Berger calculator)" anchored to Berger's own results (Queen 1.18, King 1.07 / 1.48 / 1.67, 978 ft ≈ 980 hPa); BC penalty checked against Berger's −9.8 % (ours −9.2 %); the EST "C lookup" entry is gone (4 EST formulas left).
- Removed: the LRAI-35 test anchor, the LR-25 / .30 / .35 design constants, every code reference to SEN designs as data.

**Dope change (Queen, Mora .25 1:20″, 280 m/s, Ljubljana default air).** Sg 1.48 → 1.22; effective BC G7 0.1274 → 0.1177 (−7.6 %); drop at 300 m +70 mm (≈ 0.23 mrad); wind drift 3 m/s at 200 m 144 → 157 mm. King barely moves. Profiles with a manual or trued BC are unaffected (no penalty on those, as before).

**Docs.** `SEN-BALLISTICS-SKILL.md` V5.3: §8 rewritten around Miller (C = 30·d²), Berger anchors re-run, old Queen 1.43/1.98 rows and every SEN design row withdrawn, §1B/§1C/§8E cleaned, §12A marked as theoretical design hypotheses, McGyro noted as the next stability step.

**Files:**
- `index.html`: `millerC`, `projC`, `isHollowPoint`, `migrateMillerC`, Stability tab, Home/trajectory/dope/solver Sg paths, FORMULAS; seeds; 5 live version strings.
- `sw.js`: CACHE → `sen-ballistics-v1.30.0`.
- `tests/runtests.js` (62; Berger anchors, LRAI removed), new `tests/stabtest.js` (12), `tests/formulatest.js` (4 EST, Miller anchors), `tests/homelayouttest.js` (sanity bands follow the Queen's new BC penalty; equality with the solver unchanged), `tests/README.md` (eighteen suites).

**Verify:** `node --check` clean · `runtests.js` 62/62 · `domtest.js` 14/14 · `storagetest.js` 22/22 · `importtest.js` 28/28 · `sharetest.js` 24/24 · `windtest.js` 22/22 · `unittest.js` 18/18 · `coursetest.js` 21/21 · `layouttest.js` 18/18 · `rendertest.js` 22/22 · `bcmigtest.js` 11/11 · `formulatest.js` 19/19 · `swtest.js` 6/6 · `homelayouttest.js` 31/31 · `courserunnertest.js` 20/20 · `calypsotest.js` 18/18 · `windavgtest.js` 28/28 · **`stabtest.js` 12/12** · `index.html` byte-identical to `RTI-SEN-Ballistic-Calculator-V1.30.0.html`.

---

## V1.29.1 — patch — Trajectory position step is now full RK4: wind drift +0.5 %, matches py-ballisticcalc

**Problem.** Found during the V1.29.0 verification. `rk4traj` updated velocity with RK4 but moved the slug with the velocity at the start of each 2 ms step (`x + h·vx`), not the RK4 average the skill (§7) specifies. The slug ran slightly ahead of where it should be, so time of flight was 0.016 % short. Lag-rule wind drift depends on t − R/V₀ and came out 0.5 % low (37.03 instead of 37.22 mm, 3 m/s at 100 m); drop was 0.8 mm short at 200 m.

**Fix.** Position advances by h·(v₁ + 2v₂ + 2v₃ + v₄)/6 using the four RK4 stage velocities (one line in `step()`).

**Effect (Queen G7 0.128 @ 260 m/s unless noted; py-ballisticcalc 3.1.1 in brackets):**

| | before | after | pbc |
|---|---|---|---|
| TOF 100 m | 0.396957 s | 0.397022 s | 0.397025 s |
| Drift 3 m/s, 100 m | 37.03 mm | 37.22 mm | 37.22 mm |
| Drift 3 m/s, 200 m | 151.17 mm | 151.58 mm | 151.60 mm |
| Drop 200 m | −2287.75 mm | −2288.54 mm | −2288.62 mm |
| King G1 0.250 drop 200 m | −2276.61 mm | −2277.36 mm | −2277.33 mm |
| Velocity at 200 m | 229.410 m/s | 229.405 m/s | 229.399 m/s |

All wind dope rises by about 0.5 %; elevation changes are below 0.01 mrad at airgun ranges. Trued BCs move by about 0.02 % (0.100632 → 0.100653 from a 100 m velocity) — far inside measurement error, so stored trued BCs are left as they are. The Element cross-check stays inside its ±0.5 % band (1000 m drop 8650.4 cm vs 8636.8). One station vs two equal stations (V1.29.0 field solver) now agree to 0.03 % instead of 0.5 %.

**Files:**
- `index.html`: `rk4traj` → `step()` position update; Formulas: lag-rule drift gets a py-ballisticcalc anchor (37.22 mm); 5 live version strings.
- `sw.js`: CACHE → `sen-ballistics-v1.29.1`.
- `tests/runtests.js` +4 anchors (57; all four fail on V1.29.0); `tests/README.md`.

**Verify:** `node --check` clean · `runtests.js` 57/57 · `domtest.js` 14/14 · `storagetest.js` 22/22 · `importtest.js` 28/28 · `sharetest.js` 24/24 · `windtest.js` 22/22 · `unittest.js` 18/18 · `coursetest.js` 21/21 · `layouttest.js` 18/18 · `rendertest.js` 22/22 · `bcmigtest.js` 11/11 · `formulatest.js` 19/19 · `swtest.js` 6/6 · `homelayouttest.js` 31/31 · `courserunnertest.js` 20/20 · `calypsotest.js` 18/18 · `windavgtest.js` 28/28 · `index.html` byte-identical to `RTI-SEN-Ballistic-Calculator-V1.29.1.html`.

---

## V1.29.0 — minor — Solver core for wind that changes along the flight (CORE-17, no UI yet)

**Problem.** CORE-17 needs the solver to use several wind stations at once. The solver only knew one crosswind for the whole flight (Didion lag rule).

**Fix.**
- New `crossField(stations, mode)`: stations `{x: m along the line of fire, cross: signed crosswind m/s}` → crosswind at any distance, by **nearest** station (boundary halfway) or **blend** (linear between stations, flat beyond the ends).
- New `windDriftField(pts, range, w)`: lateral point-mass equation dvz/dt = −k·(vz − w(x)) with the trajectory's own drag factor, integrated as z = ∫∫ w du dx (u = 1/vx). For a uniform wind it reduces to the lag rule.
- `rk4traj` output points also carry `vx` (no other value changes). `solveShot` takes an optional last argument `field`; without it (every caller today) the result is unchanged. One station will keep using the lag rule, so its dope stays bit-identical.
- Formulas page: new verified entry with three py-ballisticcalc anchors.
- Not yet used for dope: needs the CORE-17 station UI and the owner's design calls.

**§20A.** py-ballisticcalc 3.1.1 (full 3-D, wind inside the relative velocity, per-zone `Wind(until_distance)`), Queen G7 0.128 @ 260 m/s, zero 50 m, 20 °C / 1010 hPa / 65 %: uniform 3 m/s within 0.05 %; five two-station cases (three nearest, two blend) within 0.5 mm at 100 m and 1.5 mm at 200 m. Wind near the muzzle dominates: 3 m/s over the first 100 m of a 200 m shot = 112 mm, over the last 100 m = 39 mm.

**Found, not fixed (needs a ruling).** `rk4traj` updates velocity by RK4 but advances position with the start-of-step velocity (`x + h·vx`). Time of flight is 0.016 % short, so the lag-rule drift is 0.5 % low (37.03 vs 37.22 mm, 3 m/s at 100 m); drop is 0.8 mm short at 200 m. With RK4 positions the app matches py-ballisticcalc to 3e-6 s, 0.1 mm drop and 0.00 mm drift. `windDriftField` uses the accurate vx, so until the fix two equal stations would read 0.5 % more drift than one station.

**Test harness.** `harness.js`: stubs gained `replaceChildren`/`append` and `location.hash`; the app's boot no longer aborts part-way in the headless harness (it stopped at the link import `importFromLink` in V1.27.1, and at `wavgRender` in V1.28.0). No app behaviour involved.

**Docs.** `SEN-BALLISTICS-SKILL.md` V5.2: §8C pressure convention (each C is paired with the pressure it was fitted at: Queen/King 986 hPa, LR-25 ≈ 978–981 hPa; LRAI-35-H 1.99 flagged unverified, regression anchor 1.719), §9A multi-station model, §7 position-update finding.

**Files:**
- `index.html`: `crossField`, `windDriftField`, `vx` in `rk4traj` output, optional `field` in `solveShot`, FORMULAS entry; 5 live version strings.
- `sw.js`: CACHE → `sen-ballistics-v1.29.0`.
- `tests/runtests.js` +20 anchors (53); `tests/harness.js`; `tests/README.md`.

**Verify:** `node --check` clean · `runtests.js` 53/53 · `domtest.js` 14/14 · `storagetest.js` 22/22 · `importtest.js` 28/28 · `sharetest.js` 24/24 · `windtest.js` 22/22 · `unittest.js` 18/18 · `coursetest.js` 21/21 · `layouttest.js` 18/18 · `rendertest.js` 22/22 · `bcmigtest.js` 11/11 · `formulatest.js` 19/19 · `swtest.js` 6/6 · `homelayouttest.js` 31/31 · `courserunnertest.js` 20/20 · `calypsotest.js` 18/18 · `windavgtest.js` 28/28 · `index.html` byte-identical to `RTI-SEN-Ballistic-Calculator-V1.29.0.html`. No dope changes.

---

## V1.28.0 — minor — Wind average window: the app averages the Calypso itself, over 10 s to 2 h (CALC-20)

**Problem.** "avg" wind used the Calypso's own average field from `:WU`. Its window is set inside the unit and unknown, so the number couldn't be checked (§20A) or chosen. The direction sent to the session was always the instant vane reading, so an averaged speed was paired with a momentary direction.

**Fix.**
- Every `:WU` instant reading (speed + direction) goes into an in-memory buffer with a time stamp (2 h kept). The unit's own average field is no longer used anywhere.
- Average = vector mean of the wind arrows over the chosen window: x̄ = Σ s·cos d / n, ȳ = Σ s·sin d / n → speed √(x̄²+ȳ²), direction atan2(ȳ, x̄). Speed and direction come from the same average; calm readings with the vane pointing anywhere carry almost no weight; a wind swinging left↔right cancels the way its push on the slug does.
- Window: 10 s · 1 · 5 · 15 · 30 · 60 min, or custom minutes (1–120) on the Sensors card; default 1 min; saved in settings (`APP.windAvgS`, clamped on load).
- Home live bar: avg / instant plus the window picker; the live state names the window. Instant mode = last instant speed and direction (unchanged).
- Sensors card: average speed and direction, mean speed, lull / gust, steadiness (vector ÷ scalar mean, 100 % = constant direction), window fill ("1:39 of 15:00 (filling)"), reading count, ⚠ gap flag when readings stop for more than 5 s (e.g. Android pausing Bluetooth with the screen off). Reset average button (after moving the Calypso: the whole window must share one orientation). Readings from a different unit start a fresh window.
- Used everywhere "avg" was: Home live, Wind tab live, "Use wind → session", and the fixed-bearing mount (wind from = averaged direction + mount bearing).
- New entry in the Formulas page: "Wind average (vector mean)" with four exact anchors.

**Files:**
- `index.html`: `WAVG_*`, `wavgPush`, `windAvg`, `windMean`, `bleAvgNow`, `calypsoLive`, `setWavgWin`, `wavgReset`, `wavgRender`, `homeLiveState`; `calypsoParse` buffers instant readings (`bleLastAvg` removed); `calypsoToSession(speed, dir)`; Home live bar + Sensors card markup; FORMULAS entry; 5 live version strings.
- `sw.js`: CACHE → `sen-ballistics-v1.28.0`.
- New `tests/windavgtest.js` (28 checks); `windtest.js` helper no longer sets the removed `bleLastAvg`; `tests/README.md` now seventeen suites.

**Verify:** `node --check` clean · `runtests.js` 33/33 · `domtest.js` 14/14 · `storagetest.js` 22/22 · `importtest.js` 28/28 · `sharetest.js` 24/24 · `windtest.js` 22/22 · `unittest.js` 18/18 · `coursetest.js` 21/21 · `layouttest.js` 18/18 · `rendertest.js` 22/22 · `bcmigtest.js` 11/11 · `formulatest.js` 19/19 · `swtest.js` 6/6 · `homelayouttest.js` 31/31 · `courserunnertest.js` 20/20 · `calypsotest.js` 18/18 · **`windavgtest.js` 28/28** · real Chromium at 412 px and 780 px: Home live bar and Sensors card fit, no sideways scroll · `index.html` byte-identical to `RTI-SEN-Ballistic-Calculator-V1.28.0.html`. No trajectory or drift physics changed; only what wind the session receives in avg mode. On-device check with the Calypso pending.

---

## V1.27.1 — patch — Calypso unit #2 streams: per-unit unlock code; battery from the battery service (LAB-02)

**Problem.** The second Calypso (WDOT-E2896A) connected but never showed wind. The handshake's first sentence, `:DU,1668647648,A7`, was captured from unit #1 in June and treated as a clock-set. An Anemotracker HCI snoop of unit #2 (2026-10-26, Sony Xperia 1 VI) showed it is a **fixed per-unit unlock code**: unit #2 gets `:DU,1802347072,AF` in every session. Until a unit gets its own code it answers `:NA` to `:DU` and to the `:CC` keepalive and never streams `:WU`. Separately, the battery tile read `:GK` field 2, which unit #2 sends as `BD`, so it showed `NaN%`.

**Fix.**
- `CALYPSO_UNLOCK` table by device name: `WDOT-B1F9A6` → `:DU,1668647648,A7`, `WDOT-E2896A` → `:DU,1802347072,AF`.
- `calypsoUnlock()` sends the unit's own code first, waits for `:AK`/`:NA`, and for an unlisted unit tries every known code once.
- If none is accepted, the app stops: status "· locked", a note to capture the unit's code once (Anemotracker + HCI snoop), and no handshake or keepalive.
- The rest of the handshake (`:GK`, `:PS`, `:WU,5`, `:WU,6`, `:VR`, `:CC`) is unchanged.
- Battery now comes from `0x180F`/`0x2A19` (read plus notifications). If the unit has no battery service, the tile shows a dash and wind still works.

Ported from Lab Probe V1.3.1 (SEN-Testing `c4096a5`). That build was confirmed on the Honor Magic V5 with both units streaming at once, using no manually typed codes.

**Files:**
- `index.html`: `CALYPSO_UNLOCK`, `CALYPSO_HANDSHAKE` (without `:DU`), new `calypsoUnlock()` and `calypsoBattery()`, `toggleBLE()` (unlock step, locked message, battery), `calypsoParse()` (`:AK`/`:NA` noted; `:GK` no longer sets battery; dead `blePendingGK` removed); 5 live version strings.
- `sw.js`: CACHE → `sen-ballistics-v1.27.1`.
- New `tests/calypsotest.js` (18 checks; 12 of them fail on V1.27.0); `tests/README.md` updated to sixteen suites.

**Verify:** `node --check` clean · `runtests.js` 33/33 · `domtest.js` 14/14 · `storagetest.js` 22/22 · `importtest.js` 28/28 · `sharetest.js` 24/24 · `windtest.js` 22/22 · `unittest.js` 18/18 · `coursetest.js` 21/21 · `layouttest.js` 18/18 · `rendertest.js` 22/22 · `bcmigtest.js` 11/11 · `formulatest.js` 19/19 · `swtest.js` 6/6 · `homelayouttest.js` 31/31 · `courserunnertest.js` 20/20 · **`calypsotest.js` 18/18** · `index.html` byte-identical to `RTI-SEN-Ballistic-Calculator-V1.27.1.html`. No physics change. On-device check with unit #2 in the calculator pending.

---

## V1.27.0 — minor — Course runner on Home: PRS and Big bore layouts (CORE-16, part 2)

**What.** A new Home module, **Course runner**, runs a dope card's course (CORE-12 stages and targets) live: pick the course, see the current stage (name, "Stage 2 of 5", stage timer when the stage has a time limit), every target with label · range · size · position, **dial ↑ and wind clicks per target**, and its calls (✓ ✗ · per shot). Tap a target → it becomes the session distance, so Home's big solution, reticle and turret panel follow it. **Hit / Miss** record the shot and move on by themselves once the target's shots are done (target → next target → next stage); Next ›, ‹ Stage, Stage › for manual moves; hits so far at the bottom. Run state (course, stage, target, calls, timer) is remembered, so a restart mid-match resumes.

**Two new templates** use it: **PRS** (course runner, solution, turret, live wind, target bearing, conditions, shot inputs) and **Big bore** (the same without bearing). Fresh installs now seed five layouts; existing ones add them from More › Layouts › New from template. Courses are built in the Dope tab as before: a Big bore station is a stage with a near and a far target and the 10-minute time, a PRS stage is a stage with its targets and par time.

**Solutions** use the session rifle, ammo, weather and wind — the same path as Home (`homeTraj` + `solveShot`), not the card's stored MV/zero. A target with a compass bearing gets its own wind angle from the session wind vector (CORE-13: rel = windFrom − bearing); without a compass wind or bearing it uses the session angle. Home's trajectory now runs at least to the farthest target of the running stage (`homeTraj(courseMaxRange())`), so 300 m targets solve. No physics change.

**Files:** `index.html` — course module block + CSS; `courseRun`, `courseCard`, `courseStage`, `courseOn`, `courseMaxRange`, `courseSelect`, `courseGo`, `courseStageGo`, `courseNext`, `courseCall`, `courseTimer`, `renderCourseTimer`, `renderCourse` (DOM-built, text only); `HOME_MODS.course`; `LAYOUT_TPL.prs` / `.bigbore` and seeding; template buttons; `renderHomeMods` and `renderQuick` hooks; 5 live version strings. `sw.js` CACHE → `sen-ballistics-v1.27.0`. New `tests/courserunnertest.js`; `homelayouttest.js` updated for five seeded layouts and 13 modules; `tests/README.md` (fifteen suites).
**Verify:** `node --check` clean · `runtests.js` 33/33 · `domtest.js` 14/14 · `storagetest.js` 22/22 · `importtest.js` 28/28 · `sharetest.js` 24/24 · `windtest.js` 22/22 · `unittest.js` 18/18 · `coursetest.js` 21/21 · `layouttest.js` 18/18 · `rendertest.js` 22/22 · `bcmigtest.js` 11/11 · `formulatest.js` 19/19 · `swtest.js` 6/6 · `homelayouttest.js` 31/31 · **`courserunnertest.js` 20/20** · real Chromium render of the PRS Home checked · `index.html` byte-identical to `RTI-SEN-Ballistic-Calculator-V1.27.0.html`.

---

## V1.26.0 — minor — Home layouts: named, editable, per match type (CORE-16, part 1)

**What.** Home is now driven by a **layout**: a named list of Home modules (order + on/off) plus settings — fixed distance, card timer length, shots per card. The layout name sits at the top of Home (tap → switch, or "Manage layouts ›"). **More › Layouts** lists them: Use · Edit · Duplicate · Delete (the last one can't be deleted), and New from a template (Default, Benchrest 50 m, Benchrest 100 m, Blank). The editor renames, moves modules with ▲▼, switches them on/off and sets the fixed distance (in the display unit), timer minutes and shots per card; changes apply to Home at once. Rule profiles per federation were dropped (owner ruling: rules differ per event).

**Templates.** *Default* reproduces the previous Home exactly (same blocks, same order). *Benchrest 50 m / 100 m* switch the session to that distance and show: reticle + elevation/windage, **wind offset now** (live/manual wind → mm and clicks, aim side), **wind offset table** (1–5 in the display wind unit, full-value crosswind, mm and clicks), **chrono string** (MV / ES / SD from Sensors › Chronograph, now remembered, plus the vertical spread the ES causes at the distance), **card timer** (countdown, shot counter, vibrates at zero), live wind, manual wind, conditions, shot inputs. PRS and Big bore follow in V1.27.0.

**Physics.** No engine change: wind modules call `solveShot` on Home's own trajectory. New EST formula for the chrono module, **MV spread → vertical spread**: Δy ≈ g·t²·ΔV/V₀ at a fixed launch angle. Reproduced against py-ballisticcalc 3.1.1 fixed-angle runs (Queen G7 0.128, 255 ± 2.5 m/s): 25 m 1.88 vs 1.87 mm · 50 m 7.63 vs 7.54 · 100 m 31.5 vs 30.7 (≤ 2.5 %). Added to the Formulas panel as EST with the 50/100 m anchors.

**How it's built.** Modules are the existing Home blocks (ids unchanged — moved, never duplicated) plus four new blocks; layouts live in `APP.layouts` (exported with the settings) and every stored or imported layout is normalised (known modules once each, sane settings). The fold rail still holds solution / turret / conditions; ordering uses its placeholders. All layout UI is built with `createElement` / `textContent`. Not yet: separate module orders for the outer and inner screen (the inner screen keeps the rail rule), drag-and-drop (▲▼ for now), sharing a layout as a code.

**Files:** `index.html` — `HOME_MODS`, `LAYOUT_TPL`, `layoutFromTpl`, `normLayout`, `initLayouts`, `activeLayout`, `applyHomeLayout`, `useLayout`, `openLayoutSheet`, `renderHomeMods`, `mvSpreadVert`, timer functions, Layouts page (`renderLayouts`, editor, duplicate/delete/new); Home layout bar + 4 module blocks + `id="home-inputs"`; `#page-layouts`; CSS; `renderQuick` calls `renderHomeMods`; `useChronoMV` stores `APP.chrono`; Formulas entry; More gains Layouts; boot `initLayouts();applyHomeLayout()`; 5 live version strings. `sw.js` CACHE → `sen-ballistics-v1.26.0`. New `tests/homelayouttest.js`; `domtest.js` (More 8), `layouttest.js` (13 tabs, More 8), `formulatest.js` (five EST), `unittest.js` (layout names excluded from the leak scan like profile names); `tests/README.md` (fourteen suites).
**Verify:** `node --check` clean · `runtests.js` 33/33 · `domtest.js` 14/14 · `storagetest.js` 22/22 · `importtest.js` 28/28 · `sharetest.js` 24/24 · `windtest.js` 22/22 · `unittest.js` 18/18 · `coursetest.js` 21/21 · `layouttest.js` 18/18 · `rendertest.js` 22/22 · `bcmigtest.js` 11/11 · `formulatest.js` 19/19 (36/36 anchors) · `swtest.js` 6/6 · **`homelayouttest.js` 31/31** · real Chromium render of the Benchrest 50 m Home checked · `index.html` byte-identical to `RTI-SEN-Ballistic-Calculator-V1.26.0.html`.

---

## V1.25.1 — patch — Service worker stops deleting the Lab app's cache · storage contract (CORE-09, Main side)

**Problem.** Main and the Lab app (SprukK/SEN-Testing) are both served from `sprukk.github.io`, so they share one CacheStorage. Main's service worker deleted every cache except its own current one on activation (`keys.filter(k => k !== CACHE)`), so **every Main release wiped the Lab probe's offline cache** (`sen-ble-probe-*`) — the probe then needed a network connection to start. The Lab's own service worker was already scoped to its prefix.

**Fix.** `sw.js` deletes only Main-owned caches (`sen-ballistics-*`, plus the legacy `sen-calc-*` from V3.x) other than the current one. The **storage contract** is written next to `IDB_NAME` in `index.html`: Main owns IndexedDB `sen_main`, localStorage `sen_platform_*`, caches `sen-ballistics-*`; the Lab owns `sen_lab`, `sen_lab_*`, `sen-ble-probe-*`/`sen-lab-*`; the Lab may read Main's snapshot read-only and never creates Main's database. No change to how Main stores data. The Lab-side reader ships as SEN BLE Probe V1.2.0 in SprukK/SEN-Testing.

**Files:** `sw.js` — `OWN_CACHE` filter, CACHE → `sen-ballistics-v1.25.1`; `index.html` — storage-contract comment, 5 live version strings. New `tests/swtest.js`; `tests/README.md` (thirteen suites).
**Verify:** `node --check` clean · `runtests.js` 33/33 · `domtest.js` 14/14 · `storagetest.js` 22/22 · `importtest.js` 28/28 · `sharetest.js` 24/24 · `windtest.js` 22/22 · `unittest.js` 18/18 · `coursetest.js` 21/21 · `layouttest.js` 18/18 · `rendertest.js` 22/22 · `bcmigtest.js` 11/11 · `formulatest.js` 19/19 · **`swtest.js` 6/6** (the V1.25.0 `sw.js` fails the Lab-cache and unrelated-cache checks) · `index.html` byte-identical to `RTI-SEN-Ballistic-Calculator-V1.25.1.html`.

---

## V1.25.0 — minor — Formula verification panel + start-up self-check (CORE-06)

**What.** A new **Formulas** page (More → Formulas) lists every formula the app uses: the equation, its source, where it is used, its status (**✓ Verified** or **EST**) and its anchors. Every anchor is **recomputed live by this build's own functions** each time the page opens and shown as got / want / ✓✗. A "Not modelled" card lists what the app deliberately doesn't do (GA diabolo drag, aero jump, custom Cd–Mach, Sg for L/D < 2.0, transonic BC).

**Self-check at start-up.** The same anchors run at every launch (≈50 ms; the truing round trip, ≈0.5 s, runs only on the page because truing never feeds the dope directly). If any fails, a red line appears on **every** screen: "Formula self-check failed: … — don't trust the dope. See More → Formulas." A wrong formula can no longer reach the field silently.

**Contents — 13 verified, 4 estimates, 34 anchors:**
- Verified: moist-air density (everyday default 1.1934, ICAO 1.2250) · speed of sound (343.24, ICAO 340.29) · SD §9H (Queen 0.137) · BC lb/in² → kg/m² (Queen 90.0) · Berger Sg (Queen 1:20 1.43 / 1:17 1.98, King 1:20 1.07 / 1:17 1.48 / 1:16 1.67) · under-stabilisation penalty (Queen −2 %, King −13 %) · G7/G1 tables (BRL/McCoy spot values) · RK4 + drag term (py-ballisticcalc Queen G7 and King G1 velocities, Element drop at 1000 m, drop at zero) · wind drift (90°/270° equal and opposite, 0° headwind → none) · angular units · unit conversions · Coriolis (analytic constant-velocity case) · BC truing round trip.
- EST: spin drift (Litz — formula reproduction only, unvalidated subsonic) · C lookup (`estimateC`; .30 2.699 / .35 3.822 come from theoretical SEN designs; refused below L/D 2.0) · G1 ≈ G7/0.509 (Litz ±5–8 %) · MV–temperature linear fit.
- **Owner ruling: no theoretical SEN projectile is used as an anchor** (LRAI-35 and LR-25 excluded; Sg anchors are Queen and King only). The LRAI-35 check stays in `runtests.js` purely as a regression value.
- Values are shown in each formula's own units on purpose: they are reference constants, not field output (exempt from the units layer).

**Security.** The panel is built with `createElement`/`textContent` only — no `innerHTML`.

**Files:** `index.html` — `FORMULAS` registry, `FX_NOT_MODELLED`, `fxRun`, `fxCheck`, `renderFormulas`; `#page-formulas`; `#fx-alarm` banner; panel CSS; `MORE_PAGES` + `gotoPage` hook; boot `fxCheck()`; 5 live version strings. `sw.js` CACHE → `sen-ballistics-v1.25.0`. New `tests/formulatest.js`; `domtest.js` (More lists 7) and `layouttest.js` (12 tabs, More 7) updated for the new page; `rendertest.js` + Formulas page width check; `tests/README.md` (twelve suites).
**Verify:** `node --check` clean · `runtests.js` 33/33 · `domtest.js` 14/14 · `storagetest.js` 22/22 · `importtest.js` 28/28 · `sharetest.js` 24/24 · `windtest.js` 22/22 · `unittest.js` 18/18 · `coursetest.js` 21/21 · `layouttest.js` 18/18 · `rendertest.js` 22/22 · `bcmigtest.js` 11/11 · **`formulatest.js` 19/19**: boot check green with no banner, 34/34 anchors live, estimates exactly the four, no SEN anchor, broken air density → banner on every tab + red card, corrupted G7 value caught, restore clears it, no HTML injection. `index.html` byte-identical to `RTI-SEN-Ballistic-Calculator-V1.25.0.html`.

---

## V1.24.2 — patch — Drag engine corrected: standard G1 table, G7 supersonic values, missing π/4 in the drag term · trued BCs migrated

**Found while building CORE-06** (the formula panel needed drag-table anchors). Two independent defects in the one place every trajectory, dope card, hold sheet and truing result comes from (`rk4traj`):

1. **The G1 table was not the G1 drag function.** It matched only to Mach 0.15, then fell away: Cd at Mach 0.50 was 0.1758 (standard 0.2032), at **0.75 0.1082 (standard 0.2313 — less than half)**, at 1.00 0.1840 (0.4805). Present since V3.x. The G7 table was correct up to Mach 1.2 and deviated above it (Mach 2.0: 0.2776 vs 0.2980), with points missing — irrelevant to subsonic airguns, but wrong.
2. **The drag term was missing π/4.** The app used dec = ρv²Cd / (2·BC·703.07). The small-arms BC is m/(i·d²) (§9H, correctly without π/4), so the drag term must restore the reference area's π/4: F = ½ρv²·Cd·(πd²/4) ⇒ a = (π/8)·ρv²·Cd / BC. Without it **every trajectory, G7 included, had 4/π = 27.3 % too much drag**. `SEN-BALLISTICS-SKILL.md` §6C carried the same formula.

The two errors partly cancelled for G1 (too little table drag × too much equation drag), which is why the July 2026 cross-check against Element Ballistics showed a "smooth, growing divergence" that was then diagnosed as a subsonic drag-model difference. It was these two bugs.

**Verification (§20A — three independent references):**
- *Tables:* ballistics-engine `data/g1.csv` + `g7.csv` (BRL / McCoy / Lowry 1965) and py-ballisticcalc `drag_tables.py` agree at all 79 (G1) and 84 (G7) points to Mach 5; the app now carries them verbatim.
- *Drag term:* first-principles derivation above; py-ballisticcalc's drag constant 2.08551e‑4 = (π/8)·ρ₀/144 exactly. With the fix, the app reproduces py-ballisticcalc 3.1.1 at identical inputs: Queen G7 0.128 @ 260 m/s → v₂₀₀ 229.41 vs 229.40 m/s, drop₂₀₀ −2287.8 vs −2288.6 mm; King G1 0.250 → v₂₀₀ 231.17 vs 231.19, drop −2276.6 vs −2277.3; 800 m G7 run −69.75 vs −69.79 m.
- *Owner's Element Ballistics table* (Queen G1 0.245, 285 m/s, sight 70 mm, zero 100 m, 27.5 °C / 1011 hPa / 53 %):

| Range | Element | V1.24.1 | V1.24.2 |
|---|---|---|---|
| 300 m | 416.9 cm · 237 m/s | 390.2 (−6.4 %) · 254 | 417.8 (+0.2 %) · 237 |
| 600 m | 2408.3 · 202 | 2158.7 (−10.4 %) · 223 | 2413.1 (+0.2 %) · 202 |
| 1000 m | 8636.8 · 165 | 7422.9 (−14.1 %) · 183 | 8647.6 (+0.1 %) · 165 |

**Effect on dope.** G7 slugs now get less drag → less dial. Queen G7 0.128, 280 m/s, 50 m zero, everyday default: 100 m 2.96 → 2.90 mrad · 200 m 10.11 → 9.80 · 300 m 18.27 → 17.48. G1 (all pellets by default) now gets more drag → more dial: AEA CP .25 G1 0.060 @ 270 m/s, 75 m 1.63 → 1.79 mrad · 100 m 3.52 → 3.90; King G1 0.250 @ 260 m/s, 150 m 7.04 → 7.28 · 200 m 10.93 → 11.38.

**BCs trued in the app (`bcTrued`)** were solved against the old engine and are migrated once on first launch (`migrateTruedBC`, marker `bcConv`):
- **G7** — the table was right in the subsonic range, so the same physical drag needs BC × π/4: converted exactly (single and per band). Check: a BC the old engine trued from a py-ballisticcalc velocity (0.1631) converts to 0.1281; the new engine trues 0.1281 from the same measurement; py-ballisticcalc's BC was 0.128.
- **G1** — the table itself changed, so no exact conversion exists. The BC is set to pending, the old value is kept in the profile notes ("G1 BC x trued before V1.24.2 (wrong G1 table) — re-true needed"), and trajectories with it are blocked with truing guidance (standing convention). The old engine trued King G1 0.250 as 0.1594.
- Maker-published BCs (never trued) are untouched — they are standard values and are now used correctly. Exports and shares never carried the trued marker, so a projectile **imported from an old file whose BC was trued in-app** needs re-truing by hand.

⚠ Any earlier project conclusion drawn from this app's trajectory or truing output (BC comparisons, Element divergence, drop tables) should be re-checked against V1.24.2.

**Files:** `index.html` — `G1T`/`G7T` replaced by the standard tables to Mach 5 with source note; π/4 in `rk4traj`'s drag term with derivation note; `migrateTruedBC()` + boot call; 5 live version strings. `sw.js` CACHE → `sen-ballistics-v1.24.2`. `tests/runtests.js` — 13 new anchors (tables, py-ballisticcalc, Element), 800 m anchor re-anchored 76.76 → 69.79 m (py-ballisticcalc); `tests/harness.js` — global `matchMedia` (the harness printed a harmless boot error since V1.24.0); `tests/coursetest.js` — "bit-identical dope to the previous release" replaced by "every solution input untouched + every target computes" (dope changes on purpose); new `tests/bcmigtest.js`; `tests/README.md` (eleven suites).
**Verify:** `node --check` clean · **`runtests.js` 33/33** (V1.24.1 fails 13 of them) · `domtest.js` 14/14 · `storagetest.js` 22/22 · `importtest.js` 28/28 · `sharetest.js` 24/24 · `windtest.js` 22/22 · `unittest.js` 18/18 · `coursetest.js` 21/21 · `layouttest.js` 18/18 · `rendertest.js` 21/21 · **`bcmigtest.js` 11/11** · `index.html` byte-identical to `RTI-SEN-Ballistic-Calculator-V1.24.2.html`. Project knowledge: `SEN-BALLISTICS-SKILL.md` §6A G7 table and §6C drag formula corrected.

---

## V1.24.1 — patch — Panes scroll independently; bottom nav and sheets pinned again; brightness slider folded into high contrast

**Problem.** On the unfolded screen the solution rail scrolled together with the left pane instead of on its own (owner's test of V1.24.0). Cause, found by rendering in real Chromium: the Settings brightness slider put `filter:brightness()` on `<body>`. Any filter other than none makes that element the containing block for `position:fixed` children, so everything "fixed" was positioned against the whole page instead of the screen. The rail became page-long (3,439 px) and scrolled with the page. The same bug, present since the slider was added, put the **bottom nav at the very end of the page on both screens** (never visible while scrolling), and opened the More sheet and pickers off-screen after scrolling. jsdom does no rendering, so no existing test could see it. Separately, the Settings "Screen" line was only written when Settings was opened, so it still said "415 × 843 · phone" after unfolding.

**Fix.**
- Brightness slider removed (owner's decision) together with its body filter. **High-contrast mode now also lifts main text to full white** (`--text` #f5f3ee → #ffffff), which covers the bright-sun use. Normal mode looks exactly like the old 100%. A saved `APP.bright` value is kept as an inert key, so existing data, backups and shared files import unchanged.
- The Settings screen line is refreshed on every resize/fold (`screenInfo()`).
- Result: the bottom nav is pinned on both screens; on the inner screen the rail fills the height above the nav and scrolls on its own, independently of the left pane; sheets open on screen wherever you have scrolled.

**Files:** `index.html` — body filter removed; `html.hc` adds `--text:#ffffff`; brightness slider, `setBright` and the boot-time `--bright` line removed; `screenInfo()` and the refresh in `applyLayout`; 5 live version strings. `sw.js` CACHE → `sen-ballistics-v1.24.1`. New `tests/rendertest.js`; `tests/README.md` updated (ten suites).
**Verify:** `node --check` clean · `runtests.js` 20/20 · `domtest.js` 14/14 · `storagetest.js` 22/22 · `importtest.js` 28/28 · `sharetest.js` 24/24 · `windtest.js` 22/22 · `unittest.js` 18/18 · `coursetest.js` 20/20 · `layouttest.js` 18/18 · **`rendertest.js` 21/21** (headless Chromium): outer 415×843 and inner 840×910 at Normal/Large/XL text — nav pinned to the screen bottom after scrolling 800 px, rail 0–846 px with its own scroll (scrollHeight 882 > 846), scrolling the rail doesn't move the page and vice versa, More sheet on screen after scrolling; high contrast #ffffff with body filter `none` and no slider; Settings line 415 × 843 · phone → 840 × 910 · fold inner. The same test on V1.24.0 fails 20 of 21 (nav at y = 2,708, rail 3,439 px tall, sheet at y = −736). `index.html` byte-identical to `RTI-SEN-Ballistic-Calculator-V1.24.1.html`.

---

## V1.24.0 — minor — Fold-aware layout: two panes + live solution rail on the inner screen (CORE-04)

**Why.** The app knew only "narrow" or "≥760 px". The Magic V5's inner screen (2352×2172 px, near-square) is wider than 760 CSS px, so it got the desktop treatment: navigation moved to a static strip at the top (out of thumb reach) and the content became one long centred column.

**Classification by shape, not pixels** (`layoutMode`, re-evaluated on every resize, so folding/unfolding switches immediately without losing anything):
- narrower than 600 CSS px → **phone** layout, exactly as before (outer screen);
- ≥ 600 px, touch, aspect between 4:5 and 5:4 → **inner fold screen**, two panes;
- anything else (desktop, landscape tablet, mouse) → **wide**, as before.

**Two panes on the inner screen.** Left: the current tab, unchanged. Right: a **live solution rail** visible on every tab — header (distance · projectile), **reticle with hold dot + Elevation/Windage**, the **turret panel** (owner's choice) and the **conditions strip** (zero, wind, direction, crosswind). Change the wind on the Wind tab, a value on Trajectory or a dope target, and the rail updates live. The bottom navigation stays at the bottom. The rail *moves* the existing Home blocks (ids unchanged, every renderer keeps working) and puts them back exactly where they were on fold; nothing is duplicated. Home's renderer now runs whenever its blocks are visible (`homeVisible`), not only on the Home tab.

**Settings → Display** shows what was detected, e.g. "Screen 784 × 724 CSS px · touch · layout: fold inner screen (two panes + live solution rail)" — so the thresholds can be tuned from real device numbers.

Built as a self-contained module, so the rail can become one of the draggable blocks of CORE-16 later.

**Files:** `index.html` — `#sol-rail` container + `#rail-head`; `id="home-dash"` on the dashboard; fold CSS (`html.fold` …, bottom nav restored, rail positioning, rail-internal dashboard/conditions arrangement); new `RAIL_BLOCKS`, `layoutMode`, `isCoarse`, `moveToRail`, `moveFromRail`, `applyLayout`, `homeVisible`, `renderRailHead`; `notifyWind` and the bus subscriber use `homeVisible()`; `renderQuick` updates the rail header; boot applies the layout and listens to resize; Settings screen info; 6 live version strings. `sw.js` CACHE → `sen-ballistics-v1.24.0`. New `tests/layouttest.js`; `tests/README.md` updated.
**Verify:** `node --check` clean · `runtests.js` 20/20 · `domtest.js` 14/14 · `storagetest.js` 22/22 · `importtest.js` 28/28 · `sharetest.js` 24/24 · `windtest.js` 22/22 · `unittest.js` 18/18 · `coursetest.js` 20/20 · **`layouttest.js` 18/18**: classification of outer (390×866), inner (784×724 and rotated 724×784), desktop (1440×900 mouse), landscape tablet (1024×768) and mouse square (800×800); outer screen unchanged; unfolding moves reticle/solution, turret and conditions into the rail in order with each block present exactly once while shot inputs stay left; wind changed on the Wind tab updates rail windage (→0 → →17); distance changed on another tab updates the rail header; turret steppers work from the rail; all 11 tabs and the More sheet work; rotation keeps two panes; folding back restores the exact original Home order with no leftover markers; repeated fold/unfold never duplicates; Settings reports 784 × 724 · touch · fold inner screen; launching unfolded starts in two panes; zero uncaught errors. **Not machine-checkable:** the visual result on the real inner screen · `index.html` byte-identical to `RTI-SEN-Ballistic-Calculator-V1.24.0.html`.

---

## V1.23.0 — minor — Stage/course model: target details, stage time, dope cards schema v2 (CORE-12) · headwind fix

**Design.** The dope card already was a match structure (card → stages → targets with range, angle, wind, direction), so it is extended rather than duplicated by a second "course" model.

**What's new.**
- **Per target** (the rows formerly called ranges; "+ Range" → "+ Target"): **label** (default T1, T2…; shown above the range), **compass bearing** (typed, or 📍 phone compass — the same capture as Home), **size** (one number, mm, converted like every other unit — new quantity *Target size* mm/cm/in), **position** (prone / kneeling / standing), **shots** (default 1). They sit in a details row opened with **⋯**, so the editor stays compact.
- **Per stage:** optional **time limit** in seconds (⏱ field in the stage header).
- **Printed card:** a Target column, an Info column (e.g. "Standing · 51 mm · 3× · 95°") and the stage time in the stage header.

**Schema v2 (first real CORE-01 migration).** `SCHEMA.dopeCards` 1 → 2. Stored cards are upgraded at boot and v1 files on import (`migrateDopeCard`): labels T1…Tn per stage, no bearing/size/position, 1 shot, no time limit. The import whitelist now carries the new fields with type checks (bearing normalised to 0–360°, size > 0, known positions only, whole shots ≥ 1, label ≤ 40 chars); anything else is dropped.

**Bug fix — 0° headwind became a crosswind.** Target rows used `d.wdir||90`, so a wind direction of **0° (headwind) was silently computed as 90° — full value from the right** (e.g. 5 m/s at 0° gave 8 clicks right windage instead of none), and the editor displayed it as 90°. Now `??`: 0° stays 0°. Affects only dope cards with a 0° entry; every other entry computes bit-identically.

**Also fixed (import).** Record comparison was sensitive to key order inside nested objects, so a v2 dope card re-imported from your own export showed up as changed. Comparison is now key-order independent (`stableJSON`).

**Files:** `index.html` — `SCHEMA.dopeCards: 2`, `TARGET_POS`, `migrateDopeCard` (boot, `newDope`, `addStage`, `addDist`, import); import sanitiser rebuilds stages/targets with the new fields; `stableJSON` in `diffKeys`; `tsize` quantity (+ `UNITS`/`SUNITS`); stage header time field; `distRow` (label tag, ⋯ toggle, details row) with new `openDist`, `toggleDistDetail`, `targetInfo`, `distDetail`, `captureDistBearing`; "+ Target"; `d.wdir??90` in the editor, `calcDope` and `printDope`; print Target/Info columns and stage time; 4 CSS rules; 6 live version strings. `sw.js` CACHE → `sen-ballistics-v1.23.0`. New `tests/coursetest.js`; `tests/README.md` updated.
**Verify:** `node --check` clean · `runtests.js` 20/20 · `domtest.js` 14/14 · `storagetest.js` 22/22 · `importtest.js` 28/28 · `sharetest.js` 24/24 · `windtest.js` 22/22 · `unittest.js` 18/18 (new detail fields classified; size converts) · **`coursetest.js` 20/20**: a 4-target, 2-stage card built and computed by V1.22.0 is upgraded (T1–T3/T1, 1 shot, empty details, no time) and computes **bit-identical** dope; 5 m/s at 0° now gives no windage (V1.22.0 gave →8) and the editor shows 0°; a v1 file imports upgraded; a v2 file keeps Rabbit/10°(from 370°)/25 mm/kneeling/2 shots/120 s; junk (empty label, bad bearing, negative size, unknown position, −3 shots, unknown keys) is sanitised; own card re-import is "already identical"; details hidden until ⋯; label/bearing/position/shots stored; 2 typed in inches stored as 50.8 mm and the label follows the unit; stage time stored; 📍 captures 60° from alpha 300 and keeps details open; print shows "Steel 1", "Standing · 51 mm · 3× · 95°" and "⏱ 120 s"; everything survives a restart; zero uncaught errors · `index.html` byte-identical to `RTI-SEN-Ballistic-Calculator-V1.23.0.html`.

---

## V1.22.0 — minor — Units everywhere: converted inputs and outputs, dual units on every screen (CORE-15)

**Why.** The unit choice in Settings only reached part of the outputs (drop/velocity tables, some cards). About 60 number inputs were fixed metric with hard-coded labels ("Zero range m"), ~60 output strings printed raw metric numbers with fixed units, and the dual-unit setting was wired to almost nothing (`dual()` existed but was never called). Switching to yards left most of the app in metres.

**Inputs — converted, not relabelled.** Every number input now resolves a quantity (`UNIT_FIELDS` by id, or `data-q` in templates; `'-'` = deliberately exempt). For those fields the element's `value` property is wrapped: all existing code keeps reading and writing canonical metric strings exactly as before, while the field *shows* the value in the chosen unit and converts what you type. A 250 m zero shows **273.4 yd**; switching m → ft → yd → m shows exactly **250** again, because the stored canonical string is kept verbatim until the field is edited. Typing 300 in a yard field stores 274.32 m. Labels swap their unit token (or gain one); step/min/max follow; with dual units on, a small secondary line appears under the field. A `MutationObserver` applies this to fields in forms, sheets, stage editors and truing rows as they appear, and every unit change refreshes all of them.
- **New quantity:** Altitude (m / ft). "Bullet size" renamed "Projectile & barrel size" (diameter, OAL, barrel length).
- **Exempt by project rule:** mass (gr), BC (lb/in²), scope click/travel (scope's own unit), rail and reticle values (mrad/MOA), angles and bearings (°), RH (%), twist (inches by design, mm shown alongside), regulator fields (already converted by their own form), form factor, C constant.

**Outputs.** Every value printed with a unit now goes through `uq` (primary + dual secondary — prose, cards, Home), `ut` (primary — tables, chips, print) or `un` (number only, unit in the header). Converted: act-bar chips, weather sheet, Home zero/wind/crosswind/status, Holds title/rows/print, rifle and dope zero summaries, Trajectory distance/zero-shift/Vs/rows/notes/chart axis, OAL limit flags, Wind tab distance/drift/rows/note/crosswind card, Solver distance/zero/Coriolis/spin drift, Dope note/print/editor headers, profile lists, MV–temperature table/slope/prediction (slope converted to *fps per °F* etc.), Truing alerts/cards/bands, Stability worst-case captions, chrono target flag, Sensors speed. Static table headers and fixed numbers inside notes (LabRadar ~23 m, worst-case −5 °C · 1013 hPa · 229 m/s, ES ≤ 5 m/s, etc.) use `data-ul`/`data-uv` spans filled on every unit change.

**Dual units** now work everywhere they apply, including Home (condition strip and input fields). Tables, chips and printouts stay single-unit for legibility.

**Exact definitions (small accuracy fix).** Conversion factors were rounded (×1.09361 for yards, ×2.23694 for mph, …). They now use the exact definitions: 1 yd = 0.9144 m, 1 ft = 0.3048 m, 1 mph = 0.44704 m/s, 1 kn = 1852/3600 m/s, 1 inHg = 33.8638866667 hPa, 1 ft·lbf = 1.3558179483 J — so 250 m = 273.4033 yd (was 273.4025). Display-only; the physics is unchanged. The angular (mrad/MOA) factor is untouched, as the standing anchors depend on it.

**Physics:** none changed. Verified: with every display unit switched from metric to imperial, the session state and the full computed trajectory are bit-identical.

**Files:** `index.html` — `QDEF` gains `from` (inverse) for every unit, exact factors, `alt` quantity (+ `UNITS`/`SUNITS` defaults); output helpers `isVal`/`uq`/`ut`/`un`; unit-input layer (`UNIT_FIELDS`, `FIELD_Q`, `NATIVE_VALUE`, `fieldQ`, `isCanonUnit`, `shownValue`, `readUnitInput`, `writeUnitInput`, `unitizeInput`, `unitAttrs`, `unitLabel`, `unitSecNote`, `refreshUnits`, `startUnitObserver`); `rerenderAll` refreshes units; `data-q` on template inputs (stage rows, truing rows, distance/MV sheets — sheet label "Metres" → "Distance"); Home's hand-made secondary lines replaced by the generic one; ~60 output sites and the static headers/notes listed above; 6 live version strings. `sw.js` CACHE → `sen-ballistics-v1.22.0`. New `tests/unittest.js`; `tests/README.md` updated.
**Verify:** `node --check` clean · `runtests.js` 20/20 (physics untouched) · `domtest.js` 14/14 · `storagetest.js` 22/22 · `importtest.js` 28/28 · `sharetest.js` 24/24 · `windtest.js` 22/22 · **`unittest.js` 18/18**: 175 conversion pairs round-trip within 1e-13; exact yard definition; every number input on every page, form (rifle, scope, reticle, projectile, weather), sheet, stage editor and truing row is classified; 250 m zero → 273.4 yd, label "yd", code still reads 250, m→ft→yd→m shows exactly 250; 300 typed in yards → 274.32 m, shown as 274.32 back in metres; rifle form shows sight height in inches and saving it unedited in full imperial changes no stored value; 2 in typed → 50.8 mm; session and full trajectory bit-identical in metric vs imperial display; dual units on Home fields and condition strip, and off again; every page scanned in full imperial with no metric number left (profile names, calibre names and the by-design twist table excepted); zero uncaught errors. The same test crashes against V1.21.0 · `index.html` byte-identical to `RTI-SEN-Ballistic-Calculator-V1.22.0.html`.

---

## V1.21.0 — minor — Wind as a compass vector · target bearing service (CORE-13 + CORE-14)

**Why.** Session wind was stored only as an angle relative to the line of fire, and the Calypso's reading was used directly as that angle — correct only while the Calypso points at the target being shot. With targets at different bearings (FT, PRS, ELR) every target change needed the wind re-entered or the Calypso re-pointed. The target bearing also existed twice: Home's compass panel and the Solver's Coriolis azimuth (not saved), which could disagree.

**What changed.**
- **One session target bearing** (`S.tgtBrg`, saved). Home's *Target bearing* (now its own row above the manual-wind panel, never locked by live wind) and the Solver's *Azimuth* are the same value — edit either, both follow. Sources: typed, or **📍 Phone compass** (phone flat, top edge toward the target; 1 s of readings averaged as a circular mean so readings around north don't average to south). Android uses absolute orientation (heading = 360° − alpha); iPhone asks for compass permission and uses its compass heading. The source is shown ("phone compass ±5–15°, worse near steel").
- **Wind keeps its compass direction.** `S.wind` gains `from` (where it blows FROM, compass) whenever the target bearing is known. Changing the target bearing re-derives the angle to the new target from the same wind — the multi-target groundwork for CALC-13. The solver still receives exactly the relative angle (`S.wind.dir`, 0 = head, 90 = from the right) it always did.
- **Calypso orientation** (Sensors): **"points at the target"** — default, identical to before — or **"a fixed bearing"** of its mark (typed or captured by laying the phone on it): wind FROM = reading + mark bearing, angle to each target = FROM − target bearing. In fixed mode without a target bearing the app pushes no wind and says why. All five Calypso entry points now go through one function (`calypsoToSession`).
- Home shows the wind as "90° rel · from 270°" when the compass direction is known.

**Magnetic vs true north — deliberately not corrected.** Phone and Calypso bearings are magnetic; for wind the offset cancels because all bearings share the reference. Only Coriolis wants true north: Ljubljana's ~5° declination changes its vertical term by under 2 mm at 300 m. Noted, not built.

**Physics:** none changed — no function in the solver or integrator touched. The only arithmetic is the V1.15.0-verified conversion (angle = FROM − bearing) plus FROM = reading + mark bearing, both modulo 360°.

**To check on the device:** the app has always assumed the Calypso reports the direction the wind blows FROM, clockwise from its mark (90° = from the right when its mark points at the target). The June 2026 test proved readings change with the vane, not which side is which. Point it at a target, fan from the right, confirm "from the RIGHT". The phone-compass capture also needs a real-device check.

**Files:** `index.html` — `S.tgtBrg`, `S.wind.from`; `Bus.setWind` (stores FROM), new `Bus.setWindFrom`, `Bus.windChanged`; new `norm360`, `BRG_SRC`, `setTargetBearing`, `syncBearingFields`, `calypsoToSession`, `calNote`, `setCalMount`, `renderCalMount`, `compassHeading`, `circularMean`, `readCompass`, `captureTargetBearing`, `captureCalMount`; five Calypso call sites routed through `calypsoToSession`; Home target-bearing row (moved out of the manual-wind panel, removed from its lock list); Home wind-direction text; Solver azimuth input; Sensors "Calypso points at" control; boot restore; 6 live version strings. `sw.js` CACHE → `sen-ballistics-v1.21.0`. New `tests/windtest.js`; `tests/README.md` updated.
**Verify:** `node --check` clean · `runtests.js` 20/20 (physics untouched) · `domtest.js` 14/14 · `storagetest.js` 22/22 · `importtest.js` 28/28 · `sharetest.js` 24/24 · **`windtest.js` 22/22**: default Calypso mode gives exactly the previous angle; fixed mark north + wind from south facing east → 90° from the right; same wind facing south → 0° head, north → 180° tail, west → 270° from the left; wrap 350° + 20° → 10°, target 340° → 30°; fixed mode without a bearing pushes nothing and explains; Home compass entry reproduces the V1.15.0 anchor (facing 180°, wind from 270° → 90°) and stores FROM; Home ↔ Solver bearing shared both ways and the angle re-derived (270 − 45 = 225°); bearing never locked by live wind; bearing and mark bearing survive a restart; Android capture alpha ≈330 → 30°; averaging 359°/1° → 0°; iPhone permission granted → 45°, refused → kept with reason; no compass → message; mark bearing capture switches to fixed mode; zero uncaught errors · `index.html` byte-identical to `RTI-SEN-Ballistic-Calculator-V1.21.0.html`.

---

## V1.20.0 — minor — Share profiles by QR, text or link (CORE-02)

**What.** Every profile in Profiles (rifle, scope, reticle, projectile, weather) gets a **Share** button. The share sheet shows a **QR code**, the **share text**, and buttons to **Copy text**, **Copy link** and **Send…** (the phone's share menu, where available). Next to *Import JSON* there's **Paste / scan share**: paste the text or link from WhatsApp/Viber, or **Scan QR** with the camera. Opening a share link launches SEN and starts the import.

**Payload.** One code for all three carriers: `SEN1:` + CRC-32 of the JSON (8 hex) + `.` + base64url of the deflate-compressed JSON (the browser's built-in `CompressionStream`). The checksum catches text cut off or altered in a messenger — a damaged code is refused with "ask for it again", nothing is imported. The code is found anywhere inside a pasted message or link. A rifle share carries the rifle, its scope, and the scope's reticle unless it's one of the built-in reticles every install has; favourite flags are removed; the schema is stamped. A typical rifle + scope share is ~580 characters. In a link the code sits after `#`, which browsers never send to the server (GitHub never sees it). The link is cleared from the address bar once read.

**Receiving** always goes through `importData()` (V1.19.0): schema guard, field whitelist, review sheet for collisions. **New for rifle shares:** the review offers *Scope for <rifle>* — keep the sender's scope (default) or put the rifle on one of your own; choosing your own leaves the sender's scope and reticle out entirely. A share with nothing to decide (e.g. a new projectile) imports straight away.

**Scanning.** Android uses the browser's built-in `BarcodeDetector`. iOS has none (WebKit doesn't implement it), so the QR decoder jsQR is embedded and used as the fallback. iPhone receivers should paste or scan rather than tap a link: a tapped link opens Safari, whose storage is separate from the installed app.

**Embedded libraries** (minified, unmodified, for offline use): qrcode-generator 2.0.4 (MIT, ~20 KB) and jsQR 1.4.0 (Apache 2.0, ~130 KB). App size 260 KB → 433 KB; it loads from the offline cache, so launch speed is unaffected in practice. Licence texts in `THIRD-PARTY-NOTICES.md`.

**Not in this release.** Dope cards keep their existing JSON export; sharing them by code can follow.

**Files:** `index.html` — Share button in the profile list + binding; *Paste / scan share* button; share block (`SHARE_PREFIX`, `SHARE_RE`, `SHARE_TYPES`, `BUILTIN_RETICLES`, `crc32`, `shareBundle`, `streamBytes`, base64url helpers, `encodeShare`, `decodeShare`, `shareLink`, `openShare`, `copyShare`, `sendShare`, `receiveShare`, `openReceive`, `startScan`, `readQrFrame`, `stopScan`, `importFromLink`); scope choice in `planImport`/`applyImport`/`renderImportReview` + `impScope`; link import at boot and on `hashchange`; embedded libraries; 6 live version strings. `sw.js` CACHE → `sen-ballistics-v1.20.0`. New `THIRD-PARTY-NOTICES.md`, `tests/sharetest.js`; `tests/README.md` updated.
**Verify:** `node --check` clean · `runtests.js` 20/20 · `domtest.js` 14/14 (new Share button doesn't disturb navigation) · `storagetest.js` 22/22 · `importtest.js` 28/28 · **`sharetest.js` 24/24**: bundle contents incl. custom-vs-built-in reticle and no favourite; exact round-trip; ~580-char rifle share; code found inside a chat message with a link; altered, truncated and code-less text refused; share sheet shows a QR and the code; the embedded encoder's QR decodes with the embedded decoder back to the exact share link; a second install receives the rifle on the sender's scope with the custom reticle; a third install puts it on its own scope and adds neither the sender's scope nor reticle; a new projectile imports without review; launching from a share link opens the review and clears the address bar; a damaged code in the receive sheet is explained and imports nothing; a script-like name injects nothing; zero uncaught errors. **Not machine-testable:** live camera scanning — check on the phone · `index.html` byte-identical to `RTI-SEN-Ballistic-Calculator-V1.20.0.html`.

---

## V1.19.0 — minor — Import review: sanitise, conflict choices, reference remap (CORE-03)

**Why.** Import merged blindly: unknown and wrongly-typed fields came in as-is (short of V7 §21.3's schema-whitelist rule), an incoming item with the same id was silently ignored even when its content differed, an item with the same name was added as a duplicate, and the file's units and display settings silently replaced yours. CORE-02 (QR/text/link sharing) will feed friends' profiles into this same path, so it had to become safe first.

**What changed.** File import now runs `importData()`, the single entry point CORE-02 will reuse:
1. **Schema guard** (from V1.18.0) — data from a newer app version is refused.
2. **Sanitise** — each record keeps only whitelisted fields of the right type (`IMPORT_FIELDS`); dope-card stages and distances are rebuilt field by field. Records without a name, scopes without a click value, and projectiles without diameter or mass are rejected and listed, never half-imported. Records without an id get one.
3. **Plan** — each incoming record is matched to yours by id, else by name (case-insensitive). Identical content (ignoring id and favourite, field order irrelevant) counts as *already present* — so another install's catalog, whose seeded items carry different ids, imports silently instead of flooding the review.
4. **Review sheet** — only when something collides or preferences differ. Each collision shows its type, which of your items it matches and what differs (e.g. `mv 289 → 291`), with **Overwrite · Save as copy · Skip** (default *Save as copy*), plus *All: …* buttons, Cancel and Import. A file's units/display settings are one row, **Keep mine** (default) / **Take theirs**. Rejects are listed. All names and diffs are escaped.
5. **Apply** — in referential order (reticles → scopes → rifles → projectiles → weathers → dope cards). *Overwrite* replaces your item in place, keeping its id and favourite flag. *Save as copy* adds it with a new id and the existing clone naming (`Name - [CLONE]`). *Skip* keeps yours. Incoming references (rifle→scope, scope→reticle, dope card→rifle/projectile/weather) follow the choice: to the copy, to your item, or to the overwritten one.
6. A summary lists new / overwritten / copied / skipped / identical / rejected, plus the existing dangling-scope warning.

**Not changed.** Export format, storage, physics, navigation. Scope-file import (Profiles → Scopes) keeps its own preview flow.

**Files:** `index.html` — `importAll` reduced to file reading; new `IMPORT_ORDER`/`IMPORT_LABEL`/`IMPORT_FIELDS`/`IMPORT_REQUIRED`/`IMPORT_CHECK`, `sanitiseRecord`, `diffKeys`/`sameRecord`/`recordDiff`, `planImport`, `remapRefs`, `applyImport`, `importData`, `finishImport`, `renderImportReview`, `impChoose`/`impChooseAll`/`impPrefs`; 6 live version strings. `sw.js` CACHE → `sen-ballistics-v1.19.0`. New `tests/importtest.js`; `tests/README.md` updated.
**Verify:** `node --check` clean · `runtests.js` 20/20 · `domtest.js` 14/14 · `storagetest.js` 22/22 · **`importtest.js` 28/28**: own export round-trips with no review and nothing added; another install's catalog under different ids is recognised as identical; unknown, wrong-type and nested unknown fields dropped; invalid records rejected and listed; a changed record opens the review with its diff and *Save as copy* preselected; Overwrite updates in place and keeps the favourite; Save as copy gets a clone name and new id while the original stays untouched, and an incoming rifle follows the copy; *All: Skip* leaves no extra scope and the incoming rifle follows your scope; preferences default to keep and *Take theirs* applies them; Cancel changes nothing; newer-schema data refused; single dope-card file imports; a script-like name injects nothing; zero uncaught errors. The first run caught a real bug (field order made identical records look different, flooding the review) — fixed before release · `index.html` byte-identical to `RTI-SEN-Ballistic-Calculator-V1.19.0.html`.

---

## V1.18.0 — minor — Storage moves to IndexedDB · schema versions (CORE-10 + CORE-01)

**Why.** All data lived in one localStorage entry: about 5 MB, shared with the Lab app because both run on `sprukk.github.io`, written in full on every save, and a failed write was swallowed silently (`catch(e){}`) — data could quietly stop saving. Chrono sessions, shot logs and sync (CORE-08) all need more room and need failures to be visible, so storage moves before those features are built on top of it.

**What changed.** The in-memory `DB` and every one of the ~50 `saveDB()` call sites are untouched; only *where* the snapshot is persisted changed.
- **IndexedDB** (`sen_main` → store `kv` → key `db`) holds the same JSON snapshot localStorage held. Chrome on Android allows a site up to ~60% of disk.
- **First-run migration:** if IndexedDB is empty and localStorage has data, the snapshot is copied, read back and compared byte-for-byte, then used. If the copy can't be verified the app keeps running on localStorage.
- **Rollback safety:** after migration the localStorage copy is never written again, so rolling back to V1.17.2 still finds the data as it was at migration time. Changes made *after* the migration live only in IndexedDB; a V1.17.2 rollback won't see them, and anything entered during a rollback won't come back when returning to V1.18. Delete the frozen copy in a later release once V1.18 has proven itself.
- **Fallback:** if IndexedDB can't be opened (old or locked-down browsers), the app uses localStorage exactly as before.
- **Boot is now asynchronous:** the whole boot sequence runs after the stored data has loaded (`async boot()`), in the same order as before.
- **Save failures are visible:** a failed save shows a red banner under the header ("Data NOT saved — reason. Export a backup now…"); the next successful save clears it. A stored snapshot that can't be parsed shows the same banner instead of silently starting empty.
- **Persistent storage:** the app asks the browser to mark its data persistent (`navigator.storage.persist()`), so it isn't cleared when the device runs low on space.
- **Settings → Data storage:** engine in use, app data size, persistence status, and the site's total usage/quota.
- **Factory reset** now clears IndexedDB *and* localStorage — clearing only one would let the migration resurrect the old data on next launch.
- **iOS install hint:** in iPhone Safari (not installed), a dismissible banner explains Safari deletes data of non-installed sites after 7 days unused and how to add SEN to the Home Screen. Dismissal is remembered.
- **CORE-01 schema versions:** `SCHEMA` holds one version per record type (all `1` today — the current shapes). Every stored snapshot, full export and single dope-card export carries it. Import refuses a file whose schema is *newer* than the app ("update the app first") instead of misreading it; legacy files without a schema import as before. The existing boot migrations are unchanged.

**Not changed.** No physics, solver, navigation or layout code. Import still merges without overwriting; the per-item overwrite/copy/skip choice is CORE-03. Noted for CORE-03: import does not yet apply the V7 §21.3 schema-whitelist sanitisation of incoming fields — XSS is covered by the V1.13.2 `esc()` sinks, but unknown fields pass through.

**Files:** `index.html` — D1 store block (`snapshotJSON`, `applySnapshot`, `schemaNewerThanApp`, `idbOpen`, `idbRun`, `copyLocalToIdb`, `readStoredJSON`, `loadDB`, `saveDB`, `storeFail`/`storeOk`/`renderStoreWarn`, `requestPersist`, `clearAllData`, `factoryReset`, `iosNeedsInstall`/`renderIosHint`/`dismissIosHint`), two banners under the header, Settings storage panel + `renderStoreQuota`, factory-reset button, schema stamp in both exports, schema check in `importAll`, boot wrapped in `async boot()`, 6 live version strings. `sw.js` CACHE → `sen-ballistics-v1.18.0`. New `tests/storagetest.js`; `tests/README.md` updated.
**Verify:** `node --check` clean · `runtests.js` 20/20 anchors (physics untouched) · `domtest.js` 14/14, zero uncaught errors (exercises the localStorage fallback, as jsdom has no IndexedDB) · **`storagetest.js` 22/22** against real V1.17.2 data: V1.17.2 writes a snapshot with a test rifle → V1.18.0 migrates it, holds it in IndexedDB with the schema stamp, leaves localStorage byte-identical; later saves reach IndexedDB only and survive a reload; fallback saves land in localStorage; newer-schema files are flagged and schema-less files pass; a forced write failure shows the banner and the next good save clears it; reset clears both stores; the iOS hint shows only in iPhone Safari and dismissal persists; Settings renders the storage panel; zero uncaught errors. The same test crashes against V1.17.2 as the new build, as expected · `index.html` byte-identical to `RTI-SEN-Ballistic-Calculator-V1.18.0.html`.

---

## V1.17.2 — patch — New PWA id + repo link for the SprukK move

*Entry reconstructed on 2026-10-22 from the 18 Oct release session and commit `785734e`; no patch-log entry was written at release time.*

**Problem.** After the main repo moved from `lnQNtrol/SEN-Balistic-Calcutalor` to `SprukK/SEN-Balistic-Calculator`, Chrome on Android reported the app as "already installed" and refused to install it from the new address, because the new deployment carried the same manifest `id` as the old one.

**Fix.** `manifest.json` `id` changed from `/sen-ballistics/` to `/sen-ballistics-sprukk/`, so Android treats the new deployment as a separate app. `sw.js` CACHE bumped so the stale cached manifest is dropped. Settings footer repo link updated to the new repo. No physics or logic change.

**Files:** `index.html` — 6 live version strings and the Settings repo link (the 2 remaining `V1.17.1` hits are historical fix comments, left intentionally). `manifest.json` — `id`. `sw.js` CACHE → `sen-ballistics-v1.17.2`.
**Verify:** `node --check` on the app script and `sw.js` clean · `manifest.json` parses · `index.html` byte-identical to `RTI-SEN-Ballistic-Calculator-V1.17.2.html` · live `manifest.json` on `sprukk.github.io` confirmed serving the new id. Regression re-run on 2026-10-22 with the recovered suite: 20/20 anchors, `domtest.js` 14/14.
**Known issue (device-side):** on the owner's phone the install did not land in the app drawer at first ("cannot open the app"); diagnosis pointed at Android/launcher link handling, not the web app. **Resolved 2026-10-22:** owner confirms both the main app and the Lab probe now install.

---

## V1.17.1 — patch — More button threw `gotoPage(undefined)`

**Problem.** Tapping **More** did nothing and threw `Uncaught TypeError: Cannot read properties of null (reading 'classList')` at `gotoPage`. The boot-time wiring line `document.querySelectorAll('.nav button').forEach(b=>b.onclick=()=>gotoPage(b.dataset.page))` predates V1.17.0, when every nav button carried a `data-page`. V1.17.0 added `#nav-more`, which carries none and relies on its own inline `openMore()` handler — so the forEach **overwrote that handler** with `gotoPage(undefined)`, which then dereferenced `getElementById('page-undefined')` → null.

**Fix.** Two lines. The selector is narrowed to `.nav button[data-page]`, so buttons that don't name a page keep their own handler. `gotoPage` additionally resolves its target node first and returns a no-op if it doesn't exist, so an unknown id can never throw again — the node is then reused instead of being looked up twice.

**Why the V1.17.0 suite missed it.** The headless harness stubbed `querySelectorAll` to return `[]`, so the offending wiring line never executed under test and no click was ever dispatched. Fixed properly: the regression suite now includes **`domtest.js`, a real-DOM (jsdom) click test** that dispatches actual `MouseEvent`s and asserts zero uncaught errors across the run. It reproduces this exact failure on V1.17.0 (5 failures) and passes clean on V1.17.1 (14/14). Standing rule going forward: any change to nav, sheets, or event wiring runs `domtest.js`, not just the numeric anchors.

**Files:** `index.html` — nav wiring selector, `gotoPage` guard + cached node, 6 live version strings. `sw.js` CACHE → `sen-ballistics-v1.17.1`.
**Verify:** `node --check` clean · 20/20 numeric anchors green · `domtest.js` 14/14 with zero uncaught errors — More opens, all 6 More pages navigate and keep More lit, all 5 bar tabs navigate, all 6 act-bar chips respond, both Home disclosures intact · `index.html` byte-identical to `RTI-SEN-Ballistic-Calculator-V1_17_1.html`.

---

## V1.17.0 — minor — Field shell: bottom nav, inline session pickers, progressive disclosure

UX pass on the shell only. No physics function, solver path, data model, or storage key is touched; every change is layout, navigation, or disclosure.

**Primary nav → fixed bottom bar.** Eleven flat tabs in a horizontal scroll meant everything past Wind was off-screen and only findable by scrolling the strip, at a top-of-screen thumb stretch. The bar now carries the five field tabs (Home · Traj · Solver · Wind · Dope) plus **More**, a bottom sheet holding Stability, BC/Truing, Holds, Profiles, Sensors, Settings. At ≥760 px it reverts to the original static top strip — reach is not a constraint on desktop. Both containers keep `class="nav"`, so `gotoPage` and the existing active-state wiring are unmodified; `gotoPage` gains two lines to keep **More** lit while one of its pages is open, and to scroll to top on page change. Verified: all 11 pages reachable, zero orphan nav targets, zero unreachable pages.

**Act-bar chips → inline pickers.** A chip used to navigate to the Trajectory tab, so changing rifle/projectile/weather always cost you the tab you were working on — and setup lived on a tab that isn't the landing page. Each chip now opens a bottom sheet: Rifle, Projectile (calibre-filtered to the active rifle with live search over name + manufacturer), Weather, MV (with "back to profile"), Distance; Wind still routes to the Wind tab, where the two-value entry belongs. **Every picker writes through the same `Bus.setRifle`/`setProj`/`setWx`/`notify` calls the Trajectory selects use** — one code path into session state, so the V1.16.0 auto-solve fires identically from all of them. Verified: 27 of 106 projectiles surfaced for a .25 rifle, search narrows to 1 on "queen", empty state renders on no match.

**Home progressive disclosure.** The turret panel and the manual-wind panel are now `<details>` disclosures whose summaries carry the live value (`↑34 clk · →2 clk`, `5.0 m/s @ 90° rel`, or `live ⊙`), so collapsing costs no information. The manual-wind panel auto-collapses whenever live wind owns the session — it was already locked and dimmed in that state, and a locked panel earns no screen space. The **module grid is removed**: every card routed to a tab already reachable from the nav or the More sheet, and it cost a full screen of scroll. A **first-run setup card** appears above the dashboard until rifle, projectile and weather are all set, ticking each off as it is chosen.

**Field ergonomics.** Turret steppers get a dedicated `.seg.steppers` size (50 px, 14 px bold) for gloved use. The smallest label tier is lifted off the 8–9 px floor across the app (act-bar keys, field labels, source buttons, output-card labels/units, condition cells, sub-notes, table headers, segmented buttons) — those were at the edge of legibility before sun glare was added. Escape closes any open sheet.

**Files:** `index.html` — `<style>` (shell CSS block: `.navbar`, `.navsheet`, `.sheet`/`.sbox`/`.slist`/`.sitem`, `details.disc`, `.seg.steppers`, body bottom padding, legibility tier); nav markup; sheet root element; Home markup (setup card, two disclosures, module grid removed); `renderActBar`, `gotoPage`, `homeManWindLock`, `renderQuick` tail; new `openSheet`/`closeSheet`/`openMore`/`pickSheet`/`sheetPick`/`projSheetList`/`sheetSetNum`/`sItem`/`homeShellSync`; `MORE_PAGES`; Escape listener; 6 live version strings. `sw.js` CACHE → `sen-ballistics-v1.17.0`. `manifest.json` unchanged (`start_url` is the stable `./index.html`).
**Verify:** `node --check` clean · full 20-anchor regression green · HTML tag balance clean (2/2 `<details>`, 2/2 `<summary>`, no unclosed elements) · page walk over all 11 tabs with a live session throws nothing · picker filtering/search/empty-state confirmed · disclosure summary + first-run toggle confirmed · `index.html` byte-identical to `RTI-SEN-Ballistic-Calculator-V1_17_0.html`.

---

## V1.16.0 — minor — One live session solve (the "run trajectory first" gate is gone)

**Problem.** Home recomputed a solution reactively off the session, but the Trajectory output card, Solver, and Wind all sat behind a manual *Compute trajectory* press and greeted the user with "Run a trajectory first (Trajectory tab)." That forced an invisible rule — some tabs are live, some need a button pressed on a *different* tab — and produced constant dead-ends when moving between tabs. Worse, `max_m` defaulted to 200 m: a 300 m target returned OOR with "raise max range on Trajectory", even though Home had auto-extended its own range since V1.14.0.

**Fix.** The session trajectory now recomputes itself whenever the session changes, debounced at 150 ms through the existing `dbnc` helper and hung off the existing `Bus.on` subscriber. `runTraj(silent)` gains one parameter: the auto path runs **identical guards and identical physics**, but a failed guard records why in `trajReason` and clears `lastTraj` via `trajFail()` instead of raising a modal. Consumers read `trajReason` and print the actionable reason in place ("'ZAN .25 46.93 gr' has no BC yet — enter one in its profile, or measure it in the BC / Truing tab") rather than sending the user on an errand. `renderTraj` gained a null branch so a failed solve clears the table, flags and chart instead of leaving stale dope on screen. Live Calypso packets still route through `Bus.notifyWind()` and never reach the integrator (FIX-11c preserved) — one solve per session change, not per packet.

**Max range is now automatic.** It extends to `max(dist+25, zero+25, 150)`, rounded up to the next 25 m, and the new value is **written back into the field so the change is visible, never silent**. This makes the Trajectory tab agree with Home, which has always auto-extended. The old "max range is less than the zero range" alert became unreachable and was removed. `tr-max`/`tr-step` are read straight from the DOM, so they gained their own `oninput="autoTraj()"` trigger. The button remains as a manual refresh, relabelled **Recompute**, and is no longer a prerequisite for anything.

**§20A verification of the max-range change.** Extending the integration length must not move any dope value. Integrating the same session to 200 m and to 800 m and comparing all 201 shared output points: **max |Δ| = 0 across drop, velocity and TOF — bit-identical.** The 100 m firing solution is identical to nine decimals in both elevation (3.645314258 mrad) and windage (0.481339605 mrad). The auto-extension is provably dope-neutral.

**Files:** `index.html` — `runTraj` (silent guards, auto max-range, `refreshActivePage` call, returns bool), new `trajReason`/`trajFail`/`autoTraj`/`refreshActivePage`, `renderTraj` null branch, `solve` + `renderWind` empty states, Solver OOR message, `Bus.on` subscriber, boot line, `tr-max`/`tr-step` triggers, Recompute button + note, 6 live version strings. `sw.js` CACHE → `sen-ballistics-v1.16.0`.
**Verify:** `node --check` clean · standing anchors all green — ρ(20/1010/65) 1.19340 · Vs(20) 343.237 · SD Queen 0.13714 · **Sg Queen 1:20″ 1.42973 and Sg King 1:20″ 1.06738, both reproduced at the corrected Berger convention (853 fps / 10 °C / 986 hPa), independently confirming the ~986 hPa back-calculation** · Sg LRAI-35 1:16″ 1.72378 · toMOA 1.0000 · ¼-MOA click 0.07272 mrad · drop@zero 0.000 mm · 800 m run completes, drop 76.74 m · dial@zero 0 mrad. Integration: incomplete session fails silently with a reason and no alert; complete session at 300 m solves with no Compute press and no max-range edit (auto-extended to 325 m); BC-pending projectile blocks with truing guidance.

---

## V1.15.0 — minor — Home manual wind: compass-bearing entry (Calypso fallback)

New panel on Home between the live bar and the condition strip: **Wind speed (m/s) · Wind from ° (compass) · Target bearing ° (compass)**. Compass-only by design decision — relative/clock entry already lives on the Wind tab; this panel is the field fallback for when the Calypso isn't available and wind is read from a flag, mirage, or report as a compass direction.

**Conversion (input layer only — no physics touched).** Session wind stays canonical relative-to-line-of-fire exactly as `solveShot` documents it (0° = headwind, 90° = from the RIGHT, 180° = tail, 270° = from the LEFT). The panel derives `rel = norm(windFromBearing − targetBearing)` and pushes it via `Bus.setWind(spd, rel, 'manual')`, so Home crosswind, Solver, Wind, Dope, and the act-bar chip all work unchanged. The note line echoes the derived relative angle, crosswind factor, and side (RIGHT/LEFT/head-tail) so the conversion is always visible, never silent.

**Verified (§20A anchors, all exact):** face 180° + wind from 270° → rel 90°, sin = +1, from the RIGHT (west is on the right facing south) ✓ · wind from 90° → rel 270°, sin = −1, from the LEFT — equal magnitude, opposite sign ✓ · wind from target bearing → rel 0° headwind ✓ · wind from behind → rel 180° tailwind ✓ · wrap case 350°−10° → 340° ✓.

**Live interaction.** The panel locks (inputs disabled, dimmed, note explains why) whenever Home live stream OR Wind-tab live mode is active — live Calypso data owns the session wind; `homeManWindLock()` is called from `toggleHomeLive()`, `setWindMode()`, and boot. `homeManWind()` additionally guards on both live flags. Bus push is debounced through the existing `dbnc` helper (same pattern as Wind-tab `onWindInput`) so typing a bearing doesn't rebuild selects per keystroke; the note updates instantly.

**Persistence.** `APP.hmWindBrg` / `APP.hmTgtBrg` persist and prefill on boot (target bearing is the same firing-azimuth input the Coriolis module needs — now on the bus for free). Speed is deliberately session-only, matching the existing rule that `S.wind` is not persisted — no stale wind is ever pushed on relaunch.

**Files:** `index.html` — new `#home-manwind` panel HTML, `homeManWind()` + `homeManWindLock()`, one-line hooks in `toggleHomeLive()`/`setWindMode()`, boot prefill block, 2 CSS rules (`#home-manwind.lock`), 6 live version strings (title, header comment, `.ver` badge, settings footer, 2 export app tags — historical feature tags like "Advanced corrections · V1.14.0" untouched). `sw.js` CACHE → `sen-ballistics-v1.15.0`.
**Verify:** `node --check` on extracted script clean; all seven compass→relative anchor cases plus the 90°/270° equal-magnitude opposite-sign check pass exactly; `index.html` byte-identical to `RTI-SEN-Ballistic-Calculator-V1.15.0.html`; physics core untouched (no function inside the solver/integrator modified).

---

## V1.14.1 — patch — visual redesign, no functional changes

Cosmetic-only pass at the user's request ("V1.14.R"), shipped as V1.14.1. Every module, id, class, event handler, and the entire physics/JS core are byte-identical to V1.14.0 — confirmed by diffing the full file: the only hunks touch the `<style>` block (design tokens + component rules) and the visible version-label text (title, header nameplate).

**Design changes.** Tokens re-tuned toward a "turret dial" identity: background shifted from neutral black toward gunmetal (`--bg #0a0c0f→#0a0b0e`), hairline borders recast from white-opacity to a low-opacity brass tint, teal accent deepened slightly. New tick-mark rule (`repeating-linear-gradient` confined to a 1px-tall background band) replaces the plain `border-bottom` on the app header, `.panel h2`, and `.outcard .ot` — a click-stop motif grounded in the app's own unit (mrad clicks), not decorative. Home hero gets a radial vignette behind the reticle SVG. Manual-override inputs (`input.man`) now dashed-gold border instead of solid, so auto vs. manual is legible at a glance. Buttons/inputs gained a soft accent glow on focus/active for sun-glare/glove use. Numbers in hero cells and tables set with `font-variant-numeric: tabular-nums`. New CSS custom properties added (`--tick`, `--glow`) — purely additive, nothing removed.

**Files:** `<style>` block only (`:root` tokens, `.apphdr`, `.panel h2`, `.outcard .ot`, `.modcard`, `.dash-reticle`, `input.man`, `.btn`, table/number styles); title tag; header `.ver` label. `manifest.json` `background_color`/`theme_color` and the HTML `<meta name="theme-color">` updated to match the new bg token. No changes to any physics function, DOM id, class used by JS (`.on/.active/.man/.hl/.zr/.connected/.scanning/.open/.dis` etc. all untouched), or `<script>` content.
**Verify:** full-file diff against V1.14.0 shows changes confined to the style block + two label lines; `<style>`/`<script>` tag counts balanced; `index.html` byte-identical to the versioned file; standing physics anchors unaffected (nothing in the physics core touched).

---

## V1.14.0 — minor — E2 MV–temp model · B2+B3 Holds page · C2 Coriolis · C1 spin drift (EST)

Everything in this release ships without field data; the two items that ultimately want range validation (spin drift trust, MV–temp population) are structured so field data slots in later without code changes. C3 Aero Jump deliberately deferred — it needs measured crosswind impacts to be worth anything.

**E2 — MV vs temperature (BC / Truing tab).** Per-rifle observation log (`r.mvt`), temp + measured MV per row, least-squares linear fit shown as slope in m/s per °C with the observed range. Deliberately PULL-based per §20E: the model never silently rewrites the session MV — "Set session MV from model" applies the prediction at the current session temperature and stamps provenance `src.mv='mvtemp'` (new chip badge **ƒT**). Extrapolation outside the observed temp range is flagged. Verified: fit reproduces the hand-computed regression exactly (slope 0.400, intercept 248.0 on the 3-point check); degenerate same-temperature input returns null instead of a division blow-up.

**B2+B3 — Holds page (new nav tab).** Fixed-zero holdover table: range sweep (from/to/step) with hold in the scope's native unit, click-equivalent, nearest reticle mark down from center with residual (active scope's reticle hashes; graceful "holds in mrad only" when the scope has no verified reticle — consistent with M1), and full-value crosswind hold at a reference speed. Same −drop/d convention as the Trajectory table and Home (§20A: one convention everywhere), computed on a 1 m grid via `homeTraj(maxOver)`. Print button renders the HFT/benchrest cheat sheet through the existing print pipeline. Sg-penalty warning carries through.

**C2 — Coriolis (Solver, exact physics).** Implemented as the trajectory integral Δ = 2Ω·sin(lat)·∫x dt (horizontal, + = right in N hemisphere any azimuth) and Δ = 2Ω·cos(lat)·sin(az)·∫x dt (vertical Eötvös, east prints high), evaluated by trapezoid over the actual RK4 fine grid — more accurate under heavy subsonic drag than the constant-velocity textbook form, and reduces to it exactly in the constant-velocity limit. Verified against the analytic anchor Δ=Ω·sin(lat)·X·T: 52.499 mm = 52.499 mm (exact match), az=0 vertical = 0, southern-hemisphere sign flip correct. Realistic magnitude: Queen .25 at 300 m, lat 46° → 22 mm ≈ 0.073 mrad. Toggle default OFF (`APP.solverCor`), latitude persisted (`APP.lat`, default 46.05), when ON the correction enters the dial and is itemised in the flags with impact direction and mm.

**C1 — Spin drift (Solver, EST ⚠).** Litz empirical fit 1.25·(Sg+1.2)·TOF^1.83 inches, RH twist drifts right, LH flips, pellets/smooth bores → n/a. Sg comes from the session (`sessionSg()`, same verified-C-first policy as Home). **Loudly flagged: the fit is derived from supersonic rifle bullets and is UNVALIDATED for subsonic slugs** — default OFF, and when ON the flag row repeats the EST warning next to the mm and dial values. Verified against the Litz literature anchor: Sg 1.74 / TOF 1.5 s → 7.72 in exactly. Field-validation protocol (a handful of zero-wind groups at 100–150 m, L/R bias vs prediction) is the open item before this earns trust.

**Process fix (this release).** The whole-file version-bump sed had been silently rewriting historical fix tags in code comments at every release since V1.12.5 (e.g. "H1 (V1.13.1)" had become "H1 (V1.13.2)"). All 16 mangled tags restored to their origin versions; from now on version bumps target only the live version strings (title, header, settings note, export `app:` fields, sw CACHE), never comments.

**Files:** physics core (+OMEGA/xTimeIntegral/coriolisH_mm/coriolisV_mm/spinDrift_mm/mvtFit), `sessionSg()`, `homeTraj(maxOver)`, Holds page markup + `renderHolds`/`printHolds`, Solver corrections panel + `solve()` wiring + `svSetCor`/`svSetSpin`, E2 panel + `mvtRender`/`mvtAdd`/`mvtDel`/`mvtApply`, nav, `gotoPage`, APP defaults (`solverCor/solverSpin/lat`), chip badge, version strings, sw CACHE (`sen-ballistics-v1.14.0`).
**Verify:** Coriolis integral = analytic anchor exact · az/hemisphere signs correct · Litz anchor 7.72 in exact · mvtFit = hand regression exact, degenerate-safe · standing anchors green (toMOA 1.0000 · Sg Queen 1.43 · drop@zero 0.0000 mm) · `node --check` clean · index.html byte-identical.

---

## V1.13.2 — patch — M1–M5 hardening · L1 dense-output precision

**M1 — reticle provenance.** `getReticle(null)` silently returned the first DB reticle (milgrid), so the 20 Vector-seeded scopes with `reticleId:null` listed "Mil-Grid (generic)" as their reticle and Home drew it as if it were the scope's glass. `getReticle` now returns null for null/unknown ids; Profiles show "no reticle"; Home still draws the mil-grid as an explicit fallback but captions it **"generic grid — scope has no verified reticle ⚠"**. Scope-import preview guarded against the new null.

**M2 — estimateC .25 mid-bucket removed.** The invented C=2.0 for L/D 2.1–2.5 was interpolation by another name (§8B forbids it) and swallowed the Berger-verified King (L/D 2.189, C=1.886) with a 6% error. Replaced with nearest-verified-anchor selection (Queen 2.031→2.283 · King 2.189→1.886 · SEN LR-25 3.084→1.877), still flagged EST; outside 2.0–3.1 remains invalid. Verified: all three anchors reproduce exactly; ZAN .25 (L/D 1.66) correctly rejected.

**M3 — stored-XSS closed.** Profile names from user input or import JSON flowed unescaped into `innerHTML` at ~20 sinks (lists, selects, chips, dope print, budget notes) — a crafted import file executed with localStorage access. Added one `esc()` helper and applied it at every name→HTML sink. Bonus: the delete button no longer smuggles the name through a `data-` attribute (names containing ":" truncated; quotes were stripped) — `confirmDelete` now resolves the name from the DB by id.

**M4 — single dope-card import.** `exportDope()` writes `{dopeCard:{…}}`, which `importAll()` silently ignored ("Import merged" with nothing merged). The single-card shape is now accepted with the same no-overwrite id rule.

**M5 — rifle calibre is a select.** Was free text while projectile caliber matching is strict string equality — ".25 " or "0.25" silently broke the Match-calibre filter. Now the same nominal list as the projectile form (+ any legacy value kept as an extra option); boot migration trims whitespace off stored rifle calibres.

**L1 — integrator dense output.** Output points were recorded at the first 0.002 s step PAST each output range (≈0.5 m overshoot at airgun velocities, label rounded) — ~0.03 mrad of silent dial error at every range in every module, in all prior versions. Both passes now interpolate the state linearly within the bracketing integration step to the exact output range: the zero bisection targets y at exactly `zero_m`, and every output row carries its exact range. Measured against a dt/10 exact-position reference: worst dial error **0.031 → 0.0045 mrad** (~1/20 click; the residual is RK4 dt truncation itself). drop(zero)=0.0000 mm preserved by construction; the two-pass physical zero shift on mismatched atmospheres is preserved (−0.309 mm on the 20→35 °C split case); the muzzle row is now exact (0 m, v=MV).

**Cosmetics:** `.subnav` used undefined `var(--card)` → `var(--bg2)`; stale Sensors note ("BC back-calc returns in V1.4") → points at the BC / Truing tab.

**Files:** `getReticle` + 3 call sites, `estimateC`, `esc()` + ~20 sinks, `pitem`/`bindProfActs`/`confirmDelete`, `importAll`, rifle form calibre select + boot trim, `rk4traj` (finalY + output loop), 2 CSS/text cosmetics, version strings, sw CACHE (`sen-ballistics-v1.13.2`).
**Verify:** L1 0.031→0.0045 mrad vs dt/10 reference · drop@zero 0.0000 mm · zero-shift preserved · M2 anchors exact (2.283/1.886/1.877, L/D 1.66 invalid) · esc neutralises `<img onerror>` payload · anchors green (toMOA 1.0000 · Sg Queen 1.43 · ¼-MOA click 0.0727 mrad) · `node --check` clean · index.html byte-identical.

---

## V1.13.1 — patch — Home honours BC/sight overrides (H1) · solver-grade 1 m lookups (H2) · icons verified (H3)

**H1 — Home dashboard ignored manual BC and sight-height overrides.** `homeTraj()` read `p.bcg7/p.bcg1` and `r.sight` from the profiles while honouring the session's MV and weather overrides — a manual/trued BC entered on the Trajectory tab changed A3's dope while Home silently kept computing from the profile (§20E bus-provenance violation).
*Fix:* `homeTraj()` now mirrors `runTraj()` exactly: BC from the bus (`S.bc`, profile fallback), sight from `S.sight_mm` (rifle fallback, added to the finite guard), and a **manual BC is taken as-is** — Sg is still computed for the status line, but the stability penalty is skipped when `S.src.bc==='manual'` (a manual/trued value is already the effective BC).

**H2 — Solver/Wind/Trajectory-card dope was quantised to the display grid.** `nearestPt` returned the nearest point and silently tolerated up to 13 m of mismatch; on the default 25 m table the Solver used a point up to 12.5 m away AND divided by the requested range — measured worst case **1.91 mrad** of dial error against a dt/10 exact-position reference (Queen .25, 255 m/s, z=50 m, 51–195 m sweep).
*Fix (two layers):* (1) `runTraj()` now also integrates a 1 m-step `ptsFine` sibling whenever the display step is coarser; the Solver, the Wind output card, and the Trajectory output card solve exclusively off it, while the drop/wind tables keep the user's display step untouched. One extra integration per Compute press — Home already pays this on every render. (2) `nearestPt` itself now linearly interpolates between the bracketing points (same name and signature, so every solution path — Home, Solver, Wind, Dope, Trajectory card — inherits the fix through `solveShot`), which also makes fractional rangefinder distances (e.g. 137.5 m) exact. OOR contract preserved: null outside the computed range, ±0.51 m endpoint tolerance.
*Verified:* worst-case dial error over the sweep **1.91 → 0.031 mrad** (≈ ⅓ click); the 0.031 mrad residual is pre-existing integrator output quantisation, logged as L1 below. Exact match on grid hits, OOR null confirmed.

**H3 — icon filenames: verified, no action.** Repo carries `icon-192.png` / `icon-512.png` (with dashes), matching manifest, sw CORE, and apple-touch-icon. The concern arose from dash-less copies in project knowledge. Offline precache path confirmed sound.

**Files:** `homeTraj`, `nearestPt` (interpolating), `runTraj` (+`ptsFine`), `renderTraj` output card, `solve()`, `renderWind()` output card, version strings, sw CACHE (`sen-ballistics-v1.13.1`).
**Verify:** off-grid dial error 1.91 → 0.031 mrad vs dt/10 reference · on-grid interp exact (Δdrop 0.000000) · manual-BC parity Home↔Trajectory · anchors green (toMOA(29.089 mm@100 m)=1.0000 · Sg Queen 1:20″=1.43 · drop@zero=0.000 mm) · `node --check` clean · index.html byte-identical to the versioned file.

---

## V1.13.0 — minor — Turret state on Home (dialed clicks → remaining reticle hold)

**Feature:** Home gains a **Turret dialed** panel. Elevation has a two-mode toggle:
- **Match prediction** (default) — assumes the full predicted dial rounded to whole clicks; the reticle dot shows only the sub-click remainder (e.g. solution 23.4 clk → dialed 23 auto → 0.04 mrad residual hold).
- **Manual entry** — no number inputs; ±1 / ±10 click steppers track what was physically dialed; reticle shows solution − dialed.

**Windage is manual-only** (no auto mode): default 0 dialed = full holdover on the reticle, matching the competition workflow. Same ±1/±10 steppers. One **Reset dialed → 0** button clears both axes.

The big Elevation/Windage solution cells **always show the full dial from turret zero** — turret state only moves the reticle aim dot and the remaining-hold note (shown in the scope's native unit, mrad or MOA). Stacks correctly with the adjustable-rail offset: remaining = solution − rail − turret.

**Behavior/safety:** dialed counts are session-only (not persisted) and auto-reset on rifle change — stale turret state is wrong dope. Elevation mode preference persists (`APP.turretMode`). Conversion goes through `clickStepMrad`, so ¼/⅛-MOA scopes are unit-correct. Steppers are disabled (dimmed) in match mode.

**Files:** Home markup (turret panel), `setTurretMode`/`turretStep`/`turretReset`/`updateTurretUI`, `renderQuick` solution + no-solution branches, `drawVCT34`/`drawGenericReticle` (aim dot uses `wind.rem`), `Bus.setRifle` (reset), `APP` default + boot restore, version strings, sw CACHE.

**Verify:** match auto-dial 23 clk from 2.34 mrad @ 0.1 clk, residual 0.040 mrad ✓ · manual ↑20/→10 → rem 0.340 / 1.630 mrad ✓ · ¼-MOA scope: dial 32 clk, residual 0.013 mrad ✓ · standing anchors green (toMOA(29.089 mm@100 m)=1.0000 · Sg Queen 1:20″=1.43 · drop@zero=0.000 mm) · `node --check` clean.

---

## V1.12.5 — patch — BC/SD crash, toMOA 10× error, session rehydrate on boot

**C1 — BC/SD tab crashed the app.** `page-bcsd` no longer existed (the module was merged into the Truing page during the V1.12.x re-layout) but the nav button, Home modcard, and `gotoPage` branch remained → TypeError after all pages were deactivated → blank screen.
*Fix:* nav button removed; Truing tab renamed **BC / Truing**; Home modcard repointed to `truing`; dead branch deleted; entering the tab now runs `bcFromProj()` (active projectile) or `calcBC()` (defaults) — also resolving the placeholder-card bug that V1.12.1 fixed and the page merge resurrected.

**C2 — `toMOA()` returned 10× the true MOA.** Factor was `1000/29.089` (=34.38); 29.089 mm is 1 MOA at **100** m, so mm/m (= mrad) converts by ×3.43775. Only the Trajectory drop-table MOA column was affected; mrad and click outputs were always correct.
*Fix:* `toMOA = (mm/m) × MRAD2MOA`. Anchor: `toMOA(29.089, 100) = 1.0000`.

**C3 — Session solution lost on every restart.** `saveDB()` persists profile IDs but not the derived overridables (`mv/bc/sight/ct/cp/crh`); boot never re-pulled them, so Home showed "select rifle…" despite restored chips.
*Fix:* boot calls `Bus.pullFromProfiles(['mv','sight','bc','ct','cp','crh'])` when session IDs exist. Manual overrides were never persisted, so nothing is overwritten; missing profiles are skipped per field.

**Files:** nav markup, Home modgrid, `gotoPage`, `toMOA`, boot block, version strings, sw CACHE (`sen-ballistics-v1.12.5`).
**Verify:** toMOA anchors exact · clickMrad(¼ MOA)=0.0727 · drop@zero 0.000 mm · Sg Queen 1:20″=1.43 · Sg LRAI-35-H worst-case 1.72 · syntax clean.

---

## Known open items (carried forward)

- ~~H1 / H2 / H3~~ — resolved in V1.13.1.
- ~~M1–M5, L1, cosmetics~~ — resolved in V1.13.2.
- **Field-data queue (awaiting range time):** C1 spin-drift validation (zero-wind L/R bias at 100–150 m vs Litz prediction) · E2 MV–temp population (Xero strings across temps) · C3 Aero Jump (deferred until measured crosswind impacts exist) · ZAN .25 BC truing · AEA CP .30 rerun at confirmed BC.
- Code queue: **empty.**
