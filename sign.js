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
      '<div class="sg-box' + (s ? ' done' : '') + '"' + (both() ? '' : ' role="button" tabindex="0" data-sg="' + p + '" aria-label="توقيع ' + label + '"') + '>' +
      (s ? '<img alt="توقيع ' + label + '" src="' + s.img + '">' + (both() ? '' : '<span class="sg-re no-print">إعادة</span>') : '<span class="sg-tap no-print">اضغط هنا للتوقيع ✍️</span>') + '</div>' +
      '<div class="sg-row"><b>التاريخ /</b><span>' + (s ? esc(s.at).replace(' — ', '<br>') : '') + '</span></div></div>';
  }
  function paint() {
    const box = $('sigBlock'), bar = $('sigBar'); if (!box || !bar) return;
    if (!S) { box.innerHTML = ''; bar.innerHTML = ''; return; }
    const done = both();
    box.innerHTML = '<p class="sg-lawyer">' + LEGAL + '</p>' + (S.lawyer ? '<p class="sg-lawyer sg-l2">' + LAWYER + '</p>' : '') +
      '<div class="sg-grid">' + party(1, 'الطرف الأول', S.p1) + party(2, 'الطرف الثاني', S.p2) + '</div>' +
      '<div class="sg-foot">رقم العقد: <b dir="ltr">' + esc(S.ref) + '</b>' + (done ? ' · وُقّع من الطرفين: ' + esc(S.doneAt || '') : '') + '</div>';
    const st = done ? '<span class="sg-ok">✓ وقّع الطرفين، والعقد مقفل عن التعديل</span>' : S.sig[1] || S.sig[2] ? 'بانتظار توقيع ' + (S.sig[1] ? 'الطرف الثاني' : 'الطرف الأول') : 'بانتظار توقيع الطرفين';
    bar.innerHTML = '<label class="sg-law' + (done ? ' off' : '') + '"><input type="checkbox" id="sgLawyer"' + (S.lawyer ? ' checked' : '') + (done ? ' disabled' : '') + '> العميل موافق على إحالة العقد للمحامي لصياغته رسمياً</label>' +
      '<div class="sg-actions"><span class="sg-state">' + st + '</span>' +
      (done ? '<button type="button" class="btn btn-sm btn-primary" data-sga="pdf">⤓ PDF الموقّع</button>' : '') +
      (done && S.lawyer ? '<button type="button" class="btn btn-sm btn-success" data-sga="lawyer">📨 أرسل العقد للمحامي</button>' : '') +
      (S.sig[1] || S.sig[2] ? '<button type="button" class="btn btn-sm btn-outline-secondary" data-sga="reset">' + (done ? 'فتح العقد ومسح التوقيعات' : 'مسح التوقيعات') + '</button>' : '') + '</div>' +
      '<p class="sg-note">عقد سريع للتعاملات والخدمات اليومية. للعقود المهمة يُفضّل توثيقه رسمياً (مثل التوقيع عبر نفاذ) أو صياغته عند محامٍ.</p>';
    lock(done);
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
    const t = stamp();
    S.sig[pad.p] = { img: c2.toDataURL('image/png'), at: t.full, c: pad.color, iso: t.iso };
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

  /* ---------- الحالة ---------- */
  function persist() { try { sessionStorage.setItem('oqood.sign', JSON.stringify(S)); } catch (e) {} }
  window.OQSign = {
    reset(o) { S = { ref: newRef(), p1: o.p1 || '', p2: o.p2 || '', title: o.title || '', lawyer: false, sig: {} }; paint(); persist(); },
    load(st, o) { S = st && st.ref ? st : null; if (!S && o) return this.reset(o); paint(); },
    state() { return S ? JSON.parse(JSON.stringify(S)) : null; },
    html() { const b = $('sigBlock'); return b ? b.innerHTML : ''; },
    signed: () => !!both(),
    LEGAL, LAWYER
  };
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('[data-sg]'); if (b && S && !both()) { e.preventDefault(); openPad(b.dataset.sg); return; }
    const a = e.target.closest && e.target.closest('[data-sga]'); if (!a || !S) return;
    if (a.dataset.sga === 'pdf') window.oqMakePdf && window.oqMakePdf().then((r) => r.pdf.save(r.name + ' - موقّع.pdf'));
    if (a.dataset.sga === 'lawyer') sendLawyer();
    if (a.dataset.sga === 'reset') { if (a.dataset.sure !== '1') { a.dataset.sure = '1'; a.textContent = 'متأكد؟ اضغط مرة ثانية'; setTimeout(() => { if (a.isConnected) paint(); }, 3500); return; } S.sig = {}; S.doneAt = null; paint(); persist(); }
  });
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.dataset && e.target.dataset.sg && S && !both()) { e.preventDefault(); openPad(e.target.dataset.sg); }
    if (e.key === 'Escape' && $('sgOv') && !$('sgOv').hidden) closePad();
  });
  document.addEventListener('change', (e) => { if (e.target.id === 'sgLawyer' && S) { S.lawyer = e.target.checked; paint(); persist(); } });
})();
