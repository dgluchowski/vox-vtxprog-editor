# `.vtxprog` format

Scope: Tone Room banks for the VT20X, VT40X, and VT100X. Other amp families are future work. The editor writes this map. Knob names are the Tone Room labels from the single-variable saves.

## File layout

| Region | Size | Contents |
| --- | ---: | --- |
| Header | 32 bytes | ASCII `VTXPROG1000 ` (12 bytes, including the trailing space), then a 20-byte pad |
| Program | 62 bytes | 16-byte name, then 46 parameter bytes |
| Rest of file | 62 × N | Programs back to back. N is `(file length − 32) / 62` |

The name is space-padded. The editor keeps characters in the printable ASCII range and stores at most 16 of them. The amp’s user bank is eight programs. A file can carry more, and the editor keeps them.

Parameter indexes below are into the 46-byte block.

## Scales

A 0–10 knob is stored times ten, so 10 is 100. Pre-delay does not use that scale: the maximum stores 70. Switches are 0 or 1. Types, bias, and class are ids.

Modulation speed is an unsigned little-endian millihertz count in two bytes.

| Hz | Stored pair |
| ---: | --- |
| 0.100 | 100, 0 |
| 0.200 | 200, 0 |
| 1 | 232, 3 |
| 1.650 | 114, 6 |
| 2 | 208, 7 |
| 5 | 136, 19 |
| 10 | 16, 39 |

Delay time is an unsigned little-endian millisecond count.

| Time | Byte 0 | Byte 1 |
| ---: | ---: | ---: |
| 30 ms | 30 | 0 |
| 100 ms | 100 | 0 |
| 300 ms | 44 | 1 |
| 1200 ms | 176 | 4 |

Chorus speed uses parameters 16 and 17, range 0.100–10 Hz. Flanger speed uses 24 and 25, range 0.100–5 Hz. Phaser speed uses the same pair, range 0.100–10 Hz. Tremolo speed uses it from 1.650 Hz to 10 Hz. Analog delay and tape echo time use it from 30 ms to 1200 ms.

## Amp model (parameter 2)

| Id | Model |
| ---: | --- |
| 0 | Deluxe CL Vibrato |
| 1 | Deluxe CL Normal |
| 2 | Tweed 4x10 Bright |
| 3 | Tweed 4x10 Normal |
| 4 | Boutique CL |
| 5 | Boutique OD |
| 6 | VOX AC30 |
| 7 | VOX AC30TB |
| 8 | Brit 1959 Treble |
| 9 | Brit 1959 Normal |
| 10 | Brit 800 |
| 11 | Brit VM |
| 12 | SL-OD |
| 13 | Double Rec |
| 14 | Cali Elation |
| 15 | Erupt III CH2 |
| 16 | Erupt III CH3 |
| 17 | Boutique Metal |
| 18 | Brit OR MkII |
| 19 | Original Clean |

AC30 and AC30TB store class A (parameter 14 = 0). Class AB is 1 on the other models that expose it.

## Parameters

| Parameter | Control |
| --- | --- |
| 0 | Noise reduction. 0 and 100 are the ends of the 0–10 knob. |
| 1, +2 | Pedal 1 on |
| 1, +4 | Pedal 2 on |
| 1, +16 | Reverb on |
| 2 | Amp model, 0–19 |
| 3 | Gain |
| 4 | Treble |
| 5 | Middle |
| 6 | Bass |
| 7 | The knob that reads 5.0. On AC30 that label is Volume. |
| 8 | The knob that reads 2.0. Tone on AC30 and AC30TB. Presence on the other models. |
| 9 | The knob that reads 7.5. Resonance. |
| 10 | Bright cap. 0 off, 1 on |
| 11 | Low cut. 0 off, 1 on |
| 12 | Mid boost. 0 off, 1 on |
| 13 | Bias. 0 standard, 1 cold, 2 hot |
| 14 | Power-amp class. 0 class A, 1 class AB |
| 15 | Pedal 1 type, 0–9 |
| 16 | Comp sensitivity. Drive gain |
| 16–17 | Chorus speed, little-endian millihertz |
| 18 | Comp level. Drive tone. Chorus depth |
| 19 | Comp attack. Drive level. Chorus manual |
| 20 | Comp voice, stored 0, 1, 2 for voices 1, 2, 3. Drive treble. Chorus mix |
| 21 | Chorus low cut. Drive middle |
| 22 | Chorus high cut. Drive bass |
| 23 | Pedal 2 type, 0–6 |
| 24–25 | Pedal 2 speed (millihertz) or delay time (milliseconds), little-endian |
| 26 | Flanger depth. Phaser resonance. Tremolo depth. Delay level |
| 27 | Flanger manual. Phaser manual. Tremolo duty. Delay feedback |
| 28 | Flanger low cut. Phaser depth. Tremolo shape. Delay tone |
| 29 | Flanger high cut. Tremolo level. Delay mod speed |
| 30 | Flanger resonance. Delay mod depth |
| 39 | Reverb type. 0 room, 1 spring, 2 hall, 3 plate |
| 40 | Reverb mix |
| 41 | Reverb time |
| 42 | Reverb pre-delay. Maximum is 70 |
| 43 | Reverb low damp |
| 44 | Reverb high damp |

Parameters 7, 8, and 9 were each moved on their own, from 50, 20, and 75 to 100. Chorus depth, manual, and mix were each moved to 100 at 18, 19, and 20. The speed pair stayed 50, 0 on those three saves, and parameters 21 and 22 stayed off.

Flanger manual is parameter 27. The isolating save turned pedal 2 on and moved 77 to 100. Depth stayed 50, resonance stayed 35, and the speed pair stayed 200, 0 (0.200 Hz). Gain was 100 on every program in that bank.

## Pedal 1 (parameter 15)

Stored order: Comp, Chorus, Tube OD, Gold Drive, Treble Boost, RC Turbo, Orange Dist, Fat Dist, Brit Lead, Fuzz.

Tube OD knobs, each taken to 100 on its own save: drive 16, tone 18, level 19, treble 20, middle 21, bass 22. Comp uses sensitivity 16, level 18, attack 19, and voice 20. Chorus is the row in the table above.

Gold Drive, Treble Boost, RC Turbo, Orange Dist, Fat Dist, Brit Lead, and Fuzz share the Tube OD row. The type id is its own byte. The knob sweep is the Tube OD sweep.

## Pedal 2 (parameter 23)

Stored order: Flanger, Blk Phaser, Org Phaser 1, Org Phaser 2, Tremolo, Tape Echo, Analog Delay.

Flanger: speed pair 24–25, depth 26, manual 27, low cut 28, high cut 29, resonance 30. Blk Phaser and Org Phaser 1: speed pair, resonance 26, manual 27, depth 28. Org Phaser 2 uses that same row. Tremolo: speed pair, depth 26, duty 27, shape 28, level 29. Analog delay: time pair 24–25, level 26, feedback 27, tone 28, mod speed 29, mod depth 30. Tape Echo uses that row. Selecting analog delay or tape echo starts the time pair at 30 ms.

## Unassigned

Parameter 1 bits 0, 3, 5, 6, and 7 have no Tone Room control. The saves use 0, 2, 4, 6, 16, and 22, which are combinations of pedal 1, pedal 2, and reverb. Parameters 31–38 are unassigned. Parameter 45 is unassigned. The 20-byte header pad is unassigned. Those pad bytes, parameters 31–38, and parameter 45 are zero in the programs examined. The 12-byte magic is a constant, not a control.
