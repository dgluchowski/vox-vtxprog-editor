# Vtx Bench

Vtx Bench reads and writes VOX Tone Room `.vtxprog` banks for the VT20X, VT40X, and VT100X. Open a bank, move the knobs or describe a tone, and download a file Tone Room can open. Parsing and saving happen in the browser.

This project is not affiliated with VOX or Korg.

The format work here is the `.vtxprog` bank for those three amps. Other amp families and other Tone Room file extensions are future work.

## Run

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:4178](http://127.0.0.1:4178).

Loading a bank in Tone Room replaces the programs stored on the amp. Export the current bank from Tone Room before sending a new file over.

## Tests

```bash
npm run check
npm run typecheck
```

`npm run check` is the byte-exact round trip. What that command proves, and what it does not prove, is in [docs/tests.md](docs/tests.md).

## Documentation

- [Format](docs/format.md) — 32-byte header, 62-byte programs, the 20 amp ids, and the parameter bytes the fixtures lock
- [Experiments](docs/experiments.md) — how the mapping banks were recorded, and the eight fixture files in this repo
- [Tests](docs/tests.md) — how to run the round trip
- [Project structure](docs/structure.md)

Gaps are listed in the [Still open](docs/format.md#still-open) section of the format note.

## Preset files

The `.vtxprog` files in this repo are Damian’s Tone Room captures under `fixtures/`:

- `Mapping.vtxprog`
- `Mapping2.vtxprog` through `Mapping5.vtxprog`
- `Mapping7.vtxprog` through `Mapping9.vtxprog`

Each one is a controlled mapping bank. None of them is a VOX factory bank.

No official VOX amp or Tone Room factory bank is in this repo. The Tone Room install’s `USERBANK.vtxprog` is eight user slots named USER A-1 through USER B-4, and it is not included. Other USERBANK formats are not included either.
