# Solo Smith

Generate a guitar solo in the key of your backing track. Pick the key, scale and style, add the chords if you have them, and get several playable takes as tab — then hear them with a band and export Guitar Pro, MIDI or WAV. Everything runs in the browser; no account, upload or AI service.

Part of [Unknown Guitar Toolkits](https://github.com/un4ckn0wl3z/unknown-guitar-toolkits), next to TabLens, Riff Forge, Tempo Bench and Guitar Stem Studio.

## What it does

- **Key and scale**: any root, major or minor; minor / major pentatonic, blues, major blues, natural minor, major, Dorian, Phrygian, Lydian, Mixolydian, Locrian, harmonic minor and Phrygian dominant.
- **Song**: BPM, time signature (2–12 over 4 or 8, including 6/8 and 7/8), 4–32 bars, and optional chords per bar (`Am | F G | C | E7` — two chords split a bar; fewer chords than bars repeat). *Suggest chords* fills a progression for the key and style.
- **Styles**: Blues (shuffle feel, space, bends, minor-third bends), Rock, Metal shred (fast runs, legato, 3 notes per string) and Melodic (long notes, slides, chord tones).
- **Difficulty** sets the top speed (notes per second at the chosen tempo), how often techniques appear, and how often the solo moves up the neck. **Note density** goes from breathing space to runs.
- **Playable fingering**: *Box* keeps every phrase inside a 5-fret scale shape (A minor pentatonic box 1 comes out as frets 5–8); *3 notes per string* uses three-note-per-string shapes with no stretch over 5 frets. Choose a fret range, a starting fret, and whether to move along the neck or stay in one position. Six tunings: standard, Eb, Drop D, D standard, 7-string standard and Drop A.
- **Takes** (2–4) to compare, and **↻** on any phrase rebuilds just that phrase.
- **Tab** rendered with alphaTab: chord names above the bars, bends, hammer-ons / pull-offs, slides, vibrato and tuplets; chord tones are green. Toggle standard notation.
- **Preview** with drums, bass and keys that follow the chords (a groove per style), optional click, count-in and loop.
- **Export**: Guitar Pro 7 (`.gp`, the solo track with chord names, opens in Guitar Pro, TuxGuitar, MuseScore — and Riff Forge), MIDI (solo, backing or both; bends as pitch-bend curves) and WAV 44.1 kHz / 16-bit. *Backing only* gives you a track to practise improvising over.
- Thai / English interface (**TH / EN** in the header; the first visit follows the browser language).

## How a solo is built

Rule-based and seeded, not AI:

1. The solo is split into two-bar phrases that alternate **call** and **response**. Each pair shares a rhythm motif (one-beat cells: quarters, eighths, sixteenth groupings, triplets, sextuplets for shred) and a melodic contour.
2. Each phrase walks the notes of its fingering position along the contour, staying mostly on the upper strings. Downbeats and strong beats move to the nearest **chord tone** (or the tonic triad without chords). Blue notes are used only in passing.
3. Calls end on a chord tone that is not the root; responses resolve to the chord root, and the last phrase ends on the key root with vibrato. Phrases end with a breath.
4. Techniques are added where a guitarist would use them: bends from a scale note a whole or half step below (a minor third in blues) on the top three strings, never two in a row; hammer-ons and pull-offs between close frets on one string; slides on wider moves; vibrato on long notes.
5. Blues uses triplet feel (written in the Guitar Pro file, swung in playback and MIDI).

Each phrase has its own random stream, so re-rolling one phrase never changes the others.

## Run locally

It is a static site. Serve the folder with any HTTP server, for example:

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080. No build step and no dependencies.

## Tests

```bash
npm test
```

Checks 240 generated solos (bar fill, scale membership, fret range, staying in position, chord tones on downbeats, phrase endings), the positions for every tuning and scale, speed limits, phrase re-roll, swing, alphaTex → alphaTab → Guitar Pro round trips with chord names and colours, MIDI stems and pitch bends, and the backing.

```bash
npm run test:browser
```

Drives Chromium with Playwright: settings, three takes with the rendered tab, phrase re-roll, preview, Guitar Pro / MIDI / WAV downloads, saved settings, English with no Thai left, and the phone layout.

## Files

- `index.html`, `style.css`, `js/app.js` — the page
- `js/theory.js` — notes, scales, chord symbols, progressions, tunings
- `js/fretboard.js` — box and 3-notes-per-string positions, bend sources
- `js/generator.js` — phrases, rhythm cells, pitch walk, techniques
- `js/alphatex.js` — alphaTex and the alphaTab score (chord-tone colours, triplet feel)
- `js/backing.js`, `js/audio.js`, `js/midi.js` — band, preview / WAV, MIDI
- `js/i18n.js` — English UI
- `vendor/` — alphaTab 1.8.4 (MPL-2.0) and the Bravura font (OFL)
- `samples/` — SONiVOX EAS samples (Apache-2.0), see `samples/SOURCE.md`

## Deploy

GitHub Pages → Deploy from a branch → `main` / root. The site is served at `https://un4ckn0wl3z.github.io/solo-smith/`.

## ภาษาไทย

Solo Smith สร้างโซโลกีตาร์ตาม key ของ backing track เลือกสเกล (pentatonic, blues, mode ต่างๆ) และสไตล์ ใส่คอร์ดได้ถ้ามี จะได้หลาย take เป็น tab ที่เล่นได้จริงในตำแหน่งนิ้ว (box หรือ 3 โน้ตต่อสาย) ฟังพร้อมกลอง เบส และคีย์บอร์ด แล้วส่งออก Guitar Pro, MIDI หรือ WAV ทำงานในเบราว์เซอร์ทั้งหมด

รันบนเครื่อง: `python3 -m http.server 8080` แล้วเปิด http://localhost:8080
