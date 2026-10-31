import{TUNINGS,SCALES,pcName,usesFlats,pitchName}from'./theory.js';
import{STYLES,PPQ}from'./generator.js';
// alphaTex for one take: tab staff with chord names, tuplets, bends, legato, slides and vibrato.
const DUR={160:'16',240:'16',320:'8',480:'8',720:'8',960:'4',1440:'4',1920:'2',2880:'2',3840:'1'};
const DOT=new Set([720,1440,2880]);
const esc=s=>String(s).replace(/["\\]/g,'');
export function toAlphaTex(solo){const o=solo.options,flats=usesFlats(o.root,o.quality),key=pcName(o.root,flats)+' '+SCALES[o.scale].name;
 const lines=[`\\title "${esc(key)} solo"`,`\\subtitle "Solo Smith · ${esc(STYLES[o.style].name)} · take ${solo.take+1}"`,`\\tempo ${Math.round(o.bpm)}`,`\\track "Lead guitar" "Lead"`,`\\staff {tabs}`,`\\tuning (${solo.tuning.map(pitchName).join(' ')})`];
 const bars=solo.bars.map((bar,bi)=>{const parts=[];if(bi===0)parts.push(`\\ts (${o.num} ${o.den})`);let chordAt=new Map();(bar.chords||[]).forEach((c,i)=>chordAt.set(i*solo.barTicks/2,c.name));
  // A chord that changes at the half bar needs a beat starting there; split a long note or rest if necessary.
  const beats=[];for(const e of bar.beats){const half=solo.barTicks/2;if(chordAt.has(half)&&e.tick<half&&e.tick+e.dur>half&&!e.tuplet){const a=half-e.tick,b=e.dur-a;if(DUR[a]&&DUR[b]){beats.push({...e,dur:a,note:e.note&&{...e.note,vibrato:false,slide:false,legato:false}});beats.push({...e,tick:half,dur:b,tie:!e.rest});continue}}beats.push(e)}
  for(const e of beats){const fx=[];if(e.tuplet)fx.push('tu '+e.tuplet);if(DOT.has(e.dur))fx.push('d');const ch=chordAt.get(e.tick);if(ch){fx.push(`ch "${esc(ch)}"`);chordAt.delete(e.tick)}
   // Note effects go between string and duration, beat effects after the duration.
   const beatFx=fx.length?'{'+fx.join(' ')+'}':'';if(e.rest){parts.push(`r.${DUR[e.dur]}${beatFx}`);continue}
   const n=e.note;if(e.tie){parts.push(`-.${n.string}.${DUR[e.dur]}${beatFx}`);continue}
   const nfx=[];if(n.bend)nfx.push(`b (0 ${n.bend*2} ${n.bend*2})`);if(n.legato)nfx.push('h');if(n.slide)nfx.push('sl');if(n.vibrato)nfx.push('v');
   parts.push(`${n.fret}.${n.string}${nfx.length?'{'+nfx.join(' ')+'}':''}.${DUR[e.dur]}${beatFx}`)}
  return parts.join(' ')});
 return lines.join('\n')+'\n'+bars.join(' |\n')+'\n'}
// Parse the tex into an alphaTab score; triplet feel for shuffle; chord tones coloured on the tab.
export function toScore(at,solo,{color='#3d7a0c'}={}){const score=at.importer.ScoreLoader.loadAlphaTex(toAlphaTex(solo));
 if(solo.swing)for(const m of score.masterBars)m.tripletFeel=at.model.TripletFeel.Triplet8th;
 const staff=score.tracks[0].staves[0],flat=[];for(const bar of solo.bars)for(const e of bar.beats)if(!e.rest&&!e.tie)flat.push(e);let k=0;
 if(color&&at.model.NoteStyle)for(const bar of staff.bars)for(const beat of bar.voices[0].beats){if(beat.isRest)continue;for(const note of beat.notes){if(note.isTieDestination)continue;const e=flat[k++];if(e?.note?.chordTone){note.style=new at.model.NoteStyle();note.style.colors.set(at.model.NoteSubElement.GuitarTabFretNumber,at.model.Color.fromJson(color))}}}
 return score}
