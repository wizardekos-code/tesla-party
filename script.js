// Tesla Key Card — personalized guest access and rocket launch
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
const power = document.getElementById('power');
const replay = document.getElementById('replay');

// Smoke is sampled from the user's approved invitation footage.
// Old CSS-generated oval puffs and artificial jets are intentionally not used.
const photo = hero.querySelector('.photo');
photo.querySelectorAll('.jet-system').forEach(el => el.remove());
const footageSmoke = document.createElement('div');
footageSmoke.className = 'footage-smoke';
footageSmoke.setAttribute('aria-hidden', 'true');
footageSmoke.innerHTML = '<i class="smoke-from-video smoke-left"></i><i class="smoke-from-video smoke-right"></i>';
photo.appendChild(footageSmoke);

// The intro is an exclusive full-screen scene; the page must NOT be visible beneath it.
const introOverlay = document.getElementById('intro-overlay');
const introVideo = document.getElementById('intro-video');
const siteShell = document.getElementById('site-shell');
const skipIntro = document.getElementById('skip-intro');
const replayIntro = document.getElementById('replay-intro');
let introTimeout;
function endIntro() {
  clearTimeout(introTimeout);
  introVideo?.pause();
  if (introOverlay) introOverlay.hidden = true;
  if (siteShell) {
    siteShell.hidden = false;
    siteShell.classList.remove('shell-hidden');
  }
  document.body.classList.remove('playing-intro');
}
function beginIntro() {
  if (!introVideo || !introOverlay) return endIntro();
  siteShell.hidden = true;
  siteShell.classList.add('shell-hidden');
  introOverlay.hidden = false;
  document.body.classList.add('playing-intro');
  introVideo.currentTime = 0;
  introVideo.muted = true; // mobile autoplay requires muted video
  const attempt = introVideo.play();
  if (attempt && typeof attempt.catch === 'function') {
    attempt.catch(() => { skipIntro.textContent = 'ΣΥΝΕΧΕΙΑ ΣΤΗΝ ΠΡΟΣΚΛΗΣΗ'; });
  }
  clearTimeout(introTimeout);
  introTimeout = setTimeout(endIntro, 19000); // safeguard if browser loses ended event
}
introVideo?.addEventListener('ended', endIntro);
introVideo?.addEventListener('error', endIntro);
skipIntro?.addEventListener('click', endIntro);
replayIntro?.addEventListener('click', () => { window.scrollTo(0,0); beginIntro(); });
if (introOverlay && introVideo && siteShell) beginIntro();

// A real audio file (extracted from the user's invitation video) plays directly
// inside the user's tap handler. No AudioContext oscillator beeps.
const rocketAudio = new Audio('assets/tesla-activation.m4a');
rocketAudio.preload = 'auto';
rocketAudio.playsInline = true;
rocketAudio.volume = 1;
let revealTimer;
let effectTimer;

function launch() {
  if (power.disabled) return;
  power.disabled = true;
  clearTimeout(revealTimer);
  clearTimeout(effectTimer);

  // Start audio synchronously during the actual touch/click for iOS Safari.
  try {
    rocketAudio.pause();
    rocketAudio.currentTime = 0;
    const result = rocketAudio.play();
    if (result && typeof result.catch === 'function') {
      result.catch(err => {
        console.warn('Rocket launch audio blocked or unavailable:', err);
        showAudioRetry();
      });
    }
  } catch (err) {
    console.warn('Rocket launch audio error:', err);
    showAudioRetry();
  }

  activation.classList.add('pressed');
  hero.classList.remove('launch');
  void hero.offsetWidth; // Restart CSS animation on repeat
  hero.classList.add('launch');

  revealTimer = setTimeout(() => {
    activation.hidden = true;
    access.hidden = false;
    access.classList.remove('reveal');
    void access.offsetWidth;
    access.classList.add('reveal');
    access.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 1400);
  effectTimer = setTimeout(() => hero.classList.remove('launch'), 6100);
}

function showAudioRetry() {
  if (document.getElementById('retry-sound')) return;
  const retry = document.createElement('button');
  retry.id = 'retry-sound';
  retry.type = 'button';
  retry.textContent = '🔊 ΠΑΤΗΣΕ ΓΙΑ ΗΧΟ';
  retry.style.cssText = 'display:block;margin:12px auto;padding:12px 16px;border:1px solid #ff5168;border-radius:12px;background:#581a26;color:white;font-weight:700';
  retry.addEventListener('click', () => {
    rocketAudio.currentTime = 0;
    rocketAudio.play().then(() => retry.remove()).catch(() => {});
  });
  hero.insertAdjacentElement('beforebegin', retry);
}

power.addEventListener('click', launch);
replay.addEventListener('click', () => {
  rocketAudio.pause();
  rocketAudio.currentTime = 0;
  clearTimeout(revealTimer);
  clearTimeout(effectTimer);
  hero.classList.remove('launch');
  activation.hidden = false;
  activation.classList.remove('pressed');
  access.hidden = true;
  access.classList.remove('reveal');
  power.disabled = false;
  document.getElementById('retry-sound')?.remove();
  activation.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

// Visual activation only: attendance is NOT recorded in a spreadsheet yet.
