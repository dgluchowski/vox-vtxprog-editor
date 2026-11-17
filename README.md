# `.vtxprog`

The editor runs in the browser at <https://dgluchowski.github.io/vox-vtxprog-editor/>.

A `.vtxprog` file is a VOX Tone Room program bank for the VT20X, VT40X, and VT100X. Other amp families, and the other Tone Room file extensions, are future work. This project is not affiliated with VOX or Korg.

## Abstract

VOX Tone Room stores user programs for the VT20X, VT40X, and VT100X amplifiers in `.vtxprog` files. That format is undocumented, so a program can be edited only inside Tone Room. An outside editor had no reliable way to change a bank the amplifier would load. The objective of this work is to map the format so a browser editor can read and write these banks. Controlled saves in Tone Room moved one control at a time, and the files were diffed so each changed byte could be attributed to that control. Synthetic test programs then locked the mapping by checking the bytes the editor writes. The primary outcome is a verified map of the program parameters and a browser editor built on that map. The editor opens a bank, edits a program from the panel or from a short text description of the tone, and saves a bank Tone Room accepts. The map matters because these programs can now be prepared and revised outside Tone Room.

## Method

Each assignment comes from a Tone Room save that moved one control and left the rest of that region alone, apart from the pedal or reverb setup that control needs.

## File layout

The first 32 bytes are the header. Bytes 0–11 are the constant `VTXPROG1000 ` (the last character is a space). Bytes 12–31 are a 20-byte pad. The editor keeps that pad and writes it back; a new bank stores zeros. Programs follow, packed back to back, 62 bytes each. The program count is `(file length − 32) / 62`.

## Program layout

Bytes 0–15 of a program are the name, space-padded. On load, trailing spaces and null bytes are stripped and embedded null bytes are removed. The editor stores printable ASCII only, at most 16 characters, and the name field shows that text. Bytes 16–61 are the 46 parameters. Parameter N is program byte 16+N.

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

Gold Drive, Treble Boost, RC Turbo, Orange Dist, Fat Dist, Brit Lead, and Fuzz use the Tube OD knob row (parameters 16, 18, 19, 20, 21, and 22). Org Phaser 2 uses the same row as Blk Phaser and Org Phaser 1 (the speed pair, then resonance, manual, and depth). Tape Echo uses the Analog Delay row. Changing pedal type clamps that pedal’s shared bytes into the new type’s ranges and clears bytes the new type does not use. Selecting analog delay or tape echo from any other type starts the time pair at 30 ms. Model names and the per-type knob lists are in [docs/format.md](docs/format.md).

Flanger manual is parameter 27. The save that isolated it turned pedal 2 on and moved that byte from 77 to 100. Gain was 100 on every program in that bank, and the speed pair stayed 200, 0.

## Unassigned

Parameter 1 bits 0, 3, 5, 6, and 7 have no Tone Room control. Parameters 31–38 are unassigned. Parameter 45 is unassigned. The 20 header bytes after the magic are an unassigned pad; the files examined store zeros there. The magic itself is the constant above, not a control.

## Tone descriptions

A description picks an amp from the words in it. “normal” with the family name selects the normal channel: Deluxe CL Normal, Tweed 4x10 Normal, VOX AC30, and Brit 1959 Normal. Cali Elation answers to cali, elation, and bogner. Erupt III CH2 answers to erupt, 5150, and evh. Erupt III CH3 answers to erupt 3, erupt iii, and ch3.

“Tone Room” does not select Room reverb. The word “dry”, and “no reverb”, turn reverb off, including its enable bit. Naming a reverb type, or asking for more reverb, turns that bit on.

Pedal words set the type and turn that pedal on. Comp, chorus, overdrive, tube od, gold drive, klon, treble boost, distortion (Orange Dist), and fuzz are pedal 1. Flanger, phaser (Org Phaser 1), tremolo, tape echo, and delay (Analog Delay) are pedal 2. “overdrive special” stays the amp. “pre-delay” stays the reverb control. Bright cap, low cut, and mid boost turn those switches on, or off when the phrase says no or off. Cold, hot, and standard bias write parameter 13. An explicit class A or class AB writes 0 or 1 after any class change that came from the amp.

A 0–10 knob position is stored times ten. A number above 10 is the stored byte, clamped to 0–100. Pre-delay is the stored byte, clamped to 0–70. “call it … and …” stops the name at the conjunction. A description that starts from Empty, and does not name the program, gets a short title instead of Empty.

## Check

```bash
npm install
npm test
npm run typecheck
npm run lint
NODE_ENV=production npm run build
```

`npm test` builds synthetic programs that lock these byte writes. It does not open Tone Room. `npm run build` forces a production build. `npm start` serves that static export. Details are in [docs/tests.md](docs/tests.md).

Licensed under the [MIT License](LICENSE).

UI components in `src/components/ui/` are generated with shadcn/ui (MIT, © shadcn) on top of Base UI (MIT). Fonts (Fraunces, Geist, Geist Mono) are SIL Open Font License 1.1 and are loaded through `next/font/google`.
