# SEN Ballistic Calculator — App Shell Review (navigation, layouts, panes, CSS, accessibility) (V2.16.0)

Review only. No app code was changed. Implementation target: Claude Opus 5.5, under PROJECT_INSTRUCTIONS_V8 §21.2–21.4 (minimal change; domtest / layouttest / rendertest; real Chromium at 412 and 780 px).

Confidence: **Reproduced** = shown in jsdom or in real headless Chromium (Playwright) at the stated viewport; **Likely** = clear from code reading; **Suspected** = needs the real phone.

---

## A. Scope

**Commit:** `d82fd522` (V2.16.0), `index.html`.

**Read**
- Project knowledge: PROJECT_INSTRUCTIONS_V8 (§0 CORE-16, §7 phone, §21.2–21.4), SEN-Calculator-Architecture-Layouts-Planning (§6 template, §8 checklist), clean-code-rules.md. The frontend-design skill was not re-read for this review — its guidance is aesthetic, and this review is about behaviour.
- Code: CSS (13–515); static markup (516–1212); act bar, bottom nav and sheets (2664–2846); `gotoPage` (3184–3216); Home modules (`normMods`, `normLayout`, `initLayouts`, `applyHomeLayout`, 5332–5443); `senGesture` (5400–5435); back button (`backArm`, `onBack`, `backInit`, 5525–5565); divider and keyboard (5566–5612); shot strip (5708–5776); pane-empty, table hints, profile menus, the `r10` observer (5777–5838); theme (5840–5929); Field and timer (5930–6020); layout editor (6021–6166); two-pane (`layoutMode`, `applyPane`, `applyLayout`, 6400–6479); `boot` (7205–7243); every `addEventListener` and `setInterval` in the script.
- Tests run green at d82fd52: domtest 15/0, layouttest 36/0, rendertest 22/0 (Chromium), homelayouttest 36/0, splittest 22/0, striptest 22/0, themetest 24/0, polishtest 23/0, helptest 22/0, typetest 18/0 (Chromium), customtest 26/0, fieldtest 43/0.
- New review harnesses: every page × outer/inner × text M/XL in Chromium (sideways scroll, targets under 40 px, inputs without an accessible name); fold/unfold and rotation mid-task; contrast of the Home dope; boot timing and render cost with CPU throttled ×4; idle observer activity; back/Escape with a modal; boot with corrupt shell settings.

**Not reviewed**
- The real Magic V5: keyboard behaviour, status-bar and punch-hole insets in the installed PWA, sunlight readability, glove use. Chromium emulation only.
- Feature-screen internals (Bench, scopes/reticles, dope cards and courses, profile forms) — segment 5 — except where they share shell code.
- Screen-reader behaviour (TalkBack): only the accessible-name and ARIA structure was checked, not spoken output.

---

## B. Open questions for the owner

1. **Corrupt layout recovery (U-01):** when a stored Home layout is unreadable, should the app silently replace it with the template, or keep the others and show a one-line "Layout X was damaged and has been reset"? I recommend the note.
2. **Android back with a form open (U-02):** should back close the form without saving (like a sheet today), or ask "discard changes?" when something was typed? I recommend: close if nothing changed, ask otherwise.
3. **Screen readers:** is TalkBack or voice input ever going to be used (you, or a friend later)? It decides whether U-04/U-05 are a patch now or later. They are cheap either way.
4. **Sunlight:** the app is a dark theme (contrast 6–15 : 1 measured, fine indoors). Would you like a one-tap bright "sunlight" colour preset next to the eight user colours?
5. **Old versioned HTML copies (U-10):** 61 `RTI-SEN-Ballistic-Calculator-V*.html` files (27 MB) sit in the repo root and are served by GitHub Pages. Git history already is the rollback path (A-08). Keep them, move them to an `archive/` folder, or delete all but the current one?

---

## C. Findings

