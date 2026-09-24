// Playhouse Pickle demo: public site + player portal. All data is local and simulated.
const $ = s => document.querySelector(s);
const S = { user: null, admin: false, pay: null, sel: { day: 0, court: 0, hours: [] }, taken: new Set() };
const DAY = 864e5, NOW = Date.now();

// Owner-editable settings (console > Configuration).
// ponytail: saved per browser in this demo; the real build keeps them in the database so every visitor sees them.
const PRICES = { court: 300, open: 250, unlock: 99, w1: 49, w2: 99, w3: 299 };
const HOURS = { open: 6, close: 23, playFrom: 13, playTo: 21 };
const PRICE_DEFAULT = { ...PRICES }, HOURS_DEFAULT = { ...HOURS }, SITE = {}, CFG_DEFAULT = {};
try { const c = JSON.parse(localStorage.getItem('pp-config') || '{}'); Object.assign(PRICES, c.prices); Object.assign(HOURS, c.hours); Object.assign(SITE, c.site); } catch (e) {}
function saveConfig() { try { localStorage.setItem('pp-config', JSON.stringify({ prices: PRICES, hours: HOURS, site: SITE })); } catch (e) {} }
const openHours = () => [...Array(Math.max(0, HOURS.close - HOURS.open))].map((_, i) => i + HOURS.open);
function applyConfig() { // defaults are read from the page itself the first time
  document.querySelectorAll('[data-cfg]').forEach(el => { const k = el.dataset.cfg; if (!(k in CFG_DEFAULT)) CFG_DEFAULT[k] = el.textContent; el.textContent = SITE[k] ?? CFG_DEFAULT[k]; });
  document.querySelectorAll('[data-cfg-href]').forEach(el => { const k = el.dataset.cfgHref; if (!(k in CFG_DEFAULT)) CFG_DEFAULT[k] = el.getAttribute('href'); el.setAttribute('href', SITE[k] ?? CFG_DEFAULT[k]); });
  document.querySelectorAll('[data-price]').forEach(el => { el.textContent = peso(PRICES[el.dataset.price]); });
}
function refreshSite() { renderBooker(); renderMatches(); renderWifi('#wifiPortal'); renderWifi('#wifiPublic'); renderAchievements(); applyConfig(); }
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
const WIFI = [{ n: '1 Hour', k: 'w1', note: 'Quick session' }, { n: '1 Day', k: 'w2', note: 'All-day access' }, { n: '1 Week', k: 'w3', note: 'Best value' }];
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
function hourLabel(h) { const s = h % 24 < 12 ? 'AM' : 'PM', x = h % 12 || 12; return x + ':00 ' + s; }
function hourRanges(hrs) { // [8,9,10,14] -> "8:00 AM to 11:00 AM, 2:00 PM to 3:00 PM"
  const out = []; hrs.forEach(h => { const r = out[out.length - 1]; if (r && r[1] === h) r[1] = h + 1; else out.push([h, h + 1]); });
  return out.map(([a, b]) => hourLabel(a) + ' to ' + hourLabel(b)).join(', ');
}
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
function isBooked(d, c, h) { return S.taken.has(d + '-' + c + '-' + h) || (d ? (d * 7 + c * 13 + h * 5) % 9 < 3 : typeof DB !== 'undefined' && !!DB.schedule[c + '-' + h]); }   // today = console schedule; later days = demo pattern
function isOpenPlay(c, h) { return c === 2 && h >= HOURS.playFrom && h < HOURS.playTo; }
function renderBooker() {
  const days = [...Array(7)].map((_, i) => { const d = new Date(NOW + i * DAY); return i === 0 ? 'Today' : d.toLocaleDateString('en-PH', { weekday: 'short', day: 'numeric' }); });
  $('#dayChips').innerHTML = days.map((l, i) => `<button class="chip text-sm" aria-pressed="${i === S.sel.day}" onclick="S.sel.day=${i};S.sel.hours=[];renderBooker()">${l}</button>`).join('');
  $('#courtChips').innerHTML = [0, 1, 2].map(c => `<button class="chip flex-1 text-sm font-semibold" aria-pressed="${c === S.sel.court}" onclick="S.sel.court=${c};S.sel.hours=[];renderBooker()">Court ${c + 1}</button>`).join('');
  $('#slotGrid').innerHTML = openHours().map(h => {
    const d = S.sel.day, c = S.sel.court;
    if (isOpenPlay(c, h)) return `<div class="cell text-center text-muted" style="cursor:default">${hourLabel(h)}<br><span class="text-[10px] text-lime">Open play</span></div>`;
    if (isBooked(d, c, h)) return `<div class="cell text-center text-slate-600 line-through" style="cursor:default">${hourLabel(h)}</div>`;
    const on = S.sel.hours.includes(h);
    return `<button class="cell open text-center ${on ? 'booked' : ''}" aria-pressed="${on}" onclick="toggleHour(${h})"><span class="font-semibold">${hourLabel(h)}</span></button>`;
  }).join('');
  const b = $('#bookBtn'), hs = S.sel.hours, n = hs.length;
  S.sel.dayLabel = days[S.sel.day];
  b.disabled = !n; b.style.opacity = n ? 1 : .45;
  const nb = S.user && nextBadge('hours'), nudge = nb && n >= nb.need - PLAYER.hours ? ` · <span class="text-gold"><i class="fa-solid fa-medal"></i> unlocks ${bText(nb, 'name')}</span>` : '';
  $('#bookSummary').innerHTML = !n ? 'Tap one or more open hours.' : `<b>Court ${S.sel.court + 1}</b> · ${days[S.sel.day]} · ${hourRanges(hs)} · ${n} hour${n > 1 ? 's' : ''} × ${peso(PRICES.court)} = <b class="text-lime">${peso(n * PRICES.court)}</b>${nudge}`;
}
function toggleHour(h) { const hs = S.sel.hours, i = hs.indexOf(h); if (i < 0) hs.push(h); else hs.splice(i, 1); hs.sort((a, b) => a - b); renderBooker(); }
function startBooking() {
  const hs = S.sel.hours; if (!hs.length) return;
  S.pay = { kind: 'book', amt: hs.length * PRICES.court, day: S.sel.day, court: S.sel.court, hours: [...hs], label: `Court ${S.sel.court + 1} · ${S.sel.dayLabel}, ${hourRanges(hs)}` };
  $('#payTitle').textContent = 'Confirm booking'; $('#payDesc').textContent = `${S.pay.label}. ${hs.length} hour${hs.length > 1 ? 's' : ''} at ${peso(PRICES.court)} per hour, each recorded by Your Brand.`;
  $('#payAmt').textContent = peso(S.pay.amt); openDlg('dlgPay');
}

