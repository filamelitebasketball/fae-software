/* ============================================================================
   F.A.E. Core — shared config, session, roles, money helpers.
   Loaded by every page: <script src="assets/fae-core.js"></script>
   Client-side access control only: stops staff SEEING money on the dashboard.
   Not real security — the live site's server auth is the real enforcement.
   ========================================================================== */
(function (w) {
  var CFG_KEY = 'fae-config-v1', SESSION_KEY = 'fae-session';
  var MASTER_PIN = '2021';

  function lget(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
  function lset(k,v){ try{ localStorage.setItem(k,v); return true; }catch(e){ return false; } }

  function config(){
    var d = { rates:{}, business:{}, ads:[], roles:{ adminPin:'1212', frontPin:'', adminCanSeeMoney:false } };
    try{ var c = JSON.parse(lget(CFG_KEY)); if(c){ if(!c.roles) c.roles = d.roles; return c; } }catch(e){}
    return d;
  }
  function roles(){ var r = (config().roles)||{};
    return { adminPin:r.adminPin||'1212', frontPin:r.frontPin||'', adminCanSeeMoney:!!r.adminCanSeeMoney }; }

  function session(){ try{ var s = JSON.parse(lget(SESSION_KEY)); if(s&&s.role) return s; }catch(e){} return null; }
  function role(){ var s = session(); return s ? s.role : null; }              /* null = not signed in */
  function setSession(r,name){ return lset(SESSION_KEY, JSON.stringify({ role:r, name:name||'', ts:new Date().toISOString() })); }
  function clearSession(){ try{ localStorage.removeItem(SESSION_KEY); }catch(e){} }

  /* PIN check for elevating to a role. Front desk needs no PIN unless one is set. */
  function checkPin(r, pin){
    if(r==='master') return pin===MASTER_PIN;
    if(r==='admin')  return pin===roles().adminPin;
    if(r==='frontdesk'){ var fp = roles().frontPin; return !fp || pin===fp; }
    return false;
  }

  function isMaster(){ return role()==='master'; }
  function isAdmin(){ return role()==='admin'; }
  function canSeeMoney(){ var r = role(); return r==='master' || (r==='admin' && roles().adminCanSeeMoney); }

  /* Which dashboard views each role may open. Default-deny for unknown role. */
  var MASTER_ONLY = ['overview','cashflow','exports','payroll','wallet'];
  function allowedViews(){
    var r = role();
    if(r==='master') return null;                 /* null = all */
    var admin = ['members','incidents','inventory','rentals','schedule','nxgen','events','data','portal','nfclogs','calendar','basketball','volleyball','pickleball','history','tickets','visitors','removed'];
    if(r==='admin'){
      if(canSeeMoney()) admin = admin.concat(['overview','invoices','cashflow']);
      else admin = admin.concat(['invoices']);     /* admin sees invoice list (their work), owner money views stay hidden */
      return admin;
    }
    /* Front desk: operational only, no owner money.
       'visitors' is deliberately NOT here. The desk runs the door from
       checkin.html, which shows the names it needs and nothing else; the full
       register carries home addresses, emails and children's health notes, and
       the privacy notice promises those are management-only. */
    return ['schedule','incidents','members','data','rentals','inventory','tickets','removed'];
  }
  function landingView(){
    var r = role();
    if(r==='master') return 'overview';
    if(r==='admin') return canSeeMoney()?'overview':'members';
    return 'schedule';
  }
  /* ---------- court rates (member vs non-member) ---------- */
  var DEF_RATES = {
    basketball:{member:1000, nonMember:1200},
    volleyball:{member:1000, nonMember:1200},
    pickleball:{member:500,  nonMember:700},
    scoreboard:100, ball:100, lateFee:1000
  };
  /* price for a sport; isMember true = member rate. Handles both the new
     {member,nonMember} shape and the old single-number shape. */
  function rate(sport, isMember){
    var r = (config().rates)||{}, v = r[sport];
    if(v==null) v = DEF_RATES[sport];
    if(v==null) return 0;
    if(typeof v==='number') return v;
    return isMember ? (+v.member||+v.nonMember||0) : (+v.nonMember||+v.member||0);
  }

  function peso(n){ return '₱' + (Number(n)||0).toLocaleString(); }
  function money(n){ return canSeeMoney() ? peso(n) : '•••'; }   /* masked for non-money roles */

  /* ---------- offline outbox + online sync ----------
     Queues submissions locally; pushes to a POST endpoint you set in Settings
     (config.sync = { endpoint, key, enabled }). Nothing leaves the device until
     an endpoint is configured. */
  var OUTBOX_KEY = 'fae-outbox';
  function syncCfg(){ var c = config().sync || {}; return { endpoint:c.endpoint||'', key:c.key||'', enabled:!!c.enabled }; }
  function outbox(){ try{ return JSON.parse(lget(OUTBOX_KEY)) || []; }catch(e){ return []; } }
  function outboxSave(a){ return lset(OUTBOX_KEY, JSON.stringify(a)); }
  function outboxAdd(item){
    var a = outbox();
    a.push({ id:'ob_'+Date.now()+'_'+Math.random().toString(36).slice(2,7), item:item, synced:false, ts:new Date().toISOString(), tries:0 });
    outboxSave(a); return a.length;
  }
  function outboxPending(){ return outbox().filter(function(x){ return !x.synced; }); }
  function online(){ try{ return navigator.onLine !== false; }catch(e){ return true; } }
  /* push all pending to the configured endpoint. Resolves with {sent,failed,skipped}. */
  function pushOutbox(){
    var s = syncCfg();
    if(!s.enabled || !s.endpoint) return Promise.resolve({ skipped:true });
    if(!online()) return Promise.resolve({ offline:true });
    var all = outbox(), pend = all.filter(function(x){ return !x.synced; });
    if(!pend.length) return Promise.resolve({ sent:0, failed:0 });
    var sent=0, failed=0;
    return pend.reduce(function(p, rec){
      return p.then(function(){
        var headers = { 'Content-Type':'application/json' };
        if(s.key){ headers['apikey']=s.key; headers['Authorization']='Bearer '+s.key; }
        return fetch(s.endpoint, { method:'POST', headers:headers, body:JSON.stringify(rec.item) })
          .then(function(r){ if(r.ok){ rec.synced=true; rec.syncedAt=new Date().toISOString(); sent++; } else { rec.tries++; failed++; } })
          .catch(function(){ rec.tries++; failed++; });
      });
    }, Promise.resolve()).then(function(){ outboxSave(all); return { sent:sent, failed:failed }; });
  }
  /* auto-flush when the browser comes back online */
  try{ w.addEventListener('online', function(){ pushOutbox(); }); }catch(e){}

  /* ---------- motion / UI level ----------
     config.ui.motion = 'full' | 'subtle' | 'off'. Set on <html data-motion="…">
     so assets/fae-motion.css can dial the animations up or down. The OS
     "reduce motion" setting always wins (handled inside the stylesheet). */
  function ui(){ var u = config().ui || {}; return { motion: u.motion || 'full', density: u.density || 'comfortable' }; }
  function applyMotion(){
    try{
      var u = ui(), r = document.documentElement;
      r.setAttribute('data-motion', u.motion);
      r.setAttribute('data-density', u.density);
    }catch(e){}
  }
  try{
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', applyMotion);
    else applyMotion();
  }catch(e){}

  /* ---------- member categories (one definition every page shares) ----------
     A member is tagged by WHERE THEY CAME FROM so the same person shows up on
     every screen with the same badge: NXGEN league, a sport program, a court
     renter who signed up, or a plain walk-in member. */
  var CATS = {
    nxgen:      { label:'NXGEN',      color:'#2FA6A0' },
    basketball: { label:'BASKETBALL', color:'#D2843B' },
    volleyball: { label:'VOLLEYBALL', color:'#4A7FB5' },
    pickleball: { label:'PICKLEBALL', color:'#3FA66A' },
    court:      { label:'COURT RENT', color:'#C9A227' },
    member:     { label:'MEMBER',     color:'#8B8B98' }
  };
  function memberCategory(m, fallback){
    if(!m) return fallback || 'member';
    if(m.category && CATS[m.category]) return m.category;
    var p = ((m.programs||[]).join(' ') + ' ' + (m.division||'') + ' ' + (m.notes||'')).toLowerCase();
    var t = ((m.memberType||'') + ' ' + (m.source||'') + ' ' + (m.tier||'')).toLowerCase();
    if(/nxgen|league/.test(p) || /nxgen|league/.test(t)) return 'nxgen';
    if(/basketball/.test(p)) return 'basketball';
    if(/volleyball/.test(p)) return 'volleyball';
    if(/pickle/.test(p))     return 'pickleball';
    if(/renter|court|walk/.test(t)) return 'court';
    return fallback || 'member';
  }
  function catLabel(c){ return (CATS[c]||CATS.member).label; }
  function catColor(c){ return (CATS[c]||CATS.member).color; }

  /* ---------- one member list, gathered from every store on this device ----------
     dashboard members + synced workbook + registry file import. De-duped by id,
     then by lowercased name so the same person imported twice stays one row. */
  function allMembers(){
    var out = [], byId = {}, byName = {};
    function push(m, fallbackCat, src){
      if(!m || !m.name) return;
      var id = m.id || ('TMP-' + (m.name||'').replace(/\W+/g,'').slice(0,10).toUpperCase());
      var nk = String(m.name).trim().toLowerCase();
      if(byId[id] || byName[nk]) return;
      var rec = {
        id:id, name:m.name, phone:m.phone||'', email:m.email||'',
        category: memberCategory(m, fallbackCat),
        status: m.status||'active', balance: +m.balance||0,
        tabBalance: +m.tabBalance||0, nfcUid: m.nfcUid || ((m.bracelets||[])[0]||{}).uid || '',
        programs: m.programs||[], joinDate: m.joinDate||'', memberType: m.memberType||'',
        origin: src
      };
      out.push(rec); byId[id]=1; byName[nk]=1;
    }
    try{ var d = JSON.parse(lget('fae-dashboard-data')); (d && d.members || []).forEach(function(m){ push(m,'court','dashboard'); }); }catch(e){}
    try{ (JSON.parse(lget('fae-members-v1'))||[]).forEach(function(m){ push(m,'pickleball','sync'); }); }catch(e){}
    try{ (JSON.parse(lget('fae-registry-members-v1'))||[]).forEach(function(m){ push(m, m.category||'member','registry'); }); }catch(e){}
    out.sort(function(a,b){ return String(a.name).localeCompare(String(b.name)); });
    return out;
  }
  /* keep a flat registry copy so the roster survives a dashboard reset and can be
     exported to the data/ folder as the master list. */
  function saveMemberRegistry(list){
    try{ lset('fae-registry-members-v1', JSON.stringify(list || allMembers())); return true; }catch(e){ return false; }
  }

  /* ---------- daily task tickets (employee time in / out + what got done) ---------- */
  var TASK_KEY = 'fae-tasks-v1';
  function tasks(){ try{ return JSON.parse(lget(TASK_KEY)) || []; }catch(e){ return []; } }
  function tasksSave(a){ return lset(TASK_KEY, JSON.stringify(a)); }
  function taskSave(t){
    var a = tasks(), i = -1;
    for(var k=0;k<a.length;k++){ if(a[k].id===t.id){ i=k; break; } }
    if(i>=0) a[i]=t; else a.push(t);
    tasksSave(a); return t;
  }
  /* local business day, not UTC — a 9pm ticket in Lipa must not be stamped tomorrow */
  function taskId(){
    var d = new Date(), p = function(n){ return (n<10?'0':'') + n; };
    return 'TKT-' + d.getFullYear() + p(d.getMonth()+1) + p(d.getDate())
         + '-' + Math.random().toString(36).slice(2,6).toUpperCase();
  }
  function hoursBetween(a,b){
    if(!a||!b) return 0;
    var d = (new Date(b) - new Date(a)) / 36e5;
    return d > 0 ? Math.round(d*100)/100 : 0;
  }

  /* ---------- spreadsheet out ----------
     csv()  → text you can open in Excel / paste into Google Sheets
     xls()  → an .xls Excel opens directly (HTML table flavour, no library)
     sheetPush() → queues an append for the Google Sheet through the sync endpoint */
  function csvCell(v){
    var s = v==null ? '' : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s;
  }
  function csv(rows, headers){
    if(!rows || !rows.length) return '';
    var h = headers || Object.keys(rows[0]);
    return [h.join(',')].concat(rows.map(function(r){
      return h.map(function(k){ return csvCell(r[k]); }).join(',');
    })).join('\r\n');
  }
  function xls(rows, headers, sheetName){
    var h = headers || (rows.length ? Object.keys(rows[0]) : []);
    function esc(v){ return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
    return '<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8">'
      + '<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>'
      + '<x:Name>' + esc(sheetName||'FAE') + '</x:Name><x:WorksheetOptions><x:DisplayGridlines/>'
      + '</x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->'
      + '</head><body><table border="1"><thead><tr>'
      + h.map(function(k){ return '<th>' + esc(k) + '</th>'; }).join('')
      + '</tr></thead><tbody>'
      + rows.map(function(r){ return '<tr>' + h.map(function(k){ return '<td>' + esc(r[k]) + '</td>'; }).join('') + '</tr>'; }).join('')
      + '</tbody></table></body></html>';
  }
  function download(filename, text, mime){
    try{
      var b = new Blob([text], { type: mime || 'text/plain;charset=utf-8' });
      var u = URL.createObjectURL(b), a = document.createElement('a');
      a.href = u; a.download = filename; document.body.appendChild(a); a.click();
      setTimeout(function(){ URL.revokeObjectURL(u); a.remove(); }, 400);
      return true;
    }catch(e){ return false; }
  }
  /* Save straight into the command-center data/ folder when the browser supports
     the File System Access API (Chrome/Edge over http://). Falls back to a normal
     download, which lands in Downloads — move it into data/ yourself. */
  function saveToFolder(filename, text, mime){
    try{
      if(w.showSaveFilePicker){
        return w.showSaveFilePicker({ suggestedName: filename })
          .then(function(h){ return h.createWritable(); })
          .then(function(s){ return s.write(new Blob([text], { type: mime || 'text/plain' })).then(function(){ return s.close(); }); })
          .then(function(){ return { saved:true, picker:true }; })
          .catch(function(){ download(filename, text, mime); return { saved:true, picker:false }; });
      }
    }catch(e){}
    download(filename, text, mime);
    return Promise.resolve({ saved:true, picker:false });
  }
  /* ---------- office Wi-Fi receiver (fae-server.py) ----------
     When the Command Center is served by START-COMMAND-CENTER-WIFI.bat, the
     office PC itself accepts submissions at /fae-inbox and files them into
     data\. A phone on the same Wi-Fi therefore needs no internet, no Google
     account and no endpoint — it just posts back to where the page came from. */
  function localInbox(){
    try{
      if(location.protocol === 'http:' || location.protocol === 'https:') return location.origin + '/fae-inbox';
    }catch(e){}
    return '';
  }
  /* Is the office receiver actually running (vs. a plain file server)?
     Resolves with the ping object — {server,port,codeRequired} — or false. */
  function officeOnline(){
    var url = localInbox();
    if(!url) return Promise.resolve(false);
    return fetch(url.replace('/fae-inbox','/fae-ping'), { cache:'no-store' })
      .then(function(r){ return r.ok ? r.json() : false; })
      .then(function(j){ return (j && j.server === 'fae') ? j : false; })
      .catch(function(){ return false; });
  }
  /* Send one item the best way available, in this order:
       1. the office PC on this Wi-Fi   → {via:'office'}
       2. the online endpoint, if set   → {via:'online'}
       3. the offline outbox            → {via:'queued'}
     Always resolves; a submission is never lost, only delayed. */
  function staffCode(){ return lget('fae-staff-code') || ''; }
  function setStaffCode(c){ return lset('fae-staff-code', String(c||'').trim()); }
  function deliver(item){
    var url = localInbox();
    var tryLocal = url
      ? fetch(url, { method:'POST',
                     headers:{ 'Content-Type':'application/json', 'X-FAE-Code': staffCode() },
                     body:JSON.stringify(item) })
          .then(function(r){ return r.ok ? true : (r.status===403 ? 'code' : false); })
          .catch(function(){ return false; })
      : Promise.resolve(false);
    return tryLocal.then(function(okLocal){
      if(okLocal === 'code') return { via:'rejected', reason:'code' };   /* wrong office code */
      if(okLocal) return { via:'office' };
      outboxAdd(item);
      var s = syncCfg();
      if(s.enabled && s.endpoint){
        return pushOutbox().then(function(r){ return { via:(r && r.sent) ? 'online' : 'queued' }; });
      }
      return { via:'queued' };
    });
  }
  /* Office side: read back everything the phones have sent. */
  function pullInbox(since){
    var url = localInbox();
    if(!url) return Promise.resolve({ tickets:[], off:true });
    return fetch(url + (since ? ('?since=' + encodeURIComponent(since)) : ''), { cache:'no-store' })
      .then(function(r){ return r.ok ? r.json() : { tickets:[] }; })
      .catch(function(){ return { tickets:[], off:true }; });
  }

  /* Queue rows for the Google Sheet. They sit in the outbox until an endpoint is
     configured in Settings, then push with the rest. Nothing is sent silently. */
  function sheetPush(sheetTab, rows){
    if(!rows || !rows.length) return 0;
    outboxAdd({ type:'sheet_append', sheet:sheetTab, rows:rows, ts:new Date().toISOString() });
    return rows.length;
  }


  /* ---------- visitors: walk-in registration and who is in the building -------
     A HOUSEHOLD is one adult plus the youth they are responsible for. The adult
     registers once (QR by the door), then anyone in that household can be
     checked in and out by name. Keeping youth under an adult is what lets the
     front desk answer "whose child is this?" without a second system.

     A household record:
       { id, adult:{name,phone,email,address,emergency,emergencyPhone},
         dependents:[{pid,name,age,notes}], consent:true, createdAt, source }
     Every person (the adult too) carries a pid so check-ins point at a person,
     never at a name that might be duplicated. */
  var VISITOR_KEY = 'fae-visitors-v1', CHECKIN_KEY = 'fae-checkins-v1';

  function visitors(){ try{ return JSON.parse(lget(VISITOR_KEY)) || []; }catch(e){ return []; } }
  function visitorsSave(a){ return lset(VISITOR_KEY, JSON.stringify(a||[])); }
  function visitorId(){
    var d = new Date(), p = function(n){ return (n<10?'0':'') + n; };
    return 'HH-' + d.getFullYear() + p(d.getMonth()+1) + p(d.getDate())
         + '-' + Math.random().toString(36).slice(2,6).toUpperCase();
  }
  function personId(){ return 'P-' + Math.random().toString(36).slice(2,8).toUpperCase(); }
  /* save or update one household; returns the stored record */
  function visitorSave(h){
    if(!h) return null;
    if(!h.id) h.id = visitorId();
    if(!h.createdAt) h.createdAt = new Date().toISOString();
    h.updatedAt = new Date().toISOString();
    if(h.adult && !h.adult.pid) h.adult.pid = personId();
    (h.dependents||[]).forEach(function(d){ if(!d.pid) d.pid = personId(); });
    var a = visitors(), i = -1;
    for(var k=0;k<a.length;k++){ if(a[k].id === h.id){ i = k; break; } }
    if(i >= 0) a[i] = h; else a.push(h);
    visitorsSave(a);
    return h;
  }
  /* flatten a household into the people you can actually check in */
  function householdPeople(h){
    if(!h) return [];
    var out = [];
    if(h.adult && h.adult.name) out.push({ pid:h.adult.pid, hid:h.id, name:h.adult.name, role:'adult', phone:h.adult.phone||'' });
    (h.dependents||[]).forEach(function(d){
      if(d && d.name) out.push({ pid:d.pid, hid:h.id, name:d.name, role:'youth', age:d.age||'', guardian:(h.adult||{}).name||'' });
    });
    return out;
  }
  /* everyone registered on this device, ready to search */
  function allPeople(){
    var out = [];
    visitors().forEach(function(h){ out = out.concat(householdPeople(h)); });
    return out.sort(function(a,b){ return String(a.name).localeCompare(String(b.name)); });
  }
  function findHousehold(id){
    var a = visitors();
    for(var i=0;i<a.length;i++){ if(a[i].id === id) return a[i]; }
    return null;
  }
  /* a household can also be found by the adult's phone, so a returning family
     does not end up registered three times */
  /* Philippine mobiles get written every possible way: 0917 555 1234,
     +63 917 555 1234, 63917-555-1234, 9175551234. All of those are the same
     person, so squash them to one form before comparing - otherwise a family
     that types it differently on their second visit gets registered twice. */
  function normPhone(phone){
    var p = String(phone||'').replace(/\D/g,'');
    if(p.indexOf('63') === 0 && p.length === 12) p = '0' + p.slice(2);   /* +639xx… -> 09xx… */
    else if(p.length === 10 && p.indexOf('9') === 0) p = '0' + p;        /* 9xx…    -> 09xx… */
    return p;
  }
  function findByPhone(phone){
    var p = normPhone(phone);
    if(p.length < 7) return null;
    var a = visitors();
    for(var i=0;i<a.length;i++){
      if(normPhone((a[i].adult||{}).phone) === p) return a[i];
    }
    return null;
  }

  /* ---------- check in / check out ----------
     One row per movement. Who is inside is worked out by replaying the day, so a
     missed check-out never corrupts a stored count. */
  function checkins(){ try{ return JSON.parse(lget(CHECKIN_KEY)) || []; }catch(e){ return []; } }
  function checkinsSave(a){ return lset(CHECKIN_KEY, JSON.stringify(a||[])); }
  /* Blank the identity on a person's movements without deleting the rows: the
     count of who was in the building at a given time still matters for safety
     and incident review, but after an erasure request the NAME must not remain. */
  function redactPerson(pid){
    var a = checkins(), n = 0;
    a.forEach(function(c){
      if(c.pid === pid){
        c.name = '[erased]'; c.guardian = ''; c.voided = true; c.redactedAt = new Date().toISOString();
        n++;
      }
    });
    if(n) checkinsSave(a);
    return n;
  }
  function checkinAdd(rec){
    var a = checkins();
    rec.id = rec.id || ('CK-' + Date.now() + '-' + Math.random().toString(36).slice(2,5).toUpperCase());
    rec.ts = rec.ts || new Date().toISOString();
    rec.day = rec.day || localDay();
    a.push(rec);
    checkinsSave(a);
    return rec;
  }
  function localDay(d){
    d = d || new Date();
    var p = function(n){ return (n<10?'0':'') + n; };
    return d.getFullYear() + '-' + p(d.getMonth()+1) + '-' + p(d.getDate());
  }
  /* Who is in the building right now: last movement of the day per person. */
  function whoIsIn(day){
    day = day || localDay();
    var last = {};
    checkins().forEach(function(c){
      if(c.day !== day || c.voided) return;
      var cur = last[c.pid];
      if(!cur || c.ts >= cur.ts) last[c.pid] = c;
    });
    var out = [];
    Object.keys(last).forEach(function(pid){ if(last[pid].dir === 'in') out.push(last[pid]); });
    return out.sort(function(a,b){ return String(a.name).localeCompare(String(b.name)); });
  }
  function lastDirection(pid, day){
    day = day || localDay();
    var found = null;
    checkins().forEach(function(c){
      if(c.pid !== pid || c.day !== day || c.voided) return;
      if(!found || c.ts >= found.ts) found = c;
    });
    return found ? found.dir : 'out';
  }

  /* ---------- undo trail ----------
     Deleting a record must leave a footprint. Every removal is written here with
     what it was and who removed it, so a wrong charge can be corrected without
     the correction itself being invisible. */
  var VOID_KEY = 'fae-voids-v1';
  function voids(){ try{ return JSON.parse(lget(VOID_KEY)) || []; }catch(e){ return []; } }
  function logVoid(rec){
    var a = voids();
    a.push({
      id: 'VD-' + Date.now() + '-' + Math.random().toString(36).slice(2,5),
      kind: rec.kind || 'record', ref: rec.ref || '', summary: rec.summary || '',
      amount: rec.amount == null ? '' : rec.amount,
      by: (session()||{}).role || 'unknown',
      at: new Date().toISOString(), day: localDay(),
      snapshot: rec.snapshot || null, reason: rec.reason || ''
    });
    /* The trail cannot grow forever, but the entries that matter legally - an
       erasure, a retention purge - must never be pushed out by a run of routine
       corrections. Trim only the ordinary ones. */
    if(a.length > 1200){
      var keep = a.filter(function(x){ return /erasure|purge|household/i.test(x.kind || ''); });
      var rest = a.filter(function(x){ return !/erasure|purge|household/i.test(x.kind || ''); });
      a = keep.concat(rest.slice(-(1200 - keep.length > 200 ? 1200 - keep.length : 200)));
      a.sort(function(x, y){ return String(x.at).localeCompare(String(y.at)); });
    }
    lset(VOID_KEY, JSON.stringify(a));
    return a[a.length-1];
  }

  /* ---------- program income ledger (one shared feed) ----------
     FAEBASKETBALL / FAEVOLLEYBALL money — training + tournament fees collected
     through the programs system. One key every page reads and writes, so a
     collection recorded at the tournament checkout shows up on the dashboard
     cash flow and anywhere else that asks. Kept separate from court/desk takings
     (fae-takepayment-log) so program income is its own section and never
     double-counts. */
  var INCOME_KEY = 'fae-program-income-v1';
  function income(){ try{ return JSON.parse(lget(INCOME_KEY)) || []; }catch(e){ return []; } }
  function incomeSave(a){ return lset(INCOME_KEY, JSON.stringify(a || [])); }
  function incomeAdd(rec){
    var a = income();
    var e = {
      id: 'INC-' + Date.now() + '-' + Math.random().toString(36).slice(2,5),
      program: rec.program === 'volleyball' ? 'volleyball' : 'basketball',
      category: rec.category || 'Program',      /* e.g. "Tournament · Batch 24", "Training" */
      label: rec.label || '',                   /* player / payer, free text */
      amount: +rec.amount || 0,
      method: rec.method || 'Cash',             /* Cash | GCash | Mixed */
      ref: rec.ref || '',                       /* batch / invoice, to trace it back */
      by: (session() || {}).role || 'unknown',
      ts: rec.ts || new Date().toISOString(),
      day: rec.ts ? String(rec.ts).slice(0,10) : localDay()
    };
    a.push(e); incomeSave(a); return e;
  }
  function incomeVoid(id, reason){
    var a = income(), i = a.map(function(x){ return x.id; }).indexOf(id);
    if(i < 0) return false;
    var e = a[i];
    try{ logVoid({ kind:'income', ref:e.id, amount:e.amount,
      summary:e.program + ' income ' + e.category + ' ' + peso(e.amount), reason:reason||'', snapshot:e }); }catch(x){}
    a.splice(i,1); incomeSave(a); return true;
  }
  function incomeTotals(){
    var t = { total:0, cash:0, gcash:0, basketball:0, volleyball:0, byCat:{}, count:0 };
    income().forEach(function(e){
      t.total += e.amount; t.count++;
      if(/gcash/i.test(e.method)) t.gcash += e.amount; else t.cash += e.amount;
      if(e.program === 'volleyball') t.volleyball += e.amount; else t.basketball += e.amount;
      var k = (e.program === 'volleyball' ? 'FAEVOLLEYBALL' : 'FAEBASKETBALL') + ' · ' + e.category;
      t.byCat[k] = (t.byCat[k] || 0) + e.amount;
    });
    return t;
  }


  /* ---------- FilAm Elite programs: batches, players, teams, tournaments ------
     The written spec (FAEPROGRAMS/CLAUDE_PROGRAM_SPEC.md) describes this as a
     Postgres schema. The Command Center has no database and no build step, so
     the same shape is kept here as plain records:

       Parent  -> already exists as a visitor HOUSEHOLD (adult + dependents).
                  A player therefore points at a household + a person id, and a
                  child who signs in at the door is the SAME record as the player
                  on the roster. One person, one file, whichever door they came in.
       Batch   -> 8 weeks, 5 a year. Weeks 1-5 skills, 6 open runs,
                  7 kids tournament, 8 teens tournament.
       Team    -> belongs to a batch, holds a roster of player ids.
       Tournament -> belongs to a batch, per age group and format.

     Everything is stored under one key so a batch can be exported, backed up and
     restored as a unit. */
  var PROG_KEY = 'fae-programs-v1';

  var PROGRAM_SPEC = {
    basketball: {
      label: 'FilAm Elite Basketball',
      weeksPerBatch: 8, batchesPerYear: 5,
      divisions: {
        kids:  { label:'Kids',  start:'09:00', end:'11:00' },
        teens: { label:'Teens', start:'11:00', end:'13:00' }
      },
      days: ['Saturday','Sunday'],
      weeks: [
        { n:1, kind:'skills',     label:'Skills training' },
        { n:2, kind:'skills',     label:'Skills training' },
        { n:3, kind:'skills',     label:'Skills training' },
        { n:4, kind:'skills',     label:'Skills training' },
        { n:5, kind:'skills',     label:'Skills training' },
        { n:6, kind:'openrun',    label:'Open runs - evaluation & team balancing' },
        { n:7, kind:'tournament', label:'Kids tournament',  division:'kids',  start:'08:00', end:'16:00' },
        { n:8, kind:'tournament', label:'Teens tournament', division:'teens', start:'08:00', end:'16:00' }
      ],
      formats: {
        '5v5': { label:'5v5', structure:'Double elimination', rules:'FIBA', period:'10-min quarters', rosterMin:8,  rosterMax:12 },
        '3v3': { label:'3x3', structure:'Double round-robin', rules:'FIBA 3x3', period:'-',            rosterMin:3,  rosterMax:5, teamsMin:2, teamsMax:4, optional:true }
      }
    },
    volleyball: {
      label: 'FilAm Elite Volleyball',
      weeksPerBatch: 8, batchesPerYear: 5,
      divisions: {
        kids:  { label:'Kids',  start:'09:00', end:'11:00' },
        teens: { label:'Teens', start:'11:00', end:'13:00' }
      },
      days: ['Saturday','Sunday'],
      /* the spec clones the basketball frame but splits each weekend into a
         skills session and a games session */
      sessions: [
        { n:1, label:'Session 1 - skills training', hours:2 },
        { n:2, label:'Session 2 - practice games / scrimmages' }
      ],
      weeks: [
        { n:1, kind:'skills',     label:'Skills + practice games' },
        { n:2, kind:'skills',     label:'Skills + practice games' },
        { n:3, kind:'skills',     label:'Skills + practice games' },
        { n:4, kind:'skills',     label:'Skills + practice games' },
        { n:5, kind:'skills',     label:'Skills + practice games' },
        { n:6, kind:'openrun',    label:'Scrimmages - evaluation & team balancing' },
        { n:7, kind:'tournament', label:'Kids tournament',  division:'kids',  start:'08:00', end:'16:00' },
        { n:8, kind:'tournament', label:'Teens tournament', division:'teens', start:'08:00', end:'16:00' }
      ],
      formats: {
        '6v6': { label:'6v6', structure:'Double elimination', rules:'FIVB', period:'Best of 3 sets', rosterMin:8, rosterMax:12 }
      }
    }
  };

  function programs(){
    try{ var d = JSON.parse(lget(PROG_KEY)); if(d && d.batches) return d; }catch(e){}
    return { batches:[], players:[], teams:[], rosters:[], tournaments:[] };
  }
  function programsSave(d){ return lset(PROG_KEY, JSON.stringify(d || programs())); }
  function progId(prefix){
    return prefix + '-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2,5).toUpperCase();
  }

  /* ---- batches ---- */
  function batchCreate(program, batchNumber, startDate){
    var d = programs();
    var start = new Date(startDate);
    var end = new Date(start.getTime() + (8 * 7 - 1) * 864e5);   /* 8 weeks inclusive */
    var b = {
      id: progId('B'), program: program, batchNumber: +batchNumber || (d.batches.filter(function(x){ return x.program === program; }).length + 1),
      startDate: localDay(start), endDate: localDay(end),
      status: 'active', createdAt: new Date().toISOString()
    };
    d.batches.push(b);
    programsSave(d);
    return b;
  }
  /* The eight weeks with real dates, so the front desk can see which weekend is
     a training day and which is a tournament without counting on their fingers. */
  function batchWeeks(batch){
    if(!batch) return [];
    var spec = PROGRAM_SPEC[batch.program] || PROGRAM_SPEC.basketball;
    var start = new Date(batch.startDate + 'T00:00:00');
    return spec.weeks.map(function(w){
      var from = new Date(start.getTime() + (w.n - 1) * 7 * 864e5);
      var to = new Date(from.getTime() + 6 * 864e5);
      return {
        n: w.n, kind: w.kind, label: w.label, division: w.division || null,
        start: w.start || null, end: w.end || null,
        from: localDay(from), to: localDay(to),
        current: localDay() >= localDay(from) && localDay() <= localDay(to)
      };
    });
  }
  function batchCurrentWeek(batch){
    var w = batchWeeks(batch).filter(function(x){ return x.current; });
    return w.length ? w[0] : null;
  }
  function batchesFor(program){
    return programs().batches.filter(function(b){ return !program || b.program === program; })
      .sort(function(a,b){ return String(b.startDate).localeCompare(String(a.startDate)); });
  }

  /* ---- players ----
     A player may be linked to a household (hid + pid) so the roster and the
     door log are the same person. Standalone players are allowed too, because
     enrolment often happens before anyone signs in at the door. */
  function playerSave(p){
    var d = programs();
    if(!p.id) p.id = progId('P');
    if(!p.createdAt) p.createdAt = new Date().toISOString();
    p.updatedAt = new Date().toISOString();
    if(p.isActive === undefined) p.isActive = true;
    /* derive name parts for parent matching, without clobbering anything set */
    if(p.fullName){
      var _np = parseName(p.fullName);
      if(p.firstName  === undefined) p.firstName  = _np.first;
      if(p.middleName === undefined) p.middleName = _np.middle;
      if(p.lastName   === undefined) p.lastName   = _np.last;
      if(p.suffix     === undefined) p.suffix     = _np.suffix;
    }
    if(p.parentHid      === undefined) p.parentHid = null;   /* linked parent/guardian household */
    if(p.parentVerified === undefined) p.parentVerified = false;
    var i = -1;
    for(var k=0;k<d.players.length;k++){ if(d.players[k].id === p.id){ i = k; break; } }
    if(i >= 0) d.players[i] = p; else d.players.push(p);
    programsSave(d);
    return p;
  }
  function playersFor(program, ageGroup){
    return programs().players.filter(function(p){
      if(p.isActive === false) return false;
      if(program && p.program && p.program !== program) return false;
      if(ageGroup && p.ageGroup !== ageGroup) return false;
      return true;
    }).sort(function(a,b){ return String(a.fullName).localeCompare(String(b.fullName)); });
  }
  /* Work out kids vs teens from a date of birth. 12 and under is kids, matching
     the two training slots in the spec. */
  function ageGroupFor(dob){
    if(!dob) return 'kids';
    var b = new Date(dob), now = new Date();
    var age = now.getFullYear() - b.getFullYear();
    var m = now.getMonth() - b.getMonth();
    if(m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
    return age <= 12 ? 'kids' : 'teens';
  }
  function playerAge(p){
    if(!p || !p.dob) return '';
    var b = new Date(p.dob), now = new Date();
    var age = now.getFullYear() - b.getFullYear();
    var m = now.getMonth() - b.getMonth();
    if(m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
    return age >= 0 && age < 100 ? age : '';
  }

  /* ---- teams and rosters ---- */
  function teamCreate(batchId, name){
    var d = programs();
    var t = { id: progId('T'), batchId: batchId, name: name || 'Team', createdAt: new Date().toISOString() };
    d.teams.push(t);
    programsSave(d);
    return t;
  }
  function teamsFor(batchId){
    return programs().teams.filter(function(t){ return t.batchId === batchId; });
  }
  function rosterFor(teamId){
    var d = programs();
    var ids = d.rosters.filter(function(r){ return r.teamId === teamId; }).map(function(r){ return r.playerId; });
    return ids.map(function(id){
      for(var i=0;i<d.players.length;i++){ if(d.players[i].id === id) return d.players[i]; }
      return null;
    }).filter(Boolean);
  }
  /* Replace a batch's rosters wholesale. The drafting board hands over the final
     picture, so a partial save can never leave a player on two teams. */
  function rostersSet(batchId, assignments){
    var d = programs();
    var teamIds = d.teams.filter(function(t){ return t.batchId === batchId; }).map(function(t){ return t.id; });
    d.rosters = d.rosters.filter(function(r){ return teamIds.indexOf(r.teamId) < 0; });
    (assignments || []).forEach(function(a){
      (a.playerIds || []).forEach(function(pid){
        d.rosters.push({ id: progId('R'), teamId: a.teamId, playerId: pid });
      });
    });
    programsSave(d);
    return d.rosters.length;
  }
  function undraftedFor(batchId, program, ageGroup){
    var d = programs();
    var teamIds = d.teams.filter(function(t){ return t.batchId === batchId; }).map(function(t){ return t.id; });
    var taken = {};
    d.rosters.forEach(function(r){ if(teamIds.indexOf(r.teamId) >= 0) taken[r.playerId] = 1; });
    return playersFor(program, ageGroup).filter(function(p){ return !taken[p.id]; });
  }
  /* Roster legality against the format in the spec - the front desk should not
     have to remember that 5v5 needs at least 8 players. */
  function rosterCheck(program, format, count){
    var spec = (PROGRAM_SPEC[program] || {}).formats || {};
    var f = spec[format];
    if(!f) return { ok:true, note:'' };
    if(count < f.rosterMin) return { ok:false, note:'needs ' + (f.rosterMin - count) + ' more (min ' + f.rosterMin + ')' };
    if(count > f.rosterMax) return { ok:false, note:(count - f.rosterMax) + ' over the max of ' + f.rosterMax };
    return { ok:true, note:'legal (' + f.rosterMin + '-' + f.rosterMax + ')' };
  }

  /* ---- tournaments ---- */
  function tournamentSave(t){
    var d = programs();
    if(!t.id) t.id = progId('TN');
    var i = -1;
    for(var k=0;k<d.tournaments.length;k++){ if(d.tournaments[k].id === t.id){ i = k; break; } }
    if(i >= 0) d.tournaments[i] = t; else d.tournaments.push(t);
    programsSave(d);
    return t;
  }
  function tournamentsFor(batchId){
    return programs().tournaments.filter(function(t){ return t.batchId === batchId; });
  }

  /* ---- flat rows, for Excel in and out ---- */
  function playerRows(program){
    var d = programs();
    return playersFor(program).map(function(p){
      var teamName = '';
      for(var i=0;i<d.rosters.length;i++){
        if(d.rosters[i].playerId === p.id){
          for(var j=0;j<d.teams.length;j++){ if(d.teams[j].id === d.rosters[i].teamId) teamName = d.teams[j].name; }
        }
      }
      return {
        'Player ID': p.id, 'Player Name': p.fullName || '', 'Program': p.program || '',
        'Age Group': (p.ageGroup || '').toUpperCase(), 'DOB': p.dob || '', 'Age': playerAge(p),
        'Jersey Size': p.jerseySize || '', 'Jersey #': p.preferredNumber === undefined ? '' : p.preferredNumber,
        'Team': teamName,
        'Parent Name': p.parentName || '', 'Parent Phone': p.parentPhone || '',
        'Parent Email': p.parentEmail || '', 'Address': p.address || '',
        'Category': p.category || '', 'Jersey Name': p.jerseyName || '', 'Uniform': p.uniformSize || '',
        'Total Due': p.billing && p.billing.due != null ? p.billing.due : '',
        'Total Paid': p.billing && p.billing.paid != null ? p.billing.paid : '',
        'Balance': p.billing && p.billing.balance != null ? p.billing.balance : '',
        'Status': p.billing ? (p.billing.status || '') : '',
        'Tournament Fee': p.billing ? (p.billing.tfLabel || '') : '',
        'Playing': p.playing === false ? 'no' : 'yes', 'Note': p.billing ? (p.billing.note || '') : '',
        'Household': p.hid || '', 'Active': p.isActive === false ? 'no' : 'yes'
      };
    });
  }
  /* Take rows out of a spreadsheet and make players of them. Matches the column
     names in the spec's Excel sheet so an existing file imports unchanged. */
  function playersImport(rows, program){
    var added = 0, updated = 0, skipped = 0;
    (rows || []).forEach(function(r){
      var name = String(r['Player Name'] || r['Name'] || '').trim();
      if(!name){ skipped++; return; }
      var id = String(r['Player ID'] || '').trim();
      var existing = null, all = programs().players;
      for(var i=0;i<all.length;i++){
        if((id && all[i].id === id) ||
           (!id && String(all[i].fullName).toLowerCase() === name.toLowerCase())){ existing = all[i]; break; }
      }
      var dob = r['DOB'] || r['Date of Birth'] || '';
      var p = existing || {};
      p.fullName = name;
      p.program = (String(r['Program'] || program || 'basketball').toLowerCase());
      p.dob = dob ? String(dob).slice(0,10) : (p.dob || '');
      p.ageGroup = String(r['Age Group'] || p.ageGroup || ageGroupFor(p.dob)).toLowerCase();
      p.jerseySize = r['Jersey Size'] || p.jerseySize || '';
      p.preferredNumber = r['Jersey #'] === undefined || r['Jersey #'] === '' ? p.preferredNumber : +r['Jersey #'];
      p.parentName = r['Parent Name'] || p.parentName || '';
      p.parentPhone = r['Parent Phone'] === undefined ? (p.parentPhone || '') : String(r['Parent Phone']);
      p.parentEmail = r['Parent Email'] || p.parentEmail || '';
      p.address = r['Address'] || p.address || '';
      if(existing) updated++; else added++;
      playerSave(p);
    });
    return { added:added, updated:updated, skipped:skipped };
  }
  /* Pull the youth already registered at the door into a program, so a family
     that signed in never has to type their details a second time. */
  function playersFromHouseholds(program){
    var added = 0;
    visitors().forEach(function(h){
      (h.dependents || []).forEach(function(dep){
        if(!dep || !dep.name) return;
        var all = programs().players, exists = false;
        for(var i=0;i<all.length;i++){
          if(all[i].pid === dep.pid || String(all[i].fullName).toLowerCase() === String(dep.name).toLowerCase()){ exists = true; break; }
        }
        if(exists) return;
        var age = +dep.age || 0;
        playerSave({
          fullName: dep.name, program: program || 'basketball',
          ageGroup: age && age <= 12 ? 'kids' : (age ? 'teens' : 'kids'),
          dob: '', jerseySize: '', preferredNumber: undefined,
          hid: h.id, pid: dep.pid,
          parentName: (h.adult || {}).name || '', parentPhone: (h.adult || {}).phone || '',
          parentEmail: (h.adult || {}).email || '', address: (h.adult || {}).address || '',
          notes: dep.notes || '', source: 'door register'
        });
        added++;
      });
    });
    return added;
  }

  /* Member records arrive from several sources (dashboard seed, the website
     sync workbook, a walk-in conversion) and each spells the name field
     differently. One coalescing reader so a dropdown or lookup is never blank. */
  function memberName(m){
    if(!m) return '';
    var n = m.name || m.fullName || m.Name || m.memberName
         || (m.adult && m.adult.name) || m.renter || '';
    n = String(n).trim();
    return n || (m.id ? ('Member ' + m.id) : '');
  }

  /* ---- parent linking (FilAm Elite) ----
     Split a Filipino-style name into parts, best effort, and match a player to a
     parent HOUSEHOLD by surname so the roster and the family account are one
     record. In PH naming the middle name is usually the mother's maiden surname
     and the last name the father's, so a match on either counts. Re-runnable. */
  function normName(x){ return String(x||'').toLowerCase().replace(/[^a-z]/g,''); }
  function parseName(full){
    var s = String(full||'').replace(/\s+/g,' ').trim();
    if(!s) return { first:'', middle:'', last:'', suffix:'' };
    var toks = s.split(' '), suffix = '';
    if(toks.length > 1 && /^(jr|sr|ii|iii|iv|v)\.?$/i.test(toks[toks.length-1])){
      suffix = toks.pop().replace(/\.$/,'');
    }
    var particles = ['de','del','dela','delos','delas','san','santa','santo','los','las','da','di','du','van','von'];
    var last = toks.pop() || '';
    while(toks.length > 1 && particles.indexOf(toks[toks.length-1].toLowerCase()) >= 0){
      last = toks.pop() + ' ' + last;
    }
    var middle = '';
    if(toks.length >= 2){
      var t = toks[toks.length-1];
      if(/^[A-Za-z]\.?$/.test(t)) middle = toks.pop().replace(/\.$/,'');
      else middle = toks.pop();
    }
    return { first: toks.join(' '), middle: middle, last: last, suffix: suffix };
  }
  function linkPlayersToParents(){
    var d = programs(), linked = 0;
    var adults = visitors().map(function(h){
      var a = h.adult || {}; return { hid: h.id, name: a.name || '', last: normName(parseName(a.name||'').last) };
    }).filter(function(a){ return a.last; });
    if(!adults.length) return 0;
    d.players.forEach(function(p){
      if(p.parentHid) return;
      var pl = normName(p.lastName   || parseName(p.fullName).last);
      var pm = normName(p.middleName || parseName(p.fullName).middle);
      var hits = adults.filter(function(a){ return a.last === pl || (pm && a.last === pm); });
      if(hits.length === 1){
        p.parentHid = hits[0].hid;
        if(!p.parentName) p.parentName = hits[0].name;
        p.parentVerified = true; p.parentMatch = 'surname';
        linked++;
      }
    });
    if(linked) programsSave(d);
    return linked;
  }

  /* ---------- double-elimination bracket (tournament matchmaking) ------------
     Pure structure generator + resolver, no UI. Seeds N teams into a standard
     bracket (padded to a power of two with BYEs), builds the winners bracket,
     the losers bracket (classic minor/major drop pattern) and the grand final
     (+ a reset game if the losers-bracket team wins game one). A match records
     only which SIDE won ('a'|'b'); deResolve() walks the feeders to say who is
     actually in each slot, auto-advancing anyone drawn against a BYE. Needs 3+
     real teams (2 teams isn't a bracket). Kept format-agnostic so kids or teens,
     5v5 or 3x3, all reuse it. */
  function deSeedOrder(P){
    var r = [1,2];
    while(r.length < P){ var n = r.length*2, o = []; for(var i=0;i<r.length;i++){ o.push(r[i]); o.push(n+1-r[i]); } r = o; }
    return r;
  }
  function deBracket(teams){
    var real = (teams||[]).map(function(t,i){ return { id: t.id || ('T'+i), name: t.name || ('Team '+(i+1)), seed: i+1 }; });
    if(real.length < 3) return null;                     /* a bracket needs 3+ */
    var P = 1; while(P < real.length) P *= 2;
    var order = deSeedOrder(P);
    var slots = order.map(function(s){ return s <= real.length ? real[s-1] : { bye:true, name:'BYE' }; });
    var all = [];
    function mk(bk,rd,sl,a,b){ var m = { id:bk+'-'+rd+'-'+sl, bracket:bk, round:rd, slot:sl, a:a, b:b, winner:null }; all.push(m); return m; }
    function ref(slot){ return slot.bye ? { bye:true } : { team:slot }; }

    /* winners bracket */
    var wb = [], r1 = [];
    for(var i=0;i<P;i+=2) r1.push(mk('WB',1,r1.length+1, ref(slots[i]), ref(slots[i+1])));
    wb.push(r1);
    var rd = 2, prev = r1;
    while(prev.length > 1){
      var cur = [];
      for(var j=0;j<prev.length;j+=2) cur.push(mk('WB',rd,cur.length+1, {from:prev[j].id,take:'W'}, {from:prev[j+1].id,take:'W'}));
      wb.push(cur); prev = cur; rd++;
    }
    /* losers bracket: R1 pairs WB round-1 losers, then alternate major/minor */
    var lb = [], lb1 = [], w1 = wb[0];
    for(var k=0;k<w1.length;k+=2) lb1.push(mk('LB',1,lb1.length+1, {from:w1[k].id,take:'L'}, {from:w1[k+1].id,take:'L'}));
    lb.push(lb1);
    var lbr = 2;
    for(var wr=2; wr<wb.length+1; wr++){
      var wbr = wb[wr-1], pl = lb[lb.length-1], major = [];
      for(var m2=0;m2<wbr.length;m2++) major.push(mk('LB',lbr,m2+1, {from:pl[m2].id,take:'W'}, {from:wbr[m2].id,take:'L'}));
      lb.push(major); lbr++;
      if(major.length > 1){
        var minor = [];
        for(var n2=0;n2<major.length;n2+=2) minor.push(mk('LB',lbr,minor.length+1, {from:major[n2].id,take:'W'}, {from:major[n2+1].id,take:'W'}));
        lb.push(minor); lbr++;
      }
    }
    var wbFinal = wb[wb.length-1][0], lbFinal = lb[lb.length-1][0];
    var gf1 = mk('GF',1,1, {from:wbFinal.id,take:'W'}, {from:lbFinal.id,take:'W'});
    /* game 2 only matters when the LB team (side b) takes game 1 */
    mk('GF',2,1, {from:gf1.id,take:'W'}, {from:gf1.id,take:'L'});
    return { teams: real, P: P, format: 'double-elim', matches: all };
  }
  /* Walk feeders → who is in each slot and who won. Auto-advances BYE matchups.
     Returns { matchId: { a, b, winner, loser, auto } }. */
  function deResolve(bk){
    var byId = {}; (bk.matches||[]).forEach(function(m){ byId[m.id] = m; });
    var res = {};
    function slotTeam(rf){
      if(!rf) return null;
      if(rf.bye) return { bye:true, name:'BYE' };
      if(rf.team) return rf.team;
      if(rf.from){ var r = resolve(byId[rf.from]); return rf.take==='W' ? r.winner : r.loser; }
      return null;
    }
    function resolve(m){
      if(!m) return {};
      if(res[m.id]) return res[m.id];
      var a = slotTeam(m.a), b = slotTeam(m.b), win=null, los=null, auto=false;
      var aBye = a && a.bye, bBye = b && b.bye;
      if(aBye && b && !bBye){ win=b; los=a; auto=true; }
      else if(bBye && a && !aBye){ win=a; los=b; auto=true; }
      else if(aBye && bBye){ win={bye:true,name:'BYE'}; los={bye:true,name:'BYE'}; auto=true; }
      else if(m.winner==='a'){ win=a; los=b; }
      else if(m.winner==='b'){ win=b; los=a; }
      res[m.id] = { a:a, b:b, winner:win, loser:los, auto:auto };
      /* the reset game is dead once the WB team wins game one */
      if(m.bracket==='GF' && m.round===2){
        var g1 = res['GF-1-1'];
        if(g1 && g1.winner && g1.a && g1.winner.id===g1.a.id) res[m.id].dead = true;
      }
      return res[m.id];
    }
    (bk.matches||[]).forEach(resolve);
    return res;
  }
  function deSetWinner(bk, matchId, side){
    (bk.matches||[]).forEach(function(m){ if(m.id===matchId) m.winner = side; });
    return bk;
  }
  /* Champion once the grand final is settled, else null. */
  function deChampion(bk){
    var res = deResolve(bk), g1 = res['GF-1-1'], g2 = res['GF-2-1'];
    if(!g1 || !g1.winner) return null;
    var wbSideWonG1 = g1.a && g1.winner.id === g1.a.id;
    if(wbSideWonG1) return g1.winner;                    /* WB team never lost → champ */
    return g2 && g2.winner ? g2.winner : null;           /* reset game decides */
  }

  /* ---------- universal member directory (non-destructive read layer) --------
     ONE person across every activity. Merges the member stores, the visitor
     households (the adult plus the youth under them) and the FilAm Elite
     players by name, so the same human is a single row wherever they came in.
     Minors nest UNDER their guardian whenever the guardian is known, never as a
     loose top-level row. Nothing is written back to the PII stores — the only
     thing this layer saves is the category the office assigns, in its own key. */
  var DIR_CAT_KEY = 'fae-directory-cats-v1';
  var DIR_CATS = {
    'bb-rental': { label:'Basketball Rental',    color:'#D2843B' },
    'vb-rental': { label:'Volleyball Rental',    color:'#4A7FB5' },
    'fae-bb':    { label:'FAE Basketball Batch', color:'#C9A227' },
    'fae-vb':    { label:'FAE Volleyball Batch', color:'#5B9BD5' },
    'pickleball':{ label:'Pickleball',           color:'#3FA66A' },
    'nxgen':     { label:'NXGEN',                color:'#2FA6A0' },
    'other':     { label:'Uncategorized',        color:'#8B8B98' }
  };
  function directoryCats(){
    try{ var c = JSON.parse(lget(DIR_CAT_KEY)); if(c) return { custom:c.custom||[], assign:c.assign||{} }; }catch(e){}
    return { custom:[], assign:{} };
  }
  function directoryCatsSave(c){ return lset(DIR_CAT_KEY, JSON.stringify({ custom:c.custom||[], assign:c.assign||{} })); }
  function directoryAddCat(label){
    label = String(label||'').trim(); if(!label) return '';
    var c = directoryCats(), key = 'c-' + normName(label).slice(0,24);
    if(!key || key==='c-') return '';
    if(!c.custom.some(function(x){ return x.key===key; })){ c.custom.push({ key:key, label:label }); directoryCatsSave(c); }
    return key;
  }
  function directorySetCategory(personKey, catKey){
    var c = directoryCats(); c.assign[personKey] = catKey; return directoryCatsSave(c);
  }
  function directoryCatLabel(key){
    if(DIR_CATS[key]) return DIR_CATS[key].label;
    var f = directoryCats().custom.filter(function(x){ return x.key===key; })[0];
    return f ? f.label : DIR_CATS.other.label;
  }
  /* best-guess bucket before the office overrides it */
  function dirAutoCat(activities, player){
    if(player && player.program==='basketball') return 'fae-bb';
    if(player && player.program==='volleyball') return 'fae-vb';
    if(activities.indexOf('basketball')>=0) return 'bb-rental';
    if(activities.indexOf('volleyball')>=0) return 'vb-rental';
    if(activities.indexOf('pickleball')>=0) return 'pickleball';
    if(activities.indexOf('nxgen')>=0)      return 'nxgen';
    return 'other';
  }
  function directory(){
    var assign = directoryCats().assign, byKey = {};
    function keyOf(name){ return normName(name); }
    function get(name){
      var k = keyOf(name); if(!k) return null;
      if(!byKey[k]) byKey[k] = {
        key:k, id:'', name:String(name).trim(), phone:'', email:'', address:'', photo:'',
        role:'adult', isMinor:false, guardianName:'', guardianKey:'', age:'', nfcUid:'',
        emergency:'', emergencyPhone:'', balance:0, status:'', notes:'',
        activities:[], sources:[], dependents:[], hid:'', _player:null, _member:null
      };
      return byKey[k];
    }
    function fill(p, m){ ['phone','email','address','photo','nfcUid','notes'].forEach(function(f){ if(!p[f] && m[f]) p[f]=m[f]; }); }
    function tag(p,t){ if(t && p.activities.indexOf(t)<0) p.activities.push(t); }
    function src(p,s){ if(s && p.sources.indexOf(s)<0) p.sources.push(s); }

    /* 1) visitor households — adult, then the youth under that adult */
    visitors().forEach(function(h){
      var a = h.adult||{};
      if(a.name){
        var pa = get(a.name);
        if(pa){ pa.role='adult'; fill(pa,{phone:a.phone,email:a.email,address:a.address});
          if(a.emergency && !pa.emergency) pa.emergency=a.emergency;
          if(a.emergencyPhone && !pa.emergencyPhone) pa.emergencyPhone=a.emergencyPhone;
          pa.hid=h.id; src(pa,'household'); tag(pa,'court'); }
      }
      (h.dependents||[]).forEach(function(dep){
        if(!dep || !dep.name) return;
        var pc = get(dep.name); if(!pc) return;
        pc.role='youth'; pc.isMinor=true;
        pc.guardianName = a.name||pc.guardianName; pc.guardianKey = keyOf(a.name);
        if(dep.age) pc.age=dep.age;
        if(dep.notes && !pc.notes) pc.notes=dep.notes;
        src(pc,'household');
      });
    });

    /* 2) FilAm Elite players — linked to a guardian household when we have one */
    programs().players.forEach(function(pl){
      if(pl.isActive===false || !pl.fullName) return;
      var p = get(pl.fullName); if(!p) return;
      p._player = pl;
      fill(p,{phone:pl.parentPhone,email:pl.parentEmail,address:pl.address});
      if(pl.photo && !p.photo) p.photo=pl.photo;
      tag(p, pl.program==='volleyball' ? 'volleyball' : 'basketball');
      src(p,'program');
      if(pl.billing && pl.billing.balance!=null) p.balance = (+pl.billing.balance)||p.balance;
      if(pl.ageGroup==='kids' || pl.isMinor) p.isMinor=true;
      if(pl.parentHid){
        var hh = findHousehold(pl.parentHid);
        if(hh && hh.adult && hh.adult.name){ p.guardianName=hh.adult.name; p.guardianKey=keyOf(hh.adult.name); p.isMinor=true; p.role='youth'; }
      } else if(pl.parentName){
        if(!p.guardianName) p.guardianName=pl.parentName;
        if(!p.guardianKey)  p.guardianKey=keyOf(pl.parentName);
      }
    });

    /* 3) members — dashboard seed + website sync + registry import */
    allMembers().forEach(function(m){
      var p = get(m.name); if(!p) return;
      p._member = m;
      fill(p,{phone:m.phone,email:m.email});
      if(!p.nfcUid && m.nfcUid) p.nfcUid=m.nfcUid;
      if(m.balance && !p.balance) p.balance=+m.balance;
      if(m.status && !p.status) p.status=m.status;
      if(!p.id && m.id) p.id=m.id;
      tag(p, m.category);
      src(p,'member');
    });

    /* assign id + category, then nest minors under a known guardian */
    var all = Object.keys(byKey).map(function(k){ return byKey[k]; });
    all.forEach(function(p){
      if(!p.id) p.id = 'DIR-' + p.key.slice(0,12).toUpperCase();
      p.category = assign[p.key] || dirAutoCat(p.activities, p._player);
    });
    var top = [];
    all.forEach(function(p){
      if(p.guardianKey && byKey[p.guardianKey] && p.guardianKey!==p.key) byKey[p.guardianKey].dependents.push(p);
      else top.push(p);
    });
    top.sort(function(a,b){ return String(a.name).localeCompare(String(b.name)); });
    top.forEach(function(p){ p.dependents.sort(function(a,b){ return String(a.name).localeCompare(String(b.name)); }); });
    return top;
  }

  w.FAE = {
    MASTER_PIN: MASTER_PIN,
    config: config, roles: roles,
    ui: ui, applyMotion: applyMotion,
    cats: CATS, memberCategory: memberCategory, catLabel: catLabel, catColor: catColor, memberName: memberName,
    allMembers: allMembers, saveMemberRegistry: saveMemberRegistry,
    tasks: tasks, tasksSave: tasksSave, taskSave: taskSave, taskId: taskId, hoursBetween: hoursBetween,
    csv: csv, xls: xls, download: download, saveToFolder: saveToFolder, sheetPush: sheetPush,
    localInbox: localInbox, officeOnline: officeOnline, deliver: deliver, pullInbox: pullInbox,
    staffCode: staffCode, setStaffCode: setStaffCode,
    visitors: visitors, visitorsSave: visitorsSave, visitorSave: visitorSave,
    visitorId: visitorId, personId: personId, householdPeople: householdPeople,
    allPeople: allPeople, findHousehold: findHousehold, findByPhone: findByPhone, normPhone: normPhone,
    checkins: checkins, checkinsSave: checkinsSave, checkinAdd: checkinAdd, redactPerson: redactPerson,
    whoIsIn: whoIsIn, lastDirection: lastDirection, localDay: localDay,
    voids: voids, logVoid: logVoid,
    income: income, incomeSave: incomeSave, incomeAdd: incomeAdd, incomeVoid: incomeVoid, incomeTotals: incomeTotals,
    programSpec: PROGRAM_SPEC, programs: programs, programsSave: programsSave,
    batchCreate: batchCreate, batchWeeks: batchWeeks, batchCurrentWeek: batchCurrentWeek, batchesFor: batchesFor,
    playerSave: playerSave, playersFor: playersFor, ageGroupFor: ageGroupFor, playerAge: playerAge,
    teamCreate: teamCreate, teamsFor: teamsFor, rosterFor: rosterFor, rostersSet: rostersSet,
    undraftedFor: undraftedFor, rosterCheck: rosterCheck,
    tournamentSave: tournamentSave, tournamentsFor: tournamentsFor,
    deBracket: deBracket, deResolve: deResolve, deSetWinner: deSetWinner, deChampion: deChampion,
    playerRows: playerRows, playersImport: playersImport, playersFromHouseholds: playersFromHouseholds,
    parseName: parseName, normName: normName, linkPlayersToParents: linkPlayersToParents,
    directory: directory, dirCats: DIR_CATS, directoryCats: directoryCats,
    directoryAddCat: directoryAddCat, directorySetCategory: directorySetCategory, directoryCatLabel: directoryCatLabel,
    syncCfg: syncCfg, outbox: outbox, outboxAdd: outboxAdd, outboxPending: outboxPending,
    pushOutbox: pushOutbox, online: online,
    rate: rate, defRates: DEF_RATES,
    session: session, role: role, setSession: setSession, clearSession: clearSession,
    checkPin: checkPin, isMaster: isMaster, isAdmin: isAdmin, canSeeMoney: canSeeMoney,
    allowedViews: allowedViews, landingView: landingView, masterOnly: MASTER_ONLY,
    peso: peso, money: money
  };
})(window);
