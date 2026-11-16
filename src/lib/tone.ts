import {
  AMP_PARAM,
  PEDAL1_ENABLE,
  PEDAL2_ENABLE,
  REVERB_ENABLE,
  ampById,
  effectById,
  switchEffectType,
} from "@/lib/amps";
import { clampKnob, type Program } from "@/lib/vtx";

export type ToneSource = {
  bankTitle: string;
  slot: number;
  program: Program;
};

export type ShapedTone = {
  program: Program;
  notes: string[];
  baseLabel: string;
};

const P = {
  nr: AMP_PARAM.nr,
  character: 1,
  amp: 2,
  gain: AMP_PARAM.gain,
  treble: AMP_PARAM.treble,
  middle: AMP_PARAM.middle,
  bass: AMP_PARAM.bass,
  volume: AMP_PARAM.volume,
  presence: AMP_PARAM.presence,
  resonance: AMP_PARAM.resonance,
  bias: 13,
  ampClass: 14,
  reverbType: 39,
  reverbMix: 40,
  reverbTime: 41,
  preDelay: 42,
} as const;

const EFFECT_ENABLE = PEDAL1_ENABLE | PEDAL2_ENABLE | REVERB_ENABLE;

type AmpHint = {
  keys: string[];
  ids: number[];
  /** Prefer this id when several family members match. */
  prefer?: number;
};

const AMP_HINTS: AmpHint[] = [
  { keys: ["deluxe", "blackface", "fender"], ids: [0, 1], prefer: 0 },
  { keys: ["tweed", "bassman"], ids: [2, 3], prefer: 2 },
  { keys: ["boutique cl", "boutique clean", "dumble clean"], ids: [4], prefer: 4 },
  { keys: ["boutique od", "dumble", "overdrive special"], ids: [5], prefer: 5 },
  { keys: ["ac30tb", "top boost", "chime"], ids: [7], prefer: 7 },
  { keys: ["ac30", "vox"], ids: [6, 7], prefer: 7 },
  { keys: ["plexi", "1959", "super lead"], ids: [8, 9], prefer: 8 },
  { keys: ["jcm", "jcm800", "brit 800"], ids: [10], prefer: 10 },
  { keys: ["vintage modern", "brit vm"], ids: [11], prefer: 11 },
  { keys: ["soldano", "slo"], ids: [12], prefer: 12 },
  { keys: ["rectifier", "mesa", "double rec"], ids: [13], prefer: 13 },
  { keys: ["cali", "elation", "bogner"], ids: [14], prefer: 14 },
  { keys: ["erupt iii", "erupt 3", "ch3"], ids: [16], prefer: 16 },
  { keys: ["erupt", "5150", "evh"], ids: [15], prefer: 15 },
  { keys: ["diezel", "boutique metal"], ids: [17], prefer: 17 },
  { keys: ["orange", "rockerverb"], ids: [18], prefer: 18 },
  { keys: ["original clean"], ids: [19], prefer: 19 },
];

export const SUGGESTIONS: { label: string; prompt: string }[] = [
  {
    label: "Pristine clean",
    prompt: "pristine clean, room reverb",
  },
  {
    label: "Gritty clean",
    prompt: "gritty clean, a little darker",
  },
  {
    label: "Scooped metal",
    prompt: "scooped high gain, tight",
  },
  {
    label: "AC30 chime",
    prompt: "AC30 chime, edge of breakup, spring reverb",
  },
  {
    label: "Bright crunch",
    prompt: "crunch, a bit brighter",
  },
  {
    label: "Plexi rhythm",
    prompt: "Marshall plexi rhythm, bright, dry",
  },
  {
    label: "Orange crunch",
    prompt: "Orange rock crunch, medium gain, room reverb",
  },
  {
    label: "Rectifier",
    prompt: "Mesa rectifier, scooped high gain, tight",
  },
];

