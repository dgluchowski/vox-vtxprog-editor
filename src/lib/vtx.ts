export const MAGIC = "VTXPROG1000 ";
export const HEADER_LEN = 32;
export const NAME_LEN = 16;
export const PARAM_LEN = 46;
export const RECORD_LEN = NAME_LEN + PARAM_LEN;

export type Program = {
  name: string;
  params: number[];
};

export type Bank = {
  programs: Program[];
};

export class VtxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VtxError";
  }
}

/** Bytes the editor writes into a new eight-program bank. */
export const BLANK_SLOT_PARAMS: readonly number[] = [
  24, 16, 0, 35, 61, 71, 60, 9, 0, 60, 1, 0, 0, 0, 1, 1, 0, 3, 48, 36, 50, 0, 0,
  5, 117, 0, 33, 50, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 38, 45, 0, 36, 25, 0,
];

export function blankProgram(name = "Empty"): Program {
  return { name, params: [...BLANK_SLOT_PARAMS] };
}

export function cloneProgram(program: Program): Program {
  return { name: program.name, params: [...program.params] };
}

export function parseVtx(data: Uint8Array): Bank {
  if (data.length < HEADER_LEN + RECORD_LEN) {
    throw new VtxError("This file is too small to be a Tone Room program bank.");
  }
  const magic = ascii(data.subarray(0, MAGIC.length));
  if (magic !== MAGIC) {
    throw new VtxError("This file does not start with a VTXPROG1000 header.");
  }
  const body = data.length - HEADER_LEN;
  if (body % RECORD_LEN !== 0) {
    throw new VtxError(
      "The program data is not a whole number of 62-byte programs.",
    );
  }
  const programs: Program[] = [];
  for (let offset = HEADER_LEN; offset < data.length; offset += RECORD_LEN) {
    const nameBytes = data.subarray(offset, offset + NAME_LEN);
    const params = Array.from(data.subarray(offset + NAME_LEN, offset + RECORD_LEN));
    programs.push({ name: decodeName(nameBytes), params });
  }
  return { programs };
}

export function writeVtx(bank: Bank): Uint8Array {
  if (bank.programs.length === 0) {
    throw new VtxError("A bank needs at least one program.");
  }
  const out = new Uint8Array(HEADER_LEN + bank.programs.length * RECORD_LEN);
  for (let i = 0; i < MAGIC.length; i++) out[i] = MAGIC.charCodeAt(i);
  bank.programs.forEach((program, index) => {
    const offset = HEADER_LEN + index * RECORD_LEN;
    const name = encodeName(program.name);
    out.set(name, offset);
    if (program.params.length !== PARAM_LEN) {
      throw new VtxError(`Program ${index + 1} does not have ${PARAM_LEN} parameters.`);
    }
    program.params.forEach((value, paramIndex) => {
      if (!Number.isInteger(value) || value < 0 || value > 255) {
        throw new VtxError(
          `Program ${index + 1} parameter ${paramIndex} is outside 0–255.`,
        );
      }
      out[offset + NAME_LEN + paramIndex] = value;
    });
  });
  return out;
}

export function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

export function setParam(program: Program, index: number, value: number): Program {
  const params = [...program.params];
  params[index] = clampByte(value);
  return { ...program, params };
}

export function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

export function clampKnob(value: number, max = 100): number {
  return Math.max(0, Math.min(max, Math.round(value)));
}

function decodeName(bytes: Uint8Array): string {
  let text = "";
  for (const byte of bytes) text += String.fromCharCode(byte);
  return text.replace(/\s+$/g, "");
}

function encodeName(name: string): Uint8Array {
  const bytes = new Uint8Array(NAME_LEN);
  bytes.fill(0x20);
  const clean = name.replace(/[^\x20-\x7e]/g, "").slice(0, NAME_LEN);
  for (let i = 0; i < clean.length; i++) bytes[i] = clean.charCodeAt(i);
  return bytes;
}

function ascii(bytes: Uint8Array): string {
  let text = "";
  for (const byte of bytes) text += String.fromCharCode(byte);
  return text;
}

export function slotLabel(index: number): string {
  if (index < 8) {
    const bank = index < 4 ? "A" : "B";
    const channel = (index % 4) + 1;
    return `Bank ${bank} · CH${channel}`;
  }
  return `Extra ${index + 1}`;
}

export function downloadName(name: string): string {
  const base = name.replace(/\.vtxprog$/i, "").trim() || "tone-bank";
  const safe = base.replace(/[^\w.-]+/g, "_").replace(/^_+|_+$/g, "");
  return `${safe || "tone-bank"}.vtxprog`;
}
