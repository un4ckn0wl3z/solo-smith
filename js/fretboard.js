// Playable positions for a scale on a tuning. Strings are numbered like tab: 1 = highest.
// box:  every scale note inside a 5-fret window (one finger per fret plus a stretch); a pitch found on
//       two strings keeps the lower fret, which gives the familiar pentatonic / CAGED box shapes.
// 3nps: three scale notes per string, climbing from the lowest string.
export function positions(tuning,pcs,{lo=0,hi=17,fingering='box'}={}){const set=new Set(pcs),low=tuning.length,out=[];
 for(let anchor=Math.max(0,lo);anchor<=hi;anchor++){if(!set.has((tuning[low-1]+anchor)%12))continue;
  const notes=fingering==='3nps'?threePerString(tuning,set,anchor,lo,hi):boxNotes(tuning,set,anchor,lo,hi);if(!notes)continue;
  const frets=notes.map(n=>n.fret);out.push({anchor,fingering,min:Math.min(...frets),max:Math.max(...frets),notes})}
 // Keep shapes that are actually different; neighbours one fret apart repeat most notes.
 return out.filter((p,i)=>p.notes.length>=Math.min(10,pcs.length*2)&&(i===0||p.anchor-out[i-1].anchor>=2||p.notes[0].pitch!==out[i-1].notes[0].pitch))}
function boxNotes(tuning,set,anchor,lo,hi){const top=Math.min(hi,anchor+4),byPitch=new Map();
 for(let s=tuning.length;s>=1;s--)for(let f=anchor;f<=top;f++){if(f<lo)continue;const pitch=tuning[s-1]+f;if(!set.has(pitch%12))continue;const prev=byPitch.get(pitch);if(!prev||f<prev.fret)byPitch.set(pitch,{string:s,fret:f,pitch})}
 const notes=[...byPitch.values()].sort((a,b)=>a.pitch-b.pitch);return notes.length?notes:null}
function threePerString(tuning,set,anchor,lo,hi){const notes=[];let pitch=tuning[tuning.length-1]+anchor;
 for(let s=tuning.length;s>=1;s--){const open=tuning[s-1];for(let k=0;k<3;k++){if(k||s<tuning.length){pitch++;while(!set.has(pitch%12))pitch++}const fret=pitch-open;if(fret<lo||fret>hi)return null;notes.push({string:s,fret,pitch})}
  const fs=notes.slice(-3).map(n=>n.fret);if(Math.max(...fs)-Math.min(...fs)>5)return null}
 return notes}
// The position that starts closest to a fret, for "start around fret N".
export const nearestPosition=(list,fret)=>list.reduce((best,p,i)=>Math.abs(p.min-fret)<Math.abs(list[best].min-fret)?i:best,0);
// Bend source: a scale note on the same string a whole or half step (or a minor third in blues) below the target, on the top three strings.
export function bendFrom(tuning,target,position,scalePcs,allowThird=false){for(const d of allowThird?[2,1,3]:[2,1]){const from=target.pitch-d;if(!scalePcs.includes(((from%12)+12)%12))continue;
  for(let s=1;s<=3;s++){const fret=from-tuning[s-1];if(fret>=3&&fret>=position.min-1&&fret<=position.max+1)return{string:s,fret,pitch:from,bend:d}}}return null}
