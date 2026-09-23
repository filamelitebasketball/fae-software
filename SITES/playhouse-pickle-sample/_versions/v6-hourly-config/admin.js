// Owner console: shortcut panel + main operations panel. Demo data, in-memory; Excel workbook = soft-copy backend.
const DB = {
  customers: [
    { n: 'Patricia Villanueva', c: 'patvilla@gmail.com', t: 'Player', last: 'Sep 22', spend: 4820, src: 'Booking' },
    { n: 'Marco Rivera', c: '+63 917 442 1908', t: 'Member', last: 'Sep 21', spend: 2650, src: 'Sign-up' },
    { n: 'Denise Ocampo', c: 'denise.ocampo@gmail.com', t: 'Lead', last: 'Sep 20', spend: 0, src: 'Kiosk guest' },
    { n: 'JR Bautista', c: '+63 928 771 3345', t: 'Player', last: 'Sep 20', spend: 6110, src: 'Booking' },
    { n: 'Kyla Mendoza', c: 'kyla.m@gmail.com', t: 'Lead', last: 'Sep 19', spend: 250, src: 'Open play' },
    { n: 'Aaron Salcedo', c: '+63 906 220 4471', t: 'Member', last: 'Sep 18', spend: 1980, src: 'Sign-up' },
    { n: 'Bianca Torres', c: 'bianca.torres@gmail.com', t: 'Lead', last: 'Sep 18', spend: 0, src: 'Kiosk guest' },
    { n: 'Miguel Ramos', c: '+63 915 883 2210', t: 'Player', last: 'Sep 17', spend: 5230, src: 'Booking' },
    { n: 'Carla Dizon', c: 'carla.dizon@yahoo.com', t: 'Lead', last: 'Sep 16', spend: 0, src: 'Kiosk guest' },
    { n: 'Paolo Lim', c: '+63 919 305 7782', t: 'Member', last: 'Sep 15', spend: 1450, src: 'Walk-in' }
  ],
  schedule: { '0-8': { who: 'Patricia V.', st: 'Paid' }, '1-9': { who: 'Walk-in', st: 'Booked' }, '0-10': { who: 'JR Bautista', st: 'Checked-in' }, '1-16': { who: 'Aaron S.', st: 'Paid' }, '0-18': { who: 'Miguel R.', st: 'Booked' }, '1-19': { who: 'Barkada DUPR', st: 'Paid' } },
  roster: ['Kyla Mendoza', 'Paolo Lim', 'Denise Ocampo', 'Rafa Cruz', 'Joy Santos', 'Enzo Tan', 'Mae Reyes', 'Luis Ong'],
  sessions: [
    { id: 'PC-1052', court: 'Court 1', who: 'kyla.m@gmail.com', start: '07:02', mins: 58, clips: 12, st: 'Delivered' },
    { id: 'PC-1051', court: 'Court 2', who: '+63 917 442 1908', start: '08:15', mins: 61, clips: 0, st: 'Processing' },
    { id: 'PC-1050', court: 'Court 1', who: 'bianca.torres@gmail.com', start: '06:10', mins: 44, clips: 9, st: 'Unlocked' }
  ],
  payments: [
    { ref: 'PP401882', what: 'Court 1 · 8:00 AM', method: 'GCash', amt: 300, st: 'Verified' },
    { ref: 'PP401890', what: 'Court 2 · 9:00 AM', method: 'Maya', amt: 300, st: 'Pending' },
    { ref: 'PP401903', what: 'Keep PC-1050 forever', method: 'GCash', amt: 99, st: 'Verified' },
    { ref: 'PP401911', what: 'Open play · 1PM block', method: 'Cash', amt: 250, st: 'Pending' }
  ],
  vouchers: [{ code: 'PH-WF-3381', plan: '1 Day', who: 'Walk-in', st: 'Active' }, { code: 'PH-WF-3375', plan: '1 Hour', who: 'Kyla M.', st: 'Used' }],
  sent: [{ name: 'Open play tonight', aud: 214, when: 'Yesterday 3:10 PM' }],
  prices: PRICES, // shared with the public site (app.js)
  staff: [{ n: 'jhoopin3@gmail.com', role: 'Owner (admin)' }, { n: 'filamelitebasketball', role: 'Owner (admin)' }, { n: 'Front desk 1', role: 'Staff' }, { n: 'Court marshal', role: 'Staff' }]
};
const SECTIONS = [['overview', 'Overview', 'fa-gauge-high'], ['schedule', 'Schedule', 'fa-calendar-days'], ['customers', 'Customers', 'fa-users'], ['picklecam', 'Your Brand', 'fa-video'], ['payments', 'Payments', 'fa-peso-sign'], ['wifi', 'WiFi', 'fa-wifi'], ['data', 'Data & platform', 'fa-database'], ['marketing', 'Marketing', 'fa-paper-plane'], ['settings', 'Configuration', 'fa-sliders']];
const SHORTCUTS = [['New booking', 'fa-calendar-plus', 'scBooking()'], ['Check in', 'fa-user-check', 'scCheckin()'], ['Start Your Brand', 'fa-circle-dot', 'scCam()'], ['Sell WiFi', 'fa-wifi', 'scWifi()'], ['Verify payments', 'fa-circle-check', 'scPayments()'], ['Send campaign', 'fa-paper-plane', 'scCampaign()'], ['Open play roster', 'fa-people-group', 'scRoster()'], ['Export to Excel', 'fa-file-excel', 'exportXLSX()']];
let SEC = 'overview';
const OWNER_LOGINS = ['jhoopin3', 'filamelitebasketball']; // demo gate: client-side only, real auth comes with Supabase
function custRows() {
  const q = (VIEWS.q || '').toLowerCase(), f = VIEWS.f || 'All';
  const rows = DB.customers.filter(c => (f === 'All' || c.t === f) && (c.n + c.c).toLowerCase().includes(q));
  return rows.map(c => `<tr><td class="font-semibold">${c.n}</td><td class="text-muted num">${c.c}</td><td>${badge(c.t)}</td><td class="text-muted text-xs">${c.src || ''}</td><td class="text-muted num">${c.last}</td><td class="text-right num">${peso(c.spend)}</td><td class="text-right">${c.t !== 'Player' ? `<button class="text-xs text-lime hover:underline" onclick="promote('${c.c}')">Promote</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="7" class="text-muted">No matches.</td></tr>';
}
const STAGE = { Lead: 'b-mute', Member: 'b-gold', Player: 'b-lime' };
const STB = { Paid: 'b-lime', Booked: 'b-gold', 'Checked-in': 'b-sky', Verified: 'b-lime', Pending: 'b-gold', Delivered: 'b-lime', Unlocked: 'b-sky', Processing: 'b-gold', Recording: 'b-red', Active: 'b-lime', Used: 'b-mute' };
const badge = s => `<span class="badge ${STB[s] || STAGE[s] || 'b-mute'}">${s}</span>`;

// ---------- access ----------
function openAdmin() { $('#oErr').classList.add('hide'); openDlg('dlgOwner'); }
function ownerLogin() {
  const raw = ($('#oUser').value || '').trim().toLowerCase(), u = raw.replace('@gmail.com', '');
  if (!OWNER_LOGINS.includes(u)) return $('#oErr').classList.remove('hide');
  S.admin = true; S.adminUser = raw.includes('@') ? raw : u + '@gmail.com'; closeDlgs(); toast('Owner console unlocked'); go('admin');
}
function exitAdmin() { S.admin = false; go('home'); toast('Signed out of the console'); }

// ---------- layout ----------
function renderAdmin() {
  $('#screen-admin').innerHTML = `
  <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
    <div class="flex items-center gap-3"><img src="img/p-mark.svg" alt="" class="h-11"><div><h1 class="font-bold text-2xl leading-none">Owner console</h1><p class="text-xs text-muted mt-1">Playhouse Pickle · signed in as <span class="text-lime font-semibold">${S.adminUser}</span></p></div></div>
    <div class="flex gap-2"><span class="badge b-mute self-center hidden sm:inline">Shortcut keys 1 to 8</span><button class="btn btn-ghost !py-2 text-sm" onclick="exitAdmin()"><i class="fa-solid fa-arrow-right-from-bracket"></i>Exit</button></div>
  </div>
  <section aria-label="Shortcut panel" class="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3 mb-8">
    ${SHORTCUTS.map((s, i) => `<button class="shortcut" onclick="${s[2]}"><i class="fa-solid ${s[1]}"></i><span class="font-semibold text-sm">${s[0]}</span><span class="text-[10px] text-muted num">Key ${i + 1}</span></button>`).join('')}
  </section>
  <div class="grid lg:grid-cols-[220px_1fr] gap-6">
    <nav aria-label="Main panel" class="flex lg:flex-col gap-1 overflow-x-auto lg:sticky lg:top-24 self-start">
      ${SECTIONS.map(s => `<button class="nav-item" data-sec="${s[0]}" ${s[0] === SEC ? 'aria-current="page"' : ''} onclick="SEC='${s[0]}';renderAdmin()"><i class="fa-solid ${s[2]} w-4"></i>${s[1]}</button>`).join('')}
    </nav>
    <div id="secBody" class="min-w-0">${VIEWS[SEC]()}</div>
  </div>`;
}

// ---------- main panel views ----------
const kpi = (v, l, sub, cls = '') => `<div class="card p-5"><p class="display text-3xl num ${cls}">${v}</p><p class="text-xs text-muted mt-2">${l}</p>${sub ? `<p class="text-[11px] text-lime mt-1">${sub}</p>` : ''}</div>`;
const panel = (title, body, action = '') => `<section class="card p-5 md:p-6"><div class="flex flex-wrap items-center justify-between gap-3 mb-4"><h2 class="font-bold text-lg">${title}</h2>${action}</div>${body}</section>`;

const VIEWS = {
  overview() {
    const pend = DB.payments.filter(p => p.st === 'Pending').length, proc = DB.sessions.filter(s => s.st !== 'Delivered' && s.st !== 'Unlocked').length;
    const booked = Object.keys(DB.schedule).length, leads = DB.customers.filter(c => c.t === 'Lead').length;
    const rev = [98, 120, 142, 131, 168, 182], max = Math.max(...rev);
    return `<div class="grid gap-5">
      <div class="grid grid-cols-2 xl:grid-cols-4 gap-4">${kpi((1274 + DB.customers.length).toLocaleString(), 'Customers in your database', '+142 this month')}${kpi(peso(182400), 'Revenue this month', '+8.4% vs August')}${kpi(booked + 17, 'Bookings today', `3 courts, ${hourLabel(HOURS.open)} to ${hourLabel(HOURS.close)}`)}${kpi('38.6%', 'Footage keep rate', 'grace-period conversions', 'text-gold')}</div>
      ${panel('Needs attention', `<ul class="space-y-2 text-sm">
        <li class="flex flex-wrap justify-between gap-3 items-center card p-3"><span><b class="text-gold">4 highlight packs</b> expire within 48 hours.</span><button class="btn btn-lime !py-1.5 !px-3 text-xs" onclick="sendCampaign(0)">Send reminder</button></li>
        <li class="flex flex-wrap justify-between gap-3 items-center card p-3"><span><b class="text-gold">${pend} payments</b> waiting for verification.</span><button class="btn btn-ghost !py-1.5 !px-3 text-xs" onclick="scPayments()">Verify</button></li>
        <li class="flex flex-wrap justify-between gap-3 items-center card p-3"><span><b>${proc} Your Brand sessions</b> still recording or processing.</span><button class="btn btn-ghost !py-1.5 !px-3 text-xs" onclick="SEC='picklecam';renderAdmin()">Open queue</button></li>
        <li class="flex flex-wrap justify-between gap-3 items-center card p-3"><span><b>${leads} new leads</b> have not been invited to membership.</span><button class="btn btn-ghost !py-1.5 !px-3 text-xs" onclick="sendCampaign(2)">Invite</button></li>
      </ul>`)}
      <div class="grid xl:grid-cols-2 gap-5">
        ${panel('Revenue · last 6 months', `<div class="flex items-end gap-3 h-40">${rev.map((v, i) => `<div class="flex-1 flex flex-col items-center justify-end h-full gap-2"><div class="w-full rounded-t-lg ${i === 5 ? 'bg-lime' : 'bg-lime/40'}" style="height:${Math.round(v / max * 100)}%"></div><span class="text-[11px] text-muted">${['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'][i]}</span></div>`).join('')}</div><p class="text-[11px] text-muted mt-3">₱ thousands · demo figures</p>`)}
        ${panel('Soft copy backend', `<p class="text-sm">Every table exports to one Excel workbook: <b class="num">${Object.keys(tables()).length}</b> sheets, ready for backup or for their current platform.</p><div class="flex flex-wrap gap-2 mt-4"><button class="btn btn-lime !py-2 text-sm" onclick="exportXLSX()"><i class="fa-solid fa-file-excel"></i>Export Excel</button><button class="btn btn-ghost !py-2 text-sm" onclick="SEC='data';renderAdmin()">Data & platform</button></div>`)}
      </div></div>`;
  },
  schedule() {
    const hrs = openHours();
    const cell = (c, h) => {
      if (isOpenPlay(c, h)) return `<div class="cell" style="cursor:default"><span class="text-lime">Open play</span></div>`;
      const b = DB.schedule[c + '-' + h];
      return b ? `<button class="cell ${b.st === 'Checked-in' ? 'in' : 'booked'}" onclick="cycleSlot(${c},${h})"><b>${b.who}</b><br>${badge(b.st)}</button>`
               : `<button class="cell open text-muted" onclick="scBooking(${c},${h})">Open</button>`;
    };
    return panel('Today · court schedule', `<div class="overflow-x-auto"><div class="grid-sched min-w-[520px]"><div></div>${[1, 2, 3].map(c => `<div class="text-xs font-semibold text-muted px-1">Court ${c}</div>`).join('')}${hrs.map(h => `<div class="text-xs text-muted pt-2 num">${hourLabel(h)}</div>${[0, 1, 2].map(c => cell(c, h)).join('')}`).join('')}</div></div><p class="text-xs text-muted mt-4">Tap an open hour to book it. Tap a booking to move it from Booked to Paid to Checked-in.</p>`, `<button class="btn btn-lime !py-2 text-sm" onclick="scBooking()"><i class="fa-solid fa-plus"></i>New booking</button>`);
  },
  customers() {
    const f = VIEWS.f || 'All';
    const count = t => DB.customers.filter(c => c.t === t).length;
    return `<div class="grid gap-5"><div class="grid grid-cols-3 gap-4">${kpi(count('Lead'), 'Leads', 'kiosk and sign-ups')}${kpi(count('Member'), 'Members', 'account holders', 'text-gold')}${kpi(count('Player'), 'Players', 'regulars')}</div>
    ${panel('Customer database', `<div class="flex flex-wrap gap-2 mb-4"><input style="max-width:260px" placeholder="Search name, email, mobile" aria-label="Search customers" value="${VIEWS.q || ''}" oninput="VIEWS.q=this.value;$('#custRows').innerHTML=custRows()">${['All', 'Lead', 'Member', 'Player'].map(t => `<button class="chip text-sm" aria-pressed="${t === f}" onclick="VIEWS.f='${t}';renderAdmin()">${t}</button>`).join('')}</div>
      <div class="overflow-x-auto"><table class="min-w-[640px]"><thead><tr><th>Name</th><th>Contact</th><th>Stage</th><th>Source</th><th>Last visit</th><th class="text-right">Spend</th><th></th></tr></thead><tbody id="custRows">${custRows()}</tbody></table></div>`, `<div class="flex gap-2"><button class="btn btn-ghost !py-2 text-sm" onclick="scCampaign()"><i class="fa-solid fa-paper-plane"></i>Email</button><button class="btn btn-lime !py-2 text-sm" onclick="exportXLSX()"><i class="fa-solid fa-file-excel"></i>Export Excel</button></div>`)}</div>`;
  },
  picklecam() {
    const clips = DB.sessions.reduce((a, s) => a + s.clips, 0);
    return `<div class="grid gap-5"><div class="grid grid-cols-2 xl:grid-cols-4 gap-4">${kpi(DB.sessions.length, 'Sessions today')}${kpi(clips, 'Highlight clips generated')}${kpi('3m 40s', 'Avg. stop to highlights')}${kpi(DB.sessions.filter(s => s.st === 'Unlocked').length, 'Kept forever today', '', 'text-gold')}</div>
    ${panel('Recording queue', `<div class="overflow-x-auto"><table class="min-w-[620px]"><thead><tr><th>Session</th><th>Court</th><th>Delivered to</th><th>Start</th><th>Full game</th><th>Highlights</th><th>Status</th><th></th></tr></thead><tbody>
      ${DB.sessions.map(s => `<tr><td class="font-semibold num">#${s.id}</td><td>${s.court}</td><td class="text-muted num">${s.who}</td><td class="num">${s.start}</td><td class="num">${s.mins ? s.mins + ' min' : 'live'}</td><td class="num">${s.clips || '...'}</td><td>${badge(s.st)}</td><td class="text-right">${s.st === 'Delivered' || s.st === 'Unlocked' ? `<button class="text-xs text-lime hover:underline" onclick="toast('Link re-sent to ${s.who}')">Resend</button>` : ''}</td></tr>`).join('')}
    </tbody></table></div>`, `<button class="btn btn-lime !py-2 text-sm" onclick="scCam()"><i class="fa-solid fa-circle-dot"></i>Start session</button>`)}</div>`;
  },
  payments() {
    const sum = m => DB.payments.filter(p => p.method === m && p.st === 'Verified').reduce((a, p) => a + p.amt, 0);
    return `<div class="grid gap-5"><div class="grid grid-cols-3 gap-4">${kpi(peso(sum('GCash')), 'GCash verified')}${kpi(peso(sum('Maya')), 'Maya verified')}${kpi(peso(sum('Cash')), 'Cash verified')}</div>
    ${panel('Payment ledger', `<div class="overflow-x-auto"><table class="min-w-[560px]"><thead><tr><th>Ref</th><th>For</th><th>Method</th><th class="text-right">Amount</th><th>Status</th><th></th></tr></thead><tbody>
      ${DB.payments.map((p, i) => `<tr><td class="num">${p.ref}</td><td>${p.what}</td><td>${p.method}</td><td class="text-right num">${peso(p.amt)}</td><td>${badge(p.st)}</td><td class="text-right">${p.st === 'Pending' ? `<button class="text-xs text-lime hover:underline" onclick="verifyPay(${i})">Verify</button>` : ''}</td></tr>`).join('')}
    </tbody></table></div>`)}</div>`;
  },
  wifi() {
    return `<div class="grid gap-5">${panel('Sell a voucher', `<div class="grid sm:grid-cols-3 gap-3">${[['1 Hour', DB.prices.w1], ['1 Day', DB.prices.w2], ['1 Week', DB.prices.w3]].map(w => `<button class="card p-4 text-left hover:border-lime" onclick="issueVoucher('${w[0]}')"><p class="font-bold">${w[0]}</p><p class="display text-2xl text-lime num mt-1">${peso(w[1])}</p></button>`).join('')}</div>`)}
    ${panel('Issued vouchers', `<table><thead><tr><th>Code</th><th>Plan</th><th>For</th><th>Status</th></tr></thead><tbody>${DB.vouchers.map(v => `<tr><td class="num font-semibold">${v.code}</td><td>${v.plan}</td><td>${v.who}</td><td>${badge(v.st)}</td></tr>`).join('')}</tbody></table>`)}</div>`;
  },
  data() {
    const t = tables(), cfg = PLATFORM.cfg;
    return `<div class="grid gap-5">
    ${panel('Excel soft copy', `<p class="text-sm text-muted mb-4">Every table in one workbook, one sheet each. Open it in Excel or Google Sheets, edit, and import it back. It is also the hand-off file for any other system.</p>
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">${Object.entries(t).map(([n, r]) => `<div class="card p-3"><p class="font-semibold text-sm">${n}</p><p class="text-xs text-muted num">${r.length} rows</p></div>`).join('')}</div>`,
      `<div class="flex gap-2"><label class="btn btn-ghost !py-2 text-sm cursor-pointer" style="margin:0;color:inherit;font-size:14px"><i class="fa-solid fa-file-import"></i>Import<input type="file" accept=".xlsx,.xls" class="hide" onchange="importXLSX(this.files[0])"></label><button class="btn btn-lime !py-2 text-sm" onclick="exportXLSX()"><i class="fa-solid fa-file-excel"></i>Export Excel</button></div>`)}
    ${panel('Connect their platform', `<p class="text-sm text-muted mb-4">Already on a membership or booking system? Paste its API link and the console syncs with it, using the same sheets as the Excel file. No API? Use Excel export and import.</p>
      <div class="grid sm:grid-cols-2 gap-4"><div><label for="plName">Platform</label><input id="plName" placeholder="e.g. their gym membership app" value="${cfg.name || ''}"></div><div><label for="plUrl">API link (https)</label><input id="plUrl" type="url" placeholder="https://..." value="${cfg.url || ''}"></div></div>
      <p class="text-xs text-muted mt-3">Status: ${cfg.url ? `linked to <b class="text-lime">${cfg.name || cfg.url}</b>` : 'not linked · the Excel soft copy is the backend'}</p>`,
      `<div class="flex gap-2"><button class="btn btn-ghost !py-2 text-sm" onclick="syncPlatform('pull')"><i class="fa-solid fa-cloud-arrow-down"></i>Pull</button><button class="btn btn-lime !py-2 text-sm" onclick="syncPlatform('push')"><i class="fa-solid fa-cloud-arrow-up"></i>Push</button></div>`)}</div>`;
  },
  marketing() {
    return `<div class="grid gap-5">${panel('Campaigns', `<div class="grid md:grid-cols-2 gap-3">${CAMPAIGNS.map((c, i) => `<div class="card p-4"><p class="font-bold">${c.n}</p><p class="text-xs text-muted mt-1">${c.d}</p><div class="flex justify-between items-center mt-4"><span class="text-xs num">${c.aud()} recipients</span><button class="btn btn-lime !py-1.5 !px-3 text-xs" onclick="sendCampaign(${i})">Send</button></div></div>`).join('')}</div>`)}
    ${panel('Sent', `<ul class="text-sm space-y-2">${DB.sent.map(s => `<li class="flex justify-between"><span>${s.name}</span><span class="text-muted num">${s.aud} · ${s.when}</span></li>`).join('')}</ul>`)}</div>`;
  },
  settings() { // Configuration: everything on the public page, live
    const f = (k, l) => `<div><label>${l}</label><input class="num" type="number" min="0" value="${PRICES[k]}" onchange="setPrice('${k}', this.value)"></div>`;
    const hr = (k, l) => `<div><label>${l}</label><select onchange="setHour('${k}', this.value)">${[...Array(25)].map((_, x) => `<option value="${x}" ${HOURS[k] === x ? 'selected' : ''}>${x === 24 ? '12:00 AM (midnight)' : hourLabel(x)}</option>`).join('')}</select></div>`;
    const groups = {};
    Object.keys(CFG_DEFAULT).forEach(k => { const [g, ...rest] = k.split(' · '); (groups[g] = groups[g] || []).push([k, rest.join(' · ')]); });
    const field = ([k, l]) => { const v = esc(SITE[k] ?? CFG_DEFAULT[k]); return `<div><label>${l}${SITE[k] != null ? ' <span class="text-lime">· edited</span>' : ''}</label>${v.length > 70 ? `<textarea rows="3" data-key="${k}" oninput="setText(this)">${v}</textarea>` : `<input data-key="${k}" value="${v}" oninput="setText(this)">`}</div>`; };
    return `<div class="grid gap-5">
    ${panel('Pricing', `<div class="grid sm:grid-cols-3 gap-4">${f('court', 'Court rental per hour (₱)')}${f('open', 'Open play per person (₱)')}${f('unlock', 'Keep a match forever (₱)')}${f('w1', 'WiFi 1 hour (₱)')}${f('w2', 'WiFi 1 day (₱)')}${f('w3', 'WiFi 1 week (₱)')}</div>`, `<span class="text-xs text-muted">Changes show on the site right away</span>`)}
    ${panel('Hours', `<div class="grid grid-cols-2 sm:grid-cols-4 gap-4">${hr('open', 'Courts open')}${hr('close', 'Courts close')}${hr('playFrom', 'Open play starts')}${hr('playTo', 'Open play ends')}</div><p class="text-xs text-muted mt-3">Hourly booking slots on the site and the schedule follow these hours. Open play runs on Court 3.</p>`)}
    ${panel('Page content', `<p class="text-sm text-muted mb-4">Every text and link on the public page, by section. Type to change it on the site.</p>${Object.entries(groups).map(([g, items]) => `<details class="card p-4 mb-3"><summary class="font-semibold cursor-pointer">${g} <span class="text-xs text-muted font-normal">${items.length} fields</span></summary><div class="grid gap-3 mt-4">${items.map(field).join('')}</div></details>`).join('')}`,
      `<div class="flex gap-2"><button class="btn btn-ghost !py-2 text-sm" onclick="resetConfig()">Reset to original</button><button class="btn btn-lime !py-2 text-sm" onclick="go('home')"><i class="fa-solid fa-eye"></i>View site</button></div>`)}
    ${panel('Staff and access', `<table><thead><tr><th>Account</th><th>Role</th></tr></thead><tbody>${DB.staff.map(s => `<tr><td class="font-semibold">${s.n}</td><td>${s.role}</td></tr>`).join('')}</tbody></table>`)}</div>`;
  }
};
const esc = v => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
function setPrice(k, v) { PRICES[k] = Math.max(0, Math.round(+v) || 0); saveConfig(); refreshSite(); toast('Price updated on the site'); }
function setHour(k, v) {
  const next = { ...HOURS, [k]: +v };
  if (next.open >= next.close || next.playFrom >= next.playTo) { toast('Start must be before end'); return renderAdmin(); }
  Object.assign(HOURS, next); saveConfig(); refreshSite(); toast('Hours updated'); renderAdmin();
}
function setText(el) { const k = el.dataset.key; if (el.value === CFG_DEFAULT[k]) delete SITE[k]; else SITE[k] = el.value; saveConfig(); applyConfig(); }
function resetConfig() {
  if (!confirm('Reset all prices, hours and page text to the original?')) return;
  Object.assign(PRICES, PRICE_DEFAULT); Object.assign(HOURS, HOURS_DEFAULT); Object.keys(SITE).forEach(k => delete SITE[k]);
  saveConfig(); refreshSite(); renderAdmin(); toast('Back to the original');
}
const CAMPAIGNS = [
  { n: 'Your highlights expire soon', d: 'Grace-period reminder with a one-tap ₱99 keep-forever link.', aud: () => 4 + DB.customers.filter(c => c.t === 'Lead').length },
  { n: 'Open play tonight', d: '5PM to 9PM block, ₱250, first come first served.', aud: () => 210 + DB.customers.length },
  { n: 'Become a member', d: 'Invite leads to a free account and member rates.', aud: () => DB.customers.filter(c => c.t === 'Lead').length },
  { n: 'Tournament sponsors wanted', d: 'Call for 2027 Playhouse Pickle Tournament partners.', aud: () => 38 }
];

// ---------- actions ----------
function drawer(html) { $('#drawerBody').innerHTML = `<button class="x" style="position:absolute;right:16px;top:12px;background:none;border:0;color:#9A9BA2;font-size:24px;cursor:pointer" onclick="closeDlgs()" aria-label="Close">&times;</button>` + html; openDlg('dlgDrawer'); }
function scBooking(c, h) {
  drawer(`<h2 class="font-bold text-xl mb-5">New booking</h2><div class="space-y-4">
    <div><label for="bN">Player name</label><input id="bN" placeholder="Juan dela Cruz"></div>
    <div><label for="bC">Email or mobile</label><input id="bC" placeholder="juan@gmail.com or 0917..."></div>
    <div class="grid grid-cols-3 gap-3"><div><label for="bCt">Court</label><select id="bCt">${[0, 1, 2].map(i => `<option value="${i}" ${i === c ? 'selected' : ''}>Court ${i + 1}</option>`).join('')}</select></div>
    <div><label for="bH">Start</label><select id="bH">${openHours().map(x => `<option value="${x}" ${x === h ? 'selected' : ''}>${hourLabel(x)}</option>`).join('')}</select></div>
    <div><label for="bD">Hours</label><select id="bD">${[1, 2, 3, 4].map(n => `<option>${n}</option>`).join('')}</select></div></div>
    <div><label for="bM">Payment</label><select id="bM"><option>GCash</option><option>Maya</option><option>Cash</option><option>Pay later</option></select></div>
    <p id="bErr" class="hide text-sm text-red-300"></p>
    <button class="btn btn-lime w-full justify-center" onclick="saveBooking()">Save booking</button></div>`);
}
function saveBooking() {
  const n = $('#bN').value.trim(), c = +$('#bCt').value, h = +$('#bH').value, len = +$('#bD').value, m = $('#bM').value, contact = $('#bC').value.trim(), err = $('#bErr');
  const hrs = [...Array(len)].map((_, i) => h + i), fail = t => { err.textContent = t; err.classList.remove('hide'); };
  if (!n) return fail('Enter the player name.');
  if (h + len > HOURS.close) return fail('That runs past closing time.');
  if (hrs.some(x => isOpenPlay(c, x))) return fail('Court 3 is reserved for open play in those hours.');
  if (hrs.some(x => DB.schedule[c + '-' + x])) return fail('One of those hours is already booked.');
  hrs.forEach(x => { DB.schedule[c + '-' + x] = { who: n, st: m === 'Pay later' ? 'Booked' : 'Paid' }; });
  if (m !== 'Pay later') DB.payments.unshift({ ref: 'PP' + String(Date.now()).slice(-6), what: `Court ${c + 1} · ${hourRanges(hrs)}`, method: m, amt: PRICES.court * len, st: m === 'Cash' ? 'Verified' : 'Pending' });
  if (contact && !DB.customers.some(x => x.c === contact)) DB.customers.unshift({ n, c: contact, t: 'Lead', last: 'Today', spend: 0, src: 'Walk-in' });
  closeDlgs(); toast(`Court ${c + 1}, ${hourRanges(hrs)} booked for ${n}`); SEC = 'schedule'; renderAdmin();
}
function cycleSlot(c, h) { const b = DB.schedule[c + '-' + h], order = ['Booked', 'Paid', 'Checked-in']; b.st = order[(order.indexOf(b.st) + 1) % 3]; toast(b.who + ': ' + b.st); renderAdmin(); }
function scCheckin() {
  const due = Object.entries(DB.schedule).filter(([, b]) => b.st !== 'Checked-in');
  drawer(`<h2 class="font-bold text-xl mb-5">Check in</h2>${due.length ? due.map(([k, b]) => { const [c, h] = k.split('-').map(Number); return `<div class="card p-4 mb-3 flex justify-between items-center"><div><p class="font-semibold">${b.who}</p><p class="text-xs text-muted">Court ${c + 1} · ${hourLabel(h)} · ${b.st}</p></div><button class="btn btn-lime !py-1.5 !px-3 text-xs" onclick="DB.schedule['${k}'].st='Checked-in';toast('${b.who} checked in');scCheckin();renderAdmin()">Check in</button></div>`; }).join('') : '<p class="text-muted">Everyone is checked in.</p>'}`);
}
function scCam() {
  drawer(`<h2 class="font-bold text-xl mb-5">Start a Your Brand session</h2><div class="space-y-4">
    <div><label for="cCt">Court</label><select id="cCt"><option>Court 1</option><option>Court 2</option><option>Court 3</option></select></div>
    <div><label for="cE">Deliver to (email)</label><input id="cE" type="email" placeholder="player@gmail.com"></div>
    <p id="cErr" class="hide text-sm text-red-300">Enter a valid email so the video can be delivered.</p>
    <button class="btn btn-lime w-full justify-center" onclick="startCam()"><i class="fa-solid fa-circle-dot"></i>Start recording</button>
    <p class="text-xs text-muted">Demo: the session records, processes, then delivers the full game plus AI highlights.</p></div>`);
}
function startCam() {
  const e = $('#cE').value.trim(); if (!EMAIL.test(e)) return $('#cErr').classList.remove('hide');
  const s = { id: 'PC-' + (1053 + DB.sessions.length), court: $('#cCt').value, who: e, start: new Date().toTimeString().slice(0, 5), mins: 0, clips: 0, st: 'Recording' };
  DB.sessions.unshift(s); if (!DB.customers.some(x => x.c === e)) DB.customers.unshift({ n: e.split('@')[0], c: e, t: 'Lead', last: 'Today', spend: 0, src: 'Kiosk guest' });
  closeDlgs(); SEC = 'picklecam'; renderAdmin(); toast('Recording on ' + s.court);
  setTimeout(() => { s.st = 'Processing'; s.mins = 52; if (SEC === 'picklecam' && S.admin) renderAdmin(); }, 3500);
  setTimeout(() => { s.st = 'Delivered'; s.clips = 13; if (SEC === 'picklecam' && S.admin) renderAdmin(); toast(`#${s.id}: full game + 13 highlights sent to ${e}`); }, 8000);
}
function scWifi() { drawer(`<h2 class="font-bold text-xl mb-5">Sell WiFi</h2><div class="grid gap-3">${[['1 Hour', DB.prices.w1], ['1 Day', DB.prices.w2], ['1 Week', DB.prices.w3]].map(w => `<button class="card p-4 text-left hover:border-lime flex justify-between items-center" onclick="issueVoucher('${w[0]}')"><b>${w[0]}</b><span class="display text-xl text-lime num">${peso(w[1])}</span></button>`).join('')}</div>`); }
function issueVoucher(plan) { const code = 'PH-WF-' + (3382 + DB.vouchers.length); DB.vouchers.unshift({ code, plan, who: 'Walk-in', st: 'Active' }); if (SEC === 'wifi') renderAdmin(); showQR('Voucher ' + code, plan + ' · connect to Playhouse-Guest', code); }
function scPayments() {
  const pend = DB.payments.map((p, i) => [p, i]).filter(([p]) => p.st === 'Pending');
  drawer(`<h2 class="font-bold text-xl mb-5">Verify payments</h2>${pend.length ? pend.map(([p, i]) => `<div class="card p-4 mb-3 flex justify-between items-center gap-3"><div><p class="font-semibold">${p.what}</p><p class="text-xs text-muted num">${p.method} · ${p.ref} · ${peso(p.amt)}</p></div><button class="btn btn-lime !py-1.5 !px-3 text-xs" onclick="verifyPay(${i});scPayments()">Verify</button></div>`).join('') : '<p class="text-muted">All payments verified.</p>'}`);
}
function verifyPay(i) { DB.payments[i].st = 'Verified'; toast('Payment ' + DB.payments[i].ref + ' verified'); renderAdmin(); }
function scCampaign() { drawer(`<h2 class="font-bold text-xl mb-5">Send a campaign</h2>${CAMPAIGNS.map((c, i) => `<div class="card p-4 mb-3"><p class="font-bold">${c.n}</p><p class="text-xs text-muted mt-1">${c.d}</p><button class="btn btn-lime !py-1.5 !px-3 text-xs mt-3" onclick="sendCampaign(${i})">Send to ${c.aud()}</button></div>`).join('')}`); }
function sendCampaign(i) { const c = CAMPAIGNS[i]; DB.sent.unshift({ name: c.n, aud: c.aud(), when: 'Just now' }); closeDlgs(); toast(`"${c.n}" queued for ${c.aud()} recipients`); if (S.admin) renderAdmin(); }
function scRoster() {
  drawer(`<h2 class="font-bold text-xl mb-1">Open play tonight</h2><p class="text-sm text-muted mb-5">5PM to 9PM · Court 3 · <span class="num">${DB.roster.length}/16</span> players</p>
  <div class="bar mb-5"><span style="width:${DB.roster.length / 16 * 100}%"></span></div>
  <ol class="space-y-2 mb-5">${DB.roster.map((n, i) => `<li class="card p-3 flex justify-between"><span><span class="text-muted num mr-2">${i + 1}</span>${n}</span><span class="badge b-lime">₱${DB.prices.open}</span></li>`).join('')}</ol>
  <div class="flex gap-2"><input id="rN" placeholder="Add walk-in name"><button class="btn btn-lime" onclick="const v=$('#rN').value.trim();if(v&&DB.roster.length<16){DB.roster.push(v);scRoster()}">Add</button></div>`);
}
function promote(contact) { const c = DB.customers.find(x => x.c === contact); c.t = c.t === 'Lead' ? 'Member' : 'Player'; toast(c.n + ' is now a ' + c.t); renderAdmin(); }
// ---------- data: Excel soft copy + their platform ----------
// Sheet name: [DB table, {column header: field}]. Same shape for Excel, import and the platform API.
const COLS = {
  Customers: ['customers', { Name: 'n', Contact: 'c', Stage: 't', Source: 'src', 'Last visit': 'last', 'Spend (PHP)': 'spend' }],
  Recordings: ['sessions', { Session: 'id', Court: 'court', 'Delivered to': 'who', Start: 'start', Minutes: 'mins', Highlights: 'clips', Status: 'st' }],
  Payments: ['payments', { Ref: 'ref', For: 'what', Method: 'method', 'Amount (PHP)': 'amt', Status: 'st' }],
  'WiFi vouchers': ['vouchers', { Code: 'code', Plan: 'plan', For: 'who', Status: 'st' }],
  Campaigns: ['sent', { Campaign: 'name', Recipients: 'aud', Sent: 'when' }],
  Staff: ['staff', { Account: 'n', Role: 'role' }]
};
const EXTRA = ['Bookings', 'Open play', 'Prices', 'Hours', 'Site content'];
function tables() {
  const t = {};
  t.Bookings = Object.entries(DB.schedule).map(([k, b]) => { const [c, h] = k.split('-').map(Number); return { Court: c + 1, 'Hour (24h)': h, Player: b.who, Status: b.st }; });
  for (const [sheet, [key, cols]] of Object.entries(COLS)) t[sheet] = DB[key].map(r => Object.fromEntries(Object.entries(cols).map(([h, f]) => [h, r[f]])));
  t['Open play'] = DB.roster.map(n => ({ Player: n }));
  t.Prices = Object.entries(PRICES).map(([k, v]) => ({ Setting: k, PHP: v }));
  t.Hours = Object.entries(HOURS).map(([k, v]) => ({ Setting: k, 'Hour (24h)': v }));
  t['Site content'] = Object.keys(CFG_DEFAULT).map(k => ({ Field: k, Value: SITE[k] ?? CFG_DEFAULT[k] }));
  return t;
}
function loadTables(t) { // inverse of tables(); sheets that are missing stay as they are
  for (const [sheet, [key, cols]] of Object.entries(COLS)) if (t[sheet]) DB[key] = t[sheet].map(r => Object.fromEntries(Object.entries(cols).map(([h, f]) => [f, r[h] ?? ''])));
  if (t.Bookings) DB.schedule = Object.fromEntries(t.Bookings.map(r => [(r.Court - 1) + '-' + r['Hour (24h)'], { who: r.Player, st: r.Status }]));
  if (t['Open play']) DB.roster = t['Open play'].map(r => r.Player);
  if (t.Prices) t.Prices.forEach(r => { if (r.Setting in PRICES) PRICES[r.Setting] = +r.PHP; });
  if (t.Hours) t.Hours.forEach(r => { if (r.Setting in HOURS) HOURS[r.Setting] = +r['Hour (24h)']; });
  if (t['Site content']) t['Site content'].forEach(r => { if (!(r.Field in CFG_DEFAULT)) return; const v = String(r.Value ?? ''); if (v === CFG_DEFAULT[r.Field]) delete SITE[r.Field]; else SITE[r.Field] = v; });
  if (t.Prices || t.Hours || t['Site content']) { saveConfig(); refreshSite(); }
  return Object.keys(t).filter(n => n in COLS || EXTRA.includes(n)).length;
}
const xlsx = () => window.XLSX ? Promise.resolve(window.XLSX) : new Promise((ok, bad) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; s.onload = () => ok(window.XLSX); s.onerror = bad; document.head.append(s); });
async function exportXLSX() {
  try {
    const X = await xlsx(), wb = X.utils.book_new();
    for (const [name, rows] of Object.entries(tables())) X.utils.book_append_sheet(wb, X.utils.json_to_sheet(rows), name);
    X.writeFile(wb, 'playhouse-pickle-data-' + new Date().toISOString().slice(0, 10) + '.xlsx');
    toast('Exported ' + wb.SheetNames.length + ' sheets to Excel');
  } catch (e) { toast('Excel export needs an internet connection'); }
}
async function importXLSX(file) {
  if (!file) return;
  try {
    const X = await xlsx(), wb = X.read(await file.arrayBuffer());
    const n = loadTables(Object.fromEntries(wb.SheetNames.map(s => [s, X.utils.sheet_to_json(wb.Sheets[s])])));
    toast(n ? `Imported ${n} sheets from ${file.name}` : 'No matching sheets. Start from an exported file.'); renderAdmin();
  } catch (e) { toast('Could not read that file'); }
}
// Their platform plugs in here: GET returns the same sheets as the Excel export, POST receives them.
// ponytail: link saved per browser; moves to the database (behind auth) when the real backend goes in.
const PLATFORM = {
  get cfg() { try { return JSON.parse(localStorage.getItem('pp-platform') || '{}'); } catch (e) { return {}; } },
  async pull(url) { const r = await fetch(url); if (!r.ok) throw Error(r.status); return loadTables(await r.json()); },
  async push(url) { const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tables()) }); if (!r.ok) throw Error(r.status); }
};
async function syncPlatform(dir) {
  const name = $('#plName').value.trim(), url = $('#plUrl').value.trim();
  if (!url.startsWith('https://')) return toast('Paste the platform’s https API link first');
  try { localStorage.setItem('pp-platform', JSON.stringify({ name, url })); } catch (e) {}
  try { dir === 'pull' ? await PLATFORM.pull(url) : await PLATFORM.push(url); toast((dir === 'pull' ? 'Pulled from ' : 'Pushed to ') + (name || 'the platform')); }
  catch (e) { toast('The platform did not answer (' + (e.message || 'network') + ')'); }
  renderAdmin();
}

// Shortcut keys 1-8 while the console is open (ignored while typing or when a dialog is up)
document.addEventListener('keydown', e => {
  if (!S.admin || $('#screen-admin').classList.contains('hide') || document.querySelector('dialog[open]') || /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
  const i = +e.key - 1; if (i >= 0 && i < SHORTCUTS.length) { e.preventDefault(); document.querySelectorAll('.shortcut')[i].click(); }
});
