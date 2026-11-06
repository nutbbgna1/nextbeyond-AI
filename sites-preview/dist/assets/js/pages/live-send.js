/* ยิงข้อจากคลังข้อสอบเข้าห้องสด (Pulse) — ใช้ได้เฉพาะตอนฝังใน nextbeyond */
(() => {
  'use strict';
  const { esc, api } = window.WS;
  let root = null;

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
      <div class="lms-body" id="liveBody"><p class="help">กำลังโหลด…</p></div></div>`;
    document.body.appendChild(root);
    document.documentElement.classList.add('lms-lock');
    root.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
    return root.querySelector('#liveBody');
  }

  async function pulse(bankId) {
    const body = shell('ยิงเข้าห้องสด (Pulse)');
    let pv, ss;
    try {
      [pv, ss] = await Promise.all([api('api/live.php', { action: 'pulse_preview', bankId }), api('api/live.php', { action: 'sessions' })]);
    } catch (e) { body.innerHTML = `<div class="error">${esc(e.message)}</div>`; return; }
    if (!pv.ok) { body.innerHTML = `<div class="warn">${esc((pv.notes || [])[0] || 'ยิงข้อนี้ไม่ได้')}</div><div class="row" style="margin-top:12px"><button type="button" class="ghost" data-close>ปิด</button></div>`; return; }
    if (!ss.sessions.length) { body.innerHTML = '<div class="warn">ยังไม่มีห้องสดที่เปิดอยู่ เปิดห้องที่เมนู "ห้องเรียนสด (Live)" ใน Admin ก่อน</div><div class="row" style="margin-top:12px"><button type="button" class="ghost" data-close>ปิด</button></div>'; return; }
    const p = pv.pulse;
    body.innerHTML = `
      <div class="lms-sec"><b>โจทย์ที่จะยิง</b>
        <div class="lms-sheet" style="display:block"><div style="white-space:pre-wrap">${esc(p.text)}</div>
        <div style="margin-top:6px">${p.options.map((o) => `<div class="${o.key === p.correctKey ? 'ok' : ''}" style="padding:2px 0">${esc(o.key)}. ${esc(o.text)}${o.key === p.correctKey ? ' ✓' : ''}</div>`).join('')}</div>
        ${p.correctKey ? '' : '<div class="lms-note">⚠ ข้อนี้ไม่มีเฉลย (จะเป็นโพลความเห็น)</div>'}</div>
      </div>
      <div class="lms-sec"><b>ห้องสด</b>
        <div class="grid" style="margin-top:8px">
          <label class="f">ห้อง<select id="liveSess">${ss.sessions.map((s) => `<option value="${esc(s.id)}">${esc(s.title)} · PIN ${esc(s.pin)} · ${s.students} คน</option>`).join('')}</select></label>
          <label class="f">เวลาตอบ<select id="liveSec"><option value="30">30 วินาที</option><option value="60" selected>1 นาที</option><option value="120">2 นาที</option><option value="0">ไม่จำกัด</option></select></label>
        </div>
        <div class="help" style="margin-top:6px">ถ้าห้องมีข้อที่เปิดอยู่ ระบบจะปิดข้อเดิมก่อนแล้วขึ้นข้อนี้แทน</div>
      </div>
      <div id="liveMsg"></div>
      <div class="row" style="margin-top:14px"><button type="button" id="liveGo">📡 ยิงเลย</button><button type="button" class="ghost" data-close>ยกเลิก</button></div>`;
    body.querySelector('#liveGo').addEventListener('click', async () => {
      const go = body.querySelector('#liveGo');
      go.disabled = true; go.textContent = 'กำลังยิง…';
      try {
        await api('api/live.php', { action: 'pulse_push', bankId, sessionId: body.querySelector('#liveSess').value, seconds: Number(body.querySelector('#liveSec').value) });
        body.innerHTML = '<div class="lms-res ok"><b>✓ ยิงเข้าห้องสดแล้ว</b> นักเรียนจะเห็นคำถามทันที ดูผลได้ที่หน้าห้องสดใน Admin</div><div class="row" style="margin-top:12px"><button type="button" class="ghost" data-close>ปิด</button></div>';
      } catch (e) {
        body.querySelector('#liveMsg').innerHTML = `<div class="error">${esc(e.message)}</div>`;
        go.disabled = false; go.textContent = '📡 ยิงเลย';
      }
    });
  }

  async function openRoom(examId, title) {
    const body = shell('เปิดห้องสดจากข้อสอบ');
    let pv;
    try { pv = await api('api/live.php', { action: 'room_preview', examId }); } catch (e) { body.innerHTML = `<div class="error">${esc(e.message)}</div>`; return; }
    if (!pv.questions) { body.innerHTML = `<div class="warn">ข้อสอบนี้ไม่มีข้อที่เปิดในห้องสดได้ (ต้องมีส่วนปรนัย ถูก/ผิด หรือจับคู่)</div><div class="row" style="margin-top:12px"><button type="button" class="ghost" data-close>ปิด</button></div>`; return; }
    const noteHtml = (pv.notes || []).map((n) => `<div class="lms-note">⚠ ${esc(n)}</div>`).join('');
    const active = (pv.active || []).length ? `<div class="lms-note">⚠ ห้องสดที่เปิดอยู่ของคุณ (${esc(pv.active.map((a) => a.title).join(', '))}) จะถูกปิด เพราะระบบเปิดได้ทีละห้อง</div>` : '';
    body.innerHTML = `
      <p class="help" style="margin-top:0">ระบบจะคัดลอกข้อสอบเข้า LMS (เฉพาะในห้องสดนี้ ไม่ขึ้นในคลังข้อสอบของนักเรียน) แล้วเปิดห้องให้ นักเรียนเข้าด้วยรหัส PIN</p>
      <div class="lms-sec"><b>ข้อสอบ</b><div class="lms-sheet" style="display:block"><b>${esc(pv.title || title)}</b> <span class="help">· ส่งได้ ${pv.questions}/${pv.total} ข้อ</span>${noteHtml}</div></div>
      <div class="lms-sec"><b>ตั้งค่าห้อง</b>
        <div class="grid" style="margin-top:8px">
          <label class="f" style="grid-column:span 2">ชื่อห้อง<input type="text" id="roomTitle" maxlength="120" value="${esc(pv.title || title)}"></label>
          <label class="f">เวลาทำข้อสอบ (นาที, 0 = ไม่จำกัด)<input type="number" id="roomMin" min="0" max="300" value="${Number(pv.minutes) || 0}"></label>
        </div>${active}
      </div>
      <div id="liveMsg"></div>
      <div class="row" style="margin-top:14px"><button type="button" id="roomGo">📡 เปิดห้องสด</button><button type="button" class="ghost" data-close>ยกเลิก</button></div>`;
    body.querySelector('#roomGo').addEventListener('click', async () => {
      const go = body.querySelector('#roomGo');
      go.disabled = true; go.textContent = 'กำลังเปิดห้อง…';
      try {
        const r = await api('api/live.php', { action: 'room_open', examId, title: body.querySelector('#roomTitle').value, minutes: Number(body.querySelector('#roomMin').value) || 0 });
        body.innerHTML = `<div class="lms-res ok"><b>✓ เปิดห้องสดแล้ว</b> ${r.questions} ข้อ<div style="font-size:28px;font-weight:700;letter-spacing:.15em;margin:8px 0">PIN ${esc(r.pin)}</div><div class="help">ให้นักเรียนกรอก PIN นี้ที่หน้า Live ของนักเรียน</div></div>
          <div class="row" style="margin-top:12px"><a class="btnlink" href="../live-session-room.php?id=${encodeURIComponent(r.sessionId)}" target="_blank" rel="noopener">เปิดห้องควบคุม</a><button type="button" class="ghost" data-close>ปิด</button></div>`;
      } catch (e) {
        body.querySelector('#liveMsg').innerHTML = `<div class="error">${esc(e.message)}</div>`;
        go.disabled = false; go.textContent = '📡 เปิดห้องสด';
      }
    });
  }
  window.LiveSend = { pulse, openRoom };
})();
