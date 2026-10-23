# SEN regression tests

Run all nine before every release. All must be fully green.

| File | What it checks | Expected on V1.24.0 |
|---|---|---|
| `runtests.js` (+ `harness.js`) | 20 numeric physics anchors: air density, speed of sound, SD, Berger Sg (Queen, King, LRAI-35), unit conversions, RK4 trajectory, firing solution | PASS 20 / FAIL 0 |
| `domtest.js` | Real-DOM (jsdom) click test: bottom nav, More sheet, act-bar pickers, Home disclosures, zero uncaught errors | PASS 14 / FAIL 0 |
| `storagetest.js` | IndexedDB storage (V1.18.0): migration of real previous-release data from localStorage, rollback safety, reload, fallback, schema guard, save-failure warning, factory reset, iOS install hint | PASS 22 / FAIL 0 |
| `importtest.js` | Import (V1.19.0): own export round-trip, same content under other ids, field whitelist, rejects, review sheet with Overwrite / Save as copy / Skip / apply-to-all / Cancel, reference remap, preferences row, schema guard, single dope card, escaping | PASS 28 / FAIL 0 |
| `sharetest.js` | Sharing (V1.20.0): bundle contents (scope + custom reticle, built-in reticles referenced), SEN1 code round-trip and checksum, codes inside messages/links, damaged codes refused, QR encoder ↔ decoder agreement, receiving into another install with the scope choice, launch-from-link import, escaping | PASS 24 / FAIL 0 |
| `windtest.js` | Wind & heading (V1.21.0): Calypso "points at the target" unchanged, fixed-bearing mode, wind kept as a compass vector across target changes, wrap through north, no wrong wind without a bearing, V1.15.0 compass anchor, shared Home/Solver bearing, persistence, phone-compass capture (Android, iPhone permission, none) | PASS 22 / FAIL 0 |
| `unittest.js` | Units (V1.22.0): every conversion pair exact, every number input classified (unit or explicit exemption — fails on any new unclassified field), 250 m → 273.4 yd and back to exactly 250, typing in display units stores metric, unedited form saves never drift, session + trajectory bit-identical in metric vs imperial, dual units incl. Home, no metric value left on any page in imperial | PASS 18 / FAIL 0 |
| `coursetest.js` | Course model (V1.23.0): real previous-release dope cards upgraded to schema v2, bit-identical dope, 0° headwind fix, v1/v2 import upgrade + sanitising, own card re-import identical, target details (label, bearing, size with units, position, shots), stage time, compass capture, printed card, restart | PASS 20 / FAIL 0 |
| `layouttest.js` | Layout (V1.24.0): screen classified by shape (outer phone, inner fold both orientations, desktop, landscape tablet, mouse square), two-pane rail with reticle/solution + turret + conditions, rail live on other tabs, turret usable from the rail, all tabs + More sheet, fold/unfold restoring the exact original order, Settings screen info, starting unfolded | PASS 18 / FAIL 0 |

`domtest.js` and `layouttest.js` are mandatory for any change to navigation, sheets, event wiring or page layout (V7 §21.4). `windtest.js` is mandatory for any change to wind, bearings or the Calypso path. `unittest.js` is mandatory for any change that adds or edits a number field or prints a value with a unit. `storagetest.js`, `importtest.js`, `sharetest.js` and `coursetest.js` are mandatory for any change to loading, saving, import/export or the data schema. `runtests.js` alone cannot see click handlers — that gap let the V1.17.0 More-button bug ship.

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
```

## Provenance

Recovered on 2026-10-22 verbatim from the chat sessions that built them (16 Oct 2026, V1.16.0–V1.17.1), with every later in-session edit applied. Re-verified against V1.17.2 on recovery: 20/20 and 14/14, matching the results recorded at V1.17.1.

Notes:
- The Sg Queen/King anchors use the corrected Berger convention (853 fps / 10 °C / **986 hPa**), not 1013 hPa.
- The "V1.16.0 NEW BEHAVIOUR" block only asserts that functions exist; extend it when that code changes.
- When a change alters what a test asserts (new nav page, new chip), update the test in the same commit and say so in the patch log.
- `sharetest.js` cannot drive a real camera: in-app QR scanning (BarcodeDetector on Android, jsQR on iOS) must be checked on a phone after release.
- `windtest.js` simulates compass sensor events; the real phone compass and the Calypso's direction convention (clockwise, wind FROM, relative to its mark) must be checked on the device.
- `layouttest.js` drives the layout logic with simulated screen sizes; jsdom does no real rendering, so the look of the two-pane screen must be checked on the Magic V5.
