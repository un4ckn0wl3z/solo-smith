import{chordAt,PPQ}from'./generator.js';
// A simple band behind the solo: drums, root bass and keys, one groove per style. Times are in quarter beats.
export function backingEvents(solo){const o=solo.options,q=solo.barTicks/PPQ,drums=[],bass=[],keys=[],swing=solo.swing,sw=t=>swing&&Math.abs(t%1-.5)<1e-6?t+1/6:t;
 const tonic={root:o.root,pcs:[o.root,(o.root+(o.quality==='minor'?3:4))%12,(o.root+7)%12],bass:o.root};
 const compound=o.den===8&&o.num%3===0,pulse=compound?1.5:1;
 for(const bar of solo.bars){const start=bar.index*q,pulses=[];for(let t=0;t<q-1e-6;t+=pulse)pulses.push(t);
  const chordFor=t=>chordAt(solo,bar.index,t*PPQ)||tonic;
  // Drums
  if(bar.index===0||bar.index%8===0)drums.push({beat:start,note:49,velocity:100});
  pulses.forEach((t,i)=>{const back=o.style==='melodic'?i%4===2||pulses.length<3&&i===1:i%2===1;
   if(back)drums.push({beat:start+t,note:38,velocity:104});
   if(o.style==='shred'){for(const s of[0,.25,.5,.75])if(t+s<q)drums.push({beat:start+t+s,note:36,velocity:s?82:96})}
   else if(!back)drums.push({beat:start+t,note:36,velocity:100});
   if(o.style==='rock'&&!back&&t+.5<q&&i%4===2)drums.push({beat:start+t+.5,note:36,velocity:86})});
  const cym=o.style==='blues'||o.style==='melodic'&&bar.index%2?51:42;for(let t=0;t<q-1e-6;t+=.5){if((bar.index===0||bar.index%8===0)&&t===0)continue;drums.push({beat:start+sw(t),note:cym,velocity:t%1?64:84})}
  if(o.style==='blues')for(const t of pulses)if(pulses.indexOf(t)%2)drums.push({beat:start+t,note:44,velocity:60});
  // Bass: roots (boogie in blues, eighths in rock and shred, long notes when melodic)
  const low=pc=>{let n=28+((pc-4+12)%12);return n>39?n-12:n};
  if(o.style==='melodic'){for(let t=0;t<q-1e-6;t+=q/(bar.chords?.length>1?2:1)){const c=chordFor(t);bass.push({beat:start+t,note:low(c.bass??c.root),dur:q/(bar.chords?.length>1?2:1)*.95,velocity:96})}}
  else for(let t=0;t<q-1e-6;t+=.5){const c=chordFor(t),root=low(c.bass??c.root),line=o.style==='blues'?[0,0,7,7,9,9,7,7][Math.round(t*2)%8]:0;
   const next=t+.5<q?sw(t+.5):q;bass.push({beat:start+sw(t),note:root+line,dur:(next-sw(t))*.8,velocity:o.style==='shred'?100:92})}
  // Keys: block chords (arpeggios when melodic) voiced around middle C
  const voice=c=>{const out=[];for(const pc of c.pcs){let n=55+((pc-55%12+12)%12);out.push(n)}return out.sort((a,b)=>a-b)};
  const chordTimes=bar.chords?.length>1?[0,q/2]:[0];
  for(const t0 of chordTimes){const c=chordFor(t0),notes=voice(c),len=chordTimes.length>1?q/2:q;
   if(o.style==='melodic'){let k=0;for(let t=t0;t<t0+len-1e-6;t+=.5)keys.push({beat:start+t,notes:[notes[k++%notes.length]+(k>notes.length?12:0)],dur:.9,velocity:70})}
   else if(o.style==='blues'){for(let t=t0;t<t0+len-1e-6;t+=1)if(Math.floor(t)%2===1)keys.push({beat:start+sw(t+.5),notes,dur:.3,velocity:74})}
   else keys.push({beat:start+t0,notes,dur:len*.97,velocity:o.style==='shred'?58:66})}}
 return{drums,bass,keys}}
export function clickEvents(solo){const o=solo.options,q=solo.barTicks/PPQ,step=o.den===8&&o.num%3===0&&o.num>3?1.5:4/o.den,out=[];for(const bar of solo.bars)for(let t=0;t<q-1e-6;t+=step)out.push({beat:bar.index*q+t,accent:t===0});return out}
