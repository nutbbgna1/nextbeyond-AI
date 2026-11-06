/* จัดตารางสอนด้วย AI: เลือกคอร์ส+เงื่อนไข → AI เสนอ → ตรวจ → สร้างใน Google Calendar */
(() => {
  'use strict';
  const { esc, api, showError } = window.WS;
  const $ = (id) => document.getElementById(id);
  const DAYS = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์'];
  let data = null;
  let reqs = [];
  let slots = [];
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const times = [];
  for (let m = 6 * 60; m <= 21 * 60; m += 30) times.push(`${pad(Math.floor(m / 60))}:${pad(m % 60)}`);
  const minOf = (s) => { const [h, m] = String(s).split(':'); return (+h) * 60 + (+m); };

  function selectedDays() { return [...document.querySelectorAll('#days input:checked')].map((x) => +x.value); }
  function selectedItems() {
    return [...document.querySelectorAll('#courses tr[data-c]')].filter((r) => r.querySelector('.pick').checked)
      .map((r) => ({ courseId: +r.dataset.c, perWeek: +r.querySelector('.pw').value || 1, minutes: +r.querySelector('.mn').value || 60 }));
  }
  function teachersOfSelection() {
    const ids = new Set(selectedItems().map((i) => (data.courses.find((c) => c.id === i.courseId) || {}).teacherId).filter(Boolean));
    return data.teachers.filter((t) => ids.has(t.id));
  }
  function drawAvail() {
    const days = selectedDays();
    const keep = collectAvail(true);
    const saved = (data.cfg && data.cfg.avail) || {};
    const mails = collectEmails();
    const start = $('dayStart').value || '09:00';
    const end = $('dayEnd').value || '17:00';
    $('avail').innerHTML = teachersOfSelection().map((t) => {
      const cur = keep[t.id] || saved[t.id] || null;
      const rows = days.map((d) => {
        const a = cur ? cur.find((x) => +x.day === d) : { from: start, to: end };
        return `<div class="d"><label style="min-width:110px;display:flex;gap:6px;align-items:center"><input type="checkbox" data-t="${t.id}" data-d="${d}" ${a ? 'checked' : ''}> ${DAYS[d]}</label>
          <input type="time" data-f="${t.id}-${d}" value="${esc(a ? a.from : start)}"> ถึง <input type="time" data-e="${t.id}-${d}" value="${esc(a ? a.to : end)}"></div>`;
      }).join('');
      const em = mails[t.id] !== undefined ? mails[t.id] : (t.email || '');
      return `<div class="tav"><h4>ครู${esc(t.nickname || t.name)}</h4>
        <label class="d" style="gap:8px">อีเมล Google ที่จะเชิญ <input type="email" data-email="${t.id}" value="${esc(em)}" placeholder="name@gmail.com" style="flex:1;min-width:220px;padding:5px 8px;font-size:13px"></label>${rows}</div>`;
    }).join('') || '<p class="sub">เลือกคอร์สก่อน</p>';
  }
  function collectAvail(silent) {
    const out = {};
    document.querySelectorAll('#avail input[type=checkbox]').forEach((c) => {
      const t = c.dataset.t, d = c.dataset.d;
      out[t] = out[t] || [];
      if (c.checked) out[t].push({ day: +d, from: document.querySelector(`[data-f="${t}-${d}"]`).value, to: document.querySelector(`[data-e="${t}-${d}"]`).value });
    });
    return out;
  }
  function collectEmails() {
    const o = {};
    document.querySelectorAll('#avail [data-email]').forEach((i) => { o[i.dataset.email] = i.value.trim(); });
    return o;
  }
  function body(extra) {
    return Object.assign({
      items: selectedItems(), days: selectedDays(), dayStart: $('dayStart').value, dayEnd: $('dayEnd').value,
      avail: collectAvail(), emails: collectEmails(), startDate: $('startDate').value, endDate: $('endDate').value, note: $('note').value.trim(),
    }, extra || {});
  }
  function drawSlots() {
    $('slots').innerHTML = slots.map((s, i) => {
      const r = reqs[s.reqIx] || {};
      const dayOpt = DAYS.map((d, k) => `<option value="${k}" ${k === +s.day ? 'selected' : ''}>${d}</option>`).join('');
      const tOpt = times.map((t) => `<option ${t === s.start ? 'selected' : ''}>${t}</option>`).join('');
      return `<tr data-i="${i}"><td>${esc(r.courseTitle || '')}</td><td>${esc(r.teacherName || '')}</td>
        <td><select class="sd">${dayOpt}</select></td><td><select class="st">${tOpt}</select></td><td class="se">${esc(s.end)}</td>
        <td><button class="ghost small sx" title="เอาคาบนี้ออก">✕</button></td></tr>`;
    }).join('');
  }
  function readSlots() {
    document.querySelectorAll('#slots tr').forEach((tr) => {
      const s = slots[+tr.dataset.i];
      s.day = +tr.querySelector('.sd').value;
      s.start = tr.querySelector('.st').value;
      s.end = `${pad(Math.floor((minOf(s.start) + (reqs[s.reqIx] || {}).minutes) / 60))}:${pad((minOf(s.start) + (reqs[s.reqIx] || {}).minutes) % 60)}`;
      tr.querySelector('.se').textContent = s.end;
    });
  }
  function drawIssues(issues, unplaced) {
    $('issues').innerHTML = (issues || []).map((x) => `<div class="iss">${esc(x)}</div>`).join('')
      + (unplaced || []).map((x) => `<div class="iss bad">${esc(x)}</div>`).join('');
  }

  async function draft() {
    showError('');
    if (!selectedItems().length) return showError('เลือกคอร์สอย่างน้อย 1 คอร์ส');
    $('draft').disabled = true;
    $('draftNote').textContent = $('useAi').checked ? 'AI กำลังจัดตาราง…' : 'กำลังจัดตาราง…';
    try {
      const r = await api('api/schedule.php', body({ action: 'draft', useAi: $('useAi').checked }));
      reqs = r.reqs; slots = r.slots;
      $('resBox').classList.remove('hidden');
      $('done').innerHTML = '';
      $('summary').textContent = (r.aiUsed ? 'AI เสนอ: ' + (r.summary || '') : $('useAi').checked ? 'AI ใช้ไม่ได้ (' + (r.aiError || '') + ') ระบบจัดให้เองตามเงื่อนไข' : 'ระบบจัดให้ตามเงื่อนไข (ไม่ใช้ AI)');
      drawSlots();
      drawIssues(r.issues.map((x) => 'AI เสนอที่ใช้ไม่ได้ ระบบแก้ให้แล้ว: ' + x), r.unplaced);
      $('resBox').scrollIntoView({ behavior: 'smooth' });
    } catch (e) { showError(e.message); } finally { $('draft').disabled = false; $('draftNote').textContent = ''; }
  }
  async function check() {
    showError('');
    readSlots();
    try {
      const r = await api('api/schedule.php', body({ action: 'check', slots }));
      const bad = r.issues.length;
      slots = r.slots;
      drawSlots();
      drawIssues(bad ? r.issues : [], []);
      if (!bad) $('issues').innerHTML = '<div class="ok">ผ่านการตรวจ ไม่ชนกัน และครบทุกคาบ</div>';
    } catch (e) { showError(e.message); }
  }
  async function commit() {
    showError('');
    readSlots();
    const noMail = [...document.querySelectorAll('#avail [data-email]')].filter((i) => !i.value.trim()).length;
    if (noMail && !window.confirm(`มีครู ${noMail} คนที่ยังไม่ใส่อีเมล Google จะไม่ได้รับคำเชิญ และ LMS จับคู่ครูจากชื่อเล่นในชื่อกิจกรรมแทน ทำต่อไหม`)) return;
    if (!window.confirm(`สร้าง ${slots.length} รายการประจำสัปดาห์ใน Google Calendar (มีห้อง Meet) ใช่ไหม`)) return;
    $('commit').disabled = true;
    $('done').innerHTML = '<div class="sub">กำลังสร้างใน Google Calendar… (อาจใช้เวลาหลายสิบวินาที)</div>';
    try {
      const r = await api('api/schedule.php', body({ action: 'commit', slots, invite: $('invite').checked }));
      $('done').innerHTML = `<div class="${r.failed ? 'iss' : 'ok'}">สร้างใน Google Calendar แล้ว ${r.created} รายการ${r.sync ? ` · ซิงค์เข้า LMS แล้ว (เพิ่ม ${r.sync.added})` : ''}${r.failed ? '<br>' + r.errors.map(esc).join('<br>') : ''}</div><p><a href="../calendar">ไปดูที่หน้าปฏิทิน →</a></p>`;
    } catch (e) { showError(e.message); $('done').innerHTML = ''; } finally { $('commit').disabled = false; }
  }

  async function init() {
    data = await api('api/schedule.php', { action: 'init' });
    if (!data.configured) { $('notReady').textContent = 'ยังไม่ได้เชื่อม Google (ตั้งค่าที่ “ตั้งค่าระบบ → Google”) จึงยังสร้างลง Google Calendar ไม่ได้ แต่ร่างตารางดูได้'; $('notReady').classList.remove('hidden'); }
    const cfg = data.cfg || {};
    const teacher = (id) => data.teachers.find((t) => t.id === id);
    $('courses').innerHTML = data.courses.map((c) => `<tr data-c="${c.id}"><td><input type="checkbox" class="pick"></td><td>${esc(c.title)}</td>
      <td>${c.teacherId && teacher(c.teacherId) ? esc(teacher(c.teacherId).nickname || teacher(c.teacherId).name) : '<span class="sbad">ยังไม่ตั้งครู</span>'}</td>
      <td><input type="number" class="pw" min="1" max="7" value="1" style="width:64px"></td>
      <td><select class="mn">${[45, 60, 90, 120, 150, 180].map((m) => `<option ${m === (cfg.minutes || 60) ? 'selected' : ''}>${m}</option>`).join('')}</select></td></tr>`).join('') || '<tr><td colspan="5">ยังไม่มีคอร์ส</td></tr>';
    const open = cfg.days || [0, 1, 2, 3, 4];
    $('days').innerHTML = DAYS.map((d, i) => `<label><input type="checkbox" value="${i}" ${open.includes(i) ? 'checked' : ''}> ${d}</label>`).join('');
    if (cfg.dayStart) $('dayStart').value = cfg.dayStart;
    if (cfg.dayEnd) $('dayEnd').value = cfg.dayEnd;
    const t = new Date();
    const mon = new Date(t); mon.setDate(t.getDate() + ((8 - (t.getDay() || 7)) % 7 || 7));
    $('startDate').value = iso(mon);
    const end = new Date(mon); end.setDate(end.getDate() + 7 * 16 - 1);
    $('endDate').value = iso(end);
    drawAvail();
  }

  document.addEventListener('change', (e) => {
    if (e.target.closest('#courses') && e.target.classList.contains('pick')) drawAvail();
    if (e.target.closest('#days') || e.target.id === 'dayStart' || e.target.id === 'dayEnd') drawAvail();
  });
  document.addEventListener('click', (e) => {
    const x = e.target.closest('.sx');
    if (x) { readSlots(); slots.splice(+x.closest('tr').dataset.i, 1); drawSlots(); }
  });
  $('draft').addEventListener('click', draft);
  $('redo').addEventListener('click', draft);
  $('check').addEventListener('click', check);
  $('commit').addEventListener('click', commit);
  init().catch((e) => showError(e.message));
})();
