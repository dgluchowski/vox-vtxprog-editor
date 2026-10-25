# `.vtxprog`

The editor runs in the browser at <https://dgluchowski.github.io/vox-vtxprog-editor/>.

A `.vtxprog` file is a VOX Tone Room program bank for the VT20X, VT40X, and VT100X. Other amp families, and the other Tone Room file extensions, are future work. This project is not affiliated with VOX or Korg.

## Abstract

VOX Tone Room stores user programs for the VT20X, VT40X, and VT100X as `.vtxprog` banks. This work recovers the bank layout and the control-to-byte map from files Tone Room writes, so that a browser editor can open a bank, rewrite one program from the panel controls or from a short tone description, and save a file Tone Room can open. The map was produced by reverse engineering: each assignment comes from a Tone Room save that moved one control and left the rest of that region unchanged, apart from the pedal or reverb setup that control needs, so that bytes outside that required setup can be attributed to the control that moved. Synthetic programs then lock the bytes the editor writes, as a repository check on those writes alone. The banks examined use a 32-byte header, the constant `VTXPROG1000` with its trailing space and a 20-byte pad, followed by contiguous 62-byte programs of a 16-byte name and a 46-byte parameter block, and the program count follows from the file length. Knobs marked 0–10 are stored at ten times the marked position, modulation speed and delay time are two-byte unsigned little-endian counts in millihertz and milliseconds, and amp, pedal, reverb, bias, and class fields store identifiers, while some bytes remain unassigned to a Tone Room control. The measured assignments are the bytes the editor writes, which is what lets a described tone become a `.vtxprog` bank Tone Room can open.

## Method

Each assignment comes from a Tone Room save that moved one control and left the rest of that region alone, apart from the pedal or reverb setup that control needs.

## File layout

The first 32 bytes are the header. Bytes 0–11 are the constant `VTXPROG1000 ` (the last character is a space). Bytes 12–31 are a 20-byte pad. Programs follow, packed back to back, 62 bytes each. The program count is `(file length − 32) / 62`.

## Program layout

Bytes 0–15 of a program are the name, space-padded. Bytes 16–61 are the 46 parameters. Parameter N is program byte 16+N.

A 0–10 knob stores that position times ten. Pre-delay is the exception: its maximum stores 70. Switches store 0 or 1. Amp, pedal, reverb, bias, and class store ids.

Modulation speed (chorus, flanger, phaser, tremolo) is little-endian millihertz. 0.100 Hz is 100 and 0. 1 Hz is 232 and 3. 1.650 Hz is 114 and 6. 2 Hz is 208 and 7. 10 Hz is 16 and 39. Flanger speed max is 5 Hz. Tremolo speed floor is 1.650 Hz. Delay time is little-endian milliseconds. 100 ms is 100 and 0. 300 ms is 44 and 1. 1200 ms is 176 and 4.

## Parameters

| Parameter | Control |
| --- | --- |
| 0 | Noise reduction |
| 1, +2 | Pedal 1 on |
| 1, +4 | Pedal 2 on |
| 1, +16 | Reverb on |
| 2 | Amp model, ids 0–19 |
| 3 | Gain |
| 4 | Treble |
| 5 | Middle |
| 6 | Bass |
| 7 | The 5.0 knob. The editor labels it Volume on every amp |
| 8 | The 2.0 knob. Tone on AC30 and AC30TB, Presence on the other models |
| 9 | Resonance, the 7.5 knob |
| 10 | Bright cap. 0 off, 1 on |
| 11 | Low cut. 0 off, 1 on |
| 12 | Mid boost. 0 off, 1 on |
| 13 | Bias. 0 standard, 1 cold, 2 hot |
| 14 | Power-amp class. 0 class A, 1 class AB |
| 15 | Pedal 1 type, ids 0–9 |
| 16 | Comp sensitivity. Drive gain on Tube OD and the other drive types |
| 16–17 | Chorus speed, little-endian millihertz |
| 18 | Comp level. Drive tone. Chorus depth |
| 19 | Comp attack. Drive level. Chorus manual |
| 20 | Comp voice, stored 0–2. Drive treble. Chorus mix |
| 21 | Chorus low cut. Drive middle |
| 22 | Chorus high cut. Drive bass |
| 23 | Pedal 2 type, ids 0–6 |
| 24–25 | Pedal 2 speed (millihertz) or delay time (milliseconds), little-endian, depending on the pedal (one pair, not both at once) |
| 26 | Flanger depth. Phaser resonance. Tremolo depth. Delay level |
| 27 | Flanger manual. Phaser manual. Tremolo duty. Delay feedback |
| 28 | Flanger low cut. Phaser depth. Tremolo shape. Delay tone |
| 29 | Flanger high cut. Tremolo level. Delay mod speed |
| 30 | Flanger resonance. Delay mod depth |
| 39 | Reverb type. 0 room, 1 spring, 2 hall, 3 plate |
| 40 | Reverb mix |
| 41 | Reverb time |
| 42 | Reverb pre-delay |
| 43 | Reverb low damp |
| 44 | Reverb high damp |

Selecting VOX AC30 or VOX AC30TB writes class A (parameter 14 = 0). Selecting a different model after either of those writes class AB (parameter 14 = 1). The Power amp control stays editable on both models, and on every other model, and a direct change writes 0 or 1. A tone description does the same class write when it changes the amp to or from those two models.

Gold Drive, Treble Boost, RC Turbo, Orange Dist, Fat Dist, Brit Lead, and Fuzz use the Tube OD knob row (parameters 16, 18, 19, 20, 21, and 22). Org Phaser 2 uses the same row as Blk Phaser and Org Phaser 1 (the speed pair, then resonance, manual, and depth). Tape Echo uses the Analog Delay row. Model names and the per-type knob lists are in [docs/format.md](docs/format.md).

Flanger manual is parameter 27. The save that isolated it turned pedal 2 on and moved that byte from 77 to 100. Gain was 100 on every program in that bank, and the speed pair stayed 200, 0.

## Unassigned

Parameter 1 bits 0, 3, 5, 6, and 7 have no Tone Room control. Parameters 31–38 are unassigned. Parameter 45 is unassigned. The 20 header bytes after the magic are an unassigned pad; the files examined store zeros there. The magic itself is the constant above, not a control.

## Check

```bash
npm install
npm run check
npm run typecheck
```

`npm run check` builds synthetic programs that lock these byte writes. It does not open Tone Room. Details are in [docs/tests.md](docs/tests.md).

Licensed under the [MIT License](LICENSE).
