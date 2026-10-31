import{SCALES,TUNINGS,scalePcs,parseProgression}from'./theory.js';
import{positions,nearestPosition,bendFrom}from'./fretboard.js';
export const PPQ=960;
// A phrase is a few gestures: a run of even notes (one subdivision per gesture) that moves step by step into a
// landing note on a beat, which is held. Each style has its own subdivisions, run lengths, run shapes and breathing.
export const STYLES={
 blues:{name:'Blues',sub:'Shuffle feel • bends • space',swing:true,bend:.85,legato:.25,slide:.25,
  g:{subs:{e:3,t:2,q:.5},n:[2,5],shapes:{down:4,turn:2,arch:2,repeat:1.5,up:1},gestures:[2,3],gap:[480,960],breath:[960,1920],hold:1440}},
 rock:{name:'Rock',sub:'Pentatonic licks • bends • drive',bend:.6,legato:.35,slide:.2,
  g:{subs:{e:3,s:2.2,t:.7},n:[3,7],shapes:{down:3,arch:2.5,up:2,turn:1.5,repeat:.6},gestures:[2,3],gap:[0,480],breath:[480,960],hold:960}},
 shred:{name:'Metal shred',sub:'Fast runs • legato • 3 notes per string',bend:.15,legato:.6,slide:.12,
  g:{subs:{s:3,x:2.2,t:1.4,e:.4},n:[6,12],shapes:{seq:3,down:3,up:3,arch:1},gestures:[1,2],gap:[0,480],breath:[480,960],hold:960}},
 melodic:{name:'Melodic',sub:'Long notes • chord tones • slides',maxSpeed:3,bend:.3,legato:.2,slide:.45,
  g:{subs:{e:2,q:2.2,t:.4},n:[1,4],shapes:{arch:3,down:3,up:2,turn:1},gestures:[2,3],gap:[480,960],breath:[960,1920],hold:1920}}
};
export function rng(seed){let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
const mix=(...n)=>n.reduce((h,x)=>Math.imul(h^(x>>>0),2654435761)>>>0,2166136261);
function weighted(r,items){const total=items.reduce((s,[,w])=>s+Math.max(0,w),0);let x=r()*total;for(const[v,w]of items){x-=Math.max(0,w);if(x<=0)return v}return items[items.length-1][0]}

// Subdivisions: ticks per note, notes per beat, and tuplet group size (tuplets always fill whole beats).
const SUBS={q:{ticks:960,per:1},e:{ticks:480,per:2},t:{ticks:320,per:3,group:3},s:{ticks:240,per:4},x:{ticks:160,per:6,group:6}};
// Note and rest lengths alphaTex can write without ties.
const LENGTHS=[3840,2880,1920,1440,960,720,480,240];

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
 // Each call/response pair opens with the same gesture (subdivision, length and shape), so the answer echoes the question.
 const motifs=phrases.filter(p=>p.role==='call').map((p,k)=>{const r=rng(mix(seed,take,0x30f1,k));return pickGesture(r,S,p.density,maxSpeed)});
 const solo={options:o,seed,take,barTicks,bars:[],phrases,shapes,tuning,pcs,swing:!!S.swing};
 for(let b=0;b<bars;b++)solo.bars.push({index:b,chords:prog[b],beats:[]});
 for(const p of phrases)writePhrase(solo,p,motifs[Math.floor(p.index/2)],rng(mix(seed,take,0xa11,p.index,rerolls[p.index]||0)),{S,scale,maxSpeed,difficulty});
 return solo}
export function chordAt(solo,bar,tick){const c=solo.bars[bar]?.chords;if(!c||!c.length)return null;return c.length>1&&tick>=solo.barTicks/2?c[1]:c[0]}

function pickGesture(r,S,density,maxSpeed,room=Infinity){const g=S.g,subs=Object.entries(g.subs).filter(([k])=>SUBS[k].per<=maxSpeed).map(([k,w])=>[k,w*(SUBS[k].per>=4?.4+density*1.2:1)]);
 let sub=weighted(r,subs.length?subs:[['e',1]]),[lo,hi]=g.n,n=Math.round(lo+(hi-lo)*Math.min(1,Math.max(0,density*.85+r()*.35-.1)));
 if(SUBS[sub].group)n=Math.max(SUBS[sub].group,Math.round(n/SUBS[sub].group)*SUBS[sub].group);
 return{sub,n,shape:weighted(r,Object.entries(g.shapes))}}
