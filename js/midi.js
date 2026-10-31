import{noteEvents,soloLength,PPQ}from'./generator.js';
import{backingEvents,clickEvents}from'./backing.js';
// Standard MIDI file, type 1, 960 PPQ. Lead on channel 1 (Overdriven Guitar) with pitch-bend curves for bends
// and vibrato; backing on bass (ch 2), keys (ch 3) and drums (ch 10).
const vlq=n=>{const a=[n&127];while(n>>=7)a.unshift((n&127)|128);return a},be32=n=>[(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255];
const text=(type,s)=>{const b=[...new TextEncoder().encode(s)];return[255,type,...vlq(b.length),...b]};
function chunk(events,end){events.sort((a,b)=>a.tick-b.tick||a.order-b.order);let last=0;const out=[];for(const e of events){out.push(...vlq(Math.max(0,e.tick-last)),...e.bytes);last=Math.max(last,e.tick)}out.push(...vlq(Math.max(0,end-last)),255,47,0);return[77,84,114,107,...be32(out.length),...out]}
const bendBytes=(ch,semis)=>{const v=Math.max(0,Math.min(16383,Math.round(8192+semis/2*8191)));return[0xe0|ch,v&127,v>>7]};
export function midiFile(solo,{parts=['lead','bass','keys','drums'],click=false}={}){const o=solo.options,end=Math.round(soloLength(solo)*PPQ),T=b=>Math.round(b*PPQ),tracks=[];
 const us=Math.round(60000000/o.bpm),meta=[{tick:0,order:0,bytes:text(3,'Solo Smith')},{tick:0,order:0,bytes:[255,81,3,(us>>16)&255,(us>>8)&255,us&255]},{tick:0,order:0,bytes:[255,88,4,o.num,Math.round(Math.log2(o.den)),24,8]}];
 solo.phrases.forEach(p=>meta.push({tick:T(p.from*solo.barTicks/PPQ),order:1,bytes:text(6,`Phrase ${p.index+1} (${p.role})`)}));tracks.push(chunk(meta,end));
 if(parts.includes('lead')){const ev=[{tick:0,order:0,bytes:text(3,'Lead guitar')},{tick:0,order:0,bytes:[0xc0,29]},
   // Pitch-bend range ±2 semitones (RPN 0), the General MIDI default, set explicitly.
   ...[[101,0],[100,0],[6,2],[38,0]].map(([c,v])=>({tick:0,order:0,bytes:[0xb0,c,v]}))];
  for(const n of noteEvents(solo)){const a=T(n.beat),b=Math.max(a+30,T(n.beat+n.dur)-10);ev.push({tick:a,order:2,bytes:[0x90,n.pitch,n.chordTone?104:92]},{tick:b,order:1,bytes:[0x80,n.pitch,0]});
   if(n.bend){const steps=6,rise=Math.min(b-a,240);for(let k=1;k<=steps;k++)ev.push({tick:a+Math.round(rise*k/steps),order:3,bytes:bendBytes(0,Math.min(2,n.bend)*k/steps)});ev.push({tick:b,order:0,bytes:bendBytes(0,0)})}
   else if(n.vibrato&&b-a>=480){for(let t=a+Math.round((b-a)*.35),k=0;t<b-40;t+=40,k++)ev.push({tick:t,order:3,bytes:bendBytes(0,Math.sin(k*Math.PI/3)*.25)});ev.push({tick:b,order:0,bytes:bendBytes(0,0)})}}
  tracks.push(chunk(ev,end))}
 const back=backingEvents(solo);
 if(parts.includes('bass')){const ev=[{tick:0,order:0,bytes:text(3,'Bass')},{tick:0,order:0,bytes:[0xc1,34]}];for(const n of back.bass)ev.push({tick:T(n.beat),order:2,bytes:[0x91,n.note,n.velocity]},{tick:T(n.beat+n.dur),order:1,bytes:[0x81,n.note,0]});tracks.push(chunk(ev,end))}
 if(parts.includes('keys')){const ev=[{tick:0,order:0,bytes:text(3,'Keys')},{tick:0,order:0,bytes:[0xc2,4]}];for(const c of back.keys)for(const n of c.notes)ev.push({tick:T(c.beat),order:2,bytes:[0x92,n,c.velocity]},{tick:T(c.beat+c.dur),order:1,bytes:[0x82,n,0]});tracks.push(chunk(ev,end))}
 if(parts.includes('drums')){const ev=[{tick:0,order:0,bytes:text(3,'Drums')}];for(const d of back.drums)ev.push({tick:T(d.beat),order:2,bytes:[0x99,d.note,d.velocity]},{tick:T(d.beat)+60,order:1,bytes:[0x89,d.note,0]});tracks.push(chunk(ev,end))}
 if(click){const ev=[{tick:0,order:0,bytes:text(3,'Click')}];for(const c of clickEvents(solo)){const n=c.accent?76:77;ev.push({tick:T(c.beat),order:2,bytes:[0x99,n,c.accent?120:90]},{tick:T(c.beat)+60,order:1,bytes:[0x89,n,0]})}tracks.push(chunk(ev,end))}
 return new Uint8Array([77,84,104,100,0,0,0,6,0,1,0,tracks.length,PPQ>>8,PPQ&255,...tracks.flat()])}
