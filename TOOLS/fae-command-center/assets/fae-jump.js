/* ===========================================================================
   F.A.E. jump bar — live command palette for the console.
   Attaches to the existing <input id="jump">. As you type it shows a dropdown
   of matching pages; ↑/↓ to move, Enter to go, click to open, Esc to close.
   Empty query lists every page so the whole app is browsable from one bar.
   One file, included by console.html and console-light.html, so both agree.
   =========================================================================== */
(function () {
  /* every page in the command center + a few external destinations */
  var PAGES = [
    { label: 'Home', href: 'index.html', kw: 'landing start' },
    { label: 'Console — Command Center', href: 'console.html', kw: 'home hub menu' },
    { label: 'Console — Light theme', href: 'console-light.html', kw: 'light admin theme' },
    { label: 'Business Dashboard', href: 'dashboard.html', kw: 'revenue money admin overview' },
    { label: 'FAEBASKETBALL — dashboard tab', href: 'dashboard.html#basketball', kw: 'basketball filam elite team' },
    { label: 'FAEVOLLEYBALL — dashboard tab', href: 'dashboard.html#volleyball', kw: 'volleyball filam elite' },
    { label: 'Live Court Schedule', href: 'schedule.html', kw: 'renter calendar booking court' },
    { label: 'FilAm Elite Programs — Roster & Drafting', href: 'programs.html', kw: 'players batch draft teams roster position tier' },
    { label: 'Tournament Matchmaking & Balance', href: 'tournament.html', kw: 'bracket double elimination balance sheet teams' },
    { label: 'Batch 23 Checkout', href: 'batch23-checkout.html', kw: 'check in uniform fees paid tournament' },
    { label: 'Member Portal — Directory', href: 'member-portal.html', kw: 'members parents contact minors guardian directory' },
    { label: 'Member Registry', href: 'member-registry.html', kw: 'members headshots contact' },
    { label: 'Registry Database', href: 'registry.html', kw: 'backup export excel data' },
    { label: 'Take Payment', href: 'take-payment.html', kw: 'cash pay collect money' },
    { label: 'Payroll & Wages', href: 'payroll.html', kw: 'dole salary staff wages' },
    { label: 'Scoreboard', href: 'scoreboard.html', kw: 'missions points rewards game' },
    { label: 'Playbook', href: 'playbook.html', kw: 'help guide how to' },
    { label: 'Worker Console', href: 'worker.html', kw: 'employee staff shift' },
    { label: 'Daily Tasks', href: 'tasks.html', kw: 'tickets todo checklist' },
    { label: 'Staff', href: 'staff.html', kw: 'employees shift time' },
    { label: 'Settings & Pricing', href: 'settings.html', kw: 'config rates roles pin' },
    { label: 'Check-in / Door', href: 'checkin.html', kw: 'reception visitor arrive door' },
    { label: 'Register a Visitor', href: 'register.html', kw: 'signup household walk in' },
    { label: 'Advertise', href: 'advertise.html', kw: 'promo marketing ads' },
    { label: 'NXGEN Stats', href: 'nxgen-stats.html', kw: 'league stats standings' },
    { label: 'Sync', href: 'sync.html', kw: 'upload push data endpoint' },
    { label: 'QR Poster', href: 'qr-poster.html', kw: 'qr code print poster' },
    { label: 'Blueprint', href: 'blueprint.html', kw: 'map layout plan' },
    { label: 'Setup Guide', href: 'SETUP-GUIDE.html', kw: 'install how to setup' },
    { label: 'Terms', href: 'terms.html', kw: 'privacy consent policy' }
  ];

  function css() {
    var s = document.createElement('style');
    s.textContent =
      '#fae-jump-results{position:absolute;left:20px;right:20px;bottom:calc(100% - 2px);' +
      'max-height:52vh;overflow:auto;background:var(--panel,#0d0d12);border:1px solid var(--line2,#2e2e39);' +
      'border-radius:12px 12px 0 0;box-shadow:0 -10px 30px -12px rgba(0,0,0,.5);display:none}' +
      '#fae-jump-results.on{display:block}' +
      '.fj-item{display:flex;align-items:center;gap:10px;padding:10px 15px;cursor:pointer;border-bottom:1px solid var(--line,#22222b)}' +
      '.fj-item:last-child{border-bottom:0}' +
      '.fj-item.active,.fj-item:hover{background:var(--panel2,#121218)}' +
      '.fj-item b{font-family:var(--sans),sans-serif;font-weight:600;font-size:13px;color:var(--ink,#F4F4F6)}' +
      '.fj-item .fj-href{margin-left:auto;font-family:var(--mono),monospace;font-size:10px;color:var(--dim,#5f5f6d)}' +
      '.fj-item .fj-ext{color:var(--gold,#C9A227)}' +
      '.fj-none{padding:14px 15px;color:var(--dim,#5f5f6d);font-family:var(--mono),monospace;font-size:12px}';
    document.head.appendChild(s);
  }

  function boot() {
    var input = document.getElementById('jump');
    if (!input) return;
    css();
    var box = document.createElement('div');
    box.id = 'fae-jump-results';
    (input.closest('.jump') || input.parentNode).appendChild(box);

    var results = [], active = 0;
    var isExt = function (h) { return /^https?:/.test(h); };

    function match(q) {
      q = q.trim().toLowerCase();
      if (!q) return PAGES.slice();
      return PAGES.filter(function (p) {
        return (p.label + ' ' + p.kw + ' ' + p.href).toLowerCase().indexOf(q) >= 0;
      });
    }
    function draw() {
      if (!results.length) { box.innerHTML = '<div class="fj-none">no page matches — try “schedule”, “roster”, “payment”…</div>'; box.classList.add('on'); return; }
      box.innerHTML = results.map(function (p, i) {
        return '<div class="fj-item' + (i === active ? ' active' : '') + '" data-i="' + i + '">' +
          '<b>' + p.label + '</b><span class="fj-href' + (isExt(p.href) ? ' fj-ext' : '') + '">' + p.href + '</span></div>';
      }).join('');
      box.classList.add('on');
    }
    function go(p) {
      if (!p) return;
      if (isExt(p.href)) window.open(p.href, '_blank', 'noopener');
      else location.href = p.href;
    }
    function refresh() { results = match(input.value); active = 0; draw(); }

    input.addEventListener('focus', refresh);
    input.addEventListener('input', refresh);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(active + 1, results.length - 1); draw(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(active - 1, 0); draw(); }
      else if (e.key === 'Enter') { e.preventDefault(); go(results[active]); }
      else if (e.key === 'Escape') { box.classList.remove('on'); input.blur(); }
    });
    box.addEventListener('mousedown', function (e) {
      var it = e.target.closest('.fj-item'); if (!it) return;
      e.preventDefault(); go(results[+it.getAttribute('data-i')]);
    });
    document.addEventListener('click', function (e) {
      if (e.target !== input && !box.contains(e.target)) box.classList.remove('on');
    });
    input.placeholder = 'type to find any page — schedule · roster · matchmaking · checkout · payment · members…';
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
