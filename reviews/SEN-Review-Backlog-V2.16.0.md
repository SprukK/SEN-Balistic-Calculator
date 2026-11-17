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
| T-10 | Seg 1 | Stability range test (SEN-Stability-Range-Test-Sheet-V1) — already on file | McGyro vs Miller decision |

## Feature proposals (for the Feature Register, 💭 Proposed — to be ruled)

| # | Proposal | Notes |
|---|---|---|
| F-1 | **Session record.** Start a session; everything until Stop is saved as one record: MV (and shot strings), BC in use, distances, bearings, Coriolis settings, wind (live and manual, with source), rifle and projectile profiles (snapshot), atmosphere, notes, dope used. Confirmed and saved the same way a zero is. | Owner request 2026-11-17. Natural home for chrono strings, truing inputs and field notes; export/Drive as one file. Design questions: snapshot vs references to profiles, storage size limits, how it relates to dope cards and the shot string. |
| F-2 | **Number format setting.** EU by default (decimal comma for input and display), switchable in Settings. | Owner ruling on seg 3 B-03. App-wide: every number input and printed value. |
| F-3 | **Import part picker.** "Take theirs" lists the preference groups (units, display, colours, Home layouts, bottom bar, other) with a checkbox each. | Owner ruling on seg 2 B-3. |
| F-4 | **True north option.** Typed bearings can be true north with a declination setting (fallback, or simulating another location). | Owner ruling on seg 3 B-2. |
| F-5 | **Automatic reconnect** for dropped devices. | Seg 3 B-04; priority after LoRa tests (T-9). |
