# Vtx Bench

Edit VOX Tone Room `.vtxprog` banks for the VT20X, VT40X, and VT100X. Describe a tone, adjust the knobs, and download a bank Tone Room can open. Parsing and saving happen in the browser. Nothing is uploaded.

Vtx Bench is not affiliated with VOX or Korg.

This repository stays private until the pedal-knob map is finished. Do not make it public yet.

## Run

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:4178](http://127.0.0.1:4178).

```bash
npm run check
npm run typecheck
```

## Editing a bank

Open an example bank or a `.vtxprog` you exported from Tone Room. Pick a channel. The amp holds eight programs: bank A and bank B, four channels each. Some files carry extra slots after those eight, and those slots are kept.

A description starts from the closest program in the open bank or the examples, then moves the knobs the words asked for. `call it Night Drive` sets the 16-character name. `effects from Under the Bridge` copies that program’s pedal and reverb bytes. The other channels in the file stay as they are.

Loading a bank in Tone Room replaces the programs stored on the amp. Export your current bank from Tone Room before you send a new file over.

## File format

A `.vtxprog` starts with the 12-character header `VTXPROG1000 `, padded to 32 bytes. Each program is 62 bytes: a 16-character space-padded name, then 46 parameter bytes. Saving writes those bytes back, changed only where you edited them.

`fixtures/Mapping.vtxprog`, `fixtures/Mapping2.vtxprog`, and `fixtures/Mapping3.vtxprog` change one control per program from the same chain: comp, flanger, room, VOX AC30. The table follows those files and the example banks.

| Bytes | Control | Confirmed |
| --- | --- | --- |
| 0 | Noise reduction sensitivity. 0 is minimum, 100 is maximum. | Yes |
| 1 | Pedal 1 enable adds 2. Pedal 2 enable adds 4. Reverb enable adds 16. | Yes |
| 2 | Amp model, 0 through 19, in the Tone Room list order. | Yes, every model |
| 3–6 | Gain, treble, middle, bass. | Yes |
| 7–8 | Left at 50 and 20 in every Mapping7 program. | Not moved in Mapping7 |
| 9 | Resonance. 75 is 7.5. Mapping7 stores 100. | Yes, Mapping7 |
| 10 | Bright cap, 0 off, 1 on. | Yes |
| 11 | Low cut, 0 off, 1 on. | Yes |
| 12 | Mid boost, 0 off, 1 on. | Yes |
| 13 | Bias. 0 off, 1 cold, 2 hot. Mapping7 sets cold and hot on VOX AC30. | Yes |
| 14 | Power amp. 0 class A, 1 class AB. Mapping7 stores class AB on VOX AC30. | Yes, Mapping7 |
| 15 | Pedal 1 type, 0 through 9. | Yes, every type |
| 16–22 | Pedal 1 knobs. The layout depends on the type. | See below |
| 23 | Pedal 2 type, 0 through 6. | Yes, every type |
| 24–30 | Pedal 2 knobs. The layout depends on the type. | See below |
| 31–38, 45 | Always 0 in the files so far. | Unused |
| 39 | Reverb type. 0 room, 1 spring, 2 hall, 3 plate. Mapping7 isolates 1, 2, and 3. | Yes |
| 40–41 | Reverb mix, reverb time. Mapping7 sets each to 100 on its own program. | Yes |
| 42 | Pre delay. The maximum setting stores 70. | Yes |
| 43 | Low damp. A Tone Room value of 10 stores 100. | Yes |
| 44 | High damp. A Tone Room value of 10 stores 100. | Yes |

Pedal 1, in stored order: Comp, Chorus, Tube OD, Gold Drive, Treble Boost, RC Turbo, Orange Dist, Fat Dist, Brit Lead, Fuzz.

Pedal 2, in stored order: Flanger, Blk Phaser, Org Phaser 1, Org Phaser 2, Tremolo, Tape Echo, Analog Delay.

Tube OD is the panel’s green overdrive, Orange Dist is the panel’s distortion, and Tape Echo is the panel’s delay. The other types are Tone Room types. A user program still plays them. The panel’s effect selector offers four types per pedal, and its amp knob has eleven positions. The other amp models can be saved into a user program or into USER A, B, or C.

Presence and resonance are VT40X amp controls. Presence boosts the high end, and on some models that same control cuts highs. Resonance boosts the low end and keeps it tight.

## Pedal knobs

`fixtures/Mapping4.vtxprog` is the toggle file. The baseline pedals are off. Turning on the pedal being edited adds 2 for pedal 1 or 4 for pedal 2.

- Comp voice 1, 2, and 3 store 0, 1, and 2.
- Chorus low cut is byte 21 and high cut is byte 22. Each one is off or on.
- Flanger low cut is byte 28 and high cut is byte 29. Each one is off or on. The baseline chain already has high cut on.
- `Comp ON` is pedal 1 on and pedal 2 off. `Flanger ON` is the reverse.

`fixtures/Mapping5.vtxprog` turns pedal 2 on and sets one knob to 10. A 10 on the ordinary knobs stores 100.

- Analog delay mod speed is byte 29. Mod depth is byte 30. Switching to analog delay also sets the time byte to 30 on both programs.
- Tremolo depth is byte 26, duty is byte 27, shape is byte 28, and level is byte 29.
- Black phaser resonance is byte 26, manual is byte 27, and depth is byte 28.
- Tremolo speed and black phaser speed are the exception. Setting either one to 10 stores 16 in byte 24 and 39 in byte 25. The programs that left speed alone do not share one default: tremolo sits at 114 and 6, and black phaser sits at 100 and 0.

`fixtures/Mapping7.vtxprog` changes one control in each region from that same chain. Pedal 1 on, pedal 2 on, and reverb on together store 22 in the enable byte. Pedal 1 and pedal 2 on, with reverb off, store 6.

- Tube OD is type 2. Drive, tone, level, treble, middle, and bass are bytes 16, 18, 19, 20, 21, and 22. Each program sets one of those to 100. Byte 17 stays 0.
- Comp sens, level, and attack are bytes 16, 18, and 19. Each goes to 100 on its own program. Voice stays stored 1.
- Chorus speed fully down stores 100 in byte 16 and leaves byte 17 at 0. Chorus speed 2 stores 208 in byte 16 and 7 in byte 17. That pair is the speed edit. Manual and mix were not turned.
- Tremolo speed stores bytes 24 and 25 as 114/6 at 1.650 Hz, 184/11 at 3, 136/19 at 5, 88/27 at 7, 64/31 at 8, and 40/35 at 9.
- Black phaser speed stores 100/0 at 0.100 Hz, 232/3 at 1, 208/7 at 2, 136/19 at 5, and 64/31 at 8.
- Amp ids isolated here are Deluxe CL Vibrato 0, Deluxe CL Normal 1, Boutique CL 4, Boutique OD 5, VOX AC30TB 7, Brit 1959 Treble 8, and Brit 1959 Normal 9.
- Class AB is byte 14 set to 1 while the amp id stays 6.

`fixtures/Mapping8.vtxprog` changes one control in each region from that same chain. Pedal 1 and pedal 2 on store 6. Pedal 2 on alone stores 4.

- Chorus speed uses bytes 16 and 17. Speed 5 stores 136 and 19. Speed 8 stores 64 and 31. Speed 10 stores 16 and 39. Programs that leave chorus speed alone keep 50 and 0. Byte 17 moves only as the high byte of that speed pair.
- `ChD O1M OCl` sets byte 18 to 100, replacing 67. `ChM O1D` sets byte 19 to 100, replacing 57. `ChMix FlF` sets byte 20 to 100, replacing 1, and leaves 67 and 57 in place. Each of those programs changes one pedal-1 byte. Low cut and high cut stay 0.
- Black phaser speed 9 stores 40 and 35 in bytes 24 and 25.
- Org Phaser 1 is type 2. Speed 10 stores 16 and 39. Resonance, manual, and depth to 10 store 100 in bytes 26, 27, and 28. Leaving its speed at 0.100 Hz stores 100 and 0.
- Flanger speed 1, 2, 3, and 5 store 232/3, 208/7, 184/11, and 136/19. The floor stores 100 and 0. Depth to 10 sets byte 26 to 100 and leaves speed at 200 and 0. That 200/0 pair is the opening value, 0.200 Hz, not the 0.100 Hz floor.
- Gold Drive is type 3 and Fuzz is type 9. Those programs change the type byte and leave bytes 16–22 at the baseline.
- Brit 800, Boutique Metal, Brit OR MkII, and Original Clean store amp ids 10, 17, 18, and 19. Byte 14 stays 0. Bytes 7, 8, and 9 stay 50, 20, and 75.

## Checks

`npm run check` reads every bank in `public/banks` and the mapping fixtures, writes each file back, and requires the bytes to match. It also checks the confirmed type ids, the class byte on the example banks, and a few tone descriptions. Mapping7 is the file that stores class AB on VOX AC30. The script does not launch Tone Room, and it does not play a program through an amp.

## Example banks

The banks in `public/banks` are Marcos Moura’s Tone Room programs, shared as Beerware. If you pass those files on, keep the credit: he wrote them, and you owe him a beer if you meet him. Those terms stay with the banks. They are not covered by any license you add for the editor source.
