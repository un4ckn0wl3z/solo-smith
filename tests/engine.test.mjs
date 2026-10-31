import assert from'node:assert/strict';
import * as at from'../vendor/alphatab.mjs';
import{SCALES,TUNINGS,parseChord,parseProgression,suggestProgression,scalePcs}from'../js/theory.js';
import{positions}from'../js/fretboard.js';
import{generate,noteEvents,chordAt,STYLES,PPQ}from'../js/generator.js';
import{toAlphaTex,toScore}from'../js/alphatex.js';
import{midiFile}from'../js/midi.js';
import{backingEvents}from'../js/backing.js';
import{translate}from'../js/i18n.js';

// Theory
assert.equal(Object.keys(SCALES).length,13);
assert.deepEqual(parseChord('Am').pcs,[9,0,4]);assert.deepEqual(parseChord('F#m7b5').pcs,[6,9,0,4]);assert.deepEqual(parseChord('Bb7').pcs,[10,2,5,8]);assert.deepEqual(parseChord('E5').pcs,[4,11]);assert.equal(parseChord('C/G').bass,7);assert.equal(parseChord('Xm'),null);assert.equal(parseChord('Cfoo'),null);
const pr=parseProgression('Am | F G | C',5);assert.deepEqual(pr.bars.map(b=>b.map(c=>c.name).join(' ')),['Am','F G','C','Am','F G']);assert.deepEqual(parseProgression('Am | Hm',2).errors,['Hm']);assert.deepEqual(parseProgression('',3).bars,[null,null,null]);
for(const style of Object.keys(STYLES))for(const q of['minor','major'])for(const root of[0,4,9,10]){const t=suggestProgression(root,q,style,12,false);assert.deepEqual(parseProgression(t,12).errors,[],t)}
assert.equal(suggestProgression(9,'minor','blues',12,false).split(' | ').length,12);

// Fretboard: A minor pentatonic box 1 is frets 5–8; 3 notes per string never stretches more than 5 frets
// (pentatonic 3NPS climbs the neck quickly and may not fit; the generator then falls back to boxes)
const box=positions(TUNINGS.std6.strings,scalePcs(9,'minorPent')).find(p=>p.anchor===5);
assert.deepEqual(box.notes.map(n=>n.fret+'.'+n.string),['5.6','8.6','5.5','7.5','5.4','7.4','5.3','7.3','5.2','8.2','5.1','8.1']);
for(const[tid,t]of Object.entries(TUNINGS))for(const scale of Object.keys(SCALES))for(const fingering of['box','3nps']){const pcs=scalePcs(4,scale),list=positions(t.strings,pcs,{lo:0,hi:20,fingering});assert.ok(list.length>=(fingering==='3nps'&&pcs.length<7?0:2),tid+scale+fingering);
 for(const p of list){for(const n of p.notes){assert.ok(pcs.includes(n.pitch%12));assert.equal(t.strings[n.string-1]+n.fret,n.pitch)}if(fingering==='box')assert.ok(p.max-p.min<=4);else for(let s=1;s<=t.strings.length;s++){const f=p.notes.filter(n=>n.string===s).map(n=>n.fret);assert.equal(f.length,3);assert.ok(Math.max(...f)-Math.min(...f)<=5)}}}

