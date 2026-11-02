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
  const questions = [
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
  function shuffledOrder(){
    const order=questions.map((_,i)=>i);
    for(let i=order.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
    return order;
  }
  let order=shuffledOrder();
  let index=0, placed=new Set(), selected=null, drag=null, ghost=null, cursor={x:.5,y:.65}, finished=false, started=false;
  const room=$('room'), tray=$('cat-tray'), feedback=$('feedback'), next=$('next');
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
  function clearGhost(){if(ghost)ghost.remove();ghost=null;}
  function cancel(){clearGhost();drag=null;selected=null;$('placement-cursor').hidden=true;refreshSelection();}
  function refreshSelection(){tray.querySelectorAll('button').forEach(b=>{b.classList.toggle('selected',b.dataset.cat===selected);b.setAttribute('aria-pressed',String(b.dataset.cat===selected));});}
  function showCursor(){const el=$('placement-cursor');el.hidden=false;el.style.left=`${cursor.x*100}%`;el.style.top=`${cursor.y*100}%`;}
  function select(id){if(!started||placed.has(id)||finished)return;window.catAudio.unlock();selected=id;refreshSelection();message(`移動 ${cats[id].name} 到正確位置。`);}
  function completeQuestion(){return questions[order[index]].cats.every(id=>placed.has(id));}
  function render(){
    const q=questions[order[index]];
    $('progress').textContent=`${index+1} / 6`;
    $('question-label').textContent=`QUESTION ${String(index+1).padStart(2,'0')}`;
    const match=q.sentence.match(/\b(in front of|next to|between|under|in|on)\b/);
    const emphasis=document.createElement('span');emphasis.className='preposition';emphasis.textContent=match[0];
    $('sentence').replaceChildren(document.createTextNode(q.sentence.slice(0,match.index)),emphasis,document.createTextNode(q.sentence.slice(match.index+match[0].length)));
    next.textContent=index===5?'Finish →':'Next →';next.disabled=!started||!completeQuestion();
    $('placed-count').textContent=`${q.cats.filter(id=>placed.has(id)).length} / ${q.cats.length} 隻`;
    tray.replaceChildren();
    q.cats.forEach(id=>{
      const b=document.createElement('button');b.className='cat-card';b.dataset.cat=id;b.disabled=!started||placed.has(id);b.setAttribute('aria-label',`選取 ${cats[id].name}`);
      const img=document.createElement('img');img.src=`assets/images/${id}.png`;img.alt='';img.draggable=false;
      const label=document.createElement('span');label.textContent=cats[id].name+(placed.has(id)?' ✓':'');b.append(img,label);
      b.addEventListener('pointerdown',e=>start(e,id));
      b.addEventListener('click',e=>{if(e.detail===0&&!placed.has(id)){select(id);}});
      tray.append(b);
    });
    refreshSelection();
  }
  function place(id,p){
    if(!started||!id||placed.has(id)||!questions[order[index]].cats.includes(id)||finished)return;
    clearGhost();
    const question=questions[order[index]];
    if(!(question.zones||[question.zone]).some(zone=>contains(p,zone))){
      window.catAudio.effect('wrong');message('Try again! 再試一次。','retry');selected=null;refreshSelection();return;
    }
    placed.add(id);selected=null;$('placement-cursor').hidden=true;
    const cat=cats[id],img=document.createElement('img');img.className='placed-cat';img.dataset.cat=id;img.alt=cat.name;img.src=`assets/images/${id}.png`;
    // Correct drops snap to the reviewed display positions, including Puffy.
    const {x,y}=cat;
    // Room foregrounds cover floor cats. Milo alone must stay above the tabletop.
    const depth={lucy:1,billy:6,milo:6,tommy:3,sammy:3,maggie:4,puffy:3};
    img.style.left=`${x*100}%`;img.style.top=`${y*100}%`;img.style.width=`${cat.width*100}%`;img.style.zIndex=String(depth[id]);
    $('placed-cats').append(img);
    const done=completeQuestion();
    if(done)pauseTimer();
    window.catAudio.effect('correct');
    message(done?(index===5?'Correct! 按 Finish 完成遊戲。':'Correct! 按 Next 繼續。'):'Correct! 再把另一隻貓咪放到電視前面。','success');
    render();if(done)next.focus({preventScroll:true});
  }
  function point(e){const r=room.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height};}
  function start(e,id){
    if(!started||e.button!==0||placed.has(id)||finished)return;
    e.preventDefault();select(id);drag={id,pointer:e.pointerId,startX:e.clientX,startY:e.clientY,moved:false};
    e.currentTarget.setPointerCapture(e.pointerId);
    ghost=document.createElement('img');ghost.className='drag-ghost';ghost.src=`assets/images/${id}.png`;ghost.alt='';document.body.append(ghost);moveGhost(e);
  }
  function moveGhost(e){if(ghost){ghost.style.width=`${room.getBoundingClientRect().width*cats[drag.id].width}px`;ghost.style.left=`${e.clientX}px`;ghost.style.top=`${e.clientY}px`;}}
  document.addEventListener('pointermove',e=>{
    if(!drag||e.pointerId!==drag.pointer)return;
    if(Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>5)drag.moved=true;
    moveGhost(e);
  });
  document.addEventListener('pointerup',e=>{
    if(!drag||e.pointerId!==drag.pointer)return;
    const {id,moved}=drag;drag=null;clearGhost();
    if(moved)place(id,point(e));
  });
  document.addEventListener('pointercancel',cancel);
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
    if(index===5){finished=true;updateTimer();$('complete-time').textContent=`總答題時間：${formatTime(totalMs)}`;window.catAudio.stop();window.catAudio.effect('finish');$('complete').hidden=false;$('again').focus();}
    else{index++;render();startTimer();window.catAudio.read(order[index]);message('把貓咪拖到句子描述的位置。');}
  });
  function resetGame(){
    cancel();window.catAudio.endSession();index=0;order=shuffledOrder();placed.clear();finished=false;started=false;cursor={x:.5,y:.65};
    resetTimer();
    $('placed-cats').replaceChildren();$('complete').hidden=true;$('audio-start').hidden=false;
    room.classList.add('waiting');room.tabIndex=-1;$('listen').disabled=true;$('restart').disabled=true;
    render();message('進度已清除，按 START 重新開始。');$('start-audio').focus({preventScroll:true});
  }
  $('again').addEventListener('click',resetGame);
  $('restart').addEventListener('click',resetGame);
  $('music-toggle').addEventListener('click',()=>window.catAudio.toggleMusic());
  $('view-room').addEventListener('click',()=>{$('complete').hidden=true;next.textContent='Play Again';message('全部完成！七隻貓咪都在房間裡。','success');});
  // Preload every local asset, including cats used in later questions.
  ['room','box-front','table-front','robot-dog-front',...Object.keys(cats)].forEach(id=>{const img=new Image();img.onerror=()=>{$('asset-error').hidden=false;};img.src=`assets/images/${id}.png`;});
  render();
  updateTimer();
  message('按房間中央的 START 開始遊戲。');
  $('listen').addEventListener('click',()=>{if(started)window.catAudio.read(order[index]);});
  $('start-audio').addEventListener('click',()=>{
    if(started)return;
    started=true;$('audio-start').hidden=true;room.classList.remove('waiting');room.tabIndex=0;$('listen').disabled=false;$('restart').disabled=false;
    window.catAudio.unlock();window.catAudio.beginSession();render();startTimer();message('把貓咪拖到句子描述的位置。');window.catAudio.read(order[index]);
  });
})();