| ID | Sev | Confidence | Location | Evidence | Impact |
|---|---|---|---|---|---|
| U-01 | S1 | Reproduced | `boot` 7226 vs 7231; `normLayout` 5340; `initLayouts` 5350–5366; `activeMods` 5349 | Stored `APP.layouts` with a `null` entry → "SEN boot failed: Cannot read properties of null (reading 'mods')". A layout whose `mods` is a string → "activeMods(...).some is not a function". Cause: `renderQuick()` (7226) renders Home modules **before** `initLayouts()` (7231) normalises the layouts, and `normLayout` assumes an object. 12 other corrupt shell settings tested (bad `navTabs`, `panes`, `railW`, `fontScale`, `retMag`, `theme`, `truTab`, layout id, unknown modules, junk `modsInner`, non-array layouts) boot fine. | The app is dead at every start (Home "—", no Settings) until site data is cleared. Reachable through an imported file with "Take theirs" (segment 2 D-05) or any future bug that writes a bad layout. |
| U-02 | S2 | Reproduced | `onBack` 5537–5552; Escape handler 7242; `#modal` 1210 | Profiles → open a rifle form → Android back: the page underneath changes to Settings and the form **stays open** on top. Escape with the form open: nothing. Sheets close correctly on back, Escape and backdrop. Modals close only on their buttons and the backdrop. | Back does something the user can't see; the form now floats over another page. |
| U-03 | S3 | Reproduced | `r10Init` 5832–5838, `paneEmptySync` 5783–5790 | The body-wide observer watches `style`/`hidden`; `paneEmptySync` writes `box.hidden=true` on every run even when unchanged, which is a new mutation, which runs it again. Idle on Home, Profiles or Trajectory, at 412 and 780 px: **41 runs in 5 s** (≈ 8 per second, forever). | Constant background work at the range for nothing (battery). Each run is cheap (≈ 0.1 ms), so no visible lag. |
| U-04 | S3 | Reproduced / Likely | `#modal`, `#sheet` 1210–1211; `openModal` 3977; `openSheet` 2705; bottom nav | No `role="dialog"`/`aria-modal`; focus stays on the element behind (after opening a sheet: `BODY`; with a field focused, it stays in that field behind the sheet); focus isn't returned on close; the active nav tab has a CSS class but no `aria-current`. | Keyboard and screen-reader users can't tell a sheet or form is open; Tab moves through the page behind it. |
| U-05 | S3 | Reproduced | `.fld > label` + input pattern across the markup and `fldHtml` 3976 | Labels are siblings without `for`, so the inputs have no accessible name: Trajectory 12, Stability 13, Truing 8, Sensors 6+, Holds 4, Wind 3, Solver 2, Dope 1, Bench 1 visible inputs (Chromium, outer screen). Home and Settings are fine. | TalkBack reads "edit box"; voice input and autofill can't target them. |
| U-06 | S3 | Suspected | `<meta viewport … viewport-fit=cover>` 5; CSS uses only `safe-area-inset-bottom` | With `viewport-fit=cover`, an edge-to-edge PWA (newer Android Chrome) can draw under the status bar and the punch-hole; there is no `safe-area-inset-top`/`-left`/`-right` padding anywhere. | The header or the act bar may sit partly under the status bar on the Honor. Device check needed. |
| U-07 | S3 | Reproduced | `renderQuick` 2848 → `homeTraj` 2793 → `rk4traj` | Each `renderQuick` integrates a full 1 m-step trajectory: 15.3 ms per call, 11.2 ms of it `homeTraj` (CPU throttled ×4, inner screen). Three keystrokes in Home distance → 5 calls. `Bus.notify` 15 ms + the debounced `runTraj` 46 ms. Fine today; segment 3's B-01 ticker will add one call per second while a Calypso is connected. | No lag measured; it is the one place to watch if Home ever feels slow. |
| U-08 | S4 | Reproduced | CSS 13–515 | 64 selectors are defined more than once: later V2.11 "r4/r5" blocks restyle earlier rules (`.btn-xs` 113 → 488, `.srcbtn` 106 → 493, `.reticle-cap` ×4, `.panel h2` ×4, `.seg button`, `.subnav button`, `.navbar button`, `.flag`, `.sc .sl` ×3…). | Reading a rule doesn't tell you what applies; easy to "fix" the wrong copy. |
| U-09 | S4 | Reproduced | line 6964 (jsQR 1.4.0, 130 KB) | Evaluated at every boot although only used on iOS without `BarcodeDetector`. Boot at CPU ×4: 612–728 ms shipped vs 569–641 ms with jsQR stubbed (≈ 45–60 ms). | Small. Not worth breaking the single-file rule (see E). |
| U-10 | S4 | Reproduced | repo root | 61 archived `RTI-SEN-Ballistic-Calculator-V*.html` (27 MB), all public on Pages; the service worker would cache any of them opened by URL. | Repo weight; old builds reachable by URL with stale behaviour (B-5). |
| U-11 | S4 | Reproduced | 4303; 991–995; `stripMirror` 5713 | `tdRowsN` is declared and never used. The Solver keeps hidden copies of distance/angle/wind/cant inputs (`dup-hide`) that `stripMirror` copies the session into before every solve. | Dead / legacy code (see E). |