export function shapeTone(prompt: string, sources: ToneSource[]): ShapedTone {
  const text = prompt.trim();
  if (!text) {
    throw new Error("Describe the tone first.");
  }
  if (sources.length === 0) {
    throw new Error("Load a bank before writing a tone.");
  }
  const hay = text.toLowerCase();
  const ranked = sources
    .map((source) => ({ source, score: scoreSource(source, hay) }))
    .sort((a, b) => b.score - a.score || a.source.program.name.length - b.source.program.name.length);
  const best = ranked[0]?.source ?? sources[0];
  const params = [...best.program.params];
  const notes: string[] = [];
  const baseLabel = best.program.name || best.bankTitle;
  notes.push(`Started from “${baseLabel}” in ${best.bankTitle}.`);

  const donor = effectDonor(hay, sources);
  if (donor) {
    copyEffects(donor.program.params, params);
    notes.push(`Pedal and reverb bytes copied from “${donor.program.name || donor.bankTitle}”.`);
  }

  const requestedAmp = matchAmp(hay);
  if (requestedAmp != null && params[P.amp] !== requestedAmp) {
    const previous = params[P.amp];
    params[P.amp] = requestedAmp;
    if (requestedAmp === 6 || requestedAmp === 7) params[P.ampClass] = 0;
    else if (previous === 6 || previous === 7) params[P.ampClass] = 1;
    notes.push(`Amp set to ${ampById(requestedAmp).name}.`);
  }

  applyGain(hay, params, notes);
  applyEq(hay, params, notes);
  applyReverb(hay, params, notes);
  applyPedals(hay, params, notes);
  applySwitches(hay, params, notes);
  applyExplicitKnobs(hay, params, notes);

  const name = chooseName(text, baseLabel);
  return {
    program: { name, params },
    notes,
    baseLabel,
  };
}

export function describeProgram(program: Program): string {
  const amp = ampById(program.params[P.amp]);
  const reverbId = program.params[P.reverbType];
  const reverb = ["Room", "Spring", "Hall", "Plate"][reverbId] ?? `type ${reverbId}`;
  const klass = program.params[P.ampClass] === 0 ? "Class A" : "Class AB";
  const mix = program.params[P.reverbMix];
  return [
    amp.name,
    `gain ${program.params[P.gain]}`,
    `treble ${program.params[P.treble]}`,
    `middle ${program.params[P.middle]}`,
    `bass ${program.params[P.bass]}`,
    klass,
    mix === 0 ? "reverb dry" : `${reverb.toLowerCase()} reverb`,
  ].join(" · ");
}

const STOP_WORDS = new Set([
  "the",
  "and",
  "bit",
  "with",
  "for",
  "from",
  "amp",
  "tone",
  "this",
  "that",
  "little",
  "more",
  "less",
  "into",
  "just",
  "very",
]);

const AMP_FAMILIES: readonly (readonly number[])[] = [
  [0, 1],
  [2, 3],
  [4, 5],
  [6, 7],
  [8, 9],
];

function scoreSource(source: ToneSource, hay: string): number {
  const name = source.program.name.toLowerCase();
  const bank = source.bankTitle.toLowerCase();
  let score = name ? 0 : -20;
  const words = hay
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
  for (const word of words) {
    if (name === word) score += 16;
    else if (name.includes(word)) score += 10;
    if (includesKey(bank, word)) score += 6;
  }
  const nameTokens = name.split(/[^a-z0-9]+/).filter((word) => word.length > 2);
  for (const token of nameTokens) {
    if (!includesKey(hay, token)) score -= 2;
  }
  score += ampAffinity(hay, source.program.params[P.amp]);
  score += gainAffinity(hay, source.program.params[P.gain]);
  return score;
}

function ampAffinity(hay: string, ampId: number): number {
  const requested = matchAmp(hay);
  if (requested == null) return 0;
  if (ampId === requested) return 7;
  if (sameFamily(ampId, requested)) return 6;
  return -6;
}

