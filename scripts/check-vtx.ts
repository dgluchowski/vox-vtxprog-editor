/**
 * Tone descriptions shaped from a blank program, plus synthetic programs that
 * lock the bytes the editor writes. This does not open Tone Room or send a
 * program to an amp.
 */
import {
  AMP_PARAM,
  PEDAL1,
  PEDAL2,
  PEDAL1_ENABLE,
  PEDAL2_ENABLE,
  REVERB_ENABLE,
  knobValue,
  switchEffectType,
  toneOrPresence,
  withKnob,
  type EffectKnob,
} from "../src/lib/amps";
import { describeProgram, shapeTone, type ToneSource } from "../src/lib/tone";
import {
  HEADER_LEN,
  MAGIC,
  NAME_LEN,
  RECORD_LEN,
  blankProgram,
  bytesEqual,
  downloadName,
  parseVtx,
  sanitizeProgramName,
  slotLabel,
  writeVtx,
  VtxError,
} from "../src/lib/vtx";

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

assertEditorMap();
assertHeaderPad();
assertNullPaddedNames();
assertEffectSwitches();
assertToneEngine();
assertDescription();
assertErrorPaths();
assertNamesAndSlots();

console.log("Checked synthetic programs and blank-program tone descriptions.");
console.log(chime.notes.join(" "));
console.log(plexi.notes.join(" "));

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

function assertHeaderPad() {
  const headerPad = Array.from({ length: 20 }, (_, index) => index + 1);
  const file = writeVtx({ programs: [blankProgram("Pad")], headerPad });
  for (let index = 0; index < headerPad.length; index++) {
    if (file[MAGIC.length + index] !== headerPad[index]) {
      throw new Error(`Header pad byte ${index} wrote ${file[MAGIC.length + index]}.`);
    }
  }
  const parsed = parseVtx(file);
  if (!parsed.headerPad || parsed.headerPad.length !== 20) {
    throw new Error("parseVtx did not keep the 20-byte header pad.");
  }
  if (parsed.headerPad.some((value, index) => value !== headerPad[index])) {
    throw new Error("Header pad did not round-trip.");
  }
  if (!bytesEqual(file, writeVtx(parsed))) throw new Error("Padded bank did not round-trip.");

  const fresh = writeVtx({ programs: [blankProgram("Zero")] });
  for (let index = MAGIC.length; index < HEADER_LEN; index++) {
    if (fresh[index] !== 0) throw new Error(`Missing header pad wrote ${fresh[index]} at ${index}.`);
  }
}

function assertNullPaddedNames() {
  const file = writeVtx({ programs: [blankProgram("Temp")] });
  const embedded = new Uint8Array(file);
  const nameAt = HEADER_LEN;
  for (let index = 0; index < NAME_LEN; index++) embedded[nameAt + index] = 0;
  const raw = [0x4e, 0x61, 0x6d, 0x65, 0x00, 0x58, 0x00];
  for (let index = 0; index < raw.length; index++) embedded[nameAt + index] = raw[index];
  if (parseVtx(embedded).programs[0].name !== "NameX") {
    throw new Error(`Embedded nulls decoded as ${JSON.stringify(parseVtx(embedded).programs[0].name)}.`);
  }

  const spaced = new Uint8Array(file);
  const hello = "Hello   ";
  for (let index = 0; index < NAME_LEN; index++) spaced[nameAt + index] = 0x20;
  for (let index = 0; index < hello.length; index++) spaced[nameAt + index] = hello.charCodeAt(index);
  if (parseVtx(spaced).programs[0].name !== "Hello") throw new Error("Trailing spaces were kept.");

  const mixed = new Uint8Array(file);
  for (let index = 0; index < NAME_LEN; index++) mixed[nameAt + index] = 0;
  const mixedRaw = [0x48, 0x69, 0x00, 0x20, 0x20, 0x00];
  for (let index = 0; index < mixedRaw.length; index++) mixed[nameAt + index] = mixedRaw[index];
  if (parseVtx(mixed).programs[0].name !== "Hi") {
    throw new Error(`Mixed nulls decoded as ${JSON.stringify(parseVtx(mixed).programs[0].name)}.`);
  }

  if (sanitizeProgramName("Caf\u00e9\nTone") !== "CafTone") {
    throw new Error(`sanitizeProgramName kept ${JSON.stringify(sanitizeProgramName("Caf\u00e9\nTone"))}.`);
  }
  if (sanitizeProgramName(`${"x".repeat(20)}  `) !== "x".repeat(16)) {
    throw new Error("sanitizeProgramName did not stop at 16 characters.");
  }
  const saved = parseVtx(writeVtx({ programs: [{ name: "Caf\u00e9\nTone  ", params: [...blankProgram().params] }] }));
  if (saved.programs[0].name !== "CafTone") {
    throw new Error(`Saved name was ${JSON.stringify(saved.programs[0].name)}.`);
  }
}