// Index offsets from the landing note for each note of a run (the landing itself is offset 0).
function shapeOffsets(kind,n,r){const out=[];
 if(kind==='down')for(let k=0;k<n;k++)out.push(n-k);
 else if(kind==='up')for(let k=0;k<n;k++)out.push(k-n);
 else if(kind==='arch'){const u=Math.floor(n/2),d=n-u;for(let k=0;k<u;k++)out.push(d+2-u+k);for(let k=0;k<d;k++)out.push(d-k)}
 else if(kind==='turn'){for(let k=0;k<n-2;k++)out.push(n-k);if(n>=2)out.push(1,-1);else out.push(1)}           // run down, then enclose the target
 else if(kind==='repeat'){for(let k=0;k<n;k++)out.push(k<n-1?(k%2?1:2):1)}                                   // blues: worry two notes, then fall in
 else if(kind==='seq'){const dir=r()<.5?1:-1,raw=k=>-(Math.floor(k/4))-(k%4);for(let k=0;k<n;k++)out.push(dir*(raw(k)-raw(n-1)+1))} // groups of four
 return n>0?out.slice(-n):[]}

function writePhrase(solo,p,motif,r,{S,scale,maxSpeed,difficulty}){const o=solo.options,shape=solo.shapes[p.position],notes=shape.notes,barTicks=solo.barTicks,g=S.g;
 const PS=p.from*barTicks,PE=(p.to+1)*barTicks,len=PE-PS,top=notes.length-1,floor=Math.round(top*(o.style==='shred'?.1:.35));
 const keyChord={pcs:[o.root,(o.root+(o.quality==='minor'?3:4))%12,(o.root+7)%12],root:o.root};const blue=scale.blue!==undefined?(o.root+scale.blue)%12:-1;
 const chordAtAbs=t=>chordAt(solo,Math.floor(t/barTicks),t%barTicks)||keyChord;
 const beats=[];for(let t=PS;t<PE;t+=PPQ){const local=t%barTicks;if(local%PPQ===0)beats.push({t,strength:local===0?3:local*2===barTicks?2:1})}
 // 1. Landings: the phrase's last landing near its end (leaving a breath), earlier ones on strong beats before it.
 const breath=p.last?0:Math.min(len/2,Math.round((g.breath[0]+(g.breath[1]-g.breath[0])*r()*(1-p.density*.5))/480)*480);
 const finalMin=Math.min(g.hold,len/4),finals=beats.filter(b=>b.t>=PS+len/2-PPQ&&b.t<=PE-breath-finalMin);
 const last=finals.length?weighted(r,finals.map(b=>[b,b.strength*b.strength+(b.t>=PE-breath-finalMin*2?2:0)])):beats[beats.length-1];
 let count=Math.max(1,Math.min(g.gestures[1],g.gestures[0]+(r()<p.density?1:0),Math.floor(len/(PPQ*2.5))));const landings=[last.t];
 for(let i=1;i<count;i++){const next=landings[0],options=beats.filter(b=>b.t<=next-PPQ*2&&b.t>=PS+PPQ);if(!options.length)break;landings.unshift(weighted(r,options.map(b=>[b.t,b.strength*b.strength+(b.t>next-PPQ*4?1:0)])))}
 // 2. Gestures fitted backwards from each landing; the first follows the pair's motif when it fits.
 const gestures=[];let prevEnd=PS;
 landings.forEach((L,i)=>{const room=L-prevEnd;let ge=i===0&&r()<.85?{...motif}:i>0&&r()<.45?{...gestures[0]}:pickGesture(r,S,p.density,maxSpeed);
  if(ge.sub&&SUBS[ge.sub].per>maxSpeed)ge=pickGesture(r,S,p.density,maxSpeed);
  let sub=SUBS[ge.sub]||SUBS.e,n=Math.min(ge.n,Math.floor(room/sub.ticks));if(sub.group){n=Math.floor(n/sub.group)*sub.group;if(!n){ge={...ge,sub:'e'};sub=SUBS.e;n=Math.min(ge.n,Math.floor(room/sub.ticks))}}
  gestures.push({...ge,sub:ge.sub in SUBS&&sub===SUBS[ge.sub]?ge.sub:'e',n:Math.max(0,n),L,start:L-Math.max(0,n)*sub.ticks});
  const gap=Math.round((g.gap[0]+(g.gap[1]-g.gap[0])*r()*(1-p.density*.6))/240)*240;prevEnd=L+Math.max(480,Math.min(g.hold,PPQ))+gap});
 // Earlier gestures' runs must start after the previous landing has sounded for at least an eighth.
 for(let i=1;i<gestures.length;i++){const ge=gestures[i],min=gestures[i-1].L+480,sub=SUBS[ge.sub];while(ge.n>0&&ge.start<min){ge.n-=sub.group||1;ge.start=ge.L-ge.n*sub.ticks}}
 // 3. Pitches: landings on chord tones that trace an arc through the phrase; runs approach them step by step.
 const climax=p.last||p.index===solo.phrases.length-2,home=Math.round(floor+(top-floor)*(climax?.65+r()*.3:p.role==='call'?.45+r()*.35:.35+r()*.35));
 const arcDown=r()<(p.role==='response'?.75:.55),out=[];let prevLand=null;
 const nearest=(target,ok)=>{let best=null;for(let j=floor;j<=top;j++)if(ok(notes[j].pitch%12)&&(best===null||Math.abs(j-target)<Math.abs(best-target)||Math.abs(j-target)===Math.abs(best-target)&&j!==prevLand&&best===prevLand))best=j;return best};
 gestures.forEach((ge,i)=>{const chord=chordAtAbs(ge.L),lastG=i===gestures.length-1,span=gestures.length>1?i/(gestures.length-1):1,target=home+Math.round((arcDown?1-span:span-.5)*3);
  let want=pc=>chord.pcs.includes(pc);if(lastG){if(p.last)want=pc=>pc===o.root;else if(p.role==='response')want=pc=>pc===chord.root;else want=pc=>chord.pcs.includes(pc)&&pc!==chord.root}
  let L=nearest(target,want);if(L===null)L=nearest(target,pc=>chord.pcs.includes(pc))??Math.max(floor,Math.min(top,target));
  // Keep the whole run inside the position: mirror the shape, move the landing to a chord tone that leaves room, or shorten the run.
  let offs=shapeOffsets(ge.shape,ge.n,r);const fits=(l,o)=>o.every(d=>l+d>=floor&&l+d<=top);
  if(!fits(L,offs)&&fits(L,offs.map(d=>-d)))offs=offs.map(d=>-d);
  if(!fits(L,offs)){const lo=floor-Math.min(0,...offs),hi=top-Math.max(0,...offs);if(lo<=hi){const l=nearest(Math.max(lo,Math.min(hi,target)),pc=>want(pc));if(l!==null&&fits(l,offs))L=l}}
  const step=SUBS[ge.sub].group||1;while(offs.length&&!fits(L,offs)){offs.splice(0,step);ge.start+=SUBS[ge.sub].ticks*step}ge.n=offs.length;
  const idxs=offs.map(d=>L+d);
  const sub=SUBS[ge.sub];idxs.forEach((j,k)=>{const t=ge.start+k*sub.ticks;let jj=j;
   // a run note that falls on a bar's downbeat should still be a chord tone; blue notes only pass through
   if(t%barTicks===0&&!chordAtAbs(t).pcs.includes(notes[jj].pitch%12)){for(const d of[1,-1,2,-2]){const c=jj+d;if(c>=floor&&c<=top&&c!==idxs[k-1]&&c!==(k+1<idxs.length?idxs[k+1]:L)&&chordAtAbs(t).pcs.includes(notes[c].pitch%12)){jj=c;break}}}
   if(k===idxs.length-1&&jj===L)jj=j;
   out.push({abs:t,dur:sub.ticks,tuplet:sub.group||0,note:{...notes[jj]}})});
  // Landing note: held until the next run (or the breath); a long note may tie over the bar line.
  const until=lastG?PE-breath:gestures[i+1].n?gestures[i+1].start:gestures[i+1].L;let hold=Math.max(240,Math.min(until-ge.L,lastG?Infinity:Math.max(g.hold,480)));
  // inside one bar, hold for one clean length (a dotted half, not a half tied to an eighth); across the bar line, tie
  const inBar=barTicks-ge.L%barTicks;if(hold<=inBar||!lastG)hold=LENGTHS.find(d=>d<=Math.min(hold,inBar))||hold;
  let landIdx=L;if(notes[landIdx].pitch%12===blue)landIdx=Math.min(top,landIdx+1);
  out.push({abs:ge.L,dur:hold,tuplet:0,note:{...notes[landIdx]},land:true,end:lastG});prevLand=L});
 // 4. Into the bars: trim overlaps, write each note as lengths alphaTex can show (ties across bar lines), rests in the gaps.
 out.sort((a,b)=>a.abs-b.abs);for(let k=0;k<out.length-1;k++)out[k].dur=Math.min(out[k].dur,out[k+1].abs-out[k].abs);
 const events=[];let t=PS;for(const e of out){if(e.abs<t||e.dur<=0)continue;restFill(events,t,e.abs,barTicks);
  if(e.tuplet){events.push({bar:Math.floor(e.abs/barTicks),tick:e.abs%barTicks,dur:e.dur,tuplet:e.tuplet,note:e.note});t=e.abs+e.dur;continue}
  let a=e.abs,left=Math.min(e.dur,PE-e.abs),first=true;
  while(left>=240){const barEnd=(Math.floor(a/barTicks)+1)*barTicks,d=LENGTHS.find(x=>x<=Math.min(left,barEnd-a)&&(x<960||a%PPQ===0||x===1440||x===720));if(!d)break;
   events.push({bar:Math.floor(a/barTicks),tick:a%barTicks,dur:d,tuplet:0,note:e.note,land:first&&e.land,end:e.end,tie:!first});a+=d;left-=d;first=false;if(e.land&&!e.end&&a%barTicks===0)break}
  t=a}
 restFill(events,t,PE,barTicks);
 decorate(solo,events,shape,r,{S,difficulty});
 for(const e of events){delete e.land;solo.bars[e.bar].beats.push(e)}
 for(const b of solo.bars)b.beats.sort((a,c)=>a.tick-c.tick);
 p.notes=events.filter(e=>!e.rest).length}
