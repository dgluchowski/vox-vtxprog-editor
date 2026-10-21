export type AmpModel = {
  id: number;
  name: string;
  basedOn: string;
  /** Present in the example banks, so the id was read off a real program. */
  observed: boolean;
  /** Dedicated position on the VT20X/VT40X/VT100X amp-model knob. */
  onPanel: boolean;
};

/**
 * Tone Room's 20 amp models, in stored order.
 * The mapping fixtures lock every id from 0 through 19.
 */
export const AMPS: AmpModel[] = [
  { id: 0, name: "Deluxe CL Vibrato", basedOn: "22W blackface combo, vibrato channel", observed: true, onPanel: true },
  { id: 1, name: "Deluxe CL Normal", basedOn: "Same combo, normal channel", observed: true, onPanel: false },
  { id: 2, name: "Tweed 4x10 Bright", basedOn: "1959 4×10 combo, bright channel", observed: true, onPanel: true },
  { id: 3, name: "Tweed 4x10 Normal", basedOn: "Same 4×10 combo, normal channel", observed: true, onPanel: false },
  { id: 4, name: "Boutique CL", basedOn: "Overdrive Special, clean channel", observed: true, onPanel: true },
  { id: 5, name: "Boutique OD", basedOn: "Overdrive Special, overdrive channel", observed: true, onPanel: true },
  { id: 6, name: "VOX AC30", basedOn: "AC30 normal channel", observed: true, onPanel: true },
  { id: 7, name: "VOX AC30TB", basedOn: "1964 AC30 with the top boost circuit", observed: true, onPanel: true },
  { id: 8, name: "Brit 1959 Treble", basedOn: "Early-60s 100W head, treble channel", observed: true, onPanel: true },
  { id: 9, name: "Brit 1959 Normal", basedOn: "Same head, normal channel", observed: true, onPanel: false },
  { id: 10, name: "Brit 800", basedOn: "1983 British 100W head with master volume", observed: true, onPanel: true },
  { id: 11, name: "Brit VM", basedOn: "2007 100W head, Overdrive 2 channel", observed: true, onPanel: false },
  { id: 12, name: "SL-OD", basedOn: "1991 100W head, overdrive channel", observed: true, onPanel: false },
  { id: 13, name: "Double Rec", basedOn: "Modern high-gain channel, loose low end", observed: true, onPanel: true },
  { id: 14, name: "Cali Elation", basedOn: "North Hollywood 100W head, class A or AB", observed: true, onPanel: false },
  { id: 15, name: "Erupt III CH2", basedOn: "Three-channel brown-sound head, crunch channel", observed: true, onPanel: false },
  { id: 16, name: "Erupt III CH3", basedOn: "Same head, high-gain channel", observed: true, onPanel: false },
  { id: 17, name: "Boutique Metal", basedOn: "German 100W head, Heavy channel", observed: true, onPanel: true },
  { id: 18, name: "Brit OR MkII", basedOn: "British 100W head with tube spring reverb", observed: true, onPanel: true },
  { id: 19, name: "Original Clean", basedOn: "VOX original clean voicing", observed: true, onPanel: false },
];

export function ampById(id: number): AmpModel {
  return AMPS.find((amp) => amp.id === id) ?? {
    id,
    name: `Amp ${id}`,
    basedOn: "Unknown model id",
    observed: false,
    onPanel: false,
  };
}

export type EffectKnob = {
  label: string;
  index: number;
  min?: number;
  max?: number;
  /**
   * Little-endian pair at `index` and `index + 1`.
   * Millihertz for modulation speed, milliseconds for delay time.
   */
  pair?: "millihertz" | "milliseconds";
  /** Stepped control. Comp voice is 1–3, stored as 0–2. Cuts are off or on. */
  choices?: { id: number; name: string }[];
};

/** Amp knobs the bench writes. 7, 8, and 9 are the 5.0, 2.0, and 7.5 dials. */
export const AMP_PARAM = {
  nr: 0,
  gain: 3,
  treble: 4,
  middle: 5,
  bass: 6,
  volume: 7,
  presence: 8,
  resonance: 9,
} as const;

/** Parameter 8 is Tone on AC30 and AC30TB, Presence on the other models. */
export function toneOrPresence(ampId: number): "Tone" | "Presence" {
  return ampId === 6 || ampId === 7 ? "Tone" : "Presence";
}

export function knobValue(params: readonly number[], knob: EffectKnob): number {
  if (knob.pair) return (params[knob.index] ?? 0) + ((params[knob.index + 1] ?? 0) << 8);
  return params[knob.index] ?? 0;
}

/** Write one knob. Pairs store the full integer little-endian across two bytes. */
export function withKnob(params: readonly number[], knob: EffectKnob, value: number): number[] {
  const next = [...params];
  const min = knob.min ?? 0;
  const max = knob.max ?? (knob.pair ? 0xffff : 100);
  const clamped = Math.max(min, Math.min(max, Math.round(value)));
  if (knob.pair) {
    next[knob.index] = clamped & 0xff;
    next[knob.index + 1] = (clamped >> 8) & 0xff;
    return next;
  }
  next[knob.index] = clamped;
  return next;
}

const ON_OFF = [
  { id: 0, name: "Off" },
  { id: 1, name: "On" },
];

/** Byte 1. These three bits are the only values the example programs use. */
export const PEDAL1_ENABLE = 2;
export const PEDAL2_ENABLE = 4;
export const REVERB_ENABLE = 16;

export type EffectType = {
  id: number;
  name: string;
  /** One of the four types on the amp's effect selector. */
  onPanel: boolean;
  knobs: EffectKnob[];
};

