# Round-trip tests

From the repository root, after `npm install`:

```bash
npm run check
npm run typecheck
```

`npm run check` runs `scripts/check-vtx.ts` with `tsx`. `npm run typecheck` runs `tsc --noEmit`.

## What `npm run check` does

1. Runs the parse/write round trip on each mapping fixture, then compares every parameter byte with the array in `assertMappingFile` through `assertMapping9File`.
2. Shapes a handful of tone descriptions from a blank program and checks the program those descriptions produce.
3. Rejects a file that is too short to be a bank.

The script reads the eight mapping fixtures and no other `.vtxprog` file. It does not launch Tone Room, and it does not send a program to an amp.

## What a passing check is

A pass means `parseVtx(writeVtx(bytes))` reproduces the files in this repo, and the eight mapping fixtures still contain the bytes recorded for them.

The knob names in [format.md](format.md) come from Damian’s saved banks: which control he turned, and which byte changed. The round trip does not, by itself, prove that a byte is the knob Tone Room displays. Locking an expected array proves the fixture still has those bytes. It does not add a new observation from Tone Room.

`assertMapping7File` locks chorus preset `Ch0` at byte 16 = 100 and byte 17 = 0. That lock is unverified as the speed minimum. See [Still open](format.md#still-open).
