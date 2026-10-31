import{NOTE_NAMES,SCALES,SCALE_GROUPS,TUNINGS,parseProgression,suggestProgression,usesFlats,pcName,scalePcs}from'./theory.js';
import{positions}from'./fretboard.js';
import{generate,noteEvents,soloLength,STYLES,DEFAULTS}from'./generator.js';
import{toScore}from'./alphatex.js';
import{midiFile}from'./midi.js';
import{Player,renderWav}from'./audio.js';
import{initI18n}from'./i18n.js';
const $=id=>document.getElementById(id),player=new Player();
const STYLE_SET={blues:{density:45,fingering:'box'},rock:{density:55,fingering:'box'},shred:{density:80,fingering:'3nps'},melodic:{density:35,fingering:'box'}};
let S=load(),takes=[],current=0,playing=false,at=null,api=null;
function load(){try{return{...DEFAULTS,...JSON.parse(localStorage.getItem('ss-settings')||'{}')}}catch(e){return{...DEFAULTS}}}
let saveTimer;const save=()=>{clearTimeout(saveTimer);saveTimer=setTimeout(persist,300)};function persist(){clearTimeout(saveTimer);try{localStorage.setItem('ss-settings',JSON.stringify(S))}catch(e){}}
addEventListener('pagehide',persist);document.addEventListener('visibilitychange',()=>{if(document.hidden)persist()});
function status(text,error=false){$('status').textContent=text;$('status').classList.toggle('error',error)}
const option=(text,value)=>{const o=document.createElement('option');o.textContent=text;o.value=value;return o};

// ----- controls
NOTE_NAMES.forEach((n,i)=>$('root').append(option(n==='Eb'?'Eb / D#':n==='Ab'?'Ab / G#':n==='Bb'?'Bb / A#':n.includes('#')?`${n} / ${pcName(i,true)}`:n,i)));
for(const g of SCALE_GROUPS){const og=document.createElement('optgroup');og.label=g.name;for(const[id,s]of Object.entries(SCALES))if(s.group===g.id)og.append(option(s.name,id));$('scale').append(og)}
for(const n of[2,3,4,5,6,7,9,12])$('num').append(option(n,n));for(const n of[4,8,12,16,24,32])$('bars').append(option(n+' bars',n));
for(const[id,t]of Object.entries(TUNINGS))$('tuning').append(option(t.name,id));
for(const[id,s]of Object.entries(STYLES)){const b=document.createElement('button');b.type='button';b.className='style';b.dataset.style=id;b.innerHTML='<strong></strong><small></small>';b.querySelector('strong').textContent=s.name;b.querySelector('small').textContent=s.sub;b.onclick=()=>pickStyle(id);$('styles').append(b)}
const FIELDS=['root','quality','scale','bpm','num','den','bars','chords','difficulty','density','tuning','fingering','move','start','lo','hi'];
function paint(){for(const f of FIELDS)$(f).value=String(S[f]);$('takeCountSel').value=String(S.takes||3);document.querySelectorAll('.style').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.style===S.style)));for(const f of['difficulty','density'])$(f+'Value').textContent=S[f]+'%';hints()}
const NUM=new Set(['root','bpm','num','den','bars','difficulty','density','start','lo','hi']);
for(const f of FIELDS){const el=$(f);el.addEventListener(el.type==='range'||el.type==='text'?'input':'change',()=>{let v=el.value;if(NUM.has(f)){v=Number(v);if(!Number.isFinite(v))return}S[f]=v;
 if(f==='quality'&&SCALES[S.scale].quality!==v){S.scale=v==='minor'?'minorPent':'majorPent';$('scale').value=S.scale;status(`เปลี่ยนสเกลเป็น ${SCALES[S.scale].name} ให้เข้ากับ key ${v}`)}
 if(f==='difficulty'||f==='density')$(f+'Value').textContent=v+'%';hints();save()})}
