// Notes, scales, chords and tunings. Pitch classes are 0–11 with C = 0; pitches are MIDI note numbers.
export const NOTE_NAMES=['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
const LETTER={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
export function parseNote(text){const m=/^([A-Ga-g])([#b♯♭]*)$/.exec(String(text).trim());if(!m)return null;let pc=LETTER[m[1].toUpperCase()];for(const c of m[2])pc+=c==='#'||c==='♯'?1:-1;return(pc+12)%12}
export const pcName=(pc,preferFlat=false)=>preferFlat?['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'][pc]:NOTE_NAMES[pc];

// Each scale: intervals from the root, which key quality it suits, and a group for the picker.
export const SCALES={
 minorPent:{name:'Minor pentatonic',group:'pent',quality:'minor',steps:[0,3,5,7,10]},
 majorPent:{name:'Major pentatonic',group:'pent',quality:'major',steps:[0,2,4,7,9]},
 blues:{name:'Blues',group:'pent',quality:'minor',steps:[0,3,5,6,7,10],blue:6},
 majorBlues:{name:'Major blues',group:'pent',quality:'major',steps:[0,2,3,4,7,9],blue:3},
 minor:{name:'Natural minor (Aeolian)',group:'diatonic',quality:'minor',steps:[0,2,3,5,7,8,10]},
 major:{name:'Major (Ionian)',group:'diatonic',quality:'major',steps:[0,2,4,5,7,9,11]},
 dorian:{name:'Dorian',group:'mode',quality:'minor',steps:[0,2,3,5,7,9,10]},
 phrygian:{name:'Phrygian',group:'mode',quality:'minor',steps:[0,1,3,5,7,8,10]},
 lydian:{name:'Lydian',group:'mode',quality:'major',steps:[0,2,4,6,7,9,11]},
 mixolydian:{name:'Mixolydian',group:'mode',quality:'major',steps:[0,2,4,5,7,9,10]},
 locrian:{name:'Locrian',group:'mode',quality:'minor',steps:[0,1,3,5,6,8,10]},
 harmonicMinor:{name:'Harmonic minor',group:'exotic',quality:'minor',steps:[0,2,3,5,7,8,11]},
 phrygianDominant:{name:'Phrygian dominant',group:'exotic',quality:'major',steps:[0,1,4,5,7,8,10]}
};
export const SCALE_GROUPS=[{id:'pent',name:'Pentatonic & blues'},{id:'diatonic',name:'Major & minor'},{id:'mode',name:'Modes'},{id:'exotic',name:'Exotic'}];
export const scalePcs=(root,scale)=>SCALES[scale].steps.map(s=>(root+s)%12);

// Chord symbols: C, Am, F#m7, Bb7, Dmaj7, Esus4, G5, Bdim, Caug, Am7b5, C6, Em9, A7#9 …
const QUALITIES=[['maj7',[0,4,7,11]],['M7',[0,4,7,11]],['m7b5',[0,3,6,10]],['ø',[0,3,6,10]],['dim7',[0,3,6,9]],['dim',[0,3,6]],['°',[0,3,6]],['aug',[0,4,8]],['+',[0,4,8]],['mMaj7',[0,3,7,11]],['m9',[0,3,7,10,2]],['m7',[0,3,7,10]],['m6',[0,3,7,9]],['min',[0,3,7]],['m',[0,3,7]],['-',[0,3,7]],['sus2',[0,2,7]],['sus4',[0,5,7]],['sus',[0,5,7]],['7#9',[0,4,7,10,3]],['7b9',[0,4,7,10,1]],['9',[0,4,7,10,2]],['7',[0,4,7,10]],['6',[0,4,7,9]],['5',[0,7]],['add9',[0,4,7,2]],['',[0,4,7]]];
export function parseChord(text){const t=String(text||'').trim();if(!t)return null;const m=/^([A-G][#b♯♭]?)(.*?)(?:\/([A-G][#b♯♭]?))?$/.exec(t);if(!m)return null;const root=parseNote(m[1]);if(root===null)return null;
 const q=QUALITIES.find(([s])=>s===m[2]);if(!q)return null;const pcs=[...new Set(q[1].map(i=>(root+i)%12))];return{name:t,root,pcs,minor:q[1].includes(3)&&!q[1].includes(4),bass:m[3]?parseNote(m[3]):root}}
// "Am | F | C G" → one entry per bar (a bar may hold two chords, split at the half bar). Empty bars repeat the last chord.
export function parseProgression(text,bars){const cells=String(text||'').split('|').map(s=>s.trim()).filter((s,i,a)=>s||i<a.length-1);if(!cells.length||cells.every(c=>!c))return{bars:Array(bars).fill(null),errors:[]};
 const errors=[],parsed=cells.map(cell=>cell.split(/\s+/).filter(Boolean).slice(0,2).map(sym=>{const c=parseChord(sym);if(!c)errors.push(sym);return c}).filter(Boolean));
 const out=[];let last=null;for(let i=0;i<bars;i++){const cell=parsed[i%parsed.length];if(cell&&cell.length)last=cell;out.push(last?[...last]:null)}return{bars:out,errors}}
// Diatonic suggestions so the chord box is never a blank page.
export function suggestProgression(root,quality,style,bars,preferFlat){const n=i=>pcName((root+i)%12,preferFlat);let cycle;
 if(style==='blues'){const I=n(0)+'7',IV=n(5)+'7',V=n(7)+'7';cycle=bars>=12?[I,I,I,I,IV,IV,I,I,V,IV,I,V]:[I,I,IV,I,V,IV,I,V]}
 else if(quality==='minor')cycle=style==='metal'?[n(0)+'5',n(8)+'5',n(10)+'5',n(7)+'5']:[n(0)+'m',n(8),n(3),n(10)];
 else cycle=style==='melodic'?[n(0),n(9)+'m',n(5),n(7)]:[n(0),n(7),n(9)+'m',n(5)];
 return Array.from({length:bars},(_,i)=>cycle[i%cycle.length]).join(' | ')}
export const usesFlats=(root,quality)=>quality==='minor'?[0,2,5,7,10,3,8].includes(root):[5,10,3,8,1].includes(root);

// Open-string pitches from the highest string down, like the tab is read.
export const TUNINGS={
 std6:{name:'Standard (6)',strings:[64,59,55,50,45,40]},
 eb6:{name:'Eb standard (6)',strings:[63,58,54,49,44,39]},
 dropD:{name:'Drop D (6)',strings:[64,59,55,50,45,38]},
 d6:{name:'D standard (6)',strings:[62,57,53,48,43,38]},
 std7:{name:'Standard (7)',strings:[64,59,55,50,45,40,35]},
 dropA7:{name:'Drop A (7)',strings:[64,59,55,50,45,40,33]}
};
const OCT=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
export const pitchName=p=>OCT[p%12]+(Math.floor(p/12)-1);
