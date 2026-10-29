/* عقود — تصدير PDF مرتب
   - يرسم العقد بعرض A4 ثابت مهما كان الجهاز (جوال أو كمبيوتر)
   - إطار كحلي في كل صفحة، ومسافة فاضية أسفل كل صفحة (أكثر من 1 سم)
   - ما يقطع البند: إذا ما يكفي المكان ينتقل البند كامل للصفحة اللي بعدها، والعنوان ما يبقى لحاله آخر الصفحة
   - رقم العقد ورقم الصفحة أسفل كل صفحة */
(function () {
  const PAGE = { w: 210, h: 297 };
  const BOX = { x: 8, y: 8, w: 194, h: 274 };       // الإطار: ينتهي على 282مم، يعني 15مم فاضية تحت
  const PAD = { x: 5, y: 5 };                         // مسافة داخل الإطار
  const CW = BOX.w - PAD.x * 2, CH = BOX.h - PAD.y * 2; // مساحة النص بالمليمتر
  const PXMM = 96 / 25.4;
  const BLOCKS = 'h1,h2,h3,h4,h5,h6,p,li,tr,hr,table,img,blockquote,.meta,.disclaimer,.clause-box>div,.sg-lawyer,.sg-grid,.sg-foot,.sg-audit';

  const isHead = (el) => {
    if (/^H[1-6]$/.test(el.tagName)) return true;
    const t = (el.textContent || '').trim();
    if (!t || t.length > 70) return false;
    if (el.tagName === 'P') { const b = el.querySelector('strong,b'); if (b && b.textContent.trim() === t) return true; if (/[:：]$/.test(t)) return true; }
    if (el.tagName === 'TR') return !!el.querySelector('th') || (/^(المادة|البند|Article|Clause)\b/i.test(t) && t.length < 70);
    return false;
  };

  function textImg(text, wmm, hmm, opt) {
    const k = 4, c = document.createElement('canvas'); c.width = Math.round(wmm * PXMM * k); c.height = Math.round(hmm * PXMM * k);
    const g = c.getContext('2d'); g.scale(k, k); g.direction = 'rtl'; g.fillStyle = opt.color || '#6b7280';
    g.font = (opt.size || 9) + "px Tajawal, 'Segoe UI', Tahoma, sans-serif"; g.textBaseline = 'middle'; g.textAlign = 'center';
    g.fillText(text, (wmm * PXMM) / 2, (hmm * PXMM) / 2);
    return c.toDataURL('image/png');
  }

  // إذا البند أطول من صفحة: نقطع عند سطر فاضي (بين سطرين) بدل ما نقطع الكلام
  function blankRow(canvas, from, to) {
    const g = canvas.getContext('2d'), w = canvas.width, y0 = Math.floor(to), y1 = Math.floor(from);
    const d = g.getImageData(0, y0, w, y1 - y0).data; let run = 0;
    for (let y = y1 - y0 - 1; y >= 0; y--) {
      let white = true; for (let x = 0; x < w; x += 3) { const i = (y * w + x) * 4; if (d[i] < 200 || d[i + 1] < 200 || d[i + 2] < 200) { white = false; break; } }
      run = white ? run + 1 : 0; if (run >= 4) return y0 + y + 2;
    }
    return from;
  }
  window.oqPdf = async function (frame, opt) {
    opt = opt || {};
    const wpx = Math.round(CW * PXMM);
    const holder = document.createElement('div');
    holder.setAttribute('aria-hidden', 'true');
    holder.style.cssText = 'position:absolute;top:0;left:-30000px;width:' + wpx + 'px;background:#fff;direction:rtl;';
    const clone = frame.cloneNode(true);
    clone.removeAttribute('id');
    clone.style.cssText = 'border:0;border-radius:0;margin:0;width:' + wpx + 'px;max-width:none;background:#fff;overflow:visible;box-shadow:none;';
    clone.querySelectorAll('.no-print,[data-no-pdf]').forEach((n) => n.remove());
    clone.querySelectorAll('[contenteditable]').forEach((n) => n.removeAttribute('contenteditable'));
    clone.querySelectorAll('.editing,.cl-cur').forEach((n) => n.classList.remove('editing', 'cl-cur'));
    clone.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
    const paper = clone.querySelector('.contract-paper'); if (paper) { paper.style.minHeight = '0'; paper.style.padding = '2px 4px 8px'; }
    const sig = clone.querySelector('.sg-grid'); if (sig) { sig.parentElement.style.padding = '0 4px 4px'; }
    [...clone.children].forEach((c) => { c.style.background = '#fff'; });
    holder.appendChild(clone); document.body.appendChild(holder);
    try {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      // نقاط القطع المسموحة: بداية كل بند، ما عدا اللي قبله عنوان
      const base = clone.getBoundingClientRect().top;
      const els = [...clone.querySelectorAll(BLOCKS)].filter((e) => !e.closest('.sg-grid') || e.classList.contains('sg-grid'))
        .filter((e) => e.tagName === 'TR' || !e.parentElement.closest('tr'))
        .filter((e) => !(e.tagName === 'TABLE' && e.querySelector('tr')));
      const items = els.map((e) => ({ e, top: e.getBoundingClientRect().top - base, h: e.getBoundingClientRect().height })).filter((x) => x.h > 0).sort((a, b) => a.top - b.top);
      const cuts = [];
      items.forEach((it, i) => {
        if (i === 0) return;
        let prev = null; for (let j = i - 1; j >= 0; j--) { if (!items[j].e.contains(it.e) && !it.e.contains(items[j].e)) { prev = items[j]; break; } }
        if (prev && isHead(prev.e)) return;
        if (it.e.closest('li') && it.e.tagName !== 'LI') return;
        cuts.push(Math.max(0, it.top - 2));
      });
      const scale = opt.scale || 2;
      const canvas = await html2canvas(clone, { scale, useCORS: true, backgroundColor: '#ffffff', windowWidth: Math.max(1000, wpx + 40), logging: false });
      const k = canvas.width / clone.offsetWidth;
      const pageH = CH * PXMM * k, total = canvas.height;
      const K = cuts.map((c) => c * k).sort((a, b) => a - b);
      const pages = []; let start = 0;
      while (start < total - 2) {
        const limit = start + pageH; let end;
        if (limit >= total) end = total;
        else { const ok = K.filter((c) => c > start + pageH * 0.3 && c <= limit); end = ok.length ? ok[ok.length - 1] : blankRow(canvas, limit, start + pageH * 0.5); }
        pages.push([start, end]); start = end;
      }
      const pdf = new (window.jspdf ? window.jspdf.jsPDF : window.jsPDF)('p', 'mm', 'a4');
      const navy = opt.border || [15, 39, 68];
      pages.forEach(([s, e], i) => {
        if (i) pdf.addPage();
        const c = document.createElement('canvas'); c.width = canvas.width; c.height = Math.max(1, Math.round(e - s));
        const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(canvas, 0, s, canvas.width, c.height, 0, 0, canvas.width, c.height);
        const hmm = c.height / k / PXMM;
        pdf.addImage(c.toDataURL('image/jpeg', 0.88), 'JPEG', BOX.x + PAD.x, BOX.y + PAD.y, CW, hmm);
        pdf.setDrawColor(navy[0], navy[1], navy[2]); pdf.setLineWidth(1.1); pdf.rect(BOX.x, BOX.y, BOX.w, BOX.h);
        const foot = (opt.ref ? 'رقم العقد ' + opt.ref + '   ·   ' : '') + 'صفحة ' + (i + 1) + ' من ' + pages.length;
        pdf.addImage(textImg(foot, 150, 6, { size: 9 }), 'PNG', (PAGE.w - 150) / 2, BOX.y + BOX.h + 3.5, 150, 6);
      });
      return pdf;
    } finally { holder.remove(); }
  };
})();
