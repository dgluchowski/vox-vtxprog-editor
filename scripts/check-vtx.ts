/**
 * Byte-identical round trip of every bundled bank, plus a few tone descriptions.
 * This does not open Tone Room or send a program to an amp.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { BUNDLED_BANKS } from "../src/lib/banks";
import { shapeTone, type ToneSource } from "../src/lib/tone";
import { bytesEqual, parseVtx, writeVtx } from "../src/lib/vtx";

const banksDir = path.join(process.cwd(), "public", "banks");
const files = readdirSync(banksDir).filter((name) => name.endsWith(".vtxprog"));
if (files.length !== BUNDLED_BANKS.length) {
  throw new Error(`Expected ${BUNDLED_BANKS.length} banks, found ${files.length}.`);
}

const BYTE1 = new Set([0, 2, 4, 6, 16, 18, 20, 22]);

const library: ToneSource[] = [];
for (const entry of BUNDLED_BANKS) {
  const original = new Uint8Array(readFileSync(path.join(banksDir, entry.file)));
  const bank = parseVtx(original);
  const written = writeVtx(bank);
  if (!bytesEqual(original, written)) {
    throw new Error(`${entry.file} did not round-trip.`);
  }
  bank.programs.forEach((program, slot) => {
    library.push({ bankTitle: entry.title, slot, program });
    assertMapped(entry.title, program);
  });
}

function assertMapped(bankTitle: string, program: { name: string; params: number[] }) {
  const params = program.params;
  const where = `${bankTitle} / ${program.name || "(blank)"}`;
  if (params.length !== 46) throw new Error(`${where} has ${params.length} parameters.`);
  if (params[2] > 19) throw new Error(`${where} amp id ${params[2]} is outside 0–19.`);
  if (params[13] > 2) throw new Error(`${where} bias ${params[13]} is outside 0–2.`);
  if (params[14] > 1) throw new Error(`${where} class ${params[14]} is outside 0–1.`);
  if ((params[2] === 6 || params[2] === 7) && params[14] !== 0) {
    throw new Error(`${where} is an AC30 with class byte ${params[14]}.`);
  }
  if (params[15] > 9) throw new Error(`${where} pedal 1 type ${params[15]} is outside 0–9.`);
  if (params[23] > 6) throw new Error(`${where} pedal 2 type ${params[23]} is outside 0–6.`);
  if (params[39] > 3) throw new Error(`${where} reverb type ${params[39]} is outside 0–3.`);
  for (const index of [10, 11, 12]) {
    if (params[index] !== 0 && params[index] !== 1) {
      throw new Error(`${where} switch byte ${index} is ${params[index]}.`);
    }
  }
  if (!BYTE1.has(params[1])) throw new Error(`${where} byte 1 is ${params[1]}.`);
  for (let index = 31; index <= 38; index++) {
    if (params[index] !== 0) throw new Error(`${where} reserved byte ${index} is ${params[index]}.`);
  }
  if (params[45] !== 0) throw new Error(`${where} byte 45 is ${params[45]}.`);
  for (const index of [3, 4, 5, 6, 7, 8, 9, 40, 41, 42, 43]) {
    if (params[index] > 100) throw new Error(`${where} knob ${index} is ${params[index]}.`);
  }
}

const asato = library.find((source) => source.bankTitle === "Mateus Asato" && source.program.name === "Asato");
if (!asato || asato.program.params[2] !== 4) {
  throw new Error("Asato should be Boutique CL (amp 4).");
}

const scooped = shapeTone("System of a Down, scooped high gain, tight", library);
if (scooped.program.params[2] !== 7 && scooped.baseLabel !== "SOAD") {
  throw new Error(`Scooped metal started from ${scooped.baseLabel}, amp ${scooped.program.params[2]}.`);
}
if (scooped.program.name !== "SOAD") {
  throw new Error(`Expected base name SOAD, got ${scooped.program.name}.`);
}
if (scooped.program.params[5] > 34) {
  throw new Error(`Scooped middle stayed at ${scooped.program.params[5]}.`);
}
if (scooped.program.params[3] < 80) {
  throw new Error(`High gain fell to ${scooped.program.params[3]}.`);
}

const clean = shapeTone("Mateus Asato, pristine clean, room reverb", library);
if (clean.program.params[2] !== 4 || clean.program.params[3] > 36) {
  throw new Error(`Clean Asato came out amp ${clean.program.params[2]} gain ${clean.program.params[3]}.`);
}
if (clean.program.params[39] !== 0 || clean.program.params[40] < 34) {
  throw new Error("Clean Asato did not get a room reverb.");
}

const chime = shapeTone("AC30 chime, edge of breakup, spring reverb", library);
if (chime.baseLabel === "SOAD") {
  throw new Error("Chime cloned the high-gain SOAD program.");
}
if (chime.program.params[2] !== 6 && chime.program.params[2] !== 7) {
  throw new Error(`Chime amp was ${chime.program.params[2]}.`);
}
if (chime.program.params[3] > 70) {
  throw new Error(`Chime gain stayed hot at ${chime.program.params[3]}.`);
}
if (chime.program.params[39] !== 1) {
  throw new Error(`Spring reverb type was ${chime.program.params[39]}.`);
}

const plexi = shapeTone("Marshall plexi rhythm, bright, dry", library);
if (plexi.program.params[2] !== 8 && plexi.program.params[2] !== 9) {
  throw new Error(`Plexi amp was ${plexi.program.params[2]}.`);
}
if (plexi.program.params[40] !== 0) {
  throw new Error("Dry plexi still had reverb mix.");
}

const orange = shapeTone("Orange rock crunch, medium gain, room reverb", library);
if (orange.program.params[2] !== 18) {
  throw new Error(`Orange amp was ${orange.program.params[2]}.`);
}

const brian = shapeTone("Brian May crunch, a bit brighter", library);
if (brian.baseLabel !== "Brian May crunch") {
  throw new Error(`Brian May started from ${brian.baseLabel}.`);
}

const named = shapeTone('call it Night Drive, deluxe clean', library);
if (named.program.name !== "Night Drive") {
  throw new Error(`Name was ${named.program.name}.`);
}
if (named.program.params[2] !== 0) {
  throw new Error(`Deluxe amp was ${named.program.params[2]}.`);
}

const longName = shapeTone("call it This Name Is Way Too Long For The Amp", library);
if (longName.program.name.length > 16) {
  throw new Error("Name was not truncated to 16 characters.");
}

parseVtx(writeVtx({ programs: [named.program] }));
let failed = false;
try {
  parseVtx(new Uint8Array([1, 2, 3, 4]));
  failed = true;
} catch {
  failed = false;
}
if (failed) throw new Error("Short files should be rejected.");

assertMappingFile();
assertMapping2File();
assertMapping3File();
assertMapping4File();
assertMapping5File();
assertMapping9File();

console.log(`Round-tripped ${files.length} banks, ${library.length} programs.`);
console.log(scooped.notes.join(" "));
console.log(clean.notes.join(" "));
console.log(chime.notes.join(" "));

/**
 * Mapping.vtxprog starts from comp, flanger, room, and VOX AC30.
 * Each program changes one type id. Treble Boost and BLK Phaser also store
 * flanger speed 100 instead of the baseline 200.
 */
