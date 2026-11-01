/* روابط الإحالة — مشترك بين كل المنصات (العدّاد المركزي في مشروع عقود على Supabase)
   - أول ما يدخل الزائر من رابط فيه ?ref=كود تنحسب «زيارة» وينحفظ الكود في جهازه 60 يوم.
   - REF.signup() تنادى بعد إنشاء حساب ناجح، فتنحسب «تسجيل» للكود.
   - REF.panel(عنصر) تعرض قسم «روابط الإحالة» في إعدادات لوحة التحكم.
   الإعداد: وسم السكربت data-platform="milkia" data-base="https://3pp3ll.github.io/milkia/"
   أو قبل تحميله: window.REF_CFG = { platform: "meras", base: "…" } */
(function () {
  const SB = 'https://ecqhdztlrckupjlizxsv.supabase.co', KEY = 'sb_publishable_nSXC6s1s8zJbUaGPOxLPMA_pKo8TOY7';
  const me = document.currentScript, ds = (me && me.dataset) || {}, cfg = window.REF_CFG || {};
  const PLATFORM = String(cfg.platform || ds.platform || location.pathname.split('/')[1] || 'site').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 20);
  const BASE = cfg.base || ds.base || (location.origin + location.pathname.replace(/[^/]*$/, ''));
  const LS = 'oqref.' + PLATFORM, VID = 'oqref.vid';
  const clean = (c) => String(c || '').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, '').slice(0, 32);
  const esc = (x) => String(x ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const get = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const set = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  function vid() { let v = get(VID); if (!v || !/^[A-Za-z0-9]{8,32}$/.test(v)) { const b = new Uint8Array(12); crypto.getRandomValues(b); v = [...b].map((x) => 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'[x % 56]).join(''); set(VID, v); } return v; }
  async function rpc(fn, body) {
    const r = await fetch(SB + '/rest/v1/rpc/' + fn, { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error((await r.text()).slice(0, 200) || r.status);
    const t = await r.text(); return t ? JSON.parse(t) : null;
  }
  const track = (code, kind) => rpc('ref_track', { p_platform: PLATFORM, p_code: code, p_kind: kind, p_visitor: vid() }).catch(() => {});
  function saved() { try { const o = JSON.parse(get(LS) || 'null'); return o && o.code && Date.now() - o.at < 60 * 864e5 ? o : null; } catch (e) { return null; } }

  // قراءة الرابط: ?ref= أو ?r= أو #ref=
  (function read() {
    try {
      const qs = new URLSearchParams(location.search), qh = new URLSearchParams(location.hash.replace(/^#/, '').split('?').pop());
      const code = clean(qs.get('ref') || qs.get('r') || qh.get('ref'));
      if (!code) return;
      const cur = saved(); if (!cur || cur.code !== code) set(LS, JSON.stringify({ code, at: Date.now() }));
      track(code, 'visit');
      if (qs.has('ref') || qs.has('r')) { qs.delete('ref'); qs.delete('r'); const s = qs.toString(); history.replaceState(null, '', location.pathname + (s ? '?' + s : '') + location.hash); }
    } catch (e) {}
  })();

  function link(code) { return BASE + (BASE.includes('?') ? '&' : '?') + 'ref=' + encodeURIComponent(code); }
  const n = (x) => Number(x || 0).toLocaleString('ar-SA-u-nu-latn');
  const when = (t) => t ? new Date(t).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { day: 'numeric', month: 'short' }) : '—';
  function css() {
    if (document.getElementById('oqref-css')) return;
    const s = document.createElement('style'); s.id = 'oqref-css';
    s.textContent = '.oqref{font-family:inherit;color:inherit}.oqref h3{font-size:1.05rem;margin:0 0 4px}.oqref .h{opacity:.75;font-size:.86rem;margin:0 0 10px}' +
      '.oqref .mk{display:flex;gap:6px;flex-wrap:wrap}.oqref input{flex:1;min-width:150px;padding:8px 10px;border:1px solid rgba(127,127,127,.35);border-radius:10px;font:inherit;background:transparent;color:inherit}' +
      '.oqref button{padding:8px 12px;border-radius:10px;border:1px solid rgba(127,127,127,.35);background:transparent;color:inherit;font:inherit;font-weight:700;cursor:pointer}.oqref button.p{background:#0f2744;border-color:#0f2744;color:#fff}' +
      '.oqref .out{display:flex;gap:6px;margin-top:8px}.oqref code{flex:1;min-width:0;direction:ltr;text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:8px 10px;border:1px dashed rgba(127,127,127,.45);border-radius:10px;font-size:.82rem}' +
      '.oqref table{width:100%;border-collapse:collapse;margin-top:12px;font-size:.88rem}.oqref th,.oqref td{padding:7px 6px;border-bottom:1px solid rgba(127,127,127,.2);text-align:start}.oqref th{font-size:.78rem;opacity:.7;font-weight:700}' +
      '.oqref td.num{font-variant-numeric:tabular-nums}.oqref .cp{padding:3px 8px;font-size:.78rem}.oqref .e{opacity:.7;font-size:.86rem;margin-top:10px}';
    document.head.appendChild(s);
  }
  async function panel(el, opt) {
    if (!el) return; css(); opt = opt || {};
    el.classList.add('oqref');
    el.innerHTML = '<h3>' + esc(opt.title || 'روابط الإحالة') + '</h3><p class="h">اكتب اسم للرابط (مثل main أو tiktok أو اسم صديق) وانسخه. تحت تشوف كم زيارة وكم تسجيل جا من كل رابط.</p>' +
      '<div class="mk"><input type="text" dir="ltr" placeholder="main" aria-label="اسم الرابط" data-ref="name"><button type="button" class="p" data-ref="make">اعمل الرابط</button></div><div data-ref="out"></div>' +
      '<div data-ref="stats"><p class="e">جاري التحميل…</p></div>';
    const out = el.querySelector('[data-ref="out"]'), st = el.querySelector('[data-ref="stats"]');
    const copy = async (t, b) => { try { await navigator.clipboard.writeText(t); } catch (e) { prompt('انسخ الرابط:', t); } if (b) { const o = b.textContent; b.textContent = 'تم ✓'; setTimeout(() => { b.textContent = o; }, 1400); } };
    const make = () => { const c = clean(el.querySelector('[data-ref="name"]').value) || 'main'; out.innerHTML = '<div class="out"><code>' + esc(link(c)) + '</code><button type="button" data-ref="copy" data-c="' + esc(c) + '">نسخ</button></div>'; };
    async function load() {
      try {
        const rows = await rpc('ref_stats', { p_platform: PLATFORM }) || [];
        st.innerHTML = rows.length ? '<table><thead><tr><th>الرابط</th><th>زيارات</th><th>تسجيلات</th><th>آخر 7 أيام</th><th>آخر نشاط</th><th></th></tr></thead><tbody>' +
          rows.map((r) => '<tr><td dir="ltr" style="text-align:start"><b>' + esc(r.code) + '</b></td><td class="num">' + n(r.visits) + '</td><td class="num"><b>' + n(r.signups) + '</b></td><td class="num">' + n(r.visits7) + ' / ' + n(r.signups7) + '</td><td>' + esc(when(r.last_at)) + '</td><td><button type="button" class="cp" data-ref="copy" data-c="' + esc(r.code) + '">نسخ</button></td></tr>').join('') +
          '</tbody></table><p class="e">«آخر 7 أيام» = زيارات / تسجيلات. الزيارة تنحسب مرة وحدة لكل جهاز.</p><button type="button" data-ref="reload" style="margin-top:6px">تحديث</button>'
          : '<p class="e">ما فيه زيارات من روابط إحالة للحين. اعمل رابط وانشره.</p><button type="button" data-ref="reload" style="margin-top:6px">تحديث</button>';
      } catch (e) { st.innerHTML = '<p class="e">ما قدرت أجيب الأرقام. تأكد إن ملف refs.sql مشغّل في Supabase (مشروع عقود).</p><button type="button" data-ref="reload">حاول مرة ثانية</button>'; }
    }
    el.onclick = (e) => { const b = e.target.closest('[data-ref]'); if (!b) return; const a = b.dataset.ref;
      if (a === 'make') make(); if (a === 'copy') copy(link(b.dataset.c), b); if (a === 'reload') { st.innerHTML = '<p class="e">جاري التحميل…</p>'; load(); } };
    el.querySelector('[data-ref="name"]').onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); make(); } };
    load();
  }
  window.REF = {
    platform: PLATFORM, link, panel,
    code: () => (saved() || {}).code || '',
    signup() { const s = saved(); if (s) { track(s.code, 'signup'); return s.code; } return ''; }
  };
})();
