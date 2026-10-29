/* عقود — «إسألني» (مساعد داخل المنصة) + مربع البحث أعلى الصفحة
   - زر عائم في الزاوية اليسار، يفتح محادثة. المحادثات تنحفظ في الجهاز بأول سؤال كعنوان.
   - قائمة المحادثات السابقة (الأحدث أولاً بالتاريخ والوقت)، ومسح المحادثة الحالية أو كل السجل.
   - المساعد يقدر يضيف نوع عقد جديد (للمالك) ويقول لك حدّث الصفحة.
   - الضغط في أي مكان برا اللوحة يقفلها. */
(function () {
  const KEY = 'oqood.chats', MAX = 40;
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (x) => String(x ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const load = () => { try { const a = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
  const save = (a) => { try { localStorage.setItem(KEY, JSON.stringify(a.slice(0, MAX))); } catch (e) {} };
  const when = (t) => { const d = new Date(t); return d.toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { day: 'numeric', month: 'short' }) + ' · ' + d.toLocaleTimeString('ar-SA-u-nu-latn', { hour: 'numeric', minute: '2-digit' }); };
  const short = (q) => { const w = String(q || '').replace(/[؟?!.،,:]/g, ' ').split(/\s+/).filter((x) => x.length > 1 && !/^(كيف|ابغا|أبغى|ابغى|ابي|أبي|ممكن|هل|وش|ايش|إيش|لو|في|من|على|الى|إلى|عن|يا|اسوي|أسوي)$/.test(x)); return (w.slice(0, 3).join(' ') || 'محادثة').slice(0, 40); };
  let chats = load(), cur = null, busy = false;

  function ui() {
    if ($('#oqAsk')) return;
    const fab = document.createElement('button');
    fab.id = 'oqAskFab'; fab.type = 'button'; fab.className = 'oq-ask-fab no-print'; fab.hidden = true;
    fab.setAttribute('aria-haspopup', 'dialog'); fab.setAttribute('aria-controls', 'oqAsk');
    fab.innerHTML = '<span aria-hidden="true">✦</span> إسألني';
    const p = document.createElement('section');
    p.id = 'oqAsk'; p.className = 'oq-ask no-print'; p.hidden = true; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', 'إسألني'); p.dir = 'rtl';
    p.innerHTML = '<header class="oq-ask-h"><b>إسألني</b><div class="oq-ask-tools">' +
      '<button type="button" data-ask="hist" aria-expanded="false" title="المحادثات السابقة">🕘 السابقة</button>' +
      '<button type="button" data-ask="new" title="محادثة جديدة">＋ جديدة</button>' +
      '<button type="button" data-ask="clear" title="مسح هذي المحادثة">🗑</button>' +
      '<button type="button" data-ask="close" aria-label="إغلاق">✕</button></div></header>' +
      '<div class="oq-ask-hist" id="oqAskHist" hidden></div>' +
      '<div class="oq-ask-msgs" id="oqAskMsgs" aria-live="polite"></div>' +
      '<form class="oq-ask-f" id="oqAskF"><textarea id="oqAskQ" rows="1" placeholder="اسأل أي شي… مثل: كيف أسوي عقد استثمار؟" aria-label="سؤالك"></textarea><button type="submit" aria-label="إرسال">➤</button></form>';
    document.body.appendChild(fab); document.body.appendChild(p);
    fab.onclick = (e) => { e.stopPropagation(); toggle(); };
    $('#oqAskF').onsubmit = (e) => { e.preventDefault(); ask($('#oqAskQ').value); };
    $('#oqAskQ').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(e.target.value); } });
    $('#oqAskQ').addEventListener('input', (e) => { e.target.style.height = 'auto'; e.target.style.height = Math.min(120, e.target.scrollHeight) + 'px'; });
    p.addEventListener('click', onTool);
    document.addEventListener('click', (e) => { if (!p.hidden && !p.contains(e.target) && e.target !== fab && !fab.contains(e.target)) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !p.hidden) close(); });
  }
  function toggle() { $('#oqAsk').hidden ? open() : close(); }
  function open(q) {
    const p = $('#oqAsk'); p.hidden = false; $('#oqAskFab').setAttribute('aria-expanded', 'true');
    if (!cur) cur = chats[0] || null;
    paint(); setTimeout(() => $('#oqAskQ').focus(), 30);
    if (q) ask(q);
  }
  function close() { const p = $('#oqAsk'); if (!p) return; p.hidden = true; $('#oqAskHist').hidden = true; $('#oqAskFab').setAttribute('aria-expanded', 'false'); }
  function paint() {
    const box = $('#oqAskMsgs');
    const msgs = cur ? cur.msgs : [];
    box.innerHTML = msgs.length ? msgs.map((m) => '<div class="oq-m ' + (m.r === 'u' ? 'u' : 'a') + (m.err ? ' err' : '') + '">' + fmt(m.c) + (m.done ? '<div class="oq-done">✓ ' + esc(m.done) + '</div>' : '') + '</div>').join('') +
      (busy ? '<div class="oq-m a oq-typing"><span></span><span></span><span></span></div>' : '')
      : '<div class="oq-empty"><b>هلا 👋</b><p>اسألني عن المنصة أو العقود. وإذا تبي نوع عقد مو موجود في القائمة، مثل «عقد استثمار»، أضيفه لك.</p>' +
        ['كيف أرسل رابط توقيع للعميل؟', 'أبغى عقد استثمار', 'وش الفرق بين عقد المقاولة وعقد الخدمات؟'].map((s) => '<button type="button" class="oq-sug" data-ask="sug">' + esc(s) + '</button>').join('') + '</div>';
    box.scrollTop = box.scrollHeight;
  }
  function fmt(t) { return esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>'); }
  function hist() {
    const h = $('#oqAskHist'), btn = $('[data-ask="hist"]');
    if (!h.hidden) { h.hidden = true; btn.setAttribute('aria-expanded', 'false'); return; }
    const list = chats.slice().sort((a, b) => (b.at || 0) - (a.at || 0));
    h.innerHTML = (list.length ? list.map((c) => '<button type="button" class="oq-h' + (cur && c.id === cur.id ? ' on' : '') + '" data-ask="pick" data-id="' + c.id + '"><b>' + esc(c.title) + '</b><small>' + esc(when(c.at)) + ' · ' + c.msgs.length + ' رسالة</small></button>').join('') : '<p class="oq-h-empty">ما فيه محادثات محفوظة.</p>') +
      (list.length ? '<button type="button" class="oq-h-clear" data-ask="wipe">مسح كل السجل</button>' : '');
    h.hidden = false; btn.setAttribute('aria-expanded', 'true');
  }
  function onTool(e) {
    const b = e.target.closest('[data-ask]'); if (!b) return;
    const a = b.dataset.ask;
    if (a === 'close') return close();
    if (a === 'hist') return hist();
    if (a === 'new') { cur = null; $('#oqAskHist').hidden = true; paint(); $('#oqAskQ').focus(); return; }
    if (a === 'pick') { cur = chats.find((c) => c.id === b.dataset.id) || null; $('#oqAskHist').hidden = true; paint(); return; }
    if (a === 'sug') return ask(b.textContent);
    if (a === 'clear') {
      if (!cur) return;
      if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'متأكد؟'; setTimeout(() => { b.dataset.sure = ''; b.textContent = '🗑'; }, 3000); return; }
      chats = chats.filter((c) => c.id !== cur.id); save(chats); cur = null; b.dataset.sure = ''; b.textContent = '🗑'; paint(); return;
    }
    if (a === 'wipe') {
      if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'متأكد؟ اضغط مرة ثانية'; return; }
      chats = []; save(chats); cur = null; $('#oqAskHist').hidden = true; paint();
    }
  }
  async function ask(q) {
    q = String(q || '').trim(); if (!q || busy) return;
    $('#oqAskQ').value = ''; $('#oqAskQ').style.height = 'auto';
    if (!cur) { cur = { id: 'c' + Date.now().toString(36), title: short(q), at: Date.now(), msgs: [] }; chats.unshift(cur); }
    cur.msgs.push({ r: 'u', c: q }); cur.at = Date.now();
    chats = [cur].concat(chats.filter((c) => c.id !== cur.id)); save(chats);
    busy = true; paint();
    const sb = window.OQ && OQ.sb && OQ.sb();
    let rep = { r: 'a', c: '' };
    try {
      if (!sb) throw new Error('سجّل دخولك أول.');
      const types = [...document.querySelectorAll('#contractType option')].map((o) => o.text);
      const { data, error } = await sb.functions.invoke('draft', { body: { mode: 'assist', messages: cur.msgs.slice(-12).map((m) => ({ role: m.r === 'u' ? 'user' : 'assistant', content: m.c })), ctx: { types } } });
      if (error) { let m = error.message; try { const j = await error.context.json(); if (j && j.error) m = j.error; } catch (x) {} throw new Error(m); }
      rep.c = data.reply || '…';
      const done = [];
      for (const a of data.actions || []) if (a.type === 'add_type') done.push(await addType(sb, a));
      if (done.length) rep.done = done.join('، ') + ' — طلبك جاهز، حدّث الصفحة عشان يطلع في القائمة.';
    } catch (e) {
      rep = { r: 'a', c: /mode|assist/.test(e.message || '') ? 'المساعد يحتاج نشر دالة draft الجديدة في Supabase.' : 'ما قدرت أرد الحين: ' + (e.message || e), err: true };
    }
    busy = false; cur.msgs.push(rep); cur.at = Date.now(); save(chats); paint();
  }
  async function addType(sb, a) {
    const ex = [...document.querySelectorAll('#contractType option')].find((o) => o.text.trim() === a.label.trim());
    if (ex) return '«' + a.label + '» موجود من قبل';
    const { data: mx } = await sb.from('contract_types').select('ord').eq('grp', a.grp).order('ord', { ascending: false }).limit(1);
    const ord = mx && mx[0] ? mx[0].ord + 1 : 999;
    let { error } = await sb.from('contract_types').insert({ label: a.label, grp: a.grp, law: a.law, ord, active: true });
    if (error && /grp|law|column/.test(error.message)) ({ error } = await sb.from('contract_types').insert({ label: a.label, ord, active: true }));
    if (error) throw new Error('ما قدرت أضيف «' + a.label + '»: ' + error.message);
    return 'انضاف «' + a.label + '» في ' + a.grp;
  }

  /* ---------- البحث أعلى الصفحة ---------- */
  function searchUI() {
    if ($('#oqSearch')) return;
    const head = $('.header'); if (!head) return;
    const w = document.createElement('div'); w.className = 'oq-search no-print'; w.id = 'oqSearch'; w.setAttribute('role', 'search');
    w.innerHTML = '<input type="search" id="oqSearchQ" placeholder="ابحث في المنصة: نوع عقد، عقد محفوظ، إعداد…" aria-label="ابحث في المنصة" autocomplete="off"><div class="oq-sr" id="oqSearchR" role="listbox" hidden></div>';
    head.insertAdjacentElement('afterend', w);
    const inp = $('#oqSearchQ'), out = $('#oqSearchR');
    const norm = (s) => String(s || '').toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[ًٌٍَُِّْـ]/g, '');
    const run = () => {
      const q = norm(inp.value.trim()); if (!q) { out.hidden = true; return; }
      const R = [];
      [...document.querySelectorAll('#contractType option')].forEach((o) => { if (norm(o.text).includes(q)) R.push({ k: 'نوع عقد', t: o.text, go: () => { const s = $('#contractType'); s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })); const f = $('#formSection'), pv = $('#previewSection'); if (f) f.style.display = 'block'; if (pv) pv.style.display = 'none'; s.scrollIntoView({ behavior: 'smooth', block: 'center' }); s.focus(); } }); });
      [...document.querySelectorAll('#contractsList .view')].forEach((b) => { const row = b.closest('div.d-flex'); const t = row ? row.querySelector('strong').textContent + ' — ' + (row.querySelector('.small') || {}).textContent : ''; if (t && norm(t).includes(q)) R.push({ k: 'عقد محفوظ', t, go: () => b.click() }); });
      if (window.OQ && OQ.isAdmin && OQ.isAdmin()) [['laws', 'مكتبة الأنظمة'], ['templates', 'نماذج العقود'], ['types', 'أنواع العقود'], ['users', 'المشتركين'], ['settings', 'إعدادات الموقع']].forEach(([tab, t]) => { if (norm(t).includes(q)) R.push({ k: 'لوحة التحكم', t, go: () => openAdmin(tab) }); });
      R.push({ k: 'إسألني', t: 'اسأل المساعد: ' + inp.value.trim(), go: () => open(inp.value.trim()), ask: true });
      out.innerHTML = R.slice(0, 12).map((r, i) => '<button type="button" role="option" data-i="' + i + '"' + (r.ask && !(window.OQ && OQ.isAdmin && OQ.isAdmin()) ? ' hidden' : '') + '><small>' + esc(r.k) + '</small>' + esc(r.t) + '</button>').join('');
      out._r = R; out.hidden = false;
    };
    inp.addEventListener('input', run);
    inp.addEventListener('focus', run);
    inp.addEventListener('keydown', (e) => {
      const items = [...out.querySelectorAll('button:not([hidden])')]; if (!items.length) return;
      const i = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); items[0].focus(); }
      if (e.key === 'Enter') { e.preventDefault(); items[0].click(); }
      if (e.key === 'Escape') out.hidden = true;
      void i;
    });
    out.addEventListener('keydown', (e) => {
      const items = [...out.querySelectorAll('button:not([hidden])')], i = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); (items[i + 1] || items[0]).focus(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); i <= 0 ? inp.focus() : items[i - 1].focus(); }
      if (e.key === 'Escape') { out.hidden = true; inp.focus(); }
    });
    out.addEventListener('click', (e) => { const b = e.target.closest('button[data-i]'); if (!b) return; const r = out._r[+b.dataset.i]; out.hidden = true; inp.value = ''; e.stopPropagation(); r.go(); });
    document.addEventListener('click', (e) => { if (!w.contains(e.target)) out.hidden = true; });
  }
  function openAdmin(tab) {
    if (!(window.OQ && OQ.open)) return;
    OQ.open(); setTimeout(() => { const a = document.querySelector('[data-act="admin"]'); if (a) a.click(); setTimeout(() => { const t = document.querySelector('[data-tab="' + tab + '"]'); if (t) t.click(); }, 250); }, 50);
  }

  function boot() {
    ui(); searchUI();
    const show = () => { const f = $('#oqAskFab'); if (f) f.hidden = !(window.OQ && OQ.isAdmin && OQ.isAdmin()); };
    show(); let n = 0; const t = setInterval(() => { show(); if (++n > 60) clearInterval(t); }, 500);
    window.OQAsk = { open, refresh: show };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
