(() => {
  'use strict';
  const { esc, api, showError, GRADES, fmtDate } = window.WS;
  const $ = (id) => document.getElementById(id);
  const CUR = window.CURRICULUM || {};
  const LET = ['ก', 'ข', 'ค', 'ง', 'จ', 'ฉ', 'ช', 'ซ'];
  const PARTS = ['mc', 'tf', 'match', 'written'];
  const PLABEL = { mc: 'ปรนัย 4 ตัวเลือก', tf: 'ถูก / ผิด', match: 'จับคู่', written: 'อัตนัย (แสดงวิธีทำ)' };
  const LVL = [
    ['ง่าย', 'จำ/เข้าใจ'],
    ['ปานกลาง', 'เข้าใจ/ประยุกต์'],
    ['ยาก', 'วิเคราะห์'],
    ['ยากมาก', 'ประเมิน/สร้าง'],
  ];
  const PRESETS = { std: [20, 50, 30, 0], exam: [10, 30, 40, 20], review: [50, 40, 10, 0], contest: [0, 20, 40, 40] };
  const MATCH_GROUP = 6;
  const st = { doc: null, id: '', tab: 'analysis', ver: 0, indList: [], scopeEdited: false, pre: null };

  const num = (v) => Math.round(v * 100) / 100;
  const fmt = (v) => String(num(v));
  const nl = (s) => esc(s).replace(/\n/g, '<br>');

  /* ------------------------------ ฟอร์ม ------------------------------ */
  $('grade').innerHTML = GRADES.map((g) => `<option${g === 'ป.4' ? ' selected' : ''}>${g}</option>`).join('');
  $('year').value = String(new Date().getFullYear() + 543);

  function units() {
    const t = $('term').value;
    return ((CUR[$('grade').value] || {})[$('subject').value] || []).filter((u) => !t || String(u[0]) === t).map((u) => u[1]);
  }
  function fillSubjects() {
    const subs = Object.keys(CUR[$('grade').value] || {});
    $('subject').innerHTML = subs.map((s) => `<option>${esc(s)}</option>`).join('');
  }
  function fillScope() {
    if (st.scopeEdited) return;
    $('scope').value = units().join(', ');
  }
  async function onSubjectChange(preChecked) {
    fillScope();
    await loadIndicators(preChecked);
  }
  $('grade').addEventListener('change', () => { fillSubjects(); onSubjectChange(); });
  $('subject').addEventListener('change', () => onSubjectChange());
  $('term').addEventListener('change', fillScope);
  $('scope').addEventListener('input', () => { st.scopeEdited = true; });

  function partsCfg() {
    const o = {};
    document.querySelectorAll('#partsTbl tbody tr').forEach((tr) => {
      o[tr.dataset.p] = { count: Math.max(0, Number(tr.querySelector('[data-f=count]').value) || 0), score: Math.max(0, Number(tr.querySelector('[data-f=score]').value) || 0) };
    });
    return o;
  }
  function updateTotals() {
    const p = partsCfg();
    let total = 0, items = 0;
    document.querySelectorAll('#partsTbl tbody tr').forEach((tr) => {
      const c = p[tr.dataset.p];
      tr.querySelector('.sum').textContent = c.count ? fmt(c.count * c.score) : '—';
      total += c.count * c.score;
      items += c.count;
    });
    $('totalScore').innerHTML = `<b>${fmt(total)}</b>`;
    st.itemTotal = items;
    indNote();
  }
  $('partsTbl').addEventListener('input', updateTotals);

  function mixVals() {
    return { easy: Number($('mx_easy').value) || 0, medium: Number($('mx_medium').value) || 0, hard: Number($('mx_hard').value) || 0, expert: Number($('mx_expert').value) || 0 };
  }
  function setPreset(k) {
    const v = PRESETS[k];
    if (!v) return;
    ['easy', 'medium', 'hard', 'expert'].forEach((n, i) => { $('mx_' + n).value = v[i]; });
  }
  $('mixPreset').addEventListener('change', () => setPreset($('mixPreset').value));
  ['easy', 'medium', 'hard', 'expert'].forEach((n) => $('mx_' + n).addEventListener('input', () => { $('mixPreset').value = 'custom'; }));
  setPreset('std');

  /* ---------------------------- ตัวชี้วัด ---------------------------- */
  function checkedCodes() {
    return [...document.querySelectorAll('#indBox input:checked')].map((i) => i.value);
  }
  function indNote() {
    const k = checkedCodes().length;
    $('indCount').textContent = st.indList.length ? `(เลือก ${k}/${st.indList.length})` : '';
    const n = st.itemTotal || 0;
    $('indNote').textContent = k && n && k > n ? `⚠ เลือกตัวชี้วัด ${k} ตัว แต่มีข้อสอบรวม ${n} ข้อ ตัวชี้วัดบางตัวจะไม่ถูกออกสอบ` : '';
  }
  async function loadIndicators(pre) {
    $('indBox').textContent = 'กำลังโหลดตัวชี้วัด…';
    try {
      const r = await api('api/exam.php', { action: 'indicators', grade: $('grade').value, subject: $('subject').value });
      st.indList = r.indicators || [];
      const want = pre ? new Set(pre) : null;
      $('indBox').innerHTML = st.indList.length
        ? st.indList.map((i) => `<label><input type="checkbox" value="${esc(i.code)}"${!want || want.has(i.code) ? ' checked' : ''}><span><code>${esc(i.code)}</code> ${esc(String(i.text).slice(0, 140))}</span></label>`).join('')
        : '<span style="color:var(--muted)">ชั้น/วิชานี้ยังไม่มีตัวชี้วัดในระบบ (เมนู “🎯 ตัวชี้วัด” นำเข้าได้) ข้อสอบจะออกตามขอบเขตเนื้อหาอย่างเดียว และตารางวิเคราะห์จะไม่แยกตามตัวชี้วัด</span>';
    } catch (e) {
      st.indList = [];
      $('indBox').textContent = '';
      showError(e.message);
    }
    indNote();
  }
  $('indBox').addEventListener('change', indNote);
  $('indAll').addEventListener('click', () => { document.querySelectorAll('#indBox input').forEach((i) => { i.checked = true; }); indNote(); });
  $('indNone').addEventListener('click', () => { document.querySelectorAll('#indBox input').forEach((i) => { i.checked = false; }); indNote(); });

  function request() {
    const fm = $('figMode') ? $('figMode').value : 'smart';
    return {
      grade: $('grade').value,
      subject: $('subject').value,
      term: $('term').value,
      kind: $('kind').value,
      title: $('title').value.trim(),
      scope: $('scope').value,
      scopeEdited: st.scopeEdited,
      hint: $('hint').value,
      indicators: checkedCodes(),
      mix: mixVals(),
      useBank: $('useBank').checked,
      creativeMode: $('creativeMode') ? $('creativeMode').value : 'hots',
      figMode: fm,
      withFigures: fm !== 'none',
      paperCols: $('paperCols') ? $('paperCols').value : '2',
      parts: partsCfg(),
    };
  }

  /* --------------------------- ตารางวิเคราะห์ --------------------------- */
  function calcAnalysis(doc) {
    const rows = new Map();
    for (const i of doc.indicators || []) rows.set(i.code, { code: i.code, text: i.text || '', levels: [0, 0, 0, 0], score: [0, 0, 0, 0], items: 0, points: 0 });
    for (const p of PARTS) {
      const part = doc.parts[p];
      if (!part) continue;
      for (const it of part.items) {
        let c = it.indicator || '';
        if (!rows.has(c)) {
          if (c) c = '';
          if (!rows.has('')) rows.set('', { code: '', text: 'ไม่ระบุตัวชี้วัด', levels: [0, 0, 0, 0], score: [0, 0, 0, 0], items: 0, points: 0 });
        }
        const r = rows.get(c);
        const li = Math.max(1, Math.min(4, it.level || 2)) - 1;
        r.levels[li]++;
        r.score[li] += part.score;
        r.items++;
        r.points += part.score;
      }
    }
    return [...rows.values()];
  }
  function analysisTable(rows) {
    const tot = { levels: [0, 0, 0, 0], score: [0, 0, 0, 0], items: 0, points: 0 };
    const body = rows.map((r) => {
      r.levels.forEach((n, i) => { tot.levels[i] += n; tot.score[i] += r.score[i]; });
      tot.items += r.items;
      tot.points += r.points;
      return `<tr><td class="l"><b>${esc(r.code || '—')}</b> ${esc(String(r.text).slice(0, 110))}</td>${r.levels.map((n, i) => (n ? `<td>${n} <span class="sub" style="margin:0">(${fmt(r.score[i])})</span></td>` : '<td class="dim">–</td>')).join('')}<td><b>${r.items}</b></td><td><b>${fmt(r.points)}</b></td></tr>`;
    }).join('');
    return `<table class="xatbl"><thead><tr><th class="l">ตัวชี้วัด</th>${LVL.map((l) => `<th>${l[0]}<br><small>${l[1]}</small></th>`).join('')}<th>รวมข้อ</th><th>รวมคะแนน</th></tr></thead><tbody>${body}</tbody>
      <tfoot><tr><td class="l">รวม</td>${tot.levels.map((n, i) => `<td>${n} (${fmt(tot.score[i])})</td>`).join('')}<td>${tot.items}</td><td>${fmt(tot.points)}</td></tr>
      <tr><td class="l">สัดส่วนข้อ</td>${tot.levels.map((n) => `<td>${tot.items ? Math.round((n * 100) / tot.items) : 0}%</td>`).join('')}<td></td><td></td></tr></tfoot></table>
      <div class="sub" style="margin:4px 0">ในช่องแสดง จำนวนข้อ (คะแนน) · ข้อจับคู่นับเป็นระดับ “ง่าย”</div>`;
  }
  function docHead(doc) {
    const term = doc.term ? ` ภาคเรียนที่ ${esc(doc.term)}` : '';
    return `<h2 style="text-align:center;margin:6px 0">${esc(doc.school || '')}</h2><div style="text-align:center;margin-bottom:6px">${esc(doc.title)} · วิชา${esc(doc.subject)} ชั้น${esc(doc.grade)}${term}${doc.year ? ' ปีการศึกษา ' + esc(doc.year) : ''}</div>`;
  }
  function partSummary(doc) {
    const rows = PARTS.filter((p) => doc.parts[p]).map((p) => `<tr><td class="l">${PLABEL[p]}</td><td>${doc.parts[p].items.length}</td><td>${fmt(doc.parts[p].score)}</td><td>${fmt(doc.parts[p].items.length * doc.parts[p].score)}</td></tr>`).join('');
    return `<table class="xatbl" style="max-width:520px"><thead><tr><th class="l">ส่วน</th><th>ข้อ</th><th>คะแนน/ข้อ</th><th>รวม</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td class="l">คะแนนเต็ม</td><td>${itemCount(doc)}</td><td></td><td>${fmt(totalScore(doc))}</td></tr></tfoot></table>`;
  }
  const itemCount = (doc) => PARTS.reduce((s, p) => s + (doc.parts[p] ? doc.parts[p].items.length : 0), 0);
  const totalScore = (doc) => PARTS.reduce((s, p) => s + (doc.parts[p] ? doc.parts[p].items.length * doc.parts[p].score : 0), 0);

  function renderAnalysis() {
    const doc = st.doc;
    const rows = calcAnalysis(doc);
    const miss = (doc.indicators || []).filter((i) => !rows.find((r) => r.code === i.code && r.items > 0));
    $('pane-analysis').innerHTML = `${docHead(doc)}<h3 style="margin:8px 0 0">ตารางวิเคราะห์ข้อสอบ</h3>${analysisTable(rows)}${miss.length ? `<div class="xwarn">ตัวชี้วัดที่ไม่มีข้อสอบวัด: ${miss.map((i) => esc(i.code)).join(', ')}</div>` : ''}<h3 style="margin:14px 0 0">โครงสร้างข้อสอบ</h3>${partSummary(doc)}`;
  }

  /* --------------------------- แก้ไขข้อสอบ --------------------------- */
  const SRC = { bank: 'จากคลัง', ai: 'AI สร้าง', edited: 'แก้ไขแล้ว', none: 'ยังไม่มีข้อ' };

  function renderFig(fig) {
    if (!fig) return '';
    if (typeof fig === 'string') {
      const s = fig.trim();
      if (s.startsWith('<svg')) {
        return `<div class="xq-fig">${s}</div>`;
      }
      if (s.startsWith('http') || s.startsWith('data:') || s.startsWith('api/') || s.startsWith('/public') || s.startsWith('public/') || s.startsWith('/assets') || s.startsWith('assets/')) {
        return `<div class="xq-fig"><img src="${esc(s)}" alt="แผนภาพประกอบ"></div>`;
      }
      return '';
    }
    if (typeof fig === 'object') {
      const inner = fig.svg || (fig.url ? `<img src="${esc(fig.url)}" alt="${esc(fig.caption || 'ภาพประกอบ')}">` : '');
      if (!inner) return '';
      return `<div class="xq-fig">${inner}${fig.caption ? `<div class="xq-fig-caption">${esc(fig.caption)}</div>` : ''}</div>`;
    }
    return '';
  }

  function card(p, i, it) {
    const hasFig = Boolean(it.figure && String(it.figure).trim());
    const head = `<div class="hd"><b>ข้อ ${i + 1}</b>${it.indicator ? `<span class="chip">${esc(it.indicator)}</span>` : ''}<span class="chip gray">ระดับ ${it.level}</span><span class="badge ${esc(it.source || 'none')}">${SRC[it.source] || ''}</span><span style="flex:1"></span><button class="ghost small" data-regen-fig="${p}:${i}" title="สร้างหรือเปลี่ยนภาพประกอบของข้อนี้">${hasFig ? '🖼️ เปลี่ยนรูป' : '＋ เพิ่มรูปประกอบ'}</button>${hasFig ? `<button class="ghost small" data-del-fig="${p}:${i}" title="ลบรูปประกอบของข้อนี้ออก">🗑️ ลบรูป</button>` : ''}<button class="ghost small" data-regen="${p}:${i}">↻ สร้างข้อใหม่</button></div>`;
    let body = '';
    const figBox = hasFig ? `<div class="fig-preview">${renderFig(it.figure)}<div style="font-size:11px;color:#666;margin-top:2px">แผนภาพประกอบของข้อนี้ (แสดงในข้อสอบจริงและข้อสอบออนไลน์)</div></div>` : '';
    if (p === 'mc') {
      body = `<textarea data-f="question">${esc(it.question)}</textarea>${figBox}<div class="chs">${it.choices.map((c, k) => `<label class="ch"><input type="radio" name="a-${i}" data-f="ans" data-k="${k}"${it.answerIndex === k ? ' checked' : ''} title="เลือกข้อที่ถูก"><b>${LET[k]}</b><input type="text" data-f="choice" data-k="${k}" value="${esc(c)}"></label>`).join('')}</div><textarea data-f="explain" placeholder="เหตุผล/วิธีคิด (ไม่บังคับ)" style="margin-top:6px;min-height:34px">${esc(it.explain || '')}</textarea>`;
    } else if (p === 'tf') {
      body = `<textarea data-f="statement">${esc(it.statement)}</textarea>${figBox}<label style="font-size:13px">เฉลย <select data-f="tfans"><option value="1"${it.answer ? ' selected' : ''}>ถูก</option><option value="0"${it.answer ? '' : ' selected'}>ผิด</option></select></label>`;
    } else if (p === 'match') {
      body = `${figBox}<div class="mt"><input type="text" data-f="left" value="${esc(it.left)}" placeholder="ซ้าย"><input type="text" data-f="right" value="${esc(it.right)}" placeholder="ขวา (คู่ที่ถูก)"></div>`;
    } else {
      body = `<textarea data-f="question">${esc(it.question)}</textarea>${figBox}<textarea data-f="solution" placeholder="วิธีทำ (บรรทัดละขั้นตอน)" style="margin-top:6px">${esc((it.solution || []).join('\n'))}</textarea><div class="row" style="margin-top:6px"><label style="flex:1;font-size:13px">คำตอบ<input type="text" data-f="answer" value="${esc(it.answer)}"></label><label style="font-size:13px">บรรทัดเขียน<input type="number" data-f="lines" min="2" max="12" value="${it.lines || 5}" style="width:70px"></label></div>`;
    }
    return `<div class="xcard${it.source === 'none' ? ' none' : ''}" data-p="${p}" data-i="${i}">${head}${body}</div>`;
  }
  function renderEdit() {
    const doc = st.doc;
    let n = 0;
    $('pane-edit').innerHTML = PARTS.filter((p) => doc.parts[p]).map((p) => {
      n++;
      const part = doc.parts[p];
      return `<div class="xpart" data-part="${p}"><h3>ตอนที่ ${n} ${PLABEL[p]} <span class="sub" style="margin:0;font-weight:400">· ${part.items.length} ข้อ · ข้อละ <input type="number" class="pscore" data-ps="${p}" min="0" max="50" step="0.5" value="${part.score}" style="width:70px;padding:3px 6px"> คะแนน</span></h3>${part.items.map((it, i) => card(p, i, it)).join('')}</div>`;
    }).join('');
  }
  function markEdited(it) {
    if (it.source !== 'edited') it.source = 'edited';
  }
  $('pane-edit').addEventListener('input', (e) => {
    const ps = e.target.dataset.ps;
    if (ps) {
      st.doc.parts[ps].score = Math.max(0, Number(e.target.value) || 0);
      return;
    }
    const cardEl = e.target.closest('.xcard');
    const f = e.target.dataset.f;
    if (!cardEl || !f) return;
    const it = st.doc.parts[cardEl.dataset.p].items[Number(cardEl.dataset.i)];
    const v = e.target.value;
    if (f === 'choice') it.choices[Number(e.target.dataset.k)] = v;
    else if (f === 'ans') it.answerIndex = Number(e.target.dataset.k);
    else if (f === 'tfans') it.answer = v === '1';
    else if (f === 'solution') it.solution = v.split('\n').map((x) => x.trim()).filter(Boolean);
    else if (f === 'lines') it.lines = Math.max(2, Math.min(12, Number(v) || 5));
    else it[f] = v;
    markEdited(it);
    const badge = cardEl.querySelector('.badge');
    if (badge) { badge.className = 'badge edited'; badge.textContent = SRC.edited; }
    cardEl.classList.remove('none');
  });
  $('pane-edit').addEventListener('click', async (e) => {
    const delFigBtn = e.target.closest('[data-del-fig]');
    if (delFigBtn) {
      const [p, i] = delFigBtn.dataset.delFig.split(':');
      const it = st.doc.parts[p].items[Number(i)];
      it.figure = '';
      markEdited(it);
      renderEdit();
      return;
    }

    const figBtn = e.target.closest('[data-regen-fig]');
    if (figBtn) {
      const [p, i] = figBtn.dataset.regenFig.split(':');
      const it = st.doc.parts[p].items[Number(i)];
      figBtn.disabled = true;
      figBtn.textContent = 'กำลังวาด…';
      try {
        const r = await api('api/exam.php', {
          action: 'regen_fig',
          subject: st.doc.subject,
          question: `${$('scope').value} ${it.question || it.statement || it.left || ''}`,
          part: p,
        }, true);
        it.figure = r.figure;
        markEdited(it);
        renderEdit();
      } catch (err) {
        showError(err.message);
      } finally {
        figBtn.disabled = false;
        figBtn.textContent = '🖼️ เปลี่ยนรูป';
      }
      return;
    }

    const b = e.target.closest('[data-regen]');
    if (!b) return;
    const [p, i] = b.dataset.regen.split(':');
    const part = st.doc.parts[p];
    const it = part.items[Number(i)];
    b.disabled = true;
    b.textContent = 'กำลังสร้าง…';
    showError('');
    try {
      const avoid = PARTS.flatMap((q) => (st.doc.parts[q] ? st.doc.parts[q].items.map((x) => x.question || x.statement || x.left || '') : [])).filter(Boolean);
      const r = await api('api/exam.php', {
        action: 'regen', grade: st.doc.grade, subject: st.doc.subject, kind: st.doc.kind, scope: $('scope').value, hint: $('hint').value,
        indicators: (st.doc.indicators || []).map((x) => x.code), part: p, level: it.level, indicator: it.indicator, avoid,
      }, true);
      part.items[Number(i)] = r.item;
      renderEdit();
      const el = $('pane-edit').querySelector(`.xcard[data-p="${p}"][data-i="${i}"]`);
      if (el) el.scrollIntoView({ block: 'center' });
    } catch (er) {
      showError(er.message);
      b.disabled = false;
      b.textContent = '↻ สร้างข้อใหม่';
    }
  });

  /* ------------------- สลับข้อ/ตัวเลือก และสร้างแต่ละชุด ------------------- */
  function rng32(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuf(arr, rnd) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  /** ตัวเลือกที่อ้างถึงตัวเลือกอื่น (เช่น "ทั้ง ก และ ข") สลับไม่ได้ */
  const POSITIONAL = /ทั้ง\s*[ก-ง]|[ก-ง]\s*(และ|กับ)\s*[ก-ง]|ถูกทุกข้อ|ผิดทุกข้อ|ถูกต้องทั้งหมด|ไม่มีข้อใด|ข้อ\s*[ก-ง]\s*ถูก|ทุกข้อ/;

  function buildVersion(doc, vi) {
    const rnd = rng32((doc.seed * 31 + vi * 7919) >>> 0);
    const out = {};
    const P = doc.parts;
    if (P.mc) {
      let idx = P.mc.items.map((_, i) => i);
      if (vi > 0) idx = shuf(idx, rnd);
      out.mc = idx.map((oi) => {
        const it = P.mc.items[oi];
        let ci = [0, 1, 2, 3];
        if (vi > 0 && !it.choices.some((c) => POSITIONAL.test(c))) ci = shuf(ci, rnd);
        return { oi, it, question: it.question, choices: ci.map((k) => it.choices[k]), ans: ci.indexOf(it.answerIndex) };
      });
    }
    if (P.tf) {
      let idx = P.tf.items.map((_, i) => i);
      if (vi > 0) idx = shuf(idx, rnd);
      out.tf = idx.map((oi) => ({ oi, it: P.tf.items[oi], statement: P.tf.items[oi].statement, ans: !!P.tf.items[oi].answer }));
    }
    if (P.match) {
      const items = P.match.items;
      const groups = [];
      for (let s = 0; s < items.length; s += MATCH_GROUP) {
        const chunk = items.slice(s, s + MATCH_GROUP).map((it, k) => ({ oi: s + k, it }));
        const rights = shuf(chunk.map((c) => c.oi), rnd);
        const lefts = vi > 0 ? shuf(chunk, rnd) : chunk;
        groups.push({ lefts: lefts.map((c) => ({ oi: c.oi, it: c.it, text: c.it.left, ans: rights.indexOf(c.oi) })), rights: rights.map((oi) => items[oi].right) });
      }
      out.match = groups;
    }
    if (P.written) {
      let idx = P.written.items.map((_, i) => i);
      if (vi > 0) idx = shuf(idx, rnd);
      out.written = idx.map((oi) => ({ oi, it: P.written.items[oi] }));
    }
    return out;
  }
  const versions = () => Math.max(1, Math.min(4, st.doc.versions || 1));
  const VNAME = ['ก', 'ข', 'ค', 'ง'];
  const present = (doc) => PARTS.filter((p) => doc.parts[p]);

  function paperHead(doc, vi, sheet) {
    const term = doc.term ? ` ภาคเรียนที่ ${esc(doc.term)}` : '';
    const topSub = `แบบทดสอบวิชา${esc(doc.subject)} ชั้น${esc(doc.grade)} ชุดที่ ${vi + 1}`;
    return `<div class="xtop-bar"><span>${topSub}</span><span>${versions() > 1 ? `<span class="vtag">ชุด ${VNAME[vi]}</span>` : ''}</span></div>
      ${doc.school ? `<h2>${esc(doc.school)}</h2>` : ''}
      <div class="xbanner-box">
        <div class="xbanner-title">${esc(sheet ? 'กระดาษคำตอบ ' : '')}${esc(doc.title)}</div>
        <div class="meta">วิชา${esc(doc.subject)} ชั้น${esc(doc.grade)}${term}${doc.year ? ' ปีการศึกษา ' + esc(doc.year) : ''} · ${doc.minutes ? `เวลา ${doc.minutes} นาที · ` : ''}คะแนนเต็ม ${fmt(totalScore(doc))} คะแนน (${itemCount(doc)} ข้อ)</div>
      </div>
      <div class="who"><span>ชื่อ-สกุล<span class="ln">&nbsp;</span></span><span>ชั้น<span class="ln">&nbsp;</span></span><span>เลขที่<span class="ln">&nbsp;</span></span></div>`;
  }
  function insLine(p, part, nPart) {
    const sc = part.score, total = fmt(part.items.length * sc);
    const ins = {
      mc: 'จงเลือกคำตอบที่ถูกต้องที่สุดเพียงคำตอบเดียว',
      tf: 'พิจารณาข้อความที่กำหนดให้ว่าถูกหรือผิด แล้วทำเครื่องหมายในกระดาษคำตอบ',
      match: 'จับคู่ข้อความทางซ้ายมือกับตัวเลือกทางขวามือที่สัมพันธ์กัน',
      written: 'แสดงวิธีทำและอธิบายเหตุผลประกอบอย่างชัดเจน',
    }[p];
    return `<div class="ptitle">ตอนที่ ${nPart} ${PLABEL[p]} (${part.items.length}${p === 'match' ? ' คู่' : ' ข้อ'} ข้อละ ${fmt(sc)} คะแนน รวม ${total} คะแนน)</div><div class="pins"><b>คำสั่ง</b> ${ins}</div>`;
  }
  function paperHtml(doc, vi) {
    const v = buildVersion(doc, vi);
    const cols = ($('paperCols') ? $('paperCols').value : doc.paperCols || '2') === '2';
    let html = paperHead(doc, vi, false);
    let bodyHtml = '';
    let nPart = 0;
    for (const p of present(doc)) {
      nPart++;
      bodyHtml += insLine(p, doc.parts[p], nPart);
      if (p === 'mc') {
        const itemsHtml = v.mc.map((q, i) => {
          const forceOneCol = cols || q.choices.some((c) => c.length > 26);
          return `<div class="xq"><span class="qn">${i + 1}.</span>${nl(q.question)}${renderFig(q.it.figure)}<div class="chs${forceOneCol ? ' one' : ''}">${q.choices.map((c, k) => `<div>${LET[k]}. ${nl(c)}</div>`).join('')}</div></div>`;
        }).join('');
        bodyHtml += `<div class="xpart-items${cols ? ' cols-2' : ''}">${itemsHtml}</div>`;
      } else if (p === 'tf') {
        const itemsHtml = v.tf.map((q, i) => `<div class="xq"><span class="qn">${i + 1}.</span>${nl(q.statement)}${renderFig(q.it.figure)}</div>`).join('');
        bodyHtml += `<div class="xpart-items${cols ? ' cols-2' : ''}">${itemsHtml}</div>`;
      } else if (p === 'match') {
        let n = 0;
        bodyHtml += v.match.map((g) => `<div class="xmatch"><div>${g.lefts.map((l) => `<div class="xq"><span class="qn">${++n}.</span>${nl(l.text)}${renderFig(l.it.figure)}</div>`).join('')}</div><div>${g.rights.map((r, k) => `<div class="xq opt">${LET[k]}. ${nl(r)}</div>`).join('')}</div></div>`).join('');
      } else {
        bodyHtml += v.written.map((q, i) => `<div class="xq"><span class="qn">${i + 1}.</span>${nl(q.it.question)}${renderFig(q.it.figure)}${Array.from({ length: q.it.lines || 5 }, () => '<div class="xline"></div>').join('')}</div>`).join('');
      }
    }
    html += `<div class="xpaper-body">${bodyHtml}</div>`;
    return `<div class="xpaper${vi === st.ver ? '' : ' off'}" data-v="${vi}">${html}</div>`;
  }

  function sheetHtml(doc, vi) {
    const v = buildVersion(doc, vi);
    let html = paperHead(doc, vi, true);
    if (versions() > 1) html += `<div class="box">ชุดข้อสอบที่ได้รับ (ฝนวงกลม): ${VNAME.slice(0, versions()).map((n) => `<span class="bub">${n}</span>`).join('')}</div>`;
    let nPart = 0;
    for (const p of present(doc)) {
      nPart++;
      const part = doc.parts[p];
      html += `<div class="ptitle">ตอนที่ ${nPart} ${PLABEL[p]} (ข้อละ ${fmt(part.score)} คะแนน)</div>`;
      if (p === 'mc') html += `<div class="acols">${v.mc.map((_, i) => `<div class="arow"><span class="n">${i + 1}</span>${LET.slice(0, 4).map((l) => `<span class="bub">${l}</span>`).join('')}</div>`).join('')}</div>`;
      else if (p === 'tf') html += `<div class="acols">${v.tf.map((_, i) => `<div class="arow"><span class="n">${i + 1}</span><span class="bub" style="width:auto;padding:0 3mm;border-radius:10mm">ถูก</span><span class="bub" style="width:auto;padding:0 3mm;border-radius:10mm">ผิด</span></div>`).join('')}</div>`;
      else if (p === 'match') {
        let n = 0;
        html += `<div class="acols">${v.match.map((g) => g.lefts.map(() => `<div class="arow"><span class="n">${++n}</span>${g.rights.map((_, k) => `<span class="bub">${LET[k]}</span>`).join('')}</div>`).join('')).join('')}</div>`;
      } else {
        html += `<div class="pins">เขียนคำตอบในข้อสอบ ช่องด้านล่างสำหรับครูให้คะแนน</div><table class="scoretbl"><tr><th>ข้อ</th>${v.written.map((_, i) => `<th>${i + 1}</th>`).join('')}<th>รวม</th></tr><tr><td>คะแนน (เต็ม ${fmt(part.score)})</td>${v.written.map(() => '<td>&nbsp;</td>').join('')}<td>&nbsp;</td></tr></table>`;
      }
    }
    html += `<div class="box" style="margin-top:6mm">คะแนนรวม ........... / ${fmt(totalScore(doc))} &nbsp;&nbsp; ผู้ตรวจ ...........................</div>`;
    return `<div class="xpaper sheet${vi === st.ver ? '' : ' off'}" data-v="${vi}">${html}</div>`;
  }

  function keyHtml(doc, vi) {
    const v = buildVersion(doc, vi);
    let html = `${versions() > 1 ? `<span class="vtag">ชุด ${VNAME[vi]}</span>` : ''}<h2>เฉลย ${esc(doc.title)}</h2><div class="meta">วิชา${esc(doc.subject)} ชั้น${esc(doc.grade)} · คะแนนเต็ม ${fmt(totalScore(doc))}</div>`;
    let nPart = 0;
    const meta = (it) => `<td>${esc(it.indicator || '–')}</td><td>${it.level || ''}</td>`;
    for (const p of present(doc)) {
      nPart++;
      const part = doc.parts[p];
      html += `<div class="ptitle">ตอนที่ ${nPart} ${PLABEL[p]} (ข้อละ ${fmt(part.score)} คะแนน)</div>`;
      if (p === 'mc' || p === 'tf') {
        const list = p === 'mc' ? v.mc : v.tf;
        const rows = list.map((q, i) => `<tr><td>${i + 1}</td><td><b>${p === 'mc' ? LET[q.ans] : q.ans ? 'ถูก' : 'ผิด'}</b></td>${meta(q.it)}</tr>`);
        html += `<table class="ktbl"><tr><th>ข้อ</th><th>เฉลย</th><th>ตัวชี้วัด</th><th>ระดับ</th></tr>${rows.join('')}</table>`;
        if (p === 'mc') {
          const ex = v.mc.map((q, i) => (q.it.explain ? `<div class="ksol"><b>${i + 1}.</b> ${nl(q.it.explain)}</div>` : '')).join('');
          if (ex) html += `<div class="pins"><b>เหตุผลประกอบ</b></div>${ex}`;
        }
      } else if (p === 'match') {
        let n = 0;
        const rows = v.match.map((g) => g.lefts.map((l) => `<tr><td>${++n}</td><td class="l">${esc(l.text)}</td><td><b>${LET[l.ans]}</b></td><td class="l">${esc(l.it.right)}</td>${meta(l.it)}</tr>`).join('')).join('');
        html += `<table class="ktbl"><tr><th>ข้อ</th><th>ข้อความ</th><th>เฉลย</th><th>คู่ที่ถูก</th><th>ตัวชี้วัด</th><th>ระดับ</th></tr>${rows}</table>`;
      } else {
        html += v.written.map((q, i) => `<div class="ksol"><b>${i + 1}.</b> ${nl(q.it.question)}<div style="margin-left:2em">${(q.it.solution || []).map((s) => `<div>${nl(s)}</div>`).join('')}<div><b>ตอบ ${nl(q.it.answer)}</b> <span class="sub" style="margin:0">(${esc(q.it.indicator || '–')} · ระดับ ${q.it.level})</span></div></div></div>`).join('');
      }
    }
    return `<div class="xpaper${vi === st.ver ? '' : ' off'}" data-v="${vi}">${html}</div>`;
  }

  /* ------------------------- ข้อสอบออนไลน์ (Online Exam) ------------------------- */
  async function publishOnlineExam() {
    if (!st.doc) return;
    syncMeta();
    const pane = $('pane-online');
    pane.innerHTML = `<div class="online-box"><p>กำลังสร้างและซิงค์ข้อสอบออนไลน์พร้อมรูปประกอบ…</p></div>`;
    try {
      const r = await api('api/online_exam.php', {
        action: 'create',
        id: st.onlineId || st.id || undefined,
        sourceType: 'exam',
        doc: st.doc,
      });
      st.onlineId = r.id;
      st.onlineExam = r.exam;
      drawOnlinePane();
    } catch (err) {
      showError(err.message);
    }
  }

  function drawOnlinePane() {
    const pane = $('pane-online');
    if (!st.onlineExam) {
      publishOnlineExam();
      return;
    }
    const ex = st.onlineExam;
    const fullUrl = `${location.origin}/online-exam.php?id=${encodeURIComponent(ex.id)}`;
    const subs = Array.isArray(ex.submissions) ? ex.submissions : [];
    const qs = Array.isArray(ex.questions) ? ex.questions : [];

    const subsHtml = subs.length
      ? `<table class="xatbl" style="margin-top:8px"><thead><tr><th>ลำดับ</th><th class="l">ชื่อ-นามสกุล</th><th>ชั้น</th><th>เลขที่</th><th>คะแนนที่ได้</th><th>คิดเป็น %</th><th>เวลาส่ง</th></tr></thead><tbody>${subs.map((s, idx) => `<tr><td>${idx + 1}</td><td class="l"><b>${esc(s.studentName)}</b></td><td>${esc(s.studentClass)}</td><td>${esc(s.studentNo || '-')}</td><td><b>${fmt(s.score)} / ${fmt(s.totalScore)}</b></td><td>${s.percent}%</td><td>${esc(fmtDate(s.submittedAt))}</td></tr>`).join('')}</tbody></table>`
      : `<div style="color:var(--muted);padding:10px 0">ยังไม่มีนักเรียนส่งคำตอบ — ส่งลิงก์ด้านบนให้นักเรียน หรือทดลองทำข้อสอบด้านล่างได้เลย</div>`;

    const previewItems = qs.map((q, idx) => {
      const figHtml = renderFig(q.figure);
      if (q.type === 'mc' || q.type === 'tf') {
        return `<div class="oq-card" data-qid="${esc(q.id)}">
          <div class="oq-q"><span class="oq-no">ข้อที่ ${idx + 1}</span> (${fmt(q.score)} คะแนน)${q.indicator ? ` <span class="chip">${esc(q.indicator)}</span>` : ''}<div style="margin-top:4px;font-weight:600">${nl(q.question)}</div></div>
          ${figHtml}
          <div class="oq-choices">${(q.choices || []).map((c, ci) => `<label class="oq-choice"><input type="radio" name="oq_${esc(q.id)}" value="${ci}"><span><b>${q.type === 'mc' ? LET[ci] + '.' : ''}</b> ${nl(c)}</span></label>`).join('')}</div>
          <div class="oq-feedback hidden" id="fb_${esc(q.id)}"></div>
        </div>`;
      }
      return `<div class="oq-card" data-qid="${esc(q.id)}">
        <div class="oq-q"><span class="oq-no">ข้อที่ ${idx + 1}</span> (${fmt(q.score)} คะแนน)<div style="margin-top:4px;font-weight:600">${nl(q.question)}</div></div>
        ${figHtml}
        <input type="text" class="oq-input" name="oq_${esc(q.id)}" placeholder="พิมพ์คำตอบของคุณ…">
        <div class="oq-feedback hidden" id="fb_${esc(q.id)}"></div>
      </div>`;
    }).join('');

    pane.innerHTML = `
      <div class="online-box">
        <div class="online-header">
          <div>
            <h3 style="margin:0;color:#1e293b">🌐 ระบบข้อสอบออนไลน์พร้อมรูปประกอบ (Interactive Online Exam)</h3>
            <p class="sub" style="margin:4px 0 0">แปลงจากชุดข้อสอบนี้โดยตรง แสดงโจทย์และรูปภาพ/แผนภาพ SVG เหมือนกระดาษข้อสอบทุกประการ พร้อมตรวจให้คะแนนทันที</p>
          </div>
          <div class="row">
            <button type="button" class="ghost small" id="btnSyncOnline">↻ อัปเดตข้อสอบออนไลน์ตามที่แก้ล่าสุด</button>
            <a class="btn-online-open" href="online-exam.php?id=${encodeURIComponent(ex.id)}" target="_blank">🚀 เปิดหน้าข้อสอบสำหรับนักเรียน</a>
          </div>
        </div>

        <div class="online-share-bar">
          <span style="font-weight:600;font-size:13px">🔗 ลิงก์ส่งให้นักเรียนทำข้อสอบ:</span>
          <input type="text" id="onlineUrlInput" readonly value="${esc(fullUrl)}" style="flex:1;min-width:240px;background:#fff;padding:6px 10px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px">
          <button type="button" class="small" id="btnCopyOnlineUrl">📋 คัดลอกลิงก์</button>
          <span id="copyOnlineMsg" style="font-size:12px;color:#15803d;font-weight:600"></span>
        </div>

        <div class="online-section">
          <div class="row" style="justify-content:space-between">
            <strong>📊 ผลคะแนนนักเรียนที่ส่งคำตอบแล้ว (${subs.length} คน)</strong>
            <button type="button" class="ghost small" id="btnRefreshSubs">↻ รีเฟรชผลคะแนน</button>
          </div>
          <div id="onlineSubsWrap">${subsHtml}</div>
        </div>

        <div class="online-section">
          <h3 style="margin:0 0 8px">📝 ทดลองทำข้อสอบออนไลน์ (มุมมองนักเรียน · ${qs.length} ข้อ · ${fmt(ex.totalScore)} คะแนน)</h3>
          <div class="grid" style="margin-bottom:12px;background:#f8fafc;padding:12px;border-radius:10px;border:1px solid #e2e8f0">
            <label class="f">ชื่อ-นามสกุลผู้เข้าสอบ<input type="text" id="simStudentName" value="นักเรียนตัวอย่าง ทดลองสอบ" placeholder="ระบุชื่อ-นามสกุล"></label>
            <label class="f">ชั้นเรียน<input type="text" id="simStudentClass" value="${esc(ex.grade || 'ม.4')}"></label>
            <label class="f">เลขที่<input type="text" id="simStudentNo" value="1"></label>
          </div>
          <div id="onlineSimResult" class="hidden"></div>
          <div id="onlinePreviewList">${previewItems}</div>
          <div class="row" style="margin-top:14px;justify-content:center">
            <button type="button" class="big" id="btnSubmitSimExam">✅ ส่งกระดาษคำตอบและตรวจคะแนนทันที</button>
          </div>
        </div>
      </div>
    `;

    typeset(pane);

    const copyBtn = $('btnCopyOnlineUrl');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const inp = $('onlineUrlInput');
        if (inp) {
          inp.select();
          if (navigator.clipboard) navigator.clipboard.writeText(inp.value).catch(() => {});
          $('copyOnlineMsg').textContent = 'คัดลอกลิงก์เรียบร้อย!';
          setTimeout(() => { if ($('copyOnlineMsg')) $('copyOnlineMsg').textContent = ''; }, 2500);
        }
      });
    }

    const syncBtn = $('btnSyncOnline');
    if (syncBtn) syncBtn.addEventListener('click', publishOnlineExam);

    const refreshBtn = $('btnRefreshSubs');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        try {
          const r = await api('api/online_exam.php', { action: 'get', id: ex.id });
          st.onlineExam = r.exam;
          drawOnlinePane();
        } catch (e) {
          showError(e.message);
        }
      });
    }

    const submitBtn = $('btnSubmitSimExam');
    if (submitBtn) {
      submitBtn.addEventListener('click', async () => {
        const answers = {};
        qs.forEach((q) => {
          if (q.type === 'mc' || q.type === 'tf') {
            const checked = pane.querySelector(`input[name="oq_${q.id}"]:checked`);
            if (checked) answers[q.id] = Number(checked.value);
          } else {
            const inp = pane.querySelector(`input[name="oq_${q.id}"]`);
            if (inp) answers[q.id] = inp.value;
          }
        });
        submitBtn.disabled = true;
        submitBtn.textContent = 'กำลังตรวจคำตอบ…';
        try {
          const res = await api('api/online_exam.php', {
            action: 'submit',
            id: ex.id,
            studentName: $('simStudentName').value.trim() || 'นักเรียนตัวอย่าง',
            studentClass: $('simStudentClass').value.trim(),
            studentNo: $('simStudentNo').value.trim(),
            answers,
            durationSec: 120,
          });
          const sub = res.submission;
          const resBanner = $('onlineSimResult');
          resBanner.classList.remove('hidden');
          resBanner.className = 'online-score-banner';
          resBanner.innerHTML = `🎉 <b>ส่งคำตอบเรียบร้อย!</b> ผู้สอบ: ${esc(sub.studentName)} · ได้คะแนน <b>${fmt(sub.score)} / ${fmt(sub.totalScore)} คะแนน (${sub.percent}%)</b> · ตอบถูก ${sub.correctCount}/${sub.totalItems} ข้อ`;

          (res.results || []).forEach((r) => {
            const fb = document.getElementById(`fb_${r.id}`);
            if (!fb) return;
            fb.classList.remove('hidden');
            fb.className = `oq-feedback ${r.isCorrect ? 'ok' : 'wrong'}`;
            const corrLabel = typeof r.correctAnswer === 'number' ? LET[r.correctAnswer] : r.correctAnswer;
            fb.innerHTML = `${r.isCorrect ? '✅ <b>ถูกต้อง!</b> (+' + fmt(r.score) + ' คะแนน)' : '❌ <b>ยังไม่ถูกต้อง</b> (คำตอบที่ถูกคือ ข้อ ' + esc(String(corrLabel)) + ')'}${r.explain ? `<div style="margin-top:3px;font-size:12px">${nl(r.explain)}</div>` : ''}`;
          });

          // Refresh submission table
          const updated = await api('api/online_exam.php', { action: 'get', id: ex.id });
          st.onlineExam = updated.exam;
          resBanner.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch (err) {
          showError(err.message);
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = '✅ ส่งกระดาษคำตอบและตรวจคะแนนทันที';
        }
      });
    }
  }

  /* ----------------------------- แสดงผล ----------------------------- */
  function typeset(el) {
    if (typeof window.renderMathInElement !== 'function') return;
    try {
      window.renderMathInElement(el, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }, { left: '\\(', right: '\\)', display: false }], throwOnError: false });
    } catch {}
  }
  function renderPane(t) {
    if (!st.doc) return;
    if (t === 'analysis') renderAnalysis();
    else if (t === 'edit') renderEdit();
    else if (t === 'online') publishOnlineExam();
    else {
      const f = t === 'paper' ? paperHtml : t === 'sheet' ? sheetHtml : keyHtml;
      const empty = PARTS.some((p) => st.doc.parts[p] && st.doc.parts[p].items.some((it) => it.source === 'none'));
      $('pane-' + t).innerHTML = (empty ? '<div class="xwarn no-print">มีข้อที่ยังไม่มีเนื้อหา กลับไปแท็บ “แก้ไขข้อสอบ” กด “สร้างข้อใหม่” หรือพิมพ์เอง</div>' : '') + Array.from({ length: versions() }, (_, vi) => f(st.doc, vi)).join('');
    }
    typeset($('pane-' + t));
  }
  function setTab(t) {
    st.tab = t;
    document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.t === t));
    document.querySelectorAll('.tabpane').forEach((p) => p.classList.toggle('on', p.id === 'pane-' + t));
    const multi = ['paper', 'sheet', 'key'].includes(t) && versions() > 1;
    $('verBar').classList.toggle('hidden', !multi);
    renderPane(t);
  }
  function renderVerBtns() {
    $('verBtns').innerHTML = Array.from({ length: versions() }, (_, i) => `<button class="ghost small${i === st.ver ? ' on' : ''}" data-ver="${i}">ชุด ${VNAME[i]}</button>`).join('');
  }
  $('verBtns').addEventListener('click', (e) => {
    const b = e.target.closest('[data-ver]');
    if (!b) return;
    st.ver = Number(b.dataset.ver);
    renderVerBtns();
    document.querySelectorAll('#pane-' + st.tab + ' .xpaper').forEach((p) => p.classList.toggle('off', Number(p.dataset.v) !== st.ver));
  });
  $('tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-t]');
    if (b) setTab(b.dataset.t);
  });
  $('btnPrint').addEventListener('click', () => window.print());
  ['title', 'school', 'year', 'minutes', 'kind', 'term', 'versions', 'paperCols'].forEach((k) => {
    const el = $(k);
    if (!el) return;
    el.addEventListener('change', () => {
      if (!st.doc) return;
      syncMeta();
      st.ver = Math.min(st.ver, versions() - 1);
      renderVerBtns();
      setTab(st.tab);
    });
  });

  function showResult(doc, stats, warnings) {
    st.doc = doc;
    st.ver = 0;
    $('resBox').classList.remove('hidden');
    const isCloud = stats && (stats.isCloudAi || (stats.model && stats.model !== 'curriculum-engine'));
    const modelBadge = isCloud
      ? ` · ⚡ โมเดล AI: OpenAI GPT (Cloud AI คิดวิเคราะห์สด)`
      : ` · 📦 ระบบ: คลังตัวชี้วัดหลักสูตรแกนกลางอัจฉริยะ (Offline Engine)`;
    $('stats').textContent = stats ? `ได้ข้อสอบ ${itemCount(doc)} ข้อ: จากคลัง ${stats.bank} · AI สร้าง ${stats.ai}${stats.missing ? ' · ยังขาด ' + stats.missing : ''} · คะแนนเต็ม ${fmt(totalScore(doc))}${modelBadge}` : `${itemCount(doc)} ข้อ · คะแนนเต็ม ${fmt(totalScore(doc))}${modelBadge}`;
    $('warns').classList.toggle('hidden', !(warnings && warnings.length));
    $('warns').innerHTML = (warnings || []).length ? '<b>📌 ข้อมูลและคำแนะนำจากระบบ:</b><br>' + warnings.map((w) => '• ' + esc(w)).join('<br>') : '';
    renderVerBtns();
    setTab('analysis');
    $('resBox').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ----------------------- จัดการ AI Key & สถานะ ----------------------- */
  let aiConnected = false;
  async function initAiStatus() {
    try {
      const r = await api('api/exam.php', { action: 'check_ai' });
      aiConnected = Boolean(r.connected);
      if ($('aiConnStatus')) {
        if (aiConnected) {
          $('aiConnStatus').innerHTML = '🟢 เชื่อมต่อ Cloud AI สำเร็จ';
          $('aiConnStatus').style.background = '#dcfce7';
          $('aiConnStatus').style.color = '#15803d';
          if ($('openaiKeyInput') && r.maskedKey) $('openaiKeyInput').value = r.maskedKey;
        } else {
          $('aiConnStatus').innerHTML = '🟡 ยังไม่ได้เชื่อมต่อ API Key (ใช้คลังหลักสูตรออฟไลน์)';
          $('aiConnStatus').style.background = '#fef3c7';
          $('aiConnStatus').style.color = '#92400e';
        }
      }
    } catch (_) {}
  }
  if ($('btnToggleKeyBox')) {
    $('btnToggleKeyBox').addEventListener('click', () => {
      $('aiKeyBox').classList.toggle('hidden');
    });
  }
  if ($('btnSaveOpenaiKey')) {
    $('btnSaveOpenaiKey').addEventListener('click', async () => {
      const key = $('openaiKeyInput').value.trim();
      if (!key) {
        $('keyMsg').innerHTML = '<span style="color:#b91c1c">กรุณากรอก API Key</span>';
        return;
      }
      $('btnSaveOpenaiKey').disabled = true;
      $('keyMsg').textContent = 'กำลังบันทึก…';
      try {
        const r = await api('api/exam.php', { action: 'set_openai_key', key });
        if (r.ok) {
          $('keyMsg').innerHTML = '<span style="color:#15803d;font-weight:600">✔ บันทึกและเชื่อมต่อ GPT สำเร็จแล้ว</span>';
          initAiStatus();
          setTimeout(() => { $('aiKeyBox').classList.add('hidden'); $('keyMsg').textContent = ''; }, 2000);
        }
      } catch (err) {
        $('keyMsg').innerHTML = `<span style="color:#b91c1c">${esc(err.message)}</span>`;
      } finally {
        $('btnSaveOpenaiKey').disabled = false;
      }
    });
  }

  /* ----------------------- เรียก API: วางแผน / สร้าง ----------------------- */
  $('btnPlan').addEventListener('click', async () => {
    showError('');
    $('btnPlan').disabled = true;
    try {
      const r = await api('api/exam.php', Object.assign({ action: 'plan' }, request()));
      const bank = Object.entries(r.bank).map(([p, b]) => `${PLABEL[p]}: มีในคลัง ${b.fromBank}/${b.need} ข้อ${b.need - b.fromBank ? ` → AI สร้าง ${b.need - b.fromBank}` : ''}`).join(' · ');
      $('planNote').innerHTML = `<b>ตารางวิเคราะห์ตามที่ตั้งไว้</b>${analysisTable(r.analysis)}<div style="margin-top:6px">${$('useBank').checked ? esc(bank) : 'ไม่ใช้คลังข้อสอบ: AI สร้างทุกข้อ'}</div>`;
    } catch (e) {
      showError(e.message);
    } finally {
      $('btnPlan').disabled = false;
    }
  });

  $('btnGen').addEventListener('click', async () => {
    showError('');
    const total = Object.values(partsCfg()).reduce((s, c) => s + c.count, 0);
    if (!total) {
      showError('ตั้งจำนวนข้ออย่างน้อย 1 ส่วน');
      return;
    }
    $('btnGen').disabled = true;

    // Progressive step updates
    let stepTimer = null;
    const steps = aiConnected ? [
      '🧠 กำลังส่งคำขอไปยัง OpenAI GPT…',
      '🔬 GPT กำลังคิดวิเคราะห์โจทย์สถานการณ์ HOTS ตามตัวชี้วัด…',
      '📐 กำลังออกแบบตัวลวงคุณภาพและเขียนเทคนิคพิชิตคะแนน…',
      '🎨 กำลังประกอบชุดข้อสอบและตรวจสอบความสมดุลของเฉลย…',
    ] : [
      '📦 กำลังคัดกรองตัวชี้วัดและสังเคราะห์โจทย์คลังข้อสอบอัจฉริยะ…',
      '📐 กำลังวิเคราะห์สัดส่วนความยากและสร้างคำอธิบายวิธีคิด…',
      '🎨 กำลังประกอบชุดข้อสอบและสร้างแผนภาพประกอบ…',
    ];
    let stepIdx = 0;
    $('genNote').textContent = steps[0];
    stepTimer = setInterval(() => {
      stepIdx++;
      if (stepIdx < steps.length) {
        $('genNote').textContent = steps[stepIdx];
      }
    }, aiConnected ? 1500 : 700);

    const run = window.WS.stoppable($('btnStop'));
    try {
      const body = request();
      const startTime = Date.now();
      const r = await api('api/exam.php', Object.assign({ action: 'generate' }, body), true, run.signal);
      const elapsed = Date.now() - startTime;
      if (!aiConnected && elapsed < 1400) {
        await new Promise((res) => setTimeout(res, 1400 - elapsed));
      }

      const title = $('title').value.trim() || `ข้อสอบ${$('kind').value} ${body.subject} ${body.grade}`;
      const doc = {
        title, school: $('school').value.trim(), kind: body.kind, grade: body.grade, subject: body.subject, term: body.term, year: $('year').value.trim(),
        minutes: Number($('minutes').value) || 0, versions: Number($('versions').value) || 1, seed: 1 + Math.floor(Math.random() * 2147483000),
        indicators: r.indicators || [], parts: r.parts,
      };
      st.id = '';
      clearInterval(stepTimer);
      $('genNote').textContent = '';
      showResult(doc, r.stats, r.warnings);
    } catch (e) {
      clearInterval(stepTimer);
      if (e.code === 'ABORT') {
        $('genNote').textContent = 'หยุดแล้ว (ข้อสอบเดิมที่แสดงอยู่ไม่เปลี่ยน) ปรับค่าแล้วกด “สร้างข้อสอบ” ใหม่ได้';
      } else {
        $('genNote').textContent = '';
        showError(e.message);
      }
    } finally {
      clearInterval(stepTimer);
      run.done();
      $('btnGen').disabled = false;
    }
  });

  /* ------------------------- บันทึก / เปิดที่บันทึกไว้ ------------------------- */
  function syncMeta() {
    const d = st.doc;
    d.title = $('title').value.trim() || d.title;
    d.school = $('school').value.trim();
    d.year = $('year').value.trim();
    d.minutes = Number($('minutes').value) || 0;
    d.versions = Number($('versions').value) || 1;
    d.kind = $('kind').value;
    d.term = $('term').value;
    d.paperCols = $('paperCols') ? $('paperCols').value : '2';
  }
  $('btnSave').addEventListener('click', async () => {
    if (!st.doc) return;
    showError('');
    syncMeta();
    $('btnSave').disabled = true;
    try {
      const d = st.doc;
      const r = await api('api/exam.php', Object.assign({ action: 'save', id: st.id, addToBank: $('addBank').checked }, d));
      st.id = r.id;
      $('saveNote').textContent = 'บันทึกแล้ว' + (r.addedToBank ? ` · เพิ่มเข้าคลังข้อสอบ ${r.addedToBank} ข้อ` : '');
      loadSaved();
    } catch (e) {
      showError(e.message);
    } finally {
      $('btnSave').disabled = false;
    }
  });
  async function loadSaved() {
    try {
      const r = await api('api/exam.php', { action: 'list' });
      $('saved').innerHTML = r.items.length
        ? r.items.map((i) => `<div class="row" style="justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee"><span>${esc(i.title)} <span style="color:var(--muted);font-size:12px">${esc(i.grade)} ${esc(i.subject)} · ${i.items} ข้อ · ${esc(fmtDate(i.savedAt))}</span></span><span class="row"><button class="ghost small" data-open="${esc(i.id)}">เปิด</button>${window.TA_EMBEDDED ? `<button class="ghost small" data-send="${esc(i.id)}" data-title="${esc(i.title)}">🚀 ยิงเข้าคอร์ส</button><button class="ghost small" data-room="${esc(i.id)}" data-title="${esc(i.title)}">📡 เปิดห้องสด</button>${i.worksheetId ? `<a class="ghost small btnlink" href="results.php?ws=${Number(i.worksheetId)}">📊 ผลสอบ</a>` : ''}` : ''}<button class="ghost small" data-rm="${esc(i.id)}">ลบ</button></span></div>`).join('')
        : '<span style="color:var(--muted)">ยังไม่มีข้อสอบที่บันทึก</span>';
    } catch (e) {
      showError(e.message);
    }
  }
  $('saved').addEventListener('click', async (e) => {
    const o = e.target.closest('[data-open]');
    const d = e.target.closest('[data-rm]');
    const snd = e.target.closest('[data-send]');
    const rm = e.target.closest('[data-room]');
    if (rm && window.LiveSend) { window.LiveSend.openRoom(rm.dataset.room, rm.dataset.title); return; }
    if (snd && window.LmsSend) { window.LmsSend.openExam(snd.dataset.send, snd.dataset.title); return; }
    try {
      if (o) {
        const doc = (await api('api/exam.php', { action: 'get', id: o.dataset.open })).data;
        st.id = doc.id;
        if (GRADES.includes(doc.grade)) $('grade').value = doc.grade;
        fillSubjects();
        $('subject').value = doc.subject;
        ['school', 'title', 'year', 'minutes', 'term', 'kind'].forEach((k) => { if (doc[k] !== undefined && doc[k] !== '') $(k).value = doc[k]; });
        $('versions').value = String(doc.versions || 1);
        for (const p of PARTS) {
          const tr = document.querySelector(`#partsTbl tr[data-p="${p}"]`);
          const part = doc.parts[p];
          tr.querySelector('[data-f=count]').value = part ? part.items.length : 0;
          if (part) tr.querySelector('[data-f=score]').value = part.score;
        }
        updateTotals();
        await loadIndicators((doc.indicators || []).map((i) => i.code));
        showResult(doc, null, []);
      }
      if (d && window.confirm('ลบข้อสอบนี้?')) {
        await api('api/exam.php', { action: 'delete', id: d.dataset.rm });
        loadSaved();
      }
    } catch (er) {
      showError(er.message);
    }
  });

  /* ------------------------------- เริ่มต้น ------------------------------- */
  (async () => {
    const q = new URLSearchParams(location.search);
    if (q.get('grade') && GRADES.includes(q.get('grade'))) $('grade').value = q.get('grade');
    fillSubjects();
    if (q.get('subject')) $('subject').value = q.get('subject');
    if (q.get('term')) $('term').value = q.get('term');
    await onSubjectChange(q.get('ind') ? q.get('ind').split(',') : null);

    const diagId = q.get('useDiagram');
    if (diagId) {
      const diagTitle = sessionStorage.getItem('INJECTED_DIAGRAM_TITLE') || diagId;
      const diagPrompt = sessionStorage.getItem('INJECTED_DIAGRAM_PROMPT') || '';
      if ($('hint')) {
        $('hint').value = `ออกข้อสอบที่อ้างอิงแผนภาพ "${diagTitle}"` + (diagPrompt ? ` (${diagPrompt})` : '');
      }
      if ($('figMode')) {
        $('figMode').value = 'smart';
      }
      if ($('scope') && !$('scope').value.trim()) {
        $('scope').value = `การศึกษาโครงสร้างและหน้าที่ของ ${diagTitle}`;
      }
    }

    loadSaved();
    initAiStatus();
  })();
})();
