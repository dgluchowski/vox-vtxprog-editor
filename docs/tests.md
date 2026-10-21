# Check

From the repository root, after `npm install`:

```bash
npm run check
npm run typecheck
```

`npm run check` runs `scripts/check-vtx.ts` with `tsx`. `npm run typecheck` runs `tsc --noEmit`.

The script shapes a few tone descriptions from a blank program, rejects a file that is too short to be a bank, and builds synthetic programs that lock the bytes the editor writes:

- Parameters 7, 8, and 9 are volume, tone/presence, and resonance.
- Chorus speed is little-endian millihertz at 16–17. Depth, manual, and mix are 18, 19, and 20.
- Pedal 2 speed and delay time are the little-endian pair at 24–25.
- Flanger manual is parameter 27, and writing it leaves the speed pair alone.
- A constructed program round-trips, the header pad stays zero, and parameters 31–38 and 45 stay zero.

The script does not open Tone Room, and it does not send a program to an amp.
