const params = new URLSearchParams(location.search);
const raw = params.get('card') || '001';
const card = /^\d{1,3}$/.test(raw) ? raw.padStart(3,'0') : '001';
for (const id of ['card-number','footer-number']) document.getElementById(id).textContent=card;
fetch('guests.json').then(r=>{if(!r.ok)throw Error('guests unavailable');return r.json()}).then(guests=>{
  const name=guests[card];
  document.getElementById('guest-name').textContent=name || 'ΕΠΙΣΚΕΠΤΗΣ';
}).catch(()=>document.getElementById('guest-name').textContent='ΕΠΙΣΚΕΠΤΗΣ');
// To add a video later: place invitation.mp4 in assets/ and uncomment:
// document.getElementById('video-slot').innerHTML='<video controls playsinline preload="metadata" style="width:100%;border-radius:12px" src="assets/invitation.mp4"></video>';
