/* عقود — محرر العقد (شريط أدوات مثل محرر الإيميل + نقل البنود) */
(function () {
  const START = /^\s*(?:ال)?(?:مادة|بند)\b|^\s*(?:Article|Clause)\b/i;
  const isHead = (el) => el && el.nodeType === 1 && (/^H[1-6]$/.test(el.tagName) || el.dataset.cl === 'h' || (/^(P|DIV)$/.test(el.tagName) && START.test(el.textContent) && el.textContent.trim().length < 90));

  // ---------- تنظيف ناتج الذكاء ----------
  window.oqCleanContract = function (html) {
    const box = document.createElement('div');
    box.innerHTML = html;
    box.querySelectorAll('script,style,meta,link').forEach((n) => n.remove());
    // فك الأغلفة اللي فيها كل المحتوى
    let w;
    while (box.children.length === 1 && /^(DIV|ARTICLE|SECTION|BODY|MAIN)$/.test(box.firstElementChild.tagName) && !box.firstElementChild.querySelector('table.bilingual-table')) {
      w = box.firstElementChild; w.replaceWith(...w.childNodes);
    }
    box.querySelectorAll('[style]').forEach((n) => { n.style.textAlign = ''; n.style.margin = ''; n.style.marginLeft = ''; n.style.marginRight = ''; n.style.width = ''; if (!n.getAttribute('style').trim()) n.removeAttribute('style'); });
    box.querySelectorAll('[align]').forEach((n) => n.removeAttribute('align'));
    box.querySelectorAll('center').forEach((n) => n.replaceWith(...n.childNodes));
    // العنوان الرئيسي (المنصة تضيفه)
    const first = box.firstElementChild;
    if (first && /^H[12]$/.test(first.tagName) && !START.test(first.textContent)) first.remove();
    // عناوين البنود موحدة
    box.querySelectorAll('h1,h2,h4,h5,h6').forEach((h) => { const n = document.createElement('h3'); n.innerHTML = h.innerHTML; h.replaceWith(n); });
    // مرجعية فاضية
    [...box.querySelectorAll('h3')].forEach((h) => {
      if (!/المرجعية النظامية/.test(h.textContent)) return;
      const nx = h.nextElementSibling;
      if (!nx || /لا توجد|لم يتم الاستناد|لا يوجد/.test(nx.textContent)) { if (nx && !isHead(nx)) nx.remove(); h.remove(); }
    });
    // قسم التوقيع اللي يكتبه النموذج (المنصة تضيف التوقيعات)
    const blocks = [...box.children];
    const sig = blocks.findIndex((b) => /^\s*(التوقيع|التوقيعات|التواقيع|Signatures?)\s*:?\s*$/i.test(b.textContent));
    if (sig > 0) { for (let i = sig; i < blocks.length; i++) { if (/^H3$/.test(blocks[i].tagName) && i > sig) break; blocks[i].remove(); } }
    return box.innerHTML;
  };

  // ---------- المحرر ----------
  function ready(fn) { document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn) : fn(); }
  ready(() => {
    const paper = document.getElementById('contractPreview');
    const bar = document.getElementById('editorToolbar');
    if (!paper || !bar) return;
    const body = () => paper.querySelector('.clause-box') || paper;
    const editing = () => paper.isContentEditable;
    let lastRange = null;

    document.addEventListener('selectionchange', () => {
      if (!editing()) return;
      const s = getSelection();
      if (s.rangeCount && paper.contains(s.anchorNode)) { lastRange = s.getRangeAt(0).cloneRange(); mark(); }
    });
    const restore = () => { if (lastRange) { const s = getSelection(); s.removeAllRanges(); s.addRange(lastRange); } };
    const exec = (cmd, val) => { paper.focus(); restore(); document.execCommand('styleWithCSS', false, true); document.execCommand(cmd, false, val); lastRange = getSelection().rangeCount ? getSelection().getRangeAt(0).cloneRange() : lastRange; };

    // البند الحالي = عنوانه + اللي بعده لين العنوان الجاي
    function blockOf(node) {
      const root = body();
      let n = node && node.nodeType === 3 ? node.parentNode : node;
      while (n && n.parentNode !== root) { if (n === paper || !n.parentNode) return null; n = n.parentNode; }
      return n;
    }
    function unitOf(block) {
      const root = body(); if (!block) return [];
      const kids = [...root.children]; let i = kids.indexOf(block); if (i < 0) return [];
      let s = i; while (s > 0 && !isHead(kids[s])) s--;
      if (!isHead(kids[s])) return [block];
      const u = [kids[s]]; for (let j = s + 1; j < kids.length && !isHead(kids[j]); j++) u.push(kids[j]);
      return u;
    }
    function units() {
      const kids = [...body().children], out = []; let cur = null;
      kids.forEach((k) => { if (isHead(k) || !cur) { cur = [k]; out.push(cur); } else cur.push(k); });
      return out;
    }
    function current() { return lastRange ? unitOf(blockOf(lastRange.startContainer)) : []; }
    function mark() {
      paper.querySelectorAll('.cl-cur').forEach((n) => n.classList.remove('cl-cur'));
      current().forEach((n) => n.classList.add('cl-cur'));
    }
    function move(dir) {
      const u = current(); if (!u.length) return flash('اضغط داخل البند اللي تبي تنقله.');
      const all = units(), i = all.findIndex((x) => x[0] === u[0]); const j = i + dir;
      if (j < 0 || j >= all.length) return;
      const root = body();
      if (dir < 0) all[j][0].before(...u); else all[j][all[j].length - 1].after(...u);
      u[0].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      const r = document.createRange(); r.selectNodeContents(u[0]); r.collapse(true); lastRange = r; restore(); mark();
      renumber(); root.normalize();
    }
    const ORD = ['الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة', 'السابعة', 'الثامنة', 'التاسعة', 'العاشرة', 'الحادية عشرة', 'الثانية عشرة', 'الثالثة عشرة', 'الرابعة عشرة', 'الخامسة عشرة', 'السادسة عشرة', 'السابعة عشرة', 'الثامنة عشرة', 'التاسعة عشرة', 'العشرون'];
    // إعادة ترقيم «المادة الأولى/الثانية…» بعد النقل
    function renumber() {
      if (!document.getElementById('edRenum')?.checked) return;
      let k = 0;
      units().forEach((u) => {
        const h = u[0]; if (!isHead(h)) return;
        const walker = document.createTreeWalker(h, NodeFilter.SHOW_TEXT);
        const t = walker.nextNode(); if (!t) return;
        const m = t.nodeValue.match(/^(\s*(?:ال)?(?:مادة|بند)\s+)(\(?\d+\)?|\(?[٠-٩]+\)?|[^\s:：.،\-–]+(?:\s+(?:عشرة|عشر))?)/);
        if (!m) return;
        k++;
        const word = /\d|[٠-٩]/.test(m[2]) ? (m[2].startsWith('(') ? `(${k})` : String(k)) : (ORD[k - 1] || String(k));
        t.nodeValue = m[1] + word + t.nodeValue.slice(m[0].length);
      });
    }
    function addClause() {
      const u = current(); const all = units();
      const n = all.filter((x) => isHead(x[0])).length + 1;
      const h = document.createElement('h3'); h.textContent = `المادة ${ORD[n - 1] || n}: عنوان البند`;
      const p = document.createElement('p'); p.textContent = 'نص البند...';
      if (u.length) u[u.length - 1].after(h, p); else body().append(h, p);
      const r = document.createRange(); r.selectNodeContents(h); lastRange = r; restore(); mark(); renumber();
      h.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    function delClause(btn) {
      const u = current(); if (!u.length) return flash('اضغط داخل البند اللي تبي تحذفه.');
      if (btn.dataset.sure !== '1') { btn.dataset.sure = '1'; btn.classList.add('sure'); btn.title = 'اضغط مرة ثانية للتأكيد'; setTimeout(() => { btn.dataset.sure = ''; btn.classList.remove('sure'); btn.title = 'حذف البند'; }, 3000); return flash('اضغط مرة ثانية لحذف البند.'); }
      btn.dataset.sure = ''; btn.classList.remove('sure');
      u.forEach((n) => n.remove()); lastRange = null; renumber();
    }
    function align(v) {
      const u = current(); if (!u.length) return exec(v === 'right' ? 'justifyRight' : v === 'center' ? 'justifyCenter' : v === 'left' ? 'justifyLeft' : 'justifyFull');
      const b = blockOf(lastRange.startContainer);
      const target = document.getElementById('edScope')?.value === 'clause' ? u : [b];
      target.forEach((n) => { n.style.textAlign = v === 'right' ? 'start' : v; });
    }
    function indent(d) {
      const u = current(); const b = lastRange && blockOf(lastRange.startContainer); if (!b) return;
      if (b.closest('ul,ol') || /^(UL|OL)$/.test(b.tagName)) return exec(d > 0 ? 'indent' : 'outdent');
      const target = document.getElementById('edScope')?.value === 'clause' ? u : [b];
      target.forEach((n) => { const cur = parseFloat(n.style.paddingInlineStart) || 0; const v = Math.max(0, cur + d * 1.5); n.style.paddingInlineStart = v ? v + 'em' : ''; });
    }
    function sizeSel(v) {
      const s = getSelection(); restore();
      if (!lastRange || lastRange.collapsed) { paper.style.fontSize = v; return; }
      exec('fontSize', '7');
      paper.querySelectorAll('font[size="7"]').forEach((f) => { const sp = document.createElement('span'); sp.style.fontSize = v; sp.innerHTML = f.innerHTML; f.replaceWith(sp); });
      paper.querySelectorAll('[style*="xxx-large"]').forEach((n) => { n.style.fontSize = v; });
    }
    function fontSel(v) { if (!lastRange || lastRange.collapsed) { paper.style.fontFamily = v; return; } exec('fontName', v); }
    let flashT;
    function flash(t) { const el = document.getElementById('edHint'); if (!el) return; el.textContent = t; clearTimeout(flashT); flashT = setTimeout(() => { el.textContent = 'اضغط داخل أي بند، ثم استخدم الأزرار.'; }, 2600); }

    bar.addEventListener('mousedown', (e) => { if (e.target.closest('button')) e.preventDefault(); });
    bar.addEventListener('click', (e) => {
      const b = e.target.closest('[data-ed]'); if (!b) return;
      const c = b.dataset.ed;
      ({
        undo: () => exec('undo'), redo: () => exec('redo'),
        bold: () => exec('bold'), italic: () => exec('italic'), underline: () => exec('underline'),
        ol: () => exec('insertOrderedList'), ul: () => exec('insertUnorderedList'),
        indent: () => indent(1), outdent: () => indent(-1),
        right: () => align('right'), center: () => align('center'), left: () => align('left'), justify: () => align('justify'),
        clear: () => exec('removeFormat'),
        up: () => move(-1), down: () => move(1), add: addClause, del: () => delClause(b),
        renum: () => { const x = document.getElementById('edRenum'); const was = x.checked; x.checked = true; renumber(); x.checked = was; flash('انعاد ترقيم المواد ✓'); },
      }[c] || (() => {}))();
    });
    bar.addEventListener('change', (e) => {
      const t = e.target;
      if (t.id === 'edFont') fontSel(t.value);
      else if (t.id === 'edSize') sizeSel(t.value);
      else if (t.id === 'edColor') exec('foreColor', t.value);
      else if (t.id === 'edHilite') exec('hiliteColor', t.value);
      else if (t.id === 'edBlock') { exec('formatBlock', t.value); t.value = ''; }
    });
    bar.addEventListener('input', (e) => { if (e.target.id === 'edColor') exec('foreColor', e.target.value); if (e.target.id === 'edHilite') exec('hiliteColor', e.target.value); });
    paper.addEventListener('keydown', (e) => {
      if (!editing() || !(e.altKey && e.shiftKey)) return;
      if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); } else if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    });
    const obs = new MutationObserver(() => { if (!editing()) paper.querySelectorAll('.cl-cur').forEach((n) => n.classList.remove('cl-cur')); });
    obs.observe(paper, { attributes: true, attributeFilter: ['contenteditable'] });
  });
})();
