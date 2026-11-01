/* شريط «ثبّت التطبيق» — يطلع بعد 3 ثواني من الدخول.
   أندرويد/كمبيوتر: زر «ثبّت» يفتح نافذة التثبيت. آيفون: «كيف؟» يشرح الإضافة من Safari.
   «مو الحين» يخفيه 21 يوم. ما يطلع إذا المنصة مثبّتة ومفتوحة كتطبيق.
   الإعداد من وسم السكربت: data-name (اسم المنصة) و data-icon (رابط الأيقونة) و data-key (مفتاح الحفظ). */
(function () {
  const me = document.currentScript || {}, ds = me.dataset || {};
  const NAME = ds.name || document.title, ICON = ds.icon || 'icons/icon-192.png', KEY = (ds.key || 'app') + '.inst';
  let evt = null, how = false;
  const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const ios = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const safari = () => ios() && !/crios|fxios|edgios|gsa\//i.test(navigator.userAgent);
  const snoozed = () => { try { return Date.now() - (+localStorage.getItem(KEY) || 0) < 21 * 864e5; } catch (e) { return false; } };
  const snooze = () => { try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {} };
  const css = '#app-inst{position:fixed;left:50%;transform:translateX(-50%);bottom:16px;z-index:2147483000;width:min(460px,calc(100vw - 24px));background:#fff;color:#1a2332;border:1px solid #e6dfd1;border-radius:16px;box-shadow:0 18px 44px rgba(15,39,68,.22);padding:12px;font:500 14px/1.5 Tajawal,"IBM Plex Sans Arabic",system-ui,sans-serif}' +
    '#app-inst .r{display:flex;align-items:center;gap:10px}#app-inst img{width:44px;height:44px;border-radius:11px;flex:none}#app-inst .t{flex:1;min-width:0}#app-inst b{display:block;font-size:15px}#app-inst span{color:#5c6b7a;font-size:12.5px}' +
    '#app-inst button{border:0;border-radius:10px;padding:8px 12px;font:700 13px inherit;font-family:inherit;cursor:pointer}#app-inst .go{background:#0f2744;color:#fff}#app-inst .no{background:none;color:#5c6b7a}#app-inst p{margin:10px 2px 0;font-size:13px;color:#3d4a5c}' +
    (ds.bottom ? '@media(max-width:640px){#app-inst{bottom:' + ds.bottom + 'px}}' : '') + '#app-inst button:focus-visible{outline:3px solid #c9a84c;outline-offset:2px}@media print{#app-inst{display:none}}';
  function bar() {
    let el = document.getElementById('app-inst');
    if (standalone() || snoozed() || !(evt || ios())) { if (el) el.remove(); return; }
    if (!document.getElementById('app-inst-css')) { const s = document.createElement('style'); s.id = 'app-inst-css'; s.textContent = css; document.head.appendChild(s); }
    if (!el) { el = document.createElement('div'); el.id = 'app-inst'; el.dir = 'rtl'; el.setAttribute('role', 'region'); el.setAttribute('aria-label', 'تثبيت ' + NAME); document.body.appendChild(el); }
    const i = !evt && ios();
    el.innerHTML = '<div class="r"><img src="' + ICON + '" alt=""><div class="t"><b>ثبّت ' + NAME + ' على جوالك</b><span>أيقونة في الشاشة الرئيسية، ويفتح كامل الشاشة مثل التطبيق.</span></div>' +
      '<button type="button" class="go" data-in="go">' + (i ? 'كيف؟' : 'ثبّت') + '</button><button type="button" class="no" data-in="no">مو الحين</button></div>' +
      (i && how ? '<p>' + (safari() ? 'من Safari: اضغط زر المشاركة <b style="display:inline">⬆︎</b> تحت، ثم «إضافة إلى الشاشة الرئيسية»، ثم «إضافة».' : 'افتح الرابط في Safari أول، لأن الآيفون يثبّت من Safari بس.') + '</p>' : '');
  }
  document.addEventListener('click', async (e) => {
    const b = e.target.closest && e.target.closest('[data-in]'); if (!b) return;
    if (b.dataset.in === 'no') { snooze(); const el = document.getElementById('app-inst'); if (el) el.remove(); return; }
    if (evt) { const ev = evt; evt = null; ev.prompt(); try { const r = await ev.userChoice; if (r && r.outcome !== 'accepted') snooze(); } catch (x) {} bar(); }
    else { how = !how; bar(); }
  });
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); evt = e; setTimeout(bar, 3000); });
  window.addEventListener('appinstalled', () => { evt = null; const el = document.getElementById('app-inst'); if (el) el.remove(); });
  const start = () => setTimeout(bar, 3000);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register(ds.sw || 'sw.js').catch(() => {});
})();
