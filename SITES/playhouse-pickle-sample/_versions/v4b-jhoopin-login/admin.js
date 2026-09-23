// Owner console: shortcut panel + main operations panel. Demo data, in-memory; workflow ticks persist per browser.
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
  prices: { court: 300, open: 250, unlock: 99, w1: 49, w2: 99, w3: 299 },
  staff: [{ n: 'jhoopin3@gmail.com', role: 'Owner (admin)' }, { n: 'filamelitebasketball', role: 'Owner (admin)' }, { n: 'Front desk 1', role: 'Staff' }, { n: 'Court marshal', role: 'Staff' }]
};
const TASKS = [
  ['Opening', 'daily', ['Lights on, doors unlocked by 5:45 AM', 'Dry-mop all 3 courts, check nets for height and tension', 'Power on PickleCam cameras and kiosk iPads, run a 10-second test clip per court', 'Confirm today’s bookings and the open play roster', 'Restock rental paddles, balls, and drinking water', 'Check WiFi router and print voucher stock']],
  ['During operations', 'daily', ['Check in every player on arrival and capture email or mobile', 'Verify GCash and Maya payments within 15 minutes', 'Rotate the open play queue every game', 'Watch the PickleCam queue: no session stuck in Processing', 'Offer the free account at the kiosk to every guest']],
  ['Closing', 'daily', ['Stop all recording sessions', 'Confirm every video is Delivered', 'Reconcile cash, GCash and Maya against bookings', 'Charge kiosk iPads, lights off, lock up']],
  ['Weekly', 'weekly', ['Send the expiring-highlights reminder (grace period)', 'Post the top 3 highlights on FB, IG and TikTok with #playhousepickleballco', 'Email the next week’s open play schedule', 'Review new leads and invite them to membership', 'Wipe camera lenses, inspect nets and court lines', 'Follow up on 2027 tournament sponsors']],
  ['Monthly', 'monthly', ['Revenue and PickleCam report to the owners', 'Membership renewals and win-back list', 'Price and schedule review']]
];
const SECTIONS = [['overview', 'Overview', 'fa-gauge-high'], ['schedule', 'Schedule', 'fa-calendar-days'], ['customers', 'Customers', 'fa-users'], ['picklecam', 'PickleCam', 'fa-video'], ['payments', 'Payments', 'fa-peso-sign'], ['wifi', 'WiFi', 'fa-wifi'], ['workflow', 'Workflow', 'fa-list-check'], ['marketing', 'Marketing', 'fa-paper-plane'], ['settings', 'Settings', 'fa-sliders']];
const SHORTCUTS = [['New booking', 'fa-calendar-plus', 'scBooking()'], ['Check in', 'fa-user-check', 'scCheckin()'], ['Start PickleCam', 'fa-circle-dot', 'scCam()'], ['Sell WiFi', 'fa-wifi', 'scWifi()'], ['Verify payments', 'fa-circle-check', 'scPayments()'], ['Send campaign', 'fa-paper-plane', 'scCampaign()'], ['Open play roster', 'fa-people-group', 'scRoster()'], ['Export customers', 'fa-file-arrow-down', 'exportCSV()']];
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
function taskState() { try { return JSON.parse(localStorage.getItem('pp-tasks') || '{}'); } catch (e) { return {}; } }
function periodKey(f) { const d = new Date(); return f === 'daily' ? d.toDateString() : f === 'weekly' ? d.getFullYear() + '-w' + Math.ceil((d - new Date(d.getFullYear(), 0, 1)) / 6048e5) : d.getFullYear() + '-' + d.getMonth(); }
function isDone(g, i) { const st = taskState(), f = TASKS[g][1]; return st[g + '.' + i] === periodKey(f); }
function tick(g, i, on) { const st = taskState(); if (on) st[g + '.' + i] = periodKey(TASKS[g][1]); else delete st[g + '.' + i]; try { localStorage.setItem('pp-tasks', JSON.stringify(st)); } catch (e) {} renderAdmin(); }