function assertBytesInRange(params: number[], kind: "pedal1" | "pedal2") {
  params.forEach((value, index) => {
    if (!Number.isInteger(value) || value < 0 || value > 255) {
      throw new Error(`Parameter ${index} is ${value}.`);
    }
  });
  const typeIndex = kind === "pedal1" ? 15 : 23;
  const list = kind === "pedal1" ? PEDAL1 : PEDAL2;
  const effect = list.find((item) => item.id === params[typeIndex]);
  if (!effect) throw new Error(`${kind} type ${params[typeIndex]} is not a known effect.`);
  for (const knob of effect.knobs) {
    const value = knobValue(params, knob);
    const min = knob.min ?? 0;
    const max = knob.max ?? 100;
    if (value < min || value > max) {
      throw new Error(`${effect.name} ${knob.label} is ${value}, outside ${min}–${max}.`);
    }
    if (knob.choices && !knob.choices.some((choice) => choice.id === params[knob.index])) {
      throw new Error(`${effect.name} ${knob.label} is not one of its choices.`);
    }
  }
}

function assertEffectSwitches() {
  let chorus = Array.from({ length: 46 }, () => 0);
  chorus[1] = 22;
  chorus[2] = 6;
  chorus[14] = 0;
  chorus[31] = 0;
  chorus[45] = 0;
  chorus[15] = 1;
  chorus = withKnob(chorus, effectKnob("pedal1", "Chorus", "Speed"), 10000);
  chorus = withKnob(chorus, effectKnob("pedal1", "Chorus", "Depth"), 100);
  chorus = withKnob(chorus, effectKnob("pedal1", "Chorus", "Manual"), 100);
  chorus = withKnob(chorus, effectKnob("pedal1", "Chorus", "Mix"), 100);
  chorus[21] = 1;
  chorus[22] = 1;
  chorus[24] = 117;
  const comp = switchEffectType(chorus, "pedal1", 0);
  if (comp[15] !== 0) throw new Error("Chorus to Comp did not set the type byte.");
  assertBytesInRange(comp, "pedal1");
  if (comp[17] !== 0 || comp[21] !== 0 || comp[22] !== 0) {
    throw new Error("Comp left chorus bytes that it does not use.");
  }
  if (comp[20] !== 0) throw new Error("Comp voice was not reset into 0–2.");
  if (comp[24] !== 117 || comp[1] !== 22 || comp[2] !== 6 || comp[14] !== 0) {
    throw new Error("Pedal 1 switch changed bytes outside 15–22.");
  }

  let drive = Array.from({ length: 46 }, () => 0);
  drive[15] = 2;
  for (const label of ["Gain", "Tone", "Level", "Treble", "Middle", "Bass"]) {
    drive = withKnob(drive, effectKnob("pedal1", "Tube OD", label), 100);
  }
  drive[17] = 255;
  const asChorus = switchEffectType(drive, "pedal1", 1);
  if (asChorus[15] !== 1) throw new Error("Tube OD to Chorus did not set the type byte.");
  assertBytesInRange(asChorus, "pedal1");
  const speed = knobValue(asChorus, effectKnob("pedal1", "Chorus", "Speed"));
  if (speed < 100 || speed > 10000) throw new Error(`Chorus speed left the millihertz range at ${speed}.`);

  let delay = Array.from({ length: 46 }, () => 0);
  delay[23] = 5;
  delay = withKnob(delay, effectKnob("pedal2", "Tape Echo", "Time"), 1200);
  delay = withKnob(delay, effectKnob("pedal2", "Tape Echo", "Feedback"), 80);
  const tremolo = switchEffectType(delay, "pedal2", 4);
  if (tremolo[23] !== 4) throw new Error("Tape Echo to Tremolo did not set the type byte.");
  assertBytesInRange(tremolo, "pedal2");
  const tremSpeed = knobValue(tremolo, effectKnob("pedal2", "Tremolo", "Speed"));
  if (tremSpeed < 1650 || tremSpeed > 10000) {
    throw new Error(`Tremolo speed left its range at ${tremSpeed}.`);
  }
  if (tremolo[30] !== 0) throw new Error("Tremolo kept the delay mod-depth byte.");
  const analog = switchEffectType(tremolo, "pedal2", 6);
  if (analog[23] !== 6) throw new Error("Tremolo to Analog Delay did not set the type byte.");
  assertBytesInRange(analog, "pedal2");
  const time = knobValue(analog, effectKnob("pedal2", "Analog Delay", "Time"));
  if (time !== 30) throw new Error(`Analog Delay started at ${time} ms instead of 30.`);
}