function sameFamily(a: number, b: number): boolean {
  return AMP_FAMILIES.some((family) => family.includes(a) && family.includes(b));
}

function gainAffinity(hay: string, gain: number): number {
  const target = preferredGain(gainIntent(hay));
  if (target == null) return 0;
  const delta = Math.abs(gain - target);
  return 8 - Math.min(8, delta / 3);
}

type GainIntent = "hot" | "gritty-clean" | "crunch" | "medium" | "pristine" | "clean" | "chime";

function gainIntent(hay: string): GainIntent | null {
  const clean = has(hay, ["pristine", "glassy", "spanky", "clean"]);
  const crunch = has(hay, ["crunch", "breakup", "pushed", "gritty", "edge"]);
  const hot = has(hay, ["high gain", "saturated", "metal", "djent", "rectifier"]);
  if (hot) return "hot";
  if (crunch && clean) return "gritty-clean";
  if (crunch || hay.includes("edge of breakup")) return "crunch";
  if (hay.includes("medium gain")) return "medium";
  if (has(hay, ["pristine", "glassy", "spanky"])) return "pristine";
  if (clean) return "clean";
  if (hay.includes("chime")) return "chime";
  return null;
}

function preferredGain(intent: GainIntent | null): number | null {
  switch (intent) {
    case "hot":
      return 90;
    case "gritty-clean":
      return 52;
    case "crunch":
      return 62;
    case "medium":
      return 55;
    case "pristine":
      return 28;
    case "clean":
      return 36;
    case "chime":
      return 48;
    default:
      return null;
  }
}

function matchAmp(hay: string): number | null {
  const normal = includesKey(hay, "normal");
  if (normal && (includesKey(hay, "ac30") || includesKey(hay, "vox"))) return 6;
  if (
    normal &&
    (includesKey(hay, "deluxe") || includesKey(hay, "fender") || includesKey(hay, "blackface"))
  ) {
    return 1;
  }
  if (normal && (includesKey(hay, "tweed") || includesKey(hay, "bassman"))) return 3;
  if (normal && (includesKey(hay, "1959") || includesKey(hay, "plexi") || includesKey(hay, "super lead"))) {
    return 9;
  }
  let bestLen = 0;
  let found: number | null = null;
  for (const hint of AMP_HINTS) {
    for (const key of hint.keys) {
      if (includesKey(hay, key) && key.length > bestLen) {
        bestLen = key.length;
        found = hint.prefer ?? hint.ids[0];
      }
    }
  }
  return found;
}