// Generator: every combination fills its bars exactly, stays in the scale, the fret range and the phrase position
let checked=0,stats={bend:0,legato:0,slide:0,vibrato:0,x6:0,t3:0};const strongHits=[0,0];
for(const style of Object.keys(STYLES))for(const scale of['minorPent','blues','dorian','harmonicMinor','majorPent','lydian'])for(const[tuning,num,den,bars]of[['std6',4,4,8],['std7',3,4,4],['dropD',6,8,8],['eb6',7,8,4],['std6',4,4,12]])for(const seed of[1,2]){
 const o={style,scale,tuning,num,den,bars,root:scale==='majorPent'||scale==='lydian'?7:4,quality:/major|lydian/.test(scale)?'major':'minor',chords:seed===1?'':scale.includes('major')||scale==='lydian'?'G | C D | Em | D':'Em | C | D | B7',difficulty:seed===1?100:30,density:seed===1?90:40,bpm:seed===1?140:90,lo:2,hi:17,fingering:style==='shred'?'3nps':'box'};
 const s=generate(o,seed,seed%3);assert.deepEqual(s,generate(o,seed,seed%3),'deterministic');const pcs=scalePcs(o.root,scale),tun=TUNINGS[tuning].strings;
 for(const bar of s.bars){assert.equal(bar.beats.reduce((n,e)=>n+e.dur,0),s.barTicks,`${style} ${num}/${den} bar ${bar.index}`);let t=0;for(const e of bar.beats){assert.equal(e.tick,t);t+=e.dur;if(e.rest)continue;const n=e.note;
  assert.ok(pcs.includes(n.pitch%12),'in scale');if(n.bend)assert.ok(pcs.includes(n.target%12)&&n.target===n.pitch+n.bend&&n.string<=3);assert.equal(tun[n.string-1]+n.fret,n.pitch);assert.ok(n.fret>=o.lo&&n.fret<=o.hi);
  const ph=s.phrases.find(p=>bar.index>=p.from&&bar.index<=p.to),pos=s.shapes[ph.position];assert.ok(n.fret>=pos.min-1&&n.fret<=pos.max+1,'stays in position');
  for(const k of['bend','legato','slide','vibrato'])if(n[k])stats[k]++;if(e.tuplet===6)stats.x6++;if(e.tuplet===3)stats.t3++;
  if(e.tick===0&&o.chords){const c=chordAt(s,bar.index,0);strongHits[0]++;if(c.pcs.includes((n.target??n.pitch)%12))strongHits[1]++}}}
 // phrase endings: responses resolve to the chord root (the last phrase to the key root) with vibrato
 for(const p of s.phrases){const notes=s.bars.slice(p.from,p.to+1).flatMap(b=>b.beats.filter(e=>!e.rest).map(e=>({...e,bar:b.index})));const last=notes[notes.length-1];if(!last)continue;const pc=(last.note.target??last.note.pitch)%12;
  if(p.last)assert.equal(pc,o.root,'solo ends on the key root');else if(p.role==='response'){const c=chordAt(s,last.bar,last.tick);assert.equal(pc,c?c.root:o.root,'response resolves')}}
 checked++}
assert.ok(strongHits[1]/strongHits[0]>.75,'downbeats land on chord tones: '+strongHits);
for(const k of['bend','legato','slide','vibrato','t3'])assert.ok(stats[k]>10,k+' '+stats[k]);
// Speed: difficulty 0 never plays sixteenths; melodic stays at eighths or triplets; shred at full difficulty plays sextuplets
const fastest=s=>Math.min(...s.bars.flatMap(b=>b.beats.filter(e=>!e.rest).map(e=>e.dur)));
assert.ok(fastest(generate({style:'rock',difficulty:0,density:100},3))>=480);assert.ok(fastest(generate({style:'melodic',difficulty:100,density:100},3))>=320);
assert.ok(generate({style:'shred',difficulty:100,density:100,bpm:110,fingering:'3nps',bars:16},4).bars.some(b=>b.beats.some(e=>e.tuplet===6)));
// Regenerating one phrase leaves the others untouched
const base=generate({chords:'Am | F | C | G'},9,1),re=generate({chords:'Am | F | C | G'},9,1,{2:1});
assert.notDeepEqual(base.bars.slice(4,6),re.bars.slice(4,6));assert.deepEqual(base.bars.slice(0,4),re.bars.slice(0,4));assert.deepEqual(base.bars.slice(6),re.bars.slice(6));
// Fixed position never moves; blues swings off-beat eighths
assert.equal(new Set(generate({move:'fixed',difficulty:100,bars:16},5).phrases.map(p=>p.position)).size,1);
const blues=noteEvents(generate({style:'blues'},6));assert.ok(blues.some(n=>Math.abs(n.beat%1-2/3)<1e-9));assert.ok(!blues.some(n=>Math.abs(n.beat%1-.5)<1e-9));
assert.throws(()=>generate({lo:3,hi:4,scale:'minorPent'},1),/แคบเกินไป/);

