/* عقود — توقيع الطرفين في آخر العقد
   خانتين متقابلتين (الاسم، التوقيع، التاريخ)، لوحة توقيع بالإصبع بلون أزرق أو أسود أو أحمر،
   قفل العقد بعد توقيع الطرفين وتصدير PDF مباشرة، ورقم مرجعي، وخيار «إحالة العقد للمحامي» لمن يوافق. */
(function () {
  const PEN = { blue: '#1d4ed8', black: '#111827', red: '#c0392b' };
  const PEN_N = { blue: 'أزرق', black: 'أسود', red: 'أحمر' };
  const esc = (x) => String(x ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const LEGAL = 'يقر الطرفان بأن توقيعهما الإلكتروني على هذا العقد صادر عنهما بإرادتهما وملزم لهما، وله ما للتوقيع الخطي من حجية وفقاً لنظام التعاملات الإلكترونية الصادر بالمرسوم الملكي رقم (م/18) وتاريخ 8/3/1428هـ، ويُعد هذا العقد وسجل توقيعه دليلاً رقمياً يُحتج به وفقاً لنظام الإثبات الصادر بالمرسوم الملكي رقم (م/43) وتاريخ 26/5/1443هـ.';
  const LAWYER = 'يوافق الطرفان على إحالة هذا العقد إلى محامٍ لإعادة صياغته بصيغة نظامية والمصادقة عليه، ويحق للمحامي التواصل مع الطرفين للتحقق من صحة بيانات العقد قبل ذلك، ويبقى هذا العقد ملزماً لهما إلى حين ذلك.';
  let S = null;            // { ref, p1, p2, title, lawyer, sig: {1:{img,at,c}, 2:{...}}, done }
  let pad = { p: null, color: 'blue', strokes: [], cur: null };
  const CFG = { remote: false, canSign: null, onSigned: null };   // remote: صفحة توقيع العميل عن بُعد
  const pending = () => S && S.link && !both();                    // أُرسل رابط للطرف الثاني وما وقّع للحين
  const canTap = (p) => S && !both() && (CFG.remote ? p === 2 : !pending());
  const $ = (id) => document.getElementById(id);
  const site = () => window.OQ_SITE || {};

  function stamp(d) {
    d = d || new Date();
    const g = d.toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' });
    const h = d.toLocaleDateString('ar-SA-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' });
    const t = d.toLocaleTimeString('ar-SA-u-nu-latn', { hour: 'numeric', minute: '2-digit' });
    return { full: g + ' م — ' + h, time: t, iso: d.toISOString() };
  }
  function newRef() { const d = new Date(), z = (n) => String(n).padStart(2, '0'); return 'OQ-' + d.getFullYear() + z(d.getMonth() + 1) + z(d.getDate()) + '-' + Math.floor(1000 + Math.random() * 9000); }
  const both = () => S && S.sig[1] && S.sig[2];

  /* ---------- الرسم داخل العقد ---------- */
  function party(p, label, name) {
    const s = S.sig[p];
    return '<div class="sg-party"><h4>' + label + '</h4>' +
      '<div class="sg-row"><b>الاسم /</b><span>' + esc(name || '') + '</span></div>' +
      '<div class="sg-row"><b>التوقيع /</b><span class="sg-line"></span></div>' +
      '<div class="sg-box' + (s ? ' done' : '') + '"' + (canTap(p) ? ' role="button" tabindex="0" data-sg="' + p + '" aria-label="توقيع ' + label + '"' : '') + '>' +
      (s ? '<img alt="توقيع ' + label + '" src="' + s.img + '">' + (canTap(p) ? '<span class="sg-re no-print">إعادة</span>' : '') : canTap(p) ? '<span class="sg-tap no-print">اضغط هنا للتوقيع ✍️</span>' : pending() && p === 2 ? '<span class="sg-tap no-print">بانتظار توقيعه عبر الرابط</span>' : '') + '</div>' +
      '<div class="sg-row"><b>التاريخ /</b><span>' + (s ? esc(s.at).replace(' — ', '<br>') : '') + '</span></div></div>';
  }
  function paint() {
    const box = $('sigBlock'), bar = $('sigBar') || { set innerHTML(v) {} }; if (!box) return;
    if (!S) { box.innerHTML = ''; bar.innerHTML = ''; lock(false); return; }
    const done = both();
    box.innerHTML = '<p class="sg-lawyer">' + LEGAL + '</p>' + (S.lawyer ? '<p class="sg-lawyer sg-l2">' + LAWYER + '</p>' : '') +
      '<div class="sg-grid">' + party(1, 'الطرف الأول', S.p1) + party(2, 'الطرف الثاني', S.p2) + '</div>' +
      '<div class="sg-foot">رقم العقد: <b dir="ltr">' + esc(S.ref) + '</b>' + (done ? ' · وُقّع من الطرفين: ' + esc(S.doneAt || '') : '') + '</div>' + audit();
    const st = done ? '<span class="sg-ok">✓ وقّع الطرفين، والعقد مقفل عن التعديل</span>' : pending() ? 'أُرسل رابط التوقيع، بانتظار توقيع الطرف الثاني' : S.sig[1] || S.sig[2] ? 'بانتظار توقيع ' + (S.sig[1] ? 'الطرف الثاني' : 'الطرف الأول') : 'بانتظار توقيع الطرفين';
    const fixed = done || pending();
    bar.innerHTML = '<label class="sg-law' + (fixed ? ' off' : '') + '"><input type="checkbox" id="sgLawyer"' + (S.lawyer ? ' checked' : '') + (fixed ? ' disabled' : '') + '> العميل موافق على إحالة العقد للمحامي لصياغته رسمياً</label>' +
      '<div class="sg-actions"><span class="sg-state">' + st + '</span>' +
      (done ? '<button type="button" class="btn btn-sm btn-primary" data-sga="pdf">⤓ PDF الموقّع</button>' : '') +
      (done && S.lawyer ? '<button type="button" class="btn btn-sm btn-success" data-sga="lawyer">📨 أرسل العقد للمحامي</button>' : '') +
      (S.sig[1] && !S.sig[2] && !S.link && isOwner() ? '<button type="button" class="btn btn-sm btn-success" data-sga="link">🔗 رابط توقيع للطرف الثاني</button>' : '') +
      (pending() ? '<button type="button" class="btn btn-sm btn-outline-primary" data-sga="chk">تحديث الحالة</button>' : '') +
      ((S.sig[1] || S.sig[2]) && !pending() ? '<button type="button" class="btn btn-sm btn-outline-secondary" data-sga="reset">' + (done ? 'فتح العقد ومسح التوقيعات' : 'مسح التوقيعات') + '</button>' : '') + '</div>' +
      linkBox() +
      '<p class="sg-note">عقد سريع للتعاملات والخدمات اليومية. للعقود المهمة يُفضّل توثيقه رسمياً (مثل التوقيع عبر نفاذ) أو صياغته عند محامٍ.</p>';
    lock(done || pending());
  }
  function audit() {
    const a = S.audit; if (!a) return '';
    const f = (x) => { if (!x) return '—'; const t = stamp(new Date(x)); return t.full + ' الساعة ' + t.time; };
    return '<div class="sg-audit"><b>سجل التوقيع الإلكتروني للطرف الثاني</b>' +
      '<div><span>طريقة التوقيع</span><span>رابط خاص لمرة واحدة، مع التحقق بآخر 4 أرقام من الجوال</span></div>' +
      '<div><span>فتح الرابط</span><span>' + esc(f(a.opened)) + '</span></div>' +
      '<div><span>وقت التوقيع</span><span>' + esc(f(a.signed)) + '</span></div>' +
      '<div><span>عنوان الإنترنت</span><span dir="ltr">' + esc(a.ip || '—') + '</span></div>' +
      '<div><span>الجهاز</span><span dir="ltr">' + esc(device(a.ua)) + '</span></div>' +
      '<div><span>بصمة العقد (SHA-256)</span><span dir="ltr" class="sg-hash">' + esc(a.hash || '—') + '</span></div></div>';
  }
  function device(ua) {
    ua = String(ua || ''); if (!ua) return '—';
    const os = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : '';
    const br = /Edg\//.test(ua) ? 'Edge' : /SamsungBrowser/.test(ua) ? 'Samsung Internet' : /CriOS|Chrome\//.test(ua) ? 'Chrome' : /FxiOS|Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : '';
    return [os, br].filter(Boolean).join(' · ') || ua.slice(0, 60);
  }
  function lock(on) {
    const prev = $('contractPreview'), te = $('toggleEdit');
    if (on) { if (prev && prev.isContentEditable) { const f = $('finishEdit'); if (f) f.click(); } if (prev) prev.contentEditable = 'false'; }
    if (te) { te.disabled = !!on; te.title = on ? 'العقد موقّع ومقفل. امسح التوقيعات لتعديله.' : ''; }
  }

  /* ---------- لوحة التوقيع ---------- */
  function ensurePad() {
    if ($('sgOv')) return;
    const ov = document.createElement('div'); ov.id = 'sgOv'; ov.className = 'sg-ov no-print'; ov.hidden = true; ov.dir = 'rtl';
    ov.innerHTML = '<div class="sg-pad" role="dialog" aria-modal="true" aria-labelledby="sgH"><h3 id="sgH">التوقيع</h3>' +
      '<div class="sg-pens"><span>لون القلم:</span>' + Object.keys(PEN).map((c) => '<button type="button" class="sg-sw" data-pen="' + c + '" aria-label="' + PEN_N[c] + '" aria-pressed="' + (c === pad.color) + '" style="background:' + PEN[c] + '"></button>').join('') + '</div>' +
      '<canvas class="sg-cv" id="sgCv" aria-label="مساحة التوقيع"></canvas>' +
      '<div class="sg-pbar"><button type="button" class="btn btn-primary" data-sgp="ok">اعتماد التوقيع</button><button type="button" class="btn btn-outline-secondary" data-sgp="undo">تراجع</button><button type="button" class="btn btn-outline-secondary" data-sgp="clear">مسح</button><button type="button" class="btn btn-outline-secondary" data-sgp="cancel">إلغاء</button></div><div class="sg-msg" id="sgMsg"></div></div>';
    document.body.appendChild(ov);
    const cv = $('sgCv'), ctx = cv.getContext('2d');
    const pos = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    // قلم التوقيع: سماكة الخط حسب ضغط القلم، وتجاهل لمس الكف أثناء استخدامه
    const pt = (e) => { const q = pos(e); if (e.pointerType === 'pen') q.push(1.2 + Math.min(1, e.pressure || 0.5) * 3); return q; };
    cv.addEventListener('pointerdown', (e) => {
      if (pad.cur) return;
      if (e.pointerType === 'pen') pad.penAt = Date.now(); else if (e.pointerType === 'touch' && pad.penAt && Date.now() - pad.penAt < 4000) return;
      try { cv.setPointerCapture(e.pointerId); } catch (x) {} pad.cur = { c: pad.color, id: e.pointerId, pen: e.pointerType === 'pen', pts: [pt(e)] }; draw();
    });
    cv.addEventListener('pointermove', (e) => { if (!pad.cur || e.pointerId !== pad.cur.id) return; if (pad.cur.pen) pad.penAt = Date.now(); ((e.getCoalescedEvents && e.getCoalescedEvents().length) ? e.getCoalescedEvents() : [e]).forEach((x) => pad.cur.pts.push(pt(x))); draw(); });
    const end = (e) => { if (pad.cur && e.pointerId === pad.cur.id) { pad.strokes.push(pad.cur); pad.cur = null; draw(); } };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
    ov.addEventListener('click', (e) => {
      if (e.target === ov) return closePad();
      const sw = e.target.closest('[data-pen]'); if (sw) { pad.color = sw.dataset.pen; ov.querySelectorAll('[data-pen]').forEach((x) => x.setAttribute('aria-pressed', x === sw)); try { localStorage.setItem('oqood.pen', pad.color); } catch (x) {} return; }
      const a = e.target.closest('[data-sgp]'); if (!a) return;
      ({ ok: accept, undo: () => { pad.strokes.pop(); draw(); }, clear: () => { pad.strokes = []; draw(); }, cancel: closePad })[a.dataset.sgp]();
    });
    window.addEventListener('resize', () => { if (!ov.hidden) size(); });
  }
  function size() { const cv = $('sgCv'), r = cv.getBoundingClientRect(), k = window.devicePixelRatio || 1; cv.width = r.width * k; cv.height = r.height * k; cv.getContext('2d').setTransform(k, 0, 0, k, 0, 0); draw(); }
  function strokeAll(g, strokes) { g.lineCap = 'round'; g.lineJoin = 'round'; strokes.forEach((s) => { g.strokeStyle = PEN[s.c]; g.lineWidth = 2.6;
    if (s.pen && s.pts.length > 1) { for (let i = 1; i < s.pts.length; i++) { g.lineWidth = (s.pts[i - 1][2] + s.pts[i][2]) / 2; g.beginPath(); g.moveTo(s.pts[i - 1][0], s.pts[i - 1][1]); g.lineTo(s.pts[i][0], s.pts[i][1]); g.stroke(); } return; }
    g.beginPath(); s.pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); if (s.pts.length === 1) g.lineTo(s.pts[0][0] + 0.1, s.pts[0][1]); g.stroke(); }); }
  function draw() { const cv = $('sgCv'), g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height); strokeAll(g, pad.strokes.concat(pad.cur ? [pad.cur] : [])); }
  function openPad(p) {
    if (CFG.canSign && !CFG.canSign()) return;
    ensurePad(); pad.p = p; pad.strokes = []; pad.cur = null;
    try { const c = localStorage.getItem('oqood.pen'); if (PEN[c]) pad.color = c; } catch (x) {}
    $('sgOv').querySelectorAll('[data-pen]').forEach((x) => x.setAttribute('aria-pressed', x.dataset.pen === pad.color));
    $('sgH').textContent = 'توقيع ' + (p === '1' ? 'الطرف الأول' : 'الطرف الثاني') + ': ' + (p === '1' ? S.p1 : S.p2);
    $('sgMsg').textContent = ''; $('sgOv').hidden = false; requestAnimationFrame(size);
  }
  function closePad() { const o = $('sgOv'); if (o) o.hidden = true; pad.p = null; }
  async function accept() {
    if (!pad.strokes.length) { $('sgMsg').textContent = 'وقّع أول داخل المربع.'; return; }
    const pts = pad.strokes.flatMap((s) => s.pts), xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]), m = 8, k = 2;
    const x0 = Math.min(...xs) - m, y0 = Math.min(...ys) - m, w = Math.max(...xs) - x0 + m, h = Math.max(...ys) - y0 + m;
    const c2 = document.createElement('canvas'); c2.width = w * k; c2.height = h * k; const g = c2.getContext('2d'); g.scale(k, k); g.translate(-x0, -y0); strokeAll(g, pad.strokes);
    const t = stamp(), p = pad.p;
    const sig = { img: c2.toDataURL('image/png'), at: t.full, c: pad.color, iso: t.iso };
    if (CFG.remote && CFG.onSigned) {
      const okb = document.querySelector('[data-sgp="ok"]'); okb.disabled = true; $('sgMsg').textContent = 'جاري الإرسال…';
      let r = null; try { r = await CFG.onSigned(sig); } catch (e) { r = { err: e.message }; }
      okb.disabled = false;
      if (!r || !r.ok) { $('sgMsg').textContent = (r && r.err) || 'تعذّر إرسال التوقيع، حاول مرة ثانية.'; return; }
      const d = stamp(new Date(r.signed_at)); sig.at = d.full; sig.iso = r.signed_at;
      S.sig[p] = sig; S.doneAt = d.full + ' الساعة ' + d.time; S.audit = r.audit || null;
      closePad(); paint(); if (CFG.onDone) CFG.onDone(); return;
    }
    S.sig[p] = sig;
    closePad();
    if (both()) { const d = stamp(); S.doneAt = d.full + ' الساعة ' + d.time; }
    paint(); persist();
    if (both() && window.oqMakePdf) { try { const r = await window.oqMakePdf(); r.pdf.save(r.name + ' - موقّع.pdf'); } catch (e) {} }
  }

  /* ---------- المحامي ---------- */
  async function sendLawyer() {
    if (!window.oqMakePdf) return;
    const r = await window.oqMakePdf(), name = r.name + ' - موقّع.pdf';
    const ln = String(site().lawyerName || '').trim();
    const text = 'السلام عليكم' + (ln ? ' ' + ln : '') + '، مرفق عقد «' + (S.title || r.name) + '» رقم ' + S.ref + ' موقّع من الطرفين (' + S.p1 + ' و' + S.p2 + ')، والطرفان موافقان على صياغته بصيغة نظامية والتوقيع عليه رسمياً.';
    const blob = r.pdf.output('blob'), file = new File([blob], name, { type: 'application/pdf' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: name, text }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
    r.pdf.save(name);
    const wa = String(site().lawyerWhatsapp || '').replace(/\D/g, ''), em = String(site().lawyerEmail || '').trim();
    if (wa) window.open('https://wa.me/' + wa + '?text=' + encodeURIComponent(text + '\n(الملف نزل في جهازك، أرفقه في المحادثة)'), '_blank');
    else if (em) location.href = 'mailto:' + em + '?subject=' + encodeURIComponent('عقد للصياغة الرسمية ' + S.ref) + '&body=' + encodeURIComponent(text + '\n\n(أرفق ملف PDF اللي نزل في جهازك)');
    else alert('نزل ملف العقد في جهازك. أضف واتساب أو إيميل المحامي من لوحة التحكم ← إعدادات الموقع عشان يفتح لك على طول.');
  }

  /* ---------- رابط التوقيع عن بُعد ---------- */
  const OQ = () => window.OQ || {};
  const isOwner = () => !CFG.remote && !!(OQ().isAdmin && OQ().isAdmin());
  const client = () => OQ().sb && OQ().sb();
  const tokens = () => { try { return JSON.parse(localStorage.getItem('oqood.links') || '{}'); } catch (e) { return {}; } };
  const linkUrl = (t) => new URL('s.html#k=' + t, location.href).href;
  let linkForm = false, linkErr = '';
  function linkBox() {
    if (CFG.remote) return '';
    if (pending()) {
      const t = tokens()[S.link.id], u = t ? linkUrl(t) : '';
      const exp = S.link.exp ? stamp(new Date(S.link.exp)).full.split(' — ')[0] : '';
      return '<div class="sg-link"><b>رابط التوقيع</b>' + (u ? '<div class="sg-lrow"><code dir="ltr">' + esc(u) + '</code><button type="button" class="btn btn-sm btn-outline-secondary" data-sga="copy">نسخ</button></div>' +
        '<div class="sg-actions"><button type="button" class="btn btn-sm btn-success" data-sga="wa">إرسال بالواتساب</button><button type="button" class="btn btn-sm btn-outline-danger" data-sga="unlink">إلغاء الرابط</button></div>' : '<p class="sg-note">الرابط محفوظ في الجهاز اللي أنشأته منه.</p>') +
        '<p class="sg-note">يتحقق العميل بآخر 4 أرقام من جواله. الرابط يشتغل مرة وحدة، وينتهي فوراً بعد التوقيع' + (exp ? '، أو بتاريخ ' + esc(exp) : '') + '.</p></div>';
    }
    if (!linkForm || !S.sig[1] || S.sig[2]) return '';
    return '<div class="sg-link"><b>رابط توقيع للطرف الثاني: ' + esc(S.p2) + '</b>' +
      '<div class="sg-lf"><label>جوال الطرف الثاني<input type="tel" id="sgPhone" dir="ltr" inputmode="tel" placeholder="05xxxxxxxx" autocomplete="off"></label>' +
      '<label>صلاحية الرابط<select id="sgDays"><option value="3">3 أيام</option><option value="7" selected>7 أيام</option><option value="14">14 يوم</option></select></label></div>' +
      '<div class="sg-actions"><button type="button" class="btn btn-sm btn-primary" data-sga="mklink">إنشاء الرابط</button><button type="button" class="btn btn-sm btn-outline-secondary" data-sga="nolink">إلغاء</button><span class="sg-err" role="status">' + esc(linkErr) + '</span></div>' +
      '<p class="sg-note">العقد يتجمّد بنصه الحالي وتوقيعك، وما يقدر العميل يغيّر فيه شي. رقم الجوال ما ينحفظ في السيرفر، بس بصمة آخر 4 أرقام للتحقق.</p></div>';
  }
  function rndToken() { const b = new Uint8Array(24); crypto.getRandomValues(b); return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  async function makeLink() {
    const ph = ($('sgPhone').value || '').replace(/\D/g, ''), days = +$('sgDays').value || 7;
    if (ph.length < 9) { linkErr = 'اكتب رقم جوال صحيح.'; return paint(); }
    const sb = client(); if (!sb) { linkErr = 'سجّل دخولك أول.'; return paint(); }
    const prev = $('contractPreview'); if (prev && prev.isContentEditable) { const f = $('finishEdit'); if (f) f.click(); }
    const token = rndToken(), st = OQSign.state(); delete st.link;
    const btn = document.querySelector('[data-sga="mklink"]'); if (btn) { btn.disabled = true; btn.textContent = 'جاري الإنشاء…'; }
    const { data, error } = await sb.rpc('sign_create', { p_token: token, p_last4: ph.slice(-4), p_days: days, p_ref: S.ref, p_title: S.title || '', p_p1: S.p1, p_p2: S.p2, p_html: prev ? prev.innerHTML : '', p_state: st });
    if (error) { linkErr = /sign_create|function/.test(error.message) ? 'شغّل ملف sign.sql في Supabase أول.' : 'تعذّر إنشاء الرابط: ' + error.message; return paint(); }
    const tk = tokens(); tk[data.id] = token; try { localStorage.setItem('oqood.links', JSON.stringify(tk)); } catch (e) {}
    S.link = { id: data.id, exp: data.expires_at, phone: ph }; linkForm = false; linkErr = '';
    paint(); persist(); sentList();
  }
  function waLink() {
    const t = tokens()[S.link.id]; if (!t) return;
    let ph = String(S.link.phone || '').replace(/\D/g, ''); if (/^05\d{8}$/.test(ph)) ph = '966' + ph.slice(1);
    const msg = 'السلام عليكم ' + S.p2 + '، هذا رابط توقيع عقد «' + (S.title || 'العقد') + '» رقم ' + S.ref + ':\n' + linkUrl(t) + '\nللدخول اكتب آخر 4 أرقام من جوالك. الرابط لك أنت فقط ويشتغل مرة وحدة.';
    window.open('https://wa.me/' + ph + '?text=' + encodeURIComponent(msg), '_blank');
  }
  async function fetchRow(id) { const { data, error } = await client().from('sign_links').select('*').eq('id', id).maybeSingle(); if (error) throw error; return data; }
  function fromRow(r) {
    const st = r.sign_state || {}; st.sig = st.sig || {};
    const d = stamp(new Date(r.signed_at));
    st.sig[2] = { img: r.p2_sig, at: d.full, iso: r.signed_at, c: 'remote' };
    st.link = { id: r.id }; st.doneAt = d.full + ' الساعة ' + d.time;
    st.audit = { opened: r.opened_at, signed: r.signed_at, ip: r.p2_ip, ua: r.p2_ua, hash: r.contract_hash };
    return st;
  }
  async function openSigned(id, autoPdf) {
    const r = await fetchRow(id); if (!r || r.status !== 'signed') return false;
    const prev = $('contractPreview'); if (prev) prev.innerHTML = r.contract_html;
    S = fromRow(r); paint(); persist();
    const fs = $('formSection'), ps = $('previewSection'); if (fs) fs.style.display = 'none'; if (ps) { ps.style.display = 'block'; ps.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    if (autoPdf && window.oqMakePdf) { try { const p = await window.oqMakePdf(); p.pdf.save(p.name + ' - موقّع.pdf'); } catch (e) {} }
    return true;
  }
  async function checkNow(btn) {
    if (!pending() || !client()) return;
    if (btn) { btn.disabled = true; btn.textContent = 'جاري التحديث…'; }
    try {
      const r = await fetchRow(S.link.id);
      if (r && r.status === 'signed') { await openSigned(r.id, true); sentList(); return; }
      if (r && (r.status === 'cancelled' || r.status === 'locked' || new Date(r.expires_at) < new Date())) { delete S.link; paint(); persist(); alert(r.status === 'locked' ? 'انقفل الرابط بعد 5 محاولات خاطئة. أنشئ رابط جديد.' : 'الرابط ملغي أو منتهي. تقدر تنشئ رابط جديد.'); return; }
    } catch (e) {}
    paint();
  }
  const ST = { sent: ['أُرسل', ''], opened: ['فتحه العميل', 'b'], signed: ['✓ وقّع', 'ok'], cancelled: ['ملغي', 'x'], locked: ['مقفل', 'x'] };
  async function sentList() {
    let box = $('sgSent');
    if (!isOwner() || !client()) { if (box) box.hidden = true; return; }
    if (!box) {
      const anchor = $('contractsList'); if (!anchor) return;
      const card = anchor.closest('.form-section') || anchor.parentNode;
      box = document.createElement('div'); box.id = 'sgSent'; box.className = 'form-section mt-4 no-print';
      card.parentNode.insertBefore(box, card.nextSibling);
    }
    box.hidden = false;
    const { data, error } = await client().from('sign_links').select('id,ref,title,p2_name,status,expires_at,created_at,opened_at,signed_at').order('created_at', { ascending: false }).limit(30);
    if (error) { box.hidden = true; return; }
    const tk = tokens(), now = new Date();
    box.innerHTML = '<div class="section-title d-flex justify-content-between align-items-center"><span><i class="bi bi-link-45deg"></i> روابط التوقيع المرسلة</span><button type="button" class="btn btn-sm btn-outline-secondary" data-sgl="refresh">تحديث</button></div>' +
      (data.length ? data.map((r) => {
        const live = (r.status === 'sent' || r.status === 'opened') && new Date(r.expires_at) > now;
        const s = live || r.status === 'signed' || r.status === 'cancelled' || r.status === 'locked' ? ST[r.status] : ['منتهي', 'x'];
        return '<div class="sg-li"><div><strong>' + esc(r.title || 'عقد') + '</strong> <span class="sg-tag ' + s[1] + '">' + s[0] + '</span><div class="text-muted small">' + esc(r.p2_name || '') + ' · <span dir="ltr">' + esc(r.ref) + '</span></div></div><div class="sg-actions m-0">' +
          (r.status === 'signed' ? '<button type="button" class="btn btn-sm btn-primary" data-sgl="open" data-id="' + r.id + '">فتح العقد الموقّع</button>' : '') +
          (live && tk[r.id] ? '<button type="button" class="btn btn-sm btn-outline-secondary" data-sgl="copy" data-id="' + r.id + '">نسخ الرابط</button>' : '') +
          (live ? '<button type="button" class="btn btn-sm btn-outline-danger" data-sgl="cancel" data-id="' + r.id + '">إلغاء</button>' : '') + '</div></div>';
      }).join('') : '<p class="text-muted text-center m-0">ما فيه روابط مرسلة للحين</p>');
  }
  async function copyText(t, btn) { try { await navigator.clipboard.writeText(t); } catch (e) { prompt('انسخ الرابط:', t); } if (btn) { const o = btn.textContent; btn.textContent = 'تم النسخ ✓'; setTimeout(() => { btn.textContent = o; }, 1500); } }
  document.addEventListener('click', async (e) => {
    const b = e.target.closest && e.target.closest('[data-sgl]'); if (!b) return;
    const id = b.dataset.id, act = b.dataset.sgl;
    if (act === 'refresh') return sentList();
    if (act === 'copy') return copyText(linkUrl(tokens()[id]), b);
    if (act === 'open') { b.disabled = true; await openSigned(id, false); b.disabled = false; return; }
    if (act === 'cancel') {
      if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'متأكد؟'; return; }
      await client().rpc('sign_cancel', { p_id: id });
      if (S && S.link && S.link.id === id && !both()) { delete S.link; paint(); persist(); }
      sentList();
    }
  });
  let lastPoll = 0;
  setInterval(() => { if (document.hidden || Date.now() - lastPoll < 25000) return; lastPoll = Date.now(); if (pending()) checkNow(); }, 5000);
  let tries = 0; const waitOQ = setInterval(() => { if (isOwner()) { clearInterval(waitOQ); sentList(); paint(); } else if (++tries > 40) clearInterval(waitOQ); }, 500);

  /* ---------- الحالة ---------- */
  function persist() { try { sessionStorage.setItem('oqood.sign', JSON.stringify(S)); } catch (e) {} }
  window.OQSign = {
    reset(o) { S = { ref: newRef(), p1: o.p1 || '', p2: o.p2 || '', title: o.title || '', lawyer: false, sig: {} }; paint(); persist(); },
    load(st, o) { S = st && st.ref ? st : null; if (!S && o) return this.reset(o); paint(); },
    state() { return S ? JSON.parse(JSON.stringify(S)) : null; },
    html() { const b = $('sigBlock'); return b ? b.innerHTML : ''; },
    signed: () => !!both(),
    config(o) { Object.assign(CFG, o || {}); },
    refresh: () => { sentList(); paint(); },
    LEGAL, LAWYER
  };
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('[data-sg]'); if (b && S && canTap(+b.dataset.sg)) { e.preventDefault(); openPad(b.dataset.sg); return; }
    const a = e.target.closest && e.target.closest('[data-sga]'); if (!a || !S) return;
    if (a.dataset.sga === 'pdf') window.oqMakePdf && window.oqMakePdf().then((r) => r.pdf.save(r.name + ' - موقّع.pdf'));
    if (a.dataset.sga === 'lawyer') sendLawyer();
    if (a.dataset.sga === 'link') { linkForm = true; linkErr = ''; paint(); setTimeout(() => $('sgPhone') && $('sgPhone').focus(), 0); }
    if (a.dataset.sga === 'nolink') { linkForm = false; paint(); }
    if (a.dataset.sga === 'mklink') makeLink();
    if (a.dataset.sga === 'copy') copyText(linkUrl(tokens()[S.link.id]), a);
    if (a.dataset.sga === 'wa') waLink();
    if (a.dataset.sga === 'chk') checkNow(a);
    if (a.dataset.sga === 'unlink') { if (a.dataset.sure !== '1') { a.dataset.sure = '1'; a.textContent = 'متأكد؟ اضغط مرة ثانية'; return; } client() && client().rpc('sign_cancel', { p_id: S.link.id }).then(() => { delete S.link; paint(); persist(); sentList(); }); }
    if (a.dataset.sga === 'reset') { if (a.dataset.sure !== '1') { a.dataset.sure = '1'; a.textContent = 'متأكد؟ اضغط مرة ثانية'; setTimeout(() => { if (a.isConnected) paint(); }, 3500); return; } S.sig = {}; S.doneAt = null; paint(); persist(); }
  });
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.dataset && e.target.dataset.sg && S && canTap(+e.target.dataset.sg)) { e.preventDefault(); openPad(e.target.dataset.sg); }
    if (e.key === 'Escape' && $('sgOv') && !$('sgOv').hidden) closePad();
  });
  document.addEventListener('change', (e) => { if (e.target.id === 'sgLawyer' && S) { S.lawyer = e.target.checked; paint(); persist(); } });
})();
