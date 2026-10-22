# SEN Ballistics — Patch Log

Standing rule (from V1.12.5): every release ships with this file updated in the same commit.
Format: version — type — one-line summary, then Problem / Fix / Files / Verify.
Newest entry on top. Deploy set per release: `RTI-SEN-Ballistic-Calculator-V{x}.html` + `index.html` (byte-identical) + `sw.js` (CACHE bumped).
Since 2026-10-22 this file lives in the repo root and is the project's single changelog (register decision A-09). Regression tests live in `tests/` (see `tests/README.md`).

---

## V1.17.2 — patch — New PWA id + repo link for the SprukK move

*Entry reconstructed on 2026-10-22 from the 18 Oct release session and commit `785734e`; no patch-log entry was written at release time.*

**Problem.** After the main repo moved from `lnQNtrol/SEN-Balistic-Calcutalor` to `SprukK/SEN-Balistic-Calculator`, Chrome on Android reported the app as "already installed" and refused to install it from the new address, because the new deployment carried the same manifest `id` as the old one.

**Fix.** `manifest.json` `id` changed from `/sen-ballistics/` to `/sen-ballistics-sprukk/`, so Android treats the new deployment as a separate app. `sw.js` CACHE bumped so the stale cached manifest is dropped. Settings footer repo link updated to the new repo. No physics or logic change.

**Files:** `index.html` — 6 live version strings and the Settings repo link (the 2 remaining `V1.17.1` hits are historical fix comments, left intentionally). `manifest.json` — `id`. `sw.js` CACHE → `sen-ballistics-v1.17.2`.
**Verify:** `node --check` on the app script and `sw.js` clean · `manifest.json` parses · `index.html` byte-identical to `RTI-SEN-Ballistic-Calculator-V1.17.2.html` · live `manifest.json` on `sprukk.github.io` confirmed serving the new id. Regression re-run on 2026-10-22 with the recovered suite: 20/20 anchors, `domtest.js` 14/14.
**Known issue (device-side, open):** on the owner's phone the install still did not land in the app drawer ("cannot open the app"); diagnosis pointed at Android/launcher link handling, not the web app. "Create shortcut" works as a functional workaround.

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
