# SEN Ballistic Calculator — Data, Storage, Import/Export, Sharing, Drive, Security Review (V2.16.0)

Review only. No code was changed, nothing was committed or pushed. Implementation target: Claude Opus 5.5, under PROJECT_INSTRUCTIONS_V8 §21 (plan → "go" → minimal change → full regression).

Confidence labels: **Reproduced** = shown in the running app (jsdom with fake-indexeddb, or headless); **Likely** = clear from code reading, not run; **Suspected** = plausible, not confirmed. Every payload below was run against `index.html` at d82fd52 unless marked otherwise.

---

## A. Scope

**Commit:** `d82fd522` (V2.16.0). Files: `index.html`, `sw.js`, `manifest.json`. Working tree left clean.

**Read**
- Project knowledge: PROJECT_INSTRUCTIONS_V8 (§2, §18, §21.3, §21.6), clean-code-rules.md, SEN-Feature-Register (A-01…A-08 as found, CORE-01/02/03/08/09/10/15/26 entries and decision log).
- Code: units and Settings (1882–2098: `QDEF`, `UNITS`, `renderSettings`, `setUnit`, `UNIT_PRESETS`); storage (2096–2186: `SK`, `IDB_*`, `snapshotJSON`, `applySnapshot`, `idbOpen`, `idbRun`, `readStoredJSON`, `loadDB`, `saveDB`, `saveDBSoon`, `storeFail/Ok`, `clearAllData`); seeding and every migration (2187–2559); `Bus` (2588–2645); profile lists, forms, sheets and every `innerHTML` site (whole file); import (4461–4603: `IMPORT_FIELDS`, `sanitiseRecord`, `planImport`, `remapRefs`, `applyImport`, `importData`, `finishImport`, review sheet); unit inputs (6481–6568); sharing and QR (6856–6957); Drive connector (6972–7204); `boot` (7205–7243); `sw.js`; `manifest.json`.
- Tests run green at d82fd52: storagetest 22/0, importtest 28/0, sharetest 24/0, unittest 18/0, coursetest 22/0, drivetest 38/0, swtest 6/0 (bcmigtest 11/0 and pressuretest 12/0 in segment 1).

**Not reviewed**
- The Lab app (SEN-Testing) and its reader of Main's store — only Main's side of the contract was checked.
- Real Google sign-in and Drive (only the code and the simulated drivetest); real browser service-worker behaviour (code reading only — no Chromium SW run); real camera QR scanning.
- The two bundled libraries (qrcode-generator 2.0.4, jsQR 1.4.0) were not audited; only how their input and output are used.
- Device drivers, layouts, Bench, course runner internals (other segments), except where they render stored strings.

---

## B. Open questions for the owner

1. **Have you trued any BC since V1.24.2 (23 Oct 2026)?** D-01 multiplies every BC trued in the app by π/4 at the next app start. If you have, those profiles on the Honor are now wrong (Queen 0.119 → 0.0935). The repair migration in D-01 can undo it by the date in the truing stamp — but a BC trued *on* 23 Oct is ambiguous (before or after the update that day). Please say whether any were trued that day.
2. **Share links: import straight away, or always ask?** CORE-02 says a link opens the app "with the import offered". Today new items are added without asking (only clashes get the review sheet). I recommend: always show the review sheet for links, QR and pasted codes (D-04).
3. **"Take theirs" for preferences:** should a file from someone else be able to change your Home layouts, bottom bar, stations, latitude and so on, or only units and display settings? Your own backup restore needs the full set. I recommend: full set from your own backups, units + display only from anything else — but that needs a way to tell them apart (an `exportedBy` install id). Simplest minimal option: keep today's behaviour and only validate every key (D-05).
4. **Two windows:** do you ever have SEN open in two places on the same device (installed app + a browser tab, or two desktop tabs)? If never, D-09 can wait.
5. **Lab app:** both apps share one origin, so a script injection in either one can read and change both apps' data. Is the Lab ever used to open data from other people? If yes, the Lab needs the same output-escaping review.

---

## C. Findings

