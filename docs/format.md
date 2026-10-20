# `.vtxprog` format

Scope: Tone Room banks for the VT20X, VT40X, and VT100X. The ids below are the ones the fixture files lock. Knob names come from those saved banks. A round trip of the bytes is a separate check, described in [tests.md](tests.md).

## File layout

| Region | Size | Contents |
| --- | ---: | --- |
| Header | 32 bytes | ASCII `VTXPROG1000 ` (12 bytes, including the trailing space), then zero padding |
| Program | 62 bytes | 16-byte name, then 46 parameter bytes |
| Rest of file | 62 × N | Programs back to back. N is `(file length − 32) / 62` |

The name is space-padded. The editor keeps characters in the printable ASCII range and stores at most 16 of them. The amp’s own user bank is eight programs: bank A and bank B, four channels each. A file can carry extra programs after those eight. The editor keeps them.

Parameter indexes below are into the 46-byte block (`params[0]` … `params[45]`).

## Amp model (byte 2)

Tone Room’s list has 20 models, ids 0 through 19. Each id below is the value stored by a named program in `fixtures/`.

| Id | Model | Locked by |
| ---: | --- | --- |
| 0 | Deluxe CL Vibrato | Mapping7 `OdM Tm8 DxV Rtm` |
| 1 | Deluxe CL Normal | Mapping7 `OdB Tm9 DxN` |
| 2 | Tweed 4x10 Bright | Mapping `T4x10 Bright` |
| 3 | Tweed 4x10 Normal | Mapping `T4x10 Normal` |
| 4 | Boutique CL | Mapping7 `CmS PhF BCL` |
| 5 | Boutique OD | Mapping7 `CmL Ph1 BOD` |
| 6 | VOX AC30 | Baseline of every mapping file. Mapping7 `OdTr Tm5 Cls Rmx` stores class AB on this id |
| 7 | VOX AC30TB | Mapping7 `CmA Ph2 A30T` |
| 8 | Brit 1959 Treble | Mapping7 `Ch0 Ph5 B59T` |
| 9 | Brit 1959 Normal | Mapping7 `Ch2 Ph8 B59N` |
| 10 | Brit 800 | Mapping8 `Ch5 Ph9 B800` (class byte stays 0) |
| 11 | Brit VM | Mapping `Brit VM` |
| 12 | SL-OD | Mapping `SL-OD` |
| 13 | Double Rec | Mapping `Double Rec` |
| 14 | Cali Elation | Mapping `Cali Elation` |
| 15 | Erupt III CH2 | Mapping `Erupt III Ch2` |
| 16 | Erupt III CH3 | Mapping2 `Erupt III Ch3` |
| 17 | Boutique Metal | Mapping8 `Ch8 O1S BMt` |
| 18 | Brit OR MkII | Mapping8 `Ch10 O1R OR2` |
| 19 | Original Clean | Mapping8 `ChD O1M OCl` |

## Parameter bytes

“Locked” means a committed fixture stores that value when the named control is the change in that region. Setup that goes along with a type change (pedal on, reverb on, the type id itself) is noted in [experiments.md](experiments.md).

| Bytes | What the fixtures show |
| --- | --- |
| 0 | Noise reduction. Mapping3 stores 0 and 100. |
| 1 | Enable. Pedal 1 on adds 2, pedal 2 on adds 4, reverb on adds 16. The checker accepts 0, 2, 4, 6, 16, 18, 20, and 22. |
| 2 | Amp model, 0–19. See the table above. |
| 3–6 | Baseline 50 in every mapping fixture. No committed preset turns these. The editor labels them gain, treble, middle, and bass. |
| 7–8 | Baseline 50 and 20 in every committed fixture. No committed preset turns them. |
| 9 | Resonance on the Mapping7 preset that moves it from 75 to 100. Bytes 7 and 8 stay 50 and 20 on that preset. |
| 10 | Bright cap. 0 off, 1 on. |
| 11 | Low cut. 0 off, 1 on. |
| 12 | Mid boost. 0 off, 1 on. |
| 13 | Bias. Baseline 0. Mapping7 stores cold as 1 and hot as 2 on VOX AC30. |
| 14 | Power amp. Baseline 0 (class A). Mapping7 stores class AB as 1 on VOX AC30 (amp id stays 6). |
| 15 | Pedal 1 type, 0–9. |
| 16–22 | Pedal 1 knobs. Layout depends on the type. See below. |
| 23 | Pedal 2 type, 0–6. |
| 24–30 | Pedal 2 knobs. Layout depends on the type. Speed and delay time use bytes 24 and 25 together. |
| 31–38, 45 | 0 in every file the checker reads. No Tone Room control was aimed at them. |
| 39 | Reverb type. 0 room (baseline), 1 spring, 2 hall, 3 plate. |
| 40 | Reverb mix. Mapping7 stores 100 on its own program. Baseline 75. |
| 41 | Reverb time. Mapping7 stores 100 on its own program. Baseline 45. |
| 42 | Pre delay. Mapping3 stores 70 at the maximum setting. |
| 43 | Low damp. A setting of 10 stores 100. The order against high damp is the Mapping3 swap. |
| 44 | High damp. A setting of 10 stores 100. |