$('takeCountSel').onchange=()=>{S.takes=+$('takeCountSel').value;save()};
for(const f of['bpm','start','lo','hi'])$(f).addEventListener('change',()=>{clampNumbers();paint();save()});
function clampNumbers(){S.bpm=Math.max(40,Math.min(260,Math.round(S.bpm)||100));S.lo=Math.max(0,Math.min(20,Math.round(S.lo)||0));S.hi=Math.max(S.lo+4,Math.min(24,Math.round(S.hi)||17));S.start=Math.max(S.lo,Math.min(S.hi,Math.round(S.start)||S.lo))}
function pickStyle(id){S.style=id;Object.assign(S,STYLE_SET[id]);paint();save();status(`${STYLES[id].name}: ตั้ง Note density ${S.density}% และ fingering ${S.fingering==='3nps'?'3 notes per string':'Box'} ให้แล้ว · ปรับต่อได้`)}
$('resetBtn').onclick=()=>{const keep=S.takes;S={...DEFAULTS,takes:keep};paint();save();status('คืนค่าเริ่มต้นแล้ว')};
$('suggest').onclick=()=>{S.chords=suggestProgression(S.root,S.quality,S.style,S.bars,usesFlats(S.root,S.quality));$('chords').value=S.chords;hints();save();status('ใส่คอร์ดแนะนำแล้ว แก้ได้ตามเพลงจริง')};
$('clearChords').onclick=()=>{S.chords='';$('chords').value='';hints();save()};
function hints(){const sc=SCALES[S.scale],flats=usesFlats(S.root,S.quality),notes=scalePcs(S.root,S.scale).map(pc=>pcName(pc,flats)).join(' ');
 $('scaleHint').textContent=`${pcName(S.root,flats)} ${sc.name}: ${notes}`+(sc.quality!==S.quality?' · สเกลนี้มักใช้กับ key '+sc.quality:'');
 const{bars,errors}=parseProgression(S.chords,S.bars);const box=$('chordBars');box.replaceChildren();
 if(errors.length){const e=document.createElement('span');e.className='err';e.textContent='อ่านคอร์ดไม่ออก: '+errors.join(', ');box.append(e)}
 if(S.chords.trim())bars.forEach((c,i)=>{const s=document.createElement('span'),n=document.createElement('small');n.textContent=i+1;s.append(n,document.createTextNode(c?c.map(x=>x.name).join(' '):'–'));box.append(s)});
 const shapes=positions(TUNINGS[S.tuning].strings,scalePcs(S.root,S.scale),{lo:S.lo,hi:S.hi,fingering:S.fingering});
 $('positionHint').textContent=shapes.length?`พบ ${shapes.length} ตำแหน่งในเฟรต ${S.lo}–${S.hi} · ${shapes.map(p=>p.min+'–'+p.max).slice(0,6).join(', ')}${shapes.length>6?' …':''}`:'ช่วงเฟรตนี้แคบเกินไปสำหรับสเกลนี้ ลองขยายช่วงเฟรต'}

// ----- generate
const seed=()=>Math.floor(Math.random()*2**31);
$('generate').onclick=()=>{clampNumbers();paint();const{errors}=parseProgression(S.chords,S.bars);if(errors.length){status('แก้คอร์ดที่อ่านไม่ออกก่อน: '+errors.join(', '),true);return}
 try{const base=seed();takes=Array.from({length:S.takes||3},(_,i)=>({seed:base,take:i,rerolls:{},solo:generate(S,base,i)}));current=0;showTakes();status(`สร้าง ${takes.length} take แล้ว · กด ▶ เพื่อฟังพร้อมวง`)}catch(e){status(e.message,true)}};
function showTakes(){stop();$('empty').hidden=!!takes.length;$('result').hidden=!takes.length;$('takeCount').textContent=String(takes.length);
 $('takeTabs').replaceChildren(...takes.map((t,i)=>{const b=document.createElement('button');b.type='button';b.role='tab';b.textContent='Take '+(i+1);b.setAttribute('aria-selected',String(i===current));b.onclick=()=>{current=i;showTakes()};return b}));showTake()}
function stats(solo){const n=noteEvents(solo),fr=n.map(x=>x.fret),secs=soloLength(solo)*60/solo.options.bpm,count=k=>n.filter(x=>x[k]).length;
 return`${solo.bars.length} bars · ${n.length} notes · frets ${Math.min(...fr)}–${Math.max(...fr)} · ${count('bend')} bends · ${count('legato')} legato · ${count('slide')} slides · ${Math.floor(secs/60)}:${String(Math.round(secs%60)).padStart(2,'0')}`}
function showTake(){const t=takes[current],o=t.solo.options;$('takeTitle').textContent=`Take ${current+1} · ${STYLES[o.style].name} · ${pcName(o.root,usesFlats(o.root,o.quality))} ${SCALES[o.scale].name}`;$('takeStats').textContent=stats(t.solo);
 $('phrases').replaceChildren(...t.solo.phrases.map(p=>{const d=document.createElement('div');d.className='phrase';d.dataset.phrase=p.index;const label=document.createElement('span');label.textContent=`${p.index+1} · bar ${p.from+1}${p.to>p.from?'–'+(p.to+1):''} · ${p.role==='call'?'ถาม':'ตอบ'}`;
  const b=document.createElement('button');b.type='button';b.textContent='↻';b.setAttribute('aria-label',`สร้างวลี ${p.index+1} ใหม่`);b.onclick=()=>{stop();t.rerolls[p.index]=(t.rerolls[p.index]||0)+1;t.solo=generate(o,t.seed,t.take,t.rerolls);showTake();status(`สร้างวลี ${p.index+1} ใหม่แล้ว วลีอื่นเหมือนเดิม`)};d.append(label,b);return d}));
 renderTab()}
