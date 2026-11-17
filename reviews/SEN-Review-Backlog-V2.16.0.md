# SEN review backlog — owner to-dos and feature proposals (from the V2.16.0 reviews)

Running list kept during the five-segment review. The final to-do list is produced after the last segment.

## Owner tests to do (real devices)

| # | From | Test | Why |
|---|---|---|---|
| T-1 | Seg 2 D-06 | Export the full data from the Honor and send the JSON, before the import range checks ship | Make sure the new import limits don't reject your own backup |
| T-2 | Seg 2 D-21 | Drive sign-in, backup and restore on the Honor after any CSP change | A wrong policy breaks Google sign-in |
| T-3 | Seg 2 D-01 | After the trued-BC fix: true a BC, restart the app, check the BC is unchanged | Confirms the restart conversion is gone on the device |
| T-4 | Seg 3 B-01 | With a Calypso feeding the session: cover or switch off the unit, then walk out of range | Check the 3 s "old" warning and the 30 s switch to manual |
| T-5 | Seg 3 B-06 | Both Calypsos streaming, screen off for 10 minutes, screen on; save a Lab log | Does the stream survive Chrome's background throttling? |
| T-6 | Seg 3 B-09 | LabRadar HCI snoop with a shot re-sent or a reconnect mid-series | Do frames ever start mid-notification; is byte 63 the shot number? |
| T-7 | Seg 3 B-15 | Titan in scan mode (hold RANGE), Lab capture | Does one notification ever carry two frames? |
| T-8 | Seg 3 B-12 | Phone-compass target bearing with the Magic V5 unfolded, portrait and landscape, against a known bearing | Is the heading right on the inner screen? |
| T-9 | Seg 3 B-04 | With the LoRa boards (LAB-06): station dropouts at 25 / 50 / 100 / 200 m | Decides how urgent auto-reconnect is |
| T-11 | Seg 4 U-06 | Installed PWA on the Honor, outer and inner screen, portrait and landscape: is anything under the status bar or the camera hole? | Decides the safe-area fix |
| T-12 | Seg 4 | Type in a profile form near the bottom of the outer screen: does the keyboard cover the field you're typing in? | Keyboard handling is only done for sheets |
| T-13 | Seg 4 B-4 | Read Home in full sun (dark theme, then high contrast) | Decides whether a bright "sunlight" preset is worth adding |
| T-14 | Seg 5 | Print a dope card from the phone on the printer you use (A4 and A5) and read it at arm's length | Decides the print layouts (F-9) |
| T-10 | Seg 1 | Stability range test (SEN-Stability-Range-Test-Sheet-V1) — already on file | McGyro vs Miller decision |

## Feature proposals (for the Feature Register, 💭 Proposed — to be ruled)

| # | Proposal | Notes |
|---|---|---|
| F-1 | **Session record.** Start a session; everything until Stop is saved as one record: MV (and shot strings), BC in use, distances, bearings, Coriolis settings, wind (live and manual, with source), rifle and projectile profiles (snapshot), atmosphere, notes, dope used. Confirmed and saved the same way a zero is. | Owner request 2026-11-17. Natural home for chrono strings, truing inputs and field notes; export/Drive as one file. Design questions: snapshot vs references to profiles, storage size limits, how it relates to dope cards and the shot string. |
| F-2 | **Number format setting.** EU by default (decimal comma for input and display), switchable in Settings. | Owner ruling on seg 3 B-03. App-wide: every number input and printed value. |
| F-3 | **Import part picker.** "Take theirs" lists the preference groups (units, display, colours, Home layouts, bottom bar, other) with a checkbox each. | Owner ruling on seg 2 B-3. |
| F-4 | **True north option.** Typed bearings can be true north with a declination setting (fallback, or simulating another location). | Owner ruling on seg 3 B-2. |
| F-5 | **Automatic reconnect** for dropped devices. | Seg 3 B-04; priority after LoRa tests (T-9). |
| F-6 | **Accessibility pass.** Dialog semantics and focus for sheets and forms, labels tied to every input, `aria-current` on the nav. | Owner ruling on seg 4 B-3: after the app is polished. Plan in seg 4 U-04/U-05. |
| F-7 | **Sunlight preset.** One-tap bright colour set for reading in full sun. | Owner ruling on seg 4 B-4; check with T-13. |
| F-8 | **Turret revolutions** (rev + clicks from the scope's clicks per revolution) on Home, Solver, cards and print. | Seg 5; `cpr` is stored but unused. |
| F-9 | **Print and e-ink layouts** for dope cards: A4 / A5 / pocket and a **custom size**, for paper or the e-ink display; larger type; optional date, BC + drag, MV, atmosphere. | Seg 5 W-13 / B-4 (owner: sizes to be decided, custom size required). |
| F-10 | **BENCH-05 completion** — manufacturability rules (bearing length, boat-tail, meplat, calibre and choke fit). | Seg 5; register lists BENCH-05 as partly built. |
| F-11 | **SFP reticles** with a calibration magnification. | Seg 5 W-06. |
| F-12 | **Course summary** at the end of a course, with the option to go back to any stage or target. | Seg 5 B-5 (owner ruling). |
| F-13 | **More reticle options** — a larger verified reticle library (other Vector reticles, other makers), import of verified geometry. | Seg 5 B-3 (owner). |