On the knobs that were turned to 10, the file stores 100. Pre delay is the exception above: the maximum setting stores 70. Speed and delay time do not use the ×10 rule.

The editor still draws byte 7 as Presence, byte 8 as Resonance, and byte 9 as Volume. Mapping7 puts the resonance move on byte 9. See [Still open](#still-open).

## Pedal 1 types (byte 15)

Stored order: Comp, Chorus, Tube OD, Gold Drive, Treble Boost, RC Turbo, Orange Dist, Fat Dist, Brit Lead, Fuzz.

| Id | Type | How it was recorded |
| ---: | --- | --- |
| 0 | Comp | Baseline chain. Sens, level, and attack go to 100 on Mapping7. Voice is Mapping4. |
| 1 | Chorus | Mapping4 cuts, Mapping7 and Mapping8 speed and mix knobs. |
| 2 | Tube OD | Mapping7. The only drive whose six knobs were turned. |
| 3 | Gold Drive | Mapping8. Type id only. |
| 4 | Treble Boost | Mapping. Type id only. That program also stores flanger speed byte 24 as 100. |
| 5 | RC Turbo | Mapping2. Type id only. |
| 6 | Orange Dist | Mapping. Type id only. |
| 7 | Fat Dist | Mapping. Type id only. |
| 8 | Brit Lead | Mapping2. Type id only. |
| 9 | Fuzz | Mapping8. Type id only. |

Tube OD knobs, each set to 100 on its own Mapping7 program: drive 16, tone 18, level 19, treble 20, middle 21, bass 22. Byte 17 stays 0. The editor labels byte 16 Gain.

Comp on Mapping7: sens 16, level 18, attack 19, each to 100. Voice stays 1. Mapping4 stores voice 1, 2, and 3 as 0, 1, and 2 on byte 20.

Chorus: speed is the pair in bytes 16 and 17 (samples below). Depth to 10 stores 100 in byte 18. Manual to 10 stores 100 in byte 19. Mix to 10 stores 100 in byte 20. Low cut is byte 21 and high cut is byte 22 (Mapping4). The editor still places depth, manual, and mix on bytes 17, 18, and 19.

Gold Drive, Treble Boost, RC Turbo, Orange Dist, Fat Dist, Brit Lead, and Fuzz are assumed to share the Tube OD block. Only Tube OD was swept. Gold Drive and Fuzz are type-id recordings: the type byte changes and bytes 16–22 stay on the baseline.

## Pedal 2 types (byte 23)

Stored order: Flanger, Blk Phaser, Org Phaser 1, Org Phaser 2, Tremolo, Tape Echo, Analog Delay.

| Id | Type | How it was recorded |
| ---: | --- | --- |
| 0 | Flanger | Baseline, plus Mapping4 cuts and Mapping8–9 knobs. |
| 1 | Blk Phaser | Mapping type id. Mapping5 and Mapping7–8 knobs. |
| 2 | Org Phaser 1 | Mapping8. Speed, resonance, manual, and depth landed on the same bytes as Blk Phaser. |
| 3 | Org Phaser 2 | Mapping9. Type id only. Speed bytes are 100 and 0. No knob was set to 100. |
| 4 | Tremolo | Mapping5 and Mapping7. |
| 5 | Tape Echo | Mapping9. Type id only. Time bytes are 30 and 0. No knob was set to 100. |
| 6 | Analog Delay | Mapping5 mod knobs. Mapping9 time, level, feedback, and tone. |

Flanger: depth 26, manual 27, low cut 28, high cut 29, resonance 30. Resonance (Mapping9 `FlR`) is a clean single move to 100, with speed left at 200 and 0. Manual (Mapping9 `FlM`) stores 100 in byte 27 and also moves speed from 200/0 to 100/0. Depth stays 50 and resonance stays 35 on `FlM`, which is why byte 27 is still the manual byte.

Blk Phaser and Org Phaser 1: resonance 26, manual 27, depth 28, each stored as 100 on its own program. Org Phaser 2 was not given that knob pass.

Tremolo: depth 26, duty 27, shape 28, level 29.

Analog delay: level 26, feedback 27, tone 28, mod speed 29, mod depth 30. Time is bytes 24 and 25 (below). Selecting the type sets 30 ms before the time presets move it. Tape Echo is assumed to share this block. It was type-id only.

## Speed pairs (bytes 24–25, chorus 16–17)

These are the pairs the fixtures actually store. They are samples. There is no formula here that generates every UI value.

| UI value | Stored pair | Where it shows up |
| --- | --- | --- |
| Tremolo 1.650 Hz | 114, 6 | Mapping7, and Mapping5 programs that leave tremolo speed alone |
| Tremolo 3 | 184, 11 | Mapping7 |
| Tremolo 5, phaser 5, flanger 5, chorus 5 | 136, 19 | Mapping7, Mapping8 |
| Tremolo 7 | 88, 27 | Mapping7 |
| Tremolo 8, phaser 8, chorus 8 | 64, 31 | Mapping7, Mapping8 |
| Tremolo 9, phaser 9 | 40, 35 | Mapping7, Mapping8 |
| Speed 10 (tremolo, Blk Phaser, Org Phaser 1, chorus) | 16, 39 | Mapping5, Mapping8 |
| Phaser or Org Phaser 1 at 0.100 Hz | 100, 0 | Mapping7 `CmS PhF BCL`, Mapping8 programs that leave Org Phaser 1 speed alone |
| Phaser 1, flanger 1 | 232, 3 | Mapping7, Mapping8 |
| Phaser 2, flanger 2, chorus 2 | 208, 7 | Mapping7, Mapping8 |
| Flanger 3 | 184, 11 | Mapping8 |
| Flanger 0.100 Hz | 100, 0 | Mapping8 `ChMix FlF` |
| Flanger opening value | 200, 0 | `FlD` and `FlR`. This is the value those programs left in place. It is the 0.200 Hz opening, and the 0.100 Hz floor is the row above |

Chorus programs that do not turn speed (`ChD`, `ChM`, `ChMix`) keep bytes 16 and 17 at 50 and 0, the same numbers as the comp baseline. Chorus `Ch0` stores 100 and 0. That lock is unverified as a minimum. See [Still open](#still-open).

The editor still writes speed as one knob on byte 24 (or byte 16 for chorus).

## Delay time (bytes 24–25)

Analog delay time is a little-endian millisecond count.

| Time | Byte 24 | Byte 25 |
| ---: | ---: | ---: |
| 30 ms (type default) | 30 | 0 |
| 100 ms | 100 | 0 |
| 255 ms | 255 | 0 |
| 300 ms | 44 | 1 |
| 1200 ms | 176 | 4 |

The editor’s delay time knob is a single byte with a maximum of 255.

## Still open

- Preset `Ch0` (“chorus speed fully down”) stores byte 16 as 100 and leaves byte 17 at 0. `assertMapping7File` locks that pair. A knob at 10 also stores 100. Damian has not confirmed the chorus speed knob was at its minimum. That floor lock is unverified.
- Mapping9 `FlM` stores flanger manual as 100 on byte 27 and also moves speed from 200/0 to 100/0. It is not a pure single-variable preset. Manual is still identified because depth (byte 26) stays 50 and resonance (byte 30) stays 35.
- `tone-room-check.vtxprog` and `speed-ladder.vtxprog` were generated for a Tone Room pass. Results have not come back. They are not fixtures in this repo.
- Mapping6 was an amp-knob upload and was not committed. There is no Mapping6 fixture. Bytes 7 and 8 are untouched in every committed mapping file.
- The Tone Room install’s `USERBANK.vtxprog` is eight slots named USER A-1 through USER B-4. That file does not contain the factory picture-list names. This repo does not include `USERBANK.vtxprog`, and it does not include those picture-list programs.
- Tube OD is the only drive whose six knobs were turned. Gold Drive, Treble Boost, RC Turbo, Orange Dist, Fat Dist, Brit Lead, and Fuzz are assumed to share that block. Gold Drive and Fuzz were recorded as type ids only.
- Org Phaser 2 and Tape Echo were recorded as type ids only. Org Phaser 2 is assumed to share the Blk Phaser knob order. Tape Echo is assumed to share the analog delay block.
- Speed encoding in the fixtures is sampled pairs, such as 5 → 136/19 and 10 → 16/39. That is not a proved formula for every UI value.
- Unnamed bits in the enable byte have no Tone Room control. They stay unknown. The checker only accepts combinations of the three known bits.
- `npm run check` proves `parseVtx(writeVtx(bytes))` matches, including the mapping fixtures’ expected arrays. It does not, by itself, prove a byte is the knob Tone Room displays. Those names come from the saved banks.
- Amp bytes 3–6 stay at 50 in every mapping fixture. No committed preset turns gain, treble, middle, or bass.
- The bench still labels byte 7 Presence, byte 8 Resonance, and byte 9 Volume. Mapping7 stores the resonance move on byte 9. Chorus depth, manual, and mix are bytes 18, 19, and 20 in the fixtures; the bench still uses 17, 18, and 19, and it still treats speed and delay time as one byte.
- The bench labels bias value 0 as Standard. The Mapping7 baseline for that byte is the Off position (stored 0), with Cold as 1 and Hot as 2.
