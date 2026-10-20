# Mapping experiments

The mapping banks start from one chain: comp, flanger, room, VOX AC30, both pedals off, reverb off. A preset turns on the pedal or reverb under test, selects the type when the type is part of the question, and changes the control named in the program. Mapping7 and Mapping8 allow one change in each region on the same preset (one pedal-1 change, one pedal-2 change, one amp change, one reverb change). Two unknowns on the same pedal are not part of that method.

This repo has **eight** controlled fixture files. Mapping6 is not one of them.

| File | Programs | What it contributes |
| --- | ---: | --- |
| `fixtures/Mapping.vtxprog` | 11 | One type id per program: Treble Boost, Orange Dist, Fat Dist, BLK Phaser, and amp ids 2, 3, 11, 12, 13, 14, 15. Treble Boost and BLK Phaser also store flanger speed byte 24 as 100 instead of the baseline 200. |
| `fixtures/Mapping2.vtxprog` | 11 | Erupt III CH3, Brit Lead, RC Turbo, bright cap, mid boost, low cut. `L+H Damp max` and `L+H Damp Min` move both damp bytes, with reverb enabled. Three trailing programs stay on the baseline. |
| `fixtures/Mapping3.vtxprog` | 11 | Low damp and high damp swapped against each other, noise reduction at 0 and 100, pre delay at its maximum (stored 70). Six trailing programs stay on the baseline. |
| `fixtures/Mapping4.vtxprog` | 11 | Comp voice 0, 1, and 2, chorus low cut and high cut, flanger low cut and high cut, and the pedal-on bits (`Comp ON` adds 2, `Flanger ON` adds 4). |
| `fixtures/Mapping5.vtxprog` | 11 | One pedal-2 knob set to 10, with pedal 2 on. Analog delay mod speed and mod depth, tremolo depth, duty, shape, and level, Blk Phaser resonance, manual, and depth. Tremolo speed 10 and Blk Phaser speed 10 store 16 and 39. |
| `fixtures/Mapping7.vtxprog` | 11 | One change per region: Tube OD’s six knobs, comp sens, level, and attack, chorus `Ch0` and speed 2, six tremolo speeds, five Blk Phaser speeds (0.100, 1, 2, 5, and 8), resonance, bias cold, bias hot, class AB, seven amp ids, and the five reverb edits. |
| `fixtures/Mapping8.vtxprog` | 11 | Chorus speeds 5, 8, and 10, chorus depth, manual, and mix, Blk Phaser speed 9, Org Phaser 1’s four knobs, flanger speeds and depth, Gold Drive and Fuzz type ids, and amp ids 10, 17, 18, and 19. |
| `fixtures/Mapping9.vtxprog` | 11 | Pedal 2 only. Flanger manual and resonance, four analog delay times, delay level, feedback, and tone, Org Phaser 2, and Tape Echo. |

`scripts/check-vtx.ts` locks each of these files program by program. The expected arrays are the bytes those saves contained.

## Not fixtures

- Mapping6 was an amp-knob upload. It is not committed. Do not add it under that name.
- `tone-room-check.vtxprog` and `speed-ladder.vtxprog` were generated for a Tone Room pass. No results have come back. They are not in `fixtures/`.
- `USERBANK.vtxprog` from a Tone Room install is eight slots named USER A-1 through USER B-4. It is not in this repo. The factory picture-list names are not in this repo either.

The example banks under `public/banks` are Marcos Moura’s programs. They are round-tripped and range-checked. They are not single-control experiments.

## Where a preset moves more than one control

Mapping7 and Mapping8 are one change per region, so a single program can move a pedal-1 byte, a pedal-2 byte, the amp, and reverb together. The amp-only and pedal-only bytes are still separated by which region was edited.

These programs also move an extra byte inside the region under test:

- Mapping `Treble Boost` and `BLK Phaser` change the type and store speed byte 24 as 100.
- Mapping2 `L+H Damp max` and `L+H Damp Min` move both damp knobs.
- Mapping3 `LD 0 HD 10` and `LD 10 HD 0` move both damp knobs. That pair is how the two bytes were told apart.
- Mapping9 `FlM` moves flanger manual and speed. Depth and resonance stay put. The details are in [Still open](format.md#still-open).
- Chorus `Ch0` stores 100 in byte 16. That value is also what a 0–10 knob stores at 10, and the minimum position was not confirmed.

Selecting analog delay sets the time bytes to 30 and 0 on the programs that then turn a different delay knob. That 30 ms write is the type’s own default, recorded alongside the knob those programs actually turn.
