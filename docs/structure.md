# Project structure

```
README.md                 Measured layout of the VT .vtxprog bank
docs/format.md            Parameter spec
docs/tests.md             How to run the check
docs/structure.md         This layout
scripts/check-vtx.ts      Synthetic parameter locks
src/app/                  Next.js page
src/components/bench.tsx  The editor
src/components/knob.tsx   Knob control
src/lib/vtx.ts            parseVtx / writeVtx
src/lib/amps.ts           Amp ids, pedal knobs, the bytes the editor writes
src/lib/tone.ts           Tone-description shaping
package.json              npm run dev, build, start, lint, check, typecheck
```

`AMP_PARAM` and `withKnob` in `src/lib/amps.ts` are the indexes the bench writes. The same map is written up in [format.md](format.md) and [README.md](../README.md).
