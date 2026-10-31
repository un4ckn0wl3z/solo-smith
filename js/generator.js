import{SCALES,TUNINGS,scalePcs,parseProgression}from'./theory.js';
import{positions,nearestPosition,bendFrom}from'./fretboard.js';
export const PPQ=960;
export const STYLES={
 blues:{name:'Blues',sub:'Shuffle feel • bends • space',swing:true,rest:.3,bend:.55,legato:.25,slide:.25,repeat:.6,triplets:.3},
 rock:{name:'Rock',sub:'Pentatonic licks • bends • drive',rest:.18,bend:.4,legato:.35,slide:.2,repeat:.45,triplets:.12},
 shred:{name:'Metal shred',sub:'Fast runs • legato • 3 notes per string',rest:.06,bend:.15,legato:.6,slide:.12,repeat:.3,triplets:.25,runs:true},
 melodic:{name:'Melodic',sub:'Long notes • chord tones • slides',maxSpeed:3,rest:.25,bend:.25,legato:.2,slide:.4,repeat:.5,triplets:.08,melodic:true}
};
export function rng(seed){let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
const mix=(...n)=>n.reduce((h,x)=>Math.imul(h^(x>>>0),2654435761)>>>0,2166136261);
const pick=(r,list)=>list[Math.floor(r()*list.length)];
function weighted(r,items){const total=items.reduce((s,[,w])=>s+Math.max(0,w),0);let x=r()*total;for(const[v,w]of items){x-=Math.max(0,w);if(x<=0)return v}return items[items.length-1][0]}

// Rhythm cells fill one beat (960 ticks). Negative = rest. 'hold' sustains the previous note through the beat.
const CELLS={q:[960],e2:[480,480],er:[480,-480],re:[-480,480],s4:[240,240,240,240],es2:[480,240,240],s2e:[240,240,480],des:[720,240],ses:[240,480,240],t3:[320,320,320],x6:[160,160,160,160,160,160],r:[-960],hold:'hold'};
const SPEED={q:1,e2:2,er:2,re:2,s4:4,es2:4,s2e:4,des:4,ses:4,t3:3,x6:6,r:1,hold:1};
const MERGE=new Set([1440,1920,2880,3840]);
function cellWeights(style,density,maxSpeed){const S=STYLES[style],d=density,w={q:1.2-d,hold:(S.melodic?1.4:.8)*(1-d),e2:1+d*.6,er:.3,re:.15+(style==='blues'?.35:0),s4:d*d*(S.swing?0:2.2),es2:d*(S.swing?0:1.1),s2e:d*(S.swing?0:1.1),des:d*(S.swing?0:.7),ses:d*(S.swing?0:.5),t3:S.triplets*(.6+d*1.8),x6:S.runs?Math.max(0,d-.45)*3.2:0,r:S.rest*.9};
 return Object.entries(w).filter(([k])=>SPEED[k]<=maxSpeed)}

export const DEFAULTS={root:9,quality:'minor',scale:'minorPent',bpm:100,num:4,den:4,bars:8,chords:'',style:'rock',difficulty:50,density:50,tuning:'std6',fingering:'box',lo:0,hi:17,start:5,move:'auto'};
// Plan the solo: phrase layout, positions and a density curve. Each phrase then gets its own random stream,
// so regenerating one phrase leaves every other phrase exactly as it was.
export function generate(input,seed=1,take=0,rerolls={}){const o={...DEFAULTS,...input},S=STYLES[o.style]||STYLES.rock,tuning=TUNINGS[o.tuning]?.strings||TUNINGS.std6.strings,pcs=scalePcs(o.root,o.scale),scale=SCALES[o.scale];
 const barTicks=Math.round(o.num*4/o.den*PPQ),bars=Math.max(1,Math.min(64,o.bars|0)),prog=parseProgression(o.chords,bars).bars;
 const fingering=o.fingering==='3nps'?'3nps':'box';let shapes=positions(tuning,pcs,{lo:o.lo,hi:o.hi,fingering});if(!shapes.length&&fingering==='3nps')shapes=positions(tuning,pcs,{lo:o.lo,hi:o.hi,fingering:'box'});
 if(!shapes.length)throw Error('ช่วงเฟรตนี้แคบเกินไปสำหรับสเกลนี้ ลองขยายช่วงเฟรต');
 const master=rng(mix(seed,take,0x5010)),difficulty=o.difficulty/100,density=o.density/100;
 // Faster notes need more difficulty; very slow tempos allow a step more.
 const nps=3+difficulty*11,beatSec=60/o.bpm,maxSpeed=Math.min(S.maxSpeed||6,Math.max(2,[1,2,3,4,6].filter(k=>k/beatSec<=nps).pop()||2));
 const phraseBars=bars>=4?2:1,count=Math.ceil(bars/phraseBars),phrases=[];let pos=nearestPosition(shapes,o.start);
 for(let i=0;i<count;i++){const from=i*phraseBars,to=Math.min(bars,from+phraseBars)-1,last=i===count-1;
  if(i>0&&o.move==='auto'&&master()<.25+difficulty*.45){const climb=i>=count-2?1:master()<.6?1:-1;pos=Math.max(0,Math.min(shapes.length-1,pos+climb))}
  phrases.push({index:i,from,to,role:i%2?'response':'call',position:pos,density:Math.min(1,density+(last||i===count-2?.15:0)*(count>2?1:0)),last})}
 // Each call/response pair shares a rhythm motif and a melodic contour.
 const motifs=phrases.filter(p=>p.role==='call').map((p,k)=>{const r=rng(mix(seed,take,0x30f1,k));return{cells:Array.from({length:2},()=>weighted(r,cellWeights(o.style,p.density,maxSpeed))),steps:Array.from({length:8},()=>S.runs&&r()<.6?(r()<.5?1:-1):weighted(r,[[1,3],[-1,3],[2,1],[-2,1.4],[0,.6],[3,.3],[-3,.3]]))}});
 const solo={options:o,seed,take,barTicks,bars:[],phrases,shapes,tuning,pcs,swing:!!S.swing};
 for(let b=0;b<bars;b++)solo.bars.push({index:b,chords:prog[b],beats:[]});
 for(const p of phrases)writePhrase(solo,p,motifs[Math.floor(p.index/2)],rng(mix(seed,take,0xa11,p.index,rerolls[p.index]||0)),{S,scale,maxSpeed,difficulty});
 return solo}
export function chordAt(solo,bar,tick){const c=solo.bars[bar]?.chords;if(!c||!c.length)return null;return c.length>1&&tick>=solo.barTicks/2?c[1]:c[0]}

function writePhrase(solo,p,motif,r,{S,scale,maxSpeed,difficulty}){const o=solo.options,shape=solo.shapes[p.position],notes=shape.notes,barTicks=solo.barTicks;
 // Rhythm: the motif's cells, repeated or varied, with a breath at the end of the phrase.
 const beatsPerBar=Math.floor(barTicks/PPQ),tail=barTicks-beatsPerBar*PPQ,slots=[];for(let b=p.from;b<=p.to;b++){for(let k=0;k<beatsPerBar;k++)slots.push({bar:b,tick:k*PPQ,len:PPQ});if(tail)slots.push({bar:b,tick:beatsPerBar*PPQ,len:tail})}
 const rest=p.last?0:Math.min(slots.length-2,Math.round((S.rest*3+(p.role==='response'?.5:0))*(1-p.density*.6)+r()*.8));
 const variation=p.role==='response'?.35:.2;let mi=0;const cells=slots.map((s,i)=>{if(s.len!==PPQ)return r()<.5?[s.len]:[-s.len];if(i>=slots.length-rest)return CELLS.r;
  if(i>=slots.length-rest-(p.last?2:1)&&i>0)return i===slots.length-rest-1?CELLS.hold:CELLS[r()<.5?'q':'e2'];const k=r()<variation?weighted(r,cellWeights(o.style,p.density,maxSpeed)):motif.cells[mi++%motif.cells.length];return CELLS[k]});
 if(cells[0]==='hold'||cells[0][0]<0)cells[0]=r()<.5?CELLS.e2:CELLS.q;
 // Pitch: walk the motif's contour through the position's notes, landing on chord tones on strong beats.
 // Solos live on the upper strings: the walk bounces off a floor about a third of the way up the position (runs go lower).
 const top=notes.length-1,floor=Math.round(top*(S.runs?.1:.35));let idx=Math.max(0,Math.min(top,Math.round(top*(p.role==='call'?.55+r()*.3:.6+r()*.3)))),dir=1,stepI=Math.floor(r()*3);
 const chordIdx=(i,chord,radius)=>{let best=-1;for(let d=0;d<=radius;d++)for(const j of[i-d,i+d])if(j>=floor&&j<=top&&chord.pcs.includes(notes[j].pitch%12)&&best<0)best=j;return best};
 const keyChord={pcs:[o.root,(o.root+(o.quality==='minor'?3:4))%12,(o.root+7)%12],root:o.root};const blue=scale.blue!==undefined?(o.root+scale.blue)%12:-1;
 const out=[];cells.forEach((cell,ci)=>{const s=slots[ci];if(cell==='hold'){const prev=out[out.length-1];if(prev&&!prev.rest&&prev.bar===s.bar&&prev.tick+prev.dur===s.tick&&MERGE.has(prev.dur+s.len)){prev.dur+=s.len;return}cell=CELLS.q}
  let t=s.tick;for(const d of cell){const dur=Math.abs(d);if(d<0){out.push({bar:s.bar,tick:t,dur,rest:true});t+=dur;continue}
   const step=motif.steps[stepI++%motif.steps.length]*(p.role==='response'&&r()<.4?-1:1);idx+=step*dir;if(idx<floor||idx>top){dir=-dir;idx=Math.max(floor,Math.min(top,idx+2*step*dir))}
   const chord=chordAt(solo,s.bar,t)||keyChord,strong=t===0||t%PPQ===0&&(t===barTicks/2||r()<.5);
   if(strong&&r()<(t===0?.9:.65)){const j=chordIdx(idx,chord,3);if(j>=0)idx=j}
   if(notes[idx].pitch%12===blue&&(dur>=PPQ||strong))idx=Math.max(0,Math.min(top,idx+(r()<.5?1:-1)));
   out.push({bar:s.bar,tick:t,dur,tuplet:d===320?3:d===160?6:0,note:{...notes[idx]},idx});t+=dur}});
 // Phrase ending: calls rest on a chord tone that is not the root, responses (and the last phrase) resolve home.
 const lastNote=[...out].reverse().find(e=>!e.rest);if(lastNote){const chord=chordAt(solo,lastNote.bar,lastNote.tick)||keyChord,home=p.last?o.root:chord.root;
  const want=p.role==='call'&&!p.last?chord.pcs.filter(pc=>pc!==chord.root):[home];let best=null;for(let j=floor;j<=top;j++)if(want.includes(notes[j].pitch%12)&&(!best||Math.abs(j-lastNote.idx)<Math.abs(best-lastNote.idx)))best=j;if(best!==null){lastNote.idx=best;lastNote.note={...notes[best]}}lastNote.end=true}
 decorate(solo,out,shape,r,{S,difficulty});
 for(const e of out){delete e.idx;solo.bars[e.bar].beats.push(e)}
 for(const b of solo.bars)b.beats.sort((a,c)=>a.tick-c.tick);
 p.notes=out.filter(e=>!e.rest).length}

// Techniques: bends into strong long notes (never two in a row), hammer-ons / pull-offs and slides between neighbours, vibrato on long notes.
function decorate(solo,out,shape,r,{S,difficulty}){const o=solo.options,tuning=solo.tuning,amount=.35+difficulty*.65;
 for(let i=0;i<out.length;i++){const e=out[i];if(e.rest)continue;const n=e.note,next=out[i+1]&&!out[i+1].rest?out[i+1]:null;
  const chord=chordAt(solo,e.bar,e.tick);n.chordTone=!!chord&&chord.pcs.includes(n.pitch%12)||!chord&&[o.root,(o.root+7)%12].includes(n.pitch%12);
  const prevBent=out.slice(0,i).reverse().find(x=>!x.rest)?.note.bend;
  if(e.dur>=480&&!e.tuplet&&!prevBent&&r()<S.bend*amount*(e.end||e.dur>=960?1.4:.8)){const b=bendFrom(tuning,n,shape,solo.pcs,o.style==='blues');if(b){e.note={...n,string:b.string,fret:b.fret,pitch:b.pitch,bend:b.bend,target:n.pitch}}}
  if(e.dur>=960||e.end)e.note.vibrato=true}
 for(let i=0;i<out.length-1;i++){const a=out[i],b=out[i+1];if(a.rest||b.rest||a.note.bend||b.note.bend)continue;if(a.note.string!==b.note.string||a.bar!==b.bar)continue;const gap=Math.abs(a.note.fret-b.note.fret);if(!gap)continue;
  if(gap<=4&&a.dur<=480&&r()<S.legato*(.4+difficulty*.8))a.note.legato=true;else if(gap>=2&&gap<=7&&a.dur>=480&&r()<S.slide*(.5+difficulty*.5))a.note.slide=true}}

// Flat list of every note with absolute times in quarter beats, for audio and MIDI. Blues swings off-beat eighths.
export function noteEvents(solo){const out=[],q=solo.barTicks/PPQ;for(const bar of solo.bars)for(const e of bar.beats){if(e.rest)continue;let start=e.tick,end=e.tick+e.dur;if(solo.swing){start=swing(start);end=swing(end)}out.push({beat:bar.index*q+start/PPQ,dur:(end-start)/PPQ,...e.note,bar:bar.index})}return out.sort((a,b)=>a.beat-b.beat)}
const swing=t=>t%PPQ===480?t+160:t;
export function soloLength(solo){return solo.bars.length*solo.barTicks/PPQ}