function assertMappingFile() {
  const original = new Uint8Array(readFileSync(path.join(process.cwd(), "fixtures", "Mapping.vtxprog")));
  const bank = parseVtx(original);
  if (!bytesEqual(original, writeVtx(bank))) {
    throw new Error("Mapping.vtxprog did not round-trip.");
  }
  const baseline = [
    30, 0, 6, 50, 50, 50, 50, 50, 20, 75, 1, 0, 0, 0, 0, 0, 50, 0, 67, 57, 1, 0, 0, 0, 200, 0, 50, 77, 0,
    1, 35, 0, 0, 0, 0, 0, 0, 0, 0, 0, 75, 45, 0, 36, 25, 0,
  ];
  const expected: Record<string, { index: number; value: number; speed?: number }> = {
    "Treble Boost": { index: 15, value: 4, speed: 100 },
    "Orange Dist": { index: 15, value: 6 },
    "Fat Dist": { index: 15, value: 7 },
    "BLK Phaser": { index: 23, value: 1, speed: 100 },
    "T4x10 Bright": { index: 2, value: 2 },
    "T4x10 Normal": { index: 2, value: 3 },
    "Brit VM": { index: 2, value: 11 },
    "SL-OD": { index: 2, value: 12 },
    "Double Rec": { index: 2, value: 13 },
    "Cali Elation": { index: 2, value: 14 },
    "Erupt III Ch2": { index: 2, value: 15 },
  };
  if (bank.programs.length !== Object.keys(expected).length) {
    throw new Error(`Mapping file has ${bank.programs.length} programs.`);
  }
  for (const program of bank.programs) {
    const change = expected[program.name];
    if (!change) throw new Error(`Unexpected mapping program ${program.name}.`);
    program.params.forEach((value, index) => {
      const wanted = index === change.index ? change.value : index === 24 && change.speed !== undefined ? change.speed : baseline[index];
      if (value !== wanted) {
        throw new Error(`${program.name} param ${index} is ${value}, expected ${wanted}.`);
      }
    });
  }
}