// ---------- payments (simulated) ----------
function pay(method) {
  const p = S.pay; closeDlgs(); if (!p) return;
  if (typeof DB !== 'undefined') DB.payments.unshift({ ref: 'PP' + String(Date.now()).slice(-6), what: p.label, method, amt: p.amt, st: 'Pending' });
  if (p.kind === 'book') {
    p.hours.forEach(h => { S.taken.add(p.day + '-' + p.court + '-' + h); if (p.day === 0 && typeof DB !== 'undefined') DB.schedule[p.court + '-' + h] = { who: S.user ? S.user.name : 'Online booking', st: 'Booked' }; });
    MY_BOOKINGS.unshift({ what: p.label.split(' · ')[0], when: p.label.split(' · ')[1], st: 'Upcoming' }); S.sel.hours = []; renderBooker(); renderMyBookings();
    toast('Booked via ' + method + (S.user ? '. See you on court' : '. Log in to earn badges for every hour'));
    if (S.user) addProgress({ hours: p.hours.length, matches: 1 });
  }
  if (p.kind === 'unlock') { const m = MATCHES.find(x => x.id === p.id); m.locked = false; renderMatches(); toast('Unlocked via ' + method + '. Yours to keep'); }
  if (p.kind === 'wifi') showQR('WiFi voucher ready', p.label + ' · connect at the venue', 'PLAYHOUSE-WIFI-' + Date.now());
}
const wifiName = i => SITE['WiFi · Plan ' + (i + 1) + ' name'] ?? WIFI[i].n;
function buyWifi(i) { const w = WIFI[i], n = wifiName(i); S.pay = { kind: 'wifi', amt: PRICES[w.k], label: n + ' WiFi pass' }; $('#payTitle').textContent = 'Buy ' + n + ' WiFi'; $('#payDesc').textContent = 'Voucher QR appears right after payment.'; $('#payAmt').textContent = peso(PRICES[w.k]); openDlg('dlgPay'); }
function unlock(id) { const m = MATCHES.find(x => x.id === id); S.pay = { kind: 'unlock', id, amt: PRICES.unlock, label: 'Keep ' + m.id + ' forever' }; $('#payTitle').textContent = 'Keep this match forever'; $('#payDesc').textContent = m.t + '. Full game plus ' + m.clips + ' highlight clips, no expiry, HD download.'; $('#payAmt').textContent = peso(PRICES.unlock); openDlg('dlgPay'); }

