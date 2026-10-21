import { AMP_PARAM, ampById } from "@/lib/amps";
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
} as const;

type AmpHint = {
  keys: string[];
  ids: number[];
  /** Prefer this id when several family members match. */
  prefer?: number;
};

const AMP_HINTS: AmpHint[] = [
  { keys: ["deluxe", "blackface", "fender"], ids: [0, 1], prefer: 0 },
  { keys: ["tweed", "bassman"], ids: [2, 3], prefer: 2 },
  { keys: ["boutique clean", "dumble clean"], ids: [4], prefer: 4 },
  { keys: ["boutique od", "dumble", "overdrive special"], ids: [5], prefer: 5 },
  { keys: ["boutique cl", "boutique clean"], ids: [4], prefer: 4 },
  { keys: ["ac30tb", "top boost", "chime"], ids: [7], prefer: 7 },
  { keys: ["ac30", "vox"], ids: [6, 7], prefer: 7 },
  { keys: ["plexi", "1959", "super lead"], ids: [8, 9], prefer: 8 },
  { keys: ["jcm", "jcm800", "brit 800"], ids: [10], prefer: 10 },
  { keys: ["vintage modern", "brit vm"], ids: [11], prefer: 11 },
  { keys: ["soldano", "slo"], ids: [12], prefer: 12 },
  { keys: ["rectifier", "mesa", "double rec"], ids: [13], prefer: 13 },
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
  if (includesKey(hay, "normal channel") && includesKey(hay, "ac30")) return 6;
  if (includesKey(hay, "normal channel") && (includesKey(hay, "deluxe") || includesKey(hay, "fender"))) {
    return 1;
  }
  if (includesKey(hay, "normal") && includesKey(hay, "tweed")) return 3;
  if (includesKey(hay, "normal") && (includesKey(hay, "1959") || includesKey(hay, "plexi"))) return 9;
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
  if (has(hay, ["dry", "no reverb"])) {
    if (params[P.reverbMix] !== 0) {
      params[P.reverbMix] = 0;
      notes.push("Reverb mix turned to 0.");
    }
    return;
  }
  const types: [string, number][] = [
    ["spring", 1],
    ["hall", 2],
    ["plate", 3],
    ["room", 0],
  ];
  for (const [word, id] of types) {
    if (hay.includes(word)) {
      params[P.reverbType] = id;
      if (params[P.reverbMix] < 34) params[P.reverbMix] = 40;
      notes.push(`${word[0].toUpperCase()}${word.slice(1)} reverb, mix ${params[P.reverbMix]}.`);
      return;
    }
  }
  if (hay.includes("more reverb")) {
    params[P.reverbMix] = clampKnob(params[P.reverbMix] + 18);
    notes.push(`Reverb mix raised to ${params[P.reverbMix]}.`);
  } else if (hay.includes("less reverb")) {
    params[P.reverbMix] = clampKnob(params[P.reverbMix] - 18);
    notes.push(`Reverb mix lowered to ${params[P.reverbMix]}.`);
  }
}

function applyExplicitKnobs(hay: string, params: number[], notes: string[]) {
  const knobs: [string, number][] = [
    ["gain", P.gain],
    ["treble", P.treble],
    ["middle", P.middle],
    ["mid", P.middle],
    ["bass", P.bass],
    ["presence", P.presence],
    ["tone", P.presence],
    ["resonance", P.resonance],
    ["volume", P.volume],
    ["nr", P.nr],
    ["noise", P.nr],
  ];
  for (const [word, index] of knobs) {
    const match = hay.match(new RegExp(`\\b${word}\\s*(?:at|to|around)?\\s*(\\d+(?:\\.\\d+)?)`));
    if (!match) continue;
    let value = Number(match[1]);
    if (value <= 10) value *= 10;
    const next = clampKnob(value);
    if (params[index] !== next) {
      params[index] = next;
      notes.push(`${word[0].toUpperCase()}${word.slice(1)} set to ${next}.`);
    }
  }
}

function chooseName(prompt: string, baseLabel: string): string {
  const quoted = prompt.match(/[“"]([^”"]{1,40})[”"]/);
  const called = prompt.match(/\b(?:call it|name it|named)\s+([A-Za-z0-9][^,\n]{0,24})/i);
  const raw = (quoted?.[1] ?? called?.[1] ?? "").trim();
  if (raw) return raw.slice(0, 16).trim();
  if (prompt.trim().length <= 16 && /^[\x20-\x7e]+$/.test(prompt.trim())) {
    return prompt.trim();
  }
  return baseLabel.slice(0, 16);
}

function has(hay: string, words: string[]): boolean {
  return words.some((word) => hay.includes(word));
}
