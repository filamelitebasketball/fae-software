// Playhouse Pickle demo: public site + player portal. All data is local and simulated.
const $ = s => document.querySelector(s);
const S = { user: null, admin: false, pay: null, sel: { day: 0, court: 0, hour: null } };
const RATE = 300, UNLOCK = 99, DAY = 864e5, NOW = Date.now();
const peso = n => '₱' + n.toLocaleString('en-PH');
const EMAIL = /^[^ @]+@[^ @]+[.][^ @]{2,}$/;

// Photos load from each owner's public profile; crop = [left %, top %, width %] of a square frame.
const OWNERS = [
  { n: 'Boss Keng', real: 'Exekiel Christian Gaspar', line: 'Co-owner · Team Payaman', img: 'https://graph.facebook.com/BossKengOfficial/picture?width=600&height=600', crop: [-47.8, -32.6, 217.4] },
  { n: 'Pat Velasquez-Gaspar', real: 'Patricia Velasquez-Gaspar', line: 'Co-owner · Community lead', img: 'https://yt3.googleusercontent.com/JUJ9_H6XzKHpbF-R8qQPPuOnQ4mjF495ZlM4nFJYfAsIZH1d4O3T009LP29As47voRRGkWbiGA=s900-c-k-c0x00ffffff-no-rj', crop: [-106.3, -25, 312.5] },
  { n: 'Junnie Boy', real: 'Marlon Velasquez Jr.', line: 'Co-owner · Team Payaman', img: 'https://pbs.twimg.com/media/HQ2tJXDawAAt2jU?format=jpg&name=medium', crop: [-199.2, -16.7, 400] },
  { n: 'Dudut Lang', real: 'Jaime Marino de Guzman', line: 'Co-owner · "Passion with a purpose"', img: 'https://yt3.googleusercontent.com/ytc/AIdro_lo2FoV8ZdLB3tfz4Ded-zLcWfkAtFoEDh0t3M0sLnIeQ=s900-c-k-c0x00ffffff-no-rj', crop: [-22, 0, 122] }
];
const TAGS = ['Your pickleball playground', '#pickleball', '#bacoorcavite', '#playhousepickleballco', '@playhousepickleco', '#TeamPayaman'];
const WIFI = [{ n: '1 Hour', p: 49, note: 'Quick session' }, { n: '1 Day', p: 99, note: 'All-day access' }, { n: '1 Week', p: 299, note: 'Best value' }];
const MATCHES = [
  { id: 'PC-1041', t: 'Doubles vs. Team Payaman', court: 'Court 1', date: 'Sep 20', mins: 94, clips: 14, locked: false, exp: NOW + 26 * DAY },
  { id: 'PC-1039', t: 'Open play, evening session', court: 'Court 3', date: 'Sep 18', mins: 118, clips: 21, locked: true, exp: NOW + 1.3 * DAY },
  { id: 'PC-1036', t: 'Rematch, third game', court: 'Court 2', date: 'Sep 15', mins: 47, clips: 8, locked: true, exp: NOW + 4.2 * DAY },
  { id: 'PC-1030', t: 'Weekend tournament, round 1', court: 'Court 1', date: 'Sep 12', mins: 63, clips: 11, locked: true, exp: NOW + 0.45 * DAY }
];
const MY_BOOKINGS = [
  { what: 'Court 1', when: 'Thu, 8:00 AM to 9:00 AM', st: 'Upcoming' },
  { what: 'Open play', when: 'Sat, 5:00 PM to 9:00 PM', st: 'Paid' },
  { what: 'Court 2', when: 'Sep 20, 6:00 PM to 7:00 PM', st: 'Completed' }
];

