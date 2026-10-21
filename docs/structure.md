# Project structure

```
README.md                 What the project is, how to run it, which preset files are included
docs/                     Format, experiments, tests, this layout
fixtures/                 Eight mapping banks, Mapping through Mapping5 and Mapping7–9
scripts/check-vtx.ts      Byte-exact round trip and fixture locks
src/app/                  Next.js page
src/components/bench.tsx  The editor
src/lib/vtx.ts            parseVtx / writeVtx
src/lib/amps.ts           Amp ids, pedal types, knob indexes the bench uses
src/lib/tone.ts           Tone-description shaping
package.json              npm run dev, check, typecheck
```

`src/lib/amps.ts` and `src/components/bench.tsx` are the labels the running editor draws. Where those labels disagree with the fixture locks, the difference is in [Still open](format.md#still-open). The fixture locks live in `scripts/check-vtx.ts`.