// Rests from a to b (absolute ticks): split at bar lines, first up to the next beat, then whole beats or longer.
function restFill(events,a,b,barTicks){while(a<b){const barEnd=(Math.floor(a/barTicks)+1)*barTicks,limit=Math.min(b,barEnd)-a,local=a%barTicks;
 const toBeat=local%PPQ?PPQ-local%PPQ:0,d=toBeat?LENGTHS.find(x=>x<=Math.min(toBeat,limit)):LENGTHS.find(x=>x<=limit);const dur=d||limit;
 events.push({bar:Math.floor(a/barTicks),tick:local,dur,rest:true});a+=dur}}

// Techniques: bends into landing notes (never two in a row), hammer-ons / pull-offs and slides between neighbours, vibrato on long notes.
function decorate(solo,out,shape,r,{S,difficulty}){const o=solo.options,tuning=solo.tuning,amount=.35+difficulty*.65,tied=i=>out[i+1]?.tie;
 for(let i=0;i<out.length;i++){const e=out[i];if(e.rest||e.tie)continue;const n=e.note;
  const chord=chordAt(solo,e.bar,e.tick);n.chordTone=!!chord&&chord.pcs.includes(n.pitch%12)||!chord&&[o.root,(o.root+7)%12].includes(n.pitch%12);
  const prevBent=out.slice(0,i).reverse().find(x=>!x.rest&&!x.tie)?.note.bend;
  if(e.land&&e.dur>=480&&!tied(i)&&!prevBent&&r()<S.bend*amount*(e.end?1.3:.9)){const b=bendFrom(tuning,n,shape,solo.pcs,o.style==='blues');if(b){e.note={...n,string:b.string,fret:b.fret,pitch:b.pitch,bend:b.bend,target:n.pitch}}}
  let len=e.dur;for(let k=i+1;out[k]?.tie;k++)len+=out[k].dur;if(len>=960||e.end)e.note.vibrato=true}
 for(let i=0;i<out.length-1;i++){const a=out[i],b=out[i+1];if(a.rest||b.rest||a.tie||b.tie||a.note.bend||b.note.bend)continue;if(a.note.string!==b.note.string||a.bar!==b.bar)continue;const gap=Math.abs(a.note.fret-b.note.fret);if(!gap)continue;
  if(gap<=4&&a.dur<=480&&r()<S.legato*(.4+difficulty*.8))a.note.legato=true;else if(gap>=2&&gap<=7&&a.dur>=480&&r()<S.slide*(.5+difficulty*.5))a.note.slide=true}
 // tied continuations carry the held pitch (and its vibrato), nothing else
 for(let i=1;i<out.length;i++)if(out[i].tie){const head=out[i-1].note;out[i].note={string:head.string,fret:head.fret,pitch:head.pitch,chordTone:head.chordTone,vibrato:head.vibrato}}}

// Flat list of every note with absolute times in quarter beats, for audio and MIDI; tied notes are one note. Blues swings off-beat eighths.
export function noteEvents(solo){const out=[],q=solo.barTicks/PPQ;for(const bar of solo.bars)for(const e of bar.beats){if(e.rest)continue;let start=e.tick,end=e.tick+e.dur;if(solo.swing){start=swing(start);end=swing(end)}
  if(e.tie&&out.length){const prev=out[out.length-1];prev.dur=bar.index*q+end/PPQ-prev.beat;continue}out.push({beat:bar.index*q+start/PPQ,dur:(end-start)/PPQ,...e.note,bar:bar.index})}return out}
const swing=t=>t%PPQ===480?t+160:t;
export function soloLength(solo){return solo.bars.length*solo.barTicks/PPQ}
