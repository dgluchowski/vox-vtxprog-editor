# Check

From the repository root, after `npm install`:

```bash
npm test
npm run typecheck
npm run lint
NODE_ENV=production npm run build
```

`npm test` runs `npm run check`, which runs `scripts/check-vtx.ts` with `tsx`. `npm run typecheck` runs `tsc --noEmit`. `npm run build` forces `NODE_ENV=production` before `next build`. `npm start` serves the static export in `out` at <http://127.0.0.1:4179/vox-vtxprog-editor/>. It does not run `next start`, which cannot host an exported site.

The script shapes a few tone descriptions from a blank program, rejects a file that is too short to be a bank, and builds synthetic programs that lock the bytes the editor writes:

- Parameters 7, 8, and 9 are volume, tone/presence, and resonance.
- Chorus speed is little-endian millihertz at 16–17. Depth, manual, and mix are 18, 19, and 20.
- Pedal 2 speed and delay time are the little-endian pair at 24–25.
- Flanger manual is parameter 27, and writing it leaves the speed pair alone.
- A constructed program round-trips, the header pad stays zero, and parameters 31–38 and 45 stay zero.
- A non-zero 20-byte header pad round-trips. A bank with no pad writes zeros.
- A name with embedded nulls, trailing nulls, and trailing spaces decodes to the visible text. `sanitizeProgramName` keeps printable ASCII and at most 16 characters.
- `switchEffectType` keeps every knob byte in range for Chorus → Comp, Tube OD → Chorus, and Tape Echo → Tremolo → Analog Delay. The last step starts the delay at 30 ms. The other pedal’s bytes stay put.
- Amp hints resolve boutique clean once, plus Cali Elation, Erupt III CH2, Erupt III CH3, and the normal-channel models.
- “effects from” copies the pedal and reverb enable bits and leaves the other bits of parameter 1, bias, class, and parameters 31–38 and 45 alone.
- “Tone Room” does not select Room. “dry” and “no reverb” clear the reverb enable bit. “drying” does not. A named reverb and “more reverb” set the bit.
- Pedal words enable Comp, Chorus, Tube OD, Gold Drive, Treble Boost, Orange Dist, Fuzz, Flanger, Org Phaser 1, Tremolo, Tape Echo, and Analog Delay. “overdrive special” and “pre-delay” do not.
- Bright cap, low cut, mid boost, bias, and class A/AB write those controls. An explicit class wins over the AC30 class rule.
- Gain 5 and gain 50 both store 50. Gain 10 stores 100. Reverb mix and time use that same rule. Pre-delay 7 stores 7 and pre-delay 80 stores 70.
- “call it Night Drive and …” names the program Night Drive. A long description that starts from Empty gets a title of 16 characters or fewer.
- `describeProgram` names a pedal only when that pedal’s enable bit is on.
- `parseVtx` rejects a bad magic, a body that is not a whole number of 62-byte programs, and a file that is too short.
- `writeVtx` rejects an empty bank, a program whose parameter list is not 46 bytes, and a parameter outside 0–255, including a fractional value.
- `downloadName` turns “My Bank.vtxprog” into `My_Bank.vtxprog` and falls back to `tone-bank.vtxprog`. `slotLabel` names banks A and B through channel 4, then extra slots.

The script does not open Tone Room, and it does not send a program to an amp.
