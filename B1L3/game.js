'use strict';
(() => {
  const $ = id => document.getElementById(id);
  // All positions are fractions of the original room. Anchors are the cat's feet.
  const cats = {
    lucy: {name:'Lucy',x:.142,y:.575,width:.15},
    billy: {name:'Billy',x:.264,y:.80,width:.18},
    milo: {name:'Milo',x:.515,y:.49,width:.195},
    tommy: {name:'Tommy',x:.594,y:.825,width:.19},
    // Both cats sit directly in front of the TV base, clear of the tabletop.
    sammy: {name:'Sammy',x:.753,y:.44,width:.115},
    maggie: {name:'Maggie',x:.815,y:.445,width:.12},
    // Fit the available floor on the dog's right without clipping the room edge.
    puffy: {name:'Puffy',x:.933,y:.72,width:.12}
  };
  const basicQuestions = [
    {sentence:'Lucy is in the box.',cats:['lucy'],zone:[[.022,.405],[.16,.37],[.26,.45],[.27,.64],[.12,.72],[.018,.64]]},
    {sentence:'Billy is between the box and the chair.',cats:['billy'],zone:[[.225,.56],[.30,.55],[.335,.70],[.335,.89],[.215,.89],[.215,.69]]},
    {sentence:'Milo is on the table.',cats:['milo'],zone:[[.435,.305],[.58,.285],[.696,.515],[.51,.57],[.475,.485]]},
    {sentence:'Tommy is under the table.',cats:['tommy'],zone:[[.53,.605],[.666,.605],[.67,.83],[.53,.83]]},
    {sentence:'Sammy and Maggie are in front of the TV.',cats:['sammy','maggie'],zone:[[.69,.375],[.975,.40],[.997,.98],[.665,.98],[.665,.64],[.72,.565]]},
    // Separate side areas exclude the floor directly in front of the robot dog.
    {sentence:'Puffy is next to the robot dog.',cats:['puffy'],zones:[
      [[.705,.57],[.795,.57],[.795,.82],[.705,.82]],
      [[.884,.55],[.985,.55],[.985,.84],[.884,.84]]
    ]}
  ];
  const basicDepth={lucy:1,billy:6,milo:6,tommy:3,sammy:3,maggie:4,puffy:3};
  const {trim,tableEdge}=window.catChallenge;
  const {configurations}=window.catChallenge.build(basicQuestions);
  const challengeRooms=configurations.map(layout=>({
    ...layout,
    questions:layout.questions.map(({position,cats:ids,zones})=>{
      const subject=ids.map(id=>cats[id].name).join(' and ');
      return {sentence:`${subject} ${ids.length===1?'is':'are'} ${position}.`,cats:ids,zones};
    })
  }));
  let mode='basic',roomIndex=0,mistakes=0,questions=basicQuestions;
  let hasPlayedChallenge=false;
  function shuffledOrder(){
    const order=questions.map((_,i)=>i);
    for(let i=order.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
    return order;
  }
  let order=shuffledOrder();
  let index=0, placed=new Set(), selected=null, drag=null, ghost=null, cursor={x:.5,y:.65}, finished=false, started=false;
  const room=$('room'), tray=$('cat-tray'), feedback=$('feedback'), next=$('next');
  const challenge=()=>mode==='challenge';
  const layout=()=>challengeRooms[roomIndex];
  const asset=image=>`assets/images/${image}`;
  function placement(id){
    if(!challenge())return {...cats[id],image:`${id}.png`,layer:basicDepth[id]};
    const {image,x,y,width,layer,tableMask}=layout().placements[id];
    return {image,x:x/100,y:y/100,width:width/100,layer,bounds:trim[image],tableMask};
  }
  function readQuestion(){
    if(challenge())window.catAudio.speak(questions[order[index]].sentence);
    else window.catAudio.read(order[index]);
  }
  let questionStartedAt=null,questionMs=0,totalMs=0,timerHandle=null;
  function formatTime(ms){const seconds=Math.floor(ms/1000);return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;}
  function updateTimer(){
    const active=questionStartedAt===null?0:performance.now()-questionStartedAt;
    $('question-time').textContent=formatTime(questionMs+active);$('total-time').textContent=formatTime(totalMs+active);
    $('timer-status').textContent=!started?'尚未開始':finished?'已過關':questionStartedAt===null?'本題完成':'計時中';
  }
  function startTimer(){
    clearInterval(timerHandle);questionMs=0;questionStartedAt=performance.now();
    timerHandle=setInterval(updateTimer,200);updateTimer();
  }
  function pauseTimer(){
    if(questionStartedAt!==null){const elapsed=performance.now()-questionStartedAt;questionMs+=elapsed;totalMs+=elapsed;questionStartedAt=null;}
    clearInterval(timerHandle);timerHandle=null;updateTimer();
  }
  function resetTimer(){pauseTimer();questionMs=0;totalMs=0;updateTimer();$('complete-time').textContent='';}
  function contains(p, polygon) {
    let inside=false;
    for(let i=0,j=polygon.length-1;i<polygon.length;j=i++) {
      const [xi,yi]=polygon[i], [xj,yj]=polygon[j];
      if(((yi>p.y)!==(yj>p.y)) && p.x < (xj-xi)*(p.y-yi)/(yj-yi)+xi) inside=!inside;
    }
    return inside;
  }
  function message(text,kind='') {feedback.textContent=text;feedback.className=kind;}
  function endDrag(){
    const active=drag;
    drag=null;
    ghost?.remove();
    ghost=null;
    if(active?.target.hasPointerCapture(active.pointer))active.target.releasePointerCapture(active.pointer);
  }
  function cancel(){endDrag();selected=null;$('placement-cursor').hidden=true;refreshSelection();}
  function refreshSelection(){tray.querySelectorAll('button').forEach(b=>{b.classList.toggle('selected',b.dataset.cat===selected);b.setAttribute('aria-pressed',String(b.dataset.cat===selected));});}
  function showCursor(){const el=$('placement-cursor');el.hidden=false;el.style.left=`${cursor.x*100}%`;el.style.top=`${cursor.y*100}%`;}
  function select(id){if(!started||placed.has(id)||finished)return;window.catAudio.unlock();selected=id;refreshSelection();message(`移動 ${cats[id].name} 到正確位置。`);}
  function completeQuestion(){return questions[order[index]].cats.every(id=>placed.has(id));}
  function render(){
    const q=questions[order[index]];
    $('progress').textContent=`${index+1} / ${questions.length}`;
    $('question-label').textContent=`QUESTION ${String(index+1).padStart(2,'0')}`;
    const match=q.sentence.match(/\b(in front of|next to|between|under|in|on)\b/);
    const emphasis=document.createElement('span');emphasis.className='preposition';emphasis.textContent=match[0];
    $('sentence').replaceChildren(document.createTextNode(q.sentence.slice(0,match.index)),emphasis,document.createTextNode(q.sentence.slice(match.index+match[0].length)));
    next.textContent=index===5?'Finish →':'Next →';next.disabled=!started||!completeQuestion();
    $('placed-count').textContent=`${q.cats.filter(id=>placed.has(id)).length} / ${q.cats.length} 隻`;
    tray.replaceChildren();
    q.cats.forEach(id=>{
      const b=document.createElement('button');b.className='cat-card';b.dataset.cat=id;b.disabled=!started||placed.has(id);b.setAttribute('aria-label',`選取 ${cats[id].name}`);
      const img=document.createElement('img');img.src=asset(id+'.png');img.alt='';img.draggable=false;
      const label=document.createElement('span');label.textContent=cats[id].name+(placed.has(id)?' ✓':'');b.append(img,label);
      b.addEventListener('pointerdown',e=>start(e,id));
      b.addEventListener('lostpointercapture',cancelPointer);
      b.addEventListener('click',e=>{if(e.detail===0&&!placed.has(id)){select(id);}});
      tray.append(b);
    });
    refreshSelection();
  }
  function place(id,p){
    if(!started||!id||placed.has(id)||!questions[order[index]].cats.includes(id)||finished)return;
    cancel();
    const question=questions[order[index]];
    if(!(question.zones||[question.zone]).some(zone=>contains(p,zone))){
      if(challenge())mistakes++;
      window.catAudio.effect('wrong');message('Try again! 再試一次。','retry');return;
    }
    placed.add(id);
    drawCat(id);
    const done=completeQuestion();
    if(done)pauseTimer();
    window.catAudio.effect('correct');
    const partial=challenge()?'Correct! 再把另一隻貓咪放到句子描述的位置。':'Correct! 再把另一隻貓咪放到電視前面。';
    const finalFeedback='Correct! 按 Finish 完成遊戲。';
    message(done?(index===5?finalFeedback:'Correct! 按 Next 繼續。'):partial,'success');
    render();if(done)next.focus({preventScroll:true});
  }
  function drawCat(id){
    const {image,x,y,width,layer,bounds,tableMask}=placement(id);
    const img=document.createElement('img');
    img.src=asset(image);img.alt=cats[id].name;
    let sprite=img;
    if(bounds){
      const [left,top,w,h,fullWidth,fullHeight]=bounds;
      sprite=document.createElement('div');
      sprite.classList.add('trimmed-cat');
      sprite.style.aspectRatio=`${w} / ${h}`;
      img.style.width=`${fullWidth/w*100}%`;
      img.style.left=`${-left/w*100}%`;
      img.style.top=`${-top/h*100}%`;
      sprite.append(img);
    }
    sprite.classList.add('placed-cat');
    sprite.dataset.cat=id;
    Object.assign(sprite.style,{left:`${x*100}%`,top:`${y*100}%`,width:`${width*100}%`,zIndex:layer});
    $('placed-cats').append(sprite);
    if(tableMask){
      const mask=document.createElement('img');
      mask.className='foreground lucy-table-mask';mask.src=asset('room.png');mask.alt='';
      const edges=tableEdge.flatMap((right,i)=>[[right,370+i],[right,371+i]]);
      const polygon=[[1140,370],...edges,[1140,462]].map(([px,py])=>`${px/1672*100}% ${py/941*100}%`);
      mask.style.clipPath=`polygon(${polygon.join(',')})`;
      $('placed-cats').append(mask);
    }
  }
  function point(e){const r=room.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height};}
  function start(e,id){
    if(drag||!e.isPrimary||!started||e.button!==0||placed.has(id)||finished)return;
    const target=e.currentTarget;
    e.preventDefault();select(id);drag={id,target,pointer:e.pointerId,startX:e.clientX,startY:e.clientY,moved:false};
    target.setPointerCapture(e.pointerId);
    ghost=document.createElement('img');ghost.className='drag-ghost';ghost.src=asset(id+'.png');ghost.alt='';document.body.append(ghost);moveGhost(e);
  }
  function moveGhost(e){if(ghost){ghost.style.width=`${room.getBoundingClientRect().width*cats[drag.id].width}px`;ghost.style.left=`${e.clientX}px`;ghost.style.top=`${e.clientY}px`;}}
  document.addEventListener('pointermove',e=>{
    if(!drag||e.pointerId!==drag.pointer)return;
    if(Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>5)drag.moved=true;
    moveGhost(e);
  });
  document.addEventListener('pointerup',e=>{
    if(!drag||e.pointerId!==drag.pointer)return;
    const {id,moved}=drag;endDrag();
    if(moved)place(id,point(e));
  });
  function cancelPointer(e){
    if(drag&&e.pointerId===drag.pointer)cancel();
  }
  document.addEventListener('pointercancel',cancelPointer);
  window.addEventListener('blur',cancel);
  room.addEventListener('click',e=>{if(selected&&!drag)place(selected,point(e));});
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){cancel();return;}
    if(!selected||drag)return;
    const delta=e.shiftKey?.05:.015;
    const changes={ArrowLeft:[-delta,0],ArrowRight:[delta,0],ArrowUp:[0,-delta],ArrowDown:[0,delta]};
    if(changes[e.key]){e.preventDefault();cursor.x=Math.max(0,Math.min(1,cursor.x+changes[e.key][0]));cursor.y=Math.max(0,Math.min(1,cursor.y+changes[e.key][1]));showCursor();}
    else if(e.key==='Enter'&&document.activeElement===room){e.preventDefault();place(selected,cursor);}
    if(changes[e.key])room.focus({preventScroll:true});
  });
  next.addEventListener('click',()=>{
    if(!started)return;
    if(finished){resetGame();return;}
    if(!completeQuestion())return;cancel();
    if(index===5)finishRoom();
    else{index++;render();startTimer();readQuestion();message('把貓咪拖到句子描述的位置。');}
  });
  function finishRoom(){
    finished=true;updateTimer();
    $('complete-title').textContent=challenge()?'Challenge complete!':'You found all the cats!';
    $('complete-time').textContent=`總答題時間：${formatTime(totalMs)}`+(challenge()?` · 放錯次數：${mistakes}`:'');
    window.catAudio.stop();window.catAudio.effect('finish');
    if(challenge())$('audio-status').textContent='';
    $('complete').hidden=false;$('again').focus();
  }
  function resetGame(){
    cancel();window.catAudio.endSession();mistakes=0;
    questions=challenge()?layout().questions:basicQuestions;
    index=0;order=shuffledOrder();placed.clear();finished=false;started=false;cursor={x:.5,y:.65};
    resetTimer();
    $('placed-cats').replaceChildren();$('complete').hidden=true;$('audio-start').hidden=false;
    room.classList.add('waiting');room.tabIndex=-1;$('listen').disabled=true;$('restart').disabled=true;
    $('start-hint').textContent=challenge()?'Read the sentence and drag the cats to the right places!':'點選開始遊戲與英文朗讀';
    $('audio-status').textContent=challenge()?'閱讀英文句子，找出貓咪的位置。':'英文題目會唸兩遍，中間間隔 1 秒。';
    render();message('進度已清除，按 START 重新開始。');$('start-audio').focus({preventScroll:true});
  }
  $('game-mode').addEventListener('change',event=>{
    mode=event.target.value;
    document.body.classList.toggle('challenge-mode',challenge());
    resetGame();
  });
  $('again').addEventListener('click',resetGame);
  $('restart').addEventListener('click',resetGame);
  $('music-toggle').addEventListener('click',()=>window.catAudio.toggleMusic());
  $('view-room').addEventListener('click',()=>{
    $('complete').hidden=true;next.textContent='Play Again';
    message('全部完成！七隻貓咪都在房間裡。','success');
    next.focus({preventScroll:true});
  });
  // Preload every local asset, including cats used in later questions.
  ['room.png','box-front.png','table-front.png','robot-dog-front.png',...Object.keys(cats).map(id=>`${id}.png`),...Object.keys(trim)].forEach(file=>{const img=new Image();img.onerror=()=>{$('asset-error').hidden=false;};img.src=asset(file);});
  render();
  updateTimer();
  message('按房間中央的 START 開始遊戲。');
  $('listen').addEventListener('click',()=>{if(started)readQuestion();});
  $('start-audio').addEventListener('click',()=>{
    if(started)return;
    if(challenge()){
      const candidates=challengeRooms.map((_,i)=>i).filter(i=>!hasPlayedChallenge||i!==roomIndex);
      roomIndex=candidates[Math.floor(Math.random()*candidates.length)];
      hasPlayedChallenge=true;
      questions=layout().questions;
      order=shuffledOrder();
    }
    started=true;$('audio-start').hidden=true;room.classList.remove('waiting');room.tabIndex=0;$('listen').disabled=false;$('restart').disabled=false;
    window.catAudio.unlock();window.catAudio.beginSession();render();startTimer();message('把貓咪拖到句子描述的位置。');readQuestion();
  });
})();