async function alphaTab(){if(!at)at=await import('../vendor/alphatab.mjs');return at}
async function renderTab(){try{const A=await alphaTab(),score=toScore(A,takes[current].solo);
  if(!api){api=new A.AlphaTabApi($('tab'),{core:{useWorkers:false,fontDirectory:new URL('vendor/font/',document.baseURI).href,enableLazyLoading:false},display:{scale:innerWidth<760?.8:.95,staveProfile:$('notation').checked?A.StaveProfile.ScoreTab:A.StaveProfile.Tab},notation:{rhythmMode:A.TabRhythmMode.ShowWithBars},player:{enablePlayer:false}});
   api.error.on(e=>status('แสดง tab ไม่สำเร็จ: '+(e?.message||e),true))}
  api.renderScore(score,[0])}catch(e){status('แสดง tab ไม่สำเร็จ: '+e.message,true)}}
$('notation').onchange=async()=>{if(!api)return;const A=await alphaTab();api.settings.display.staveProfile=$('notation').checked?A.StaveProfile.ScoreTab:A.StaveProfile.Tab;api.updateSettings();api.render()};

// ----- playback
const parts=()=>({lead:$('mLead').checked,drums:$('mDrums').checked,bass:$('mBass').checked,keys:$('mKeys').checked,click:$('mClick').checked,countIn:$('mCount').checked});
function stop(){player.stop();playing=false;$('play').textContent='▶';$('play').setAttribute('aria-label','เล่น');$('progress').style.width='0%';document.querySelectorAll('.phrase.on').forEach(p=>p.classList.remove('on'))}
$('play').onclick=async()=>{if(playing){stop();return}const t=takes[current];if(!t)return;playing=true;$('play').textContent='■';$('play').setAttribute('aria-label','หยุด');const solo=t.solo,spb=60/solo.options.bpm,barSec=solo.barTicks/960*spb;
 player.onProgress=(p,pos)=>{$('progress').style.width=p*100+'%';const bar=Math.floor(pos/barSec);document.querySelectorAll('.phrase').forEach(el=>{const ph=solo.phrases[+el.dataset.phrase];el.classList.toggle('on',bar>=ph.from&&bar<=ph.to)})};player.onEnd=stop;
 try{status('กำลังโหลดชุดเสียง…');await player.play(solo,parts(),{loop:$('mLoop').checked});if(playing)status('กำลังเล่น · ตัวเลขสีเขียวใน tab คือโน้ตในคอร์ด')}catch(e){stop();status(e.message,true)}};
for(const id of['mLead','mDrums','mBass','mKeys','mClick','mCount','mLoop'])$(id).onchange=()=>{if(playing)stop()};

// ----- export
const fileBase=()=>{const o=takes[current].solo.options;return`solo-smith_${pcName(o.root,usesFlats(o.root,o.quality)).replace('#','s')}-${o.scale}_${o.style}_take${current+1}`};
function download(data,name,type){const url=URL.createObjectURL(data instanceof Blob?data:new Blob([data],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)}
const exportParts=()=>({all:['lead','bass','keys','drums'],solo:['lead'],backing:['bass','keys','drums']})[$('exportPart').value];
$('dlGp').onclick=async()=>{try{const A=await alphaTab(),score=toScore(A,takes[current].solo,{color:null}),bytes=new A.exporter.Gp7Exporter().export(score,new A.Settings());download(bytes,fileBase()+'.gp','application/octet-stream');status('ดาวน์โหลด Guitar Pro แล้ว (แทร็กโซโลพร้อมชื่อคอร์ด)')}catch(e){status('ส่งออก Guitar Pro ไม่สำเร็จ: '+e.message,true)}};
$('dlMidi').onclick=()=>{const p=exportParts();download(midiFile(takes[current].solo,{parts:p,click:$('mClick').checked}),fileBase()+'_'+$('exportPart').value+'.mid','audio/midi');status('ดาวน์โหลด MIDI แล้ว')};
$('dlWav').onclick=async()=>{const btn=$('dlWav'),p=exportParts();btn.disabled=true;try{status('กำลังสร้าง WAV…');const blob=await renderWav(takes[current].solo,{lead:p.includes('lead'),drums:p.includes('drums'),bass:p.includes('bass'),keys:p.includes('keys'),click:$('mClick').checked},x=>status(`กำลังสร้าง WAV… ${Math.round(x*100)}%`));download(blob,fileBase()+'_'+$('exportPart').value+'.wav');status(`ดาวน์โหลด WAV แล้ว · ${(blob.size/1048576).toFixed(1)} MB`)}catch(e){status('สร้าง WAV ไม่สำเร็จ: '+e.message,true)}finally{btn.disabled=false}};

$('helpBtn').onclick=()=>$('help').showModal();$('closeHelp').onclick=()=>$('help').close();
clampNumbers();paint();initI18n();