/** Mapping2 changes one control per named program. Three trailing slots stay on the baseline. */
function assertMapping2File() {
  const original = new Uint8Array(readFileSync(path.join(process.cwd(), "fixtures", "Mapping2.vtxprog")));
  const bank = parseVtx(original);
  if (!bytesEqual(original, writeVtx(bank))) {
    throw new Error("Mapping2.vtxprog did not round-trip.");
  }
  const baseline = [
    30, 0, 6, 50, 50, 50, 50, 50, 20, 75, 1, 0, 0, 0, 0, 0, 50, 0, 67, 57, 1, 0, 0, 0, 200, 0, 50, 77, 0,
    1, 35, 0, 0, 0, 0, 0, 0, 0, 0, 0, 75, 45, 0, 36, 25, 0,
  ];
  const expected: { name: string; changes: Record<number, number> }[] = [
    { name: "Erupt III Ch3", changes: { 2: 16 } },
    { name: "Brit Lead", changes: { 15: 8 } },
    { name: "RC Turbo", changes: { 15: 5 } },
    { name: "Bright Cap Off", changes: { 10: 0 } },
    { name: "Mid Boost On", changes: { 12: 1 } },
    { name: "Low Cut On", changes: { 11: 1 } },
    { name: "L+H Damp max", changes: { 1: 16, 43: 100, 44: 100 } },
    { name: "L+H Damp Min", changes: { 1: 16, 43: 0, 44: 0 } },
    { name: "", changes: {} },
    { name: "", changes: {} },
    { name: "", changes: {} },
  ];
  if (bank.programs.length !== expected.length) {
    throw new Error(`Mapping2 has ${bank.programs.length} programs.`);
  }
  bank.programs.forEach((program, slot) => {
    const change = expected[slot];
    if (program.name !== change.name) {
      throw new Error(`Mapping2 slot ${slot} is named ${program.name}.`);
    }
    program.params.forEach((value, index) => {
      const wanted = index in change.changes ? change.changes[index] : baseline[index];
      if (value !== wanted) {
        throw new Error(`${program.name || "(blank)"} param ${index} is ${value}, expected ${wanted}.`);
      }
    });
  });
}

/** Mapping3 names low damp, high damp, noise reduction, and pre delay. */
function assertMapping3File() {
  const original = new Uint8Array(readFileSync(path.join(process.cwd(), "fixtures", "Mapping3.vtxprog")));
  const bank = parseVtx(original);
  if (!bytesEqual(original, writeVtx(bank))) {
    throw new Error("Mapping3.vtxprog did not round-trip.");
  }
  const baseline = [
    30, 0, 6, 50, 50, 50, 50, 50, 20, 75, 1, 0, 0, 0, 0, 0, 50, 0, 67, 57, 1, 0, 0, 0, 200, 0, 50, 77, 0,
    1, 35, 0, 0, 0, 0, 0, 0, 0, 0, 0, 75, 45, 0, 36, 25, 0,
  ];
  const expected: { name: string; changes: Record<number, number> }[] = [
    { name: "LD 0 HD 10", changes: { 1: 16, 43: 0, 44: 100 } },
    { name: "LD 10 HD 0", changes: { 1: 16, 43: 100, 44: 0 } },
    { name: "NR Min", changes: { 0: 0 } },
    { name: "NR Max", changes: { 0: 100 } },
    { name: "Pre Delay Max", changes: { 1: 16, 42: 70 } },
    { name: "", changes: {} },
    { name: "", changes: {} },
    { name: "", changes: {} },
    { name: "", changes: {} },
    { name: "", changes: {} },
    { name: "", changes: {} },
  ];
  if (bank.programs.length !== expected.length) {
    throw new Error(`Mapping3 has ${bank.programs.length} programs.`);
  }
  bank.programs.forEach((program, slot) => {
    const change = expected[slot];
    if (program.name !== change.name) {
      throw new Error(`Mapping3 slot ${slot} is named ${program.name}.`);
    }
    program.params.forEach((value, index) => {
      const wanted = index in change.changes ? change.changes[index] : baseline[index];
      if (value !== wanted) {
        throw new Error(`${program.name || "(blank)"} param ${index} is ${value}, expected ${wanted}.`);
      }
    });
  });
}

