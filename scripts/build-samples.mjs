// Renders the lead and chord samples from the SONiVOX SoundFont that ships with alphaTab 1.8.4.
// Usage: node scripts/build-samples.mjs /path/to/sonivox.sf2
import * as a from '../vendor/alphatab.mjs';
import{readFileSync,writeFileSync}from'node:fs';
import{encodeWav}from'../js/wav.js';
import{LEAD_ROOTS,KEYS_ROOTS}from'../js/kit.js';
const event={on(){},off(){}},output={sampleRate:44100,ready:event,sampleRequest:event,samplesPlayed:event,open(){},destroy(){},pause(){},resetSamples(){}};
const synth=new a.synth.AlphaSynth(output,100);if(!process.argv[2])throw Error('Specify sonivox.sf2 path');const sf=new Uint8Array(readFileSync(process.argv[2]));
function render(program,note,seconds,velocity=110){const midi=new a.midi.MidiFile();midi.division=960;midi.addEvent(new a.midi.TempoChangeEvent(0,500000));midi.addEvent(new a.midi.ProgramChangeEvent(0,0,0,program));for(const[c,v]of[[7,100],[10,64],[11,127],[91,0],[93,0]])midi.addEvent(new a.midi.ControlChangeEvent(0,0,0,c,v));midi.addEvent(new a.midi.NoteOnEvent(0,0,0,note,velocity));midi.addEvent(new a.midi.NoteOffEvent(0,Math.round(seconds*1920),0,note,0));midi.addEvent(new a.midi.EndOfTrackEvent(0,Math.round(seconds*1920)+480));
 const opt=new a.synth.AudioExportOptions();opt.sampleRate=44100;opt.soundFonts=[sf];opt.masterVolume=.8;const ex=synth.exportAudio(opt,midi,[],new Map()),chunks=[];let c;while((c=ex.render(500)))chunks.push(c.samples);
 const st=new Float32Array(chunks.reduce((n,c)=>n+c.length,0));let p=0;for(const c of chunks){st.set(c,p);p+=c.length}
 const frames=Math.min(st.length/2,Math.round(seconds*44100)),mono=new Float32Array(frames),fade=Math.round(.08*44100);let peak=0;
 for(let i=0;i<frames;i++){mono[i]=(st[i*2]+st[i*2+1])/2*(i>frames-fade?(frames-i)/fade:1);if(!Number.isFinite(mono[i]))throw Error('bad sample');peak=Math.max(peak,Math.abs(mono[i]))}
 if(peak<.001)throw Error('Silent sample '+program+'/'+note);return{mono,peak}}
for(const[name,program,roots,seconds]of[['lead',29,LEAD_ROOTS,4],['keys',4,KEYS_ROOTS,2.5]])for(const note of roots){const{mono,peak}=render(program,note,seconds);writeFileSync(`samples/${name}-${note}.wav`,new Uint8Array(encodeWav(mono,44100,1)));console.log(name,note,'peak',peak.toFixed(3))}
