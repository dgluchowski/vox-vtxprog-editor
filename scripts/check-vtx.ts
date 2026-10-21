/**
 * Byte-identical round trip of every bundled bank, a few tone descriptions,
 * and synthetic programs that lock the bytes the editor writes.
 * This does not open Tone Room or send a program to an amp.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  AMP_PARAM,
  PEDAL1,
  PEDAL2,
  knobValue,
  toneOrPresence,
  withKnob,
  type EffectKnob,
} from "../src/lib/amps";
import { BUNDLED_BANKS } from "../src/lib/banks";
import { shapeTone, type ToneSource } from "../src/lib/tone";
import { HEADER_LEN, MAGIC, RECORD_LEN, bytesEqual, parseVtx, writeVtx } from "../src/lib/vtx";

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
    if (params[index] !== 0) throw new Error(`${where} unassigned byte ${index} is ${params[index]}.`);
  }
  if (params[45] !== 0) throw new Error(`${where} unassigned byte 45 is ${params[45]}.`);
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

assertEditorMap();

console.log(`Round-tripped ${files.length} banks, ${library.length} programs.`);
console.log(scooped.notes.join(" "));
console.log(clean.notes.join(" "));
console.log(chime.notes.join(" "));

function effectKnob(kind: "pedal1" | "pedal2", typeName: string, label: string): EffectKnob {
  const list = kind === "pedal1" ? PEDAL1 : PEDAL2;
  const found = list.find((item) => item.name === typeName)?.knobs.find((item) => item.label === label);
  if (!found) throw new Error(`Missing ${typeName} ${label}.`);
  return found;
}

function zeros(): number[] {
  return Array.from({ length: 46 }, () => 0);
}

/** Locks the bytes the editor writes. Programs are built in code, not read from captures. */
function assertEditorMap() {
  if (AMP_PARAM.volume !== 7 || AMP_PARAM.presence !== 8 || AMP_PARAM.resonance !== 9) {
    throw new Error("Parameters 7, 8, and 9 are not volume, tone/presence, and resonance.");
  }
  if (toneOrPresence(6) !== "Tone" || toneOrPresence(7) !== "Tone" || toneOrPresence(10) !== "Presence") {
    throw new Error("Parameter 8 should read Tone on AC30 and AC30TB, Presence on other models.");
  }

  const speed = effectKnob("pedal1", "Chorus", "Speed");
  const depth = effectKnob("pedal1", "Chorus", "Depth");
  const manual = effectKnob("pedal1", "Chorus", "Manual");
  const mix = effectKnob("pedal1", "Chorus", "Mix");
  if (speed.index !== 16 || speed.pair !== "millihertz" || depth.pair || manual.pair || mix.pair) {
    throw new Error("Chorus speed must be the millihertz pair, and depth, manual, and mix must be single bytes.");
  }
  if (depth.index !== 18 || manual.index !== 19 || mix.index !== 20) {
    throw new Error("Chorus depth, manual, and mix are not parameters 18, 19, and 20.");
  }

  let chorus = withKnob(zeros(), speed, 2000);
  chorus = withKnob(chorus, depth, 100);
  chorus = withKnob(chorus, manual, 57);
  chorus = withKnob(chorus, mix, 100);
  if (chorus[16] !== 208 || chorus[17] !== 7) {
    throw new Error(`Chorus 2 Hz stored ${chorus[16]}, ${chorus[17]}.`);
  }
  if (chorus[18] !== 100 || chorus[19] !== 57 || chorus[20] !== 100) {
    throw new Error("Chorus depth, manual, or mix wrote the wrong parameter.");
  }
  if (knobValue(chorus, speed) !== 2000) throw new Error("Chorus speed did not read back as millihertz.");

  const sens = effectKnob("pedal1", "Comp", "Sens");
  const comp = zeros();
  comp[17] = 7;
  const sensWritten = withKnob(comp, sens, 40);
  if (sensWritten[16] !== 40 || sensWritten[17] !== 7) {
    throw new Error("Comp sensitivity wrote over the high byte.");
  }

  const flangerSpeed = effectKnob("pedal2", "Flanger", "Speed");
  const flangerManual = effectKnob("pedal2", "Flanger", "Manual");
  if (flangerSpeed.index !== 24 || flangerSpeed.pair !== "millihertz") {
    throw new Error("Flanger speed is not the millihertz pair at 24–25.");
  }
  if (flangerManual.index !== 27 || flangerManual.pair) {
    throw new Error("Flanger manual is not the single byte at parameter 27.");
  }
  let flanger = zeros();
  flanger[3] = 100;
  flanger = withKnob(flanger, flangerSpeed, 200);
  flanger = withKnob(flanger, flangerManual, 100);
  if (flanger[3] !== 100 || flanger[24] !== 200 || flanger[25] !== 0 || flanger[27] !== 100) {
    throw new Error("Flanger manual did not stay isolated from speed and gain.");
  }
  const oneHz = withKnob(zeros(), flangerSpeed, 1000);
  if (oneHz[24] !== 232 || oneHz[25] !== 3) throw new Error(`Flanger 1 Hz stored ${oneHz[24]}, ${oneHz[25]}.`);

  for (const name of ["Blk Phaser", "Org Phaser 1", "Org Phaser 2"]) {
    const phaserSpeed = effectKnob("pedal2", name, "Speed");
    if (phaserSpeed.pair !== "millihertz" || phaserSpeed.index !== 24) {
      throw new Error(`${name} speed is not the pair at 24–25.`);
    }
  }
  const tenHz = withKnob(zeros(), effectKnob("pedal2", "Blk Phaser", "Speed"), 10000);
  if (tenHz[24] !== 16 || tenHz[25] !== 39) throw new Error("10 Hz encoding.");

  const tremolo = effectKnob("pedal2", "Tremolo", "Speed");
  if (tremolo.pair !== "millihertz" || tremolo.min !== 1650) {
    throw new Error("Tremolo speed should start at 1.650 Hz.");
  }
  const tremMin = withKnob(zeros(), tremolo, 1650);
  if (tremMin[24] !== 114 || tremMin[25] !== 6) throw new Error("1.650 Hz encoding.");

  for (const name of ["Analog Delay", "Tape Echo"]) {
    const time = effectKnob("pedal2", name, "Time");
    if (time.pair !== "milliseconds" || time.index !== 24) {
      throw new Error(`${name} time is not the millisecond pair at 24–25.`);
    }
  }
  const delay = effectKnob("pedal2", "Analog Delay", "Time");
  const ms100 = withKnob(zeros(), delay, 100);
  const ms300 = withKnob(zeros(), delay, 300);
  const ms1200 = withKnob(zeros(), delay, 1200);
  if (ms100[24] !== 100 || ms100[25] !== 0) throw new Error("100 ms encoding.");
  if (ms300[24] !== 44 || ms300[25] !== 1) throw new Error("300 ms encoding.");
  if (ms1200[24] !== 176 || ms1200[25] !== 4) throw new Error("1200 ms encoding.");

  const volume = shapeTone("volume at 1.3", library);
  if (volume.program.params[7] !== 13 || !volume.notes.some((note) => note.includes("Volume set to 13"))) {
    throw new Error(`Volume wrote ${volume.program.params[7]} at parameter 7.`);
  }
  const presence = shapeTone("presence at 9.1", library);
  if (presence.program.params[8] !== 91 || !presence.notes.some((note) => note.includes("Presence set to 91"))) {
    throw new Error(`Presence wrote ${presence.program.params[8]} at parameter 8.`);
  }
  const tone = shapeTone("tone at 8.2", library);
  if (tone.program.params[8] !== 82 || !tone.notes.some((note) => note.includes("Tone set to 82"))) {
    throw new Error(`Tone wrote ${tone.program.params[8]} at parameter 8.`);
  }
  const resonance = shapeTone("resonance at 1.7", library);
  if (resonance.program.params[9] !== 17 || !resonance.notes.some((note) => note.includes("Resonance set to 17"))) {
    throw new Error(`Resonance wrote ${resonance.program.params[9]} at parameter 9.`);
  }

  const params = zeros();
  params[AMP_PARAM.volume] = 50;
  params[AMP_PARAM.presence] = 20;
  params[AMP_PARAM.resonance] = 75;
  const bytes = writeVtx({ programs: [{ name: "Synthetic", params }] });
  if (bytes.length !== HEADER_LEN + RECORD_LEN) throw new Error(`Synthetic file is ${bytes.length} bytes.`);
  let magic = "";
  for (let i = 0; i < MAGIC.length; i++) magic += String.fromCharCode(bytes[i]);
  if (magic !== MAGIC) throw new Error("Synthetic header magic.");
  for (let i = MAGIC.length; i < HEADER_LEN; i++) {
    if (bytes[i] !== 0) throw new Error(`Header pad byte ${i} is ${bytes[i]}.`);
  }
  const parsed = parseVtx(bytes);
  if (!bytesEqual(bytes, writeVtx(parsed))) throw new Error("Synthetic program did not round-trip.");
  const stored = parsed.programs[0].params;
  if (stored[7] !== 50 || stored[8] !== 20 || stored[9] !== 75) {
    throw new Error("Synthetic amp knobs did not round-trip.");
  }
  for (let index = 31; index <= 38; index++) {
    if (stored[index] !== 0) throw new Error(`Parameter ${index} was written.`);
  }
  if (stored[45] !== 0) throw new Error("Parameter 45 was written.");
}