export const BIAS = [
  { id: 0, name: "Standard" },
  { id: 1, name: "Cold" },
  { id: 2, name: "Hot" },
] as const;

export const AMP_CLASS = [
  { id: 0, name: "Class A" },
  { id: 1, name: "Class AB" },
] as const;

export const REVERB = [
  { id: 0, name: "Room" },
  { id: 1, name: "Spring" },
  { id: 2, name: "Hall" },
  { id: 3, name: "Plate" },
] as const;

const driveKnobs: EffectKnob[] = [
  { label: "Gain", index: 16 },
  { label: "Tone", index: 18 },
  { label: "Level", index: 19 },
  { label: "Treble", index: 20 },
  { label: "Middle", index: 21 },
  { label: "Bass", index: 22 },
];

/**
 * Tone Room 1.4 pedal order. The amp selector only has four types per pedal.
 * The rest are editor types. A user program still plays them.
 */
export const PEDAL1: EffectType[] = [
  {
    id: 0,
    name: "Comp",
    onPanel: true,
    knobs: [
      { label: "Sens", index: 16 },
      { label: "Level", index: 18 },
      { label: "Attack", index: 19 },
      {
        label: "Voice",
        index: 20,
        choices: [
          { id: 0, name: "1" },
          { id: 1, name: "2" },
          { id: 2, name: "3" },
        ],
      },
    ],
  },
  {
    id: 1,
    name: "Chorus",
    onPanel: true,
    knobs: [
      { label: "Speed", index: 16, pair: "millihertz", min: 100, max: 10000 },
      { label: "Depth", index: 18 },
      { label: "Manual", index: 19 },
      { label: "Mix", index: 20 },
      { label: "Low cut", index: 21, choices: ON_OFF },
      { label: "High cut", index: 22, choices: ON_OFF },
    ],
  },
  { id: 2, name: "Tube OD", onPanel: true, knobs: driveKnobs },
  { id: 3, name: "Gold Drive", onPanel: false, knobs: driveKnobs },
  { id: 4, name: "Treble Boost", onPanel: false, knobs: driveKnobs },
  { id: 5, name: "RC Turbo", onPanel: false, knobs: driveKnobs },
  { id: 6, name: "Orange Dist", onPanel: true, knobs: driveKnobs },
  { id: 7, name: "Fat Dist", onPanel: false, knobs: driveKnobs },
  { id: 8, name: "Brit Lead", onPanel: false, knobs: driveKnobs },
  { id: 9, name: "Fuzz", onPanel: false, knobs: driveKnobs },
];

const delayKnobs: EffectKnob[] = [
  { label: "Time", index: 24, pair: "milliseconds", min: 30, max: 1200 },
  { label: "Level", index: 26 },
  { label: "Feedback", index: 27 },
  { label: "Tone", index: 28 },
  { label: "Mod speed", index: 29 },
  { label: "Mod depth", index: 30 },
];

export const PEDAL2: EffectType[] = [
  {
    id: 0,
    name: "Flanger",
    onPanel: true,
    knobs: [
      { label: "Speed", index: 24, pair: "millihertz", min: 100, max: 5000 },
      { label: "Depth", index: 26 },
      { label: "Manual", index: 27 },
      { label: "Low cut", index: 28, choices: ON_OFF },
      { label: "High cut", index: 29, choices: ON_OFF },
      { label: "Resonance", index: 30 },
    ],
  },
  {
    id: 1,
    name: "Blk Phaser",
    onPanel: false,
    knobs: [
      { label: "Speed", index: 24, pair: "millihertz", min: 100, max: 10000 },
      { label: "Resonance", index: 26 },
      { label: "Manual", index: 27 },
      { label: "Depth", index: 28 },
    ],
  },
  {
    id: 2,
    name: "Org Phaser 1",
    onPanel: true,
    knobs: [
      { label: "Speed", index: 24, pair: "millihertz", min: 100, max: 10000 },
      { label: "Resonance", index: 26 },
      { label: "Manual", index: 27 },
      { label: "Depth", index: 28 },
    ],
  },
  {
    id: 3,
    name: "Org Phaser 2",
    onPanel: false,
    knobs: [
      { label: "Speed", index: 24, pair: "millihertz", min: 100, max: 10000 },
      { label: "Resonance", index: 26 },
      { label: "Manual", index: 27 },
      { label: "Depth", index: 28 },
    ],
  },
  {
    id: 4,
    name: "Tremolo",
    onPanel: true,
    knobs: [
      { label: "Speed", index: 24, pair: "millihertz", min: 1650, max: 10000 },
      { label: "Depth", index: 26 },
      { label: "Duty", index: 27 },
      { label: "Shape", index: 28 },
      { label: "Level", index: 29 },
    ],
  },
  { id: 5, name: "Tape Echo", onPanel: true, knobs: delayKnobs },
  { id: 6, name: "Analog Delay", onPanel: false, knobs: delayKnobs },
];

export function effectById(kind: "pedal1" | "pedal2", id: number): EffectType {
  const list = kind === "pedal1" ? PEDAL1 : PEDAL2;
  return (
    list.find((effect) => effect.id === id) ?? {
      id,
      name: `Type ${id}`,
      onPanel: false,
      knobs: kind === "pedal1" ? driveKnobs : delayKnobs,
    }
  );
}

export function pedalLabel(kind: "pedal1" | "pedal2", id: number): string {
  const effect = effectById(kind, id);
  return effect.onPanel ? effect.name : `${effect.name} · Tone Room`;
}

