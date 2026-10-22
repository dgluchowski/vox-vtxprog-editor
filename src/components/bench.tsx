"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import {
  AMPS,
  AMP_CLASS,
  AMP_PARAM,
  BIAS,
  PEDAL1,
  PEDAL1_ENABLE,
  PEDAL2,
  PEDAL2_ENABLE,
  REVERB,
  REVERB_ENABLE,
  ampById,
  effectById,
  knobValue,
  pedalLabel,
  toneOrPresence,
  withKnob,
  type EffectKnob,
} from "@/lib/amps";
import { SUGGESTIONS, describeProgram, shapeTone } from "@/lib/tone";
import {
  VtxError,
  downloadName,
  parseVtx,
  setParam,
  slotLabel,
  blankProgram,
  writeVtx,
  type Bank,
  type Program,
} from "@/lib/vtx";
import { Knob } from "@/components/knob";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function Bench() {
  const [bank, setBank] = useState<Bank | null>({
    programs: Array.from({ length: 8 }, () => blankProgram()),
  });
  const [active, setActive] = useState(0);
  const [fileName, setFileName] = useState("new-bank.vtxprog");
  const [prompt, setPrompt] = useState(SUGGESTIONS[0].prompt);
  const [notes, setNotes] = useState<string[]>([
    "Eight empty slots. Write a tone into the channel you want to keep.",
  ]);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const program = bank?.programs[active] ?? null;

  const sources = useMemo(() => {
    if (!bank) return [];
    return bank.programs.map((item, slot) => ({
      bankTitle: fileName.replace(/\.vtxprog$/i, ""),
      slot,
      program: item,
    }));
  }, [bank, fileName]);

  function update(mutator: (program: Program) => Program) {
    setBank((current) => {
      if (!current) return current;
      return {
        programs: current.programs.map((item, index) => (index === active ? mutator(item) : item)),
      };
    });
  }

  function setKnob(index: number, value: number) {
    update((item) => setParam(item, index, value));
  }

  function applyEffectKnob(knob: EffectKnob, value: number) {
    update((item) => ({ ...item, params: withKnob(item.params, knob, value) }));
  }

  function writePrompt(nextPrompt = prompt) {
    if (!bank) return;
    try {
      const shaped = shapeTone(nextPrompt, sources);
      update(() => shaped.program);
      setNotes(shaped.notes);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not shape that tone.");
    }
  }

  function newBank() {
    setBank({ programs: Array.from({ length: 8 }, () => blankProgram()) });
    setActive(0);
    setFileName("new-bank.vtxprog");
    setNotes(["Eight empty slots. Write a tone into the channel you want to keep."]);
    setError(null);
  }

  async function onFile(file: File) {
    try {
      const parsed = parseVtx(new Uint8Array(await file.arrayBuffer()));
      setBank(parsed);
      setActive(0);
      setFileName(file.name);
      setNotes([`Opened ${file.name}. ${parsed.programs.length} programs.`]);
      setError(null);
    } catch (caught) {
      setError(caught instanceof VtxError || caught instanceof Error ? caught.message : "Could not open that file.");
    }
  }

  function download() {
    if (!bank) return;
    try {
      const bytes = writeVtx(bank);
      const buffer = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(buffer).set(bytes);
      const blob = new Blob([buffer], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = downloadName(fileName);
      link.click();
      URL.revokeObjectURL(url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not write the file.");
    }
  }

  return (
    <div className="grille min-h-full">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] tracking-[0.22em] text-[oklch(0.78_0.04_80)] uppercase">
              VOX Tone Room · VT20X / VT40X / VT100X
            </p>
            <h1 className="font-heading text-4xl text-[oklch(0.95_0.02_90)] sm:text-5xl">
              Vtx Bench
            </h1>
            <p className="mt-1 max-w-xl text-sm text-[oklch(0.82_0.02_85)]">
              Describe a tone. The bench rewrites one program in the bank and saves a
              <span className="font-mono"> .vtxprog </span>
              Tone Room can open.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
              Open file
            </Button>
            <Button variant="secondary" size="sm" onClick={newBank}>
              New bank
            </Button>
            <Button size="sm" onClick={download} disabled={!bank}>
              Download bank
            </Button>
            <HelpDialog />
            <input
              ref={fileRef}
              type="file"
              accept=".vtxprog,application/octet-stream"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void onFile(file);
                event.target.value = "";
              }}
            />
          </div>
        </header>

        {error ? (
          <p className="rounded-lg border border-destructive/40 bg-destructive/15 px-3 py-2 text-sm text-[oklch(0.95_0.02_90)]">
            {error}
          </p>
        ) : null}

        {!bank || !program ? (
          <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-[oklch(0.9_0.02_90)]">
            <p>No bank is open.</p>
            <p className="mt-1 text-[oklch(0.78_0.02_85)]">
              Open a .vtxprog file, or start a new 8-channel bank.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="flex flex-col gap-4 rounded-2xl bg-card p-4 text-card-foreground shadow-lg">
              <div className="space-y-2">
                <Label htmlFor="prompt">Tone</Label>
                <Textarea
                  id="prompt"
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  rows={5}
                  placeholder="Scooped high gain, tight, spring reverb"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion.label}
                    type="button"
                    className="rounded-full border border-border bg-secondary px-2.5 py-1 text-xs text-secondary-foreground hover:bg-primary hover:text-primary-foreground"
                    onClick={() => {
                      setPrompt(suggestion.prompt);
                      writePrompt(suggestion.prompt);
                    }}
                  >
                    {suggestion.label}
                  </button>
                ))}
              </div>
              <Button onClick={() => writePrompt()}>Write into this channel</Button>
              <p className="text-xs leading-relaxed text-muted-foreground">
                The rest of the bank stays as it is. Tone Room replaces whatever is on the amp
                when you load the file, so keep a backup of your current programs.
              </p>
              {notes.length > 0 ? (
                <ul className="space-y-1 border-t border-border pt-3 text-sm">
                  {notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              ) : null}
            </aside>

            <section className="flex min-w-0 flex-col gap-4">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {bank.programs.map((item, index) => (
                  <button
                    key={`${item.name}-${index}`}
                    type="button"
                    onClick={() => setActive(index)}
                    className={`min-w-36 shrink-0 rounded-xl border px-3 py-2 text-left ${
                      index === active
                        ? "border-[oklch(0.62_0.14_35)] bg-card text-card-foreground"
                        : "border-white/10 bg-black/20 text-[oklch(0.9_0.02_90)]"
                    }`}
                  >
                    <span className="block text-[10px] tracking-[0.14em] uppercase opacity-70">
                      {slotLabel(index)}
                    </span>
                    <span className="block truncate text-sm">{item.name || "Empty"}</span>
                  </button>
                ))}
              </div>

              <div className="rounded-2xl bg-card p-4 text-card-foreground shadow-lg sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Label htmlFor="program-name">Program name</Label>
                    <Input
                      id="program-name"
                      value={program.name}
                      maxLength={16}
                      onChange={(event) =>
                        update((item) => ({ ...item, name: event.target.value.slice(0, 16) }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      {program.name.length}/16 characters · {slotLabel(active)} · {fileName}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-sm">{describeProgram(program)}</p>

                <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px_180px]">
                  <Field label="Amp model">
                    <Select
                      value={String(program.params[2])}
                      items={AMPS.map((amp) => ({ value: String(amp.id), label: amp.name }))}
                      onValueChange={(value) => {
                        if (value == null) return;
                        const next = Number(value);
                        update((item) => {
                          const previous = item.params[2];
                          let program = setParam(item, 2, next);
                          if (next === 6 || next === 7) program = setParam(program, 14, 0);
                          else if (previous === 6 || previous === 7) program = setParam(program, 14, 1);
                          return program;
                        });
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AMPS.map((amp) => (
                          <SelectItem key={amp.id} value={String(amp.id)}>
                            {amp.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {ampById(program.params[2]).basedOn}
                      {ampById(program.params[2]).onPanel
                        ? ""
                        : " Tone Room model. A user program carries it. The user bank is eight slots, A-1 through B-4."}
                    </p>
                  </Field>
                  <Field label="Bias">
                    <Choice
                      value={program.params[13]}
                      options={BIAS.map((item) => ({ id: item.id, name: item.name }))}
                      onChange={(value) => setKnob(13, value)}
                    />
                  </Field>
                  <Field label="Power amp">
                    <Choice
                      value={program.params[14]}
                      options={AMP_CLASS.map((item) => ({ id: item.id, name: item.name }))}
                      onChange={(value) => setKnob(14, value)}
                    />
                  </Field>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
                  <Knob label="NR sens" value={program.params[AMP_PARAM.nr]} onChange={(value) => setKnob(AMP_PARAM.nr, value)} />
                  <Knob label="Gain" value={program.params[AMP_PARAM.gain]} onChange={(value) => setKnob(AMP_PARAM.gain, value)} />
                  <Knob label="Treble" value={program.params[AMP_PARAM.treble]} onChange={(value) => setKnob(AMP_PARAM.treble, value)} />
                  <Knob label="Middle" value={program.params[AMP_PARAM.middle]} onChange={(value) => setKnob(AMP_PARAM.middle, value)} />
                  <Knob label="Bass" value={program.params[AMP_PARAM.bass]} onChange={(value) => setKnob(AMP_PARAM.bass, value)} />
                  <Knob label="Volume" value={program.params[AMP_PARAM.volume]} onChange={(value) => setKnob(AMP_PARAM.volume, value)} />
                  <Knob
                    label={toneOrPresence(program.params[2])}
                    value={program.params[AMP_PARAM.presence]}
                    onChange={(value) => setKnob(AMP_PARAM.presence, value)}
                  />
                  <Knob label="Resonance" value={program.params[AMP_PARAM.resonance]} onChange={(value) => setKnob(AMP_PARAM.resonance, value)} />
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Volume is the knob that reads 5.0. Tone on AC30 and AC30TB, and Presence
                  on the other models, is the knob that reads 2.0. Resonance is the knob
                  that reads 7.5. Presence boosts the high end; on some models that same
                  control cuts highs. Resonance boosts the low end and keeps it tight.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <Field label="Bright cap">
                    <Choice
                      value={program.params[10] === 0 ? 0 : 1}
                      options={[
                        { id: 0, name: "Off" },
                        { id: 1, name: "On" },
                      ]}
                      onChange={(value) => setKnob(10, value)}
                    />
                  </Field>
                  <Field label="Mid boost">
                    <Choice
                      value={program.params[12] === 0 ? 0 : 1}
                      options={[
                        { id: 0, name: "Off" },
                        { id: 1, name: "On" },
                      ]}
                      onChange={(value) => setKnob(12, value)}
                    />
                  </Field>
                  <Field label="Low cut">
                    <Choice
                      value={program.params[11] === 0 ? 0 : 1}
                      options={[
                        { id: 0, name: "Off" },
                        { id: 1, name: "On" },
                      ]}
                      onChange={(value) => setKnob(11, value)}
                    />
                  </Field>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Bright cap, mid boost, and low cut are Tone Room controls. The program
                  stores each one as off or on. Low cut is stored before mid boost.
                </p>

                <div className="mt-6 grid gap-4 lg:grid-cols-3">
                  <EffectBlock
                    title="Pedal 1"
                    type={program.params[15]}
                    onType={(value) => setKnob(15, value)}
                    kind="pedal1"
                    params={program.params}
                    onKnob={setKnob}
                    onEffectKnob={applyEffectKnob}
                  />
                  <EffectBlock
                    title="Pedal 2"
                    type={program.params[23]}
                    onType={(value) => setKnob(23, value)}
                    kind="pedal2"
                    params={program.params}
                    onKnob={setKnob}
                    onEffectKnob={applyEffectKnob}
                  />
                  <div className="rounded-xl border border-border p-3">
                    <h3 className="text-sm font-medium">Reverb</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Mix and time are on the amp. Pre delay, low damp, and high damp are
                      Tone Room controls. Pre delay tops out at 70.
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <Field label="Type">
                        <Choice
                          value={program.params[39]}
                          options={REVERB.map((item) => ({ id: item.id, name: item.name }))}
                          onChange={(value) => setKnob(39, value)}
                        />
                      </Field>
                      <Field label="Enable">
                        <Choice
                          value={(program.params[1] & REVERB_ENABLE) === 0 ? 0 : 1}
                          options={[
                            { id: 0, name: "Off" },
                            { id: 1, name: "On" },
                          ]}
                          onChange={(value) =>
                            setKnob(1, (program.params[1] & ~REVERB_ENABLE) | (value === 0 ? 0 : REVERB_ENABLE))
                          }
                        />
                      </Field>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <Knob label="Mix" value={program.params[40]} onChange={(value) => setKnob(40, value)} />
                      <Knob label="Time" value={program.params[41]} onChange={(value) => setKnob(41, value)} />
                      <Knob label="Pre delay" value={program.params[42]} max={70} onChange={(value) => setKnob(42, value)} />
                      <Knob label="Low damp" value={program.params[43]} onChange={(value) => setKnob(43, value)} />
                      <Knob label="High damp" value={program.params[44]} onChange={(value) => setKnob(44, value)} />
                    </div>
                  </div>
                </div>

              </div>
            </section>
          </div>
        )}

        <footer className="text-xs leading-relaxed text-[oklch(0.75_0.02_80)]">
          Vtx Bench is not affiliated with VOX or Korg. Open your own Tone Room bank, or start
          from the eight empty slots.
        </footer>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Choice({
  value,
  options,
  onChange,
}: {
  value: number;
  options: { id: number; name: string }[];
  onChange: (value: number) => void;
}) {
  const known = options.some((option) => option.id === value);
  const items = known ? options : [{ id: value, name: String(value) }, ...options];
  return (
    <Select
      value={String(value)}
      items={items.map((option) => ({ value: String(option.id), label: option.name }))}
      onValueChange={(next) => {
        if (next != null) onChange(Number(next));
      }}
    >
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((option) => (
          <SelectItem key={option.id} value={String(option.id)}>
            {option.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function EffectBlock({
  title,
  type,
  kind,
  onType,
  params,
  onKnob,
  onEffectKnob,
}: {
  title: string;
  type: number;
  kind: "pedal1" | "pedal2";
  onType: (value: number) => void;
  params: number[];
  onKnob: (index: number, value: number) => void;
  onEffectKnob: (knob: EffectKnob, value: number) => void;
}) {
  const list = kind === "pedal1" ? PEDAL1 : PEDAL2;
  const effect = effectById(kind, type);
  return (
    <div className="rounded-xl border border-border p-3">
      <h3 className="text-sm font-medium">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        {effect.onPanel
          ? "On the amp’s effect selector."
          : "Tone Room type. The amp’s selector does not list it. A user program still plays it."}
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="Type">
          <Choice
            value={type}
            options={list.map((item) => ({ id: item.id, name: pedalLabel(kind, item.id) }))}
            onChange={onType}
          />
        </Field>
        <Field label="Power">
          <Choice
            value={(params[1] & (kind === "pedal1" ? PEDAL1_ENABLE : PEDAL2_ENABLE)) === 0 ? 0 : 1}
            options={[
              { id: 0, name: "Off" },
              { id: 1, name: "On" },
            ]}
            onChange={(value) => {
              const bit = kind === "pedal1" ? PEDAL1_ENABLE : PEDAL2_ENABLE;
              onKnob(1, (params[1] & ~bit) | (value === 0 ? 0 : bit));
            }}
          />
        </Field>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {effect.knobs.map((knob) =>
          knob.choices ? (
            <Field key={`${knob.label}-${knob.index}`} label={knob.label}>
              <Choice
                value={params[knob.index]}
                options={knob.choices}
                onChange={(value) => onKnob(knob.index, value)}
              />
            </Field>
          ) : (
            <Knob
              key={`${knob.label}-${knob.index}`}
              label={knob.label}
              min={knob.min ?? 0}
              max={knob.max ?? 100}
              value={knobValue(params, knob)}
              format={
                knob.pair === "millihertz"
                  ? (next) => (next / 1000).toFixed(3)
                  : knob.pair === "milliseconds"
                    ? (next) => `${next} ms`
                    : undefined
              }
              onChange={(value) => onEffectKnob(knob, value)}
            />
          ),
        )}
      </div>
    </div>
  );
}

function HelpDialog() {
  return (
    <Dialog>
      <DialogTrigger
        render={<Button variant="secondary" size="sm" />}
      >
        How the file works
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>What a .vtxprog file is</DialogTitle>
          <DialogDescription>
            A Tone Room bank for the VT20X, VT40X, and VT100X.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            The file starts with the text VTXPROG1000, then a run of 62-byte programs.
            Sixteen bytes are the name. The next 46 are the amp, valves, pedals, reverb,
            and noise reduction. Eight programs fill the amp: bank A and bank B, four
            channels each. A few files carry extra slots.
          </p>
          <p>
            Loading the file in Tone Room replaces programs on the amp. Save your current
            bank from Tone Room before you send one of these over.
          </p>
          <p>
            Volume is the 5.0 knob. On AC30 and AC30TB the next knob is Tone; on the
            other models it is Presence. Resonance is the 7.5 knob. Presence boosts the
            high end, and on some models that control cuts highs instead. Resonance
            boosts the low end and keeps it tight. Chorus speed, and pedal 2 speed and
            delay time, are stored as a little-endian pair. Gain, treble, middle, bass,
            volume, bias, and class are on the panel too.
          </p>
          <p>
            Tone Room edits more than the panel shows. Bright cap, low cut, and mid
            boost are off or on. Noise reduction is its own knob. Reverb enable is
            separate from mix, and pre delay, low damp, and high damp are stored too.
            The extra pedal types are in the program, and the amp plays them when that
            user program is loaded. The panel’s effect selector still only offers four
            types per pedal, and its amp knob has eleven positions. The other amp models
            can be saved into a user program. The user bank is eight slots, A-1 through B-4.
          </p>
          <p>
            Pedal names follow the Tone Room 1.4 list: Comp, Chorus, Tube OD, Gold Drive,
            Treble Boost, RC Turbo, Orange Dist, Fat Dist, Brit Lead, Fuzz, then Flanger,
            two orange phasers and a black one, Tremolo, Tape Echo, and Analog Delay.
            Tube OD is the panel’s green overdrive. Orange Dist is the panel’s distortion.
            Tape Echo is the panel’s delay.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
