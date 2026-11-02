const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const targets={lucy:[.142,.558],billy:[.264,.748],milo:[.507,.535],tommy:[.594,.775],sammy:[.747,.515],maggie:[.827,.46],puffy:[.924,.73]};
const groups=[['lucy'],['billy'],['milo'],['tommy'],['sammy','maggie'],['puffy']];
const phrases=['in','between','on','under','in front of','next to'];
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 const errors=[];
 async function run(touch){
  const context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1366,height:1000},hasTouch:touch,isMobile:touch});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);
  await page.waitForFunction(()=>Array.from(document.images).every(i=>i.complete&&i.naturalWidth>0));
  const ids=()=>page.locator('.cat-card').evaluateAll(nodes=>nodes.map(n=>n.dataset.cat));
  const first=page.locator('.cat-card').first();
  assert(await first.isDisabled());assert(await page.locator('#listen').isDisabled());assert(await page.locator('#next').isDisabled());
  assert.equal(await page.locator('#start-audio').innerText(),'START');
  assert.equal(await page.locator('.background').evaluate(i=>getComputedStyle(i).opacity),'0.28');
  const scene=await page.locator('#room').boundingBox(),button=await page.locator('#start-audio').boundingBox();
  assert(Math.abs(button.x+button.width/2-scene.x-scene.width/2)<1);
  assert(Math.abs(button.y+button.height/2-scene.y-scene.height/2)<1);
  await first.dispatchEvent('pointerdown',{button:0,pointerId:1});await first.dispatchEvent('click',{detail:0});
  assert.equal(await page.locator('.drag-ghost,.cat-card.selected').count(),0);
  await page.screenshot({path:path.join(__dirname,touch?'mobile-start.png':'desktop-start.png'),fullPage:true});
  await page.evaluate(()=>{
   window.effectCalls=[];window.readCalls=[];const effect=window.catAudio.effect,read=window.catAudio.read;
   window.catAudio.effect=kind=>{window.effectCalls.push(kind);return effect(kind);};
   window.catAudio.read=index=>{window.readCalls.push(index);return read(index);};
  });
  await page.locator('#start-audio').click();assert(await page.locator('#audio-start').isHidden());
  const session=touch?await context.newCDPSession(page):null;
  async function drag(id,point){
   await page.locator(`button[data-cat="${id}"]`).scrollIntoViewIfNeeded();
   const card=await page.locator(`button[data-cat="${id}"]`).boundingBox(),room=await page.locator('#room').boundingBox();
   const from={x:card.x+card.width/2,y:card.y+card.height/2},to={x:room.x+room.width*point[0],y:room.y+room.height*point[1]};
   if(touch){
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[from]});
    for(let k=1;k<=8;k++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:from.x+(to.x-from.x)*k/8,y:from.y+(to.y-from.y)*k/8}]});
    await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   }else{await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(to.x,to.y,{steps:8});await page.mouse.up();}
  }
  async function tap(id,position){
   await page.locator(`button[data-cat="${id}"]`).click();const room=await page.locator('#room').boundingBox();
   await page.locator('#room').click({position:{x:room.width*position[0],y:room.height*position[1]}});
  }
  const seen=[];
  for(let i=0;i<6;i++){
   const cats=await ids(),source=groups.findIndex(g=>g[0]===cats[0]);
   assert(!seen.includes(source),'no repeated questions');seen.push(source);assert.deepEqual(cats,groups[source]);
   assert.equal(await page.locator('#progress').innerText(),`${i+1} / 6`);
   assert.equal(await page.evaluate(()=>window.readCalls.at(-1)),source,'narration matches shuffled question');
   assert.equal(await page.locator('#sentence .preposition').innerText(),phrases[source]);
   assert.equal(await page.locator('#sentence .preposition').evaluate(e=>getComputedStyle(e).color),'rgb(210, 28, 40)');
   assert(await page.locator('#next').isDisabled());
   const before=await page.locator('.placed-cat').count();
   await drag(cats[0],[.02,.08]);assert.match(await page.locator('#feedback').innerText(),/Try again!/);
   assert.equal(await page.locator('.placed-cat').count(),before);
   if(cats[0]==='puffy'){
    for(const point of [[.84,.63],[.84,.88],[.84,.96]]){
     await drag('puffy',point);assert.match(await page.locator('#feedback').innerText(),/Try again!/,'dog body and directly in front are wrong');
    }
   }
   for(let j=0;j<cats.length;j++){
    const id=cats[j],point=source===0?[.035,.60]:source===1?[.315,.83]:source===4?(j===0?[.69,.9]:[.98,.86]):targets[id];
    await drag(id,point);assert.match(await page.locator('#feedback').innerText(),/Correct!/);
    assert(await page.locator(`button[data-cat="${id}"]`).isDisabled());
    if(cats.length===2&&j===0)assert(await page.locator('#next').isDisabled(),'both TV cats required at any round position');
   }
   assert(!(await page.locator('#next').isDisabled()));
   if(i===5)await page.screenshot({path:path.join(__dirname,touch?'mobile-complete.png':'desktop-complete.png'),fullPage:true});
   await page.locator('#next').click();
  }
  assert.deepEqual([...seen].sort(),[0,1,2,3,4,5]);assert.equal(await page.locator('.placed-cat').count(),7);
  const depth=await page.evaluate(()=>{
   const z=selector=>Number(getComputedStyle(document.querySelector(selector)).zIndex);
   return {table:z('#table-front'),dog:z('#robot-dog-front'),milo:z('.placed-cat[data-cat="milo"]'),
    sammy:z('.placed-cat[data-cat="sammy"]'),maggie:z('.placed-cat[data-cat="maggie"]'),puffy:z('.placed-cat[data-cat="puffy"]')};
  });
  assert(depth.table>depth.sammy&&depth.table>depth.maggie,'TV cats stay behind table');
  assert(depth.dog>depth.sammy&&depth.dog>depth.maggie&&depth.dog>depth.puffy,'robot dog stays in foreground');
  assert(depth.maggie>depth.sammy,'Maggie overlaps Sammy regardless of answer order');
  assert(depth.milo>depth.table,'Milo stays on tabletop');
  const roomBox=await page.locator('#room').boundingBox(),billyBox=await page.locator('.placed-cat[data-cat="billy"]').boundingBox();
  assert(billyBox.height>roomBox.height*(691-374)/941,'Billy is taller than original box');
  assert(billyBox.width<roomBox.width*.19,'Billy is slightly smaller than previous 20% width');
  const tvPositions=await page.locator('.placed-cat[data-cat="sammy"],.placed-cat[data-cat="maggie"]').evaluateAll(nodes=>nodes.map(n=>({x:parseFloat(n.style.left),y:parseFloat(n.style.top)})));
  assert(tvPositions.every(p=>p.x>70&&p.x<91&&p.y>42&&p.y<47),'both cats sit directly in front of TV base');
  assert(await page.locator('#complete').isVisible());assert.equal(await page.evaluate(()=>window.effectCalls.at(-1)),'finish');
  assert(await page.locator('#asset-error').isHidden());assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.locator('#view-room').click();await page.locator('#next').click();
  assert.equal(await page.locator('.placed-cat').count(),0);assert(await page.locator('#start-audio').isVisible());
  await page.locator('#start-audio').click();await page.setViewportSize({width:768,height:900});
  const [id]=await ids();await tap(id,targets[id]);assert.equal(await page.locator('.placed-cat').count(),1);
  await page.locator('#restart').click();assert.equal(await page.locator('.placed-cat,.drag-ghost,.cat-card.selected').count(),0);
  assert.equal(await page.locator('#progress').innerText(),'1 / 6');assert(await page.locator('#listen').isDisabled());
  // Find Puffy in each independently shuffled round; both sides work.
  for(const point of [[.735,.72],[.95,.70]]){
   await page.locator('#start-audio').click();
   for(let i=0;i<6;i++){
    const cats=await ids();if(cats[0]==='puffy')break;
    for(const cat of cats)await tap(cat,targets[cat]);
    await page.locator('#next').click();
   }
   assert.deepEqual(await ids(),['puffy']);
   await drag('puffy',[.84,.88]);assert.match(await page.locator('#feedback').innerText(),/Try again!/);
   await drag('puffy',point);assert.match(await page.locator('#feedback').innerText(),/Correct!/);
   const puffy=await page.locator('.placed-cat[data-cat="puffy"]').boundingBox(),scene=await page.locator('#room').boundingBox();
   assert(puffy.x>scene.x+scene.width*.87,'either accepted drop snaps Puffy to dog right');
   assert(puffy.x+puffy.width<=scene.x+scene.width,'Puffy stays fully inside scene');
   await page.locator('#restart').click();
  }
  console.log(`${touch?'TOUCH':'MOUSE'}: randomized questions, narration, dual-cat gate, Puffy left/right, foreground depth, completion/restart PASS; order ${seen.join(',')}`);
  await context.close();
 }
 try{
  await run(false);await run(true);assert.deepEqual(errors,[]);
  // Deterministically exercise two different shuffles, without flaky randomness assertions.
  const starts=[];
  for(const random of [.01,.99]){
   const context=await browser.newContext();const page=await context.newPage();
   await page.addInitScript(value=>{Math.random=()=>value;},random);
   await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);
   starts.push(await page.locator('#sentence').innerText());await context.close();
  }
  assert.notEqual(starts[0],starts[1]);console.log('Different random inputs change order; no JavaScript errors.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
