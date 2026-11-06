(() => {
  'use strict';
  const { esc, api, showError, GRADES } = window.WS;
  const $ = (id) => document.getElementById(id);
  const LV = { 1: 'ง่าย', 2: 'ปานกลาง', 3: 'ยาก', 4: 'ยากมาก' };
  const TL = window.SHEET_TYPE_LABELS || {};
  const state = { items: [], total: 0, sel: new Set(), offset: 0, all: 0 };
  const PAGE = 60;

  function filters() {
    return { grade: $('fGrade').value, subject: $('fSubject').value, type: $('fType').value, level: Number($('fLevel').value) || 0, term: $('fTerm').value, q: $('q').value, indicator: $('fInd').value };
  }
  function answerOf(it) {
    if (Array.isArray(it.choices) && Number.isInteger(it.answerIndex)) return 'เฉลย: ' + (it.choices[it.answerIndex] ?? '');
    if (it.answer !== undefined && it.answer !== '') return 'เฉลย: ' + (typeof it.answer === 'object' ? JSON.stringify(it.answer) : it.answer);
    if (it.answerValue !== undefined) return 'เฉลย: ' + it.answerValue;
    if (it.right) return 'คู่: ' + it.right;
    return '';
  }
  function row(e) {
    const it = e.item || {};
    const choices = Array.isArray(it.choices) ? `<div style="color:var(--muted);font-size:13px">${it.choices.map((c, i) => 'กขคง'[i] + '. ' + esc(c)).join(' &nbsp; ')}</div>` : '';
    return `<label class="doc-row" style="align-items:flex-start;gap:10px"><input type="checkbox" data-id="${esc(e.id)}"${state.sel.has(e.id) ? ' checked' : ''} style="margin-top:4px">
      ${window.TA_EMBEDDED ? `<button type="button" class="ghost small" data-pulse="${esc(e.id)}" title="ยิงข้อนี้เข้าห้องสด">📡</button>` : ''}
      <span style="flex:1"><span>${esc(e.text)}</span>${choices}<div style="color:var(--muted);font-size:12px;margin-top:2px">${esc(answerOf(it))}</div>
      <div style="margin-top:3px;font-size:12px">${[e.grade, e.subject, TL[e.type] || e.type, e.term ? 'ภาคเรียน ' + e.term : '', e.level ? 'ระดับ' + LV[e.level] : '', e.indicator, e.topic].filter(Boolean).map((x) => `<span class="chip">${esc(x)}</span>`).join(' ')}</div></span></label>`;
  }
  function paint() {
    $('count').textContent = `(${state.total} ข้อที่ตรงเงื่อนไข จากทั้งหมด ${state.all})`;
    $('list').innerHTML = state.items.length ? state.items.map(row).join('') : '<div style="color:var(--muted)">ยังไม่มีข้อสอบ — ไปที่ “คลังใบงาน” เลือกชุดแล้วกด “เก็บเข้าคลังข้อสอบ”</div>';
    $('more').classList.toggle('hidden', state.items.length >= state.total);
    syncBulk();
  }
  function syncBulk() {
    $('bulk').classList.toggle('hidden', !state.sel.size);
    $('bulkInfo').textContent = `เลือก ${state.sel.size} ข้อ`;
  }
  function fillFacets(f) {
    const keep = { g: $('fGrade').value, s: $('fSubject').value };
    $('fGrade').innerHTML = '<option value="">ทุกชั้น</option>' + GRADES.filter((g) => f.grades[g]).map((g) => `<option${g === keep.g ? ' selected' : ''}>${esc(g)}</option>`).join('');
    $('fSubject').innerHTML = '<option value="">ทุกวิชา</option>' + Object.keys(f.subjects).filter(Boolean).sort().map((s) => `<option${s === keep.s ? ' selected' : ''}>${esc(s)}</option>`).join('');
  }
  async function load(more) {
    try {
      showError('');
      if (!more) state.offset = 0;
      const r = await api('api/bank.php', Object.assign({ action: 'list', limit: PAGE, offset: state.offset }, filters()));
      state.items = more ? state.items.concat(r.items) : r.items;
      state.total = r.total;
      state.all = r.all;
      state.offset = state.items.length;
      if (!more) fillFacets(r.facets);
      paint();
    } catch (e) {
      showError(e.message);
    }
  }
  let t;
  const reload = () => { clearTimeout(t); t = setTimeout(() => load(false), 250); };
  for (const id of ['q', 'fInd']) $(id).addEventListener('input', reload);
  for (const id of ['fGrade', 'fSubject', 'fType', 'fLevel', 'fTerm']) $(id).addEventListener('change', () => load(false));
  $('more').addEventListener('click', () => load(true));
  $('list').addEventListener('click', (e) => {
    const b = e.target.closest('[data-pulse]');
    if (!b) return;
    e.preventDefault();
    if (window.LiveSend) window.LiveSend.pulse(b.dataset.pulse);
  });
  $('list').addEventListener('change', (e) => {
    const c = e.target.closest('[data-id]');
    if (!c) return;
    c.checked ? state.sel.add(c.dataset.id) : state.sel.delete(c.dataset.id);
    syncBulk();
  });
  $('selAll').addEventListener('change', (e) => {
    for (const it of state.items) e.target.checked ? state.sel.add(it.id) : state.sel.delete(it.id);
    paint();
  });
  $('compose').addEventListener('click', async () => {
    try {
      const r = await api('api/bank.php', { action: 'compose', ids: [...state.sel], title: $('cTitle').value });
      location.href = 'index.php?open=' + encodeURIComponent(r.id);
    } catch (e) {
      showError(e.message);
    }
  });
  $('del').addEventListener('click', async () => {
    if (!confirm(`ลบ ${state.sel.size} ข้อออกจากคลังข้อสอบ? (ชุดใบงานเดิมไม่ถูกลบ)`)) return;
    try {
      await api('api/bank.php', { action: 'delete', ids: [...state.sel] });
      state.sel.clear();
      load(false);
    } catch (e) {
      showError(e.message);
    }
  });
  load(false);
})();
