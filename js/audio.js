import{noteEvents,soloLength}from'./generator.js';
import{backingEvents,clickEvents}from'./backing.js';
import{loadKit,audioBuffers,nearest,BASS_ROOTS,LEAD_ROOTS,KEYS_ROOTS}from'./kit.js';
import{encodeWav}from'./wav.js';
// One timeline for preview and WAV: every sound is an event with a time in seconds.
export function timeline(solo,{lead=true,drums=true,bass=true,keys=true,click=false,countIn=false}={}){const spb=60/solo.options.bpm,q=solo.barTicks/960,lead0=countIn?q*spb:0,out=[];
 if(countIn)for(const c of clickEvents({...solo,bars:solo.bars.slice(0,1)}))out.push({kind:'click',time:c.beat*spb,accent:c.accent});
 const at=b=>lead0+b*spb,back=backingEvents(solo);
 if(lead){const notes=noteEvents(solo);notes.forEach((n,i)=>{const next=notes[i+1];out.push({kind:'lead',time:at(n.beat),dur:n.dur*spb,pitch:n.pitch,bend:n.bend||0,vibrato:!!n.vibrato,slideTo:n.slide&&next?next.pitch:null,soft:i>0&&notes[i-1].legato||i>0&&notes[i-1].slide,accent:n.chordTone})})}
 if(drums)for(const d of back.drums)out.push({kind:'drum',time:at(d.beat),note:d.note,velocity:d.velocity});
 if(bass)for(const n of back.bass)out.push({kind:'bass',time:at(n.beat),dur:n.dur*spb,note:n.note,velocity:n.velocity});
 if(keys)for(const c of back.keys)out.push({kind:'keys',time:at(c.beat),dur:c.dur*spb,notes:c.notes,velocity:c.velocity});
 if(click)for(const c of clickEvents(solo))out.push({kind:'click',time:at(c.beat),accent:c.accent});
 out.sort((a,b)=>a.time-b.time);return{events:out,duration:lead0+soloLength(solo)*spb,lead:lead0}}

function voice(ctx,out,buffer,t,cents,gain,dur,release=.08){const src=ctx.createBufferSource(),g=ctx.createGain();src.buffer=buffer;src.detune.value=cents;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(gain,t+.004);if(dur!==undefined){g.gain.setValueAtTime(gain,t+dur);g.gain.linearRampToValueAtTime(0,t+dur+release)}src.connect(g);g.connect(out);src.start(t);if(dur!==undefined)src.stop(t+dur+release+.02);return src}
// Schedules one event on any AudioContext (live or offline).
export function play(ctx,bus,buffers,e,t){
 if(e.kind==='drum'){const b=buffers[e.note];if(b)voice(ctx,bus.drums,b,t,0,1.6*(e.velocity/127)**1.3)}
 else if(e.kind==='bass'){const r=nearest(BASS_ROOTS,e.note);voice(ctx,bus.bass,buffers['bass-'+r],t,(e.note-r)*100,1.5*(e.velocity/127)**1.3,e.dur,.06)}
 else if(e.kind==='keys'){for(const n of e.notes){const r=nearest(KEYS_ROOTS,n);voice(ctx,bus.keys,buffers['keys-'+r],t,(n-r)*100,.9*(e.velocity/127)/Math.sqrt(e.notes.length),e.dur,.15)}}
 else if(e.kind==='lead'){const r=nearest(LEAD_ROOTS,e.pitch),src=voice(ctx,bus.lead,buffers['lead-'+r],t,(e.pitch-r)*100,(e.soft?1.4:1.9)*(e.accent?1.05:1),e.dur+.01,.07),base=(e.pitch-r)*100;
  if(e.bend){const rise=Math.min(e.dur*.4,.16);src.detune.setValueAtTime(base,t+.02);src.detune.linearRampToValueAtTime(base+e.bend*100,t+.02+rise)}
  else if(e.slideTo!=null){src.detune.setValueAtTime(base,t+e.dur*.7);src.detune.linearRampToValueAtTime(base+(e.slideTo-e.pitch)*100,t+e.dur)}
  if(e.vibrato&&e.dur>.25){const lfo=ctx.createOscillator(),depth=ctx.createGain();lfo.frequency.value=5.6;depth.gain.setValueAtTime(0,t);depth.gain.linearRampToValueAtTime(0,t+e.dur*.3);depth.gain.linearRampToValueAtTime(28,t+e.dur*.6);lfo.connect(depth);depth.connect(src.detune);lfo.start(t);lfo.stop(t+e.dur+.1)}}
 else if(e.kind==='click'){const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.value=e.accent?1760:1320;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(e.accent?.5:.35,t+.002);g.gain.exponentialRampToValueAtTime(.0001,t+.05);o.connect(g);g.connect(bus.click);o.start(t);o.stop(t+.06)}}