**Verified, no finding**
- **No sideways scroll** on any of the 14 pages at 412 and 780 px, text Normal and XL, in Chromium.
- **Tap targets:** every visible control is ≥ 40 px (48 px by the V2.11 r4 rules) except the provenance buttons (`.srcbtn`, drawn 23 px tall) — they carry an invisible 44 px hit area (`.srcbtn::after`, 494), so they are fine for gloves too.
- **Fold/unfold and rotation mid-task** (780 → 412 → 780, 900 × 780): typed distance kept, focus kept, solution visible and right (↑98 at 175 m), open sheet and open form survive, no errors. The per-page pane choice persists (`APP.panes`); `layouttest` covers block order.
- **Forms taller than the screen** scroll inside the modal (`.modal{overflow-y:auto}`).
- **Contrast** of the Home dope: elevation 8.5 : 1 at 35 px; labels, notes and flags 6.1–10.7 : 1 (high contrast 10.8–15.8 : 1). Above WCAG AA.
- **Back stack:** sheets close first, then pages pop, then "press back again to close" with the guards drained — correct for sheets.
- **Listeners:** re-rendered controls use inline handlers or guarded bindings (`_g`, `_dg`, `_xs`, `_menu`); no duplicate listeners found on re-render. Global listeners are added once at boot.
- **Reduced motion** is honoured (CSS media query, Chrono Graph, layout editor).

---

## D. Fix guidelines for Opus

**U-01 — corrupt layout bricks the boot** · patch
- Scope: (1) in `boot`, call `initLayouts()` before the first `refreshSelects()/renderQuick()` (move the call up; keep `applyHomeLayout()` where it is). (2) In `initLayouts`, drop entries that are not plain objects before `normLayout` (`APP.layouts=APP.layouts.filter(l=>l&&typeof l==='object')`), and fall back to the templates if none are left. `normMods` already handles a non-array `mods`.
- Owner ruling B-1: if he wants the note, show it once via `senToast` when anything was dropped or reset.
- Test (homelayouttest, with a stored snapshot + restart under fake-indexeddb): the two corruptions from C/U-01 → boots, Home renders, the good layouts kept; a store whose layouts are all junk → the five templates.
- Risk: low; homelayouttest, customtest, splittest, fieldtest.

**U-02 — back and Escape with a modal open** ⚖ (B-2) · patch
- Scope: in `onBack`, handle `#modal.open` before the sheet: close it (or ask, per ruling) and stop. Make the Escape handler call `closeModal()` when a modal is open, else `closeSheet()`. `openModal` arms a back guard the same way `openSheet` does (`backArm()`).
- Test (domtest): open a rifle form → back → form closed, page unchanged; Escape → closed; import review sheet → back → closed and nothing imported.
- Risk: low; domtest is mandatory here (§21.4).

