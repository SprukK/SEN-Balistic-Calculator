# SEN regression tests

Run all four before every release. All must be fully green.

| File | What it checks | Expected on V1.19.0 |
|---|---|---|
| `runtests.js` (+ `harness.js`) | 20 numeric physics anchors: air density, speed of sound, SD, Berger Sg (Queen, King, LRAI-35), unit conversions, RK4 trajectory, firing solution | PASS 20 / FAIL 0 |
| `domtest.js` | Real-DOM (jsdom) click test: bottom nav, More sheet, act-bar pickers, Home disclosures, zero uncaught errors | PASS 14 / FAIL 0 |
| `storagetest.js` | IndexedDB storage (V1.18.0): migration of real previous-release data from localStorage, rollback safety, reload, fallback, schema guard, save-failure warning, factory reset, iOS install hint | PASS 22 / FAIL 0 |
| `importtest.js` | Import (V1.19.0): own export round-trip, same content under other ids, field whitelist, rejects, review sheet with Overwrite / Save as copy / Skip / apply-to-all / Cancel, reference remap, preferences row, schema guard, single dope card, escaping | PASS 28 / FAIL 0 |

`domtest.js` is mandatory for any change to navigation, sheets or event wiring (V7 §21.4). `storagetest.js` and `importtest.js` are mandatory for any change to loading, saving, import/export or the data schema. `runtests.js` alone cannot see click handlers — that gap let the V1.17.0 More-button bug ship.

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
```

## Provenance

Recovered on 2026-10-22 verbatim from the chat sessions that built them (16 Oct 2026, V1.16.0–V1.17.1), with every later in-session edit applied. Re-verified against V1.17.2 on recovery: 20/20 and 14/14, matching the results recorded at V1.17.1.

Notes:
- The Sg Queen/King anchors use the corrected Berger convention (853 fps / 10 °C / **986 hPa**), not 1013 hPa.
- The "V1.16.0 NEW BEHAVIOUR" block only asserts that functions exist; extend it when that code changes.
- When a change alters what a test asserts (new nav page, new chip), update the test in the same commit and say so in the patch log.