| ID | Sev | Confidence | Location | Evidence | Impact |
|---|---|---|---|---|---|
| D-01 | S1 | Reproduced | `migrateTruedBC` 2504–2515 (runs every boot, 7206); `tuApply` 4278–4286, `tdApply` 4374–4381 | Truing never sets `bcConv`, so the V1.24.2 one-off conversion runs again on every newly trued BC. Queen trued G7 0.119 → after one restart **0.0935** (×π/4), `bcConv` "V1.24.2 ×π/4". Home at 200 m: 11.97 → 12.36 mrad. Banded 0.120 / 0.110 → 0.0942 / 0.0864. A trued G1 would be set to 0 ("re-true needed"). | Every BC trued since V1.24.2 is silently cut by 21.5 % at the next start. Silent dope change on the owner's measured data. |
| D-02 | S1 | Reproduced | Record ids in HTML attributes and inline handlers: `sItem` 2712–2713, `projSheetList` 2727, select builders 3178–3182, `refreshDopeSel` 3660, `loadDope` 3675–3678, `renderStages`/`distRow`/`distDetail` 3711–3747, `pitem` 3893–3895, `tuInit` 4218, form save buttons 4037/4103/4167/4399/4433 | The importer accepts any string ≤ 2000 chars as an `id` (`IMPORT_CHECK.s`). Payload `id: x"><img src=x onerror="…">` in a shared projectile lands as live markup in the Profiles list and the projectile sheet; `id: x',window.__p('id'),'` executes from the sheet, form and dope-card handlers (handler fired in jsdom). `esc()` would not help inside `onclick="f('…')"` — the HTML parser decodes `&#39;` back to `'` before the JS runs. | Stored script injection from any imported file, Drive restore or share code. Script runs with full access to the store, the Lab's store (same origin) and the in-memory Drive token. |
| D-03 | S1 | Reproduced | `fldHtml` 3976 (`value="${val}"`); home reticle caption 2927 (`reticle.fp`); Holds flag 3033 (`tr.projName`) | Unescaped text fields: every profile form (rifle name/notes/reg1/reg2/dwell/downClicks, projectile name/mfg/notes, scope name/sku/source, reticle name, weather name/notes) becomes live markup when Edit is opened; `reticle.fp` is live on Home as soon as that scope is in use; a BC-pending projectile's name is live on the Holds page. | Same as D-02, through names rather than ids. The fp case runs without any tap once the shared rifle + scope + reticle is selected. |
| D-04 | S2 | Reproduced | `importFromLink` 6953–6957, `importData` 4566–4567 | Opening `…/index.html#import=SEN1:…` (249-char link with one projectile) imports it immediately: alert "1 new", no review sheet. Opening Profiles afterwards puts the payload's `<img onerror>` in the DOM. | One tap on a link turns D-02/D-03 into a one-click attack and adds data without consent (CORE-02 says "the import offered"). |
| D-05 | S1 | Reproduced | `applyImport` 4557 (`UNITS={...UNITS,...p.units}`, `APP={...APP,...p.app2}`); `applySnapshot` 2120 | Import file `{units:{range:'parsec'}}` → review sheet → "Take theirs" → `finishImport` saves, then throws `QDEF[q].to[u] is not a function`. **Next start: "SEN boot failed", Home "—".** Settings (factory reset) is unreachable; only clearing site data recovers. `app2` values are not type-checked either. | A shared file plus one tap bricks the app permanently, offline at the range. |
| D-06 | S1 | Reproduced | `IMPORT_FIELDS` / `IMPORT_CHECK.n` 4470–4489, `IMPORT_REQUIRED` 4480 | Numbers are only checked for finiteness, enums not at all, while the forms (`saveRifle`, `saveWx`, `saveProj`, `saveScope`) refuse the same values. Queen at 100 m, default air: rifle `zPres 0` → **3.67 mrad** (vs 3.59, negative zero-air density); weather `rh 900` → 3.56 mrad; scope `click 1e-9` + rifle `twist 0.001` → Home "↑3567728472" clicks, no Sg penalty. `type:'banana'` accepted; a reticle with 200 000 hashes accepted. | A shared or restored profile can silently change dope or produce absurd clicks with no warning. |
| D-07 | S2 | Reproduced | `sanitiseRecord` / `importData` — no version-aware migration | An export from V1.24.1 with a trued G7 0.163 (= 0.128 under today's engine) imports as maker BC **0.163**, `bcTrued` dropped, so neither the ×π/4 migration nor the trued state applies. `schema` versions are unchanged since then, so the importer can't tell. CORE-01: "old exports are migrated automatically on import". | Restoring a pre-23-Oct export gives a BC 27 % too high plus the stability penalty on top. Few such files exist (owner to confirm). |
| D-08 | S2 | Reproduced | `readStoredJSON` 2128–2137, `saveDB` 2144–2148 | The localStorage copy made at the V1.18.0 migration is never refreshed. When `indexedDB.open` fails at one boot (simulated transient error), the app silently loads that old copy (rifles shown: only "OLD RIFLE FROM 2025"), shows no warning, and saves edits to localStorage; at the next good boot IDB wins and those edits are lost. | Months-old profiles shown as current with no warning; work done in that session disappears. |
| D-09 | S2 | Reproduced | `saveDB` whole-snapshot `put` | Two windows on one store: window A adds a rifle and saves, window B adds a weather and saves → next start has B's weather, **A's rifle is gone**. No BroadcastChannel, lock or revision check. | Silent data loss whenever two windows are open (installed app + browser tab). |
| D-10 | S2 | Reproduced | `loadDB` 2138–2143, `storeOk` 2150, seeding `saveDB` calls | A truncated stored snapshot fails to parse; `storeFail` is called, but the first seeding `saveDB()` calls `storeOk()`, which clears the warning (shown text ""). The seeded defaults then overwrite the unreadable copy: after that session, "MY RIFLE" is gone and nothing of the original is kept. | Silent total loss when the stored copy is ever unreadable. The trigger is rare (IDB puts are atomic), so S2, not S1. |
| D-11 | S2 | Likely | `sw.js` fetch handler, HTML branch | Network-first stores any response (`res.ok` never checked). A GitHub Pages 404/5xx during a deploy or outage replaces the cached app; the next offline launch serves the error page. | App unusable offline at the range after a bad fetch. |
| D-12 | S2 | Likely | `sw.js` HTML branch | Network-first has no timeout. With a weak signal that neither works nor fails ("lie-fi"), the launch waits for the browser's own network timeout before falling back to the cache. | Slow or hanging start in the field. |
| D-13 | S3 | Likely | `sw.js` install `cache.addAll(CORE)` | `addAll` uses the HTTP cache. GitHub Pages serves `max-age=600`, so a launch shortly after a deploy can store the previous `index.html` under the new cache name. | Up to ~10 min after a release, the offline copy can be the old build under the new version's cache. |
| D-14 | S3 | Reproduced | `planImport` 4520–4529 | Two records with the same id in one file are both "new": DB ends up with two projectiles with id "dup" (Dup A, Dup B). `find()` then returns only the first; edit/delete act on the wrong one. | Ambiguous references, and a delete can remove the wrong record. |
| D-15 | S3 | Reproduced | `remapRefs` 4537–4542, `idMap` plain objects | Dope card `rifleId:'__proto__'`, `projId:'constructor'`, `cwxId:'toString'` → stored as object / function / function. No prototype pollution (checked), but broken references persist. | Corrupt records from a crafted file; fixed for free by the id whitelist in D-02. |
| D-16 | S3 | Reproduced | `decodeShare` 6891–6899, `streamBytes` 6879–6884 | No size cap on the code or the inflated output: a 64 821-char code inflates to 50 MB. `nums` arrays are unbounded (200 000 reticle hashes accepted). | Tab freeze or memory exhaustion from a pasted code or link; reticle drawing loops over huge arrays. |
| D-17 | S3 | Reproduced | `seedProjectileCatalog` 2222–2342, `seedVectorScopes` 2360–2389 (every boot) | Delete a catalog projectile and a catalog scope → 106 → 105 projectiles, 23 → 22 scopes → after restart 106 / 23 again. | Deleted items keep coming back. |
| D-18 | S3 | Likely | `migrateZeroFields` 2459–2462 then `migratePressureType` 2451 | Legacy rifles without zero fields copy `zw.pres` from the zero weather without its type; the next migration marks them sea level at 300 m. If that zero weather was a station profile, the pressure is converted twice (−35 hPa, ≈ 3.5 % density). | Narrow (pre-V1.9 data with a custom zero weather), but a silent zero-air change. |
| D-19 | S3 | Likely | `loadDB` 2138–2143 | The "newer schema" guard exists only on import. Rolling back to an older release (the stated rollback path) loads newer data without a warning; older migrations then run on it. | Rollback can misread data. |
| D-20 | S3 | Likely | `driveFlush` 7076–7087, `driveDir` 7061–7068 | If an upload succeeds but the response is lost, the item stays queued and is sent again → duplicate file. Every upload also makes two folder-check GETs. A restore listing and a flush running together can each create the root folder (Suspected). | Duplicate backups in Drive; extra requests. Nothing lost. |
| D-21 | S4 | Likely | `<head>` | No Content-Security-Policy. Inline handlers everywhere mean `script-src` needs `'unsafe-inline'`, so a CSP can't stop injected handlers, but `connect-src`/`img-src`/`base-uri`/`object-src` would limit what an injected script can send out. | Defence in depth only. |
| D-22 | S4 | Likely | `sw.js` font branch | Google Fonts are cached in the versioned cache, so every release deletes them; offline right after an update the app falls back to system fonts. | Cosmetic. |

**Verified, no finding**
- Storage namespace: Main touches only `sen_platform_v1` (localStorage), IDB `sen_main`/`kv` (`db`, `driveq`) and caches `sen-ballistics-*` / legacy `sen-calc-*` — matches A-03 / CORE-09. `swtest` confirms the Lab's caches survive.
- Units (CORE-15): canonical strings are kept until the user edits; `valueAsNumber` and other bypasses are not used; dynamically created inputs are unitized by the observer; `S.cp` is shown rounded but stored exact. No write-back drift found. The only unit failure is D-05.
- Prototype pollution: `sanitiseRecord` copies only whitelisted keys and spreads use define-semantics; `Object.assign(S,d.session)` reads only the app's own snapshot, never import data.
- Drive: token in memory only, never exported; scopes `drive.file openid email`; `appForExport()` and `driveRestore` strip `APP.drive`; Drive queries escape quotes; restore goes through `importData` (so it inherits D-02…D-07).
- No `eval`, `new Function`, `insertAdjacentHTML`, `outerHTML`, `document.write` or data-driven `href`/`src`. Blob URLs and `download` names are safe.
- Seed migrations `migrateWeatherSeeds`, `migrateReticlesAndMag`, `migrateScopes`, `migrateMillerC` are idempotent.

---

## D. Fix guidelines for Opus

General: minimal change, no unrelated refactors; each fix ships with its test in the same commit. **D-01 must ship first and before segment-1 P-02** (which whitelists `bcTrued`/`bcConv` on import): otherwise every imported trued BC is converted again at the next start.

**D-01 — trued BCs converted at every restart** · patch · migration needed
- Scope: (1) in `tuApply` and `tdApply`, set `p.bcConv='native'` whenever `p.bcTrued` is written. (2) A one-off repair, run once before `migrateTruedBC` in `boot` and guarded by its own flag (`APP.bcRepair1`): for projectiles with `bcConv==='V1.24.2 ×π/4'` and a `bcTrued` date **after 2026-10-23**, divide `bcg7` and every G7 band `bc` by π/4 (round to 4 dp, the same rounding the migration used), set `bcConv='native'` and append a note. G1 records with `bcConv==='V1.24.2 re-true'` and a later date: restore `bcg1` from the number in the note the migration wrote, then the same. Records dated exactly 2026-10-23: leave as they are and add a note asking for a check (owner question B-1).
- Test (storagetest or truedroptest, with fake-indexeddb and a restart): drops-true 0.119 → restart → still 0.119; banded 0.120/0.110 → restart → unchanged; a record stamped `drops·g7·2026-11-01` already at 0.0935 with the bad `bcConv` → repaired to 0.1190 once and not again; one stamped `single·g7·2026-10-20` (genuine pre-fix) → untouched; `bcmigtest` must stay green.
- Risk: medium (touches stored data). Run `bcmigtest`, `storagetest`, `truedroptest`, `formulatest`.

**D-02 — ids as an injection channel** · patch · migration needed
- Scope: (1) one id rule, `const ID_RE=/^[A-Za-z0-9_-]{1,40}$/` (every `uid()` id, built-in reticle ids and `'r'+uid()` match; `'@zero'` is virtual and never imported). In `sanitiseRecord`, a record whose `id` fails gets a fresh `uid()`; ref fields (`scopeId`, `reticleId`, `rifleId`, `projId`, `cwxId`) that fail become `null`/`''`; stage and target ids that fail get fresh `uid()`s; `stnClean` gets the same rule. (2) Record the original → new id in `idMap` when re-iding, so `remapRefs` still links records from the same file. (3) At load (`applySnapshot`), run the same check once over stored data (D-02 may already have put bad ids in a store), guarded by a flag. (4) Belt and braces: `esc()` every id that goes into an attribute value (`value="…"`, `data-*="…"`, `id="…"`). Do not rely on `esc()` inside `onclick="f('…')"` — the whitelist is what makes those safe.
- Test (importtest): the three payload modes from this review — HTML (`x"'><i data-xss="k"></i>`), attribute (`x" data-xss="k`) and handler (`x',window.__p('k'),'`) — in every id and ref of every record type; after rendering Profiles, every sheet, every form, Dope cards (stage + target rows), Truing and the Trajectory selects, `document.querySelectorAll('[data-xss]').length===0` and no handler-marker fires when every inline handler is invoked. A normal export/import round trip keeps all ids.
- Risk: medium (refs between records). Run `importtest`, `sharetest`, `coursetest`, `stationtest`, `benchtest`, `drivetest`.

**D-03 — unescaped text fields** · patch
- Scope: `fldHtml`: `value="${esc(val??'')}"`. Home reticle caption: `esc(reticle.fp)`. Holds flag: `esc(tr.projName)`. No other change.
- Test: the HTML payload in every string field of every type (the list in this review's harness) → zero `[data-xss]` after opening each form, Home with that scope active, and Holds with a BC-pending projectile; editing and saving a form with `<b>` in the name stores the literal text.
- Risk: low.

**D-04 — link import without review** ⚖ (B-2) · patch
- Scope: in `importData`, take a second argument `{review:true}` from `receiveShare` (link, QR and paste) and show `renderImportReview` whenever it is set, even with only new items — the sheet already lists "N new item(s) will be added" and has Cancel. File import and Drive restore keep today's flow unless the owner asks otherwise.
- Test (sharetest): opening `#import=<code>` opens the review sheet and adds nothing until Import is tapped; Cancel adds nothing.
- Risk: low; `sharetest` expectations change (say so in the patch log).

**D-05 — preferences from a file brick the app** · patch
- Scope: one validator used in both `applyImport` (Take theirs) and `applySnapshot` (load): for each `UNITS[k]` keep it only if `QDEF[k]` exists and `QDEF[k].opts` has that key; `SUNITS[k]` only if `'off'` or a key of `opts`; unknown `k` dropped. For `app2`, apply only keys that already exist in `APP`'s defaults and whose `typeof` matches the default's (objects only for keys that have their own cleaner at use: `theme`, `chronoStr`, layouts — check each). Running it in `applySnapshot` also recovers installs already bricked by D-05.
- Test (importtest + storagetest restart): `{units:{range:'parsec',vel:'__proto__'},sunits:{range:'yd2'},app2:{windAvgS:'x',lat:'north',fontScale:'huge'}}` → Take theirs → no exception, units unchanged, next start boots; a store already holding `UNITS.range='parsec'` boots with `m`.
- Risk: low.

**D-06 — numbers and enums from imports are not range-checked** · patch
- Scope: an `IMPORT_RANGE` table next to `IMPORT_FIELDS` holding the same limits the forms use (`saveRifle`, `saveProj`, `saveScope`, `saveReticle`, `saveWx`, the stage/target editors), e.g. rifles `twist (0,1524]` mm, `sight (0,200]`, `mv (0,600]`, `zero (0,2000]`, `zTemp [-60,60]`, `zPres (0,1100]`, `zRH [0,100]`, `zAlt [-500,9000]`; weathers `temp [-60,60]`, `pres (0,1100]`, `rh [0,100]`; scopes `click > 0`. Out-of-range values **reject the record with the reason** (no clamping — a clamp is a silent dope change). Enums: `type ∈ {slug,pellet}`, `twistDir ∈ {right,left,smooth}`, `adjUnit`/`railUnit ∈ {mil,moa}`, `presType`/`zPresType ∈ {sea,station}`, `fp ∈ {FFP,SFP}`, `renderer ∈ {vct34}` or absent — invalid → reject. `nums` arrays ≤ 64 entries, each in [0, 100]. Optional (justified by DRY): let the forms read the same table later; not part of this patch.
- Test (importtest): each payload from C/D-06 is listed under "Not imported (invalid)" with its reason; a normal export/import round trip of every seeded profile passes unchanged.
- Risk: medium — an over-tight limit would reject the owner's own backups. Run the round trip on a real export from the Honor before shipping (owner to-do).

**D-07 — old exports not migrated** · patch (with segment-1 P-02 and after D-01)
- Scope: whitelist `bcTrued` and `bcConv` (and `bcBands`, per P-02). If an imported record has `bcTrued` and no `bcConv`, and the file's `app` string is below `V1.24.2` (parse `SEN Ballistics V(\d+)\.(\d+)\.(\d+)`), apply the same conversion `migrateTruedBC` applies; if the version is ≥ V1.24.2 or the file has no `app` field, set `bcConv='native'`. Optional: bump `SCHEMA.projectiles` to 2 at the same time so future engine changes can be recognised by schema rather than by version string.
- Test: the D-07 payload (V1.24.1, trued G7 0.163) imports as 0.128 trued; the same record from a V2.16.0 export imports unchanged; neither changes at the next restart.
- Risk: medium (interplay with D-01 and P-02 — ship together, one release).

**D-08 — stale localStorage fallback** · patch
- Scope: (1) retry `idbOpen()` once after ~300 ms before falling back. (2) After the localStorage → IDB migration verifies, write a marker key in Main's namespace (`sen_platform_migrated`, ISO date). (3) When the fallback path finds that marker, show the store warning ("Storage could not be opened — showing an old copy from <date>; changes are not saved") and make `saveDB` refuse to write until the next successful IDB open. The localStorage copy itself stays (rollback safety, Lab fallback reader).
- Test (storagetest): the scenario from C (IDB throws on the second boot) → warning shown, no write to localStorage; next good boot shows the current data.
- Risk: low; check the Lab's fallback reader against the new key (CORE-09 contract allows `sen_platform_*`).

**D-09 — two windows, last writer wins** ⚖ (B-4) · minor
- Scope: a revision counter in the snapshot (`rev`), plus the window's own last-seen `rev`. `saveDB` reads and writes in one readwrite transaction: if the stored `rev` is not the one this window loaded, don't write; show "SEN was changed in another window — reload" with a Reload button. Optionally announce saves on a `BroadcastChannel('sen_main')` so other windows show the banner at once. The Lab only reads, so it is unaffected (it must ignore the new `rev` key — check its "unknown keys" guard).
- Test (storagetest): the two-window scenario from C → window A's save after B's is refused with the banner; after reload both changes are present when re-applied.
- Risk: medium (save path). Run `storagetest`, `drivetest` (shares the store), Lab `maindatatest`.

**D-10 — unreadable snapshot overwritten** · patch
- Scope: in `loadDB`, on parse failure copy the raw text to a new key (`db-unreadable-<timestamp>` in the same store) before anything else, and keep a separate `loadError` that `storeOk()` does not clear; show it until the user dismisses it, with the hint that the copy was kept.
- Test (storagetest): the truncated-snapshot scenario → warning stays after seeding; the raw copy exists; boot still works.
- Risk: low.

**D-11 / D-12 / D-13 — service worker** · patch
- Scope (`sw.js` only): cache an HTML response only if `res.ok`; race the navigation fetch with a 3 s timer and serve the cached copy if the timer wins (let the fetch finish in the background and update the cache); in `install`, use `c.addAll(CORE.map(u=>new Request(u,{cache:'reload'})))`.
- Test (swtest, extend the simulated CacheStorage/fetch): a 404 response is returned to the page but not cached; a fetch that never settles returns the cached index.html after 3 s; install requests carry `cache:'reload'`.
- Risk: low; bump `CACHE` per §21.6 as always.

**D-14 / D-15 — duplicate ids and `__proto__` refs** · patch
- Scope: in `planImport`, keep a per-type `Set` of incoming ids; a repeat gets a fresh `uid()` (kind "new", name made unique with `cloneName`). Make each `idMap[type]` a `Map` (or `Object.create(null)`) and look up with `has()`. Both become redundant with the D-02 id rule but cost two lines.
- Test (importtest): the D-14 and D-15 payloads → two distinct ids; refs `null`.
- Risk: low.

**D-16 — size caps** · patch
- Scope: `decodeShare`: refuse text longer than 64 kB before decoding; in `streamBytes` (decode use only) stop reading past 1 MB and throw "too large". `IMPORT_CHECK.nums`: arrays ≤ 64 (with D-06). File import: refuse files over 10 MB before `JSON.parse`.
- Test: the 50 MB bomb code is refused with a message within a second; a normal rifle + scope + reticle share still decodes.
- Risk: low.

**D-17 — deleted catalog items reappear** · patch
- Scope: seed the projectile catalog and the Vector scope catalog once per catalog version: `APP.seeded={proj:1,scopes:1}`; skip when the stored version is equal or higher. On the first boot after the fix, existing installs get the flag set without re-adding anything. A future catalog change bumps the number.
- Test (storagetest restart): delete one catalog projectile and one catalog scope → restart → still deleted; a fresh install still gets the full catalog.
- Risk: low.

**D-18 — legacy zero pressure converted twice** · patch
- Scope: in `migrateZeroFields`, when copying from the zero weather, also copy its kind: `r.zPresType=zw&&zw.presType==='sea'?'sea':'station'; r.zAlt=zw&&zw.alt>=0?zw.alt:300;` (with no weather, keep today's 1010 + sea level at 300 m).
- Test (pressuretest): a legacy rifle with no zero fields and a station-type zero weather at 975 hPa → zero pressure stays 975 station.
- Risk: low.

**D-19 — no schema guard at load** · patch, optional
- Scope: in `loadDB`, if `schemaNewerThanApp(parsed)` is non-empty, show the store warning and do not save (read-only session) until the user installs the newer version. Optional because rollbacks are rare and the data is usually kept whole; it protects the "repo history is the rollback path" rule.
- Test (storagetest): a snapshot with `schema.dopeCards: 9` → warning, no write.

**D-20 — Drive duplicates and extra requests** · patch, low priority
- Scope: give each queued item a stable `appProperties.senId = it.id` in the upload metadata; before re-sending an item after a failure, query `appProperties has { key='senId' and value='<id>' }` and drop the item if it already exists. Check the root/sub-folder ids once per flush, not per item.
- Test (drivetest): simulated "upload accepted, response dropped" → one file in the simulated Drive after the retry; three queued files → folder checks run once.
- Risk: low.

**D-21 — CSP** · optional
- Justification: limits what an injected script can send out if a future escaping bug slips through. Add a `<meta http-equiv="Content-Security-Policy">` with `default-src 'self'; script-src 'self' 'unsafe-inline' https://accounts.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self' https://www.googleapis.com https://accounts.google.com https://oauth2.googleapis.com; img-src 'self' data: blob:; frame-src https://accounts.google.com; object-src 'none'; base-uri 'none'; form-action 'none'`. GIS's exact requirements must be checked against Google's documentation and on the device before shipping; a wrong policy breaks Drive sign-in. Run `drivetest`, `rendertest` and an on-device Drive check.

**D-22 — fonts cache** · optional
- Keep fonts in a separate `sen-ballistics-fonts` cache and exclude that name in `OWN_CACHE` cleanup. Cosmetic only.

### Test gaps

No test today covers:
- A restart after truing (D-01) — the truing tests never reload.
- Rendering of imported strings and ids across all screens (D-02, D-03): `importtest` "escaping" covers names in the review sheet only.
- Opening a share link with only new items (D-04).
- "Take theirs" with invalid unit or app values, and a boot with such values stored (D-05).
- Numeric ranges and enums on import (D-06); version-aware import of old exports (D-07).
- IDB failure after a successful migration (D-08: today's "fallback" test has no IDB at all); two windows (D-09); an unreadable snapshot followed by seeding (D-10).
- Service worker fetch strategy: `swtest` covers cache deletion only (D-11…D-13).
- Duplicate ids and prototype-named refs in one file (D-14, D-15); oversized codes and arrays (D-16).
- Seeds after a delete and restart (D-17); `migrateZeroFields` with a station zero weather (D-18).
- Drive: lost response after a successful upload (D-20).

The jsdom harnesses used for this review (`xss.js`, `link.js`, `store.js`, `imp.js`, `dpers.js`, `respawn.js`) can be handed to Opus as starting points for these tests.

---

## E. innerHTML classification

73 occurrences of `innerHTML` in `index.html` (on 70 lines). Verdicts: **Clear** (`=''`), **Static** (literal markup only), **Safe** (only numbers, booleans, static labels, unit labels from `QDEF`, or values passed through `esc()`/a validator), **Carrier** (generic helper — verdict depends on callers, listed separately), **SINK** (user-, import- or share-controlled text reaches HTML unescaped). Replacements for every SINK are the D-02/D-03 fixes; switching a site to `createElement`/`textContent` is optional and only worth it where the site is rewritten anyway.

| Line | Context | Verdict | Replacement |
|---|---|---|---|
| 1704 | comment | n/a | — |
| 2012 | `renderSettings` page | Safe — APP booleans, QDEF labels, theme colours through `themeClean`/`hexOk` (but crashes on bad UNITS → D-05) | D-05 validator |
| 2669 | session chips (actbar) | Safe — value `esc()`, kind static | — |
| 2705 | `openSheet(html)` | Carrier | callers below |
| 2706 | `closeSheet` | Clear | — |
| 2727 | projectile sheet list (`sItem`) | **SINK** — `x.id` in `onclick="sheetPick('proj','…')"` | D-02 |
| 2742 (via 2705) | rifle sheet (`sItem`) | **SINK** — rifle id in onclick | D-02 |
| 2753 (via 2705) | weather sheet (`sItem`) | **SINK** — weather id in onclick | D-02 |
| 2709, 2748, 2756, 2760, 5388, 5488, 5503, 5669, 5743, 5820, 7153 (via 2705) | More, projectile header, distance/MV sheets, layout/angle/session/wind/Drive sheets | Safe — static heading or numbers; content added with DOM APIs | — |
| 2918 | rail note | Safe — numbers, static labels | — |
| 2926 | reticle SVG (`drawReticle`) | Safe — numeric reticle fields only (array size → D-16) | D-16 |
| 2927 | reticle caption | **SINK** — `reticle.fp` | D-03 |
| 3033 (×2) | Holds: clear + flag | Clear / **SINK** — `tr.projName` | D-03 |
| 3050 | Holds rows | Safe — numbers, hash values | — |
| 3052 | Holds flags | Static | — |
| 3062 | printable Holds | Safe — names `esc()` | — |
| 3163 | zero conditions line (Trajectory) | Safe — numbers | — |
| 3171 | comment | n/a | — |
| 3180 | rifle select | **SINK** — `option value="${x.id}"` | D-02 |
| 3181 | projectile select | **SINK** — same | D-02 |
| 3182 | weather select | **SINK** — same | D-02 |
| 3310 | Trajectory no-solution card | Safe — `esc(trajReason)` | — |
| 3311, 3312 | Trajectory flags / table | Clear | — |
| 3332, 3342, 3344 | Trajectory cards, flags, table | Safe — numbers, static flags | — |
| 3391 | BC tab empty state | Static | — |
| 3395, 3407, 3409 | BC cards, flags, benchmark table | Safe — numbers | — |
| 3444, 3450, 3451 | Stability "not computed" | Safe / Static | — |
| 3459, 3470, 3472 | Stability cards, flags, twist table | Safe — numbers | — |
| 3521 | Wind mode note | Static | — |
| 3545 (×2) | Wind no-solution / table clear | Safe (`esc`) / Clear | — |
| 3560, 3565 | Wind cards, table | Safe — numbers | — |
| 3583 (×2) | Solver no-solution / flags clear | Safe (`esc`) / Clear | — |
| 3597 | Solver out of range | Static | — |
| 3621, 3635, 3653 | Solver cards, travel note, flags | Safe — numbers, `esc(aj.why)` | — |
| 3660 | dope card select | **SINK** — `c.id` in value | D-02 |
| 3676, 3677, 3678 | dope card rifle/projectile/weather selects (`ro`) | **SINK** — ids in value | D-02 |
| 3692, 3694 | dope card zero line | Static / Safe — numbers | — |
| 3711 | dope card stages | **SINK** — stage and target ids in `id=` and `onclick/onchange`; names and labels are `esc()` | D-02 |
| 3811 | printable dope card | Safe — `dopePrintHTML` escapes names, labels, notes | — |
| 3905, 3909, 3911, 3913 | Profiles: rifles, weather, scopes, reticles (`pitem`) | **SINK** — ids in `data-f/e/c/sh/d="…"`; name and meta are `esc()` | D-02 |
| 3924, 3928 | calibre / maker filters | Safe — `esc()` | — |
| 3945 | calibre toggle | Safe — `esc(rifleCal)` | — |
| 3954 | Profiles: projectiles (`pitem`) | **SINK** — ids in data attributes | D-02 |
| 3977 | `openModal(html)` | Carrier | callers below |
| 3988, 4092, 4159, 4385, 4429 (via 3977) | rifle, scope, reticle, projectile, weather forms | **SINK** — `fldHtml` values unescaped; id in `saveX('…')` | D-03 + D-02 |
| 4594 (via 3977) | import review | Safe — names, diffs and rejects `esc()`; choice keys static (ids in `<option value>` of the scope picker are `esc()`) | — |
| 6908, 6927 (via 3977) | share / receive modals | Safe — `esc(name)`, QR SVG generated locally | — |
| 4049 | rifle form travel note | Safe — `esc(sc.name)`, numbers | — |
| 4114 | scope form click note | Safe — numbers | — |
| 4187 | MV–temp table clear | Clear | — |
| 4188, 4190, 4198 | MV–temp note, rows, fit | Safe — `esc(r.name)`, numbers | — |
| 4218 | Truing projectile select | **SINK** — `p.id` in value | D-02 |
| 4230 | Truing points | Safe — the user's own typed numbers (number inputs) | — |
| 4270 | Truing result | Safe — numbers, static flags | — |
| 5050 | chrono flags | Safe — numbers | — |

Totals over the 73 direct occurrences: 2 comments, 7 clears, 2 carriers, 45 safe or static, **17 sinks** (2727, 2927, 3033, 3180, 3181, 3182, 3660, 3676, 3677, 3678, 3711, 3905, 3909, 3911, 3913, 3954, 4218). Through the two carriers, 7 more call sites are sinks (rifle and weather sheets at 2742 and 2753; the five profile forms). All 24 are closed by D-02 + D-03.

---

## F. Suggested release grouping and order

| Order | Release | Items | Why together |
|---|---|---|---|
| 1 | V2.16.1 (patch) | **D-01** (+ repair) | Silent change to measured BCs on every restart; one small fix, one migration. Ship alone and ask the owner to check trued profiles on the Honor afterwards. |
| 2 | V2.16.2 (patch) | **D-02, D-03, D-04, D-05, D-14, D-15** | Injection and bricking from imported data: id rule, escaping, review for links, preference validation. One import/rendering test campaign. |
| 3 | V2.16.3 (patch) | **D-06, D-07, D-16** + segment-1 **P-01, P-02, P-05, P-07** | All import-content rules (ranges, enums, sizes, old exports, trued state) in one schema touch; P-02 depends on D-01 and D-07. |
| 4 | V2.16.4 (patch) | **D-08, D-10, D-11, D-12, D-13, D-17, D-18** | Storage robustness and the service worker. |
| 5 | V2.17.0 (minor) | **D-09** (after B-4), **D-19** | New coordination behaviour between windows; touches the save path and the Lab reader. |
| 6 | later | D-20, D-21, D-22 | Low impact; D-21 needs an on-device Drive check. |

Segment-1 V2.16.1 (P-01, P-02, P-05, P-07) should be merged into slot 3 above so the trued-BC fixes land after D-01 — the release numbers in the segment-1 plan move accordingly. I'll reconcile both plans into one release sequence when all five segments are reviewed.

---

## G. Owner rulings (2026-11-17)

| Question | Ruling | Effect on the plan |
|---|---|---|
| B-1 BCs trued since 23 Oct | None | D-01: the fix (set `bcConv` when truing) stays; the repair migration is dropped (YAGNI — no affected data exists). Test keeps the restart check only. |
| B-2 Link / QR / paste imports | Always show the review sheet | D-04 confirmed as written. |
| B-3 "Take theirs" scope | Layouts too, but the user picks which parts to import | D-05 grows: the review sheet lists the preference groups (units, display, colours, Home layouts, bottom bar, other settings) with a checkbox each, default off; only ticked groups are applied, each through the D-05 validator. This is a feature change → minor release and a Feature Register entry. |
| B-4 Two windows | Not used, but fix it if it can happen | D-09 confirmed (minor). |
| B-5 Lab with other people's data | Not yet; maybe later | Lab escaping review deferred; note it as a precondition before the Lab ever opens shared data. |