function includesKey(hay: string, key: string): boolean {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`).test(hay);
}

function effectDonor(hay: string, sources: ToneSource[]): ToneSource | null {
  const match = hay.match(/effects from\s+([a-z0-9][^,.]*)/i);
  if (!match) return null;
  const phrase = match[1].trim().toLowerCase();
  const ranked = sources
    .map((source) => ({ source, score: scoreSource(source, phrase) }))
    .sort((a, b) => b.score - a.score);
  return ranked[0] && ranked[0].score > 0 ? ranked[0].source : null;
}

function copyEffects(from: number[], to: number[]) {
  for (let i = 10; i <= 30; i++) {
    if (i === 13 || i === 14) continue;
    to[i] = from[i];
  }
  for (let i = 39; i <= 44; i++) to[i] = from[i];
  to[P.character] = (to[P.character] & ~EFFECT_ENABLE) | (from[P.character] & EFFECT_ENABLE);
}

function applyGain(hay: string, params: number[], notes: string[]) {
  const intent = gainIntent(hay);
  let target: number | null = null;
  if (intent === "hot") target = Math.max(params[P.gain], 90);
  else if (intent === "gritty-clean" || intent === "crunch" || intent === "medium") {
    target = preferredGain(intent);
  } else if (intent === "pristine") target = Math.min(params[P.gain], 28);
  else if (intent === "clean") target = Math.min(params[P.gain], 36);
  else if (intent === "chime") target = clampKnob((params[P.gain] + 48) / 2);
  if (target != null && target !== params[P.gain]) {
    params[P.gain] = target;
    notes.push(`Gain set to ${target}.`);
  }
}

function applyEq(hay: string, params: number[], notes: string[]) {
  const before = [params[P.treble], params[P.middle], params[P.bass], params[P.presence]];
  if (has(hay, ["scooped", "scoop"])) {
    params[P.middle] = Math.min(params[P.middle], 28);
    params[P.bass] = clampKnob(params[P.bass] + 10);
    params[P.treble] = clampKnob(params[P.treble] + 8);
  }
  if (hay.includes("tight")) {
    params[P.bass] = clampKnob(params[P.bass] - 8);
    params[P.resonance] = clampKnob(params[P.resonance] - 8);
  }
  if (has(hay, ["darker", "dark"])) {
    params[P.treble] = clampKnob(params[P.treble] - 12);
    params[P.presence] = clampKnob(params[P.presence] - 4);
  }
  if (has(hay, ["brighter", "bright"])) {
    params[P.treble] = clampKnob(params[P.treble] + 12);
    params[P.presence] = clampKnob(params[P.presence] + 6);
  }
  if (hay.includes("warm")) {
    params[P.middle] = clampKnob(params[P.middle] + 8);
    params[P.treble] = clampKnob(params[P.treble] - 8);
  }
  const after = [params[P.treble], params[P.middle], params[P.bass], params[P.presence]];
  if (before.some((value, index) => value !== after[index])) {
    notes.push(
      `EQ is now treble ${params[P.treble]}, middle ${params[P.middle]}, bass ${params[P.bass]}.`,
    );
  }
}

function applyReverb(hay: string, params: number[], notes: string[]) {
  if (includesKey(hay, "dry") || includesKey(hay, "no reverb")) {
    const hadMix = params[P.reverbMix] !== 0;
    const wasOn = (params[P.character] & REVERB_ENABLE) !== 0;
    if (hadMix) params[P.reverbMix] = 0;
    if (wasOn) params[P.character] &= ~REVERB_ENABLE;
    if (hadMix || wasOn) notes.push("Reverb mix turned to 0.");
    return;
  }
  const types: [string, number][] = [
    ["spring", 1],
    ["hall", 2],
    ["plate", 3],
    ["room", 0],
  ];
  const reverbHay = hay.replace(/\btone\s+room\b/g, " ");
  for (const [word, id] of types) {
    if (!includesKey(reverbHay, word)) continue;
    params[P.reverbType] = id;
    if (params[P.reverbMix] < 34) params[P.reverbMix] = 40;
    params[P.character] |= REVERB_ENABLE;
    notes.push(`${word[0].toUpperCase()}${word.slice(1)} reverb, mix ${params[P.reverbMix]}.`);
    return;
  }
  if (includesKey(hay, "more reverb")) {
    params[P.reverbMix] = clampKnob(params[P.reverbMix] + 18);
    params[P.character] |= REVERB_ENABLE;
    notes.push(`Reverb mix raised to ${params[P.reverbMix]}.`);
  } else if (includesKey(hay, "less reverb")) {
    params[P.reverbMix] = clampKnob(params[P.reverbMix] - 18);
    notes.push(`Reverb mix lowered to ${params[P.reverbMix]}.`);
  }
}

const PEDAL_WORDS: { kind: "pedal1" | "pedal2"; id: number; keys: string[] }[] = [
  { kind: "pedal1", id: 0, keys: ["comp"] },
  { kind: "pedal1", id: 1, keys: ["chorus"] },
  { kind: "pedal1", id: 2, keys: ["tube od", "overdrive"] },
  { kind: "pedal1", id: 3, keys: ["gold drive", "klon"] },
  { kind: "pedal1", id: 4, keys: ["treble boost"] },
  { kind: "pedal1", id: 6, keys: ["distortion"] },
  { kind: "pedal1", id: 9, keys: ["fuzz"] },
  { kind: "pedal2", id: 0, keys: ["flanger"] },
  { kind: "pedal2", id: 2, keys: ["phaser"] },
  { kind: "pedal2", id: 4, keys: ["tremolo"] },
  { kind: "pedal2", id: 5, keys: ["tape echo"] },
  { kind: "pedal2", id: 6, keys: ["delay"] },
];

function applyPedals(hay: string, params: number[], notes: string[]) {
  for (const kind of ["pedal1", "pedal2"] as const) {
    let best: { id: number; key: string; index: number } | null = null;
    for (const entry of PEDAL_WORDS) {
      if (entry.kind !== kind) continue;
      for (const key of entry.keys) {
        const index = keywordAt(hay, key);
        if (index < 0) continue;
        if (!best || index > best.index || (index === best.index && key.length > best.key.length)) {
          best = { id: entry.id, key, index };
        }
      }
    }
    if (!best) continue;
    const switched = switchEffectType(params, kind, best.id);
    for (let index = 0; index < switched.length; index++) params[index] = switched[index];
    const bit = kind === "pedal1" ? PEDAL1_ENABLE : PEDAL2_ENABLE;
    params[P.character] |= bit;
    const label = kind === "pedal1" ? "Pedal 1" : "Pedal 2";
    notes.push(`${label} set to ${effectById(kind, best.id).name}.`);
  }
}

function keywordAt(hay: string, key: string): number {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  const re = new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`, "g");
  let found = -1;
  for (let match = re.exec(hay); match; match = re.exec(hay)) {
    if (key === "overdrive" && /overdrive\s+special(?:$|[^a-z0-9])/.test(hay.slice(match.index))) {
      continue;
    }
    if (
      key === "delay" &&
      /pre[-\s]+delay/.test(hay.slice(Math.max(0, match.index - 4), match.index + match[0].length))
    ) {
      continue;
    }
    found = match.index;
  }
  return found;
}

