/* ============================================================================
   F.A.E. Motion helpers — optional. Pairs with assets/fae-motion.css.
   <script src="assets/fae-motion.js?v=1"></script>  (after fae-core.js)

   Everything here is additive and guarded: if this file is removed, or if the
   motion level is "off", pages behave exactly as they did before.
   ========================================================================== */
(function (w, d) {
  function level(){
    try{ return d.documentElement.getAttribute('data-motion') || 'full'; }catch(e){ return 'full'; }
  }
  function reduced(){
    try{ return w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; }
  }
  function on(){ return level() !== 'off' && !reduced(); }

  /* ---- count a number up to its value -------------------------------------
     countTo(el, 8420, {prefix:'₱'})  — falls back to setting the text directly
     when motion is off, so the figure is always correct either way. */
  function countTo(el, value, opt){
    opt = opt || {};
    var pre = opt.prefix || '', suf = opt.suffix || '', dec = opt.decimals || 0;
    var fmt = function(n){ return pre + Number(n).toLocaleString(undefined, { minimumFractionDigits:dec, maximumFractionDigits:dec }) + suf; };
    if(!el) return;
    el.classList.add('fae-count');
    var target = Number(value) || 0;
    if(!on() || Math.abs(target) > 1e9){ el.textContent = fmt(target); return; }
    var from = Number(String(el.textContent||'').replace(/[^0-9.-]/g,'')) || 0;
    if(from === target){ el.textContent = fmt(target); return; }
    var dur = opt.duration || 620, t0 = 0;
    function step(ts){
      if(!t0) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur);
      var e = 1 - Math.pow(1 - p, 3);                 /* ease-out cubic */
      el.textContent = fmt(from + (target - from) * e);
      if(p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ---- animate every [data-count] element on the page --------------------- */
  function countAll(root){
    (root || d).querySelectorAll('[data-count]').forEach(function(el){
      var v = el.getAttribute('data-count');
      countTo(el, v, { prefix: el.getAttribute('data-count-prefix') || '', decimals: +(el.getAttribute('data-count-dec')||0) });
    });
  }

  /* ---- reveal children as they scroll into view --------------------------- */
  function reveal(sel){
    if(!on() || !w.IntersectionObserver) return;
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if(en.isIntersecting){ en.target.style.animation = 'faeRise 380ms cubic-bezier(.22,.68,.36,1) both'; io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .05 });
    d.querySelectorAll(sel || '.fae-reveal').forEach(function(el){ io.observe(el); });
  }

  /* ---- re-run the stagger animation after a list is re-rendered ----------- */
  function restagger(el){
    if(!el || !on()) return;
    el.classList.remove('fae-stagger');
    void el.offsetWidth;              /* force reflow so the animation replays */
    el.classList.add('fae-stagger');
  }

  w.FAEMotion = { level: level, enabled: on, countTo: countTo, countAll: countAll, reveal: reveal, restagger: restagger };

  if(d.readyState === 'loading') d.addEventListener('DOMContentLoaded', function(){ countAll(); reveal(); });
  else { countAll(); reveal(); }
})(window, document);
