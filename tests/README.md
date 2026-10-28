# SEN regression tests

Run all nineteen before every release. All must be fully green.

| File | What it checks | Expected on V1.31.0 |
|---|---|---|
| `runtests.js` (+ `harness.js`) | 76 numeric physics anchors (**V1.31.0:** shot angle and head/tailwind against py-ballisticcalc, ISA station pressure): air density, speed of sound, SD, Miller/Berger Sg (V1.30.0: Berger's own Queen 1.18 and King results, C = 30·d², BC penalty vs Berger, L/D and pellet rules), unit conversions, RK4 trajectory, firing solution; **V1.24.2:** standard G1/G7 table values, trajectories reproduced against py-ballisticcalc (G7 and G1) and the owner's Element Ballistics table to 1000 m; **V1.29.0:** crosswind changing along the flight (CORE-17 core) — uniform and five two-station cases (nearest, blend) reproduced against py-ballisticcalc per-zone winds, station mapping, symmetry, near-muzzle weighting, `solveShot` unchanged without stations; **V1.29.1:** time of flight and lag-rule drift against py-ballisticcalc (fail on the old Euler position update) | PASS 76 / FAIL 0 |
| `domtest.js` | Real-DOM (jsdom) click test: bottom nav, More sheet, act-bar pickers, Home disclosures, zero uncaught errors | PASS 14 / FAIL 0 |
| `storagetest.js` | IndexedDB storage (V1.18.0): migration of real previous-release data from localStorage, rollback safety, reload, fallback, schema guard, save-failure warning, factory reset, iOS install hint | PASS 22 / FAIL 0 |
| `importtest.js` | Import (V1.19.0): own export round-trip, same content under other ids, field whitelist, rejects, review sheet with Overwrite / Save as copy / Skip / apply-to-all / Cancel, reference remap, preferences row, schema guard, single dope card, escaping | PASS 28 / FAIL 0 |
| `sharetest.js` | Sharing (V1.20.0): bundle contents (scope + custom reticle, built-in reticles referenced), SEN1 code round-trip and checksum, codes inside messages/links, damaged codes refused, QR encoder ↔ decoder agreement, receiving into another install with the scope choice, launch-from-link import, escaping | PASS 24 / FAIL 0 |
| `windtest.js` | Wind & heading (V1.21.0): Calypso "points at the target" unchanged, fixed-bearing mode, wind kept as a compass vector across target changes, wrap through north, no wrong wind without a bearing, V1.15.0 compass anchor, shared Home/Solver bearing, persistence, phone-compass capture (Android, iPhone permission, none) | PASS 22 / FAIL 0 |
| `unittest.js` | Units (V1.22.0): every conversion pair exact, every number input classified (unit or explicit exemption — fails on any new unclassified field), 250 m → 273.4 yd and back to exactly 250, typing in display units stores metric, unedited form saves never drift, session + trajectory bit-identical in metric vs imperial, dual units incl. Home, no metric value left on any page in imperial | PASS 18 / FAIL 0 |
| `coursetest.js` | Course model (V1.23.0): real previous-release dope cards upgraded to schema v2 with every solution input untouched (dope changed on purpose in V1.24.2), 0° headwind fix, v1/v2 import upgrade + sanitising, own card re-import identical, target details (label, bearing, size with units, position, shots), stage time, compass capture, printed card, restart | PASS 21 / FAIL 0 |
| `layouttest.js` | Layout (V1.24.0): screen classified by shape (outer phone, inner fold both orientations, desktop, landscape tablet, mouse square), two-pane rail with reticle/solution + turret + conditions, rail live on other tabs, turret usable from the rail, all tabs + More sheet, fold/unfold restoring the exact original order, Settings screen info, starting unfolded | PASS 18 / FAIL 0 |
| `rendertest.js` | Real rendering (V1.24.1, headless Chromium): on the outer screen and the unfolded inner screen at Normal/Large/XL text — bottom nav pinned while the page scrolls, solution rail fits the screen and scrolls independently of the left pane, More sheet on screen after scrolling; high contrast lifts main text to white with no page filter; Settings screen line follows fold/unfold; **V1.25.0:** Formulas page fits the outer screen | PASS 22 / FAIL 0 |
| `bcmigtest.js` | Trued-BC migration (V1.24.2): BCs trued by the previous release's engine — G7 converted × π/4 (equals what the new engine trues from the same measurement and the py-ballisticcalc BC), banded G7 per band, G1 set to pending with the old value in the notes and the trajectory blocked with truing guidance, maker BCs untouched, runs once | PASS 11 / FAIL 0 |
| `formulatest.js` | Formula panel (V1.25.0, CORE-06): self-check at boot (slow truing round trip excluded), Formulas page in More with one card per formula, every anchor passes live, every formula has equation/source/use/anchors, exactly the five estimates flagged EST (V1.26.0: + MV spread → vertical), no theoretical SEN design as an anchor, a broken formula or corrupted drag value raises the warning on every screen and turns its card red, text-only rendering | PASS 19 / FAIL 0 |
| `homelayouttest.js` | Home layouts (V1.26.0, CORE-16): seeded layouts (five from V1.27.0), Default identical to the previous release's Home, switching from the Home sheet, Benchrest 50/100 m modules equal to the solver (wind offset now, 1–5 table in the display unit), chrono → vertical spread, card timer, editor (rename, ▲▼, on/off, settings, duplicate, delete, new from template, last one protected), restart, fold rail, imperial, escaping, garbage normalised | PASS 31 / FAIL 0 |
| `courserunnertest.js` | Course runner (V1.27.0, CORE-16 part 2): PRS and Big bore layouts run a dope card's course on Home — guidance without a course, targets' dial/wind equal Home's solution, per-target wind from bearings, tap → session distance, Hit/Miss through shots → targets → stages, 300 m beyond Home's default range, hits, stage timer, restart resumes, course switch resets, imperial, escaping | PASS 20 / FAIL 0 |
| `calypsotest.js` | Calypso connect (V1.27.1, LAB-02): simulated units that only accept their own `:DU` unlock code — unit #2 and unit #1 each send only their own code and then the unchanged handshake, live wind on the Sensors card, battery from `0x2A19` (not `:GK` field 2), an unlisted unit falls back through the known codes, a locked unit stops with the capture hint and no keepalive, no battery service still gives wind | PASS 18 / FAIL 0 |
| `windavgtest.js` | Wind average window (V1.28.0, CALC-20): the app's own vector mean of the Calypso's instant readings — known cases (steady, 350°/10° wrap, opposite winds cancel, calm readings carry no weight, swing → steadiness cos 30°), 900 random readings reproduced independently, window boundaries, fill and gap flags, 2 h buffer limit, selectors + custom minutes + clamping + restart, live stream ignores the unit's own average field, Home avg vs instant, Wind tab live, "Use wind → session", fixed-bearing mount, reset, unit switch, no HTML sinks | PASS 28 / FAIL 0 |
| `stabtest.js` | Stability (V1.30.0): built-in Miller rule replaces the C table — upgrade from the previous release clears the C values the app handed out (Queen 2.283, King 1.886, SEN design constants) and keeps a user's own C, import clears them too, Home Sg and BC penalty follow Miller, Stability tab (Berger's Queen 1.18, override, L/D < 2.0, pellet, real .30 hollow point flag), pellets get no Sg on Home | PASS 12 / FAIL 0 |
| `flighttest.js` | Flight (V1.31.0): Home with a 30° angle and with a 5 m/s headwind equals the re-solved trajectory (and differs from the old Rifleman's rule), level and pure crosswind unchanged, dope card per-target angle, weather form sea-level (QNH) pressure — needs altitude, converts to station pressure, shown as QNH, survives restart and import — Solver note | PASS 13 / FAIL 0 |
| `swtest.js` | Service worker (V1.25.1, CORE-09): runs the real `sw.js` against a simulated CacheStorage — activating a release deletes only Main's old caches (`sen-ballistics-*`, legacy `sen-calc-*`) and never the Lab probe's (`sen-ble-probe-*`, `sen-lab-*`) or anyone else's | PASS 6 / FAIL 0 |

`domtest.js`, `layouttest.js` and `rendertest.js` are mandatory for any change to navigation, sheets, event wiring, page layout or page-wide CSS (V7 §21.4). `windtest.js`, `calypsotest.js` and `windavgtest.js` are mandatory for any change to wind, bearings or the Calypso path; `stabtest.js` for any change to stability or Sg; `flighttest.js` for any change to the trajectory inputs (angle, wind, pressure). `unittest.js` is mandatory for any change that adds or edits a number field or prints a value with a unit. `storagetest.js`, `importtest.js`, `sharetest.js`, `coursetest.js` and `bcmigtest.js` are mandatory for any change to loading, saving, import/export or the data schema. Any change to the drag engine, tables or truing needs `runtests.js` anchors reproduced against an independent solver (§20A). Any change to `sw.js` runs `swtest.js`; any change to the storage names or snapshot shape also breaks the Lab app's reader (storage contract next to `IDB_NAME` in `index.html`). Any new or changed formula also gets an entry with anchors in the app's `FORMULAS` registry, and `formulatest.js` must stay green. `runtests.js` alone cannot see click handlers — that gap let the V1.17.0 More-button bug ship.

## How to run

From the repo root (Node 18+):

```bash
# 1. syntax check + anchors: extract the app script, then run the anchor suite on it
python3 -c "import re;s=open('index.html',encoding='utf-8').read();open('/tmp/app.js','w',encoding='utf-8').write(re.search(r'<script>(.*)</script>',s,re.S).group(1))"
node --check /tmp/app.js
(cd tests && node runtests.js /tmp/app.js)

# 2. real-DOM click test (needs jsdom; install it OUTSIDE the repo so no node_modules gets committed)
npm install jsdom fake-indexeddb --prefix /tmp/jsdom
(cd tests && NODE_PATH=/tmp/jsdom/node_modules node domtest.js ../index.html)

# 3. storage test: new build vs the previous release (its real localStorage data is migrated)
(cd tests && NODE_PATH=/tmp/jsdom/node_modules node storagetest.js ../index.html ../RTI-SEN-Ballistic-Calculator-V1.17.2.html)

# 4. import test
(cd tests && NODE_PATH=/tmp/jsdom/node_modules node importtest.js ../index.html)

# 5. share test
(cd tests && NODE_PATH=/tmp/jsdom/node_modules node sharetest.js ../index.html)

# 6. wind & heading test
(cd tests && NODE_PATH=/tmp/jsdom/node_modules node windtest.js ../index.html)

# 7. units test
(cd tests && NODE_PATH=/tmp/jsdom/node_modules node unittest.js ../index.html)

# 8. course test: new build vs the previous release (its real dope cards are upgraded)
(cd tests && NODE_PATH=/tmp/jsdom/node_modules node coursetest.js ../index.html ../RTI-SEN-Ballistic-Calculator-V1.22.0.html)

# 9. layout test
(cd tests && NODE_PATH=/tmp/jsdom/node_modules node layouttest.js ../index.html)

# 10. render test: real Chromium via Playwright (pre-installed in Claude's cloud workspace at
#     /opt/npm-tools/node_modules; elsewhere: npm install playwright --prefix /tmp/jsdom && npx playwright install chromium)
(cd tests && NODE_PATH=/tmp/jsdom/node_modules:/opt/npm-tools/node_modules node rendertest.js ../index.html)

# 11. trued-BC migration test: new build vs the release before the V1.24.2 drag fix
(cd tests && NODE_PATH=/tmp/jsdom/node_modules node bcmigtest.js ../index.html ../RTI-SEN-Ballistic-Calculator-V1.24.1.html)

# 12. formula panel test
(cd tests && NODE_PATH=/tmp/jsdom/node_modules node formulatest.js ../index.html)

# 13. service worker test (no dependencies)
(cd tests && node swtest.js ../sw.js)

# 14. home layouts test: new build vs the previous release (its Home order must be reproduced by "Default")
(cd tests && NODE_PATH=/tmp/jsdom/node_modules node homelayouttest.js ../index.html ../RTI-SEN-Ballistic-Calculator-V1.25.1.html)

# 15. course runner test
(cd tests && NODE_PATH=/tmp/jsdom/node_modules node courserunnertest.js ../index.html)

# 16. Calypso connect test (per-unit unlock code, battery, locked unit)
(cd tests && NODE_PATH=/tmp/jsdom/node_modules node calypsotest.js ../index.html)

# 17. wind average window test (CALC-20)
(cd tests && NODE_PATH=/tmp/jsdom/node_modules node windavgtest.js ../index.html)

# 18. stability test: new build vs the previous release (its seeded C values are migrated)
(cd tests && NODE_PATH=/tmp/jsdom/node_modules node stabtest.js ../index.html ../RTI-SEN-Ballistic-Calculator-V1.29.1.html)

# 19. flight test (shot angle, head/tailwind, QNH)
(cd tests && NODE_PATH=/tmp/jsdom/node_modules node flighttest.js ../index.html)
```

## Provenance

Recovered on 2026-10-22 verbatim from the chat sessions that built them (16 Oct 2026, V1.16.0–V1.17.1), with every later in-session edit applied. Re-verified against V1.17.2 on recovery: 20/20 and 14/14, matching the results recorded at V1.17.1.

Notes:
- The V1.24.2 drag anchors were reproduced with py-ballisticcalc 3.1.1 (`pip install py-ballisticcalc`; its drag constant 2.08551e-4 = (π/8)·ρ₀/144 carries the π/4 the old engine lacked). Re-run it for any new trajectory anchor.
- The Sg Queen/King anchors use the corrected Berger convention (853 fps / 10 °C / **986 hPa**), not 1013 hPa.
- The "V1.16.0 NEW BEHAVIOUR" block only asserts that functions exist; extend it when that code changes.
- When a change alters what a test asserts (new nav page, new chip), update the test in the same commit and say so in the patch log.
- `sharetest.js` cannot drive a real camera: in-app QR scanning (BarcodeDetector on Android, jsQR on iOS) must be checked on a phone after release.
- `windtest.js` simulates compass sensor events; the real phone compass and the Calypso's direction convention (clockwise, wind FROM, relative to its mark) must be checked on the device.
- `layouttest.js` drives the layout logic with simulated screen sizes; jsdom does no real rendering. `rendertest.js` covers positions and scrolling in real Chromium (it fails 20 of 21 on V1.24.0); the look on the Magic V5 itself is still checked on the device.
