/* ============================================================================
   F.A.E. Export menu — one button instead of five.

   Every list in the Command Center could be sent out four or five ways (CSV,
   Excel, JSON, into the data folder, up to the Google Sheet). Putting one
   button per format next to every table produced fifty-odd little boxes and
   made the important buttons hard to find. This puts them behind a single
   "Export" control that opens a short menu.

   <script src="assets/fae-export.js?v=1"></script>   (after fae-core.js)

   Use:
     <button class="btn" onclick="FAEExport.open(this,'members')">Export</button>
     FAEExport.define('members', {
       label : 'Members',                 // shown at the top of the menu
       file  : 'members',                 // FAE-members-2026-09-06.csv
       sheet : 'MEMBERS',                 // Google Sheet tab (omit = no sheet option)
       rows  : function(){ return [...] } // called fresh each time it opens
     });
   ========================================================================== */
(function (w, d) {
  var DEFS = {}, openMenu = null;

  function define(key, cfg){ DEFS[key] = cfg; return cfg; }

  function say(msg, level){
    /* use the host page's toast when it has one, otherwise fall back quietly */
    try{ if(typeof w.toast === 'function'){ w.toast(msg, level); return; } }catch(e){}
    try{ console.log('[export] ' + msg); }catch(e){}
  }

  function close(){
    if(openMenu && openMenu.parentNode) openMenu.parentNode.removeChild(openMenu);
    openMenu = null;
    d.removeEventListener('click', onOutside, true);
    d.removeEventListener('keydown', onKey, true);
  }
  function onOutside(e){ if(openMenu && !openMenu.contains(e.target)) close(); }
  function onKey(e){ if(e.key === 'Escape') close(); }

  function stamp(){
    try{ return FAE.localDay(); }catch(e){ return new Date().toISOString().slice(0,10); }
  }

  /* ---- the actual work, once a format is picked ---------------------------- */
  function run(key, fmt){
    var cfg = DEFS[key];
    if(!cfg){ say('Nothing to export', 'error'); return; }
    var rows = [];
    try{ rows = cfg.rows() || []; }catch(e){ rows = []; }
    if(!rows.length){ say('Nothing to export with these filters', 'error'); close(); return; }

    var base = 'FAE-' + (cfg.file || key) + '-' + stamp();
    var cols = Object.keys(rows[0]);

    if(fmt === 'csv'){
      FAE.download(base + '.csv', FAE.csv(rows), 'text/csv;charset=utf-8');
      say(rows.length + ' rows saved to ' + base + '.csv', 'success');

    } else if(fmt === 'xls'){
      FAE.download(base + '.xls', FAE.xls(rows, cols, cfg.label || key), 'application/vnd.ms-excel');
      say(rows.length + ' rows saved to ' + base + '.xls', 'success');

    } else if(fmt === 'json'){
      FAE.download(base + '.json', JSON.stringify(rows, null, 2), 'application/json');
      say(rows.length + ' rows saved as JSON', 'success');

    } else if(fmt === 'folder'){
      Promise.resolve(FAE.saveToFolder(base + '.csv', FAE.csv(rows), 'text/csv;charset=utf-8'))
        .then(function(r){
          say(r && r.picker ? ('Saved ' + base + '.csv')
                            : 'Saved to Downloads — move it into data\\' + (cfg.file || key) + '\\', 'success');
        });

    } else if(fmt === 'sheet'){
      FAE.sheetPush(cfg.sheet, rows);
      var s = FAE.syncCfg();
      if(!s.enabled || !s.endpoint){
        say(rows.length + ' rows queued — add the Sheet endpoint in Settings → Online Sync', 'warning');
      } else {
        FAE.pushOutbox().then(function(r){
          say(r && r.sent ? (rows.length + ' rows sent to the ' + cfg.sheet + ' tab')
                          : 'Queued — will send when the connection is back',
              r && r.sent ? 'success' : 'warning');
        });
      }
    }
    close();
  }

  /* ---- the menu ------------------------------------------------------------ */
  var ITEMS = [
    { fmt:'csv',    icon:'📄', label:'CSV file',            hint:'opens in Excel or Sheets' },
    { fmt:'xls',    icon:'📗', label:'Excel file',          hint:'.xls, opens directly' },
    { fmt:'json',   icon:'🧾', label:'JSON backup',         hint:'for restoring later' },
    { fmt:'folder', icon:'📁', label:'Save to data folder', hint:'keeps the office copy' },
    { fmt:'sheet',  icon:'☁',       label:'Send to Google Sheet',hint:'needs the online endpoint' }
  ];

  function open(btn, key){
    var wasSame = openMenu && openMenu.dataset.key === key;
    close();
    if(wasSame) return;                     /* clicking the same button closes it */

    var cfg = DEFS[key];
    if(!cfg){ say('Nothing to export', 'error'); return; }

    var allowed = cfg.formats || ['csv','xls','folder'].concat(cfg.sheet ? ['sheet'] : [])
                                                       .concat(cfg.json === false ? [] : ['json']);
    var m = d.createElement('div');
    m.dataset.key = key;
    m.setAttribute('role', 'menu');
    m.style.cssText = 'position:fixed;z-index:12000;min-width:246px;background:#0d0d12;' +
      'border:1px solid #2e2e39;border-radius:11px;padding:6px;' +
      'box-shadow:0 18px 44px -16px rgba(0,0,0,.92);font-family:inherit';

    var count = '';
    try{ count = (cfg.rows() || []).length; }catch(e){}
    m.innerHTML =
      '<div style="font-family:ui-monospace,monospace;font-size:9px;letter-spacing:.14em;' +
      'color:#8B8B98;padding:8px 10px 7px">EXPORT ' + String(cfg.label || key).toUpperCase() +
      (count === '' ? '' : ' · ' + count + ' ROW' + (count === 1 ? '' : 'S')) + '</div>' +
      ITEMS.filter(function(it){ return allowed.indexOf(it.fmt) >= 0; }).map(function(it){
        return '<button data-fmt="' + it.fmt + '" style="display:flex;align-items:center;gap:10px;' +
          'width:100%;text-align:left;background:none;border:0;color:#F4F4F6;padding:10px;' +
          'border-radius:8px;cursor:pointer;font-size:13px;font-family:inherit">' +
          '<span style="font-size:15px;width:20px;flex:none;text-align:center">' + it.icon + '</span>' +
          '<span style="flex:1"><b style="font-weight:600">' + it.label + '</b>' +
          '<span style="display:block;font-size:11px;color:#8B8B98;margin-top:1px">' + it.hint + '</span>' +
          '</span></button>';
      }).join('');

    d.body.appendChild(m);

    /* place it under the button, nudged back on screen if it would overflow */
    var r = btn.getBoundingClientRect();
    var top = r.bottom + 6, left = r.left;
    m.style.top = '0px'; m.style.left = '0px';
    var mw = m.offsetWidth, mh = m.offsetHeight;
    if(left + mw > innerWidth - 10) left = Math.max(10, innerWidth - mw - 10);
    if(top + mh > innerHeight - 10) top = Math.max(10, r.top - mh - 6);   /* flip above */
    m.style.top = top + 'px';
    m.style.left = left + 'px';

    m.querySelectorAll('button').forEach(function(b){
      b.addEventListener('mouseenter', function(){ b.style.background = 'rgba(201,162,39,.14)'; });
      b.addEventListener('mouseleave', function(){ b.style.background = 'none'; });
      b.addEventListener('click', function(e){ e.stopPropagation(); run(key, b.dataset.fmt); });
    });

    openMenu = m;
    /* capture phase, so a click anywhere else closes it before that click acts */
    setTimeout(function(){
      d.addEventListener('click', onOutside, true);
      d.addEventListener('keydown', onKey, true);
    }, 0);
  }

  w.FAEExport = { define: define, open: open, close: close, run: run };
})(window, document);