**U-03 — observer self-trigger** · patch
- Scope: in `paneEmptySync`, write only on change: `if(box.hidden!==v)box.hidden=v;` for both writes, and set `textContent` only when it differs.
- Test (rendertest or polishtest): with the app idle for 2 s on Home, `r10Sync` runs at most once; the pane-empty hint still appears on an empty results pane (existing polishtest assertions).
- Risk: very low.

**U-04 — dialog semantics and focus** · patch
- Scope: `role="dialog" aria-modal="true"` on `#mbox` and `#sbox`; in `openModal`/`openSheet`, remember `document.activeElement`, then focus the first heading or control in the box (`tabindex="-1"` on the box as fallback); in `closeModal`/`closeSheet`, return focus to the remembered element if it is still in the document. `aria-current="page"` on the active bottom-nav button in `gotoPage` (next to the existing `on` class). No focus trap library — a simple `keydown` Tab wrap is optional.
- Test (domtest): after `pickSheet('rifle')` focus is inside `#sbox`; after closing, focus is back on the act-bar chip; the active nav button has `aria-current`.
- Risk: low — check the Android keyboard does not pop up because focus lands on an input (focus the heading, not the first input).

**U-05 — labels not tied to inputs** ⚖ (B-3) · patch
- Scope: one boot-time pass, re-run from the existing unit `MutationObserver` callback: for every `.fld` whose `label` has no `for` and whose input/select has an `id` and no `aria-label`, set `label.htmlFor=input.id`. One function, no markup changes; `fldHtml` gets `for="${id}"` directly.
- Test (helptest or a new a11y check in rendertest): every visible input on the 14 pages has a non-empty accessible name (`el.labels.length || aria-label`).
- Risk: very low. Tapping a label now focuses its input — check that no label contains its own buttons (the source buttons sit inside some labels: a tap on them must not also focus the input; the `srcbtn` handlers already stop on click — verify).

**U-06 — top and side safe areas** · patch · Honor check: required (owner to-do)
- Scope (only if the device shows overlap): `padding-top: env(safe-area-inset-top)` on the header / act bar container and `padding-left/right: env(safe-area-inset-left/right)` on `body` for landscape. Alternatively remove `viewport-fit=cover` if nothing needs to draw under the bars.
- Test: rendertest can't emulate insets; a CSS presence check plus the device check.
- Risk: low.

**U-07 — trajectory per render** · patch, optional
- Cost/benefit: 15 ms per Home render at CPU ×4 is acceptable now. Do it only if the 1 Hz ticker (segment 3 B-01) shows lag on the Honor: memoise `homeTraj` on a key of its inputs (MV, BC, mass, zero range, max range, sight, current and zero air, drag, bands, flight MV) and return the cached points while the key is unchanged. Must not change any dope (bit-identical; `runtests` + fieldtest).

**U-08 — duplicated CSS selectors** · optional
- Cost/benefit: medium cost, visual-regression risk; benefit is readability only. If done: fold each later override into its base rule one selector at a time, with `rendertest` + `typetest` + a before/after screenshot diff of every page at 412/780 × M/XL (Playwright) — no visual change allowed. Not part of any bug-fix release.

**U-09 — jsQR at boot** · not recommended
- Lazy-loading needs either a second file (changes the 4-file deploy set and the SW `CORE` list) or `eval`/`new Function` (conflicts with a future CSP, segment 2 D-21). The saving is ≈ 50 ms at CPU ×4. Leave it.

**U-10 — archived HTML copies** ⚖ (B-5) · repo housekeeping, no release
- If the owner agrees: move them to `archive/` (keeps URLs out of the root) or delete them and rely on git tags. Update `tests/README.md` paths for the suites that load old releases (storagetest V1.17.2, coursetest V1.22.0, homelayouttest V1.25.1, stabtest V1.29.1, pressuretest V1.31.0, bcmigtest V1.24.1) — those six must stay available somewhere.

**U-11 — dead and legacy code** · patch, with the next release that touches the area
- Delete `let tdRowsN=1;` (4303). The Solver's hidden inputs: optional, only together with a change that makes `solve()` read the session directly (segment 1 P-10 touches the same code).

