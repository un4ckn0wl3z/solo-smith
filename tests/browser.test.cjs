// Real Chromium: generate, tab, preview, re-roll, exports, English, mobile layout, saved settings.
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const root=path.join(__dirname,'..'),types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.wav':'audio/wav','.woff2':'font/woff2','.woff':'font/woff','.otf':'font/otf'};
const server=http.createServer((req,res)=>{const file=path.join(root,decodeURIComponent(req.url.split('?')[0]).replace(/\/$/,'/index.html'));if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);return res.end()}res.writeHead(200,{'content-type':types[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res)});
(async()=>{await new Promise(r=>server.listen(0,r));const url=`http://localhost:${server.address().port}/`,at=await import(path.join(root,'vendor/alphatab.mjs'));
 const browser=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
 try{const page=await browser.newPage({locale:'th-TH',acceptDownloads:true,viewport:{width:1300,height:950}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);await page.waitForSelector('.style');
  // settings: style picks fingering and density; chords preview; suggested progression
  await page.click('.style[data-style="shred"]');assert.equal(await page.inputValue('#fingering'),'3nps');assert.equal(await page.inputValue('#density'),'80');
  await page.click('.style[data-style="rock"]');await page.selectOption('#quality','major');assert.equal(await page.inputValue('#scale'),'majorPent');await page.selectOption('#quality','minor');assert.equal(await page.inputValue('#scale'),'minorPent');
  await page.fill('#chords','Am | F G | Hm');assert.match(await page.textContent('#chordBars'),/อ่านคอร์ดไม่ออก: Hm/);await page.click('#generate');assert.match(await page.textContent('#status'),/แก้คอร์ด/);
  await page.click('#suggest');assert.equal(await page.inputValue('#chords'),'Am | F | C | G | Am | F | C | G');assert.equal(await page.locator('#chordBars span').count(),8);
  // generate three takes and render the tab
  await page.click('#generate');await page.waitForSelector('#tab svg');await page.waitForTimeout(800);
  assert.equal(await page.locator('#takeTabs button').count(),3);assert.equal(await page.locator('.phrase').count(),4);assert.match(await page.textContent('#takeStats'),/^8 bars · \d+ notes · frets \d+–\d+/);
  const green=await page.evaluate(()=>[...document.querySelectorAll('#tab svg text, #tab svg g')].filter(n=>/#3d7a0c|rgb\(61, ?122, ?12\)/i.test(n.getAttribute('fill')||n.style.fill||'')).length);assert.ok(green>0,'chord tones coloured in the tab');
  const stats1=await page.textContent('#takeStats');await page.click('#takeTabs button:nth-child(2)');assert.equal(await page.getAttribute('#takeTabs button:nth-child(2)','aria-selected'),'true');await page.waitForTimeout(400);
  await page.click('.phrase[data-phrase="1"] button');assert.match(await page.textContent('#status'),/สร้างวลี 2 ใหม่แล้ว/);
  await page.click('#takeTabs button:nth-child(1)');assert.equal(await page.textContent('#takeStats'),stats1,'take 1 unchanged by take 2 re-roll');
  // notation toggle re-renders with standard notation
  await page.click('.tab-tools .toggle-label');await page.waitForTimeout(600);assert.ok(await page.locator('#tab svg').count()>0);
  // preview with click and count-in
  await page.check('#mClick');await page.check('#mCount');await page.click('#play');await page.waitForTimeout(3500);
  assert.equal(await page.evaluate(()=>document.getElementById('status').classList.contains('error')),false,await page.textContent('#status'));assert.ok(parseFloat(await page.evaluate(()=>document.getElementById('progress').style.width))>0);await page.click('#play');
  // exports
  const save=async id=>{const[d]=await Promise.all([page.waitForEvent('download',{timeout:90000}),page.click('#'+id)]);return{name:d.suggestedFilename(),bytes:fs.readFileSync(await d.path())}};
  const gp=await save('dlGp');assert.match(gp.name,/^solo-smith_A-minorPent_rock_take1\.gp$/);const score=at.importer.ScoreLoader.loadScoreFromBytes(new Uint8Array(gp.bytes),new at.Settings());assert.equal(score.masterBars.length,8);assert.equal(score.tracks[0].staves[0].bars[0].voices[0].beats.some(b=>b.notes.length),true);
  const mid=await save('dlMidi');assert.equal(mid.bytes.toString('latin1',0,4),'MThd');assert.equal(mid.bytes.readUInt16BE(10),6,'tempo, lead, bass, keys, drums, click');
  await page.uncheck('#mClick');const wav=await save('dlWav');assert.equal(wav.bytes.toString('latin1',8,12),'WAVE');const secs=(wav.bytes.length-44)/4/44100;assert.ok(secs>=19.2&&secs<21.5,'8 bars at 100 BPM ≈ 19.2 s, got '+secs);
  let peak=0;for(let i=44;i<wav.bytes.length;i+=2)peak=Math.max(peak,Math.abs(wav.bytes.readInt16LE(i)));assert.ok(peak>3000&&peak<32767,'audible and not clipped: '+peak);
  await page.selectOption('#exportPart','backing');const bk=await save('dlMidi');assert.equal(bk.bytes.readUInt16BE(10),4);assert.match(bk.name,/_backing\.mid$/);
  // settings survive a reload; reset restores defaults
  await page.reload();await page.waitForSelector('.style');assert.equal(await page.inputValue('#chords'),'Am | F | C | G | Am | F | C | G');await page.click('#resetBtn');assert.equal(await page.inputValue('#chords'),'');
  assert.deepEqual(errors,[]);
  // English: nothing Thai left while walking the flow
  const en=await browser.newPage({locale:'en-US',viewport:{width:1300,height:950}}),enErrors=[];en.on('pageerror',e=>enErrors.push(e.message));await en.goto(url);await en.waitForSelector('.style');
  const thai=()=>en.evaluate(()=>{const T=/[฀-๿]/,out=new Set(),w=document.createTreeWalker(document.body,5);for(let n=w.currentNode;n;n=w.nextNode()){const el=n.nodeType===3?n.parentElement:n;if(!el||el.closest('script,style,[data-noi18n]'))continue;if(n.nodeType===3){if(T.test(n.data))out.add(n.data.trim())}else for(const a of['aria-label','placeholder','title'])if(T.test(n.getAttribute(a)||''))out.add(a+': '+n.getAttribute(a))}return[...out]});
  const seen=new Set(),check=async()=>{for(const t of await thai())seen.add(t)};await check();await en.click('#helpBtn');await check();await en.click('#closeHelp');
  await en.click('.style[data-style="blues"]');await check();await en.fill('#chords','A7 | D7 | Q');await check();await en.click('#generate');await check();await en.click('#suggest');await en.click('#generate');await en.waitForSelector('#tab svg');await check();
  await en.click('.phrase[data-phrase="0"] button');await check();await en.selectOption('#quality','major');await check();await en.fill('#lo','10');await en.fill('#hi','11');await en.press('#hi','Tab');await check();
  assert.deepEqual([...seen],[],'Thai left in English mode');assert.deepEqual(enErrors,[]);
  // Phone width: no horizontal page scroll
  const phone=await browser.newPage({viewport:{width:390,height:844},locale:'th-TH'});await phone.goto(url);await phone.waitForSelector('.style');await phone.click('#generate');await phone.waitForSelector('#tab svg');await phone.waitForTimeout(500);
  assert.ok(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no horizontal scroll at 390 px');
  console.log('PASS: real Chromium — style presets, key quality picks scale, chord parsing and suggestions, three takes with alphaTab tab and coloured chord tones, phrase re-roll per take, notation toggle, preview with click and count-in, Guitar Pro / MIDI / WAV exports (backing only too), saved settings and reset, English with no Thai left, phone layout.');
 }finally{await browser.close();server.close()}})().catch(e=>{console.error(e);process.exit(1)});
