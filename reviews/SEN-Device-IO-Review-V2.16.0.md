# SEN Ballistic Calculator — Device I/O Review (BLE, chronographs, rangefinders, wind) (V2.16.0)

Review only. No app code was changed. Implementation target: Claude Opus 5.5, under PROJECT_INSTRUCTIONS_V8 §21 (plan → "go" → minimal change → full regression; §21.4 simulated devices that behave like the real ones).

Confidence: **Reproduced** = shown in the running app (jsdom with the repo's own device simulators, or headless); **Likely** = clear from code reading; **Suspected** = plausible, needs a real-device capture. Protocol facts are taken only from the code, SEN-Calypso-BLE-Handoff-V3 and SEN-Device-BLE-Handoff-V1; anything beyond them is flagged.

---

## A. Scope

**Commit:** `d82fd522` (V2.16.0), `index.html`.

**Read**
- Project knowledge: PROJECT_INSTRUCTIONS_V8 (§7, §9 wind rules, §18 SenBle rule), SEN-Calypso-BLE-Handoff-V3, SEN-Device-BLE-Handoff-V1, SEN-Lab-Graduation-Checklist (LAB-07), clean-code-rules.md.
- Code: wake lock (1896–1909); wind average (4635–4668); `SenBle` (4674–4702); Element rangefinder driver (4704–4794); LabRadar LX driver (4796–4894); Calypso driver (4896–5052); chrono (5054–5279: `chClean`, `chStats`, `chParseTyped`, `chCsvRows`, `chParseXero`, `chUse`, `chVert`, `chRender`, `chRunning`, Chrono Advanced and Graph); device row and pause (5600–5706); Home live-wind state (3079–3106); heading service and compass (6577–6636); stations (6638–6855: `stnState`, `stnField`, `stnLive`, wind module).
- A grep for every `navigator.bluetooth`, `requestDevice`, `getPrimaryService`, `startNotifications`, `writeValue`, `readValue` and every `setInterval` in the file.
- Tests run green at d82fd52: calypsotest 18/0, multicaltest 19/0, rangefindertest 26/0, labradartest 23/0, chronotest 45/0, chadvtest 24/0, devicetest 41/0, windavgtest 28/0, windtest 22/0, stationtest 31/0, stationusetest 16/0, windmodtest 19/0. New review harnesses (stale unit, reconnect, parser edge cases) reuse the repo's own `unit()` Calypso simulator.

**Not reviewed**
- The Lab app's probes and its FX Pocket Chrono / AEA BC1500 work (not in Main).
- Real-device behaviour: nothing was run on the Honor. Background timer throttling, GATT behaviour with the screen off, compass orientation on the inner screen and radio range are code reading or open questions only.
- Garmin Xero SD convention (sample vs population): not documented anywhere I could see; the app accepts either when cross-checking.
- The Calypso `:WU` checksum: the algorithm is unknown (handoff §3), so it can't be verified.

---

## B. Open questions for the owner (real-device captures)

1. **Stale wind (B-01).** When the session Calypso stops sending or disconnects, what should Home do? (a) keep the last wind but mark it plainly ("wind 14 s old — check it") and turn the Weather pill amber; (b) after a grace period (say 10 s) switch the session to manual with the last value and say so; (c) blank the windage until wind returns. I recommend (a) at 3 s, plus (b) at 30 s.
2. **Where do typed bearings come from?** If you ever type a target bearing from a map, GPS or the Garmin (true north) while the Calypso mount was set with the phone compass (magnetic), the two disagree by the declination (≈ 5° E in Slovenia — value assumed, not looked up for your site). Near a head- or tailwind that changes the crosswind a lot (B-02).
3. **Screen off for long.** How long has screen-off been tested with both Calypsos? Chrome throttles background timers hard after about 5 minutes hidden; if the 10 s keepalive is delayed, the handoff says the unit reverts to idle. A 10-minute screen-off capture (stream before and after, Lab log) would settle B-06.
4. **Stations at distance.** How often does a station Calypso at 50–300 m drop its connection? That decides whether auto-reconnect (B-04) is urgent.
5. **LabRadar series.** When you start a new series on the unit, should the live shot string start over (my recommendation) or keep appending?
6. **LabRadar framing.** Does a notification ever start in the middle of a frame, and does the unit ever repeat event `20` for the same shot? The handoff says byte 63 is probably the shot number (inferred) — a capture with a re-sent shot would confirm whether it can be used to drop duplicates (B-09).
7. **Titan scan mode.** In scan mode, does a notification ever carry two `F5` frames (8 bytes)? Today only exactly 4-byte notifications are read (B-15).
8. **Compass on the inner screen.** Does "lay the phone flat, top edge to the target" give the right bearing with the Magic V5 unfolded and in landscape? (B-12)
9. **Typing shot strings.** Do you type velocities with a decimal comma (280,5)? (B-03)

---

## C. Findings

| ID | Sev | Confidence | Location | Evidence | Impact |
|---|---|---|---|---|---|
| B-01 | S1 | Reproduced | `calypsoParse` 4987–5002, `updateBleDisplay` 5023–5037, `calOnDisconnect` 4966–4972, `wxFeeding` 5623, `homeLiveState` 3087; no timer anywhere | Simulated unit #1 streams 5 m/s from 90°, then goes silent but stays connected. After 8 s and after an unrelated session change: `S.wind` still `{5, 90, source:'calypso'}`, Home windage →10 clicks (1.00 mrad at 150 m), Sensors card **"live"**, Weather pill **"5.0 m/s"**, live bar **"LIVE from Calypso"**. After disconnect: same wind, same windage, source still `calypso`. All freshness texts are recomputed only when a packet arrives, so they freeze too. `stationtest` B enshrines the fallback "Home = single session wind exactly" when a station goes silent. | A stale wind is used as live with no warning — exactly what LAB-07 §3 and the handoff ("signal lost after 3 s") forbid. |
| B-02 | S2 | Likely | Heading service 6577–6636, `stnMarkRel` 6667–6670, `BRG_SRC` 6578 | Bearings are stored without a north reference. Phone-compass bearings are magnetic (`deviceorientationabsolute` / `webkitCompassHeading`); typed ones can be true. CORE-14 says the heading service "handles magnetic vs true north so mixed sources don't silently disagree" — not implemented (only a comment about Coriolis). With a 5° mismatch and 4 m/s wind 10° off a headwind, crosswind is 0.695 vs 1.035 m/s (+49 %) **[calc]**. | Wrong crosswind when sources are mixed. S2 because it needs a mixed workflow; S1 if you type bearings from a map (B-2). |
| B-03 | S2 | Reproduced | `chParseTyped` 5081–5092 | Commas are shot separators: `280,5 281,2 279,8` → shots [280, 5, 281, 2, 279, 8], mean **142.50 m/s**. "Use mean → session MV" then puts that into the session. | A wrong MV can reach the session. Visible (six shots listed), so S2. |
| B-04 | S2 | Likely | `SenBle.connect`, `calOnDisconnect`, `rfOnDisconnect`, `lrOnDisconnect` | After any drop, every driver waits for the user to reconnect through the chooser. Web Bluetooth allows `device.gatt.connect()` again on the same `BluetoothDevice` without a chooser or gesture. | A station unit that drops briefly at distance is out until someone walks to the phone. |
| B-05 | S2 | Likely | `lrShot` 4865–4874 | A LabRadar string already in progress is continued after a reconnect — also when the unit is now on another series (the series is only written into the string's name at creation). | Shots of two loads or setups mixed; their mean can go to the session MV. |
| B-06 | S2 | Suspected | Keepalive `setInterval` 4952; LabRadar poll 4855 | Chrome's intensive throttling (hidden > 5 min) can delay chained timers to once a minute. The handoff says the Calypso reverts to idle without the 10 s keepalive. Nothing re-sends the handshake on `visibilitychange`, and `d.status` stays `'live'`. | Wind may stop after a long screen-off; with B-01 unfixed it looks live. Needs a capture (B-3). |
| B-07 | S3 | Reproduced | `calypsoParse` 4989–4997 | Accepts anything with ≥ 5 fields: two sentences run together (a lost `\r`) `…,12:WU,2,1.0,…` → direction **12°** pushed into the average; `-3.0` m/s and `400°` accepted into the buffer (a negative speed flips the vector mean); junk fields (`nan,inf,abc`) leave the old values but refresh `lastWu`, so the unit looks live. Checksum not checked (algorithm unknown). | Bad readings can enter the average; junk keeps a dead stream looking alive. |
| B-08 | S3 | Reproduced | `SenBle.notify` 4695, `SenBle.connect` 4699, `calPacket` | Same unit connected 4 times: 4 FFF2 listeners and 4 `gattserverdisconnected` listeners on the reused objects; one `:WU` → 4 `calRender` calls. The rangefinder and LabRadar handlers ignore stale listeners (`RFS.includes(d)`, `LR!==d`); Calypso's don't. | Work per packet grows with every reconnect; old driver objects stay alive. No wrong value (checked). |
| B-09 | S3 | Reproduced | `lrTake` 4814–4826 | A stray `01` followed by a length of 4000 holds the parser: a real "armed" frame behind it is swallowed (0 frames out, 19 bytes waiting). On a CRC failure the whole claimed frame is dropped instead of one byte. | One bad byte can hide the next shots until 4 kB of traffic arrive. Whether notifications ever start mid-frame is unknown (B-6). |
| B-10 | S3 | Suspected | `link.op` 4691 | The per-device queue has no timeout. A GATT operation that never settles blocks every later write to that device (keepalives queue up). Chrome normally rejects pending operations on disconnect, so this needs a stuck-but-connected link. | A stalled device stays stalled until reconnect. |
| B-11 | S3 | Likely | `lrConnect` 4843–4844, `lrRender` 4888–4892 | If the reply to the app key (`9A`) never comes, the status shows "app key sending…" forever and the "link silent" note is gated on the poll that only starts after `9A`. | Silent failure at connect. |
| B-12 | S3 | Suspected | `compassHeading` 6609–6612 | Heading = 360 − alpha, valid only with the phone flat in its natural orientation; `screen.orientation.angle` and tilt are ignored. On the unfolded Magic V5 in landscape, "top edge" may not be the edge the code assumes. | Bearing error up to 90° if held differently. Needs a device check (B-8). |
| B-13 | S3 | Likely | `useChronoMV` 5039–5052 | The session MV from the Chronograph card is accepted if non-zero; no 0–600 m/s range like every other MV input (`mvtAdd`, rifle form). | Typo MV (e.g. fps typed as m/s) goes to the session unchecked. |
| B-14 | S4 | Likely | `calPacket` 4980 | `new Uint8Array(value.buffer)` ignores `byteOffset`/`byteLength` (the rangefinder and LabRadar paths respect them). Reproduced with an offset `DataView`: the sentence is lost. Chrome normally hands out offset 0. | Latent. |
| B-15 | S4 | Likely | `rfParse` 4711–4715 | Only notifications of exactly 4 bytes are read; two frames in one notification would be dropped. Captures show 4-byte notifications only. | Latent; depends on B-7. |
| B-16 | S4 | Likely | `calypsoUnlock` 4903–4911 | An unlisted unit gets every known token, so the owner's unit tokens are sent to any WDOT device in range (e.g. a friend's). | Minor disclosure; harmless per the handoff (wrong tokens are rejected). |
| B-17 | S4 | Likely | `rfAdd`, `lrConnect`, `calAdd` and the device pills | On iOS the connect buttons stay visible and answer with an alert. Not dead, but they look usable. | Cosmetic. |

**Verified, no finding**
- **SenBle discipline:** `navigator.bluetooth` appears only inside `SenBle` (4682, 4684); every GATT call in the drivers goes through `link.write`, `link.notify`, `link.chars` or `link.battery`; writes and notification starts are serialised per device by `link.op`; `multicaltest` simulates overlap rejection and passes.
- **Calypso unlock:** own token first, then the others, per-unit `d.reply` (no cross-unit state), locked units stop with the capture hint and no keepalive (`calypsotest` 4). Matches handoff §0/§7.
- **Wind maths:** vector mean across the wrap (359° + 1° → 0°; 3 × 350° + 20° → 357°), window `(now−win, now]`, own average only (field 3 unused), per-station windows, `windField` fed only from live stations — consistent with §9 and segment 1.
- **Rangefinder parse:** uint16 BE × 0.1 m, int8 angle (−16° from `f5 00 2e f0`; 1134.5 m at +5°), as the handoff. Always metres; LOS label shown (the mode can't be detected — documented limitation).
- **LabRadar:** CRC-16 (0x8408, init 0xBEEF, xorout 0xFFFF) as the handoff; V0 read as float32 BE at index 5 (byte 20); only V0 used (owner ruling); stale listeners ignored.
- **Chrono statistics:** sample SD (n−1) and ES/mean match Python `statistics` (0.7000 / 280.50 for 280.5/281.2/279.8); Welford running SD; excluded shots never counted; at least one shot always kept.
- **Wake lock:** released by the browser when hidden, re-acquired on `visibilitychange` → visible.
- **No-BLE fallback:** every device has a manual path (typed wind and compass entry, typed distance and angle, typed or CSV shot string).

---

## D. Fix guidelines for Opus

General: minimal change; device code is tested with simulators that behave like the real units (§21.4) — extend the existing `unit()` / rangefinder / LabRadar simulators rather than writing new ones. All drivers stay on `SenBle`.

**B-01 — stale or lost wind used as live** · patch · Honor check: yes (silent unit, out of range, disconnect)
- Scope (after owner ruling B-1, option (a)+(b) assumed): (1) one 1 s ticker, started when the first Calypso connects and stopped when none is connected, that calls the existing render paths (`updateBleDisplay` without pushing wind, `calRender`, `stnLive`, `devSync`, and `renderQuick` when Home is visible) so every "live / signal lost" text is recomputed by time, not by packets. (2) A single freshness rule `windFresh()` = session unit connected, not locked, `lastWu` younger than 3 s. When `S.wind.source==='calypso'` and it is not fresh: Home status line and the Weather pill show "wind N s old" (warn style); after 30 s the session wind is set to manual with the same value (`Bus.setWind(..., 'manual')`) and a one-line note says so. On disconnect of the session unit, the same at once. (3) `calypsoLive` must not push an average built from a buffer whose newest reading is older than 3 s.
- Simulator scenarios: unit streams, then silent 5 s → pill and Home show "old", windage unchanged; silent 31 s → source manual, note shown; disconnect → note at once; resume streaming → live again. Update `stationtest` B: the fallback must show the stale note when the session unit is also silent.
- Risk: medium (Home rendering at 1 Hz; check `rendertest`, `fieldtest`, `devicetest`, `windavgtest`). Battery: one timer, only while a Calypso is connected.

**B-02 — magnetic vs true bearings** ⚖ (B-2) · minor
- Scope: store a north reference with each bearing source (`compass` = magnetic, `typed` = user's choice, default magnetic) and one declination setting (°E, typed, Settings). Convert typed true bearings to magnetic at input (`m = t − decl`), so all stored bearings are magnetic and the existing maths (where declination cancels) stays untouched. Show "magnetic" next to bearing fields. No online declination lookup (offline-first).
- Simulator/test: windtest — typed true 180° with declination 5° E equals compass 175°; mixed station + target bearings give the same crosswind as all-magnetic.
- Risk: low; Feature Register entry (CORE-14 follow-up).

**B-03 — decimal commas in typed strings** ⚖ (B-9) · patch
- Scope: in `chParseTyped` only: if the text contains whitespace or `;`, split on those and read a comma between digits as a decimal point (`chNum` already does this); otherwise split on commas as today. Also refuse a string where any shot is more than 30 % from the median ("check the string: 5 looks like a split decimal").
- Test (chronotest): `280,5 281,2 279,8` → 3 shots, mean 280.50; `280,281,279` → 3 shots; `280,5,281` (ambiguous, no spaces) → refused by the median check.
- Risk: low.

**B-04 — automatic reconnect** ⚖ (B-4) · minor · Honor check: yes
- Scope: in `SenBle.connect`, keep the `BluetoothDevice`; on `gattserverdisconnected`, if the driver asks for it (`autoReconnect:true`), retry `dev.gatt.connect()` with back-off (2, 5, 10, 30 s, then every 60 s) until the user removes the unit; on success call a driver `onReconnect(link)` that re-runs its own setup (Calypso: notify + unlock + handshake + keepalive; LabRadar: enable + 06 + key; rangefinder: notify). Show "reconnecting…" on the unit's row. Optional: only for Calypso stations first.
- Simulator: drop mid-stream → reconnects without a chooser, exactly one FFF2 listener afterwards (ties to B-08), unlock sent again, stream resumes; removed unit is not reconnected.
- Risk: medium; graduation-style device check (LAB-07 §1 "survives a disconnect and reconnect").

**B-05 — LabRadar series change** ⚖ (B-5) · patch
- Scope: store the series number in the shot string (`chClean` whitelist gets `series` as an integer or null); in `lrShot`, start a new LabRadar string when `d.series` differs from the string's series.
- Simulator (labradartest): event `27` series 57 → 3 shots → event `27` series 58 → next shot starts a new string; same series after a reconnect → continued.
- Risk: low.

**B-06 — keepalive after a long screen-off** · patch · Honor check: required first (B-3)
- Scope (only if the capture shows the unit going idle): on `visibilitychange` → visible, for each connected Calypso whose `lastWu` is older than 3 s, send the unlock and handshake again (`calypsoUnlock` + `CALYPSO_HANDSHAKE`), then the keepalive. No change if the capture shows the stream survives.
- Simulator: unit goes idle when two keepalives are missed (as the handoff describes); after "visible" the app re-handshakes and wind returns.
- Risk: low.

**B-07 — `:WU` validation** · patch
- Scope: in `calypsoParse`, accept a `:WU` only with exactly 6 fields, fields 2–4 matching `/^\d+(\.\d+)?$/`, speed 0–60 m/s, direction 0–360; otherwise ignore it without touching `lastWu`.
- Test (calypsotest): the four payloads from C/B-07 are ignored; a normal sentence split across 20-byte chunks still parses (add the split case — no test has it today).
- Risk: low. If the unit ever sends a different field count (firmware change), wind stops — which B-01 then shows.

**B-08 — listeners after reconnect** · patch
- Scope: in `calPacket`, return when `!CALS.includes(d)` (the same one-line guard the rangefinder has). In `SenBle.connect`, register `gattserverdisconnected` once per `BluetoothDevice` (keep a `WeakSet` of devices already wired, and keep the current link on the device) so reconnects don't stack handlers.
- Simulator: four connects of the same unit → one effective handler per packet (count `calRender` calls), one disconnect handler.
- Risk: low; run `multicaltest`, `rangefindertest`, `labradartest`.

**B-09 — LabRadar resynchronisation** · patch
- Scope: in `lrTake`, on a CRC failure drop one byte and rescan; and if a frame start has been waiting more than 2 s for its claimed length, drop one byte and rescan.
- Simulator (labradartest): the junk header from C/B-09 followed by a real armed frame → the armed frame is read; a real 300-byte response split across notifications still assembles.
- Risk: low.

**B-10 — GATT queue timeout** · patch, optional
- Justification: cheap protection against a stuck operation. In `link.op`, race each operation with a 5 s timeout that rejects (the queue then moves on). Writes without response normally settle in milliseconds.
- Simulator: one write that never resolves → the next keepalive still goes out after 5 s.
- Risk: low; make sure a slow LabRadar write with response isn't cut off (measure on the Honor).

**B-11 — LabRadar key reply missing** · patch
- Scope: after sending `1A`, if `d.key` is still "sending…" after 5 s, set it to "no answer" and show the existing "link silent" note.
- Simulator: unit that never answers `1A` → note within 5 s.
- Risk: low.

**B-12 — compass orientation** ⚖ (B-8) · patch · Honor check: required
- Scope (only if the device check shows an error): compensate alpha with `screen.orientation.angle` (`heading = norm360(360 − alpha − angle)`), and refuse a reading when the phone is tilted more than ~20° from flat (`beta`, `gamma`) with "lay the phone flat".
- Test (windtest): simulated events with orientation angle 90° give the same heading as portrait.
- Risk: low.

**B-13 — chrono MV range** · patch
- Scope: in `useChronoMV`, the same `vchk` rule as the rifle form (`gt 0, max 600`).
- Test: 2800 → refused with the message; 280 → set.

**B-14, B-15, B-16, B-17** · patch, low priority
- B-14: use `new Uint8Array(value.buffer, value.byteOffset, value.byteLength)` in `calPacket`.
- B-15: in `rfFrame`, read every complete 4-byte `F5` frame in a notification (only if B-7 confirms multi-frame notifications; otherwise leave it).
- B-16: optional — send other tokens only after the user confirms "try the codes of your other Calypsos on this unit?".
- B-17: optional — on iOS, replace the connect buttons with a one-line "Bluetooth isn't available on iPhone — enter values by hand" note.

### Simulator gaps (§21.4)

The simulators are good on unlock codes, battery, overlap rejection (multicaltest, rangefinder, LabRadar) and CRC. Missing:
- `calypsotest`'s `unit()` doesn't reject overlapping GATT operations (only `multicaltest`'s does) — make the shared simulator reject them everywhere.
- A unit that **stops streaming while connected** (B-01), and one that **reverts to idle** after missed keepalives (B-06).
- **Reconnect of the same unit** with reused characteristic objects (Chrome's behaviour) for Calypso (B-08); automatic reconnect (B-04).
- **Sentences split across 20-byte chunks** for `:WU` (handoff §4) — only the `:GK` split is simulated; junk and run-together sentences (B-07).
- LabRadar: junk before a frame, a lost notification inside a multi-part response, a missing `9A`, a series change (B-05, B-09, B-11).
- Rangefinder: two frames in one notification (B-15).
- Compass events in landscape and tilted (B-12).

---

## E. Suggested release grouping and order

| Order | Release | Items | Why together |
|---|---|---|---|
| 1 | patch | **B-01**, B-07, B-08, B-14 | Wind freshness: the ticker, the stale rule, valid-sentence-only `lastWu`, one handler per unit. One Calypso test campaign; Honor check with a silent and a disconnected unit. |
| 2 | patch | B-03, B-05, B-09, B-11, B-13 | Chrono and LabRadar data integrity. |
| 3 | patch (after captures) | B-06, B-12, B-15 | Only what the real-device captures (B-3, B-7, B-8) show is needed. |
| 4 | minor | B-02, B-04 | New behaviour: north reference + declination, automatic reconnect. Feature Register entries. |
| 5 | later | B-10, B-16, B-17 | Optional hardening and polish. |

These slot into the combined release sequence after the segment-2 D-01 patch and the injection fixes; I'll merge all five segments into one order at the end.

---

## F. Owner rulings (2026-11-17)

| Question | Ruling | Effect on the plan |
|---|---|---|
| B-1 Stale wind | As recommended | B-01: flag at 3 s ("wind N s old", amber pill), session switches to manual with the last value at 30 s, at once on disconnect. |
| B-2 Typed bearings | Not needed so far; useful as a fallback, or to simulate another location | B-02: bearings stay magnetic by default; add true north + declination as an option for typed bearings. Moved to later (minor). |
| B-3 Long screen-off | Not known (under 10 min tested) | Owner test added to the to-do list; B-06 waits for it. |
| B-4 Station dropouts | Unknown; Calypso is Bluetooth-only (5 m is already a stretch); LoRa boards will allow distance tests | B-04 lower priority; revisit with LAB-06 (LoRa). |
| B-5 New LabRadar series | Start a new string | B-05 confirmed. |
| B-9 Decimal commas | Yes. All formatting should be EU by default, with an option in Settings | B-03 becomes part of a number-format setting (EU default: decimal comma for input and display; alternative: point). App-wide → minor release, Feature Register entry, touches segment 4/5 screens too. The chrono parser fix stays a patch in the meantime. |
