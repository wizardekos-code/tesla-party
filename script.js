// Tesla Key Card — personalized guest access and Roadster thruster launch
const params = new URLSearchParams(window.location.search);
const raw = params.get('card') || '001';
const card = /^\d{1,3}$/.test(raw) ? raw.padStart(3, '0') : '001';
for (const id of ['card-number', 'footer-number']) {
  const node = document.getElementById(id);
  if (node) node.textContent = card;
}
fetch('guests.json')
  .then(response => { if (!response.ok) throw new Error('Guest list unavailable'); return response.json(); })
  .then(guests => { document.getElementById('guest-name').textContent = guests[card] || 'ΕΠΙΣΚΕΠΤΗΣ'; })
  .catch(() => { document.getElementById('guest-name').textContent = 'ΕΠΙΣΚΕΠΤΗΣ'; });

const activation = document.getElementById('activation');
const access = document.getElementById('access');
const hero = document.getElementById('hero');
const photo = document.getElementById('hero-photo');
const power = document.getElementById('power');
const replay = document.getElementById('replay');

// Let iOS treat our sounds as media playback (plays even with the ring/silent switch on Safari 17+).
try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}

// ---------- INTRO (with sound) ----------
// Browsers only allow sound after a tap, so the intro waits on its first frame
// for a "start" tap and then plays UNMUTED inside that tap.
const introOverlay = document.getElementById('intro-overlay');
const introVideo = document.getElementById('intro-video');
const introGate = document.getElementById('intro-gate');
const introStart = document.getElementById('intro-start');
const introUnmute = document.getElementById('intro-unmute');
const siteShell = document.getElementById('site-shell');
const skipIntro = document.getElementById('skip-intro');
const replayIntro = document.getElementById('replay-intro');
const launchAudio = new Audio('assets/launch.m4a');
launchAudio.preload = 'auto';
launchAudio.setAttribute('playsinline', '');
let introTimeout;

function endIntro() {
  clearTimeout(introTimeout);
  introVideo?.pause();
  if (introOverlay) introOverlay.hidden = true;
  siteShell.hidden = false;
  siteShell.classList.remove('shell-hidden');
  document.body.classList.remove('playing-intro');
  window.dispatchEvent(new Event('resize'));
}

function showGate() {
  siteShell.hidden = true;
  siteShell.classList.add('shell-hidden');
  introOverlay.hidden = false;
  document.body.classList.add('playing-intro');
  introGate.hidden = false;
  introUnmute.hidden = true;
  introVideo.pause();
  try { introVideo.currentTime = 0; } catch (e) {}
}

function playIntroWithSound() {
  // Runs synchronously inside the tap → sound is allowed on iPhone and Android.
  introGate.hidden = true;
  introVideo.muted = false;
  introVideo.volume = 1;
  try { introVideo.currentTime = 0; } catch (e) {}
  const attempt = introVideo.play();
  if (attempt && attempt.catch) {
    attempt.catch(() => {
      // Extremely rare: play muted and offer a sound button.
      introVideo.muted = true;
      introVideo.play().catch(() => endIntro());
      introUnmute.hidden = false;
    });
  }
  // Warm up the launch sound so the button reacts instantly later.
  launchAudio.load();
  if (landing && landing.readyState < 2) landing.load();
  clearTimeout(introTimeout);
  introTimeout = setTimeout(endIntro, 19000); // safeguard if 'ended' never fires
}

introStart?.addEventListener('click', playIntroWithSound);
introUnmute?.addEventListener('click', () => {
  introVideo.muted = false;
  introVideo.play().catch(() => {});
  introUnmute.hidden = true;
});
introVideo?.addEventListener('ended', endIntro);
introVideo?.addEventListener('error', endIntro);
skipIntro?.addEventListener('click', endIntro);
replayIntro?.addEventListener('click', () => { window.scrollTo(0, 0); showGate(); playIntroWithSound(); });
if (introOverlay && introVideo && siteShell) showGate(); else endIntro();

// ---------- ACTIVATION: key card → unlock → cold-gas thrusters ----------
const smoke = window.RoadsterSmoke ? new window.RoadsterSmoke(document.getElementById('smoke-canvas'), photo, launchAudio) : null;
let revealTimer;

// Pre-rendered landing (real-looking cold-gas vapor). Muted video, so it may start from the tap;
// the sound comes from launchAudio, started in the same tap.
const landing = document.getElementById('landing-video');
if (landing) {
  landing.muted = true;
  landing.addEventListener('playing', () => { landing.classList.add('show'); landing.classList.remove('fade'); });
  landing.addEventListener('timeupdate', () => {
    if (landing.duration && landing.currentTime > landing.duration - 0.45) landing.classList.add('fade');
  });
  landing.addEventListener('ended', () => { landing.classList.remove('show'); landing.classList.remove('fade'); });
}
function playLanding() {
  if (!landing || landing.error) { smoke?.launch(); return; }
  landing.classList.remove('fade');
  try { landing.currentTime = 0; } catch (e) {}
  const p = landing.play();
  if (p && p.catch) p.catch(() => { landing.classList.remove('show'); smoke?.launch(); });
}

function launch() {
  if (power.disabled) return;
  power.disabled = true;
  clearTimeout(revealTimer);

  // Audio must start synchronously inside the tap for iOS Safari.
  try {
    launchAudio.pause();
    launchAudio.currentTime = 0;
    launchAudio.muted = false;
    launchAudio.volume = 1;
    const result = launchAudio.play();
    if (result && result.catch) result.catch(err => { console.warn('Launch audio blocked:', err); showAudioRetry(); });
  } catch (err) {
    console.warn('Launch audio error:', err);
    showAudioRetry();
  }

  activation.classList.add('pressed');
  playLanding();

  revealTimer = setTimeout(() => {
    activation.hidden = true;
    access.hidden = false;
    access.classList.remove('reveal');
    void access.offsetWidth;
    access.classList.add('reveal');
    // Keep the car (and its smoke) in view rather than scrolling to the panel.
    const r = hero.getBoundingClientRect();
    if (r.bottom > window.innerHeight || r.top < 0) hero.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 900);
}

function showAudioRetry() {
  if (document.getElementById('retry-sound')) return;
  const retry = document.createElement('button');
  retry.id = 'retry-sound';
  retry.type = 'button';
  retry.textContent = '🔊 ΠΑΤΗΣΕ ΓΙΑ ΗΧΟ';
  retry.className = 'retry-sound';
  retry.addEventListener('click', () => {
    launchAudio.currentTime = 0;
    launchAudio.play().then(() => { retry.remove(); playLanding(); }).catch(() => {});
  });
  hero.insertAdjacentElement('beforebegin', retry);
}

power.addEventListener('click', launch);
replay.addEventListener('click', () => {
  launchAudio.pause();
  launchAudio.currentTime = 0;
  clearTimeout(revealTimer);
  smoke?.reset();
  if (landing) { landing.pause(); landing.classList.remove('show', 'fade'); }
  activation.hidden = false;
  activation.classList.remove('pressed');
  access.hidden = true;
  access.classList.remove('reveal');
  power.disabled = false;
  document.getElementById('retry-sound')?.remove();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Visual activation only: attendance is NOT recorded in a spreadsheet yet.