/** Mapping4 names comp voice, the cut toggles, and the two pedal enables. */
function assertMapping4File() {
  const original = new Uint8Array(readFileSync(path.join(process.cwd(), "fixtures", "Mapping4.vtxprog")));
  const bank = parseVtx(original);
  if (!bytesEqual(original, writeVtx(bank))) {
    throw new Error("Mapping4.vtxprog did not round-trip.");
  }
  const baseline = [
    30, 0, 6, 50, 50, 50, 50, 50, 20, 75, 1, 0, 0, 0, 0, 0, 50, 0, 67, 57, 1, 0, 0, 0, 200, 0, 50, 77, 0,
    1, 35, 0, 0, 0, 0, 0, 0, 0, 0, 0, 75, 45, 0, 36, 25, 0,
  ];
  const expected: { name: string; changes: Record<number, number> }[] = [
    { name: "Comp Voice 1", changes: { 1: 2, 20: 0 } },
    { name: "Comp Voice 2", changes: { 1: 2 } },
    { name: "Comp Voice 3", changes: { 1: 2, 20: 2 } },
    { name: "Chorus low on", changes: { 1: 2, 15: 1, 21: 1 } },
    { name: "Chorus high on", changes: { 1: 2, 15: 1, 22: 1 } },
    { name: "Chorus Both on", changes: { 1: 2, 15: 1, 21: 1, 22: 1 } },
    { name: "Flanger low on", changes: { 1: 4, 28: 1, 29: 0 } },
    { name: "Flanger high on", changes: { 1: 4 } },
    { name: "Flanger both on", changes: { 1: 4, 28: 1 } },
    { name: "Flanger ON", changes: { 1: 4 } },
    { name: "Comp ON", changes: { 1: 2 } },
  ];
  if (bank.programs.length !== expected.length) {
    throw new Error(`Mapping4 has ${bank.programs.length} programs.`);
  }
  bank.programs.forEach((program, slot) => {
    const change = expected[slot];
    if (program.name !== change.name) {
      throw new Error(`Mapping4 slot ${slot} is named ${program.name}.`);
    }
    program.params.forEach((value, index) => {
      const wanted = index in change.changes ? change.changes[index] : baseline[index];
      if (value !== wanted) {
        throw new Error(`${program.name} param ${index} is ${value}, expected ${wanted}.`);
      }
    });
  });
}

