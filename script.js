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

// Visual rocket elements are injected into the existing photo, without editing index.html.
const photo = hero.querySelector('.photo');
if (photo && !photo.querySelector('.jet-system')) {
  const system = document.createElement('div');
  system.className = 'jet-system';
  system.setAttribute('aria-hidden', 'true');
  system.innerHTML = '<i class="jet jet-left"></i><i class="jet jet-right"></i><i class="exhaust-glow"></i>' +
    Array.from({length: 11}, (_, i) => `<span class="puff puff-${i+1}"></span>`).join('');
  photo.appendChild(system);
}


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
