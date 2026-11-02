const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage();
  await page.addInitScript(()=>{
   // Keep this audio-timing test on a known sentence; shuffle behavior is tested separately.
   Math.random=()=>.99;
   window.mediaLog=[];window.audioInstances=[];
   const OriginalAudio=window.Audio;
   window.Audio=function(...args){
    const audio=new OriginalAudio(...args);
    window.audioInstances.push(audio);
    for(const name of ['playing','ended','error'])audio.addEventListener(name,()=>window.mediaLog.push({event:name,src:audio.currentSrc,time:performance.now()}));
    return audio;
   };
  });
  await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);
  const assets=await page.evaluate(async()=>{
   const names=['clear-meow.wav','unhappy-cat.wav','applause-cheers.mp3','room-music.wav',...Array.from({length:6},(_,i)=>`question-${i+1}.mp3`)];
   return Promise.all(names.map(name=>new Promise((resolve,reject)=>{
    const audio=new Audio(`assets/audio/${name}`);
    audio.onloadedmetadata=()=>resolve({name,duration:audio.duration});audio.onerror=()=>reject(new Error(name));
   })));
  });
  assert(assets.every(a=>a.duration>.5&&a.duration<25));
  const musicState=()=>page.evaluate(()=>{
   const music=window.audioInstances.find(a=>a.loop);
   return {paused:music.paused,loop:music.loop,volume:music.volume,time:music.currentTime};
  });
  assert((await musicState()).paused,'no music before START');
  await page.locator('#music-toggle').click();await page.locator('#music-toggle').click();
  assert((await musicState()).paused,'pre-start toggle cannot bypass START');
  await page.locator('#start-audio').click();
  await page.waitForFunction(()=>!window.audioInstances.find(a=>a.loop).paused);
  assert.equal((await musicState()).volume,.035,'music ducks during narration');
  await page.waitForFunction(()=>document.querySelector('#audio-status').textContent.startsWith('朗讀完成'));
  const log=await page.evaluate(()=>window.mediaLog.filter(e=>e.src.endsWith('question-1.mp3')));
  assert.deepEqual(log.map(e=>e.event),['playing','ended','playing','ended']);
  const gap=log[2].time-log[1].time;assert(gap>=990&&gap<1250,`gap ${gap}`);
  assert.equal((await musicState()).volume,.16,'music restored after two readings');
  await page.locator('#music-toggle').click();assert((await musicState()).paused);
  assert.equal(await page.locator('#music-toggle').getAttribute('aria-pressed'),'false');
  await page.locator('#music-toggle').click();assert(!(await musicState()).paused);
  await page.evaluate(()=>{window.audioInstances.find(a=>a.loop).currentTime=23.8;});
  await page.waitForFunction(()=>window.audioInstances.find(a=>a.loop).currentTime<2);
  assert(!(await musicState()).paused,'music loops over end of file');
  await page.evaluate(()=>window.catAudio.read(1));
  await page.waitForFunction(()=>document.querySelector('#audio-status').textContent==='間隔 1 秒…');
  await page.evaluate(()=>window.catAudio.read(2));
  await page.waitForFunction(()=>document.querySelector('#audio-status').textContent.startsWith('朗讀完成'));
  const second=await page.evaluate(()=>window.mediaLog.filter(e=>e.event==='playing'&&e.src.endsWith('question-2.mp3')));
  assert.equal(second.length,1,'old second repetition canceled');
  for(const kind of ['correct','wrong','finish']){
   await page.evaluate(kind=>window.catAudio.effect(kind),kind);
   assert.equal((await musicState()).volume,.035,'music ducks during effect');
   const file={correct:'clear-meow.wav',wrong:'unhappy-cat.wav',finish:'applause-cheers.mp3'}[kind];
   await page.waitForFunction(file=>window.mediaLog.some(e=>e.event==='ended'&&e.src.endsWith(file)),file);
   assert.equal((await musicState()).volume,.16,'music restored after effect');
  }
  await page.evaluate(()=>window.catAudio.read(0));
  await page.waitForFunction(()=>document.querySelector('#audio-status').textContent==='間隔 1 秒…');
  await page.locator('#music-toggle').click();
  await page.locator('#restart').click();
  assert((await musicState()).paused);assert.equal((await musicState()).time,0);
  const before=await page.evaluate(()=>window.mediaLog.filter(e=>e.event==='playing'&&e.src.endsWith('question-1.mp3')).length);
  await page.waitForTimeout(1150);
  assert.equal(await page.evaluate(()=>window.mediaLog.filter(e=>e.event==='playing'&&e.src.endsWith('question-1.mp3')).length),before,'restart cancels waiting repeat');
  await page.locator('#start-audio').click();
  assert((await musicState()).paused,'restart preserves music-off preference');
  await page.locator('#music-toggle').click();assert(!(await musicState()).paused);
  assert.equal(await page.evaluate(()=>window.mediaLog.filter(e=>e.event==='error').length),0);
  console.log('10 local audio assets decoded; two readings, '+Math.round(gap)+' ms gap; clear meow, unhappy meow, applause; music loop, toggle, ducking, reset cancellation and preference: PASS');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