// alphaTex → alphaTab score → Guitar Pro, for every style and tuning
for(const style of Object.keys(STYLES))for(const tuning of['std6','std7','dropA7'])for(const seed of[1,2,3]){const s=generate({style,tuning,chords:'Am | F G | C | E7',difficulty:90,density:80,num:seed===3?6:4,den:seed===3?8:4},seed);
 const score=toScore(at,s),staff=score.tracks[0].staves[0];assert.equal(staff.tuning.length,TUNINGS[tuning].strings.length);assert.equal(score.masterBars.length,s.bars.length);
 let n=0,colored=0;for(const b of staff.bars){assert.equal(b.voices[0].beats.reduce((t,x)=>t+x.playbackDuration,0),s.barTicks);for(const x of b.voices[0].beats)for(const note of x.notes)if(!note.isTieDestination){n++;if(note.style)colored++}}
 assert.equal(n,noteEvents(s).length);assert.equal(colored,noteEvents(s).filter(e=>e.chordTone).length);assert.equal(score.masterBars[0].tripletFeel,style==='blues'?at.model.TripletFeel.Triplet8th:at.model.TripletFeel.NoTripletFeel);
 const back=at.importer.ScoreLoader.loadScoreFromBytes(new at.exporter.Gp7Exporter().export(score,new at.Settings()),new at.Settings());assert.equal(back.masterBars.length,s.bars.length);
 const chords=[...back.tracks[0].staves[0].bars.flatMap(b=>b.voices[0].beats.filter(x=>x.chordId!==null).map(x=>back.tracks[0].staves[0].chords.get(x.chordId).name))];assert.deepEqual(chords.slice(0,5),['Am','F','G','C','E7'])}
assert.match(toAlphaTex(generate({chords:'Am'},1)),/\\tuning \(E4 B3 G3 D3 A2 E2\)/);

// MIDI: lead notes match the solo, bends become pitch-bend curves, stems select tracks
function parseMidi(bytes){const dv=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);assert.equal(dv.getUint16(12),PPQ);let p=14;const tracks=[];while(p<bytes.length){assert.equal(String.fromCharCode(...bytes.slice(p,p+4)),'MTrk');const end=p+8+dv.getUint32(p+4);p+=8;let tick=0,run=0;const ev=[];
 const v=()=>{let n=0,b;do{b=bytes[p++];n=n*128+(b&127)}while(b&128);return n};while(p<end){tick+=v();let st=bytes[p];if(st&128)p++;else st=run;run=st;if(st===255){const type=bytes[p++],len=v();ev.push({tick,type,data:bytes.slice(p,p+len)});p+=len}else{const hi=st&240,a=bytes[p++],b=hi===192?0:bytes[p++];if(hi===192)p+=0;ev.push({tick,st,hi,a,b})}}tracks.push(ev)}return tracks}
const ms=generate({style:'rock',difficulty:90,chords:'Am | F | C | G'},11),tr=parseMidi(midiFile(ms));assert.equal(tr.length,5);
const lead=tr[1],ons=lead.filter(e=>e.hi===144&&e.b>0);assert.equal(ons.length,noteEvents(ms).length);assert.equal(lead.filter(e=>e.hi===128).length,ons.length);
assert.equal(lead.filter(e=>e.hi===224).length>0,noteEvents(ms).some(n=>n.bend||n.vibrato));assert.ok(lead.some(e=>e.hi===192&&e.a===29));
assert.equal(parseMidi(midiFile(ms,{parts:['lead']})).length,2);assert.equal(parseMidi(midiFile(ms,{parts:['bass','keys','drums'],click:true})).length,5);
// Backing follows the chords
const bk=backingEvents(ms);assert.ok(bk.drums.length&&bk.keys.length);for(const b of bk.bass){const bar=Math.floor(b.beat/4),c=chordAt(ms,bar,(b.beat%4)*PPQ);assert.equal(b.note%12,c.bass%12);assert.ok(b.note>=28&&b.note<=39)}
for(const c of bk.keys){const bar=Math.floor(c.beat/4),ch=chordAt(ms,bar,(c.beat%4)*PPQ);assert.deepEqual([...new Set(c.notes.map(n=>n%12))].sort(),[...ch.pcs].sort())}
// English
assert.equal(translate('สร้าง 3 take แล้ว · กด ▶ เพื่อฟังพร้อมวง'),'Generated 3 takes · press ▶ to hear it with the band');assert.equal(translate('2 · bar 3–4 · ตอบ'),'2 · bar 3–4 · response');
console.log(`PASS: theory, positions (box / 3NPS on 6 tunings × 13 scales), ${checked} generated solos (bar fill, scale, fret range, position, chord tones ${strongHits[1]}/${strongHits[0]}, phrase endings, ${JSON.stringify(stats)}), speed limits, phrase re-roll, swing, alphaTex + Guitar Pro round trip with chord names and colours, MIDI stems and bends, backing, English.`);
