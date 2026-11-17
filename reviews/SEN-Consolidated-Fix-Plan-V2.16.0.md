# SEN Ballistic Calculator — Consolidated Fix Plan (from the V2.16.0 reviews)

- **Base:** commit `d82fd522` (V2.16.0). Review only — no app code changed.
- **Sources:** the five segment reviews in this folder, each with the owner's rulings at its end:
  - Segment 1 — `SEN-Physics-Core-Review-V2.16.0.md` (IDs P-xx)
  - Segment 2 — `SEN-Data-Security-Review-V2.16.0.md` (D-xx)
  - Segment 3 — `SEN-Device-IO-Review-V2.16.0.md` (B-xx)
  - Segment 4 — `SEN-App-Shell-Review-V2.16.0.md` (U-xx)
  - Segment 5 — `SEN-Feature-Screens-Review-V2.16.0.md` (W-xx)
  - Owner tests and feature proposals — `SEN-Review-Backlog-V2.16.0.md` (T-xx, F-xx)
- **For Claude Opus 5.5.** The fix guideline, test and risk for each ID are in its segment file; this file only orders them. Every release still follows PROJECT_INSTRUCTIONS_V8 §21: plan → owner "go" → minimal change → every suite in `tests/README.md` green → 4-file deploy set → patch-log entry → owner "push".

---

## 1. Ordering rules

1. **Start-up failures first.** Five separate paths make the app fail at every start (U-01, W-02, D-05, and the two bad-layout cases inside U-01). They ship together.
2. **Silent changes to the owner's data next** (D-01: trued BC cut by π/4 at each restart).
3. **D-01 before P-02.** Whitelisting `bcTrued`/`bcConv` on import (P-02) without D-01 would convert every imported trued BC again at the next start.
4. **Injection before new import rules.** The id rule (D-02) also closes D-14/D-15 and the W-09 scope-file path.
5. **D-06 (import ranges) waits for owner test T-1** (a real export from the Honor) so the limits never reject his own backup.
6. **Features only after a Feature Register ruling** (💭 Proposed → ✅ Confirmed). Nothing in §4 is approved.
7. **Device-dependent fixes wait for their capture** (listed in §3).

---

## 2. Release sequence

Release numbers assume each release ships before the next is planned; Opus may merge or split releases if the diff stays small and every suite stays green.

### R1 — V2.16.1 (patch): the app must always start
| ID | What | Notes |
|---|---|---|
| U-01 | Normalise Home layouts before the first render; drop non-object layouts; one-line note when a layout was reset | Owner: show the note |
| W-02 | Course runner with a card that has no stages: message instead of a crash | With W-08 (Hit/Miss on an empty stage) |
| W-08 | `courseCall` returns on a stage with no targets | |
| D-05 (validator part) | Units / secondary units / app settings validated on import and **at load** (recovers an already-bricked store) | The per-group picker is F-3 (R6) |
| D-01 | Truing sets `bcConv='native'`; restart test | Owner: no BC trued since 23 Oct → no repair migration needed |

### R2 — V2.16.2 (patch): no script injection from shared data
| ID | What |
|---|---|
| D-02 | Id rule `^[A-Za-z0-9_-]{1,40}$` in the sanitiser (re-id + remap) and once at load; `esc()` on ids in attributes |
| D-03 | `esc()` in `fldHtml`, reticle caption (`fp`), Holds BC-pending flag |
| D-04 | Link / QR / pasted codes always open the review sheet (owner: yes) |
| D-14, D-15 | Duplicate ids within one file; `Map`-based id remap |
| D-16 | Size caps: share code 64 kB, inflated 1 MB, files 10 MB, arrays ≤ 64 |
| W-09 | Scope-file import goes through `sanitiseRecord`; preview in the scope's unit |

### R3 — V2.16.3 (patch): trued BCs and profile values reach the dope
| ID | What |
|---|---|
| P-01 + W-01 | Re-pull profile-sourced session fields after truing and after editing the active rifle / projectile / weather |
| P-02 + D-07 | Whitelist `bcTrued`, `bcConv`, `bcBands`; version-aware conversion of pre-V1.24.2 exports |
| P-05 | Editing a trued BC by hand clears the trued state |
| P-07 | Bands ignored for a manual or trial BC |
| W-04 | Session overrides (MV, BC, sight, air) and their sources survive a restart, with a "kept from last session" note (owner: keep) |
| D-06 | Import ranges and enums matching the forms — **after T-1** |

### R4 — V2.16.4 (patch): what the shooter reads is right
| ID | What |
|---|---|
| B-01 | Stale wind: 1 s freshness check while a Calypso is connected; "wind N s old" at 3 s, session switches to manual at 30 s or at once on disconnect (owner: as recommended) |
| B-07, B-08, B-14 | Strict `:WU` parsing, one handler per unit after reconnect, `DataView` offset |
| P-03, P-06, P-13, P-12 | Truing air from the session (station pressure), exact velocity at any distance, banded-truing validation, pressure kind stated at every entry point |
| P-04 + W-05 | Holds reticle marks the right way round; warning when the reticle is estimated (owner: agreed) |
| W-03 + W-10 | "No reticle (dial only)" option and default; no silent Mil-Grid; migration for scopes it already hit; new reticles default to estimated |
| P-10 | No `Infinity`/`NaN` reaches a dope cell |
| B-03 (parser part) | Chrono strings with decimal commas (`280,5 281,2`) parse correctly; median sanity check |

