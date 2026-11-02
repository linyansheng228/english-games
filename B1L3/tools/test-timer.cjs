const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const targets={lucy:[.142,.558],billy:[.264,.748],milo:[.507,.535],tommy:[.594,.775],sammy:[.747,.515],maggie:[.827,.46],puffy:[.924,.73]};
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{Math.random=()=>.99;});
  await page.clock.install({time:new Date('2026-11-02T12:00:00Z')});
  await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);
  await page.clock.pauseAt(new Date('2026-11-02T12:00:01Z'));
  await page.clock.runFor(3000);assert.equal(await page.locator('#total-time').innerText(),'00:00');
  async function place(id,point=targets[id]){
   await page.locator(`button[data-cat="${id}"]`).click();const box=await page.locator('#room').boundingBox();
   await page.locator('#room').click({position:{x:box.width*point[0],y:box.height*point[1]}});
  }
  await page.locator('#start-audio').click();await page.clock.runFor(2300);
  assert.equal(await page.locator('#question-time').innerText(),'00:02');
  await place('lucy');assert.equal(await page.locator('#timer-status').innerText(),'本題完成');
  await page.clock.runFor(5000);assert.equal(await page.locator('#total-time').innerText(),'00:02');
  await page.locator('#next').click();assert.equal(await page.locator('#question-time').innerText(),'00:00');
  await page.clock.runFor(1200);await place('billy',[.02,.08]);await page.clock.runFor(1000);
  assert.equal(await page.locator('#question-time').innerText(),'00:02');await place('billy');
  for(const id of ['milo','tommy']){await page.locator('#next').click();await page.clock.runFor(500);await place(id);}
  await page.locator('#next').click();await page.clock.runFor(600);await place('sammy');
  assert.equal(await page.locator('#timer-status').innerText(),'計時中');
  await page.clock.runFor(700);await place('maggie');assert.equal(await page.locator('#timer-status').innerText(),'本題完成');
  await page.locator('#next').click();await page.clock.runFor(1500);await place('puffy');
  assert.equal(await page.locator('#total-time').innerText(),'00:08');
  await page.clock.runFor(10000);assert.equal(await page.locator('#total-time').innerText(),'00:08');
  await page.locator('#next').click();assert.equal(await page.locator('#complete-time').innerText(),'總答題時間：00:08');
  assert.equal(await page.locator('#timer-status').innerText(),'已過關');
  await page.locator('#again').click();assert.equal(await page.locator('#question-time').innerText(),'00:00');
  assert.equal(await page.locator('#total-time').innerText(),'00:00');assert.equal(await page.locator('#timer-status').innerText(),'尚未開始');
  await page.locator('#start-audio').click();await page.clock.runFor(1200);await page.locator('#restart').click();
  await page.clock.runFor(3000);assert.equal(await page.locator('#total-time').innerText(),'00:00');
  assert.deepEqual(errors,[]);
  console.log('Timer: START gate, wrong-answer continuation, correct-answer pause, Next resume, two-cat gate, accumulated result, final freeze and both reset paths PASS');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
