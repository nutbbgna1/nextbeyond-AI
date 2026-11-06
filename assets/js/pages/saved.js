(() => {
  'use strict';
  const { esc, fmtDate, api, GRADES, showError } = window.WS;
  const $ = (id) => document.getElementById(id);
  const TYPES = window.SHEET_TYPE_LABELS || {};
  const DIFF = { basic: 'พื้นฐาน', easy: 'ง่าย', medium: 'ปานกลาง', hard: 'ยาก', exam: 'แนวข้อสอบ', expert: 'ยากมาก', mix: 'ผสมระดับ' };
  const TERM = { 1: 'เทอม 1', 2: 'เทอม 2', 3: 'ฤดูร้อน' };
  const state = {
    items: [], folders: [], statuses: {}, trashCount: 0, trash: false, q: '',
    f: { grade: '', subject: '', folder: '', status: '' }, sel: new Set(), edit: null,
  };

  $('eGrade').innerHTML += GRADES.map((g) => `<option>${g}</option>`).join('');
  $('subjList').innerHTML = window.WS.allSubjects().map((s) => `<option value="${esc(s)}">`).join('');
  $('view').value = window.WS.ls.get('ws_savedView') || 'cards';

  /* ---------- โหลด ---------- */
  let seq = 0;
  async function load() {
    const my = ++seq;
    try {
      const r = await api('api/save.php', { action: 'list', trashed: state.trash, q: state.q });
      if (my !== seq) return;
      state.items = r.items;
      state.folders = r.folders;
      state.statuses = r.statuses;
      state.trashCount = r.trashCount;
      for (const id of [...state.sel]) if (!state.items.some((i) => i.id === id)) state.sel.delete(id);
      fillSelects();
      render();
    } catch (e) {
      $('list').textContent = 'โหลดรายการไม่สำเร็จ: ' + e.message;
    }
  }

  function fillSelects() {
    const keep = (id, html) => {
      const v = $(id).value;
      $(id).innerHTML = html;
      if ([...$(id).options].some((o) => o.value === v)) $(id).value = v;
    };
    keep('fDiff', '<option value="">ทุกระดับความยาก</option>' + [...new Set(state.items.flatMap((i) => i.difficulties))].map((d) => `<option value="${esc(d)}">${esc(DIFF[d] || d)}</option>`).join(''));
    keep('fYear', '<option value="">ทุกปีการศึกษา</option>' + [...new Set(state.items.map((i) => i.year).filter(Boolean))].sort().reverse().map((y) => `<option>${esc(y)}</option>`).join(''));
    keep('bulkFolder', '<option value="">ใส่ในโฟลเดอร์…</option>' + state.folders.map((f) => `<option value="${esc(f)}">${esc(f)}</option>`).join('') + '<option value="__new">＋ โฟลเดอร์ใหม่…</option>');
    keep('bulkStatus', '<option value="">ตั้งสถานะ…</option>' + Object.entries(state.statuses).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join(''));
    $('eStatus').innerHTML = Object.entries(state.statuses).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('');
  }

  /* ---------- ตัวกรอง ---------- */
  function visible() {
    const { grade, subject, folder, status } = state.f;
    const t = $('fType').value, d = $('fDiff').value, y = $('fYear').value, te = $('fTerm').value, le = $('fLesson').value;
    const ind = $('fInd').value.trim().toLowerCase();
    return state.items.filter((i) => {
      if (grade && i.grade !== grade) return false;
      if (subject && i.subject !== subject) return false;
      if (folder && !i.folders.includes(folder)) return false;
      if (status && i.status !== status) return false;
      if (t && !i.types.includes(t)) return false;
      if (d && !i.difficulties.includes(d)) return false;
      if (y && i.year !== y) return false;
      if (te && i.term !== te) return false;
      if (le === 'yes' && !i.hasLesson) return false;
      if (le === 'no' && i.hasLesson) return false;
      if (ind && !i.indicators.some((c) => c.toLowerCase().includes(ind))) return false;
      return true;
    });
  }

  function renderTree() {
    const by = {};
    for (const i of state.items) (by[i.grade || '(ไม่ระบุชั้น)'] ||= {})[i.subject || '(ไม่ระบุวิชา)'] = (by[i.grade || '(ไม่ระบุชั้น)'][i.subject || '(ไม่ระบุวิชา)'] || 0) + 1;
    const cnt = (g) => Object.values(by[g]).reduce((a, b) => a + b, 0);
    const order = [...GRADES, '(ไม่ระบุชั้น)'].filter((g) => by[g]);
    const { grade, subject } = state.f;
    let h = `<button data-g="" data-s="" class="${!grade && !subject ? 'on' : ''}">ทั้งหมด (${state.items.length})</button>`;
    for (const g of order) {
      const gv = g.startsWith('(') ? '' : g;
      h += `<button data-g="${esc(gv)}" data-s="" class="${grade === gv && !subject && gv ? 'on' : ''}">${esc(g)} (${cnt(g)})</button>`;
      for (const [s, n] of Object.entries(by[g])) {
        const sv = s.startsWith('(') ? '' : s;
        h += `<button class="sub2 ${grade === gv && subject === sv && (gv || sv) ? 'on' : ''}" data-g="${esc(gv)}" data-s="${esc(sv)}">${esc(s)} (${n})</button>`;
      }
    }
    $('tree').innerHTML = h;
    $('folders').innerHTML = state.folders.length
      ? state.folders
          .map((f) => `<div class="row" style="flex-wrap:nowrap;gap:2px"><button data-f="${esc(f)}" class="${state.f.folder === f ? 'on' : ''}" style="flex:1">📁 ${esc(f)} (${state.items.filter((i) => i.folders.includes(f)).length})</button><button class="ghost small" data-fren="${esc(f)}" title="เปลี่ยนชื่อ" style="width:auto;padding:3px 6px">✎</button><button class="ghost small" data-fdel="${esc(f)}" title="ลบโฟลเดอร์ (ใบงานไม่ถูกลบ)" style="width:auto;padding:3px 6px">✕</button></div>`)
          .join('')
      : '<div style="color:var(--muted);font-size:13px;padding:4px 8px">ยังไม่มีโฟลเดอร์</div>';
    $('statuses').innerHTML = Object.entries(state.statuses)
      .map(([k, v]) => `<button data-st="${k}" class="${state.f.status === k ? 'on' : ''}">${esc(v)} (${state.items.filter((i) => i.status === k).length})</button>`)
      .join('');
    $('trashCount').textContent = state.trashCount ? `(${state.trashCount})` : '';
    $('trashBtn').classList.toggle('on', state.trash);
  }

  const chip = (t, c = '') => `<span class="chip ${c}">${esc(t)}</span>`;
  function chipsOf(i) {
    return (
      (i.grade ? chip(i.grade) : '') + (i.subject ? chip(i.subject, 'gray') : '') + (i.unit ? chip(i.unit, 'gray') : '') +
      i.types.map((t) => chip(TYPES[t] || t, 'gray')).join('') + i.difficulties.map((d) => chip(DIFF[d] || d, 'amber')).join('') +
      (i.hasLesson ? chip('มีใบความรู้', 'green') : '') + (i.hasPassage ? chip('มีบทอ่าน', 'green') : '') +
      (i.indicators.length ? chip(`ตัวชี้วัด ${i.indicators.length}`, 'green') : '') +
      chip(`${i.year ? 'ปี ' + i.year : ''}${i.term ? ' ' + (TERM[i.term] || '') : ''}`.trim() || '—', 'gray') +
      i.folders.map((f) => chip('📁 ' + f)).join('')
    );
  }
  const actions = (i) =>
    state.trash
      ? `<button class="ghost small" data-restore="${esc(i.id)}">กู้คืน</button><button class="ghost small" data-purge="${esc(i.id)}">ลบถาวร</button>`
      : `<a class="btnlink" href="index.php?open=${esc(i.id)}">เปิดแก้</a><a class="btnlink ghost" href="book.php?add=${esc(i.id)}">เพิ่มลงเล่ม</a>${window.TA_EMBEDDED ? `<button class="small" data-send="${esc(i.id)}">🚀 ยิงเข้าคอร์ส</button>` : ''}<button class="ghost small" data-copy="${esc(i.id)}">ทำสำเนา</button><button class="ghost small" data-edit="${esc(i.id)}">แก้ข้อมูล</button><button class="ghost small" data-trash="${esc(i.id)}">ลบ</button>`;
  const statusSel = (i) =>
    `<select data-setst="${esc(i.id)}" style="padding:3px 6px;font-size:12px">${Object.entries(state.statuses).map(([k, v]) => `<option value="${k}"${i.status === k ? ' selected' : ''}>${esc(v)}</option>`).join('')}</select>`;

  function render() {
    renderTree();
    const list = visible();
    $('listTitle').firstChild.textContent = state.trash ? '🗑 ถังขยะ ' : 'ชุดใบงาน ';
    $('count').textContent = `(${list.length}/${state.items.length})`;
    if (!list.length) {
      $('list').innerHTML = `<div style="color:var(--muted);padding:10px 0">${state.items.length ? 'ไม่พบชุดที่ตรงกับตัวกรอง' : state.trash ? 'ถังขยะว่าง' : 'ยังไม่มีชุดใบงาน ไปสร้างที่หน้า “สร้างใบงาน” ระบบจะบันทึกให้อัตโนมัติ'}</div>`;
    } else if ($('view').value === 'table') {
      $('list').innerHTML =
        `<div style="overflow:auto"><table class="tbl"><thead><tr><th></th><th>ชื่อ</th><th>ชั้น/วิชา</th><th>ใบ</th><th>ปี/เทอม</th><th>สถานะ</th><th>บันทึกเมื่อ</th><th></th></tr></thead><tbody>` +
        list
          .map(
            (i) => `<tr><td><input type="checkbox" data-sel="${esc(i.id)}"${state.sel.has(i.id) ? ' checked' : ''}></td><td><strong>${esc(i.title)}</strong>${i.folders.map((f) => chip('📁 ' + f)).join('')}</td><td>${esc(i.grade)} ${esc(i.subject)}</td><td>${i.count}</td><td>${esc(i.year)} ${esc(TERM[i.term] || '')}</td><td>${state.trash ? esc(state.statuses[i.status] || '') : statusSel(i)}</td><td>${esc(fmtDate(i.savedAt))}</td><td><span class="row">${actions(i)}</span></td></tr>`,
          )
          .join('') +
        '</tbody></table></div>';
    } else {
      $('list').innerHTML = list
        .map(
          (i) => `<div class="doc-row"><label style="padding-top:2px"><input type="checkbox" data-sel="${esc(i.id)}"${state.sel.has(i.id) ? ' checked' : ''}></label>
          <div style="min-width:0;flex:1"><strong>${esc(i.title)}</strong><div>${chipsOf(i)}</div>
          ${i.preview ? `<div style="color:var(--muted);font-size:13px;margin-top:2px">“${esc(i.preview)}${i.preview.length >= 140 ? '…' : ''}”</div>` : ''}
          <div style="color:var(--muted);font-size:12px;margin-top:2px">${i.count} ใบ · บันทึกเมื่อ ${esc(fmtDate(i.savedAt))}</div></div>
          <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">${state.trash ? '' : statusSel(i)}<span class="row" style="justify-content:flex-end">${actions(i)}</span></div></div>`,
        )
        .join('');
    }
    $('bulk').classList.toggle('hidden', !state.sel.size);
    $('bulkInfo').textContent = `เลือก ${state.sel.size} ชุด`;
    for (const id of ['bulkFolder', 'bulkStatus', 'bulkBook', 'bulkBank', 'bulkZip', 'bulkTrash']) $(id).classList.toggle('hidden', state.trash);
    for (const id of ['bulkRestore', 'bulkPurge']) $(id).classList.toggle('hidden', !state.trash);
    $('selAll').checked = list.length > 0 && list.every((i) => state.sel.has(i.id));
  }

  /* ---------- เหตุการณ์ ---------- */
  $('tree').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    state.f.grade = b.dataset.g;
    state.f.subject = b.dataset.s;
    state.trash = false;
    load();
  });
  $('statuses').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    state.f.status = state.f.status === b.dataset.st ? '' : b.dataset.st;
    render();
  });
  $('folders').addEventListener('click', async (e) => {
    const f = e.target.closest('[data-f]');
    const ren = e.target.closest('[data-fren]');
    const del = e.target.closest('[data-fdel]');
    try {
      if (f) {
        state.f.folder = state.f.folder === f.dataset.f ? '' : f.dataset.f;
        state.trash = false;
        return load();
      }
      if (ren) {
        const to = window.prompt('ชื่อโฟลเดอร์ใหม่', ren.dataset.fren);
        if (to && to.trim()) {
          await api('api/save.php', { action: 'folders', op: 'rename', name: ren.dataset.fren, to });
          if (state.f.folder === ren.dataset.fren) state.f.folder = to.trim();
          load();
        }
      }
      if (del && window.confirm(`ลบโฟลเดอร์ “${del.dataset.fdel}”? (ใบงานในโฟลเดอร์ไม่ถูกลบ)`)) {
        await api('api/save.php', { action: 'folders', op: 'delete', name: del.dataset.fdel });
        if (state.f.folder === del.dataset.fdel) state.f.folder = '';
        load();
      }
    } catch (err) {
      showError(err.message);
    }
  });
  $('newFolder').addEventListener('click', async () => {
    const n = window.prompt('ชื่อโฟลเดอร์ใหม่ เช่น “สอบกลางภาค ม.2” หรือ “ห้อง ม.2/3”', '');
    if (!n || !n.trim()) return;
    try {
      await api('api/save.php', { action: 'folders', op: 'create', name: n });
      load();
    } catch (err) {
      showError(err.message);
    }
  });
  $('trashBtn').addEventListener('click', () => {
    state.trash = !state.trash;
    state.sel.clear();
    state.f = { grade: '', subject: '', folder: '', status: '' };
    load();
  });
  let qTimer = 0;
  $('q').addEventListener('input', () => {
    clearTimeout(qTimer);
    qTimer = setTimeout(() => {
      state.q = $('q').value.trim();
      load();
    }, 300);
  });
  for (const id of ['fType', 'fDiff', 'fYear', 'fTerm', 'fLesson', 'fInd']) $(id).addEventListener(id === 'fInd' ? 'input' : 'change', render);
  $('view').addEventListener('change', () => {
    window.WS.ls.set('ws_savedView', $('view').value);
    render();
  });
  $('selAll').addEventListener('change', () => {
    for (const i of visible()) $('selAll').checked ? state.sel.add(i.id) : state.sel.delete(i.id);
    render();
  });

  async function act(fn) {
    try {
      showError('');
      await fn();
      await load();
    } catch (e) {
      showError(e.message);
    }
  }
  $('list').addEventListener('change', (e) => {
    const s = e.target.closest('[data-sel]');
    if (s) {
      s.checked ? state.sel.add(s.dataset.sel) : state.sel.delete(s.dataset.sel);
      return render();
    }
    const st = e.target.closest('[data-setst]');
    if (st) act(() => api('api/save.php', { action: 'update', id: st.dataset.setst, status: st.value }));
  });
  $('list').addEventListener('click', (e) => {
    const g = (a) => {
      const el = e.target.closest(`[data-${a}]`);
      return el ? el.dataset[a] : null;
    };
    let id;
    if ((id = g('trash'))) return act(() => api('api/save.php', { action: 'trash', id }));
    if ((id = g('restore'))) return act(() => api('api/save.php', { action: 'restore', id }));
    if ((id = g('purge'))) return window.confirm('ลบถาวร กู้คืนไม่ได้ ยืนยัน?') && act(() => api('api/save.php', { action: 'purge', id }));
    if ((id = g('send'))) return window.LmsSend && window.LmsSend.open(id, (state.items.find((i) => i.id === id) || {}).title);
    if ((id = g('copy'))) return act(() => api('api/save.php', { action: 'copy', id }));
    if ((id = g('edit'))) return openEdit(state.items.find((i) => i.id === id));
  });

  /* ---------- แก้ข้อมูล ---------- */
  function openEdit(i) {
    if (!i) return;
    state.edit = i;
    $('editBox').classList.remove('hidden');
    $('eTitle').value = i.title.replace(/ · \d+ ใบ.*$/, '');
    $('eGrade').value = i.grade;
    $('eSubject').value = i.subject;
    $('eYear').value = i.year;
    $('eTerm').value = i.term;
    $('eStatus').value = i.status;
    $('eFolders').innerHTML = state.folders.length
      ? state.folders.map((f) => `<label style="font-size:13px;font-weight:400;display:flex;gap:4px;align-items:center"><input type="checkbox" value="${esc(f)}"${i.folders.includes(f) ? ' checked' : ''}> ${esc(f)}</label>`).join('')
      : '<span style="color:var(--muted);font-size:13px">ยังไม่มีโฟลเดอร์ (สร้างทางซ้ายมือ)</span>';
    $('editBox').scrollIntoView({ behavior: 'smooth' });
  }
  $('eCancel').addEventListener('click', () => $('editBox').classList.add('hidden'));
  $('eSave').addEventListener('click', () =>
    act(async () => {
      const i = state.edit;
      await api('api/save.php', {
        action: 'update', id: i.id, title: $('eTitle').value.trim(), grade: $('eGrade').value, subject: $('eSubject').value.trim(),
        year: $('eYear').value.trim(), term: $('eTerm').value, status: $('eStatus').value,
        folders: [...document.querySelectorAll('#eFolders input:checked')].map((x) => x.value),
      });
      $('editBox').classList.add('hidden');
    }),
  );

  /* ---------- ทำพร้อมกันหลายชุด ---------- */
  const ids = () => [...state.sel];
  $('bulkFolder').addEventListener('change', () => {
    let v = $('bulkFolder').value;
    if (!v) return;
    if (v === '__new') {
      v = (window.prompt('ชื่อโฟลเดอร์ใหม่', '') || '').trim();
      if (!v) return ($('bulkFolder').value = '');
    }
    act(() => api('api/save.php', { action: 'bulk', ids: ids(), op: 'folder_add', value: v }));
  });
  $('bulkStatus').addEventListener('change', () => {
    const v = $('bulkStatus').value;
    if (v) act(() => api('api/save.php', { action: 'bulk', ids: ids(), op: 'status', value: v }));
  });
  $('bulkTrash').addEventListener('click', () => act(async () => { await api('api/save.php', { action: 'bulk', ids: ids(), op: 'trash' }); state.sel.clear(); }));
  $('bulkRestore').addEventListener('click', () => act(async () => { await api('api/save.php', { action: 'bulk', ids: ids(), op: 'restore' }); state.sel.clear(); }));
  $('bulkPurge').addEventListener('click', () => window.confirm('ลบถาวร กู้คืนไม่ได้ ยืนยัน?') && act(async () => { await api('api/save.php', { action: 'bulk', ids: ids(), op: 'purge' }); state.sel.clear(); }));
  $('bulkBook').addEventListener('click', () => {
    location.href = 'book.php?add=' + encodeURIComponent(ids().join(','));
  });
  $('bulkBank').addEventListener('click', () => act(async () => {
    const r = await api('api/bank.php', { action: 'add_saved', ids: ids() });
    window.alert(`เก็บเข้าคลังข้อสอบแล้ว ${r.added} ข้อ (ข้ามที่ซ้ำ/ใช้รูปหรือบทอ่านร่วม ${r.skipped} ข้อ) รวมในคลัง ${r.total} ข้อ`);
  }));

  /* ส่งออก/นำเข้า zip: ไฟล์ .json ต่อชุด (ไม่รวมไฟล์ภาพ ภาพที่ขาดสร้างใหม่ได้จากปุ่ม “ลองสร้างภาพที่ขาดใหม่”) */
  $('bulkZip').addEventListener('click', () => act(async () => {
    if (!window.JSZip) await new Promise((ok, no) => { const sc = document.createElement('script'); sc.src = 'assets/vendor/jszip.min.js'; sc.onload = ok; sc.onerror = () => no(new Error('โหลด JSZip ไม่ได้')); document.head.appendChild(sc); });
    const zip = new window.JSZip();
    const manifest = [];
    for (const id of ids()) {
      const r = await api('api/save.php', { action: 'load', id });
      const d = r.data;
      zip.file(id + '.json', JSON.stringify(d));
      manifest.push({ id, title: d.title, savedAt: d.savedAt, sheets: (d.sheets || []).length });
    }
    zip.file('manifest.json', JSON.stringify({ app: 'ai-worksheet', version: 1, exportedAt: new Date().toISOString(), sets: manifest }, null, 1));
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'worksheets-' + new Date().toISOString().slice(0, 10) + '.zip';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  }));
  $('zipImport').addEventListener('click', () => $('zipFile').click());
  $('zipFile').addEventListener('change', () => act(async () => {
    const files = [...$('zipFile').files];
    $('zipFile').value = '';
    if (!files.length) return;
    if (!window.JSZip) await new Promise((ok, no) => { const sc = document.createElement('script'); sc.src = 'assets/vendor/jszip.min.js'; sc.onload = ok; sc.onerror = () => no(new Error('โหลด JSZip ไม่ได้')); document.head.appendChild(sc); });
    const docs = [];
    for (const f of files) {
      if (/\.zip$/i.test(f.name)) {
        const z = await window.JSZip.loadAsync(f);
        for (const name of Object.keys(z.files)) {
          if (z.files[name].dir || !/\.json$/i.test(name) || /manifest\.json$/i.test(name)) continue;
          try { docs.push(JSON.parse(await z.files[name].async('string'))); } catch {}
        }
      } else {
        try { const d = JSON.parse(await f.text()); if (Array.isArray(d.sets)) continue; docs.push(d); } catch {}
      }
    }
    let ok = 0;
    for (const d of docs) {
      if (!d || !Array.isArray(d.sheets)) continue;
      await api('api/save.php', { action: 'import', doc: d });
      ok++;
    }
    window.alert(ok ? `นำเข้า ${ok} ชุดแล้ว (เป็นชุดใหม่ ไม่ทับของเดิม)` : 'ไม่พบชุดใบงานในไฟล์ที่เลือก');
  }));

  load();
})();