function assertVtxError(label: string, run: () => void, snippet: string) {
  try {
    run();
  } catch (error) {
    if (error instanceof VtxError && error.message.includes(snippet)) return;
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${label} threw ${message}`);
  }
  throw new Error(`${label} did not throw.`);
}

function assertErrorPaths() {
  const good = writeVtx({ programs: [blankProgram("Ok")] });
  const magic = new Uint8Array(good);
  magic[0] = 0x58;
  assertVtxError("bad magic", () => parseVtx(magic), "VTXPROG1000");
  const odd = new Uint8Array(good.length + 10);
  odd.set(good);
  assertVtxError("bad length", () => parseVtx(odd), "62-byte");
  assertVtxError("too short", () => parseVtx(new Uint8Array(40)), "too small");

  assertVtxError("empty bank", () => writeVtx({ programs: [] }), "at least one");
  assertVtxError(
    "wrong param length",
    () => writeVtx({ programs: [{ name: "X", params: [1, 2, 3] }] }),
    "46 parameters",
  );
  const high = blankProgram("High");
  high.params[3] = 256;
  assertVtxError("high byte", () => writeVtx({ programs: [high] }), "outside 0–255");
  const low = blankProgram("Low");
  low.params[3] = -1;
  assertVtxError("low byte", () => writeVtx({ programs: [low] }), "outside 0–255");
  const fraction = blankProgram("Fraction");
  fraction.params[4] = 1.5;
  assertVtxError("fractional byte", () => writeVtx({ programs: [fraction] }), "outside 0–255");
}

function assertNamesAndSlots() {
  if (downloadName("My Bank.vtxprog") !== "My_Bank.vtxprog") {
    throw new Error(`downloadName kept spaces: ${downloadName("My Bank.vtxprog")}`);
  }
  if (downloadName("Night Drive.VTXPROG") !== "Night_Drive.vtxprog") {
    throw new Error(`downloadName case: ${downloadName("Night Drive.VTXPROG")}`);
  }
  if (downloadName("") !== "tone-bank.vtxprog" || downloadName("   ") !== "tone-bank.vtxprog") {
    throw new Error("downloadName did not fall back to tone-bank.");
  }
  if (slotLabel(0) !== "Bank A · CH1" || slotLabel(3) !== "Bank A · CH4") {
    throw new Error(`Bank A labels: ${slotLabel(0)}, ${slotLabel(3)}`);
  }
  if (slotLabel(4) !== "Bank B · CH1" || slotLabel(7) !== "Bank B · CH4") {
    throw new Error(`Bank B labels: ${slotLabel(4)}, ${slotLabel(7)}`);
  }
  if (slotLabel(8) !== "Extra 9") throw new Error(`Extra label: ${slotLabel(8)}`);
}

function assertDescription() {
  const quiet = describeProgram(blankProgram("Empty"));
  if (/\b(?:Chorus|Tape Echo|Fuzz|Comp)\b/.test(quiet)) {
    throw new Error(`Bypassed pedals leaked into the description: ${quiet}`);
  }
  const active = blankProgram("Lead");
  active.params[1] = PEDAL1_ENABLE | PEDAL2_ENABLE;
  active.params[15] = 9;
  active.params[23] = 5;
  const loud = describeProgram(active);
  if (!loud.includes("Fuzz") || !loud.includes("Tape Echo")) {
    throw new Error(`Active pedals missing from ${loud}`);
  }
}

function source(program: ReturnType<typeof blankProgram>, slot = 0): ToneSource {
  return { bankTitle: "New bank", slot, program };
}

function expectAmp(prompt: string, id: number) {
  const shaped = shapeTone(prompt, library);
  if (shaped.program.params[2] !== id) {
    throw new Error(`${JSON.stringify(prompt)} selected amp ${shaped.program.params[2]}, expected ${id}.`);
  }
}

function assertToneEngine() {
  expectAmp("boutique clean", 4);
  expectAmp("boutique cl", 4);
  expectAmp("dumble", 5);
  expectAmp("bogner", 14);
  expectAmp("cali elation", 14);
  expectAmp("5150", 15);
  expectAmp("evh crunch", 15);
  expectAmp("erupt crunch", 15);
  expectAmp("erupt iii", 16);
  expectAmp("erupt 3 high gain", 16);
  expectAmp("ch3 metal", 16);
  expectAmp("deluxe normal", 1);
  expectAmp("fender normal channel", 1);
  expectAmp("tweed normal", 3);
  expectAmp("plexi normal channel", 9);
  expectAmp("ac30 normal", 6);
  expectAmp("vox normal", 6);

  const target = blankProgram("Pristine Clean Tone");
  target.params[1] = 0b10101001;
  target.params[13] = 2;
  target.params[14] = 0;
  const donor = blankProgram("SpringDonor");
  donor.params[1] = PEDAL1_ENABLE | PEDAL2_ENABLE | REVERB_ENABLE;
  donor.params[13] = 0;
  donor.params[14] = 1;
  donor.params[15] = 9;
  donor.params[23] = 4;
  donor.params[31] = 9;
  donor.params[39] = 2;
  donor.params[40] = 55;
  donor.params[45] = 9;
  const copied = shapeTone("pristine clean effects from SpringDonor", [source(target), source(donor, 1)]);
  const enable = PEDAL1_ENABLE | PEDAL2_ENABLE | REVERB_ENABLE;
  const expectedBits = (0b10101001 & ~enable) | (donor.params[1] & enable);
  if (copied.program.params[1] !== expectedBits) {
    throw new Error(`Effect enable bits are ${copied.program.params[1]}, expected ${expectedBits}.`);
  }
  if ((copied.program.params[1] & 0b10101001) !== 0b10101001) {
    throw new Error("Copying effects changed unassigned bits of parameter 1.");
  }
  if (copied.program.params[15] !== 9 || copied.program.params[23] !== 4 || copied.program.params[39] !== 2) {
    throw new Error("Pedal and reverb bytes were not copied.");
  }
  if (copied.program.params[13] !== 2 || copied.program.params[14] !== 0) {
    throw new Error("Copying effects changed bias or class.");
  }
  if (copied.program.params[31] !== 0 || copied.program.params[45] !== 0) {
    throw new Error("Copying effects wrote an unassigned parameter.");
  }

  const hall = blankProgram("Empty");
  hall.params[39] = 2;
  hall.params[40] = 10;
  hall.params[1] = 0;
  const toneRoom = shapeTone("Tone Room", [source(hall)]);
  if (toneRoom.program.params[39] !== 2 || toneRoom.program.params[40] !== 10 || (toneRoom.program.params[1] & REVERB_ENABLE) !== 0) {
    throw new Error("Tone Room selected Room reverb.");
  }
  const drying = shapeTone("drying paint, spring reverb", [source(hall)]);
  if (drying.program.params[39] !== 1 || (drying.program.params[1] & REVERB_ENABLE) === 0) {
    throw new Error("drying was treated as dry, or spring did not enable reverb.");
  }
  const dry = shapeTone("a dry tone", library);
  if (dry.program.params[40] !== 0 || (dry.program.params[1] & REVERB_ENABLE) !== 0) {
    throw new Error("dry did not clear reverb.");
  }
  const none = shapeTone("no reverb, deluxe", library);
  if (none.program.params[40] !== 0 || (none.program.params[1] & REVERB_ENABLE) !== 0) {
    throw new Error("no reverb did not clear reverb.");
  }
  const quiet = blankProgram("Empty");
  quiet.params[1] = 0;
  quiet.params[40] = 10;
  const more = shapeTone("more reverb", [source(quiet)]);
  if ((more.program.params[1] & REVERB_ENABLE) === 0 || more.program.params[40] !== 28) {
    throw new Error(`more reverb left mix ${more.program.params[40]} and bits ${more.program.params[1]}.`);
  }

  const chorus = shapeTone("chorus and tape echo", library);
  if (chorus.program.params[15] !== 1 || (chorus.program.params[1] & PEDAL1_ENABLE) === 0) {
    throw new Error("chorus did not enable pedal 1.");
  }
  if (chorus.program.params[23] !== 5 || (chorus.program.params[1] & PEDAL2_ENABLE) === 0) {
    throw new Error("tape echo did not enable pedal 2.");
  }
  const klon = shapeTone("klon", library);
  if (klon.program.params[15] !== 3 || (klon.program.params[1] & PEDAL1_ENABLE) === 0) {
    throw new Error("klon did not select Gold Drive.");
  }
  if (shapeTone("tube od", library).program.params[15] !== 2) throw new Error("tube od missed Tube OD.");
  const special = shapeTone("overdrive special", library);
  if (special.program.params[2] !== 5 || (special.program.params[1] & PEDAL1_ENABLE) !== 0) {
    throw new Error("overdrive special changed the pedal instead of the amp.");
  }
  if (shapeTone("some overdrive", library).program.params[15] !== 2) throw new Error("overdrive missed Tube OD.");
  if (shapeTone("gold drive", library).program.params[15] !== 3) throw new Error("gold drive id.");
  if (shapeTone("treble boost", library).program.params[15] !== 4) throw new Error("treble boost id.");
  if (shapeTone("distortion", library).program.params[15] !== 6) throw new Error("distortion missed Orange Dist.");
  const fuzz = shapeTone("fuzz and tremolo", library);
  if (fuzz.program.params[15] !== 9 || fuzz.program.params[23] !== 4) {
    throw new Error(`fuzz/tremolo wrote ${fuzz.program.params[15]} and ${fuzz.program.params[23]}.`);
  }
  if ((fuzz.program.params[1] & (PEDAL1_ENABLE | PEDAL2_ENABLE)) !== (PEDAL1_ENABLE | PEDAL2_ENABLE)) {
    throw new Error("fuzz and tremolo did not enable both pedals.");
  }
  if (shapeTone("flanger", library).program.params[23] !== 0) throw new Error("flanger id.");
  if (shapeTone("phaser", library).program.params[23] !== 2) throw new Error("phaser missed Org Phaser 1.");
  if (shapeTone("comp", library).program.params[15] !== 0) throw new Error("comp id.");

  const kept = shapeTone("analog delay", library);
  if (kept.program.params[23] !== 6) throw new Error("analog delay id.");
  const keptTime = kept.program.params[24] + (kept.program.params[25] << 8);
  if (keptTime !== 117) throw new Error(`Switching Tape Echo to Analog Delay reset time to ${keptTime}.`);
  const tremolo = blankProgram("Empty");
  tremolo.params[23] = 4;
  tremolo.params[24] = 114;
  tremolo.params[25] = 6;
  const intoDelay = shapeTone("delay", [source(tremolo)]);
  const delayTime = intoDelay.program.params[24] + (intoDelay.program.params[25] << 8);
  if (intoDelay.program.params[23] !== 6 || delayTime !== 30 || (intoDelay.program.params[1] & PEDAL2_ENABLE) === 0) {
    throw new Error(`delay from tremolo is type ${intoDelay.program.params[23]} at ${delayTime} ms.`);
  }
  const preDelay = shapeTone("pre-delay at 40", library);
  if ((preDelay.program.params[1] & PEDAL2_ENABLE) !== 0 || preDelay.program.params[42] !== 40) {
    throw new Error("pre-delay was treated as a delay pedal.");
  }

  const switches = shapeTone("bright cap, low cut, mid boost, cold bias, class a", library);
  if (switches.program.params[10] !== 1 || switches.program.params[11] !== 1 || switches.program.params[12] !== 1) {
    throw new Error("A switch keyword did not turn on.");
  }
  if (switches.program.params[13] !== 1 || switches.program.params[14] !== 0) {
    throw new Error(`Bias ${switches.program.params[13]}, class ${switches.program.params[14]}.`);
  }
  const off = shapeTone("no bright cap, bias hot, class ab", library);
  if (off.program.params[10] !== 0 || off.program.params[13] !== 2 || off.program.params[14] !== 1) {
    throw new Error("Off switch, hot bias, or class AB was missed.");
  }
  const explicitClass = shapeTone("ac30 class ab", library);
  if (explicitClass.program.params[2] !== 7 || explicitClass.program.params[14] !== 1) {
    throw new Error(
      `Explicit class AB lost to the AC30 rule: amp ${explicitClass.program.params[2]}, class ${explicitClass.program.params[14]}.`,
    );
  }

  if (shapeTone("gain at 5", library).program.params[3] !== 50) throw new Error("gain 5 did not store 50.");
  if (shapeTone("gain at 50", library).program.params[3] !== 50) throw new Error("gain 50 did not store 50.");
  if (shapeTone("gain at 10", library).program.params[3] !== 100) throw new Error("gain 10 did not store 100.");
  if (shapeTone("reverb mix at 4", library).program.params[40] !== 40) throw new Error("reverb mix scaling.");
  if (shapeTone("reverb time at 8", library).program.params[41] !== 80) throw new Error("reverb time 0–10 scaling.");
  if (shapeTone("reverb time at 80", library).program.params[41] !== 80) throw new Error("reverb time stored byte.");
  const pre7 = shapeTone("pre-delay at 7", library);
  if (pre7.program.params[42] !== 7 || (pre7.program.params[1] & PEDAL2_ENABLE) !== 0) {
    throw new Error("pre-delay 7 was scaled or enabled the delay.");
  }
  const pre10 = shapeTone("pre delay at 10", library);
  if (pre10.program.params[42] !== 10 || (pre10.program.params[1] & PEDAL2_ENABLE) !== 0) {
    throw new Error("pre-delay 10 was scaled or enabled the delay.");
  }
  const pre80 = shapeTone("pre delay at 80", library);
  if (pre80.program.params[42] !== 70 || (pre80.program.params[1] & PEDAL2_ENABLE) !== 0) {
    throw new Error("pre-delay was not clamped to 70, or it enabled the delay.");
  }

  const conjunction = shapeTone("call it Night Drive and add chorus", library);
  if (conjunction.program.name !== "Night Drive" || conjunction.program.params[15] !== 1) {
    throw new Error(`Name capture kept ${JSON.stringify(conjunction.program.name)}.`);
  }
  const titled = shapeTone("scooped high gain, tight, spring reverb", library);
  if (titled.program.name !== "scooped high") {
    throw new Error(`Empty slot kept ${JSON.stringify(titled.program.name)}.`);
  }
  const keptName = shapeTone("scooped high gain, tight", [source(blankProgram("Plexi Rhythm"))]);
  if (keptName.program.name !== "Plexi Rhythm") {
    throw new Error(`Named slot was replaced with ${JSON.stringify(keptName.program.name)}.`);
  }
}

