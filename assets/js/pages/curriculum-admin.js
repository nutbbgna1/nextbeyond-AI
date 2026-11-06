(() => {
  'use strict';
  const { esc, api, GRADES, showError, ls } = window.WS;
  const $ = (id) => document.getElementById(id);
  const CUR = window.CURRICULUM || {};
  const S = { eds: [], active: { default: '', byGrade: {} }, subjects: [], ind: null, draft: [], pages: null, chunks: [] };

  /* ---------- แท็บ ---------- */
  function tab(t) {
    for (const k of ['ed', 'ind', 'imp', 'xw']) $('tab-' + k).classList.toggle('hidden', k !== t);
    for (const b of document.querySelectorAll('#tabs button')) b.classList.toggle('ghost', b.dataset.tab !== t);
    ls.set('ws_curTab', t);
    if (t === 'ind' && S.eds.length) showSubjects();
  }
  $('tabs').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b) tab(b.dataset.tab);
  });

  /* ---------- 1) ฉบับ ---------- */
  async function loadState() {
    const r = await api('api/curriculum.php', { action: 'state' });
    S.eds = r.editions;
    S.active = r.active;
    const opts = S.eds.map((e) => `<option value="${esc(e.id)}">${esc(e.name)}</option>`).join('');
    for (const id of ['edDefault', 'indEd', 'impEd', 'xwFrom', 'xwTo']) {
      const keep = $(id).value;
      $(id).innerHTML = opts;
      $(id).value = S.eds.some((e) => e.id === keep) ? keep : S.active.default;
    }
    $('edDefault').value = S.active.default;
    $('edByGrade').innerHTML = GRADES.map(
      (g) => `<label class="f" style="font-weight:400">${g}<select data-g="${g}"><option value="">ใช้ฉบับตั้งต้น</option>${opts}</select></label>`,
    ).join('');
    for (const sel of document.querySelectorAll('#edByGrade select')) sel.value = S.active.byGrade[sel.dataset.g] || '';
    $('edList').innerHTML = S.eds
      .map(
        (e) => `<div class="doc-row"><div style="min-width:0;flex:1"><strong>${esc(e.name)}</strong> ${e.year ? `<span class="chip gray">พ.ศ. ${esc(e.year)}</span>` : ''}${e.id === S.active.default ? '<span class="chip green">ฉบับตั้งต้น</span>' : ''}<div style="color:var(--muted);font-size:13px">${esc(e.note || '')}</div></div>
        <span class="row"><button class="ghost small" data-open="${esc(e.id)}">ดูตัวชี้วัด</button>${e.id === '2560-core' ? '' : `<button class="ghost small" data-edel="${esc(e.id)}">ลบ</button>`}</span></div>`,
      )
      .join('');
  }
  $('edList').addEventListener('click', async (e) => {
    const o = e.target.closest('[data-open]');
    const d = e.target.closest('[data-edel]');
    try {
      if (o) {
        $('indEd').value = o.dataset.open;
        tab('ind');
        return showSubjects();
      }
      if (d && window.confirm('ลบหลักสูตรฉบับนี้พร้อมตัวชี้วัดทั้งหมดในฉบับ? (ลบแล้วกู้คืนไม่ได้)')) {
        await api('api/curriculum.php', { action: 'edition_delete', edition: d.dataset.edel });
        await loadState();
      }
    } catch (err) {
      showError(err.message);
    }
  });
  $('edAdd').addEventListener('click', async () => {
    try {
      await api('api/curriculum.php', { action: 'edition_save', name: $('edName').value.trim(), year: $('edYear').value.trim(), note: $('edNote').value.trim() });
      $('edName').value = $('edYear').value = $('edNote').value = '';
      await loadState();
    } catch (err) {
      showError(err.message);
    }
  });
  $('edActiveSave').addEventListener('click', async () => {
    const byGrade = {};
    for (const sel of document.querySelectorAll('#edByGrade select')) if (sel.value) byGrade[sel.dataset.g] = sel.value;
    try {
      await api('api/curriculum.php', { action: 'set_active', default: $('edDefault').value, byGrade });
      $('edActiveNote').textContent = 'บันทึกแล้ว';
      await loadState();
    } catch (err) {
      showError(err.message);
    }
  });

  /* ---------- 2) ตัวชี้วัด ---------- */
  $('indGrade').innerHTML += GRADES.map((g) => `<option>${g}</option>`).join('');
  $('indSubjList').innerHTML = window.WS.allSubjects().map((s) => `<option value="${esc(s)}">`).join('');

  async function showSubjects() {
    try {
      const r = await api('api/curriculum.php', { action: 'subjects', edition: $('indEd').value });
      S.subjects = r.subjects;
      $('indSubjects').innerHTML = r.subjects.length
        ? 'วิชาที่มีตัวชี้วัดในฉบับนี้: ' + r.subjects.map((s) => `<button class="ghost small" data-sub="${esc(s.subject)}">${esc(s.subject)} (${s.count})</button>`).join(' ')
        : '<span style="color:var(--muted)">ฉบับนี้ยังไม่มีตัวชี้วัด ไปแท็บ “นำเข้าจากไฟล์” หรือกด “เปิด” แล้วเพิ่มเอง</span>';
    } catch (e) {
      showError(e.message);
    }
  }
  $('indEd').addEventListener('change', showSubjects);
  $('indSubjects').addEventListener('click', (e) => {
    const b = e.target.closest('[data-sub]');
    if (b) {
      $('indSubject').value = b.dataset.sub;
      openSubject();
    }
  });
  $('indLoad').addEventListener('click', openSubject);
  $('indGrade').addEventListener('change', () => S.ind && renderInd());

  async function openSubject() {
    const subject = $('indSubject').value.trim();
    if (!subject) return showError('เลือกหรือพิมพ์ชื่อวิชาก่อน');
    try {
      showError('');
      const r = await api('api/curriculum.php', { action: 'get', edition: $('indEd').value, subject });
      S.ind = { edition: $('indEd').value, subject, standards: r.standards, indicators: r.indicators };
      $('indBox').classList.remove('hidden');
      renderInd();
    } catch (e) {
      showError(e.message);
    }
  }

  /** หน่วยการเรียนรู้ที่รู้จัก (จาก curriculum.js) ของชั้นและวิชานี้ */
  function unitsFor(grades, subject) {
    const set = new Set();
    for (const g of grades.length ? grades : GRADES) for (const u of (CUR[g] || {})[subject] || []) set.add(u[1]);
    return [...set];
  }

  function renderInd() {
    const { subject, indicators } = S.ind;
    const g = $('indGrade').value;
    $('indTitle').textContent = `${subject} · ${indicators.length} ตัวชี้วัด`;
    const rows = indicators.map((i, idx) => ({ i, idx })).filter((r) => !g || r.i.grades.includes(g));
    $('indTable').innerHTML = rows.length
      ? `<table class="tbl"><thead><tr><th style="width:130px">รหัส</th><th>ข้อความตัวชี้วัด</th><th style="width:90px">ชั้น</th><th style="width:230px">หน่วยการเรียนรู้ที่เกี่ยวข้อง</th><th></th></tr></thead><tbody>${rows
          .map(({ i, idx }) => {
            const units = unitsFor(i.grades, subject);
            return `<tr><td><input type="text" data-f="code" data-i="${idx}" value="${esc(i.code)}" style="width:120px"></td>
            <td><textarea data-f="text" data-i="${idx}" rows="2" style="width:100%">${esc(i.text)}</textarea></td>
            <td>${i.grades.map((x) => `<span class="chip gray">${x}</span>`).join('')}</td>
            <td>${units.length ? `<select multiple data-f="units" data-i="${idx}" size="3" style="width:100%">${units.map((u) => `<option${i.units.includes(u) ? ' selected' : ''}>${esc(u)}</option>`).join('')}</select>` : '<span style="color:var(--muted);font-size:12px">ไม่มีหน่วยตัวอย่าง</span>'}</td>
            <td><button class="ghost small" data-rm="${idx}">✕</button></td></tr>`;
          })
          .join('')}</tbody></table>`
      : '<div style="color:var(--muted)">ยังไม่มีตัวชี้วัด (กด “＋ เพิ่มตัวชี้วัด” หรือนำเข้าจากไฟล์)</div>';
  }
  function syncInd() {
    for (const el of document.querySelectorAll('#indTable [data-f]')) {
      const i = S.ind.indicators[Number(el.dataset.i)];
      if (!i) continue;
      if (el.dataset.f === 'units') i.units = [...el.selectedOptions].map((o) => o.value);
      else i[el.dataset.f] = el.value;
      if (el.dataset.f === 'code') i.grades = gradesOfCode(i.code, i.grades);
    }
  }
  /** ชั้นจากรหัส (ใช้กฎเดียวกับฝั่งเซิร์ฟเวอร์) ถ้าอ่านไม่ได้ใช้ค่าเดิม */
  function gradesOfCode(code, fallback) {
    const m = /([ปม])\.\s?(\d)(?:\s*[-–—]\s*(\d))?\s*\//.exec(code);
    if (!m) return fallback;
    const a = +m[2], b = m[3] ? +m[3] : a, out = [];
    for (let k = Math.min(a, b); k <= Math.max(a, b); k++) if (GRADES.includes(m[1] + '.' + k)) out.push(m[1] + '.' + k);
    return out.length ? out : fallback;
  }
  $('indTable').addEventListener('click', (e) => {
    const r = e.target.closest('[data-rm]');
    if (!r) return;
    syncInd();
    S.ind.indicators.splice(Number(r.dataset.rm), 1);
    renderInd();
  });
  $('indAdd').addEventListener('click', () => {
    if (!S.ind) return;
    syncInd();
    const g = $('indGrade').value;
    S.ind.indicators.push({ code: '', text: '', grades: g ? [g] : [], standard: '', units: [] });
    renderInd();
  });
  $('indSave').addEventListener('click', async () => {
    if (!S.ind) return;
    syncInd();
    const bad = S.ind.indicators.filter((i) => !i.code.trim() || !i.text.trim());
    if (bad.length) return showError(`มี ${bad.length} แถวที่รหัสหรือข้อความว่าง กรอกให้ครบหรือกด ✕ เอาออกก่อน`);
    try {
      showError('');
      const r = await api('api/curriculum.php', { action: 'save', edition: S.ind.edition, subject: S.ind.subject, standards: S.ind.standards, indicators: S.ind.indicators, mode: 'replace' });
      $('indNote').textContent = `บันทึกแล้ว ${r.count} ตัวชี้วัด`;
      await openSubject();
      showSubjects();
    } catch (e) {
      showError(e.message);
    }
  });
  $('indDelSubject').addEventListener('click', async () => {
    if (!S.ind || !window.confirm(`ลบตัวชี้วัดวิชา “${S.ind.subject}” ออกจากฉบับนี้?`)) return;
    try {
      await api('api/curriculum.php', { action: 'delete_subject', edition: S.ind.edition, subject: S.ind.subject });
      S.ind = null;
      $('indBox').classList.add('hidden');
      showSubjects();
    } catch (e) {
      showError(e.message);
    }
  });

  /* ---------- 3) นำเข้า ---------- */
  const IND_RX = /[ปม]\.\s?\d(?:\s*[-–—]\s*\d)?\s*\/\s*\d/u;

  function parseRange(s, max) {
    const m = /^\s*(\d+)\s*(?:[-–]\s*(\d+))?\s*$/.exec(s || '');
    if (!m) return null;
    const a = +m[1], b = m[2] ? +m[2] : a;
    return [Math.max(1, Math.min(a, b)), Math.min(max, Math.max(a, b))];
  }

  async function loadPages() {
    const pasted = $('impPaste').value.trim();
    let pages;
    if ($('impFile').files[0]) pages = (await window.WSExtract.extract($('impFile').files[0])).pages;
    else if (pasted) pages = [{ n: 1, text: pasted }];
    else throw new Error('เลือกไฟล์หรือวางข้อความก่อน');
    const maxN = Math.max(...pages.map((p) => p.n));
    const rg = $('impRange').value.trim() ? parseRange($('impRange').value, maxN) : null;
    if ($('impRange').value.trim() && !rg) throw new Error('ช่วงหน้าไม่ถูกต้อง ใช้รูปแบบ 10-45');
    if (rg) pages = pages.filter((p) => p.n >= rg[0] && p.n <= rg[1]);
    if (!pages.length) throw new Error('ไม่พบข้อความในช่วงหน้าที่เลือก (ถ้าเป็น PDF สแกน ระบบยังอ่านตัวอักษรจากรูปไม่ได้)');
    S.pages = pages;
    return pages;
  }

  function showDraft() {
    $('impBox').classList.remove('hidden');
    $('impCount').textContent = `(${S.draft.length} ตัวชี้วัด)`;
    $('impTable').innerHTML = S.draft.length
      ? `<table class="tbl"><thead><tr><th></th><th>รหัส</th><th>ข้อความ</th><th>ชั้น</th><th>ตรวจ</th></tr></thead><tbody>${S.draft
          .map(
            (d, k) => `<tr><td><input type="checkbox" data-k="${k}" ${d.skip ? '' : 'checked'}></td><td><input type="text" data-c="${k}" value="${esc(d.code)}" style="width:120px"></td>
            <td><textarea data-t="${k}" rows="2" style="width:100%">${esc(d.text)}</textarea></td><td>${(d.grades || []).map((g) => `<span class="chip gray">${g}</span>`).join('')}</td>
            <td>${d.verified === false ? '<span class="chip amber">⚠ ไม่ตรงต้นฉบับ</span>' : '<span class="chip green">✔</span>'}</td></tr>`,
          )
          .join('')}</tbody></table>`
      : '<div style="color:var(--muted)">ไม่พบตัวชี้วัด</div>';
  }
  function syncDraft() {
    for (const el of document.querySelectorAll('#impTable [data-k]')) S.draft[+el.dataset.k].skip = !el.checked;
    for (const el of document.querySelectorAll('#impTable [data-c]')) {
      const d = S.draft[+el.dataset.c];
      d.code = el.value;
      d.grades = gradesOfCode(d.code, d.grades);
    }
    for (const el of document.querySelectorAll('#impTable [data-t]')) S.draft[+el.dataset.t].text = el.value;
  }

  $('impParse').addEventListener('click', async () => {
    showError('');
    $('impNote').textContent = 'กำลังถอดข้อความ…';
    try {
      const pages = await loadPages();
      const r = await api('api/curriculum.php', { action: 'parse', text: pages.map((p) => p.text).join('\n\n') });
      S.draft = r.indicators.map((i) => Object.assign({ verified: true }, i));
      S.standards = r.standards;
      $('impNote').textContent = `พบ ${S.draft.length} ตัวชี้วัด จาก ${pages.length} หน้า` + (r.warnings.length ? ' · ' + r.warnings[0] : '');
      $('impAi').disabled = false;
      showDraft();
    } catch (e) {
      $('impNote').textContent = '';
      showError(e.message);
    }
  });

  $('impAi').addEventListener('click', async () => {
    if (!S.pages) return;
    syncDraft();
    // รวมหน้าเป็นท่อนละ ~5000 ตัวอักษร ส่งเฉพาะท่อนที่มีรูปแบบรหัสตัวชี้วัด
    const chunks = [];
    let cur = '';
    for (const p of S.pages) {
      if (cur && cur.length + p.text.length > 5000) {
        chunks.push(cur);
        cur = '';
      }
      cur += (cur ? '\n' : '') + p.text;
    }
    if (cur) chunks.push(cur);
    const todo = chunks.filter((c) => IND_RX.test(c)).slice(0, 30);
    if (!todo.length) return showError('ไม่พบข้อความที่มีรหัสตัวชี้วัดให้ AI ถอด');
    if (!window.confirm(`จะเรียก AI ${todo.length} ครั้ง (ใช้โควตา) ดำเนินการต่อ?`)) return;
    $('impAi').disabled = true;
    const have = new Map(S.draft.map((d) => [d.code, d]));
    let added = 0;
    try {
      for (const [k, c] of todo.entries()) {
        $('impNote').textContent = `AI กำลังถอดท่อนที่ ${k + 1}/${todo.length}…`;
        const r = await api('api/curriculum.php', { action: 'extract', text: c }, true);
        for (const i of r.indicators) {
          if (!have.has(i.code)) {
            have.set(i.code, i);
            S.draft.push(i);
            added++;
          }
        }
        showDraft();
      }
      $('impNote').textContent = `AI เพิ่ม ${added} ตัวชี้วัด (ข้อที่ติด ⚠ ตรวจกับเอกสารก่อนบันทึก)`;
    } catch (e) {
      showError(e.message);
      $('impNote').textContent = '';
    } finally {
      $('impAi').disabled = false;
    }
  });

  $('impSave').addEventListener('click', async () => {
    syncDraft();
    const subject = $('impSubject').value.trim();
    if (!subject) return showError('ใส่ชื่อวิชาที่เอกสารนี้เป็นของก่อนบันทึก');
    const inds = S.draft.filter((d) => !d.skip && d.code.trim() && d.text.trim());
    if (!inds.length) return showError('ไม่มีตัวชี้วัดที่เลือกไว้');
    try {
      showError('');
      const r = await api('api/curriculum.php', {
        action: 'save', edition: $('impEd').value, subject, mode: $('impMode').value, standards: S.standards || [],
        indicators: inds.map((d) => ({ code: d.code, text: d.text, grades: d.grades, standard: d.standard || '' })),
      });
      $('impNote').textContent = `บันทึกแล้ว: ${subject} มี ${r.count} ตัวชี้วัดในฉบับนี้`;
      S.draft = [];
      $('indEd').value = $('impEd').value;
      $('impBox').classList.add('hidden');
    } catch (e) {
      showError(e.message);
    }
  });

  /* ---------- 4) เทียบต่างฉบับ ---------- */
  const X = { links: [], fromInd: [], toInd: [] };
  const REL = { same: 'เหมือนเดิม', similar: 'ใกล้เคียง', partial: 'ตรงบางส่วน', none: 'ไม่มีที่ตรง' };
  $('xwGrade').innerHTML = '<option value="">ทุกชั้น</option>' + GRADES.map((g) => `<option>${g}</option>`).join('');
  const xwArgs = () => ({ from: $('xwFrom').value, to: $('xwTo').value, subject: $('xwSubject').value.trim() });
  function xwRender() {
    const byFrom = Object.fromEntries(X.links.map((l) => [l.from, l]));
    const g = $('xwGrade').value;
    const rows = X.fromInd.filter((i) => !g || (i.grades || []).includes(g));
    const toTxt = (c) => (X.toInd.find((i) => i.code === c) || {}).text || '';
    $('xwBox').classList.toggle('hidden', !rows.length);
    $('xwTable').innerHTML = `<table class="tbl"><thead><tr><th style="width:130px">รหัสเดิม</th><th>ข้อความเดิม</th><th style="width:200px">รหัสฉบับใหม่ (คั่นด้วยจุลภาค)</th><th style="width:120px">ความสัมพันธ์</th><th>ข้อความฉบับใหม่</th></tr></thead><tbody>${rows
      .map((i) => {
        const l = byFrom[i.code] || { to: [], relation: 'none' };
        return `<tr data-c="${esc(i.code)}"><td>${esc(i.code)}</td><td>${esc(i.text)}</td><td><input type="text" data-f="to" value="${esc(l.to.join(', '))}" list="xwTo_${esc(i.code)}"></td><td><select data-f="rel">${Object.entries(REL).map(([k, v]) => `<option value="${k}"${k === l.relation ? ' selected' : ''}>${v}</option>`).join('')}</select></td><td style="font-size:13px">${l.to.map((c) => `<div><b>${esc(c)}</b> ${esc(toTxt(c))}</div>`).join('')}</td></tr>`;
      })
      .join('')}</tbody></table><datalist id="xwCodes">${X.toInd.map((i) => `<option value="${esc(i.code)}">`).join('')}</datalist>`;
    for (const inp of $('xwTable').querySelectorAll('input[data-f=to]')) inp.setAttribute('list', 'xwCodes');
  }
  $('xwTable').addEventListener('change', (e) => {
    const tr = e.target.closest('tr[data-c]');
    if (!tr) return;
    let l = X.links.find((x) => x.from === tr.dataset.c);
    if (!l) X.links.push((l = { from: tr.dataset.c, to: [], relation: 'none', note: '' }));
    if (e.target.dataset.f === 'to') {
      l.to = e.target.value.split(/[,،]/).map((x) => x.trim()).filter(Boolean);
      if (l.to.length && l.relation === 'none') l.relation = 'similar';
    } else l.relation = e.target.value;
    xwRender();
  });
  $('xwGrade').addEventListener('change', xwRender);
  async function xwLoad() {
    const a = xwArgs();
    if (!a.subject) return showError('ระบุวิชา');
    const r = await api('api/curriculum.php', Object.assign({ action: 'xwalk_get' }, a));
    X.links = r.data.links || [];
    X.fromInd = r.fromInd;
    X.toInd = r.toInd;
    $('xwNote').textContent = !r.fromInd.length || !r.toInd.length ? 'ยังไม่มีตัวชี้วัดวิชานี้ในฉบับใดฉบับหนึ่ง นำเข้าก่อน (แท็บ 3)' : `ตัวชี้วัดเดิม ${r.fromInd.length} / ใหม่ ${r.toInd.length} · จับคู่ที่บันทึกไว้ ${X.links.length}`;
    xwRender();
  }
  $('xwLoad').addEventListener('click', () => xwLoad().catch((e) => showError(e.message)));
  $('xwSuggest').addEventListener('click', async () => {
    $('xwSuggest').disabled = true;
    $('xwNote').textContent = 'AI กำลังเทียบ…';
    try {
      showError('');
      await xwLoad();
      const r = await api('api/curriculum.php', Object.assign({ action: 'xwalk_suggest', grade: $('xwGrade').value }, xwArgs()), true);
      const mine = new Set(r.links.map((l) => l.from));
      X.links = r.links.concat(X.links.filter((l) => !mine.has(l.from)));
      $('xwNote').textContent = 'AI เสนอแล้ว ตรวจและแก้ไขก่อนกดบันทึก';
      xwRender();
    } catch (e) {
      $('xwNote').textContent = '';
      showError(e.message);
    } finally {
      $('xwSuggest').disabled = false;
    }
  });
  $('xwSave').addEventListener('click', async () => {
    try {
      const r = await api('api/curriculum.php', Object.assign({ action: 'xwalk_save', links: X.links }, xwArgs()));
      X.links = r.links;
      $('xwNote').textContent = `บันทึกแล้ว ${r.links.length} รายการ (รหัสที่ไม่มีอยู่จริงในฉบับใดฉบับหนึ่งถูกตัดออก)`;
      xwRender();
    } catch (e) {
      showError(e.message);
    }
  });

  (async () => {
    try {
      await loadState();
      await showSubjects();
      tab(ls.get('ws_curTab') || 'ed');
    } catch (e) {
      showError(e.message);
    }
  })();
})();