### Test gaps

Not covered by domtest/rendertest/layouttest today:
- Android back and Escape with a **modal** open (U-02); back from the import review sheet.
- Boot with a **corrupt stored layout** (U-01) — homelayouttest normalises garbage only after boot.
- **Idle activity:** no test notices an observer or timer running for nothing (U-03).
- **Accessible names and dialog semantics** on every page (U-04, U-05).
- **Fold mid-task with a focused field / open sheet / open form** — the review harness `fold.js` can become a rendertest case.
- **Rotation of the inner screen** (900 × 780) — layouttest has "inner fold both orientations" for the logic, not in real Chromium.
- **Safe-area insets** (U-06) — device only.

---

## E. Structure, dead and duplicated code

**How far the single script can go.** At 7,246 lines the file is still navigable because every section has a banner and a version tag. What hurts is not length but (1) the same concern spread across distant blocks (CSS overrides 400 lines after the base rule; physics helpers used from UI code in five places), and (2) no table of contents. Minimal-risk options that keep "single file, no build step":
1. **Table of contents** (optional, near-zero risk): one comment at the top of the script listing every section banner by name (`D4 — PHYSICS CORE`, `CORE-07 SenBle`, …). Searchable, never stale as long as names don't change. Cost: 30 minutes.
2. **Banner naming rule** (optional): every section starts with the same `═════ <ID> — <name> ═════` form (most already do); new code goes into the section of its feature, not at the end. No code moves.
3. **CSS overrides** (optional, U-08): consolidate only with screenshot diffs.
4. **Do not** split the file or add modules/bundling — it breaks A-01/§18 and the 4-file deploy set for little gain at this size.

**Dead or duplicated code found**

| Line(s) | What | Action |
|---|---|---|
| 4303 | `let tdRowsN=1;` — never read | Delete (U-11) |
| 991–995, 5713 | Hidden duplicate Solver inputs (`dup-hide`) mirrored from the session | Keep until `solve()` reads the session (optional) |
| 1725 | `solveShot` Rifleman's-rule branch, unreachable from current callers | Segment 1 P-19 |
| 4914, 4618 | `bleDevice`/`bleLast*` globals mirroring the session Calypso | Keep (documented compatibility layer for older readers) |
| 106/493, 113/488, and 62 more | CSS selectors defined more than once | U-08 (optional) |
| repo root | 61 archived HTML builds | U-10 (owner) |

A scan for top-level functions and constants that are never referenced (comments excluded) found only `tdRowsN`. The script has very little dead code.

---

## F. Suggested release grouping and order

| Order | Release | Items | Why together |
|---|---|---|---|
| 1 | patch (with segment 2's D-05 import validation) | **U-01** | Both stop a bad import from bricking the app; same test campaign (restart with a stored snapshot). |
| 2 | patch | U-02, U-03, U-04, U-05, U-11 | Shell behaviour: back/Escape, observer, dialog semantics, labels, dead variable. domtest + rendertest + helptest. |
| 3 | patch (after the device check) | U-06 | Only if the Honor shows overlap. |
| 4 | optional | U-07 (if B-01's ticker causes lag), U-08, U-10 | Performance and housekeeping, no behaviour change. |

---

## G. Owner rulings (2026-11-17)

| Question | Ruling | Effect on the plan |
|---|---|---|
| B-1 Damaged layout note | Yes | U-01: show a one-line note once when a layout was dropped or reset. |
| B-2 Back with a form open | As recommended | U-02: close at once if nothing changed; ask "discard changes?" if something was typed. |
| B-3 Screen readers | Later, as a feature once the app is polished | U-04 and U-05 leave the patch plan and become feature proposal F-6 (accessibility pass). The `aria-current` / dialog focus work moves with it. |
| B-4 Sunlight preset | Yes | Feature proposal F-7: one-tap bright "sunlight" colour preset next to the user colours. |
| B-5 Old HTML copies | Archive | U-10: move the versioned builds to `archive/`; keep the six the tests load and update their paths in `tests/README.md` and the suites. |
