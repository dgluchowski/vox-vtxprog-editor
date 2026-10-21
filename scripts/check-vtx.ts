/**
 * Byte-identical round trip of the mapping fixtures, plus tone descriptions
 * shaped from a blank program. This does not open Tone Room or send a program to an amp.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { shapeTone, type ToneSource } from "../src/lib/tone";
import { blankProgram, bytesEqual, parseVtx, writeVtx } from "../src/lib/vtx";

const library: ToneSource[] = [
  { bankTitle: "New bank", slot: 0, program: blankProgram("Empty") },
];

const chime = shapeTone("AC30 chime, edge of breakup, spring reverb", library);
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
assertMapping7File();
assertMapping8File();
assertMapping9File();

console.log("Round-tripped 8 mapping fixtures.");
console.log(chime.notes.join(" "));
console.log(plexi.notes.join(" "));

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
 * Mapping7 changes one control in each region from the baseline chain.
 * Chorus speed 2 writes bytes 16 and 17 together. That pair is the speed edit.
 * Ch0 stores byte 16 as 100 and byte 17 as 0. A knob at 10 also stores 100.
 * Damian has not confirmed that chorus speed was at its minimum, so the 100/0
 * lock is unverified as a floor.
 */
function assertMapping7File() {
  const original = new Uint8Array(readFileSync(path.join(process.cwd(), "fixtures", "Mapping7.vtxprog")));
  const bank = parseVtx(original);
  if (!bytesEqual(original, writeVtx(bank))) {
    throw new Error("Mapping7.vtxprog did not round-trip.");
  }
  const baseline = [
    30, 0, 6, 50, 50, 50, 50, 50, 20, 75, 1, 0, 0, 0, 0, 0, 50, 0, 67, 57, 1, 0, 0, 0, 200, 0, 50, 77, 0,
    1, 35, 0, 0, 0, 0, 0, 0, 0, 0, 0, 75, 45, 0, 36, 25, 0,
  ];
  const expected: { name: string; changes: Record<number, number> }[] = [
    { name: "OdD TmF Res Spr", changes: { 1: 22, 9: 100, 15: 2, 16: 100, 23: 4, 24: 114, 25: 6, 39: 1 } },
    { name: "OdT Tm3 BiC Hal", changes: { 1: 22, 13: 1, 15: 2, 18: 100, 23: 4, 24: 184, 25: 11, 39: 2 } },
    { name: "OdL Tm7 BiH Plt", changes: { 1: 22, 13: 2, 15: 2, 19: 100, 23: 4, 24: 88, 25: 27, 39: 3 } },
    { name: "OdTr Tm5 Cls Rmx", changes: { 1: 22, 14: 1, 15: 2, 20: 100, 23: 4, 24: 136, 25: 19, 40: 100 } },
    { name: "OdM Tm8 DxV Rtm", changes: { 1: 22, 2: 0, 15: 2, 21: 100, 23: 4, 24: 64, 25: 31, 41: 100 } },
    { name: "OdB Tm9 DxN", changes: { 1: 6, 2: 1, 15: 2, 22: 100, 23: 4, 24: 40, 25: 35 } },
    { name: "CmS PhF BCL", changes: { 1: 6, 2: 4, 16: 100, 23: 1, 24: 100 } },
    { name: "CmL Ph1 BOD", changes: { 1: 6, 2: 5, 18: 100, 23: 1, 24: 232, 25: 3 } },
    { name: "CmA Ph2 A30T", changes: { 1: 6, 2: 7, 19: 100, 23: 1, 24: 208, 25: 7 } },
    { name: "Ch0 Ph5 B59T", changes: { 1: 6, 2: 8, 15: 1, 16: 100, 23: 1, 24: 136, 25: 19 } },
    { name: "Ch2 Ph8 B59N", changes: { 1: 6, 2: 9, 15: 1, 16: 208, 17: 7, 23: 1, 24: 64, 25: 31 } },
  ];
  if (bank.programs.length !== expected.length) {
    throw new Error(`Mapping7 has ${bank.programs.length} programs.`);
  }
  bank.programs.forEach((program, slot) => {
    const change = expected[slot];
    if (program.name !== change.name) {
      throw new Error(`Mapping7 slot ${slot} is named ${program.name}.`);
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
 * Mapping8 changes one control in each region from the baseline chain.
 * Chorus speed writes bytes 16 and 17 together. Flanger speed 100/0 is the
 * 0.100 Hz floor. The untouched opening pair 200/0 is not that floor.
 */
function assertMapping8File() {
  const original = new Uint8Array(readFileSync(path.join(process.cwd(), "fixtures", "Mapping8.vtxprog")));
  const bank = parseVtx(original);
  if (!bytesEqual(original, writeVtx(bank))) {
    throw new Error("Mapping8.vtxprog did not round-trip.");
  }
  const baseline = [
    30, 0, 6, 50, 50, 50, 50, 50, 20, 75, 1, 0, 0, 0, 0, 0, 50, 0, 67, 57, 1, 0, 0, 0, 200, 0, 50, 77, 0,
    1, 35, 0, 0, 0, 0, 0, 0, 0, 0, 0, 75, 45, 0, 36, 25, 0,
  ];
  const expected: { name: string; changes: Record<number, number> }[] = [
    { name: "Ch5 Ph9 B800", changes: { 1: 6, 2: 10, 15: 1, 16: 136, 17: 19, 23: 1, 24: 40, 25: 35 } },
    { name: "Ch8 O1S BMt", changes: { 1: 6, 2: 17, 15: 1, 16: 64, 17: 31, 23: 2, 24: 16, 25: 39 } },
    { name: "Ch10 O1R OR2", changes: { 1: 6, 2: 18, 15: 1, 16: 16, 17: 39, 23: 2, 24: 100, 26: 100 } },
    { name: "ChD O1M OCl", changes: { 1: 6, 2: 19, 15: 1, 18: 100, 23: 2, 24: 100, 27: 100 } },
    { name: "ChM O1D", changes: { 1: 6, 15: 1, 19: 100, 23: 2, 24: 100, 28: 100 } },
    { name: "ChMix FlF", changes: { 1: 6, 15: 1, 20: 100, 24: 100 } },
    { name: "Gld Fl1", changes: { 1: 6, 15: 3, 24: 232, 25: 3 } },
    { name: "Fuz Fl2", changes: { 1: 6, 15: 9, 24: 208, 25: 7 } },
    { name: "Fl3", changes: { 1: 4, 24: 184, 25: 11 } },
    { name: "Fl5", changes: { 1: 4, 24: 136, 25: 19 } },
    { name: "FlD", changes: { 1: 4, 26: 100 } },
  ];
  if (bank.programs.length !== expected.length) {
    throw new Error(`Mapping8 has ${bank.programs.length} programs.`);
  }
  bank.programs.forEach((program, slot) => {
    const change = expected[slot];
    if (program.name !== change.name) {
      throw new Error(`Mapping8 slot ${slot} is named ${program.name}.`);
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
 * FlM stores manual byte 27 as 100 and also moves speed from 200/0 to 100/0.
 * Depth byte 26 stays 50 and resonance byte 30 stays 35, so byte 27 is still
 * the manual edit. FlM is not a single-variable preset.
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
