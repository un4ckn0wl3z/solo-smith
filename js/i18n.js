// English UI. Labels are English and hints and messages are Thai; in English mode every Thai text node and
// label attribute goes through translate(), and a MutationObserver keeps text the app writes later in English.
// Switching back restores the original Thai. (Same runtime as Riff Forge.)
const EXACT={
 // page
 'วิธีใช้':'Help','ปิด':'Close','จำนวนจังหวะต่อห้อง':'Beats per bar','ตัวล่าง':'Note value','เฟรตต่ำสุด':'Lowest fret','เฟรตสูงสุด':'Highest fret','เล่น':'Play','หยุด':'Stop',
 'บอก key ของ backing track เลือกสเกลและสไตล์ แล้วรับโซโลที่เล่นได้จริงบนคอกีตาร์':'Tell it the key of your backing track, pick a scale and a style, and get a solo you can actually play on the neck.',
 'มีหลายเวอร์ชันให้เทียบ ฟังพร้อมวงดนตรี ดู tab และส่งออกไปเล่นต่อ':'Compare several takes, hear them with a band, read the tab and export it.',
 '(ไม่บังคับ)':'(optional)','เช่น Am | F | C | G':'e.g. Am | F | C | G','✳ แนะนำคอร์ดตาม key':'✳ Suggest chords for this key','ล้าง':'Clear',
 'ใส่ 1 คอร์ดต่อห้อง คั่นด้วย | ใส่ 2 คอร์ดในห้องเดียวได้ (เช่น F G) ถ้าใส่น้อยกว่าจำนวนห้องจะวนซ้ำ ถ้าใส่คอร์ด โน้ตจังหวะหนักจะลงโน้ตในคอร์ด':'One chord per bar, separated by |. A bar can hold two chords (e.g. F G). Fewer chords than bars repeat. With chords, strong beats land on chord tones.',
 'วิธีที่โซโลถูกสร้าง':'How solos are built','สร้างทีละวลีแบบถาม-ตอบ ใช้ motif ซ้ำ จบวลีที่โน้ตเป้าหมาย และอยู่ในตำแหน่งนิ้วที่เล่นได้จริง ไม่ใช้ AI ทุกอย่างทำงานในเบราว์เซอร์':'Phrase by phrase as call and response, with repeated motifs, phrases ending on target notes, and fingerings you can really play. No AI; everything runs in your browser.',
 '↺ คืนค่าเริ่มต้น':'↺ Reset to defaults','ความเร็วสูงสุด เทคนิค และการย้ายตำแหน่ง':'Top speed, techniques and position shifts','จำนวนโน้ต น้อย = เว้นช่องหายใจ มาก = วิ่งโน้ต':'How many notes: low leaves space, high runs',
 'ยังไม่มีโซโล':'No solo yet','ตั้ง key และสไตล์ แล้วกด Generate solo':'Set the key and style, then press Generate solo','โน้ตในคอร์ด':'Chord tone',
 'Backing only (ไว้ซ้อมด้นสด)':'Backing only (to practise improvising)','Guitar Pro มีเฉพาะแทร็กโซโล (พร้อมชื่อคอร์ด) ส่วน MIDI และ WAV เลือกได้ว่าจะเอาวงด้วยหรือไม่':'Guitar Pro holds the solo track (with chord names); MIDI and WAV can include the band or not.',
 'วิธีใช้ Solo Smith':'How to use Solo Smith',
 'ตั้ง key':'Set the key','ของ backing track เลือกสเกล (pentatonic, blues, mode ต่างๆ) ใส่ BPM, จังหวะ และจำนวนห้อง':'of your backing track, pick a scale (pentatonic, blues, modes …) and set the BPM, time signature and number of bars.',
 'ใส่คอร์ด':'Add chords','(ไม่บังคับ) เช่น Am | F | C | G โซโลจะลงโน้ตในคอร์ดบนจังหวะหนัก ทำให้ฟังเข้ากับเพลง':'(optional), e.g. Am | F | C | G. The solo lands on chord tones on strong beats so it fits the song.',
 'เลือกสไตล์':'Pick a style','ความยาก และความหนาแน่นของโน้ต Box คือรูปสเกลในช่วง 4–5 เฟรต ส่วน 3 notes per string เหมาะกับการวิ่งโน้ตเร็ว':'plus difficulty and note density. Box is the scale shape inside 4–5 frets; 3 notes per string suits fast runs.',
 'กด Generate':'Press Generate','จะได้หลาย take ฟังพร้อมกลอง เบส และคีย์บอร์ด กด ↻ ที่วลีเพื่อสร้างใหม่เฉพาะวลีนั้น':'to get several takes. Listen with drums, bass and keys; press ↻ on a phrase to rebuild just that phrase.',
 'ส่งออก':'Export','เป็น Guitar Pro (เปิดต่อใน Guitar Pro, TuxGuitar, MuseScore หรือส่งให้ Riff Forge), MIDI หรือ WAV เลือก Backing only เพื่อเอาวงไปซ้อมด้นสดเอง':'as Guitar Pro (opens in Guitar Pro, TuxGuitar, MuseScore or Riff Forge), MIDI or WAV. Choose Backing only to practise improvising over the band.',
 'ตัวเลขสีเขียวใน tab คือโน้ตในคอร์ด ณ จังหวะนั้น':'Green fret numbers in the tab are chord tones at that moment.',
 // messages
 'คืนค่าเริ่มต้นแล้ว':'Settings reset to defaults','ใส่คอร์ดแนะนำแล้ว แก้ได้ตามเพลงจริง':'Suggested chords added; edit them to match your song','กด ▶ เพื่อฟังพร้อมวง':'press ▶ to hear it with the band',
 'กำลังโหลดชุดเสียง…':'Loading sounds…','กำลังเล่น':'Playing','ตัวเลขสีเขียวใน tab คือโน้ตในคอร์ด':'green fret numbers are chord tones',
 'กำลังสร้าง WAV…':'Rendering WAV…','ดาวน์โหลด MIDI แล้ว':'MIDI downloaded','ดาวน์โหลด Guitar Pro แล้ว (แทร็กโซโลพร้อมชื่อคอร์ด)':'Guitar Pro downloaded (solo track with chord names)',
 'ช่วงเฟรตนี้แคบเกินไปสำหรับสเกลนี้ ลองขยายช่วงเฟรต':'This fret range is too narrow for this scale; widen it','เบราว์เซอร์นี้เล่นเสียงไม่ได้ ดาวน์โหลด MIDI ไปฟังใน DAW แทน':'This browser can’t play audio; download the MIDI and play it in your DAW',
 'WAV ยาวได้สูงสุด 10 นาที ลดจำนวนห้องหรือเพิ่ม BPM':'WAV is limited to 10 minutes; use fewer bars or a faster tempo','โหลดชุดเสียงไม่สำเร็จ ลองอีกครั้ง':'Couldn’t load the sounds; please try again',
 'ถาม':'call','ตอบ':'response','ปรับต่อได้':'adjust as you like','สร้างวลีใหม่':'Rebuild phrase'
};
const PATTERNS=[
 [/^สร้าง (\d+) take แล้ว$/,'Generated $1 takes'],
 [/^สร้างวลี (\d+) ใหม่$/,'Rebuild phrase $1'],
 [/^สร้างวลี (\d+) ใหม่แล้ว วลีอื่นเหมือนเดิม$/,'Phrase $1 rebuilt; the other phrases are unchanged'],
 [/^(.+): ตั้ง Note density (\d+)% และ fingering (.+) ให้แล้ว$/,'$1: set note density to $2% and fingering to $3'],
 [/^เปลี่ยนสเกลเป็น (.+) ให้เข้ากับ key (major|minor)$/,'Switched the scale to $1 to suit a $2 key'],
 [/^สเกลนี้มักใช้กับ key (major|minor)$/,'this scale is usually used over a $1 key'],
 [/^พบ (\d+) ตำแหน่งในเฟรต (\d+)–(\d+)$/,'$1 positions in frets $2–$3'],
 [/^อ่านคอร์ดไม่ออก: (.+)$/,'Can’t read chord: $1'],
 [/^แก้คอร์ดที่อ่านไม่ออกก่อน: (.+)$/,'Fix the chords that can’t be read first: $1'],
 [/^กำลังสร้าง WAV… (\d+)%$/,'Rendering WAV… $1%'],
 [/^ดาวน์โหลด WAV แล้ว$/,'WAV downloaded'],
 [/^(\d+) · bar (\d+(?:–\d+)?) · (ถาม|ตอบ)$/,(m,a,b,c)=>`${a} · bar ${b} · ${c==='ถาม'?'call':'response'}`],
 [/^แสดง tab ไม่สำเร็จ: (.+)$/,(m,e)=>`Couldn’t show the tab: ${translate(e)}`],
 [/^สร้าง WAV ไม่สำเร็จ: (.+)$/,(m,e)=>`Couldn’t render the WAV: ${translate(e)}`],
 [/^ส่งออก Guitar Pro ไม่สำเร็จ: (.+)$/,(m,e)=>`Couldn’t export Guitar Pro: ${translate(e)}`]
];
const THAI=/[฀-๿]/,cache=new Map();
export function translate(text){const t=text.trim();if(!THAI.test(t))return text;let out=cache.get(t);if(out===undefined){out=EXACT[t];if(out===undefined&&t.includes(' · '))out=t.split(' · ').map(p=>translate(p)).join(' · ');if(out===undefined)for(const[re,rep]of PATTERNS)if(re.test(t)){out=t.replace(re,rep);break}if(out===undefined)out=t;cache.set(t,out)}return text.replace(t,out)}
// Runtime: keeps the original Thai of each text node / attribute so switching back is exact.
export function initI18n(doc=document,storage=globalThis.localStorage){
 let lang='th';const ORIG=new WeakMap(),LAST=new WeakMap(),ATTRS=['aria-label','placeholder','title','alt'];
 const skip=el=>!el||el.closest('script,style,noscript,[data-noi18n]');
 const text=node=>{if(skip(node.parentElement))return;const cur=node.data;if(cur!==LAST.get(node)){if(THAI.test(cur))ORIG.set(node,cur);else{ORIG.delete(node);LAST.set(node,cur);return}}const orig=ORIG.get(node);if(orig==null)return;const want=lang==='en'?translate(orig):orig;LAST.set(node,want);if(cur!==want)node.data=want};
 const attr=(el,name)=>{if(skip(el)||!el.hasAttribute(name))return;const cur=el.getAttribute(name),store=ORIG.get(el)||{},last=(LAST.get(el)||{})[name];if(cur!==last){if(THAI.test(cur))store[name]=cur;else{delete store[name];ORIG.set(el,store);return}}ORIG.set(el,store);const orig=store[name];if(orig==null)return;const want=lang==='en'?translate(orig):orig;LAST.set(el,{...(LAST.get(el)||{}),[name]:want});if(cur!==want)el.setAttribute(name,want)};
 const tree=root=>{if(root.nodeType===3)return text(root);if(root.nodeType!==1)return;const w=doc.createTreeWalker(root,5);for(let n=root;n;n=w.nextNode()){if(n.nodeType===3)text(n);else ATTRS.forEach(a=>attr(n,a))}};
 new doc.defaultView.MutationObserver(rs=>{for(const r of rs){if(r.type==='characterData')text(r.target);else if(r.type==='attributes')attr(r.target,r.attributeName);else r.addedNodes.forEach(tree)}}).observe(doc.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:ATTRS});
 const set=l=>{lang=l==='en'?'en':'th';doc.documentElement.lang=lang;doc.querySelectorAll('[data-lang]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.lang===lang)));tree(doc.body);try{storage?.setItem('ss-lang',lang)}catch(e){}};
 doc.querySelectorAll('[data-lang]').forEach(b=>b.addEventListener('click',()=>set(b.dataset.lang)));
 let start='th';try{start=storage?.getItem('ss-lang')||((doc.defaultView.navigator.language||'').toLowerCase().startsWith('th')?'th':'en')}catch(e){}
 set(start);return{set,get:()=>lang};
}