function applySwitches(hay: string, params: number[], notes: string[]) {
  const flags: [string, number, string][] = [
    ["bright cap", 10, "Bright cap"],
    ["low cut", 11, "Low cut"],
    ["mid boost", 12, "Mid boost"],
  ];
  for (const [phrase, index, label] of flags) {
    const state = phraseState(hay, phrase);
    if (state == null) continue;
    const value = state === "on" ? 1 : 0;
    if (params[index] === value) continue;
    params[index] = value;
    notes.push(`${label} ${state}.`);
  }

  let bias: number | null = null;
  let biasName = "";
  if (includesKey(hay, "cold bias") || /\bbias\s+cold\b/.test(hay)) {
    bias = 1;
    biasName = "cold";
  } else if (includesKey(hay, "hot bias") || /\bbias\s+hot\b/.test(hay)) {
    bias = 2;
    biasName = "hot";
  } else if (includesKey(hay, "standard bias") || /\bbias\s+standard\b/.test(hay)) {
    bias = 0;
    biasName = "standard";
  }
  if (bias != null && params[P.bias] !== bias) {
    params[P.bias] = bias;
    notes.push(`Bias set to ${biasName}.`);
  }

  let ampClass: number | null = null;
  if (includesKey(hay, "class ab") || includesKey(hay, "class a/b")) ampClass = 1;
  else if (includesKey(hay, "class a")) ampClass = 0;
  if (ampClass != null && params[P.ampClass] !== ampClass) {
    params[P.ampClass] = ampClass;
    notes.push(ampClass === 0 ? "Power amp set to Class A." : "Power amp set to Class AB.");
  }
}