// ---------- helpers ----------
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.remove('hide'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.add('hide'), 2800); }
function openDlg(id) { document.querySelectorAll('dialog[open]').forEach(d => d.close()); document.getElementById(id).showModal(); }
function closeDlgs() { document.querySelectorAll('dialog[open]').forEach(d => d.close()); }
function qr(data) { return 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=0&data=' + encodeURIComponent(data); }
function showQR(title, sub, data) { $('#qrTitle').textContent = title; $('#qrSub').textContent = sub; $('#qrImg').src = qr(data); openDlg('dlgQR'); }
function toggleSwitch(b) { const on = b.getAttribute('aria-checked') !== 'true'; b.setAttribute('aria-checked', on); b.classList.toggle('bg-lime', on); b.classList.toggle('bg-white/15', !on); b.firstElementChild.style.transform = on ? 'translateX(20px)' : 'translateX(0)'; }
function hourLabel(h) { const s = h < 12 ? 'AM' : 'PM', x = h % 12 || 12; return x + ':00 ' + s; }
function countdown(ms) { if (ms <= 0) return 'Expired'; const d = Math.floor(ms / DAY), h = Math.floor(ms % DAY / 36e5), m = Math.floor(ms % 36e5 / 6e4), s = Math.floor(ms % 6e4 / 1e3); return (d ? d + 'd ' : '') + String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0'); }
const courtLines = '<svg class="court-lines" viewBox="0 0 400 150" preserveAspectRatio="none"><g fill="none" stroke="#DDE01D" stroke-width="2"><rect x="20" y="15" width="360" height="120"/><path d="M200 15v120M20 75h360" stroke-dasharray="6 6"/><path d="M130 15v120M270 15v120"/></g></svg>';

// ---------- navigation ----------
function go(screen, anchor) {
  if (screen === 'portal' && !S.user) return openDlg('dlgAuth');
  if (screen === 'admin' && !S.admin) return openAdmin();
  ['home', 'portal', 'wifi', 'admin'].forEach(s => $('#screen-' + s).classList.toggle('hide', s !== screen));
  if (screen === 'admin' && window.renderAdmin) renderAdmin();
  if (anchor) requestAnimationFrame(() => document.getElementById(anchor).scrollIntoView({ behavior: 'smooth' }));
  else scrollTo(0, 0);
  if (screen === 'home' && window.ScrollTrigger) ScrollTrigger.refresh();
}

// ---------- accounts (simulated) ----------
function captureLead(name, contact, source) { if (typeof DB !== 'undefined') DB.customers.unshift({ n: name, c: contact, t: 'Lead', last: 'Today', spend: 0, src: source }); }
function login(method) {
  let name = 'Marco Rivera', email = 'marco.rivera@gmail.com';
  if (method === 'email') {
    email = $('#aEmail').value.trim(); name = $('#aName').value.trim() || email.split('@')[0];
    if (!EMAIL.test(email)) return $('#aErr').classList.remove('hide');
    $('#aErr').classList.add('hide'); captureLead(name, email, 'Sign-up');
  }
  S.user = { name, email };
  $('#pName').textContent = name; $('#pEmail').textContent = email; $('#fName').value = name;
  $('#loginBtn').classList.add('hide'); $('#portalBtn').classList.remove('hide');
  closeDlgs(); toast('Welcome, ' + name.split(' ')[0]); go('portal');
}
function logout() { S.user = null; $('#loginBtn').classList.remove('hide'); $('#portalBtn').classList.add('hide'); go('home'); toast('Logged out'); }
function guestSend() {
  const e = $('#gEmail').value.trim();
  if (!EMAIL.test(e)) return $('#gErr').classList.remove('hide');
  $('#gErr').classList.add('hide'); captureLead(e.split('@')[0], e, 'Kiosk guest'); closeDlgs(); toast('Links sent to ' + e);
}

// ---------- booking widget ----------
function isBooked(d, c, h) { return (d * 7 + c * 13 + h * 5) % 9 < 3; }
function isOpenPlay(c, h) { return c === 2 && h >= 13 && h < 21; }
function renderBooker() {
  const days = [...Array(7)].map((_, i) => { const d = new Date(NOW + i * DAY); return i === 0 ? 'Today' : d.toLocaleDateString('en-PH', { weekday: 'short', day: 'numeric' }); });
  $('#dayChips').innerHTML = days.map((l, i) => `<button class="chip text-sm" aria-pressed="${i === S.sel.day}" onclick="S.sel.day=${i};S.sel.hour=null;renderBooker()">${l}</button>`).join('');
  $('#courtChips').innerHTML = [0, 1, 2].map(c => `<button class="chip flex-1 text-sm font-semibold" aria-pressed="${c === S.sel.court}" onclick="S.sel.court=${c};S.sel.hour=null;renderBooker()">Court ${c + 1}</button>`).join('');
  const hrs = [...Array(17)].map((_, i) => i + 6);
  $('#slotGrid').innerHTML = hrs.map(h => {
    const d = S.sel.day, c = S.sel.court;
    if (isOpenPlay(c, h)) return `<div class="cell text-center text-muted" style="cursor:default">${hourLabel(h)}<br><span class="text-[10px] text-lime">Open play</span></div>`;
    if (isBooked(d, c, h)) return `<div class="cell text-center text-slate-600 line-through" style="cursor:default">${hourLabel(h)}</div>`;
    const on = S.sel.hour === h;
    return `<button class="cell open text-center ${on ? 'booked' : ''}" aria-pressed="${on}" onclick="S.sel.hour=${h};renderBooker()"><span class="font-semibold">${hourLabel(h)}</span></button>`;
  }).join('');
  const b = $('#bookBtn'), h = S.sel.hour;
  b.disabled = h == null; b.style.opacity = h == null ? .45 : 1;
  $('#bookSummary').innerHTML = h == null ? 'Choose an open hour.' : `<b>Court ${S.sel.court + 1}</b> · ${days[S.sel.day]} · ${hourLabel(h)} to ${hourLabel(h + 1)} · <b class="text-lime">${peso(RATE)}</b>`;
}
function startBooking() {
  if (S.sel.hour == null) return;
  S.pay = { kind: 'book', amt: RATE, label: `Court ${S.sel.court + 1} · ${hourLabel(S.sel.hour)}` };
  $('#payTitle').textContent = 'Confirm booking'; $('#payDesc').textContent = S.pay.label + '. Includes a PickleCam recording.';
  $('#payAmt').textContent = peso(RATE); openDlg('dlgPay');
}

// ---------- payments (simulated) ----------
function pay(method) {
  const p = S.pay; closeDlgs(); if (!p) return;
  if (typeof DB !== 'undefined') DB.payments.unshift({ ref: 'PP' + String(Date.now()).slice(-6), what: p.label, method, amt: p.amt, st: 'Pending' });
  if (p.kind === 'book') { MY_BOOKINGS.unshift({ what: p.label.split(' · ')[0], when: p.label.split(' · ')[1], st: 'Upcoming' }); S.sel.hour = null; renderBooker(); renderMyBookings(); toast('Booked via ' + method + '. See you on court'); }
  if (p.kind === 'unlock') { const m = MATCHES.find(x => x.id === p.id); m.locked = false; renderMatches(); toast('Unlocked via ' + method + '. Yours to keep'); }
  if (p.kind === 'wifi') showQR('WiFi voucher ready', p.label + ' · connect at the venue', 'PLAYHOUSE-WIFI-' + Date.now());
}
function buyWifi(i) { const w = WIFI[i]; S.pay = { kind: 'wifi', amt: w.p, label: w.n + ' WiFi pass' }; $('#payTitle').textContent = 'Buy ' + w.n + ' WiFi'; $('#payDesc').textContent = 'Voucher QR appears right after payment.'; $('#payAmt').textContent = peso(w.p); openDlg('dlgPay'); }
function unlock(id) { const m = MATCHES.find(x => x.id === id); S.pay = { kind: 'unlock', id, amt: UNLOCK, label: 'Keep ' + m.id + ' forever' }; $('#payTitle').textContent = 'Keep this match forever'; $('#payDesc').textContent = m.t + '. Full game plus ' + m.clips + ' highlight clips, no expiry, HD download.'; $('#payAmt').textContent = peso(UNLOCK); openDlg('dlgPay'); }

// ---------- portal ----------
function pTab(n) {
  document.querySelectorAll('[data-ptab]').forEach(b => b.setAttribute('aria-selected', b.dataset.ptab === n));
  ['matches', 'bookings', 'wifi', 'profile'].forEach(t => $('#ptab-' + t).classList.toggle('hide', t !== n));
}
function renderMatches() {
  $('#matchList').innerHTML = MATCHES.map(m => `
    <article class="card overflow-hidden lift">
      <div class="thumb">${courtLines}<i class="fa-solid fa-circle-play text-5xl text-white/80 relative"></i>
        <span class="absolute top-3 left-3 badge b-mute num">${m.mins} min full game</span>
        <span class="absolute top-3 right-3 badge ${m.locked ? 'b-gold' : 'b-lime'} num" ${m.locked ? `data-exp="${m.exp}"` : ''}>${m.locked ? countdown(m.exp - Date.now()) : 'Kept forever'}</span></div>
      <div class="p-5">
        <h3 class="font-bold">${m.t}</h3>
        <p class="text-xs text-muted mt-1 num">${m.court} · ${m.date} · #${m.id} · <span class="text-lime">${m.clips} AI highlight clips</span></p>
        <div class="flex flex-wrap gap-2 mt-4">
          <button class="btn btn-ghost !py-2 !px-3 text-sm" onclick="showQR('Full game ${m.id}','Scan to watch on your phone','https://media.picklecam.ph/game/${m.id}')"><i class="fa-solid fa-film"></i>Full game</button>
          <button class="btn btn-ghost !py-2 !px-3 text-sm" onclick="showQR('Highlights ${m.id}','${m.clips} clips, ready to post','https://media.picklecam.ph/reel/${m.id}')"><i class="fa-solid fa-wand-magic-sparkles"></i>Highlights</button>
          ${m.locked ? `<button class="btn btn-lime !py-2 !px-3 text-sm ml-auto" onclick="unlock('${m.id}')">Keep forever ${peso(UNLOCK)}</button>`
                     : `<button class="btn btn-lime !py-2 !px-3 text-sm ml-auto" onclick="showQR('Download ${m.id}','HD download link','https://media.picklecam.ph/dl/${m.id}')"><i class="fa-solid fa-download"></i>Download</button>`}
        </div>
      </div>
    </article>`).join('');
  $('#pClips').textContent = MATCHES.reduce((a, m) => a + m.clips, 0);
  $('#pExpiring').textContent = MATCHES.filter(m => m.locked && m.exp - Date.now() < 5 * DAY).length;
}
function renderMyBookings() { $('#myBookings').innerHTML = MY_BOOKINGS.map(b => `<div class="card p-4 flex justify-between items-center"><div><p class="font-bold">${b.what}</p><p class="text-xs text-muted">${b.when}</p></div><span class="badge ${b.st === 'Completed' ? 'b-mute' : 'b-lime'}">${b.st}</span></div>`).join(''); }
function renderWifi(el) { $(el).innerHTML = WIFI.map((w, i) => `<div class="card p-6 text-center lift relative">${i === 2 ? '<span class="absolute -top-3 left-1/2 -translate-x-1/2 badge b-gold bg-black">Best value</span>' : ''}<p class="font-bold text-lg">${w.n}</p><p class="display text-4xl text-lime my-3 num">${peso(w.p)}</p><p class="text-xs text-muted mb-5">${w.note}</p><button class="btn btn-lime w-full justify-center" onclick="buyWifi(${i})">Buy pass</button></div>`).join(''); }
setInterval(() => document.querySelectorAll('[data-exp]').forEach(el => el.textContent = countdown(+el.dataset.exp - Date.now())), 1000);

// ---------- home sections ----------
function renderHome() {
  $('#ownerGrid').innerHTML = OWNERS.map(o => `<figure class="founder reveal"><div class="frame"><img src="${o.img}" alt="${o.n}" loading="lazy" referrerpolicy="no-referrer" style="left:${o.crop[0]}%;top:${o.crop[1]}%;width:${o.crop[2]}%"></div><figcaption class="mt-4"><p class="font-bold text-lg">${o.n}</p><p class="text-xs text-lime font-semibold">${o.real}</p><p class="text-xs text-muted mt-1">${o.line}</p></figcaption></figure>`).join('');
  const row = TAGS.map(t => `<span class="${t.startsWith('#') || t.startsWith('@') ? '' : 'text-lime'}">${t}</span>`).join('');
  $('#mq').innerHTML = row + row;
}

// ---------- motion: layered hero, the P serves the ball into "Book a court" ----------
function initMotion() {
  if (!window.gsap || !window.ScrollTrigger || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  gsap.registerPlugin(ScrollTrigger);
  gsap.from('.hero-in', { opacity: 0, y: 28, duration: .9, stagger: .12, ease: 'power3.out' });
  gsap.from('#heroP', { opacity: 0, x: 90, rotate: -16, duration: 1.4, ease: 'power3.out' });
  const stage = $('.stage'), ball = $('#heroBall'), cta = $('#heroCta');
  const at = (el, fx, fy) => { const r = el.getBoundingClientRect(), s = stage.getBoundingClientRect(); return [r.left - s.left + r.width * fx - 11, r.top - s.top + r.height * fy - 11]; };
  const tl = gsap.timeline({ scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom bottom', scrub: .6, invalidateOnRefresh: true,
    onUpdate: s => cta.classList.toggle('cta-hit', s.progress > .93) } });
  tl.to('#heroP', { rotate: -11, scale: .84, xPercent: -18, yPercent: 6, ease: 'none', duration: 1 }, 0)       // the paddle swings
    .to('.plane-glow', { xPercent: -30, yPercent: 20, ease: 'none', duration: 1 }, 0)
    .to('.plane-court', { scaleY: 1.18, ease: 'none', duration: 1 }, 0)
    .to('.hero-copy', { yPercent: -5, ease: 'none', duration: 1 }, 0)
    .fromTo(ball, { opacity: 0, scale: .5, x: () => at($('#heroP'), .64, .22)[0], y: () => at($('#heroP'), .64, .22)[1] },
      { opacity: 1, scale: 1.3, x: () => (at($('#heroP'), .64, .22)[0] + at(cta, .5, .5)[0]) / 2, y: () => Math.min(at($('#heroP'), .64, .22)[1], at(cta, .5, .5)[1]) - innerHeight * .18, ease: 'power1.out', duration: .3 }, .35)
    .to(ball, { scale: 1, x: () => at(cta, .82, .5)[0], y: () => at(cta, .82, .5)[1], ease: 'power1.in', duration: .3 }, .65);
  gsap.utils.toArray('.reveal').forEach(el => gsap.from(el, { opacity: 0, y: 34, duration: .8, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 88%' } }));
  gsap.utils.toArray('.founder .frame').forEach((el, i) => gsap.fromTo(el, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 1, delay: i * .08, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%' } }));
}

// ---------- boot ----------
renderHome(); renderBooker(); renderMatches(); renderMyBookings(); renderWifi('#wifiPortal'); renderWifi('#wifiPublic');
initMotion(); // deferred script: DOM is parsed and GSAP already loaded
