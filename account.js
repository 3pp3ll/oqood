/* عقود — الحساب ولوحة التحكم (Supabase) */
(function () {
  // ===== إعداد الربط: قيم عامة وآمنة للنشر =====
  const SB_URL = 'https://ecqhdztlrckupjlizxsv.supabase.co';
  const SB_ANON = 'sb_publishable_nSXC6s1s8zJbUaGPOxLPMA_pKo8TOY7';
  // ===============================================

  const READY = !!(SB_URL && SB_ANON && window.supabase);
  const PAGE = location.href.split('#')[0].split('?')[0];
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const IC = {
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 20c1.5-3.6 4.4-5.4 8-5.4s6.5 1.8 8 5.4"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    eyeOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 3l18 18M10.6 5.1A10.7 10.7 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6C3.9 8.4 2 12 2 12s3.6 7 10 7c1.6 0 3-.4 4.3-1M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>',
    key: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="7.5" cy="15.5" r="4"/><path d="M10.5 12.5 20 3M16 7l3 3"/></svg>',
    panel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 11 12 4l9 7M5 10v10h14V10"/></svg>',
    out: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/></svg>',
  };

  const st = { open: false, view: 'login', user: null, prof: null, flash: null };
  let sb = null;

  // ---------- العميل وتذكرني ----------
  const remembered = () => { try { return localStorage.getItem('oqood.remember') !== '0'; } catch (e) { return true; } };
  function makeClient() {
    let storage;
    try { storage = remembered() ? window.localStorage : window.sessionStorage; } catch (e) { storage = undefined; }
    sb = window.supabase.createClient(SB_URL, SB_ANON, {
      auth: { storage, storageKey: 'oqood.auth', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
    sb.auth.onAuthStateChange((ev, session) => {
      if (ev === 'PASSWORD_RECOVERY') { st.view = 'reset'; st.open = true; }
      // لا ننادي Supabase داخل هذا المستمع مباشرة (يعلّق العميل)
      setTimeout(() => setUser(session ? session.user : null), 0);
    });
  }
  async function setUser(u) {
    const changed = (u && u.id) !== (st.user && st.user.id);
    st.user = u;
    if (!u) { st.prof = null; adminHide(); paint(); if (window.OQSign) OQSign.refresh(); return; }
    if (changed || !st.prof) {
      const { data, error } = await sb.from('profiles').select('*').eq('id', u.id).maybeSingle();
      st.profErr = error ? 'تعذّر قراءة بيانات حسابك من السيرفر: ' + (error.message || error.code) : (!data ? 'حسابك غير موجود في جدول المستخدمين. شغّل ملف قاعدة البيانات ثم سطر المالك.' : '');
      st.prof = data || { name: (u.user_metadata && u.user_metadata.name) || u.email.split('@')[0], email: u.email, plan: 'none' };
    }
    paint();
    if (window.OQSign) OQSign.refresh();
  }

  // ---------- أدوات ----------
  const errText = (e) => {
    const m = String((e && e.message) || e || '');
    if (/Invalid login/i.test(m)) return 'الإيميل أو كلمة المرور غير صحيحة.';
    if (/Could not find the table|schema cache|does not exist/i.test(m)) return 'جدول ناقص في قاعدة البيانات. شغّل ملف schema.sql كامل في Supabase ← SQL Editor (آمن لإعادة التشغيل).';
    if (/not confirmed/i.test(m)) return 'أكّد إيميلك من الرابط اللي وصلك، بعدها سجّل دخولك.';
    if (/already registered|already been registered/i.test(m)) return 'هذا الإيميل مسجّل. سجّل دخولك أو استعد كلمة المرور.';
    if (/at least|Password should/i.test(m)) return 'كلمة المرور لازم تكون ٨ أحرف أو أكثر.';
    if (/rate limit|too many/i.test(m)) return 'محاولات كثيرة. انتظر شوي وجرّب مرة ثانية.';
    if (/Failed to fetch|NetworkError/i.test(m)) return 'تعذّر الاتصال. تأكد من الإنترنت.';
    return m || 'صار خطأ غير متوقع.';
  };
  const validEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const ownKey = () => { try { return localStorage.getItem('oqood_openrouter_key') || ''; } catch (e) { return ''; } };
  const initial = () => esc(((st.prof && st.prof.name) || (st.user && st.user.email) || 'ع').trim()[0]);
  const isSub = () => {
    const p = st.prof; if (!p) return false;
    if (p.is_admin) return true;
    if (p.plan !== 'sub') return false;
    return !p.sub_until || new Date(p.sub_until) >= new Date(new Date().toDateString());
  };
  function msg(id, t, ok) { const el = document.getElementById(id); if (el) { el.textContent = t; el.className = 'acc-msg ' + (ok ? 'ok' : 'err'); } }
  function busy(form, on) { const b = form.querySelector('button[type=submit]'); if (b) { b.disabled = on; if (on) { b.dataset.t = b.textContent; b.textContent = '...'; } else if (b.dataset.t) b.textContent = b.dataset.t; } }

  // ---------- الواجهات ----------
  const pwField = (id, label, ac) => `<div class="acc-f"><label for="${id}">${label}</label><div class="acc-pw">
    <input id="${id}" type="password" dir="ltr" autocomplete="${ac}" required>
    <button type="button" class="acc-eye" data-eye="${id}" aria-label="إظهار كلمة المرور">${IC.eye}</button></div></div>`;
  const emailField = (id) => `<div class="acc-f"><label for="${id}">البريد الإلكتروني</label><input id="${id}" type="email" dir="ltr" autocomplete="email" placeholder="name@example.com" required></div>`;
  const notReady = READY ? '' : '<div class="acc-msg err">تسجيل الدخول قيد التجهيز، ويشتغل قريباً.</div>';

  const VIEWS = {
    login: () => `<form id="accLogin" novalidate>
      <p class="acc-h">تسجيل الدخول</p><p class="acc-s">ادخل لحسابك عشان تصيغ عقودك.</p>${notReady}
      ${emailField('lgEmail')}
      ${pwField('lgPass', 'كلمة المرور', 'current-password')}
      <div class="acc-row"><label class="acc-chk"><input type="checkbox" id="lgRemember" ${remembered() ? 'checked' : ''}> تذكرني</label>
        <button type="button" class="acc-lnk" data-go="forgot">نسيت كلمة المرور؟</button></div>
      <div class="acc-msg" id="lgMsg" role="status"></div>
      <button class="acc-go" type="submit">دخول</button>
      <div class="acc-sep">ما عندك حساب؟</div>
      <button type="button" class="acc-go ghost" data-go="signup">إنشاء حساب جديد</button>
    </form>`,
    forgot: () => `<form id="accForgot" novalidate>
      <p class="acc-h">استعادة كلمة المرور</p><p class="acc-s">اكتب إيميلك ونرسل لك رابط تعيين كلمة مرور جديدة.</p>
      ${emailField('fgEmail')}
      <div class="acc-msg" id="fgMsg" role="status"></div>
      <button class="acc-go" type="submit">أرسل الرابط</button>
      <p class="acc-alt"><button type="button" class="acc-lnk" data-go="login">رجوع لتسجيل الدخول</button></p>
    </form>`,
    signup: () => `<form id="accSignup" novalidate>
      <p class="acc-h">إنشاء حساب</p><p class="acc-s">حساب واحد لكل عقودك.</p>${notReady}
      <div class="acc-f"><label for="suName">الاسم</label><input id="suName" type="text" autocomplete="name" required></div>
      ${emailField('suEmail')}
      ${pwField('suPass', 'كلمة المرور (٨ أحرف على الأقل)', 'new-password')}
      <div class="acc-msg" id="suMsg" role="status"></div>
      <button class="acc-go" type="submit">إنشاء الحساب</button>
      <p class="acc-alt">عندك حساب؟ <button type="button" class="acc-lnk" data-go="login">سجّل دخولك</button></p>
    </form>`,
    reset: () => `<form id="accReset" novalidate>
      <p class="acc-h">كلمة مرور جديدة</p><p class="acc-s">اكتب كلمة المرور الجديدة لحسابك.</p>
      ${pwField('rsPass', 'كلمة المرور الجديدة', 'new-password')}
      <div class="acc-msg" id="rsMsg" role="status"></div>
      <button class="acc-go" type="submit">حفظ كلمة المرور</button>
    </form>`,
    me: () => {
      const p = st.prof || {};
      const sub = isSub(), key = !!ownKey();
      const until = p.sub_until && !p.is_admin ? ` حتى ${esc(p.sub_until)}` : '';
      const plan = p.is_admin ? `<span class="acc-pill">المالك</span><br>الصياغة بمفتاح الإدارة.`
        : sub ? `<span class="acc-pill">مشترك${until}</span><br>الصياغة شغالة ضمن اشتراكك. ما تحتاج تضيف شي.`
        : key ? `<span class="acc-pill w">مفتاحك الخاص</span><br>تصيغ العقود بمفتاح OpenRouter حقك.`
        : `<span class="acc-pill n">غير مشترك</span><br>${esc((window.OQ_SITE && OQ_SITE.subscribeMsg) || 'أضف مفتاح OpenRouter حقك، أو تواصل معنا للاشتراك.')}`;
      return `<div class="acc-me"><div class="acc-av">${initial()}</div><div style="min-width:0"><b>${esc(p.name || '')}</b><span>${esc(st.user.email)}</span></div></div>
        <div class="acc-plan">${plan}</div>
        ${st.flash ? `<div class="acc-msg ok">${esc(st.flash)}</div>` : ''}
        ${st.profErr ? `<div class="acc-msg err">${esc(st.profErr)}</div>` : ''}
        ${p.is_admin ? `<button type="button" class="acc-mi" data-act="admin">${IC.panel} لوحة التحكم</button>` : `<button type="button" class="acc-mi" data-act="home">${IC.home} الرئيسية</button>`}
        ${sub ? '' : `<button type="button" class="acc-mi" data-act="key">${IC.key} مفتاح OpenRouter</button>`}
        <button type="button" class="acc-mi out" data-act="out">${IC.out} تسجيل الخروج</button>`;
    },
  };

  let wrap, btn, menu;
  function paint() {
    if (!wrap) return;
    btn.innerHTML = st.user ? `<span class="acc-av">${initial()}</span><span class="acc-dot"></span>` : IC.user;
    btn.setAttribute('aria-expanded', st.open);
    btn.title = st.user ? 'حسابي' : 'تسجيل الدخول';
    menu.hidden = !st.open;
    if (st.open) menu.innerHTML = VIEWS[st.user && st.view !== 'reset' ? 'me' : st.view]();
  }
  function open(view) { st.open = true; if (view) st.view = view; paint(); menu.style.top = matchMedia('(max-width:560px)').matches ? Math.max(12, btn.getBoundingClientRect().bottom + 10) + 'px' : ''; const f = menu.querySelector('input'); if (f) f.focus(); }
  function close() { st.open = false; st.flash = null; if (st.view !== 'reset') st.view = 'login'; paint(); }

  function mount() {
    const home = document.getElementById('homeBtn');
    wrap = document.createElement('div');
    wrap.className = 'acc no-print';
    wrap.innerHTML = '<button type="button" class="acc-btn" id="accBtn" aria-haspopup="true" aria-expanded="false" aria-label="الحساب"></button><div class="acc-menu" id="accMenu" hidden></div>';
    if (home) home.replaceWith(wrap); else document.querySelector('.header .no-print')?.prepend(wrap);
    btn = $('#accBtn'); menu = $('#accMenu');
    btn.addEventListener('click', (e) => { e.stopPropagation(); st.open ? close() : open(); });
    document.addEventListener('click', (e) => { if (st.open && !e.composedPath().includes(wrap) && document.contains(e.target)) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && st.open) { close(); btn.focus(); } });
    menu.addEventListener('click', onMenuClick);
    menu.addEventListener('submit', onSubmit);
    paint();
  }

  async function onMenuClick(e) {
    const go = e.target.closest('[data-go]');
    if (go) { st.view = go.dataset.go; paint(); const f = menu.querySelector('input'); if (f) f.focus(); return; }
    const eye = e.target.closest('[data-eye]');
    if (eye) {
      const i = document.getElementById(eye.dataset.eye), show = i.type === 'password';
      i.type = show ? 'text' : 'password'; eye.innerHTML = show ? IC.eyeOff : IC.eye;
      eye.setAttribute('aria-label', show ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'); i.focus(); return;
    }
    const act = e.target.closest('[data-act]');
    if (!act) return;
    const a = act.dataset.act;
    if (a === 'out') { await sb.auth.signOut(); close(); }
    else if (a === 'key') { close(); window.openKeyModal && window.openKeyModal(); }
    else if (a === 'home') { close(); adminHide(); window.oqoodHome && window.oqoodHome(); }
    else if (a === 'admin') { close(); adminShow(); }
  }

  async function onSubmit(e) {
    e.preventDefault();
    const f = e.target;
    if (!READY) { msg(f.querySelector('.acc-msg[id]').id, 'تسجيل الدخول قيد التجهيز، ويشتغل قريباً.'); return; }
    if (f.id === 'accLogin') {
      const em = $('#lgEmail').value.trim(), pw = $('#lgPass').value, rem = $('#lgRemember').checked;
      if (!validEmail(em)) return msg('lgMsg', 'اكتب إيميل صحيح.');
      if (!pw) return msg('lgMsg', 'اكتب كلمة المرور.');
      if (rem !== remembered()) { try { localStorage.setItem('oqood.remember', rem ? '1' : '0'); } catch (x) {} makeClient(); }
      busy(f, true);
      const { error } = await sb.auth.signInWithPassword({ email: em, password: pw });
      busy(f, false);
      if (error) return msg('lgMsg', errText(error));
      st.view = 'login'; close();
    } else if (f.id === 'accForgot') {
      const em = $('#fgEmail').value.trim();
      if (!validEmail(em)) return msg('fgMsg', 'اكتب إيميل صحيح.');
      busy(f, true);
      const { error } = await sb.auth.resetPasswordForEmail(em, { redirectTo: PAGE });
      busy(f, false);
      if (error) return msg('fgMsg', errText(error));
      msg('fgMsg', 'إذا الإيميل مسجّل عندنا بيوصلك الرابط خلال دقائق. افتحه من نفس الجهاز.', true);
    } else if (f.id === 'accSignup') {
      const nm = $('#suName').value.trim(), em = $('#suEmail').value.trim(), pw = $('#suPass').value;
      if (!nm) return msg('suMsg', 'اكتب اسمك.');
      if (!validEmail(em)) return msg('suMsg', 'اكتب إيميل صحيح.');
      if (pw.length < 8) return msg('suMsg', 'كلمة المرور لازم تكون ٨ أحرف أو أكثر.');
      busy(f, true);
      const { data, error } = await sb.auth.signUp({ email: em, password: pw, options: { data: { name: nm }, emailRedirectTo: PAGE } });
      busy(f, false);
      if (error) return msg('suMsg', errText(error));
      if (data && data.user && Array.isArray(data.user.identities) && !data.user.identities.length) return msg('suMsg', 'هذا الإيميل مسجّل. سجّل دخولك أو استعد كلمة المرور.');
      if (!data.session) msg('suMsg', 'أرسلنا لك رابط تأكيد على إيميلك. افتحه وبعدها سجّل دخولك.', true);
    } else if (f.id === 'accReset') {
      const pw = $('#rsPass').value;
      if (pw.length < 8) return msg('rsMsg', 'كلمة المرور لازم تكون ٨ أحرف أو أكثر.');
      busy(f, true);
      const { error } = await sb.auth.updateUser({ password: pw });
      busy(f, false);
      if (error) return msg('rsMsg', errText(error));
      st.view = 'login'; st.flash = 'تم تغيير كلمة المرور ✓'; paint();
      history.replaceState(null, '', PAGE);
    }
  }

  // ---------- الصياغة عبر السيرفر ----------
  async function draft(payload) {
    if (!st.user) { open('login'); throw Object.assign(new Error('سجّل دخولك أولاً عشان تصيغ العقد.'), { quiet: true }); }
    const { data, error } = await sb.functions.invoke('draft', { body: { ...payload, userKey: isSub() ? '' : ownKey() } });
    if (error) {
      let m = error.message;
      try { const j = await error.context.json(); if (j && j.error) { m = j.error; if (j.code === 'nokey') open(); } } catch (x) {}
      throw new Error(m);
    }
    return data;
  }

  // ---------- لوحة التحكم ----------
  let adm = null, admTab = 'laws', parsed = [], lawsCache = [];
  function adminShow() {
    if (!st.prof || !st.prof.is_admin) return;
    if (!adm) {
      adm = document.createElement('div');
      adm.className = 'form-section mb-4 no-print'; adm.id = 'adminSection';
      document.querySelector('.header').after(adm);
      adm.addEventListener('click', admClick);
      adm.addEventListener('change', admChange);
    }
    ['formSection', 'previewSection'].forEach((id) => { const el = document.getElementById(id); if (el) { el.dataset.admPrev = el.style.display; el.style.display = 'none'; } });
    adm.hidden = false; admRender(); adm.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function adminHide() {
    if (!adm || adm.hidden) return;
    adm.hidden = true;
    const fs = document.getElementById('formSection'); if (fs) fs.style.display = 'block';
  }

  function admRender() {
    adm.innerHTML = `<div class="section-title d-flex justify-content-between align-items-center flex-wrap gap-2">
        <span><i class="bi bi-speedometer2"></i> لوحة التحكم</span>
        <button type="button" class="btn btn-sm btn-outline-secondary" data-a="close">رجوع للعقود</button></div>
      <div class="adm-tabs" role="tablist">
        <button type="button" role="tab" data-tab="laws" aria-selected="${admTab === 'laws'}">مكتبة الأنظمة</button>
        <button type="button" role="tab" data-tab="templates" aria-selected="${admTab === 'templates'}">نماذج العقود</button>
        <button type="button" role="tab" data-tab="types" aria-selected="${admTab === 'types'}">أنواع العقود</button>
        <button type="button" role="tab" data-tab="users" aria-selected="${admTab === 'users'}">المشتركين</button>
        <button type="button" role="tab" data-tab="settings" aria-selected="${admTab === 'settings'}">إعدادات الموقع</button>
      </div><div id="admBody"></div>`;
    ({ laws: renderLaws, templates: renderTemplates, types: renderTypes, users: renderUsers, settings: renderSettings })[admTab]();
  }

  function renderLaws() {
    $('#admBody').innerHTML = `
      <div class="adm-box"><h6>إضافة نظام أو لائحة</h6>
        <div class="adm-grid">
          <div><label class="form-label" for="lwTitle">اسم النظام <span class="req">*</span></label><input class="form-control" id="lwTitle" placeholder="مثال: نظام المعاملات المدنية"></div>
          <div><label class="form-label" for="lwKind">النوع</label><select class="form-select" id="lwKind"><option>نظام</option><option>لائحة تنفيذية</option><option>قرار</option><option>تعميم</option><option>أخرى</option></select></div>
          <div><label class="form-label" for="lwIssued">رقم وتاريخ الإصدار</label><input class="form-control" id="lwIssued" placeholder="م/191 بتاريخ 29/11/1444هـ"></div>
          <div><label class="form-label" for="lwUrl">رابط المصدر</label><input class="form-control" id="lwUrl" dir="ltr" placeholder="https://laws.boe.gov.sa/..."></div>
        </div>
        <div class="mt-3"><label class="form-label" for="lwFile">ملف النظام (PDF أو Word أو نص)</label><input type="file" class="form-control" id="lwFile" accept=".pdf,.docx,.txt,.html,.htm"></div>
        <div class="mt-3"><label class="form-label" for="lwText">أو الصق النص هنا</label><textarea class="form-control" id="lwText" rows="5" placeholder="المادة الأولى: ..."></textarea>
          <p class="adm-hint">أدق طريقة: انسخ النص من موقع هيئة الخبراء (laws.boe.gov.sa) والصقه هنا. بعض ملفات PDF العربية تطلع حروفها مقلوبة.</p></div>
        <div class="d-flex gap-2 mt-3 flex-wrap">
          <button type="button" class="btn btn-outline-primary" data-a="parse">قسّم إلى مواد</button>
          <button type="button" class="btn btn-primary" data-a="saveLaw" disabled id="lwSave">حفظ في المكتبة</button>
        </div>
        <div class="acc-msg" id="lwMsg" role="status" style="margin:10px 0 0"></div>
        <div id="lwParsed"></div>
      </div>
      <div class="adm-box"><h6>المكتبة</h6><div id="lwList"><p class="text-muted small">جاري التحميل...</p></div></div>`;
    parsed = []; loadLaws();
  }

  async function loadLaws() {
    const { data, error } = await sb.from('laws').select('*').order('created_at', { ascending: false });
    const box = $('#lwList'); if (!box) return;
    if (error) { box.innerHTML = `<p class="text-danger small">${esc(errText(error))}</p>`; return; }
    lawsCache = data || [];
    box.innerHTML = lawsCache.length ? lawsCache.map((l) => `<div class="adm-law">
        <div class="t"><b>${esc(l.title)}</b> <span class="adm-tag">${esc(l.kind)}</span>
          <small>عدد المواد: ${l.article_count}${l.issued ? ' · ' + esc(l.issued) : ''}${l.source_url ? ` · <a href="${esc(l.source_url)}" target="_blank" rel="noopener">المصدر</a>` : ''}</small></div>
        <div class="form-check form-switch m-0"><input class="form-check-input" type="checkbox" role="switch" id="lwOn${l.id}" data-on="${l.id}" ${l.active ? 'checked' : ''}><label class="form-check-label small" for="lwOn${l.id}">${l.active ? 'مفعّل' : 'موقوف'}</label></div>
        <button type="button" class="btn btn-sm btn-outline-secondary" data-view="${l.id}">المواد</button>
        <button type="button" class="btn btn-sm btn-outline-danger" data-del="${l.id}">حذف</button>
        <div class="w-100" id="lwArts${l.id}"></div></div>`).join('')
      : '<p class="text-muted small m-0">المكتبة فاضية. أضف أول نظام من الأعلى.</p>';
  }

  function normalize(t) {
    return String(t || '').normalize('NFKC').replace(/\r/g, '').replace(/[‎‏‪-‮ـ]/g, '').replace(/[ \t ]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  }
  function splitArticles(text) {
    const lines = normalize(text).split('\n');
    const head = /^\s*((?:ال)?مادة\s*(?:\(\s*[^)\n]{1,20}\)|[^:：\n]{0,45}?))\s*(?:[:：\-–—]\s*(.*))?$/;
    const out = []; let cur = null, pre = [];
    for (const raw of lines) {
      const line = raw.trim();
      const m = line.match(head);
      if (m && (m[2] !== undefined || line.length <= 50)) {
        if (cur && cur.body.trim()) out.push(cur);
        cur = { num: m[1].replace(/\s+/g, ' ').trim(), body: m[2] ? m[2] + '\n' : '' };
      } else if (cur) cur.body += line + '\n';
      else pre.push(line);
    }
    if (cur && cur.body.trim()) out.push(cur);
    if (out.length >= 2) return out.map((a, i) => ({ ord: i + 1, num: a.num, body: a.body.trim() }));
    // بدون ترقيم مواد: قسّم إلى فقرات
    const paras = normalize(text).split(/\n\s*\n/);
    const chunks = []; let buf = '';
    for (const p of paras) { if ((buf + '\n' + p).length > 1100 && buf) { chunks.push(buf); buf = p; } else buf = buf ? buf + '\n' + p : p; }
    if (buf.trim()) chunks.push(buf);
    return chunks.map((c, i) => ({ ord: i + 1, num: 'جزء ' + (i + 1), body: c.trim() }));
  }

  const loadScript = (src) => new Promise((res, rej) => { if (document.querySelector(`script[src="${src}"]`)) return res(); const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('تعذّر تحميل أداة قراءة الملف.')); document.head.appendChild(s); });
  // نص PDF: بعض ملفات الأنظمة العربية كل حرف فيها قطعة لحالها، فنجمع الحروف حسب المسافة الفعلية بينها بدل ما نحط مسافة بين كل حرف
  function pdfItemsText(items) {
    let out = '', prev = null;
    for (const it of items) {
      if (!it.str) { if (it.hasEOL) { out += '\n'; prev = null; } continue; }
      const tr = it.transform || [1, 0, 0, 1, 0, 0], x = tr[4], y = tr[5], h = Math.hypot(tr[2], tr[3]) || it.height || 10, w = it.width || 0;
      if (prev) {
        if (Math.abs(y - prev.y) > h * 0.5) out += '\n';
        else {
          const gap = Math.min(Math.abs(prev.x - (x + w)), Math.abs(x - (prev.x + prev.w)));
          if (gap > h * 0.15 && !/\s$/.test(out) && !/^\s/.test(it.str)) out += ' ';
        }
      }
      out += it.str; prev = { x, y, w, h };
      if (it.hasEOL) { out += '\n'; prev = null; }
    }
    return out;
  }
  function fixArabic(t) {
    t = String(t).normalize('NFKC');
    // سطر كله حروف مفرّقة بمسافات (ملف بدون مواقع دقيقة): نلصق الحروف ونخلي المسافة المزدوجة فاصل كلمات
    t = t.split('\n').map((ln) => {
      const tok = ln.trim().split(/ +/); if (tok.length < 6) return ln;
      const single = tok.filter((x) => /^[\u0621-\u064A\u0660-\u0669]$/.test(x)).length;
      if (single / tok.length < 0.6) return ln;
      return ln.split(/ {2,}/).map((w) => w.replace(/ (?=\S)/g, '')).join(' ');
    }).join('\n');
    // «ى» في وسط الكلمة أكيد «ي»
    return t.replace(/ى(?=[\u0621-\u064A])/g, 'ي');
  }
  async function fileText(file) {
    const name = file.name.toLowerCase();
    if (name.endsWith('.pdf')) {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      const pdf = await window.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
      let t = '';
      for (let i = 1; i <= pdf.numPages; i++) t += pdfItemsText((await (await pdf.getPage(i)).getTextContent()).items) + '\n\n';
      return fixArabic(t);
    }
    if (name.endsWith('.docx')) {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js');
      return (await window.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value;
    }
    const raw = await file.text();
    if (/\.html?$/.test(name)) {
      const doc = new DOMParser().parseFromString(raw.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li|h\d|tr)>/gi, '\n'), 'text/html');
      return doc.body.textContent || '';
    }
    return raw;
  }

  // ---------- قراءة العقود المصوّرة ----------
  const isImg = (f) => /^image\//.test(f.type) || /\.(jpe?g|png|webp|heic)$/i.test(f.name);
  function toJpeg(src, maxSide) {
    const k = Math.min(1, maxSide / Math.max(src.width, src.height));
    const c = document.createElement('canvas'); c.width = Math.round(src.width * k); c.height = Math.round(src.height * k);
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(src, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.82);
  }
  async function imgFile(f) {
    const url = URL.createObjectURL(f);
    try { const im = new Image(); im.src = url; await im.decode(); return toJpeg(im, 1800); }
    catch (e) { throw new Error('ما قدرت أفتح الصورة ' + f.name + ' (لو صيغتها HEIC حوّلها JPG).'); }
    finally { URL.revokeObjectURL(url); }
  }
  async function pdfPages(f) {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const pdf = await window.pdfjsLib.getDocument({ data: await f.arrayBuffer() }).promise, out = [];
    for (let i = 1; i <= Math.min(pdf.numPages, 30); i++) {
      const pg = await pdf.getPage(i), v = pg.getViewport({ scale: 1 }), vp = pg.getViewport({ scale: 1700 / Math.max(v.width, v.height) });
      const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
      await pg.render({ canvasContext: c.getContext('2d'), viewport: vp, background: '#ffffff' }).promise;
      out.push(toJpeg(c, 1800));
    }
    return out;
  }
  async function ocrPages(images, onStep) {
    const parts = [];
    for (let i = 0; i < images.length; i += 4) {
      const batch = images.slice(i, i + 4);
      onStep(i + 1, Math.min(i + 4, images.length), images.length);
      const { data, error } = await sb.functions.invoke('ocr', { body: { images: batch } });
      if (error) {
        let m = error.message || '';
        try { const j = await error.context.json(); if (j && j.error) m = j.error; } catch (x) {}
        if (/not found|404|Failed to send|FunctionsFetchError|FunctionsRelayError/i.test(m + ' ' + (error.name || ''))) m = 'دالة القراءة (ocr) مو منشورة في Supabase للحين.';
        throw new Error(m);
      }
      parts.push(data.text);
    }
    return parts.join('\n\n');
  }
  async function readUpload(files, step) {
    files = [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    const imgs = files.filter(isImg), docs = files.filter((f) => !isImg(f));
    let text = '', pages = [];
    for (const f of docs) {
      const t = await fileText(f);
      if (/\.pdf$/i.test(f.name)) {
        const pdf = await window.pdfjsLib.getDocument({ data: await f.arrayBuffer() }).promise;
        if (t.replace(/\s+/g, '').length < 150 * pdf.numPages) { pages = pages.concat(await pdfPages(f)); continue; }   // PDF مصوّر
      }
      text += t + '\n\n';
    }
    for (const f of imgs) pages.push(await imgFile(f));
    if (pages.length) text += await ocrPages(pages, step);
    return text;
  }

  function showParsed() {
    const box = $('#lwParsed');
    $('#lwSave').disabled = !parsed.length;
    box.innerHTML = parsed.length ? `<div class="adm-parsed">${parsed.map((a) => `<div class="adm-art"><b>${esc(a.num)}</b><p>${esc(a.body)}</p></div>`).join('')}</div>` : '';
  }

  async function admClick(e) {
    const t = e.target;
    const tab = t.closest('[data-tab]'); if (tab) { admTab = tab.dataset.tab; admRender(); return; }
    const a = t.closest('[data-a]') && t.closest('[data-a]').dataset.a;
    if (a === 'close') { adminHide(); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    if (a && EXTRA[a]) { EXTRA[a](t.closest('[data-a]')); return; }
    if (a === 'parse') {
      const file = $('#lwFile').files[0]; let text = $('#lwText').value;
      msg('lwMsg', 'جاري القراءة...', true);
      try { if (file) text = (await fileText(file)) + '\n' + text; } catch (x) { return msg('lwMsg', errText(x)); }
      if (!text.trim()) return msg('lwMsg', 'اختر ملف أو الصق نص النظام.');
      parsed = splitArticles(text);
      showParsed();
      const real = parsed.length && !/^جزء /.test(parsed[0].num);
      msg('lwMsg', real ? `تم استخراج المواد (${parsed.length}). راجعها ثم احفظ.` : `ما لقيت ترقيم مواد، فقسّمته إلى أجزاء (${parsed.length}). راجعها ثم احفظ.`, true);
      return;
    }
    if (a === 'saveLaw') {
      const title = $('#lwTitle').value.trim();
      if (!title) return msg('lwMsg', 'اكتب اسم النظام.');
      if (!parsed.length) return msg('lwMsg', 'قسّم النص إلى مواد أولاً.');
      $('#lwSave').disabled = true; msg('lwMsg', 'جاري الحفظ...', true);
      const { data: law, error } = await sb.from('laws').insert({ title, kind: $('#lwKind').value, issued: $('#lwIssued').value.trim() || null, source_url: $('#lwUrl').value.trim() || null }).select().single();
      if (error) { $('#lwSave').disabled = false; return msg('lwMsg', errText(error)); }
      for (let i = 0; i < parsed.length; i += 200) {
        const rows = parsed.slice(i, i + 200).map((r) => ({ law_id: law.id, ord: r.ord, num: r.num, body: r.body }));
        const { error: e2 } = await sb.from('law_articles').insert(rows);
        if (e2) { await sb.from('laws').delete().eq('id', law.id); $('#lwSave').disabled = false; return msg('lwMsg', 'ما انحفظ: ' + errText(e2)); }
      }
      msg('lwMsg', `انحفظ «${title}»، عدد المواد ${parsed.length} ✓`, true);
      ['lwTitle', 'lwIssued', 'lwUrl', 'lwText'].forEach((id) => { $('#' + id).value = ''; }); $('#lwFile').value = '';
      parsed = []; showParsed(); loadLaws();
      return;
    }
    const del = t.closest('[data-del]');
    if (del) {
      const l = lawsCache.find((x) => String(x.id) === del.dataset.del);
      if (del.dataset.sure !== '1') { del.dataset.sure = '1'; del.textContent = 'متأكد؟ اضغط للحذف'; setTimeout(() => { if (del.isConnected) { del.dataset.sure = ''; del.textContent = 'حذف'; } }, 4000); return; }
      const { error } = await sb.from('laws').delete().eq('id', l.id);
      if (error) alert(errText(error)); loadLaws(); return;
    }
    const view = t.closest('[data-view]');
    if (view) {
      const box = $('#lwArts' + view.dataset.view);
      if (box.innerHTML) { box.innerHTML = ''; return; }
      box.innerHTML = '<p class="small text-muted mt-2">جاري التحميل...</p>';
      const { data } = await sb.from('law_articles').select('num,body').eq('law_id', view.dataset.view).order('ord').limit(1000);
      box.innerHTML = `<div class="adm-parsed">${(data || []).map((r) => `<div class="adm-art"><b>${esc(r.num)}</b><p>${esc(r.body)}</p></div>`).join('')}</div>`;
      return;
    }
    const save = t.closest('[data-save]');
    if (save) {
      const id = save.dataset.save, row = save.closest('tr');
      const plan = row.querySelector('[data-plan]').value, until = row.querySelector('[data-until]').value || null;
      save.disabled = true;
      const { error } = await sb.from('profiles').update({ plan, sub_until: plan === 'sub' ? until : null }).eq('id', id);
      save.disabled = false;
      save.textContent = error ? 'خطأ' : 'تم ✓';
      if (error) alert(errText(error));
      setTimeout(() => { if (save.isConnected) save.textContent = 'حفظ'; }, 1600);
    }
  }

  async function admChange(e) {
    const on = e.target.closest('[data-on]');
    if (on) {
      const { error } = await sb.from('laws').update({ active: on.checked }).eq('id', on.dataset.on);
      if (error) { on.checked = !on.checked; alert(errText(error)); }
      on.nextElementSibling.textContent = on.checked ? 'مفعّل' : 'موقوف';
    }
    if (e.target.id === 'usrQ') renderUserRows();
    if (e.target.matches('[data-tyon]')) e.target.nextElementSibling.textContent = e.target.checked ? 'ظاهر' : 'موقوف';
  }

  let usersCache = [];
  async function renderUsers() {
    $('#admBody').innerHTML = `<div class="adm-box"><h6>المشتركين</h6>
      <p class="adm-hint" style="margin:0 0 10px">«مشترك» يصيغ بمفتاح الإدارة حتى تاريخ الانتهاء (فاضي = بدون انتهاء). «غير مشترك» يصيغ بمفتاحه الخاص فقط.</p>
      <input class="form-control mb-2" id="usrQ" type="search" placeholder="ابحث بالاسم أو الإيميل" style="max-width:340px">
      <div class="adm-wrap" id="usrRows"><p class="text-muted small">جاري التحميل...</p></div></div>`;
    $('#usrQ').addEventListener('input', renderUserRows);
    const { data, error } = await sb.from('profiles').select('*').order('created_at', { ascending: false });
    if (error) { $('#usrRows').innerHTML = `<p class="text-danger small">${esc(errText(error))}</p>`; return; }
    usersCache = data || []; renderUserRows();
  }
  function renderUserRows() {
    const q = ($('#usrQ') && $('#usrQ').value.trim().toLowerCase()) || '';
    const rows = usersCache.filter((u) => !q || (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q));
    $('#usrRows').innerHTML = rows.length ? `<table class="adm-users"><thead><tr><th>الاسم</th><th>الإيميل</th><th>الاشتراك</th><th>ينتهي</th><th></th></tr></thead><tbody>
      ${rows.map((u) => `<tr><td>${esc(u.name || '')}${u.is_admin ? ' <span class="adm-tag">المالك</span>' : ''}</td><td class="e">${esc(u.email || '')}</td>
        <td><select class="form-select form-select-sm" data-plan style="min-width:130px" ${u.is_admin ? 'disabled' : ''}><option value="none" ${u.plan !== 'sub' ? 'selected' : ''}>غير مشترك</option><option value="sub" ${u.plan === 'sub' ? 'selected' : ''}>مشترك</option></select></td>
        <td><input type="date" class="form-control form-control-sm" data-until value="${esc(u.sub_until || '')}" ${u.is_admin ? 'disabled' : ''}></td>
        <td>${u.is_admin ? '' : `<button type="button" class="btn btn-sm btn-primary" data-save="${u.id}">حفظ</button>`}</td></tr>`).join('')}
      </tbody></table>` : '<p class="text-muted small m-0">ما فيه نتائج.</p>';
  }

  // ---------- إعدادات الموقع ----------
  const SET_FIELDS = [
    ['title', 'اسم المنصة', 'input', 'عقود'],
    ['subtitle', 'الوصف تحت الاسم', 'input', 'صياغة قانونية فاخرة'],
    ['disclaimer', 'نص إخلاء المسؤولية أسفل العقد', 'textarea', ''],
    ['wordHeader', 'الكليشة العلوية في ملف Word', 'input', ''],
    ['wordFooter', 'الكليشة السفلية في ملف Word', 'input', ''],
    ['subscribeMsg', 'رسالة الاشتراك لغير المشتركين', 'textarea', 'مثال: للاشتراك تواصل واتساب 05xxxxxxxx'],
    ['model', 'نموذج الذكاء الاصطناعي (OpenRouter)', 'input', 'openai/gpt-4o-mini'],
    ['ocrModel', 'نموذج قراءة العقود المصوّرة (OpenRouter)', 'input', 'google/gemini-2.5-flash'],
    ['lawyerName', 'اسم المحامي (لإرسال العقود الموقّعة)', 'input', 'مثال: مكتب فلان للمحاماة'],
    ['lawyerWhatsapp', 'واتساب المحامي (بالصيغة الدولية)', 'input', '9665xxxxxxxx'],
    ['lawyerEmail', 'إيميل المحامي', 'input', 'lawyer@example.com'],
  ];
  let siteCfg = {}, typesCache = [];
  async function loadSite() {
    const [a, b] = await Promise.all([
      sb.from('site_settings').select('value').eq('key', 'site').maybeSingle(),
      sb.from('contract_types').select('*').order('ord').order('id'),
    ]);
    siteCfg = (a.data && a.data.value) || {};
    typesCache = b.data || [];
    if (window.applySite) window.applySite(siteCfg, typesCache.filter((x) => x.active));
  }
  function renderSettings() {
    const S = Object.assign({}, window.OQ_SITE || {}, siteCfg);
    $('#admBody').innerHTML = `<div class="adm-box"><h6>إعدادات الموقع</h6>
      ${SET_FIELDS.map(([k, label, kind, ph]) => `<div class="mb-3"><label class="form-label" for="set_${k}">${label}</label>
        ${kind === 'textarea' ? `<textarea class="form-control" id="set_${k}" rows="2" placeholder="${esc(ph)}">${esc(S[k] || '')}</textarea>`
          : `<input class="form-control" id="set_${k}" ${['model', 'ocrModel', 'lawyerWhatsapp', 'lawyerEmail'].includes(k) ? 'dir="ltr"' : ''} placeholder="${esc(ph)}" value="${esc(S[k] || '')}">`}</div>`).join('')}
      <p class="adm-hint" style="margin:-6px 0 12px">النموذج يُكتب بصيغة OpenRouter مثل <span dir="ltr">openai/gpt-4o-mini</span> أو <span dir="ltr">anthropic/claude-sonnet-4.5</span>. اتركه فاضي للافتراضي.</p>
      <button type="button" class="btn btn-primary" data-a="saveSettings">حفظ الإعدادات</button>
      <div class="acc-msg" id="setMsg" role="status" style="margin:10px 0 0"></div></div>`;
  }

  // ---------- أنواع العقود ----------
  function renderTypes() {
    $('#admBody').innerHTML = `<div class="adm-box"><h6>أنواع العقود</h6>
      <p class="adm-hint" style="margin:0 0 10px">هذي القائمة اللي يختار منها المستخدم «نوع العقد». الموقوف ما يظهر للمستخدمين.</p>
      <div id="tyRows"></div>
      <div class="d-flex gap-2 mt-3 flex-wrap"><input class="form-control" id="tyNew" placeholder="نوع جديد، مثال: عقد عمل" style="max-width:320px">
        <button type="button" class="btn btn-primary" data-a="addType">إضافة</button></div>
      <div class="acc-msg" id="tyMsg" role="status" style="margin:10px 0 0"></div></div>`;
    drawTypes();
  }
  function drawTypes() {
    $('#tyRows').innerHTML = typesCache.length ? typesCache.map((x, i) => `<div class="adm-law" data-ty="${x.id}">
        <input class="form-control form-control-sm" data-tylabel value="${esc(x.label)}" style="flex:1;min-width:180px">
        <div class="form-check form-switch m-0"><input class="form-check-input" type="checkbox" role="switch" data-tyon id="tyOn${x.id}" ${x.active ? 'checked' : ''}><label class="form-check-label small" for="tyOn${x.id}">${x.active ? 'ظاهر' : 'موقوف'}</label></div>
        <button type="button" class="btn btn-sm btn-outline-secondary" data-a="tyUp" ${i ? '' : 'disabled'} aria-label="لفوق">▲</button>
        <button type="button" class="btn btn-sm btn-outline-secondary" data-a="tyDown" ${i < typesCache.length - 1 ? '' : 'disabled'} aria-label="لتحت">▼</button>
        <button type="button" class="btn btn-sm btn-primary" data-a="tySave">حفظ</button>
        <button type="button" class="btn btn-sm btn-outline-danger" data-a="tyDel">حذف</button></div>`).join('')
      : '<p class="text-muted small m-0">ما فيه أنواع. أضف أول نوع.</p>';
  }
  async function typesChanged() { await loadSite(); if ($('#tyRows')) drawTypes(); }

  // ---------- نماذج العقود ----------
  let tplParsed = '';
  // إخفاء البيانات الشخصية من النماذج: الإيميل، الجوال، رقم الهوية/الإقامة، الآيبان
  function maskPII(t) {
    let n = 0; const D = '[0-9\u0660-\u0669\u06F0-\u06F9]';
    const sub = (re, rep) => { t = t.replace(re, () => { n++; return rep; }); };
    sub(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '[البريد الإلكتروني]');
    sub(/\bSA[0-9]{2}[\s0-9A-Z]{18,30}/gi, '[رقم الآيبان]');
    sub(new RegExp('(?:\\+|00)?(?:966|٩٦٦)\\s?' + D + '{9}|(?:0|٠)(?:5|٥)' + D + '{8}', 'g'), '[رقم الجوال]');
    sub(new RegExp('(?<!' + D + ')[12١٢]' + D + '{9}(?!' + D + ')', 'g'), '[رقم الهوية]');
    return { t, n };
  }
  function typeOptions(sel) { return `<option value="">كل الأنواع</option>` + typesCache.map((x) => `<option value="${x.id}" ${String(sel) === String(x.id) ? 'selected' : ''}>${esc(x.label)}</option>`).join(''); }
  function renderTemplates() {
    $('#admBody').innerHTML = `<div class="adm-box"><h6>إضافة نموذج عقد</h6>
        <p class="adm-hint" style="margin:0 0 10px">ارفع عقد جاهز من مكتبك (Word أو PDF). لما يختار المستخدم نفس نوع العقد، الصياغة تمشي على أسلوب النموذج وترتيب بنوده. النماذج ما يشوفها إلا أنت.</p>
        <div class="adm-grid">
          <div><label class="form-label" for="tpTitle">اسم النموذج <span class="req">*</span></label><input class="form-control" id="tpTitle" placeholder="مثال: عقد إيجار سكني — نموذج المكتب"></div>
          <div><label class="form-label" for="tpType">نوع العقد</label><select class="form-select" id="tpType">${typeOptions('')}</select></div>
        </div>
        <div class="mt-3"><label class="form-label" for="tpFile">الملف: Word أو PDF، أو صور صفحات العقد (سكانر أو جوال)</label><input type="file" class="form-control" id="tpFile" multiple accept=".pdf,.docx,.txt,.html,.htm,image/*">
          <p class="adm-hint" style="margin:6px 0 0">للصور: اختر كل صفحات العقد مرة وحدة ومرقّمة بالترتيب (1، 2، 3...). العقد المصوّر يقراه الذكاء الاصطناعي ويخفي البيانات الشخصية.</p></div>
        <div class="mt-3"><label class="form-label" for="tpText">أو الصق نص العقد</label><textarea class="form-control" id="tpText" rows="4"></textarea></div>
        <div class="d-flex gap-2 mt-3 flex-wrap"><button type="button" class="btn btn-outline-primary" data-a="tpRead">اقرأ الملف</button>
          <button type="button" class="btn btn-primary" data-a="tpSave" id="tpSave" disabled>حفظ النموذج</button></div>
        <div class="acc-msg" id="tpMsg" role="status" style="margin:10px 0 0"></div><div id="tpPrev"></div></div>
      <div class="adm-box"><h6>النماذج المحفوظة</h6><div id="tpList"><p class="text-muted small">جاري التحميل...</p></div></div>`;
    tplParsed = ''; loadTemplates();
  }
  let tplCache = [];
  async function loadTemplates() {
    const { data, error } = await sb.from('contract_templates').select('id,title,type_id,file_name,created_at,body').order('created_at', { ascending: false });
    const box = $('#tpList'); if (!box) return;
    if (error) { box.innerHTML = `<p class="text-danger small">${esc(errText(error))}</p>`; return; }
    tplCache = data || [];
    const tName = (id) => (typesCache.find((x) => x.id === id) || {}).label || 'كل الأنواع';
    box.innerHTML = tplCache.length ? tplCache.map((x) => `<div class="adm-law" data-tp="${x.id}">
        <div class="t"><b>${esc(x.title)}</b> <span class="adm-tag">${esc(tName(x.type_id))}</span><small>${esc(x.file_name || 'نص ملصوق')} · عدد الأحرف ${x.body.length}</small></div>
        <button type="button" class="btn btn-sm btn-outline-secondary" data-a="tpView">عرض</button>
        <button type="button" class="btn btn-sm btn-outline-danger" data-a="tpDel">حذف</button>
        <div class="w-100" data-tpbody></div></div>`).join('')
      : '<p class="text-muted small m-0">ما فيه نماذج للحين.</p>';
  }

  const confirmBtn = (b, label) => { if (b.dataset.sure === '1') return true; b.dataset.sure = '1'; const o = b.textContent; b.textContent = label; setTimeout(() => { if (b.isConnected) { b.dataset.sure = ''; b.textContent = o; } }, 4000); return false; };
  const EXTRA = {
    async saveSettings() {
      const v = {}; SET_FIELDS.forEach(([k]) => { v[k] = $('#set_' + k).value.trim(); });
      const { error } = await sb.from('site_settings').upsert({ key: 'site', value: v, updated_at: new Date().toISOString() });
      if (error) return msg('setMsg', errText(error));
      siteCfg = v; if (window.applySite) window.applySite(v, null); msg('setMsg', 'انحفظت الإعدادات ✓', true);
    },
    async addType() {
      const label = $('#tyNew').value.trim(); if (!label) return msg('tyMsg', 'اكتب اسم النوع.');
      const ord = typesCache.reduce((m, x) => Math.max(m, x.ord), 0) + 1;
      const { error } = await sb.from('contract_types').insert({ label, ord });
      if (error) return msg('tyMsg', errText(error));
      $('#tyNew').value = ''; msg('tyMsg', 'انضاف ✓', true); typesChanged();
    },
    async tySave(b) {
      const row = b.closest('[data-ty]'), label = row.querySelector('[data-tylabel]').value.trim();
      if (!label) return msg('tyMsg', 'الاسم ما يكون فاضي.');
      const { error } = await sb.from('contract_types').update({ label, active: row.querySelector('[data-tyon]').checked }).eq('id', row.dataset.ty);
      if (error) return msg('tyMsg', errText(error)); msg('tyMsg', 'انحفظ ✓', true); typesChanged();
    },
    async tyDel(b) {
      if (!confirmBtn(b, 'متأكد؟')) return;
      const { error } = await sb.from('contract_types').delete().eq('id', b.closest('[data-ty]').dataset.ty);
      if (error) return msg('tyMsg', errText(error)); typesChanged();
    },
    tyUp(b) { return moveType(b, -1); },
    tyDown(b) { return moveType(b, 1); },
    async tpRead() {
      const files = $('#tpFile').files, f = files[0]; let text = $('#tpText').value;
      const btn = document.querySelector('[data-a="tpRead"]'); if (btn) btn.disabled = true;
      msg('tpMsg', 'جاري القراءة...', true);
      try { if (files.length) text = (await readUpload(files, (a, b, n) => msg('tpMsg', n > 1 ? `جاري قراءة الصفحات ${a}-${b} من ${n} بالذكاء الاصطناعي... (تاخذ دقيقة تقريباً)` : 'جاري قراءة الصفحة بالذكاء الاصطناعي...', true))) + '\n' + text; }
      catch (x) { if (btn) btn.disabled = false; return msg('tpMsg', errText(x)); }
      if (btn) btn.disabled = false;
      tplParsed = normalize(text);
      if (!tplParsed) return msg('tpMsg', 'اختر ملف أو الصق النص. (لو الـ PDF صور ممسوحة ما ينقرأ، الصق النص بدالها)');
      const mk = maskPII(tplParsed); tplParsed = mk.t;
      if (!$('#tpTitle').value.trim() && f) $('#tpTitle').value = f.name.replace(/\.[^.]+$/, '');
      $('#tpSave').disabled = false;
      $('#tpPrev').innerHTML = `<label class="form-label mt-3" for="tpEdit">النص (تقدر تعدّل عليه قبل الحفظ، مثل حذف أسماء الأشخاص أو المبالغ الخاصة)</label><textarea class="form-control" id="tpEdit" rows="14" dir="auto">${esc(tplParsed)}</textarea>`;
      msg('tpMsg', `انقرأ النص، عدد الأحرف ${tplParsed.length}.` + (mk.n ? ` انخفى ${mk.n} من البيانات الشخصية (جوال، هوية، إيميل، آيبان).` : '') + ' راجع الأسماء بنفسك ثم احفظ.', true);
    },
    async tpSave() {
      const title = $('#tpTitle').value.trim(); if (!title) return msg('tpMsg', 'اكتب اسم النموذج.');
      if ($('#tpEdit')) tplParsed = maskPII($('#tpEdit').value.trim()).t;
      if (!tplParsed) return msg('tpMsg', 'اقرأ الملف أولاً.');
      const f = $('#tpFile').files[0];
      const { error } = await sb.from('contract_templates').insert({ title, type_id: Number($('#tpType').value) || null, file_name: f ? f.name : null, body: tplParsed });
      if (error) return msg('tpMsg', errText(error));
      msg('tpMsg', `انحفظ «${title}» ✓`, true);
      $('#tpTitle').value = ''; $('#tpText').value = ''; $('#tpFile').value = ''; $('#tpPrev').innerHTML = ''; tplParsed = ''; $('#tpSave').disabled = true;
      loadTemplates();
    },
    tpView(b) {
      const row = b.closest('[data-tp]'), box = row.querySelector('[data-tpbody]');
      if (box.innerHTML) { box.innerHTML = ''; return; }
      const x = tplCache.find((t) => String(t.id) === row.dataset.tp);
      box.innerHTML = `<div class="adm-parsed"><div class="adm-art" style="white-space:pre-wrap">${esc(x ? x.body : '')}</div></div>`;
    },
    async tpDel(b) {
      if (!confirmBtn(b, 'متأكد؟ اضغط للحذف')) return;
      const { error } = await sb.from('contract_templates').delete().eq('id', b.closest('[data-tp]').dataset.tp);
      if (error) alert(errText(error)); loadTemplates();
    },
  };
  async function moveType(b, dir) {
    const i = typesCache.findIndex((x) => String(x.id) === b.closest('[data-ty]').dataset.ty), j = i + dir;
    if (j < 0 || j >= typesCache.length) return;
    const A = typesCache[i], B = typesCache[j];
    const oa = A.ord === B.ord ? i + 1 : A.ord, ob = A.ord === B.ord ? j + 1 : B.ord;
    await Promise.all([sb.from('contract_types').update({ ord: ob }).eq('id', A.id), sb.from('contract_types').update({ ord: oa }).eq('id', B.id)]);
    typesChanged();
  }

  // ---------- تشغيل ----------
  window.OQ = { ready: READY, draft, open: () => open(), user: () => st.user, isSub, sb: () => sb, isAdmin: () => !!(st.prof && st.prof.is_admin), refresh: () => { st.prof = null; return setUser(st.user); } };
  function boot() {
    mount();
    if (READY) {
      makeClient();
      loadSite().catch(() => {});
      sb.auth.getSession().then(({ data }) => setUser(data.session ? data.session.user : null));
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