const VIEWS = {
  overview() {
    const pend = DB.payments.filter(p => p.st === 'Pending').length, proc = DB.sessions.filter(s => s.st !== 'Delivered' && s.st !== 'Unlocked').length;
    const booked = Object.keys(DB.schedule).length, leads = DB.customers.filter(c => c.t === 'Lead').length;
    const dailyDone = TASKS.flatMap((g, gi) => g[1] === 'daily' ? g[2].map((_, i) => isDone(gi, i)) : []);
    const pct = Math.round(dailyDone.filter(Boolean).length / dailyDone.length * 100);
    const rev = [98, 120, 142, 131, 168, 182], max = Math.max(...rev);
    return `<div class="grid gap-5">
      <div class="grid grid-cols-2 xl:grid-cols-4 gap-4">${kpi((1274 + DB.customers.length).toLocaleString(), 'Customers in your database', '+142 this month')}${kpi(peso(182400), 'Revenue this month', '+8.4% vs August')}${kpi(booked + 17, 'Bookings today', '3 courts, 6AM to 11PM')}${kpi('38.6%', 'Footage keep rate', 'grace-period conversions', 'text-gold')}</div>
      ${panel('Needs attention', `<ul class="space-y-2 text-sm">
        <li class="flex flex-wrap justify-between gap-3 items-center card p-3"><span><b class="text-gold">4 highlight packs</b> expire within 48 hours.</span><button class="btn btn-lime !py-1.5 !px-3 text-xs" onclick="sendCampaign(0)">Send reminder</button></li>
        <li class="flex flex-wrap justify-between gap-3 items-center card p-3"><span><b class="text-gold">${pend} payments</b> waiting for verification.</span><button class="btn btn-ghost !py-1.5 !px-3 text-xs" onclick="scPayments()">Verify</button></li>
        <li class="flex flex-wrap justify-between gap-3 items-center card p-3"><span><b>${proc} PickleCam sessions</b> still recording or processing.</span><button class="btn btn-ghost !py-1.5 !px-3 text-xs" onclick="SEC='picklecam';renderAdmin()">Open queue</button></li>
        <li class="flex flex-wrap justify-between gap-3 items-center card p-3"><span><b>${leads} new leads</b> have not been invited to membership.</span><button class="btn btn-ghost !py-1.5 !px-3 text-xs" onclick="sendCampaign(2)">Invite</button></li>
      </ul>`)}
      <div class="grid xl:grid-cols-2 gap-5">
        ${panel('Revenue · last 6 months', `<div class="flex items-end gap-3 h-40">${rev.map((v, i) => `<div class="flex-1 flex flex-col items-center justify-end h-full gap-2"><div class="w-full rounded-t-lg ${i === 5 ? 'bg-lime' : 'bg-lime/40'}" style="height:${Math.round(v / max * 100)}%"></div><span class="text-[11px] text-muted">${['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'][i]}</span></div>`).join('')}</div><p class="text-[11px] text-muted mt-3">₱ thousands · demo figures</p>`)}
        ${panel('Today’s workflow', `<div class="bar"><span style="width:${pct}%"></span></div><p class="text-sm mt-3"><b class="num">${pct}%</b> of daily tasks done.</p><button class="btn btn-ghost !py-2 text-sm mt-4" onclick="SEC='workflow';renderAdmin()">Open checklist</button>`)}
      </div></div>`;
  },
  schedule() {
    const hrs = [...Array(17)].map((_, i) => i + 6);
    const cell = (c, h) => {
      if (c === 2 && h >= 13 && h < 21) return `<div class="cell" style="cursor:default"><span class="text-lime">Open play</span></div>`;
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
      <div class="overflow-x-auto"><table class="min-w-[640px]"><thead><tr><th>Name</th><th>Contact</th><th>Stage</th><th>Source</th><th>Last visit</th><th class="text-right">Spend</th><th></th></tr></thead><tbody id="custRows">${custRows()}</tbody></table></div>`, `<div class="flex gap-2"><button class="btn btn-ghost !py-2 text-sm" onclick="scCampaign()"><i class="fa-solid fa-paper-plane"></i>Email</button><button class="btn btn-lime !py-2 text-sm" onclick="exportCSV()"><i class="fa-solid fa-file-arrow-down"></i>Export CSV</button></div>`)}</div>`;
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
  workflow() {
    return `<div class="grid gap-5">${TASKS.map((g, gi) => {
      const done = g[2].filter((_, i) => isDone(gi, i)).length;
      return panel(`${g[0]} <span class="text-xs font-normal text-muted">(${g[1]})</span>`, `<div class="bar mb-3"><span style="width:${done / g[2].length * 100}%"></span></div>${g[2].map((t, i) => `<label class="task ${isDone(gi, i) ? 'done' : ''}" style="font-size:14px;color:inherit;margin:0"><input type="checkbox" ${isDone(gi, i) ? 'checked' : ''} onchange="tick(${gi},${i},this.checked)"><span class="t">${t}</span></label>`).join('')}`, `<span class="text-xs text-muted num">${done}/${g[2].length}</span>`);
    }).join('')}</div>`;
  },
  marketing() {
    return `<div class="grid gap-5">${panel('Campaigns', `<div class="grid md:grid-cols-2 gap-3">${CAMPAIGNS.map((c, i) => `<div class="card p-4"><p class="font-bold">${c.n}</p><p class="text-xs text-muted mt-1">${c.d}</p><div class="flex justify-between items-center mt-4"><span class="text-xs num">${c.aud()} recipients</span><button class="btn btn-lime !py-1.5 !px-3 text-xs" onclick="sendCampaign(${i})">Send</button></div></div>`).join('')}</div>`)}
    ${panel('Sent', `<ul class="text-sm space-y-2">${DB.sent.map(s => `<li class="flex justify-between"><span>${s.name}</span><span class="text-muted num">${s.aud} · ${s.when}</span></li>`).join('')}</ul>`)}</div>`;
  },
  settings() {
    const p = DB.prices, f = (k, l) => `<div><label>${l}</label><input class="num" type="number" min="0" value="${p[k]}" onchange="DB.prices.${k}=+this.value"></div>`;
    return `<div class="grid gap-5">${panel('Pricing', `<div class="grid sm:grid-cols-3 gap-4">${f('court', 'Court rental / hour (₱)')}${f('open', 'Open play / person (₱)')}${f('unlock', 'Keep a match forever (₱)')}${f('w1', 'WiFi 1 hour (₱)')}${f('w2', 'WiFi 1 day (₱)')}${f('w3', 'WiFi 1 week (₱)')}</div>`, `<button class="btn btn-lime !py-2 text-sm" onclick="toast('Pricing saved')">Save</button>`)}
    ${panel('Hours', `<p class="text-sm">Courts 6:00 AM to 11:00 PM daily · Open play 1PM to 5PM and 5PM to 9PM on Court 3.</p>`)}
    ${panel('Staff and access', `<table><thead><tr><th>Account</th><th>Role</th></tr></thead><tbody>${DB.staff.map(s => `<tr><td class="font-semibold">${s.n}</td><td>${s.role}</td></tr>`).join('')}</tbody></table>`)}</div>`;
  }
};
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
    <div class="grid grid-cols-2 gap-3"><div><label for="bCt">Court</label><select id="bCt">${[0, 1, 2].map(i => `<option value="${i}" ${i === c ? 'selected' : ''}>Court ${i + 1}</option>`).join('')}</select></div>
    <div><label for="bH">Hour</label><select id="bH">${[...Array(17)].map((_, i) => `<option value="${i + 6}" ${i + 6 === h ? 'selected' : ''}>${hourLabel(i + 6)}</option>`).join('')}</select></div></div>
    <div><label for="bM">Payment</label><select id="bM"><option>GCash</option><option>Maya</option><option>Cash</option><option>Pay later</option></select></div>
    <p id="bErr" class="hide text-sm text-red-300"></p>
    <button class="btn btn-lime w-full justify-center" onclick="saveBooking()">Save booking</button></div>`);
}
function saveBooking() {
  const n = $('#bN').value.trim(), c = +$('#bCt').value, h = +$('#bH').value, m = $('#bM').value, contact = $('#bC').value.trim(), err = $('#bErr');
  if (!n) { err.textContent = 'Enter the player name.'; return err.classList.remove('hide'); }
  if (c === 2 && h >= 13 && h < 21) { err.textContent = 'Court 3 is reserved for open play at that hour.'; return err.classList.remove('hide'); }
  if (DB.schedule[c + '-' + h]) { err.textContent = 'That hour is already booked.'; return err.classList.remove('hide'); }
  DB.schedule[c + '-' + h] = { who: n, st: m === 'Pay later' ? 'Booked' : 'Paid' };
  if (m !== 'Pay later') DB.payments.unshift({ ref: 'PP' + String(Date.now()).slice(-6), what: `Court ${c + 1} · ${hourLabel(h)}`, method: m, amt: DB.prices.court, st: m === 'Cash' ? 'Verified' : 'Pending' });
  if (contact && !DB.customers.some(x => x.c === contact)) DB.customers.unshift({ n, c: contact, t: 'Lead', last: 'Today', spend: 0, src: 'Walk-in' });
  closeDlgs(); toast(`Court ${c + 1} at ${hourLabel(h)} booked for ${n}`); SEC = 'schedule'; renderAdmin();
}
function cycleSlot(c, h) { const b = DB.schedule[c + '-' + h], order = ['Booked', 'Paid', 'Checked-in']; b.st = order[(order.indexOf(b.st) + 1) % 3]; toast(b.who + ': ' + b.st); renderAdmin(); }
function scCheckin() {
  const due = Object.entries(DB.schedule).filter(([, b]) => b.st !== 'Checked-in');
  drawer(`<h2 class="font-bold text-xl mb-5">Check in</h2>${due.length ? due.map(([k, b]) => { const [c, h] = k.split('-').map(Number); return `<div class="card p-4 mb-3 flex justify-between items-center"><div><p class="font-semibold">${b.who}</p><p class="text-xs text-muted">Court ${c + 1} · ${hourLabel(h)} · ${b.st}</p></div><button class="btn btn-lime !py-1.5 !px-3 text-xs" onclick="DB.schedule['${k}'].st='Checked-in';toast('${b.who} checked in');scCheckin();renderAdmin()">Check in</button></div>`; }).join('') : '<p class="text-muted">Everyone is checked in.</p>'}`);
}
function scCam() {
  drawer(`<h2 class="font-bold text-xl mb-5">Start a PickleCam session</h2><div class="space-y-4">
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
function exportCSV() {
  const rows = [['Name', 'Contact', 'Stage', 'Source', 'Last visit', 'Spend (PHP)']].concat(DB.customers.map(c => [c.n, c.c, c.t, c.src || '', c.last, c.spend]));
  const csv = rows.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join(String.fromCharCode(10));
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'playhouse-pickle-customers.csv'; a.click(); URL.revokeObjectURL(a.href);
  toast('Exported ' + DB.customers.length + ' customers');
}

// Shortcut keys 1-8 while the console is open (ignored while typing or when a dialog is up)
document.addEventListener('keydown', e => {
  if (!S.admin || $('#screen-admin').classList.contains('hide') || document.querySelector('dialog[open]') || /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
  const i = +e.key - 1; if (i >= 0 && i < SHORTCUTS.length) { e.preventDefault(); document.querySelectorAll('.shortcut')[i].click(); }
});