// ---------- portal ----------
function pTab(n) {
  document.querySelectorAll('[data-ptab]').forEach(b => b.setAttribute('aria-selected', b.dataset.ptab === n));
  ['matches', 'badges', 'bookings', 'wifi', 'profile'].forEach(t => $('#ptab-' + t).classList.toggle('hide', t !== n));
}
function renderMatches() {
  $('#matchList').innerHTML = MATCHES.map(m => `
    <article class="card overflow-hidden lift">
      <div class="thumb">${courtLines}<i class="fa-solid fa-circle-play text-5xl text-white/80 relative"></i>
        <span class="absolute top-3 left-3 badge b-mute num">${m.mins} min full game</span>
        <span class="absolute top-3 right-3 badge ${m.locked ? 'b-gold' : 'b-lime'} num" ${m.locked ? `data-exp="${m.exp}"` : ''}>${m.locked ? countdown(m.exp - Date.now()) : 'Kept forever'}</span></div>
      <div class="p-5">
        <h3 class="font-bold">${m.t}</h3>
        <p class="text-xs text-muted mt-1 num">${m.court} · ${m.date} · #${m.id} · <span class="text-lime">${m.clips} highlight clips</span></p>
        <div class="flex flex-wrap gap-2 mt-4">
          <button class="btn btn-ghost !py-2 !px-3 text-sm" onclick="showQR('Full game ${m.id}','Scan to watch on your phone','${location.origin}/?watch=game/${m.id}')"><i class="fa-solid fa-film"></i>Full game</button>
          <button class="btn btn-ghost !py-2 !px-3 text-sm" onclick="showQR('Highlights ${m.id}','${m.clips} clips, ready to post','${location.origin}/?watch=reel/${m.id}')"><i class="fa-solid fa-wand-magic-sparkles"></i>Highlights</button>
          ${m.locked ? `<button class="btn btn-lime !py-2 !px-3 text-sm ml-auto" onclick="unlock('${m.id}')">Keep forever ${peso(PRICES.unlock)}</button>`
                     : `<button class="btn btn-lime !py-2 !px-3 text-sm ml-auto" onclick="showQR('Download ${m.id}','HD download link','${location.origin}/?watch=dl/${m.id}')"><i class="fa-solid fa-download"></i>Download</button>`}
        </div>
      </div>
    </article>`).join('');
  $('#pClips').textContent = MATCHES.reduce((a, m) => a + m.clips, 0);
  $('#pExpiring').textContent = MATCHES.filter(m => m.locked && m.exp - Date.now() < 5 * DAY).length;
}
function renderMyBookings() { $('#myBookings').innerHTML = MY_BOOKINGS.map(b => `<div class="card p-4 flex justify-between items-center"><div><p class="font-bold">${b.what}</p><p class="text-xs text-muted">${b.when}</p></div><span class="badge ${b.st === 'Completed' ? 'b-mute' : 'b-lime'}">${b.st}</span></div>`).join(''); }
function renderWifi(el) { $(el).innerHTML = WIFI.map((w, i) => `<div class="card p-6 text-center lift relative">${i === 2 ? '<span class="absolute -top-3 left-1/2 -translate-x-1/2 badge b-gold bg-black">Best value</span>' : ''}<p class="font-bold text-lg" data-cfg="WiFi · Plan ${i + 1} name">${w.n}</p><p class="display text-4xl text-lime my-3 num">${peso(PRICES[w.k])}</p><p class="text-xs text-muted mb-5" data-cfg="WiFi · Plan ${i + 1} note">${w.note}</p><button class="btn btn-lime w-full justify-center" onclick="buyWifi(${i})">Buy pass</button></div>`).join(''); }
setInterval(() => document.querySelectorAll('[data-exp]').forEach(el => el.textContent = countdown(+el.dataset.exp - Date.now())), 1000);