function phraseState(hay: string, phrase: string): "on" | "off" | null {
  const body = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  const off = new RegExp(
    `(?:\\bno|\\bwithout)\\s+${body}(?:$|[^a-z0-9])|(?:^|[^a-z0-9])${body}\\s+off(?:$|[^a-z0-9])`,
  );
  if (off.test(hay)) return "off";
  if (includesKey(hay, phrase)) return "on";
  return null;
}

function applyExplicitKnobs(hay: string, params: number[], notes: string[]) {
  const knobs: { word: string; index: number; max: number; label: string }[] = [
    { word: "gain", index: P.gain, max: 100, label: "Gain" },
    { word: "treble", index: P.treble, max: 100, label: "Treble" },
    { word: "middle", index: P.middle, max: 100, label: "Middle" },
    { word: "mid", index: P.middle, max: 100, label: "Mid" },
    { word: "bass", index: P.bass, max: 100, label: "Bass" },
    { word: "presence", index: P.presence, max: 100, label: "Presence" },
    { word: "tone", index: P.presence, max: 100, label: "Tone" },
    { word: "resonance", index: P.resonance, max: 100, label: "Resonance" },
    { word: "volume", index: P.volume, max: 100, label: "Volume" },
    { word: "nr", index: P.nr, max: 100, label: "Nr" },
    { word: "noise", index: P.nr, max: 100, label: "Noise" },
    { word: "reverb mix", index: P.reverbMix, max: 100, label: "Reverb mix" },
    { word: "reverb time", index: P.reverbTime, max: 100, label: "Reverb time" },
    { word: "pre-delay", index: P.preDelay, max: 70, label: "Pre-delay" },
    { word: "pre delay", index: P.preDelay, max: 70, label: "Pre delay" },
  ];
  for (const knob of knobs) {
    const body = knob.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
    const match = hay.match(new RegExp(`\\b${body}\\s*(?:at|to|around)?\\s*(\\d+(?:\\.\\d+)?)`));
    if (!match) continue;
    const next = scaleStored(Number(match[1]), knob.max);
    if (params[knob.index] !== next) {
      params[knob.index] = next;
      notes.push(`${knob.label} set to ${next}.`);
    }
  }
}

/** 0–10 is a knob position stored times ten. Above 10 is the stored byte. Pre-delay stays 0–70. */
function scaleStored(value: number, max: number): number {
  if (max === 70) return clampKnob(value, 70);
  return clampKnob(value <= 10 ? value * 10 : value, max);
}

function chooseName(prompt: string, baseLabel: string): string {
  const explicit = explicitName(prompt);
  if (explicit) return explicit;
  if (prompt.trim().length <= 16 && /^[\x20-\x7e]+$/.test(prompt.trim())) {
    return prompt.trim();
  }
  if (baseLabel.trim().toLowerCase() === "empty" || baseLabel.trim() === "") {
    return deriveTitle(prompt);
  }
  return baseLabel.slice(0, 16);
}

function explicitName(prompt: string): string {
  const quoted = prompt.match(/[“"]([^”"]{1,40})[”"]/);
  if (quoted?.[1]) return quoted[1].trim().slice(0, 16).trim();
  const called = prompt.match(/\b(?:call it|name it|named)\s+([A-Za-z0-9][^,\n]{0,40})/i);
  if (!called?.[1]) return "";
  const stopped = called[1].split(/\s+(?:and|with|but|or|plus|nor|for)\b/i)[0] ?? "";
  return stopped.trim().slice(0, 16).trim();
}

function deriveTitle(prompt: string): string {
  const clause = prompt.split(/\s*(?:,|\.|\b(?:and|with|but|or|plus)\b)\s*/i)[0]?.trim() ?? "";
  const words = clause.split(/\s+/).filter(Boolean);
  let title = "";
  for (const word of words) {
    const next = title ? `${title} ${word}` : word;
    if (next.length > 16) break;
    title = next;
  }
  return title.trim().slice(0, 16) || "Tone";
}

function has(hay: string, words: string[]): boolean {
  return words.some((word) => hay.includes(word));
}