### R5 — V2.16.5 (patch): storage, service worker and workflow robustness
| ID | What |
|---|---|
| D-08, D-10 | No silent stale localStorage fallback; an unreadable snapshot is kept and the warning stays |
| D-11, D-12, D-13 | Service worker: cache only OK responses, 3 s navigation timeout, `cache:'reload'` on install |
| D-17, D-18 | Deleted catalog items stay deleted; legacy zero pressure not converted twice |
| U-02 | Back / Escape close a form; ask "discard changes?" only if something was typed (owner) |
| U-03 | Observer writes only on change (no idle loop) |
| W-07 | Deleting a profile used by cards warns and lists them (owner); Trajectory/Solver require a rifle |
| W-11 | Stage timer resumes after a restart |
| W-12 | Duplicate names refused on save (owner); OAL > 22 mm, calibre/diameter and stock-twist notes |
| W-13, W-14 | "station" and print date on the card; empty card MV shown as required |
| B-05, B-09, B-11, B-13 | New LabRadar series → new string (owner: yes); LabRadar resync; missing key reply; chrono MV range |
| U-10, U-11 | Versioned builds moved to `archive/` (owner), test paths updated; dead `tdRowsN` removed |

### R6 — V2.17.0 (minor): new behaviour already ruled on by the owner
Each needs a Feature Register entry before it is built.
| ID | What | Ruling |
|---|---|---|
| P-08 | Warning when Sg < 1.0 (dope kept) | Owner: warn |
| P-09 | Transonic / diabolo warnings on every dope screen; the setting hides the slug warning only | Owner: slug only |
| P-11 | Uncertainty band on velocity truing (needs a LabRadar accuracy figure) | — |
| D-09 | Second window can't overwrite the first (revision check) | Owner: fix it |
| F-3 | Import "Take theirs" as a per-group picker (units, display, colours, Home layouts, bottom bar, other) | Owner |
| F-2 | Number format: EU (decimal comma) by default, switchable in Settings — every input and printed value | Owner |
| F-12 | Course summary at the end, with the option to go back | Owner |

### R7 — V2.17.1 (patch): low impact and housekeeping
P-14 (zero wind in zero air), P-15 (solver bounds), P-16 (pellet C on Stability, card without rifle), **P-18** (horizontal Coriolis measured from the zero — owner accepted), P-21 (docs, Everyday Default anchor), P-20 (doc note only), D-19 (schema guard at load), D-20 (Drive duplicates), B-10 (GATT timeout), B-16, B-17, and the **test gaps** listed in each segment file.

---

## 3. Waiting for an owner test (T-xx in the backlog)

| Fix | Waits for | |
|---|---|---|
| D-06 | T-1 export from the Honor | then R3 |
| D-21 CSP (optional) | T-2 Drive check after the change | |
| B-06 keepalive after long screen-off | T-5 10-minute screen-off capture | only if the stream dies |
| B-09 confirmation / dedupe by shot number | T-6 LabRadar snoop | R5 resync ships anyway |
| B-15 two Titan frames per notification | T-7 scan-mode capture | |
| B-12 compass orientation | T-8 unfolded-screen bearing check | |
| U-06 safe areas | T-11 status bar / camera hole check | |
| U-07 render cache (optional) | lag seen on the Honor after B-01 | |
| F-9 print/e-ink sizes | T-14 print test | |

---

## 4. Feature proposals (💭 Proposed — to be ruled in the Feature Register)

| ID | Proposal | Origin |
|---|---|---|
| F-1 | Session record: start/stop a session; MV and shot strings, BC, distances, bearings, Coriolis, wind with source, profile snapshots, atmosphere, notes, dope — saved like a zero | Owner request |
| F-4 | True north + declination for typed bearings (fallback, or simulating another location) | Seg 3 B-02 |
| F-5 | Automatic reconnect for dropped devices | Seg 3 B-04, after T-9 (LoRa) |
| F-6 | Accessibility pass (dialog semantics and focus, labels tied to inputs, `aria-current`) | Seg 4 U-04/U-05; owner: after polish |
| F-7 | Sunlight colour preset | Seg 4; owner: yes |
| F-8 | Turret revolutions (rev + clicks) | Seg 5 |
| F-9 | Print and e-ink layouts incl. a custom size | Seg 5; owner |
| F-10 | BENCH-05 completion (manufacturability rules, calibre and choke fit) | Seg 5 |
| F-11 | SFP reticles with a calibration magnification (includes W-06) | Seg 5 |
| F-13 | More reticle options (larger verified library, verified-geometry import) | Seg 5; owner |

F-2, F-3 and F-12 are already ruled in shape by the owner and sit in R6; they still need their register entries.

---

## 5. Optional / not recommended

| ID | Why |
|---|---|
| U-08 | Consolidating 64 duplicated CSS selectors — readability only, needs screenshot diffs |
| U-09 | Lazy-loading jsQR — saves ≈ 50 ms at CPU ×4 but breaks the single-file rule or needs `eval` |
| P-19 | Removing the unreachable Rifleman's-rule branch — do with P-10 if at all |
| E (seg 4) | Table of contents and banner naming rule in the script — near-zero risk, do any time |

---

## 6. Closed without code

- P-17 King G7 0.127 / AEA CP G7 0.061 — owner: maker figures.
- Segment 4 U-04/U-05 moved to F-6.
