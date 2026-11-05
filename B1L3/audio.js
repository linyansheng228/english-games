'use strict';
(() => {
  const voice = new Audio();
  const effects = {correct:new Audio('assets/audio/clear-meow.wav'),wrong:new Audio('assets/audio/unhappy-cat.wav'),finish:new Audio('assets/audio/applause-cheers.mp3')};
  const music=new Audio('assets/audio/room-music.wav');music.loop=true;
  let generation=0, timer=null, unlocked=false, musicEnabled=true, sessionActive=false, reading=false, effectPlaying=false, effectVersion=0;
  const status=()=>document.getElementById('audio-status');
  function updateMusic(){music.volume=(reading||effectPlaying)? .035 : .16;}
  function playMusic(){
    updateMusic();
    if(!sessionActive||!musicEnabled||document.hidden)return;
    music.play().catch(e=>{if(e.name!=='AbortError')status().textContent='背景音樂未能播放，請切換音樂開關再試一次。';});
  }
  function toggleMusic(){
    musicEnabled=!musicEnabled;const button=document.getElementById('music-toggle');
    button.textContent=`背景音樂：${musicEnabled?'開':'關'}`;button.setAttribute('aria-pressed',String(musicEnabled));
    if(musicEnabled)playMusic();else music.pause();
  }
  function stopEffects(){effectVersion++;effectPlaying=false;for(const audio of Object.values(effects)){audio.onended=null;audio.pause();audio.currentTime=0;}}
  function stop(){
    generation++;
    clearTimeout(timer);timer=null;reading=false;voice.onended=null;voice.onerror=null;voice.pause();voice.removeAttribute('src');voice.load();stopEffects();updateMusic();status().textContent='英文題目會唸兩遍，中間間隔 1 秒。';
  }
  function beginSession(){sessionActive=true;playMusic();}
  function endSession(){sessionActive=false;stop();music.pause();music.currentTime=0;}
  function unlock(){if(unlocked)return;unlocked=true;for(const audio of Object.values(effects)){audio.load();}}
  function effect(kind){
    stopEffects();const audio=effects[kind],token=effectVersion;effectPlaying=true;updateMusic();
    const complete=()=>{if(token===effectVersion){effectPlaying=false;updateMusic();}};
    audio.onended=complete;
    audio.play().catch(e=>{complete();if(e.name!=='AbortError')status().textContent='音效未能播放，請檢查瀏覽器音訊設定。';});
  }
  function read(index){return readFile(`assets/audio/question-${index+1}.mp3`);}
  function speak(sentence){
    const slug=sentence.toLowerCase().replace(/[^a-z]+/g,'-').replace(/-$/,'');
    return readFile(`assets/audio/challenge/${slug}.mp3`);
  }
  async function readFile(file){
    stop();
    const token=generation;
    reading=true;updateMusic();
    voice.src=file;
    voice.preload='auto';
    let repeat=1;
    function fail(){if(token===generation){reading=false;updateMusic();status().textContent='朗讀未能播放，請按「再聽一次」或檢查音訊設定。';}}
    async function play(){
      if(token!==generation)return;
      status().textContent=`正在朗讀：第 ${repeat} / 2 遍`;
      try{voice.currentTime=0;await voice.play();}catch{fail();}
    }
    voice.onerror=fail;
    voice.onended=()=>{
      if(token!==generation)return;
      if(repeat===1){repeat=2;status().textContent='間隔 1 秒…';timer=setTimeout(play,1000);}
      else{reading=false;updateMusic();status().textContent='朗讀完成，可按「再聽一次」重播。';}
    };
    await play();
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden)music.pause();else playMusic();});
  window.addEventListener('pagehide',endSession);
  window.catAudio={read,speak,stop,unlock,effect,toggleMusic,beginSession,endSession};
})();
