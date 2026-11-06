(() => {
  'use strict';
  const { esc, api, showError, GRADES, fmtDate, providers } = window.WS;
  const $ = (id) => document.getElementById(id);
  const CUR = window.CURRICULUM || {};
  const TL = window.SHEET_TYPE_LABELS || {};
  const KIND = { lesson: 'สอน', review: 'ทบทวน', exam: 'สอบ' };
  const st = { rows: [], id: '', grade: '', subject: '', inds: [] };

  $('grade').innerHTML = GRADES.map((g) => `<option${g === 'ป.4' ? ' selected' : ''}>${g}</option>`).join('');
  function fillSubjects() {
    const subs = Object.keys(CUR[$('grade').value] || {});
    $('subject').innerHTML = subs.map((s) => `<option>${esc(s)}</option>`).join('');
    unitNote();
  }
  function units() {
    const t = $('term').value;
    return ((CUR[$('grade').value] || {})[$('subject').value] || []).filter((u) => !t || String(u[0]) === t).map((u) => u[1]);
  }
  function unitNote() {
    const u = units();
    $('unitNote').textContent = u.length ? `หน่วยที่ใช้ร่างแผน (${u.length}): ${u.join(' · ')}` : 'ไม่มีรายชื่อหน่วยของชั้น/วิชานี้ในระบบ AI จะร่างจากตัวชี้วัด/หลักสูตรทั่วไป';
  }
  $('grade').addEventListener('change', fillSubjects);
  $('subject').addEventListener('change', unitNote);
  $('term').addEventListener('change', unitNote);
  fillSubjects();

  function link(r) {
    const p = new URLSearchParams({ grade: st.grade, subject: st.subject, topic: r.topic, type: r.sheetType });
    if (st.term) p.set('term', st.term);
    if (r.indicatorCodes.length) p.set('ind', r.indicatorCodes.join(','));
    return 'index.php?' + p.toString();
  }
  function lpLink(r) {
    const p = new URLSearchParams({ grade: st.grade, subject: st.subject, topic: r.topic, unit: r.unit || '' });
    if (st.term) p.set('term', st.term);
    if (r.indicatorCodes.length) p.set('ind', r.indicatorCodes.join(','));
    return 'lplan.php?' + p.toString();
  }
  function renderCov() {
    if (!st.inds.length) { $('cov').textContent = ''; return; }
    const used = new Set(st.rows.flatMap((r) => r.indicatorCodes));
    const miss = st.inds.filter((i) => !used.has(i.code));
    $('cov').innerHTML = `🎯 ตัวชี้วัดที่ครอบคลุม <b>${st.inds.length - miss.length}/${st.inds.length}</b>` + (miss.length ? ` <span style="color:var(--muted)">ยังไม่ครอบคลุม: ${miss.map((i) => esc(i.code)).join(', ')}</span>` : '');
  }
  function render() {
    $('planBox').classList.toggle('hidden', !st.rows.length);
    const typeOpts = (v) => Object.entries(TL).map(([k, l]) => `<option value="${k}"${k === v ? ' selected' : ''}>${esc(l)}</option>`).join('');
    const kindOpts = (v) => Object.entries(KIND).map(([k, l]) => `<option value="${k}"${k === v ? ' selected' : ''}>${l}</option>`).join('');
    $('tbl').tBodies[0].innerHTML = st.rows.map((r, i) => `<tr data-i="${i}">
      <td style="width:60px"><input type="number" data-f="week" value="${r.week}" style="width:54px"></td>
      <td><input type="text" data-f="unit" value="${esc(r.unit)}"></td>
      <td><input type="text" data-f="topic" value="${esc(r.topic)}"></td>
      <td><select data-f="kind">${kindOpts(r.kind)}</select></td>
      <td><select data-f="sheetType">${typeOpts(r.sheetType)}</select></td>
      <td><input type="text" data-f="indicatorCodes" value="${esc(r.indicatorCodes.join(', '))}" placeholder="รหัสคั่นด้วยจุลภาค"></td>
      <td><input type="text" data-f="note" value="${esc(r.note)}"></td>
      <td class="no-print" style="white-space:nowrap"><a class="btnlink" href="${esc(lpLink(r))}" title="ร่างแผนการจัดการเรียนรู้ของสัปดาห์นี้">แผนการสอน</a> <a class="btnlink" href="${esc(link(r))}">สร้างใบงาน</a> <button class="ghost small" data-del="${i}" title="ลบแถว">✕</button></td></tr>`).join('');
    renderCov();
  }
  $('tbl').addEventListener('change', (e) => {
    const tr = e.target.closest('tr[data-i]');
    const f = e.target.dataset.f;
    if (!tr || !f) return;
    const r = st.rows[Number(tr.dataset.i)];
    r[f] = f === 'week' ? Number(e.target.value) || r.week : f === 'indicatorCodes' ? e.target.value.split(/[,،]/).map((x) => x.trim()).filter(Boolean) : e.target.value;
    render();
  });
  $('tbl').addEventListener('click', (e) => {
    const d = e.target.closest('[data-del]');
    if (d) { st.rows.splice(Number(d.dataset.del), 1); render(); }
  });
  $('addRow').addEventListener('click', () => {
    st.rows.push({ week: st.rows.length + 1, unit: '', topic: '', kind: 'lesson', sheetType: 'multiple_choice', indicatorCodes: [], note: '' });
    render();
  });
  $('print').addEventListener('click', () => window.print());

  $('gen').addEventListener('click', async () => {
    $('gen').disabled = true;
    $('genNote').textContent = 'AI กำลังร่างแผน…';
    showError('');
    const run = window.WS.stoppable($('stopGen'));
    try {
      const grade = $('grade').value, subject = $('subject').value;
      const r = await api('api/term.php', { action: 'generate', grade, subject, weeks: Number($('weeks').value), reviewWeeks: Number($('review').value), examWeeks: Number($('exam').value), units: units(), hint: $('hint').value }, true, run.signal);
      Object.assign(st, { rows: r.rows, grade, subject, inds: r.indicators || [], id: '', term: $('term').value });
      $('title').value = `แผนการสอน ${subject} ${grade}`;
      $('genNote').textContent = `ร่างแล้ว ${r.rows.length} สัปดาห์ ตรวจและแก้ไขได้ในตาราง`;
      render();
    } catch (e) {
      if (e.code === 'ABORT') {
        $('genNote').textContent = 'หยุดแล้ว (แผนเดิมที่แสดงอยู่ไม่เปลี่ยน) กดร่างใหม่ได้เลย';
      } else {
        $('genNote').textContent = '';
        showError(e.message);
      }
    } finally {
      run.done();
      $('gen').disabled = false;
    }
  });
  $('save').addEventListener('click', async () => {
    try {
      const r = await api('api/term.php', { action: 'save', id: st.id, title: $('title').value, grade: st.grade, subject: st.subject, term: st.term, rows: st.rows });
      st.id = r.id;
      $('saveNote').textContent = 'บันทึกแล้ว';
      loadSaved();
    } catch (e) {
      showError(e.message);
    }
  });
  async function loadSaved() {
    try {
      const r = await api('api/term.php', { action: 'list' });
      $('saved').innerHTML = r.items.length
        ? r.items.map((i) => `<div class="row" style="justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee"><span>${esc(i.title)} <span style="color:var(--muted);font-size:12px">${esc(i.grade)} ${esc(i.subject)} · ${i.weeks} สัปดาห์ · ${esc(fmtDate(i.savedAt))}</span></span><span class="row"><button class="ghost small" data-open="${esc(i.id)}">เปิด</button><button class="ghost small" data-rm="${esc(i.id)}">ลบ</button></span></div>`).join('')
        : '<span style="color:var(--muted)">ยังไม่มีแผนที่บันทึก</span>';
    } catch (e) {
      showError(e.message);
    }
  }
  $('saved').addEventListener('click', async (e) => {
    const o = e.target.closest('[data-open]'), d = e.target.closest('[data-rm]');
    try {
      if (o) {
        const r = (await api('api/term.php', { action: 'get', id: o.dataset.open })).data;
        Object.assign(st, { rows: r.rows, grade: r.grade, subject: r.subject, id: r.id, inds: [], term: r.term || '' });
        $('title').value = r.title;
        if (GRADES.includes(r.grade)) { $('grade').value = r.grade; fillSubjects(); $('subject').value = r.subject; }
        try {
          st.inds = (await api('api/curriculum.php', { action: 'for_grade', grade: r.grade, subject: r.subject })).indicators || [];
        } catch {}
        render();
        window.scrollTo({ top: $('planBox').offsetTop - 10, behavior: 'smooth' });
      }
      if (d && window.confirm('ลบแผนนี้?')) {
        await api('api/term.php', { action: 'delete', id: d.dataset.rm });
        loadSaved();
      }
    } catch (er) {
      showError(er.message);
    }
  });
  loadSaved();
})();
