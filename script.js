const q = new URLSearchParams(location.search);
const raw = q.get('card') || '001';
const card = /^\d{1,3}$/.test(raw) ? raw.padStart(3, '0') : '001';
for (const id of ['card-number', 'footer-number']) {
  const el = document.getElementById(id);
  if (el) el.textContent = card;
}

fetch('guests.json')
  .then(r => r.json())
  .then(g => {
    document.getElementById('guest-name').textContent = g[card] || 'ΕΠΙΣΚΕΠΤΗΣ';
  })
  .catch(() => {
    document.getElementById('guest-name').textContent = 'ΕΠΙΣΚΕΠΤΗΣ';
  });

const introOverlay = document.getElementById('intro-overlay');
const introVideo = document.getElementById('intro-video');
const siteShell = document.getElementById('site-shell');
const skipIntro = document.getElementById('skip-intro');
const activation = document.getElementById('activation');
const access = document.getElementById('access');
const heroPhoto = document.getElementById('hero-photo');
const powerBtn = document.getElementById('power');
const replayBtn = document.getElementById('replay');
const replayIntroBtn = document.getElementById('replay-intro');

function showSite() {
  introOverlay.classList.add('hidden');
  siteShell.classList.remove('shell-hidden');
}

function playIntro() {
  introOverlay.classList.remove('hidden');
  siteShell.classList.add('shell-hidden');
  introVideo.currentTime = 0;
  const p = introVideo.play();
  if (p && typeof p.catch === 'function') {
    p.catch(() => {
      showSite();
    });
  }
}

introVideo.addEventListener('ended', showSite);
introVideo.addEventListener('error', showSite);
skipIntro.addEventListener('click', showSite);

let audioCtx;
function confirmationSound() {
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    audioCtx.resume();
    const now = audioCtx.currentTime;

    const tone1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    tone1.type = 'sine';
    tone1.frequency.setValueAtTime(520, now);
    tone1.frequency.exponentialRampToValueAtTime(860, now + 0.16);
    gain1.gain.setValueAtTime(0.0001, now);
    gain1.gain.exponentialRampToValueAtTime(0.14, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
    tone1.connect(gain1); gain1.connect(audioCtx.destination);
    tone1.start(now); tone1.stop(now + 0.26);

    const tone2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    tone2.type = 'triangle';
    tone2.frequency.setValueAtTime(760, now + 0.12);
    tone2.frequency.exponentialRampToValueAtTime(1180, now + 0.34);
    gain2.gain.setValueAtTime(0.0001, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.12, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
    tone2.connect(gain2); gain2.connect(audioCtx.destination);
    tone2.start(now + 0.12); tone2.stop(now + 0.44);
  } catch (e) {}
}

function triggerActivation() {
  if (powerBtn.disabled) return;
  powerBtn.disabled = true;
  activation.classList.add('pressed');
  confirmationSound();
  heroPhoto.classList.remove('launch');
  void heroPhoto.offsetWidth;
  heroPhoto.classList.add('launch');

  setTimeout(() => {
    activation.hidden = true;
    access.hidden = false;
    access.classList.add('reveal');
    access.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 520);

  setTimeout(() => {
    heroPhoto.classList.remove('launch');
  }, 3200);
}

powerBtn.addEventListener('click', triggerActivation);

replayBtn.addEventListener('click', () => {
  activation.hidden = false;
  activation.classList.remove('pressed');
  access.hidden = true;
  access.classList.remove('reveal');
  powerBtn.disabled = false;
  heroPhoto.classList.remove('launch');
  activation.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

replayIntroBtn.addEventListener('click', playIntro);

window.addEventListener('load', () => {
  setTimeout(playIntro, 120);
});
