/* หน้าต่าง "ยิงเข้าคอร์ส": ส่งใบงานจากคลัง teacher-ai เข้า LMS ของ nextbeyond (เฉพาะตอนฝังใน nextbeyond) */
(() => {
  'use strict';
  const { esc, api } = window.WS;
  const TYPE_OPTS = [['worksheet', 'ใบงาน'], ['practice', 'แบบฝึกหัด'], ['homework', 'การบ้าน']];
  const EXAM_TYPE_OPTS = [['posttest', 'แบบทดสอบ'], ['mastery_check', 'เช็กความเข้าใจ'], ['practice', 'แบบฝึกหัด'], ['homework', 'การบ้าน']];
  let root = null;
  let st = null;

  function close() {
    if (root) root.remove();
    root = null;
    document.documentElement.classList.remove('lms-lock');
  }

  function shell(title) {
    close();
    root = document.createElement('div');
    root.className = 'lms-modal';
    root.innerHTML = `<div class="lms-scrim" data-close></div><div class="lms-panel" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="lms-head"><strong>${esc(title)}</strong><button type="button" class="ghost small" data-close aria-label="ปิด">✕</button></div>
      <div class="lms-body" id="lmsBody"><p class="help">กำลังโหลด…</p></div></div>`;
    document.body.appendChild(root);
    document.documentElement.classList.add('lms-lock');
    root.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
    document.addEventListener('keydown', function onKey(e) {
      if (!root) return document.removeEventListener('keydown', onKey);
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); }
    });
    return root.querySelector('#lmsBody');
  }

  const noteHtml = (notes) => (notes || []).map((n) => `<div class="lms-note">⚠ ${esc(n)}</div>`).join('');

  async function open(id, title) {
    const body = shell('ยิงเข้าคอร์ส');
    st = { id, sheets: [], courses: [], students: [], mode: 'all' };
    try {
      const [pv, tg] = await Promise.all([api('api/lms.php', { action: 'preview', id }), api('api/lms.php', { action: 'targets' })]);
      st.title = pv.title || title || '';
      st.sheets = pv.sheets;
      st.courses = tg.courses;
    } catch (e) {
      body.innerHTML = `<div class="error">${esc(e.message)}</div>`;
      return;
    }
    renderForm(body);
  }

  async function openExam(id, title) {
    const body = shell('ยิงข้อสอบเข้าคอร์ส');
    st = { id, exam: true, sheets: [], courses: [], students: [], mode: 'all' };
    try {
      const [pv, tg] = await Promise.all([api('api/lms.php', { action: 'exam_preview', id }), api('api/lms.php', { action: 'targets' })]);
      st.title = pv.title || title || '';
      st.sheets = [{ index: 0, topic: pv.title || title || 'ข้อสอบ', questions: pv.questions, total: pv.total, notes: pv.notes, published: pv.published }];
      st.courses = tg.courses;
    } catch (e) {
      body.innerHTML = `<div class="error">${esc(e.message)}</div>`;
      return;
    }
    renderForm(body);
  }

  function renderForm(body) {
    if (!st.sheets.length) { body.innerHTML = '<div class="warn">ชุดนี้ยังไม่มีใบงานที่สร้างสำเร็จ</div>'; return; }
    if (!st.courses.length) { body.innerHTML = '<div class="warn">ไม่พบคอร์สที่คุณมีสิทธิ์มอบหมายงาน (ตรวจที่เมนูคอร์สของ Admin)</div>'; return; }
    const sheetRows = st.sheets.map((s) => `<label class="lms-sheet${s.questions ? '' : ' off'}">
        <input type="checkbox" name="sh" value="${s.index}" ${s.questions ? 'checked' : 'disabled'}>
        <span><b>${st.exam ? 'ข้อสอบ' : 'ใบที่ ' + (s.index + 1)}</b> ${esc(s.topic)} <span class="help">· ส่งได้ ${s.questions}/${s.total} ข้อ${s.published ? ' · เคยส่งแล้ว (ใช้ใบเดิมถ้าเนื้อหาไม่เปลี่ยน)' : ''}</span>${noteHtml(s.notes)}</span>
      </label>`).join('');
    body.innerHTML = `
      <p class="help" style="margin-top:0">${st.exam ? 'ข้อสอบ (ปรนัย ถูก/ผิด จับคู่) จะถูกคัดลอกเข้า LMS เป็นชุดข้อสอบที่ตรวจอัตโนมัติ เฉพาะคนที่ได้รับมอบหมายเท่านั้นที่เห็น ต้นฉบับยังอยู่ในคลังนี้เหมือนเดิม' : 'ใบงานจะถูกคัดลอกเข้าคลังใบงานของ LMS แล้วมอบหมายให้นักเรียน ชุดต้นฉบับยังอยู่ในคลังนี้เหมือนเดิม'}</p>
      <div class="lms-sec"><b>1. ${st.exam ? 'ข้อสอบที่จะส่ง' : 'เลือกใบงาน'}</b>${sheetRows}</div>
      <div class="lms-sec"><b>2. ส่งให้ใคร</b>
        <div class="grid" style="margin-top:8px">
          <label class="f">คอร์ส<select id="lmsCourse">${st.courses.map((c) => `<option value="${c.id}">${esc(c.title)}${c.level ? ' · ' + esc(c.level) : ''}</option>`).join('')}</select></label>
          <label class="f">กลุ่มเรียน<select id="lmsGroup"></select></label>
        </div>
        <div class="row" style="margin-top:10px">
          <label class="check"><input type="radio" name="lmsMode" value="all" checked> ทั้งคอร์ส/กลุ่ม</label>
          <label class="check"><input type="radio" name="lmsMode" value="selected"> เลือกนักเรียนรายคน</label>
        </div>
        <div id="lmsStudents" class="lms-students hidden"></div>
      </div>
      <div class="lms-sec"><b>3. ตั้งค่า</b>
        <div class="grid" style="margin-top:8px">
          <label class="f">ประเภท<select id="lmsType">${(st.exam ? EXAM_TYPE_OPTS : TYPE_OPTS).map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select></label>
          <label class="f">กำหนดส่ง (ไม่บังคับ)<input type="datetime-local" id="lmsDue"></label>
          <label class="f">ทำได้กี่ครั้ง<input type="number" id="lmsAttempts" min="1" max="20" value="1"></label>
          <label class="f">คะแนนผ่าน (%)<input type="number" id="lmsPass" min="0" max="100" value="60"></label>
        </div>
      </div>
      <div id="lmsMsg"></div>
      <div class="row" style="margin-top:14px"><button type="button" id="lmsGo">ยิงเลย</button><button type="button" class="ghost" data-close>ยกเลิก</button></div>`;
    const sel = (id) => body.querySelector(id);
    const fillGroups = () => {
      const c = st.courses.find((x) => String(x.id) === sel('#lmsCourse').value);
      sel('#lmsGroup').innerHTML = '<option value="0">ทั้งคอร์ส</option>' + ((c && c.groups) || []).map((g) => `<option value="${g.id}">${esc(g.name)}</option>`).join('');
    };
    const loadStudents = async () => {
      const box = sel('#lmsStudents');
      if (st.mode !== 'selected') { box.classList.add('hidden'); return; }
      box.classList.remove('hidden');
      box.innerHTML = '<span class="help">กำลังโหลดรายชื่อ…</span>';
      try {
        const r = await api('api/lms.php', { action: 'students', courseId: Number(sel('#lmsCourse').value), groupId: Number(sel('#lmsGroup').value) });
        st.students = r.students;
        box.innerHTML = r.students.length
          ? `<label class="check"><input type="checkbox" id="lmsAll"> เลือกทั้งหมด (${r.students.length} คน)</label>` +
            r.students.map((s) => `<label class="check"><input type="checkbox" name="stu" value="${s.id}"> ${esc(s.name)} <span class="help">${esc(s.grade)}</span></label>`).join('')
          : '<span class="help">ไม่พบนักเรียนที่ลงทะเบียนในคอร์ส/กลุ่มนี้</span>';
        const all = sel('#lmsAll');
        if (all) all.addEventListener('change', () => box.querySelectorAll('[name=stu]').forEach((c) => { c.checked = all.checked; }));
      } catch (e) { box.innerHTML = `<div class="error">${esc(e.message)}</div>`; }
    };
    fillGroups();
    sel('#lmsCourse').addEventListener('change', () => { fillGroups(); loadStudents(); });
    sel('#lmsGroup').addEventListener('change', loadStudents);
    body.querySelectorAll('[name=lmsMode]').forEach((r) => r.addEventListener('change', () => { st.mode = r.value; loadStudents(); }));
    sel('#lmsGo').addEventListener('click', () => send(body));
  }

  // สรุปผลของข้อสอบที่เพิ่งยิง (ข้อมูลชุดเดียวกับหน้า “ผลการมอบหมาย”)
  async function liveSummary(body, res) {
    const box = body.querySelector('#lmsLive');
    const link = body.querySelector('#lmsResLink');
    if (res.assignmentId) link.href = 'results.php?id=' + Number(res.assignmentId);
    else if (res.worksheetId) link.href = 'results.php?ws=' + Number(res.worksheetId);
    link.textContent = res.assignmentId ? 'ดูรายงานผลสอบ' : 'ดูผลการมอบหมาย';
    try {
      const resp = await fetch('api/results.php?action=list', { headers: { Accept: 'application/json' } });
      const d = await resp.json();
      const a = (d.assignments || []).find((x) => Number(x.id) === Number(res.assignmentId)) ||
        (d.assignments || []).find((x) => Number(x.worksheet_id) === Number(res.worksheetId));
      if (!a) return;
      const pct = a.target_count ? Math.round((a.done_count * 100) / a.target_count) : 0;
      box.innerHTML = `<div class="lms-res ok" style="margin-top:10px"><b>ผลสอบ</b> ส่งแล้ว ${a.done_count}/${a.target_count} คน${a.avg_percent === null || a.avg_percent === undefined ? '' : ` · คะแนนเฉลี่ย ${Math.round(a.avg_percent)}%`}
        <div style="height:8px;border-radius:999px;background:#eef2f7;overflow:hidden;margin-top:6px"><i style="display:block;height:100%;width:${pct}%;background:#d6196f"></i></div>
        <span class="help">${a.target_count ? 'ผลจะอัปเดตเมื่อนักเรียนส่งงาน เปิดรายงานเพื่อดูรายคนและข้อที่อ่อน' : 'ยังไม่มีนักเรียนในกลุ่มเป้าหมาย'}</span></div>`;
    } catch (e) { /* ข้ามได้ ปุ่มด้านล่างยังใช้งานได้ */ }
  }

  async function send(body) {
    const q = (s) => body.querySelector(s);
    const sheets = [...body.querySelectorAll('[name=sh]:checked')].map((c) => Number(c.value));
    const noun = st.exam ? 'ข้อสอบ' : 'ใบงาน';
    const studentIds = [...body.querySelectorAll('[name=stu]:checked')].map((c) => Number(c.value));
    const msg = q('#lmsMsg');
    if (!sheets.length) { msg.innerHTML = `<div class="warn">เลือก${noun}อย่างน้อย 1 รายการ</div>`; return; }
    if (st.mode === 'selected' && !studentIds.length) { msg.innerHTML = '<div class="warn">เลือกนักเรียนอย่างน้อย 1 คน</div>'; return; }
    const course = st.courses.find((c) => String(c.id) === q('#lmsCourse').value);
    const who = st.mode === 'selected' ? `นักเรียน ${studentIds.length} คน` : q('#lmsGroup').value !== '0' ? q('#lmsGroup').selectedOptions[0].textContent : 'ทั้งคอร์ส';
    if (!window.confirm(st.exam ? `ส่งข้อสอบ ให้ ${who} ในคอร์ส "${course.title}" ใช่ไหม?` : `ส่ง ${sheets.length} ใบ ให้ ${who} ในคอร์ส "${course.title}" ใช่ไหม?`)) return;
    const go = q('#lmsGo');
    go.disabled = true;
    go.textContent = 'กำลังส่ง…';
    try {
      const r = await api('api/lms.php', {
        action: st.exam ? 'exam_send' : 'send', id: st.id, sheets,
        target: {
          courseId: Number(q('#lmsCourse').value), groupId: Number(q('#lmsGroup').value), mode: st.mode, studentIds,
          dueDate: q('#lmsDue').value, maxAttempts: Number(q('#lmsAttempts').value) || 1, passScore: q('#lmsPass').value, activityType: q('#lmsType').value,
        },
      });
      if (st.exam) r.results = [Object.assign({ index: 0 }, r.result)];
      body.innerHTML = `<div class="lms-done"><b>ผลการส่ง</b>${r.results.map((x) => `<div class="lms-res ${x.ok === false || x.duplicate ? 'warn' : 'ok'}">
          <b>${st.exam ? 'ข้อสอบ' : 'ใบที่ ' + (x.index + 1)}</b> ${x.ok === false ? '✗ ' + esc(x.error) : x.duplicate ? 'ℹ ' + esc(x.message) : '✓ ' + esc(x.message)}
          ${x.count ? `<span class="help"> · ${x.count} ข้อ</span>` : ''}${noteHtml(x.notes)}</div>`).join('')}
        <div id="lmsLive"></div>
        <div class="row" style="margin-top:12px"><a class="btnlink" id="lmsResLink" href="results.php">ดูผลการมอบหมาย</a><button type="button" class="ghost" data-close>ปิด</button></div></div>`;
      if (st.exam && r.result) liveSummary(body, r.result);
    } catch (e) {
      msg.innerHTML = `<div class="error">${esc(e.message)}</div>`;
      go.disabled = false;
      go.textContent = 'ยิงเลย';
    }
  }

  window.LmsSend = { open, openExam };
})();