/** Mapping5 sets one pedal-2 knob to 10. Pedal 2 is on. Black phaser is the phaser. */
function assertMapping5File() {
  const original = new Uint8Array(readFileSync(path.join(process.cwd(), "fixtures", "Mapping5.vtxprog")));
  const bank = parseVtx(original);
  if (!bytesEqual(original, writeVtx(bank))) {
    throw new Error("Mapping5.vtxprog did not round-trip.");
  }
  const baseline = [
    30, 0, 6, 50, 50, 50, 50, 50, 20, 75, 1, 0, 0, 0, 0, 0, 50, 0, 67, 57, 1, 0, 0, 0, 200, 0, 50, 77, 0,
    1, 35, 0, 0, 0, 0, 0, 0, 0, 0, 0, 75, 45, 0, 36, 25, 0,
  ];
  const expected: { name: string; changes: Record<number, number> }[] = [
    { name: "Delay speed 10", changes: { 1: 4, 23: 6, 24: 30, 29: 100 } },
    { name: "Delay depth 10", changes: { 1: 4, 23: 6, 24: 30, 30: 100 } },
    { name: "Tremolo speed 10", changes: { 1: 4, 23: 4, 24: 16, 25: 39 } },
    { name: "Tremolo depth 10", changes: { 1: 4, 23: 4, 24: 114, 25: 6, 26: 100 } },
    { name: "Tremolo duty 10", changes: { 1: 4, 23: 4, 24: 114, 25: 6, 27: 100 } },
    { name: "Tremolo shape 10", changes: { 1: 4, 23: 4, 24: 114, 25: 6, 28: 100 } },
    { name: "Tremolo level 10", changes: { 1: 4, 23: 4, 24: 114, 25: 6, 29: 100 } },
    { name: "Phaser speed 10", changes: { 1: 4, 23: 1, 24: 16, 25: 39 } },
    { name: "Phaser res 10", changes: { 1: 4, 23: 1, 24: 100, 26: 100 } },
    { name: "Phaser man 10", changes: { 1: 4, 23: 1, 24: 100, 27: 100 } },
    { name: "Phaser Depth 10", changes: { 1: 4, 23: 1, 24: 100, 28: 100 } },
  ];
  if (bank.programs.length !== expected.length) {
    throw new Error(`Mapping5 has ${bank.programs.length} programs.`);
  }
  bank.programs.forEach((program, slot) => {
    const change = expected[slot];
    if (program.name !== change.name) {
      throw new Error(`Mapping5 slot ${slot} is named ${program.name}.`);
    }
    program.params.forEach((value, index) => {
      const wanted = index in change.changes ? change.changes[index] : baseline[index];
      if (value !== wanted) {
        throw new Error(`${program.name} param ${index} is ${value}, expected ${wanted}.`);
      }
    });
  });
}

/**
 * Mapping9 changes one pedal-2 control from the baseline chain.
 * Delay time is a little-endian millisecond count in bytes 24 and 25.
 * FlM also moves speed byte 24 to 100. That pair is not the manual edit.
 */
function assertMapping9File() {
  const original = new Uint8Array(readFileSync(path.join(process.cwd(), "fixtures", "Mapping9.vtxprog")));
  const bank = parseVtx(original);
  if (!bytesEqual(original, writeVtx(bank))) {
    throw new Error("Mapping9.vtxprog did not round-trip.");
  }
  const baseline = [
    30, 0, 6, 50, 50, 50, 50, 50, 20, 75, 1, 0, 0, 0, 0, 0, 50, 0, 67, 57, 1, 0, 0, 0, 200, 0, 50, 77, 0,
    1, 35, 0, 0, 0, 0, 0, 0, 0, 0, 0, 75, 45, 0, 36, 25, 0,
  ];
  const expected: { name: string; changes: Record<number, number> }[] = [
    { name: "FlM", changes: { 1: 4, 24: 100, 27: 100 } },
    { name: "FlR", changes: { 1: 4, 30: 100 } },
    { name: "D100", changes: { 1: 4, 23: 6, 24: 100 } },
    { name: "D300", changes: { 1: 4, 23: 6, 24: 44, 25: 1 } },
    { name: "D1200", changes: { 1: 4, 23: 6, 24: 176, 25: 4 } },
    { name: "D255", changes: { 1: 4, 23: 6, 24: 255 } },
    { name: "DLv", changes: { 1: 4, 23: 6, 24: 30, 26: 100 } },
    { name: "DFb", changes: { 1: 4, 23: 6, 24: 30, 27: 100 } },
    { name: "DTn", changes: { 1: 4, 23: 6, 24: 30, 28: 100 } },
    { name: "OP2", changes: { 1: 4, 23: 3, 24: 100 } },
    { name: "Tap", changes: { 1: 4, 23: 5, 24: 30 } },
  ];
  if (bank.programs.length !== expected.length) {
    throw new Error(`Mapping9 has ${bank.programs.length} programs.`);
  }
  bank.programs.forEach((program, slot) => {
    const change = expected[slot];
    if (program.name !== change.name) {
      throw new Error(`Mapping9 slot ${slot} is named ${program.name}.`);
    }
    program.params.forEach((value, index) => {
      const wanted = index in change.changes ? change.changes[index] : baseline[index];
      if (value !== wanted) {
        throw new Error(`${program.name} param ${index} is ${value}, expected ${wanted}.`);
      }
    });
  });
}
