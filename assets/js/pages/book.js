(() => {
  'use strict';
  const R = window.WSRender;
  const { esc, sheetHTML } = R;
  const $ = (id) => document.getElementById(id);
  const TYPE_LABEL = Object.fromEntries(window.SHEET_TYPES.map((t) => [t.id, t.label]));
  const TOC_ROWS = 20; // จำนวนแถวสารบัญต่อหน้า (หัวหมวดนับเป็น 1 แถว)
  const imageKey = (p) => String(p).trim().toLowerCase();
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const fmtDate = (iso) => {
    const d = new Date(iso);
    return isNaN(d) ? '' : d.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
  };

  class ApiError extends Error {
    constructor(message, code, retryAfter) {
      super(message);
      this.code = code;
      this.retryAfter = Number(retryAfter) || 0;
    }
  }

  function providers() {
    const p = { textProvider: $('textProvider').value, imageProvider: $('imageProvider').value };
    if (p.textProvider === 'openrouter' || p.imageProvider === 'openrouter') {
      p.orModels = { text: $('orText').value.trim(), review: '', image: $('orImage').value.trim() };
    }
    return p;
  }

  async function apiOnce(url, body) {
    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'worksheet' },
        body: JSON.stringify(Object.assign({}, providers(), body)),
      });
    } catch {
      throw new ApiError('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจว่า Apache กำลังทำงานอยู่', 'NETWORK');
    }
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new ApiError(
        res.status === 404 ? 'ไม่พบไฟล์ของโปรแกรมที่ต้องใช้ (' + String(url).replace(/\?.*$/, '') + ') ไฟล์อาจยังก๊อปมาไม่ครบ — เปิดเมนู “🩺 ตรวจระบบ” เพื่อดูว่าขาดไฟล์ไหน'
        : res.status === 403 || res.status === 500 ? 'เซิร์ฟเวอร์เปิดไฟล์ไม่ได้ (HTTP ' + res.status + ') มักเกิดจากสิทธิ์ไฟล์ — เปิดเมนู “🩺 ตรวจระบบ” จะมีคำสั่งแก้ให้ก๊อปไปรันใน Terminal'
        : 'เซิร์ฟเวอร์ตอบกลับผิดรูปแบบ (ดู PHP error log): ' + text.replace(/<[^>]+>/g, ' ').trim().slice(0, 160),
        'BAD_RESPONSE',
      );
    }
    if (!res.ok) throw new ApiError(data.error || 'HTTP ' + res.status, data.code, data.retryAfter);
    return data;
  }

  /** ลองใหม่เมื่อ AI หนาแน่น/โควตาต่อนาทีเต็ม (รอไม่เกิน 90 วินาทีต่อครั้ง) */
  async function api(url, body, tries = 3) {
    for (let i = 0; ; i++) {
      try {
        return await apiOnce(url, body);
      } catch (e) {
        if (!['OVERLOADED', 'RATE_LIMIT'].includes(e.code) || i >= tries - 1 || e.retryAfter > 90) throw e;
        const ms = Math.min(60000, Math.max(6000 * (i + 1), e.retryAfter * 1000 + 1500));
        setNote('aiNote', `รอโควตา ${Math.ceil(ms / 1000)} วินาที แล้วจะลองใหม่อัตโนมัติ…`, '#7a5b00');
        await sleep(ms);
      }
    }
  }

  function setNote(id, msg, color) {
    const el = $(id);
    if (!el) return;
    el.textContent = msg || '';
    el.style.color = color || '';
  }
  function showError(msg) {
    const el = $('error');
    el.textContent = msg;
    el.classList.toggle('hidden', !msg);
  }

  /* ------------------------------------------------------------------ */
  /*  สถานะของเล่ม                                                        */
  /* ------------------------------------------------------------------ */
  const blank = () => ({
    id: null,
    title: '',
    subtitle: '',
    tagline: '',
    classLine: '',
    author: '',
    preface: '',
    imagePrompt: '',
    imageId: null, // รหัสภาพปกในคลังภาพ (ถ้าเก็บไฟล์ไม่ได้จะเป็น null และใช้ imageUrl ชั่วคราว)
    imageUrl: '',
    includeAnswers: true,
    includeLessons: true,
    entries: [], // { uid, srcId, srcTitle, sheet, plan, grade, subject, chapter, images:{key:id} }
  });
  let book = blank();
  let uidSeq = 0;
  const newUid = () => 'e' + Date.now().toString(36) + (uidSeq++).toString(36);
  const imageUrlOf = (id) => `api/img.php?id=${id}`;

  /* ------------------------------------------------------------------ */
  /*  จัดหน้า: ปก → คำนำ → สารบัญ → ใบงาน → เฉลย พร้อมเลขหน้า              */
  /* ------------------------------------------------------------------ */
  function groupChapters() {
    const out = [];
    book.entries.forEach((en, i) => {
      const ch = String(en.chapter || '').trim();
      const last = out[out.length - 1];
      if (last && last.title === ch) last.items.push({ en, n: i + 1 });
      else out.push({ title: ch, items: [{ en, n: i + 1 }] });
    });
    return out;
  }

  const useLesson = (en) => book.includeLessons && en.lesson;
  const allFormal = () => book.entries.length > 0 && book.entries.every((e) => e.style === 'formal');
  const optsFor = (en, extra) =>
    Object.assign({ showInd: !(en.extra && en.extra.showInd === false), style: en.style || 'kid', figureMode: en.figureMode || 'code', header: Object.assign({}, en.header || {}, { subject: en.subject, grade: en.grade }) }, extra || {});

  function layout() {
    const chapters = groupChapters();
    const rows = [];
    for (const ch of chapters) {
      if (ch.title) rows.push({ head: ch.title });
      for (const it of ch.items) {
        if (useLesson(it.en)) rows.push({ lesson: it });
        rows.push({ item: it });
      }
    }
    if (book.includeAnswers && book.entries.length) rows.push({ answers: true });
    const hasPreface = book.preface.trim() !== '';
    const tocPages = Math.max(1, Math.ceil(rows.length / TOC_ROWS));
    return { rows, hasPreface, tocPages, N: book.entries.length };
  }

  const imgFor = (en) => (prompt, cls) => {
    if (!prompt || !String(prompt).trim()) return '';
    const id = en.images && en.images[imageKey(prompt)];
    if (id) return `<img class="${cls}" src="${esc(imageUrlOf(id))}" alt="">`;
    return `<div class="qi-ph ${cls}"><span class="no-print">ไม่มีภาพ</span></div>`;
  };

  function coverHTML() {
    const src = book.imageId ? imageUrlOf(book.imageId) : book.imageUrl;
    const img = src ? `<img class="cv-img" src="${esc(src)}" alt="">` : '<div class="cv-img ph"><span class="no-print">ยังไม่มีภาพปก</span></div>';
    return `<div class="page-wrap"><div class="page cover${allFormal() ? ' formal-cover' : ''}"><div class="frame"></div>
      <div class="cv-title">${esc(book.title || 'ชื่อเล่ม')}</div>
      ${book.subtitle ? `<div class="cv-sub">${esc(book.subtitle)}</div>` : ''}
      ${img}
      ${book.tagline ? `<div class="cv-tag">${esc(book.tagline)}</div>` : ''}
      <div class="cv-name"><span>ชื่อ-สกุล</span><span class="ln"></span><span>ชั้น</span><span class="ln s"></span><span>เลขที่</span><span class="ln s"></span></div>
      ${book.classLine ? `<div class="cv-class">${esc(book.classLine)}</div>` : ''}
      <div class="cv-author">${esc(book.author)}</div>
    </div></div>`;
  }

  const plainPage = (title, inner) =>
    `<div class="page-wrap"><div class="page plain${allFormal() ? ' formal-plain' : ''}"><div class="frame"></div><div class="bk-head"><span>${esc(title)}</span></div>${inner}<div class="pageno"></div></div></div>`;

  function prefaceHTML() {
    const paras = book.preface.split(/\n+/).map((s) => s.trim()).filter(Boolean);
    return plainPage('คำนำ', `<div class="bk-preface">${paras.map((p) => `<p>${esc(p)}</p>`).join('')}</div>`);
  }

  // เลขหน้าในสารบัญเติมทีหลัง (หลังแบ่งหน้าจริง) จาก data-target → หน้าที่มี data-anchor เดียวกัน
  const tocRow = (label, title, target) =>
    `<div class="toc-row"><span class="l">${label}</span><span class="t">${title}</span><span class="d"></span><span class="p" data-target="${target}"></span></div>`;

  function tocHTML(L) {
    const pages = [];
    for (let p = 0; p < L.tocPages; p++) {
      const slice = L.rows.slice(p * TOC_ROWS, (p + 1) * TOC_ROWS);
      const inner = slice
        .map((r) => {
          if (r.head) return `<div class="toc-ch">${esc(r.head)}</div>`;
          if (r.answers) return tocRow('เฉลย', L.N > 1 ? `ใบงานที่ 1–${L.N}` : 'ใบงานที่ 1', 'answers');
          if (r.lesson) return tocRow(`ใบความรู้ที่ ${r.lesson.n}`, esc(r.lesson.en.lesson.title || r.lesson.en.sheet.topic), 'ls-' + r.lesson.en.uid);
          const { en, n } = r.item;
          return tocRow(`ใบงานที่ ${n}`, esc(en.sheet.topic), 'ws-' + en.uid);
        })
        .join('');
      pages.push(plainPage(L.tocPages > 1 ? `สารบัญ (${p + 1}/${L.tocPages})` : 'สารบัญ', `<div class="bk-toc">${inner}</div>`));
    }
    return pages.join('');
  }

  function renderPages() {
    const has = book.entries.length > 0;
    $('toolbar').classList.toggle('hidden', !has);
    if (!has) {
      $('pages').innerHTML = '';
      return;
    }
    const L = layout();
    let html = coverHTML() + (L.hasPreface ? prefaceHTML() : '') + tocHTML(L);
    book.entries.forEach((en, i) => {
      if (useLesson(en)) html += `<div class="page-wrap">${R.lessonHTML(en.lesson, i + 1, imgFor(en), optsFor(en, { anchor: 'ls-' + en.uid }))}</div>`;
      html += `<div class="page-wrap">${sheetHTML(en.sheet, i + 1, false, imgFor(en), optsFor(en, { anchor: 'ws-' + en.uid }))}</div>`;
    });
    if (book.includeAnswers) {
      book.entries.forEach((en, i) => {
        html += `<div class="page-wrap">${sheetHTML(en.sheet, i + 1, true, imgFor(en), optsFor(en, { anchor: i === 0 ? 'answers' : '' }))}</div>`;
      });
    }
    const box = $('pages');
    box.innerHTML = html;
    R.finish(box); // สูตร + แบ่งหน้าที่ยาวเกิน A4
    const total = R.numberPages(box, 1, true); // หน้าปกไม่พิมพ์เลข
    for (const el of box.querySelectorAll('.toc-row .p[data-target]')) {
      const pg = box.querySelector(`.page[data-anchor="${el.dataset.target}"]`);
      el.textContent = pg ? pg.dataset.no : '';
    }
    const nLesson = book.entries.filter(useLesson).length;
    $('pageInfo').textContent = `${total} หน้า (ปก${L.hasPreface ? ' คำนำ' : ''} สารบัญ ${L.N} ใบงาน${nLesson ? ` ${nLesson} ใบความรู้` : ''}${book.includeAnswers ? ' และเฉลย' : ''})`;
  }

  /* ------------------------------------------------------------------ */
  /*  แผงควบคุม                                                           */
  /* ------------------------------------------------------------------ */
  const covCache = {};
  async function renderCoverage() {
    const box = $('covBox');
    const used = new Map();
    for (const en of book.entries) for (const i of (en.extra && en.extra.indicators) || []) if (i && i.code) used.set(i.code, i.text || '');
    if (!used.size) { box.classList.add('hidden'); return; }
    box.classList.remove('hidden');
    const first = book.entries[0] || {};
    const key = (first.grade || '') + '|' + (first.subject || '');
    if (!(key in covCache)) {
      covCache[key] = null;
      try { covCache[key] = (await apiOnce('api/curriculum.php', { action: 'for_grade', grade: first.grade || '', subject: first.subject || '' })).indicators || []; } catch { covCache[key] = []; }
    }
    const all = covCache[key] || [];
    const codes = new Set(all.map((x) => x.code));
    const hit = [...used.keys()].filter((c) => codes.has(c));
    const miss = all.filter((x) => !used.has(x.code));
    box.innerHTML = all.length
      ? `<strong>🎯 ตัวชี้วัดที่ครอบคลุม ${hit.length}/${all.length}</strong>` + (miss.length ? `<div style="color:var(--muted);margin-top:4px">ยังไม่ครอบคลุม: ${miss.map((x) => esc(x.code)).join(', ')}</div>` : '<div style="color:var(--muted);margin-top:4px">ครบทุกตัวชี้วัดที่ตั้งไว้ในระบบ</div>')
      : `<strong>🎯 ตัวชี้วัดที่ใช้ในเล่ม ${used.size} รหัส</strong><div style="color:var(--muted);margin-top:4px">${[...used.keys()].map(esc).join(', ')}</div>`;
  }

  function renderEntries() {
    renderCoverage();
    $('entryCount').textContent = book.entries.length ? `(${book.entries.length} ใบ)` : '';
    const last = book.entries.length - 1;
    $('entries').innerHTML = book.entries.length
      ? book.entries
          .map(
            (en, i) =>
              `<div class="book-entry"><span class="no">ใบที่ ${i + 1}</span>` +
              `<span class="nm">${esc(en.sheet.topic)} <small>${esc(TYPE_LABEL[en.sheet.type] || en.sheet.type)}${en.lesson ? ' · มีใบความรู้' : ''}${en.style === 'formal' ? ' · ทางการ' : ''} · ${esc(en.srcTitle || '')}</small></span>` +
              `<input type="text" class="ch" data-ch="${i}" list="chapterList" placeholder="หมวด (ไม่บังคับ)" value="${esc(en.chapter || '')}">` +
              `<button class="ghost small" data-up="${i}"${i === 0 ? ' disabled' : ''}>▲</button>` +
              `<button class="ghost small" data-down="${i}"${i === last ? ' disabled' : ''}>▼</button>` +
              `<button class="ghost small" data-rm="${i}">ลบ</button></div>`,
          )
          .join('')
      : '<span style="color:var(--muted);font-size:14px">ยังไม่มีใบงานในเล่ม เลือกจากด้านบนได้เลย</span>';
    $('chapterList').innerHTML = [...new Set(book.entries.map((e) => String(e.chapter || '').trim()).filter(Boolean))]
      .map((c) => `<option value="${esc(c)}">`)
      .join('');
  }

  function readFields() {
    book.title = $('cTitle').value;
    book.subtitle = $('cSub').value;
    book.tagline = $('cTag').value;
    book.classLine = $('cClass').value;
    book.author = $('cAuthor').value;
    book.preface = $('cPreface').value;
    book.imagePrompt = $('cImgPrompt').value;
    book.includeAnswers = $('incAns').checked;
    book.includeLessons = $('incLes').checked;
  }
  function writeFields() {
    $('cTitle').value = book.title;
    $('cSub').value = book.subtitle;
    $('cTag').value = book.tagline;
    $('cClass').value = book.classLine;
    $('cAuthor').value = book.author;
    $('cPreface').value = book.preface;
    $('cImgPrompt').value = book.imagePrompt;
    $('incAns').checked = book.includeAnswers;
    $('incLes').checked = book.includeLessons !== false;
  }

  let renderTimer = 0;
  function changed(opts = {}) {
    if (opts.list) renderEntries();
    clearTimeout(renderTimer);
    renderTimer = setTimeout(renderPages, opts.now ? 0 : 250);
    scheduleSave();
  }

  function defaultsFromEntries() {
    if (!book.classLine && book.entries.length) {
      const e = book.entries[0];
      const grades = new Set(book.entries.map((x) => x.grade).filter(Boolean));
      const subs = new Set(book.entries.map((x) => x.subject).filter(Boolean));
      if (grades.size === 1 && subs.size === 1) {
        book.classLine = `${e.subject} ${e.grade}`;
        $('cClass').value = book.classLine;
      }
    }
    if (!book.title && book.entries.length) {
      book.title = 'เล่มใบงาน';
      $('cTitle').value = book.title;
    }
  }

  /* ------------------------------------------------------------------ */
  /*  เลือกใบงานจากชุดที่บันทึกไว้                                          */
  /* ------------------------------------------------------------------ */
  const srcCache = {}; // id -> { data, missing:Set }
  let srcItems = [];

  async function loadSources() {
    try {
      const r = await apiOnce('api/save.php', { action: 'list' });
      srcItems = r.items || [];
      fillSrcFilters(r.statuses);
      renderSources();
      // มาจากหน้าคลังใบงาน: book.php?add=id1,id2 → เพิ่มทั้งชุดเข้าเล่มให้เลย
      const add = new URLSearchParams(location.search).get('add');
      if (add) {
        history.replaceState(null, '', location.pathname);
        for (const id of add.split(',').filter(Boolean)) await addFromSource(id);
      }
    } catch (e) {
      $('srcList').textContent = 'โหลดรายการไม่สำเร็จ: ' + e.message;
    }
  }

  const srcFilter = () => {
    const q = $('srcQ').value.trim().toLowerCase(), g = $('srcGrade').value, sj = $('srcSubject').value, st = $('srcStatus').value, tm = $('srcTerm').value;
    return srcItems.filter((i) => !tm || String(i.term) === tm).filter((i) => (!q || `${i.title} ${i.topic || ''}`.toLowerCase().includes(q)) && (!g || i.grade === g) && (!sj || i.subject === sj) && (!st || i.status === st));
  };
  function fillSrcFilters(statuses) {
    const set = (id, first, vals, labelOf) => {
      const cur = $(id).value;
      $(id).innerHTML = `<option value="">${first}</option>` + vals.map((v) => `<option value="${esc(v)}">${esc(labelOf ? labelOf(v) : v)}</option>`).join('');
      if (vals.includes(cur)) $(id).value = cur;
    };
    set('srcGrade', 'ทุกชั้น', [...new Set(srcItems.map((i) => i.grade).filter(Boolean))]);
    set('srcSubject', 'ทุกวิชา', [...new Set(srcItems.map((i) => i.subject).filter(Boolean))]);
    set('srcStatus', 'ทุกสถานะ', Object.keys(statuses || {}), (k) => statuses[k]);
  }
  for (const id of ['srcQ', 'srcGrade', 'srcSubject', 'srcStatus', 'srcTerm']) $(id).addEventListener(id === 'srcQ' ? 'input' : 'change', () => renderSources());

  function renderSources() {
    const shown = srcFilter();
    $('srcList').innerHTML = shown.length
      ? shown
          .map(
            (it) =>
              `<div data-src-row="${esc(it.id)}"><div class="row" style="justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee"><span>${esc(it.title)} <span style="color:var(--muted);font-size:12px">${esc(fmtDate(it.savedAt))}</span></span><span class="row"><button class="ghost small" data-pick="${esc(it.id)}">เลือกใบ</button><button class="ghost small" data-addall="${esc(it.id)}">เพิ่มทั้งชุด</button></span></div><div data-pickbox="${esc(it.id)}"></div></div>`,
          )
          .join('')
      : `<span style="color:var(--muted)">${srcItems.length ? 'ไม่พบชุดที่ตรงกับตัวกรอง' : 'ยังไม่มีชุดที่บันทึกไว้ ไปสร้างใบงานที่หน้าแรกก่อน ระบบจะบันทึกให้อัตโนมัติ'}</span>`;
  }

  async function getSource(id) {
    if (!srcCache[id]) {
      const r = await apiOnce('api/save.php', { action: 'load', id });
      srcCache[id] = { data: r.data, missing: new Set(r.missingImages || []) };
    }
    return srcCache[id];
  }

  function entryFrom(src, index) {
    const d = src.data;
    const s = d.sheets[index];
    const m = d.meta || {};
    const en = {
      uid: newUid(),
      srcId: d.id,
      srcTitle: d.title,
      sheet: s.sheet,
      plan: s.plan || {},
      grade: s.grade || m.grade || '',
      subject: s.subject || m.subject || '',
      style: s.style || 'kid',
      figureMode: s.figureMode || 'code',
      lesson: s.lesson || null,
      extra: s.extra || {},
      header: m.header || {},
      chapter: '',
      images: {},
    };
    for (const p of R.imagePrompts(en.sheet, optsFor(en), en.lesson)) {
      const k = imageKey(p);
      const id = (d.images || {})[k];
      if (id && !src.missing.has(k)) en.images[k] = id;
    }
    return en;
  }

  const usable = (s) => s && s.status === 'done' && s.sheet && (Array.isArray(s.sheet.items) || Array.isArray(s.sheet.mcItems));

  async function addFromSource(id, indexes) {
    try {
      const src = await getSource(id);
      const list = (indexes || src.data.sheets.map((_, i) => i)).filter((i) => usable(src.data.sheets[i]));
      if (!list.length) {
        showError('ชุดนี้ไม่มีใบงานที่สร้างสำเร็จให้เพิ่ม');
        return;
      }
      showError('');
      for (const i of list) book.entries.push(entryFrom(src, i));
      defaultsFromEntries();
      changed({ list: true, now: true });
      setNote('saveNote', `เพิ่ม ${list.length} ใบเข้าเล่มแล้ว`);
    } catch (e) {
      showError('เพิ่มใบงานไม่สำเร็จ: ' + e.message);
    }
  }

  async function togglePick(id) {
    const box = document.querySelector(`[data-pickbox="${id}"]`);
    if (!box) return;
    if (box.innerHTML) {
      box.innerHTML = '';
      return;
    }
    box.innerHTML = '<div class="pick-box">กำลังโหลด…</div>';
    try {
      const src = await getSource(id);
      const rows = src.data.sheets
        .map((s, i) =>
          usable(s)
            ? `<label class="pick-row" style="display:flex;gap:8px;align-items:center;font-weight:400"><input type="checkbox" data-pickcb="${i}" checked> ใบที่ ${i + 1}: ${esc(s.sheet.topic)} <span style="color:var(--muted)">(${esc(TYPE_LABEL[s.sheet.type] || s.sheet.type)})</span></label>`
            : '',
        )
        .join('');
      box.innerHTML = `<div class="pick-box">${rows || 'ไม่มีใบที่สร้างสำเร็จ'}<div class="row" style="margin-top:6px"><button class="small" data-addsel="${esc(id)}">เพิ่มที่เลือกเข้าเล่ม</button></div></div>`;
    } catch (e) {
      box.innerHTML = `<div class="pick-box" style="color:#b00020">โหลดไม่สำเร็จ: ${esc(e.message)}</div>`;
    }
  }

  /* ------------------------------------------------------------------ */
  /*  AI: ปก คำนำ จัดหมวด และภาพปก                                         */
  /* ------------------------------------------------------------------ */
  let aiBusy = false;
  async function aiBook() {
    if (aiBusy || !book.entries.length) return;
    readFields();
    aiBusy = true;
    $('aiBtn').disabled = true;
    setNote('aiNote', 'AI กำลังคิดชื่อเล่ม คำนำ และจัดหมวดใบงาน…');
    try {
      const grades = [...new Set(book.entries.map((e) => e.grade).filter(Boolean))];
      const subs = [...new Set(book.entries.map((e) => e.subject).filter(Boolean))];
      const r = await api('api/book_ai.php', {
        grade: grades.join(', ') || 'ป.2',
        subject: subs.join(', ') || 'วิทยาศาสตร์',
        hint: $('aiHint').value,
        items: book.entries.map((e) => ({ uid: e.uid, topic: e.sheet.topic, type: e.plan.type || e.sheet.type, objective: e.plan.objective || '' })),
      });
      // จัดลำดับตามหมวดที่ AI ตอบ (เซิร์ฟเวอร์ตรวจแล้วว่า uid ครบ ไม่ซ้ำ)
      const byUid = new Map(book.entries.map((e) => [e.uid, e]));
      const next = [];
      for (const ch of r.chapters) {
        for (const u of ch.uids) {
          const en = byUid.get(u);
          if (en) {
            en.chapter = ch.title;
            next.push(en);
            byUid.delete(u);
          }
        }
      }
      for (const en of byUid.values()) next.push(en); // กันกรณีตกหล่น
      book.entries = next;
      book.title = r.title;
      book.subtitle = r.subtitle;
      book.tagline = r.tagline;
      book.preface = r.preface;
      book.imagePrompt = r.coverImagePrompt;
      if (!book.classLine) defaultsFromEntries();
      writeFields();
      changed({ list: true, now: true });
      setNote('aiNote', 'AI ทำชื่อเล่ม คำนำ และสารบัญเสร็จแล้ว (แก้ไขข้อความได้ทุกช่อง) กำลังสร้างภาพปก…', '#1b6e2b');
      await makeCover();
    } catch (e) {
      setNote('aiNote', 'ไม่สำเร็จ: ' + e.message, '#b00020');
    } finally {
      aiBusy = false;
      $('aiBtn').disabled = false;
    }
  }

  async function makeCover() {
    readFields();
    let prompt = book.imagePrompt.trim();
    if (prompt && allFormal() && !prompt.startsWith('tb:')) prompt = 'tb:' + prompt; // เล่มมัธยม: ภาพปกแบบหนังสือเรียน
    if (!prompt) {
      setNote('aiNote', 'ใส่คำบรรยายภาพปกก่อน (ภาษาอังกฤษ)', '#b00020');
      return;
    }
    $('coverImgBtn').disabled = true;
    try {
      const r = await api('api/image.php', { prompt, force: false });
      const m = /[?&]id=([a-f0-9]{40})/.exec(r.url || '');
      book.imageId = m ? m[1] : null;
      book.imageUrl = m ? '' : r.url || '';
      changed({ now: true });
      setNote('aiNote', 'สร้างภาพปกเสร็จแล้ว' + (m ? '' : ' (เก็บไฟล์ภาพไม่ได้ ภาพจะอยู่เฉพาะหน้านี้ เปิด check_setup.php เพื่อแก้สิทธิ์)'), '#1b6e2b');
    } catch (e) {
      setNote('aiNote', 'สร้างภาพปกไม่สำเร็จ: ' + e.message + ' (กด “สร้างภาพปก” เพื่อลองใหม่)', '#b00020');
    } finally {
      $('coverImgBtn').disabled = false;
    }
  }

  /* ------------------------------------------------------------------ */
  /*  บันทึก / เปิดเล่ม                                                    */
  /* ------------------------------------------------------------------ */
  let saveTimer = 0;
  let saving = false;
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(doSave, 2500);
  }

  async function doSave(manual) {
    clearTimeout(saveTimer);
    if (!book.entries.length || saving) return;
    readFields();
    saving = true;
    try {
      const images = {};
      for (const en of book.entries) for (const [k, id] of Object.entries(en.images || {})) images[`${en.uid}|${k}`] = id;
      if (book.imageId) images.cover = book.imageId;
      const { imageUrl, ...rest } = book;
      const r = await apiOnce('api/books.php', {
        action: 'save',
        id: book.id,
        title: book.title || 'เล่มใบงาน',
        images,
        book: rest,
      });
      book.id = r.id;
      setNote('saveNote', `${manual ? 'บันทึกเล่มแล้ว' : 'บันทึกอัตโนมัติแล้ว'} ${fmtDate(r.savedAt)}` + (r.where === 'temp' ? ' (เก็บในโฟลเดอร์ชั่วคราว: เปิด check_setup.php เพื่อดูวิธีแก้สิทธิ์)' : ''));
      loadBooks();
    } catch (e) {
      setNote('saveNote', 'บันทึกไม่สำเร็จ: ' + e.message, '#b00020');
    } finally {
      saving = false;
    }
  }

  async function loadBooks() {
    try {
      const r = await apiOnce('api/books.php', { action: 'list' });
      $('bookCount').textContent = r.items.length ? `(${r.items.length})` : '';
      $('bookList').innerHTML = r.items.length
        ? r.items
            .map(
              (it) =>
                `<div class="row" style="justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee"><span>${esc(it.title)} · ${it.count} ใบ <span style="color:var(--muted);font-size:12px">${esc(fmtDate(it.savedAt))}</span></span><span class="row"><button class="ghost small" data-openbook="${esc(it.id)}">เปิด</button><button class="ghost small" data-delbook="${esc(it.id)}">ลบ</button></span></div>`,
            )
            .join('')
        : '<span style="color:var(--muted)">ยังไม่มีเล่มที่บันทึกไว้</span>';
    } catch (e) {
      $('bookList').textContent = 'โหลดรายการไม่สำเร็จ: ' + e.message;
    }
  }

  async function openBook(id) {
    try {
      const r = await apiOnce('api/books.php', { action: 'load', id });
      const d = r.data;
      const b = Object.assign(blank(), d.book || {});
      b.id = d.id;
      b.imageUrl = '';
      const missing = new Set(r.missingImages || []);
      if (missing.has('cover')) b.imageId = null;
      b.entries = (b.entries || []).filter((e) => e && e.sheet && (Array.isArray(e.sheet.items) || Array.isArray(e.sheet.mcItems)));
      for (const en of b.entries) {
        en.images = en.images || {};
        for (const k of Object.keys(en.images)) if (missing.has(`${en.uid}|${k}`)) delete en.images[k];
      }
      book = b;
      writeFields();
      changed({ list: true, now: true });
      clearTimeout(saveTimer); // เปิดอย่างเดียวไม่ต้องบันทึกทับ
      showError('');
      setNote('saveNote', `เปิดเล่ม “${d.title}” (บันทึกเมื่อ ${fmtDate(d.savedAt)}) การแก้ไขต่อจากนี้จะบันทึกทับเล่มนี้` + (missing.size ? ` · ภาพที่ไฟล์หายไป ${missing.size} ภาพ` : ''));
      setNote('aiNote', '');
      window.scrollTo({ top: $('entries').offsetTop - 20 });
    } catch (e) {
      showError('เปิดเล่มไม่สำเร็จ: ' + e.message);
    }
  }

  async function deleteBook(id) {
    if (!window.confirm('ลบเล่มนี้ออกจากรายการที่บันทึกไว้?')) return;
    try {
      await apiOnce('api/books.php', { action: 'delete', id });
      if (book.id === id) book.id = null;
      loadBooks();
    } catch (e) {
      showError('ลบไม่สำเร็จ: ' + e.message);
    }
  }

  function newBook() {
    if (book.entries.length && !window.confirm('เริ่มเล่มใหม่? (เล่มปัจจุบันบันทึกไว้แล้วอัตโนมัติ)')) return;
    clearTimeout(saveTimer);
    book = blank();
    writeFields();
    setNote('aiNote', '');
    setNote('saveNote', '');
    changed({ list: true, now: true });
    clearTimeout(saveTimer);
  }

  /* ------------------------------------------------------------------ */
  /*  ผูกปุ่ม                                                             */
  /* ------------------------------------------------------------------ */
  function orToggle() {
    $('orBox').classList.toggle('hidden', !($('textProvider').value === 'openrouter' || $('imageProvider').value === 'openrouter'));
  }
  for (const id of ['textProvider', 'imageProvider']) {
    try {
      const saved = localStorage.getItem('ws_' + id); // ใช้ค่าเดียวกับหน้าสร้างใบงาน
      const opt = saved && [...$(id).options].find((o) => o.value === saved && !o.disabled);
      if (opt) $(id).value = saved;
    } catch {}
    $(id).addEventListener('change', orToggle);
  }
  try {
    for (const [id, key] of [['orText', 'ws_orText'], ['orImage', 'ws_orImage']]) {
      const v = localStorage.getItem(key);
      if (v) $(id).value = v;
    }
  } catch {}
  orToggle();

  document.addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    const d = t.dataset;
    if (d.pick) togglePick(d.pick);
    else if (d.addall) addFromSource(d.addall);
    else if (d.addsel) {
      const box = document.querySelector(`[data-pickbox="${d.addsel}"]`);
      const idx = [...box.querySelectorAll('[data-pickcb]:checked')].map((c) => Number(c.dataset.pickcb));
      if (!idx.length) return showError('ยังไม่ได้ติ๊กเลือกใบงาน');
      addFromSource(d.addsel, idx);
    } else if (d.up != null || d.down != null) {
      const i = Number(d.up != null ? d.up : d.down);
      const j = d.up != null ? i - 1 : i + 1;
      if (j < 0 || j >= book.entries.length) return;
      [book.entries[i], book.entries[j]] = [book.entries[j], book.entries[i]];
      changed({ list: true, now: true });
    } else if (d.rm != null) {
      book.entries.splice(Number(d.rm), 1);
      changed({ list: true, now: true });
    } else if (d.openbook) openBook(d.openbook);
    else if (d.delbook) deleteBook(d.delbook);
  });
  $('entries').addEventListener('input', (e) => {
    const el = e.target.closest('[data-ch]');
    if (!el) return;
    book.entries[Number(el.dataset.ch)].chapter = el.value;
    changed();
  });
  for (const id of ['cTitle', 'cSub', 'cTag', 'cClass', 'cAuthor', 'cPreface', 'cImgPrompt']) {
    $(id).addEventListener('input', () => {
      readFields();
      changed();
    });
  }
  $('incLes').addEventListener('change', () => {
    readFields();
    changed({ now: true });
  });
  $('incAns').addEventListener('change', () => {
    readFields();
    changed({ now: true });
  });
  $('aiBtn').addEventListener('click', aiBook);
  $('coverImgBtn').addEventListener('click', makeCover);
  $('coverImgClear').addEventListener('click', () => {
    book.imageId = null;
    book.imageUrl = '';
    changed({ now: true });
  });
  $('saveBtn').addEventListener('click', () => doSave(true));
  $('newBook').addEventListener('click', newBook);
  $('printBtn').addEventListener('click', () => {
    renderPages();
    window.print();
  });

  renderEntries();
  loadSources();
  loadBooks();
})();