function buses(ctx){const master=ctx.createGain();master.gain.value=.8;const comp=ctx.createDynamicsCompressor();comp.threshold.value=-10;comp.ratio.value=4;master.connect(comp);comp.connect(ctx.destination);
 const mk=v=>{const g=ctx.createGain();g.gain.value=v;g.connect(master);return g};return{master,lead:mk(1),drums:mk(.75),bass:mk(.8),keys:mk(.55),click:mk(.9)}}

// A 25 ms tick from a Web Worker keeps scheduling steady when the tab is in the background.
function ticker(fn){try{const url=URL.createObjectURL(new Blob(['let id;onmessage=e=>{clearInterval(id);if(e.data)id=setInterval(()=>postMessage(0),25)}'],{type:'text/javascript'})),w=new Worker(url);w.onmessage=fn;w.postMessage(1);return()=>{w.terminate();URL.revokeObjectURL(url)}}catch(e){const id=setInterval(fn,25);return()=>clearInterval(id)}}
export class Player{constructor(){this.ctx=null;this.stopTimer=null;this.onProgress=null;this.onEnd=null}
 stop(){this.stopTimer?.();this.stopTimer=null;if(this.ctx){this.ctx.close().catch(()=>{});this.ctx=null}}
 async play(solo,parts,{loop=false}={}){this.stop();const AC=globalThis.AudioContext||globalThis.webkitAudioContext;if(!AC)throw Error('เบราว์เซอร์นี้เล่นเสียงไม่ได้ ดาวน์โหลด MIDI ไปฟังใน DAW แทน');
  const ctx=new AC();this.ctx=ctx;await ctx.resume();const kit=await loadKit();if(this.ctx!==ctx)return;const buffers=audioBuffers(ctx,kit),bus=buses(ctx);
  const tl=timeline(solo,parts),loopTl=loop?timeline(solo,{...parts,countIn:false}):null;let events=tl.events,offset=tl.duration,index=0,start=ctx.currentTime+.08,pass=0;
  const tick=()=>{if(this.ctx!==ctx)return;const now=ctx.currentTime-start;
   while(index<events.length&&events[index].time<now+.2){const e=events[index++];if(start+e.time<ctx.currentTime-.03)continue;play(ctx,bus,buffers,e,Math.max(ctx.currentTime,start+e.time))}
   if(loop&&index>=events.length&&now>offset-.25){start+=offset;events=loopTl.events;offset=loopTl.duration;index=0;pass++}
   const pos=Math.max(0,now-(pass?0:tl.lead));this.onProgress?.(Math.min(1,pos/(pass?offset:tl.duration-tl.lead)),pos);
   if(!loop&&now>tl.duration+.6){this.stop();this.onEnd?.()}};
  tick();this.stopTimer=ticker(tick)}}

// WAV: render the same timeline offline, 44.1 kHz / 16-bit stereo.
export async function renderWav(solo,parts,onProgress){const kit=await loadKit(),tl=timeline(solo,parts);if(tl.duration>600)throw Error('WAV ยาวได้สูงสุด 10 นาที ลดจำนวนห้องหรือเพิ่ม BPM');
 const rate=44100,ctx=new OfflineAudioContext(2,Math.ceil((tl.duration+2)*rate),rate),buffers=audioBuffers(ctx,kit),bus=buses(ctx);for(const e of tl.events)play(ctx,bus,buffers,e,e.time);onProgress?.(.2);
 const rendered=await ctx.startRendering();onProgress?.(.9);const L=rendered.getChannelData(0),R=rendered.getChannelData(1);let end=L.length;while(end>rate*tl.duration&&Math.abs(L[end-1])<1e-4&&Math.abs(R[end-1])<1e-4)end--;
 const inter=new Float32Array(end*2);for(let i=0;i<end;i++){inter[i*2]=L[i];inter[i*2+1]=R[i]}onProgress?.(1);return new Blob([encodeWav(inter,rate,2)],{type:'audio/wav'})}