// ---------- home sections ----------
function renderHome() {
  $('#ownerGrid').innerHTML = OWNERS.map((o, i) => `<figure class="founder reveal"><div class="frame"><img src="${o.img}" alt="${o.n}" loading="lazy" referrerpolicy="no-referrer" style="left:${o.crop[0]}%;top:${o.crop[1]}%;width:${o.crop[2]}%"></div><figcaption class="mt-4"><p class="font-bold text-lg" data-cfg="Owners · Owner ${i + 1} name">${o.n}</p><p class="text-xs text-lime font-semibold" data-cfg="Owners · Owner ${i + 1} full name">${o.real}</p><p class="text-xs text-muted mt-1" data-cfg="Owners · Owner ${i + 1} role">${o.line}</p></figcaption></figure>`).join('');
  const row = TAGS.map((t, i) => `<span class="${t.startsWith('#') || t.startsWith('@') ? '' : 'text-lime'}" data-cfg="Hashtags · Tag ${i + 1}">${t}</span>`).join('');
  $('#mq').innerHTML = row + row;
}

// ---------- achievements: milestones players share, rewards that bring them back ----------
// ponytail: tiers and rewards are proposals for the owners to confirm; names and rewards are editable in console > Configuration.
const PLAYER = { matches: 9, hours: 9, streak: 3 };   // demo player: one match and one court hour from the next badges
const UNITS = { matches: ['matches recorded', 'match recorded'], hours: ['hours on court', 'hour on court'], streak: ['weeks in a row', 'week in a row'] };
const BADGES = [
  { track: 'matches', need: 1, name: 'First Serve', reward: 'Your first highlight reel', fa: 'fa-table-tennis-paddle-ball' },
  { track: 'matches', need: 10, name: 'Kitchen Regular', reward: 'One free keep-forever unlock', fa: 'fa-fire' },
  { track: 'matches', need: 25, name: 'Dink Master', reward: 'Free 1-day WiFi pass', fa: 'fa-star' },
  { track: 'matches', need: 50, name: 'Third Shot Pro', reward: 'One free court hour', fa: 'fa-bolt' },
  { track: 'matches', need: 100, name: 'Playground Legend', reward: 'Name on the Legends wall', fa: 'fa-crown' },
  { track: 'hours', need: 1, name: 'Court Opener', reward: 'Member rates unlocked', fa: 'fa-calendar-check' },
  { track: 'hours', need: 10, name: 'Court Captain', reward: '10% off your next booking', fa: 'fa-medal' },
  { track: 'hours', need: 25, name: 'Home Court Hero', reward: 'One free court hour', fa: 'fa-trophy' },
  { track: 'hours', need: 50, name: 'Playhouse VIP', reward: 'Early access to prime slots', fa: 'fa-gem' },
  { track: 'streak', need: 3, name: 'On a Roll', reward: 'Free 1-hour WiFi', fa: 'fa-fire-flame-curved' },
  { track: 'streak', need: 8, name: 'Unstoppable', reward: 'Free open play session', fa: 'fa-rocket' }
];
const unit = (b, n = b.need) => UNITS[b.track][n === 1 ? 1 : 0];
const bKey = (b, f) => `Achievements · ${b.need} ${unit(b)} · ${f}`;
const bText = (b, f) => SITE[bKey(b, f)] ?? b[f];
const unlocked = b => PLAYER[b.track] >= b.need;
const nextBadge = track => BADGES.find(b => b.track === track && !unlocked(b));
function renderAchievements() {
  $('#pGames').textContent = PLAYER.matches; $('#pHours').textContent = PLAYER.hours + 'h';
  $('#achNext').innerHTML = ['matches', 'hours'].map(nextBadge).filter(Boolean).map(b => {
    const left = b.need - PLAYER[b.track], word = unit(b, left).split(' ')[0];
    return `<div class="card p-5 flex gap-4 items-start"><div class="medal-sm"><i class="fa-solid ${b.fa}"></i></div><div class="flex-1 min-w-0">
      <p class="text-xs text-muted">Next badge</p><p class="font-bold text-lg" data-cfg="${bKey(b, 'name')}">${b.name}</p>
      <div class="bar mt-3"><span style="width:${PLAYER[b.track] / b.need * 100}%"></span></div>
      <p class="text-sm mt-3"><b class="text-lime num">${left}</b> more ${word} to go · <span class="text-gold" data-cfg="${bKey(b, 'reward')}">${b.reward}</span></p>
      <button class="btn ${b.track === 'hours' ? 'btn-lime' : 'btn-ghost'} !py-2 text-sm mt-4" onclick="go('home','courts')"><i class="fa-solid fa-calendar-plus"></i>${b.track === 'hours' ? `Book ${left} hour${left > 1 ? 's' : ''}` : 'Book a recorded game'}</button></div></div>`;
  }).join('');
  $('#achGrid').innerHTML = BADGES.map((b, i) => { const on = unlocked(b); return `<article class="badge-card card p-5 ${on ? 'on' : ''}">
    <div class="medal"><i class="fa-solid ${b.fa}"></i></div><p class="font-bold mt-4" data-cfg="${bKey(b, 'name')}">${b.name}</p>
    <p class="text-xs text-muted num">${b.need} ${unit(b)}</p><p class="text-xs mt-2 text-gold" data-cfg="${bKey(b, 'reward')}">${b.reward}</p>
    ${on ? `<button class="btn btn-lime !py-1.5 !px-3 text-xs mt-4" onclick="openShare(${i})"><i class="fa-solid fa-share-nodes"></i>Share</button>`
         : `<div class="bar mt-4 w-full"><span style="width:${Math.min(100, PLAYER[b.track] / b.need * 100)}%"></span></div>`}</article>`; }).join('');
}
function addProgress(add) {
  const before = BADGES.filter(unlocked);
  for (const k in add) PLAYER[k] += add[k]; renderAchievements(); applyConfig();
  const fresh = BADGES.filter(b => unlocked(b) && !before.includes(b));
  if (fresh.length) setTimeout(() => openShare(BADGES.indexOf(fresh[fresh.length - 1]), true), 900);
}

