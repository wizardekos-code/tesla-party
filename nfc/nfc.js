// Shared NFC landing page. Swap the real video by replacing this one file:
const VIDEO_SRC = 'giannis.mp4';
const BOOT_MS = 1900;           // power-on animation length
const SFX_SRC = '../assets/tesla-activation.m4a'; // optional, already on the site

const screen = document.getElementById('screen');
const video = document.getElementById('video');
const tapSound = document.getElementById('tapSound');
const setState = s => { screen.className = 'screen state-' + s; };

video.src = VIDEO_SRC;
video.load();

function tick(){ const d=new Date(); document.getElementById('clock').textContent =
  d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0'); }
tick(); setInterval(tick, 15000);

let sfx; try { sfx = new Audio(SFX_SRC); sfx.preload='auto'; sfx.volume=.7; } catch(e) {}

function start(){
  if (screen.classList.contains('state-boot') || screen.classList.contains('state-play')) return;
  if (navigator.vibrate) navigator.vibrate(40);
  // Unlock video playback with sound inside the user gesture (iOS needs this)
  video.muted = false;
  video.currentTime = 0;
  const p = video.play();
  if (p && p.then) p.then(()=>video.pause()).catch(()=>{});
  if (sfx) { sfx.currentTime = 0; sfx.play().catch(()=>{}); }
  setState('boot');
  setTimeout(play, BOOT_MS);
}
function play(){
  setState('play');
  video.currentTime = 0;
  video.muted = false;
  video.play().catch(() => {
    // Sound blocked: play muted and offer an unmute tap
    video.muted = true; tapSound.hidden = false; video.play().catch(()=>{});
  });
}
tapSound.addEventListener('click', () => { video.muted = false; tapSound.hidden = true; });
document.getElementById('player').addEventListener('click', () => { if (video.muted){ video.muted=false; tapSound.hidden=true; } });
video.addEventListener('ended', () => setState('end'));
video.addEventListener('error', () => setState('end'));
document.getElementById('power').addEventListener('click', start);
document.getElementById('replay').addEventListener('click', () => { tapSound.hidden = true; play(); });
