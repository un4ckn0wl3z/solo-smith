import{decodeWav}from'./wav.js';
// Sample roots: notes in between are pitched from the nearest root.
export const DRUM_NOTES=[36,37,38,42,44,46,49,51];
export const BASS_ROOTS=[28,33,38,43,48,53];
export const LEAD_ROOTS=[40,45,50,55,60,65,70,75,80,85];
export const KEYS_ROOTS=[48,54,60,66,72];
export const nearest=(roots,note)=>roots.reduce((a,b)=>Math.abs(b-note)<Math.abs(a-note)?b:a);
export const SAMPLE_NAMES=[...DRUM_NOTES.map(String),...BASS_ROOTS.map(n=>'bass-'+n),...LEAD_ROOTS.map(n=>'lead-'+n),...KEYS_ROOTS.map(n=>'keys-'+n)];
let pending;
export function loadKit(base=document.baseURI){if(!pending)pending=Promise.all(SAMPLE_NAMES.map(async name=>{const r=await fetch(new URL(`samples/${name}.wav`,base));if(!r.ok)throw Error('โหลดชุดเสียงไม่สำเร็จ ลองอีกครั้ง');return[name,decodeWav(await r.arrayBuffer())]})).then(Object.fromEntries).catch(e=>{pending=null;throw e});return pending}
export function audioBuffers(ctx,kit){const out={};for(const[name,s]of Object.entries(kit)){const frames=s.samples.length/s.channels,b=ctx.createBuffer(s.channels,frames,s.rate);for(let c=0;c<s.channels;c++){const ch=b.getChannelData(c);for(let i=0;i<frames;i++)ch[i]=s.samples[i*s.channels+c]}out[name]=b}return out}