// Share card: drawn on a canvas in the brand style, sized for a feed post (4:5) or a story (9:16).
let SH = { i: 0, fmt: 'post' };
const IMGS = {};
const loadImg = src => IMGS[src] || (IMGS[src] = new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; }));
function caption(b) {
  const n = b.need, name = bText(b, 'name'), site = location.host;
  const line = {
    matches: n === 1 ? 'First match on the record at @playhousepickleco 🏓 Every rally, caught on camera. Who wants the rematch?'
                     : `${n} matches recorded at @playhousepickleco and counting 🏓🔥 ${name} unlocked. See you on court.`,
    hours: n === 1 ? 'Booked my first court at @playhousepickleco 🏓 Your pickleball playground in Molino, Bacoor.'
                   : `${n} hours on court at @playhousepickleco ⏱️🏓 ${name} unlocked. Book yours at ${site}`,
    streak: `${n} weeks in a row at @playhousepickleco 🔥 ${name}. Tara, laro tayo!`
  }[b.track];
  return `${line}\n\n#${name.replace(/[^A-Za-z]/g, '')} #pickleball #playhousepickleballco #bacoorcavite #TeamPayaman`;
}
function openShare(i, fresh) {
  const b = BADGES[i]; SH.i = i;
  $('#shKicker').textContent = fresh ? 'Achievement unlocked!' : 'Share your milestone';
  $('#shTitle').textContent = `${bText(b, 'name')} · ${b.need} ${unit(b)}`;
  $('#shCaption').value = caption(b); shareFmt(SH.fmt); openDlg('dlgShare');
}
function shareFmt(f) { SH.fmt = f; document.querySelectorAll('[data-fmt]').forEach(el => el.setAttribute('aria-pressed', el.dataset.fmt === f)); SH.drawn = drawShare(); }
function fit(x, text, max, size, weight, fam) { do { x.font = `${weight} ${size}px ${fam}`; size -= 4; } while (x.measureText(text).width > max && size > 20); }
async function drawShare() {
  const b = BADGES[SH.i], story = SH.fmt === 'story', W = 1080, H = story ? 1920 : 1350, c = $('#shCanvas'), x = c.getContext('2d');
  await Promise.all(['800 100px Archivo', '600 40px Geist'].map(f => document.fonts.load(f))).catch(() => {});
  const [brand, pm] = await Promise.all([loadImg('img/brand.svg'), loadImg('img/p-mark.svg')]);
  c.width = W; c.height = H; x.textAlign = 'center';
  x.fillStyle = '#0B0B0D'; x.fillRect(0, 0, W, H);
  const g = x.createRadialGradient(W * .8, H * .15, 0, W * .8, H * .15, W); g.addColorStop(0, 'rgba(221,224,29,.30)'); g.addColorStop(1, 'rgba(221,224,29,0)');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.strokeStyle = 'rgba(221,224,29,.16)'; x.lineWidth = 3; x.beginPath();                          // court in perspective
  x.moveTo(W * .06, H); x.lineTo(W * .36, H * .66); x.lineTo(W * .64, H * .66); x.lineTo(W * .94, H); x.moveTo(W * .5, H * .66); x.lineTo(W * .5, H); x.stroke();
  if (pm) { const ph = H * .5; x.globalAlpha = .09; x.drawImage(pm, W - ph * .95, H - ph * .9, ph * 1.28, ph); x.globalAlpha = 1; }
  if (brand) x.drawImage(brand, 80, 80, 360, 360 * 221 / 700);
  const cy = H * (story ? .42 : .43), R = 240;
  x.fillStyle = '#DDE01D'; x.font = '600 36px Geist'; if ('letterSpacing' in x) x.letterSpacing = '8px';
  x.fillText('ACHIEVEMENT UNLOCKED', W / 2, cy - R - 64); if ('letterSpacing' in x) x.letterSpacing = '0px';
  x.beginPath(); x.arc(W / 2, cy, R, 0, Math.PI * 2); x.fillStyle = '#141418'; x.fill(); x.lineWidth = 14; x.strokeStyle = '#DDE01D'; x.stroke();
  x.beginPath(); x.arc(W / 2, cy, R - 30, 0, Math.PI * 2); x.lineWidth = 3; x.strokeStyle = 'rgba(221,224,29,.35)'; x.stroke();
  if ('fontStretch' in x) x.fontStretch = 'expanded';
  x.textBaseline = 'middle'; x.fillStyle = '#F3F4EE'; fit(x, String(b.need), R * 1.5, 230, 800, 'Archivo'); x.fillText(b.need, W / 2, cy - 22);
  x.fillStyle = '#DDE01D'; fit(x, unit(b).toUpperCase(), (R - 70) * 2, 38, 700, 'Geist'); x.fillText(unit(b).toUpperCase(), W / 2, cy + 112);
  x.textBaseline = 'alphabetic'; x.fillStyle = '#F3F4EE'; const title = bText(b, 'name').toUpperCase();
  fit(x, title, W - 160, 110, 800, 'Archivo'); x.fillText(title, W / 2, cy + R + 150);
  if ('fontStretch' in x) x.fontStretch = 'normal';
  x.fillStyle = '#B8B9B0'; x.font = '500 40px Geist';
  x.fillText(`${S.user ? S.user.name : 'Playhouse player'} · ${new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}`, W / 2, cy + R + 225);
  const perk = 'Reward: ' + bText(b, 'reward'), py = cy + R + (story ? 330 : 290);   // the perk is what makes friends book
  x.font = '600 34px Geist'; const pw = x.measureText(perk).width + 72;
  x.beginPath(); x.roundRect(W / 2 - pw / 2, py - 46, pw, 68, 34); x.fillStyle = 'rgba(221,224,29,.14)'; x.fill(); x.lineWidth = 2; x.strokeStyle = '#DDE01D'; x.stroke();
  x.fillStyle = '#DDE01D'; x.fillText(perk, W / 2, py);
  x.fillStyle = '#DDE01D'; x.font = '700 40px Geist'; x.fillText('Your pickleball playground', W / 2, H - 150);
  x.fillStyle = '#9A9BA2'; x.font = '500 32px Geist'; x.fillText('Molino, Bacoor · #playhousepickleballco', W / 2, H - 96);
}
const shareBlob = async () => { await SH.drawn; return new Promise(r => $('#shCanvas').toBlob(r, 'image/png')); };
async function shareNow() {
  const file = new File([await shareBlob()], 'playhouse-pickle-achievement.png', { type: 'image/png' }), text = $('#shCaption').value;
  if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], text }); return; } catch (e) { if (e.name === 'AbortError') return; } }
  await shareDownload(); shareCopy('Image saved and caption copied. Post it on Facebook, Instagram or TikTok.');
}
async function shareDownload() { const a = document.createElement('a'); a.href = URL.createObjectURL(await shareBlob()); a.download = 'playhouse-pickle-achievement.png'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1500); }
function shareCopy(msg) { const t = $('#shCaption').value; (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast(msg || 'Caption copied'), () => toast('Select the caption and copy it')); }

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
renderHome(); renderMyBookings(); refreshSite();
if (new URLSearchParams(location.search).has('watch')) setTimeout(() => toast('Demo link. In the live build this opens the match video on your phone.'), 600);
initMotion(); // deferred script: DOM is parsed and GSAP already loaded
