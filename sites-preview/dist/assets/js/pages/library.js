(() => {
  'use strict';
  const { esc, fmtDate, api, GRADES } = window.WS;
  // แสดงข้อผิดพลาดตรงกล่องอัปโหลดเลย (กล่องบนสุดของหน้าอาจอยู่นอกจอ จนเหมือน "ไม่มีอะไรเกิดขึ้น")
  const showError = (msg) => {
    window.WS.showError(msg);
    const el = document.getElementById('upErr');
    if (!el) return;
    el.textContent = msg || '';
    el.classList.toggle('hidden', !msg);
    if (msg) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };
  window.addEventListener('unhandledrejection', (e) => showError('เกิดข้อผิดพลาด: ' + ((e.reason && e.reason.message) || e.reason)));
  const $ = (id) => document.getElementById(id);
  const KINDS = window.LIB_KINDS;
  const RIGHTS = window.LIB_RIGHTS;
  const state = { items: [], filter: { grade: '', subject: '' }, q: '', editId: null, open: null };

  /* ---------- ฟอร์ม ---------- */
  $('kind').innerHTML = Object.entries(KINDS).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('');
  $('rights').innerHTML = Object.entries(RIGHTS).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('');
  $('grades').innerHTML = GRADES.map((g) => `<label style="font-size:13px;font-weight:400;display:flex;gap:4px;align-items:center"><input type="checkbox" value="${g}"> ${g}</label>`).join('');
  $('subjList').innerHTML = window.WS.allSubjects().map((s) => `<option value="${esc(s)}">`).join('');

  /* จับคู่ไฟล์เฉลยกับใบงานจากชื่อไฟล์ (ตัดคำว่า เฉลย/key/answer ออกแล้วเทียบ) */
  const baseName = (n) => String(n).replace(/\.[^.]+$/, '');
  const normName = (n) => baseName(n).toLowerCase().replace(/เฉลย|answers?|ans|key|solutions?/g, '').replace(/[\s._\-()\[\]]+/g, '');
  function pairKeys(works, keys) {
    const used = new Set();
    const pairs = works.map((w) => {
      const k = keys.find((x) => !used.has(x) && normName(x.name) === normName(w.name))
        || keys.find((x) => !used.has(x) && normName(x.name) && normName(w.name) && (normName(x.name).includes(normName(w.name)) || normName(w.name).includes(normName(x.name))));
      if (k) used.add(k);
      return k || null;
    });
    if (works.length === 1 && keys.length === 1) return { pairs: [keys[0]], left: [] };
    return { pairs, left: keys.filter((k) => !used.has(k)) };
  }

  const isPdf = (f) => !!f && (/\.pdf$/i.test(f.name) || f.type === 'application/pdf');

  /* ถอดข้อความจากตัวอักษรที่มีอยู่ในไฟล์ (ไม่ใช้ OCR) คืน [] ถ้าไม่มีข้อความ เช่น PDF สแกน */
  async function textOf(file, label, note) {
    const prog = (n, total) => { note.textContent = `${label}: ถอดข้อความ ${file.name} (หน้า ${n}/${total})…`; };
    return (await window.WSExtract.extract(file, prog)).pages;
  }

  /* ระบบไม่เก็บไฟล์ PDF ไว้บน Server: ไฟล์ที่เลือกในหน้านี้จะจำไว้ในหน่วยความจำของแท็บนี้เท่านั้น (เพื่อ OCR/เปิดดูทีหลังโดยไม่ต้องเลือกซ้ำ)
     ปิด/รีเฟรชหน้าแล้วหายไป ถึงตอนนั้นต้องเลือกไฟล์จากเครื่องอีกครั้ง (หรือดูผ่านลิงก์ Google Drive) */
  state.local = new Map();
  const localKey = (id, which) => `${id}|${which}`;
  const pickPdf = () => new Promise((res) => {
    const i = document.createElement('input');
    i.type = 'file';
    i.accept = '.pdf,application/pdf';
    i.onchange = () => res(i.files[0] || null);
    i.oncancel = () => res(null);
    i.click();
  });
  /* แหล่งไฟล์สำหรับถอดข้อความ: ไฟล์ในหน้านี้ → ดึงจาก Google Drive (ถ้ามีลิงก์และตั้งค่าไว้) → ให้เลือกจากเครื่อง */
  const SRV_CHUNK = 1.5 * 1024 * 1024;
  const b64 = (blob) => new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result).slice(String(fr.result).indexOf(',') + 1));
    fr.onerror = () => rej(new Error('อ่านไฟล์ไม่ได้'));
    fr.readAsDataURL(blob);
  });
  /** ฝากไฟล์ PDF ไว้บน Server ทีละก้อน */
  async function serverUpload(id, which, file, onProgress) {
    let off = 0;
    for (;;) {
      const part = file.slice(off, Math.min(off + SRV_CHUNK, file.size));
      const r = await api('api/library.php', { action: 'file_put', id, which, offset: off, total: file.size, data: await b64(part) });
      off += part.size;
      if (onProgress) onProgress(off, file.size);
      if (r.done || off >= file.size) return;
    }
  }
  const srvUrl = (id, which) => `library_file.php?id=${encodeURIComponent(id)}&which=${which}`;
  async function serverDownload(m, which, onProgress) {
    const r = await fetch(srvUrl(m.id, which), { credentials: 'same-origin' });
    if (!r.ok) throw new Error('ดึงไฟล์จาก Server ไม่ได้ (HTTP ' + r.status + ')');
    const len = Number(r.headers.get('Content-Length')) || 0;
    const rd = r.body && r.body.getReader ? r.body.getReader() : null;
    if (!rd) return new File([await r.blob()], m.filename || 'doc.pdf', { type: 'application/pdf' });
    const parts = [];
    let got = 0;
    for (;;) {
      const { done, value } = await rd.read();
      if (done) break;
      parts.push(value);
      got += value.length;
      if (onProgress && len) onProgress(got, len);
    }
    return new File(parts, (which === 'key' ? m.keyFilename : m.filename) || 'doc.pdf', { type: 'application/pdf' });
  }
  const hasServerFile = (m, which) => (which === 'key' ? m.keyFileSize : m.fileSize) > 0;
  /** ฝากไฟล์ใบงาน/เฉลย (PDF) ไว้บน Server คืนข้อความผิดพลาดที่ต้องแจ้ง (ไม่ throw เพื่อไม่ให้เอกสารหาย) */
  async function attachServer(id, doc, key, label, note) {
    const errs = [];
    for (const [which, f] of [['doc', doc], ['key', key]]) {
      if (!f) continue;
      if (!isPdf(f)) { errs.push(`${f.name}: เก็บบน Server ได้เฉพาะไฟล์ PDF`); continue; }
      try { await serverUpload(id, which, f, (a, b) => { note.textContent = `${label}: ฝากไฟล์${which === 'key' ? 'เฉลย' : ''}ไว้บน Server ${f.name} ${Math.round((a / b) * 100)}%`; }); }
      catch (e) { errs.push(`${f.name}: เก็บบน Server ไม่สำเร็จ · ${e.message}`); }
    }
    return errs;
  }

  async function getLocalFile(m, which, canPick, note, label) {
    const k = localKey(m.id, which);
    if (state.local.has(k)) return state.local.get(k);
    if (hasServerFile(m, which)) {
      try {
        const f = await serverDownload(m, which, (a, b) => { if (note) note.textContent = `${label || m.title}: ดึงไฟล์${which === 'key' ? 'เฉลย' : ''}จาก Server ${Math.round((a / b) * 100)}%`; });
        state.local.set(k, f);
        return f;
      } catch { /* ลอง Drive / เลือกไฟล์ต่อ */ }
    }
    const url = which === 'key' ? m.keyDriveUrl : m.driveUrl;
    let driveErr = '';
    if (url && window.GDrive && window.GDrive.configured()) {
      try {
        const f = await window.GDrive.download(url, (a, b) => { if (note) note.textContent = `${label || m.title}: ดึงไฟล์${which === 'key' ? 'เฉลย' : ''}จาก Google Drive ${Math.round((a / b) * 100)}%`; });
        state.local.set(k, f);
        return f;
      } catch (e) { driveErr = e.message; if (which === 'key') return null; }
    }
    if (!canPick) { if (driveErr) throw new Error(driveErr); return null; }
    const f = await pickPdf(); // ต้องเรียกตอนผู้ใช้เพิ่งกดปุ่ม (ก่อนมี await อื่น) เบราว์เซอร์จึงยอมเปิดหน้าต่างเลือกไฟล์
    if (f) state.local.set(k, f);
    return f;
  }
  const needsText = (m) => !(m.pages > 0);

  /* ถอดข้อความของเอกสาร: ลองอ่านตัวอักษรในไฟล์ก่อน ถ้าไม่มี (PDF สแกน) ค่อยใช้ OCR; force = ข้ามไปใช้ OCR เลย */
  async function extractOne(m, force, note, label, canPick) {
    const ocrProg = (what) => (n, total) => { note.textContent = `${label}: OCR ${what} (หน้า ${n}/${total}) ครั้งแรกจะโหลดตัวอ่านภาษาก่อน…`; };
    const file = await getLocalFile(m, 'doc', canPick, note, label);
    if (!file) throw new Error(canPick ? 'ยกเลิกการเลือกไฟล์' : 'ไฟล์ไม่ได้อยู่ในหน้านี้แล้ว (ไม่ได้เก็บบน Server) กดปุ่ม “⬆ เก็บไฟล์” ที่เล่มนี้เพื่อเลือกไฟล์ PDF จากเครื่อง (จะฝากไว้บน Server/Google Drive ให้ใช้ต่อได้)');
    let pages = force ? [] : await textOf(file, label, note);
    let mode = 'text';
    if (!pages.length) {
      pages = await window.WSExtract.ocrPdf(file, ocrProg(m.title));
      mode = 'ocr';
    }
    if (!pages.length) throw new Error('อ่านตัวอักษรไม่ได้ แม้ลอง OCR แล้ว (ภาพอาจไม่ชัด)');
    let keyPages = null;
    const kf = await getLocalFile(m, 'key', false, note, label); // เฉลย: ใช้ไฟล์ในหน้านี้ หรือดึงจาก Drive ถ้ามี
    if (kf && (force || !(m.keyPages > 0))) {
      let kp = force ? [] : await textOf(kf, `${label} เฉลย`, note);
      if (!kp.length) kp = await window.WSExtract.ocrPdf(kf, ocrProg('เฉลย ' + m.title));
      keyPages = kp.length ? kp : null;
    }
    await saveChunked({ id: m.id, textMode: mode }, pages, keyPages);
    return mode;
  }
  async function runExtract(ids, force) {
    const note = $('upNote');
    showError('');
    const fails = [];
    let done = 0;
    for (const [i, id] of ids.entries()) {
      const m = state.items.find((x) => x.id === id);
      if (!m) continue;
      try {
        await extractOne(m, force, note, `${i + 1}/${ids.length} ${m.title}`, ids.length === 1);
        done++;
      } catch (e) { fails.push(`${m.title}: ${e.message}`); }
    }
    note.textContent = `ถอดข้อความเสร็จ ${done} เล่ม` + (fails.length ? ` · ไม่สำเร็จ ${fails.length}` : '');
    if (fails.length) showError(fails.join('\n'));
    await load();
    if (state.open && ids.includes(state.open.meta.id)) openDoc(state.open.meta.id, state.tab);
  }

  /* ส่งหน้าเป็นก้อนๆ (ไฟล์ใหญ่ไม่ชนขีดจำกัดคำขอ) ก้อนแรกสร้างเอกสาร ก้อนต่อไปเติมต่อท้าย */
  const BATCH_CHARS = 1500000;
  function batches(pages) {
    const out = [];
    let cur = [];
    let n = 0;
    for (const p of pages) {
      if (cur.length && n + p.text.length > BATCH_CHARS) { out.push(cur); cur = []; n = 0; }
      cur.push(p);
      n += p.text.length;
    }
    if (cur.length) out.push(cur);
    return out;
  }
  async function saveChunked(base, pages, keyPages, onStep) {
    const pb = batches(pages);
    const kb = batches(keyPages || []);
    const r = await api('api/library.php', Object.assign({ action: 'save', pages: pb[0] }, kb[0] ? { keyPages: kb[0] } : {}, base));
    let full = false;
    const rest = [...pb.slice(1).map((p) => ({ pages: p })), ...kb.slice(1).map((p) => ({ keyPages: p }))];
    for (const [i, part] of rest.entries()) {
      if (onStep) onStep(i + 1, rest.length);
      const a = await api('api/library.php', Object.assign({ action: 'append', id: r.id }, part));
      full = full || a.full;
    }
    return { id: r.id, full };
  }

  /* ไม่ได้เลือกเทอม → เดาจากชื่อไฟล์ เช่น "…เทอม 1.pdf" / "ภาคเรียนที่ 2" */
  const guessTerm = (name) => {
    if ($('term').value) return {};
    const m = String(name).match(/(?:เทอม|ภาคเรียนที่?|ภาคเรียน)\s*([12])/);
    return m ? { term: m[1] } : {};
  };

  const pickedGrades = () => [...document.querySelectorAll('#grades input:checked')].map((x) => x.value);
  const formMeta = () => ({
    driveUrl: $('driveUrl').value.trim(), keyDriveUrl: $('keyDriveUrl').value.trim(), kind: $('kind').value, rights: $('rights').value, subject: $('subject').value.trim(), term: $('term').value, unit: $('unit').value.trim(), note: $('note').value.trim(), grades: pickedGrades(),
  });
  function setEdit(m) {
    state.editId = m ? m.id : null;
    $('upTitle').textContent = m ? `แก้ข้อมูลเอกสาร: ${m.title}` : 'เพิ่มเอกสาร';
    $('upBtn').textContent = m ? 'บันทึกการแก้ไข' : 'อัปโหลด';
    $('upCancel').classList.toggle('hidden', !m);
    $('files').disabled = !!m;
    $('keyRemoveRow').classList.toggle('hidden', !(m && m.keyPages));
    $('keyRemove').checked = false;
    $('keyHint').textContent = m
      ? (m.keyPages ? `เอกสารนี้มีเฉลยแล้ว (${m.keyFilename || m.keyPages + ' หน้า'}) · เลือกไฟล์ใหม่เพื่อแทนที่` : 'เลือกไฟล์เฉลยเพื่อเพิ่มให้เอกสารนี้')
      : 'อัปโหลดใบงานหลายไฟล์พร้อมกันได้ ระบบจับคู่เฉลยจากชื่อไฟล์ (เช่น “เศษส่วน.pdf” คู่กับ “เศษส่วน-เฉลย.pdf”) ถ้ามีใบงานไฟล์เดียวกับเฉลยไฟล์เดียวจะจับคู่ให้เลย';
    if (m) {
      $('kind').value = m.kind;
      $('rights').value = m.rights;
      $('subject').value = m.subject || '';
      $('term').value = m.term || '';
      $('driveUrl').value = m.driveUrl || '';
      $('keyDriveUrl').value = m.keyDriveUrl || '';
      if (m.driveUrl || m.keyDriveUrl) $('linkBox').open = true;
      $('unit').value = m.unit || '';
      $('note').value = m.note || '';
      for (const c of document.querySelectorAll('#grades input')) c.checked = (m.grades || []).includes(c.value);
      $('upBox').scrollIntoView({ behavior: 'smooth' });
    }
  }
  $('upCancel').addEventListener('click', () => setEdit(null));

  $('upBtn').addEventListener('click', async () => {
    showError('');
    const drv = ($('files').files.length || $('keyFiles').files.length) && useDrive();
    const srv = ($('files').files.length || $('keyFiles').files.length) && $('toServer').checked;
    const note = $('upNote');
    note.textContent = 'กำลังเริ่ม…';
    $('upBtn').disabled = true;
    try {
      if (state.editId) {
        const extra = {};
        const kf = $('keyFiles').files[0];
        if (kf && drv) Object.assign(extra, await pushToDrive(null, kf, 'เฉลย', note, Object.assign({}, formMeta(), { keyDriveUrl: '' })));
        if (kf) {
          const kp = !isPdf(kf) || $('autoText').checked ? await textOf(kf, 'เฉลย', note) : [];
          if (kp.length) { extra.keyPages = kp; extra.keyFilename = kf.name; } else if (!isPdf(kf)) throw new Error('ไม่พบข้อความในไฟล์เฉลย');
        } else if ($('keyRemove').checked) extra.removeKey = true;
        const prev = state.items.find((x) => x.id === state.editId);
        if (kf && srv) { const e2 = await attachServer(state.editId, null, kf, 'เฉลย', note); if (e2.length) throw new Error(e2.join('\n')); }
        await api('api/library.php', Object.assign({ action: 'save', id: state.editId }, formMeta(), extra));
        // เปลี่ยนชั้น/วิชา/เทอม → ย้ายไฟล์ใน Drive ไปโฟลเดอร์ใหม่ให้ตรงกัน (เฉพาะไฟล์ที่ระบบอัปโหลดไว้)
        if (prev && GD.configured()) {
          const np = GD.pathFor(formMeta()); const op = GD.pathFor(prev);
          if (np.join('/') !== op.join('/')) {
            let moved = 0;
            for (const u of [extra.keyDriveUrl || prev.keyDriveUrl, prev.driveUrl]) if (u && await GD.move(u, np)) moved++;
            if (moved) note.textContent = `ย้ายไฟล์ใน Drive ไปโฟลเดอร์ ${np.join(' / ')} แล้ว`;
          }
        }
        $('keyFiles').value = '';
        setEdit(null);
        if (!note.textContent.startsWith('ย้ายไฟล์')) note.textContent = 'บันทึกการแก้ไขแล้ว';
      } else {
        const files = [...$('files').files];
        const pasted = $('pasteText').value.trim();
        if (!files.length && !pasted) throw new Error('เลือกไฟล์หรือวางข้อความก่อน');
        const todo = files.map((f) => ({ name: f.name, file: f }));
        const keyPasted = $('pasteKey').value.trim();
        if (pasted) todo.push({ name: ($('pasteTitle').value.trim() || 'ข้อความที่วางเอง') + '.txt', text: pasted, keyText: keyPasted });
        const { pairs, left } = pairKeys(files, [...$('keyFiles').files]);
        files.forEach((_, i) => { todo[i].key = pairs[i]; });
        if (left.length) throw new Error('จับคู่ไฟล์เฉลยไม่ได้: ' + left.map((k) => k.name).join(', ') + ' (ตั้งชื่อให้ตรงกับใบงาน เช่น ชื่อใบงาน + “เฉลย”)');
        const auto = $('autoText').checked;
        let ok = 0;
        let noText = 0;
        let nDrive = 0;
        let nSrv = 0;
        const fails = [];
        for (const [i, t] of todo.entries()) {
          const label = `${i + 1}/${todo.length}`;
          note.textContent = `${label}: เริ่ม ${t.name}…`;
          try {
            const meta = Object.assign({ title: t.name.replace(/\.[^.]+$/, ''), filename: t.name }, formMeta(), guessTerm(t.name));
            if (todo.length > 1) { meta.driveUrl = ''; meta.keyDriveUrl = ''; } // ลิงก์ที่วางเองใช้ได้เมื่ออัปโหลดทีละเล่ม
            // Google Drive ก่อน (ถ้าขึ้น Drive ไม่ได้ ยังสร้างเอกสารต่อ และแจ้งเตือนให้เห็น) แล้วค่อยฝากสำเนาไว้บน Server
            if (drv && (t.file || t.key)) {
              try { Object.assign(meta, await pushToDrive(t.file, t.key, label, note, meta)); nDrive++; }
              catch (e) { fails.push(`${t.name}: ขึ้น Google Drive ไม่สำเร็จ · ${e.message}`); }
            }
            const docPdf = isPdf(t.file);
            const keyPdf = isPdf(t.key);
            // ถอดข้อความจากตัวอักษรในไฟล์ (ไม่ใช้ OCR) PDF ข้ามได้ถ้าไม่ติ๊ก ไฟล์ชนิดอื่นต้องถอดเพราะไม่ได้เก็บต้นฉบับ
            let pages = [];
            if (!t.file) pages = window.WSExtract.paginateText(t.text);
            else if (!docPdf || auto) pages = await textOf(t.file, label, note);
            let keyPages = [];
            if (t.key && (!keyPdf || auto)) keyPages = await textOf(t.key, label + ' เฉลย', note);
            else if (t.keyText) keyPages = window.WSExtract.paginateText(t.keyText);
            const keyName = t.key ? t.key.name : t.keyText ? 'เฉลย (วางเอง)' : '';
            if (!pages.length && !docPdf) throw new Error('ไม่พบข้อความในไฟล์ (ถ้าเป็นรูปภาพ ให้แปลงเป็น PDF แล้วอัปโหลดใหม่ เพื่อใช้ OCR)');
            if (pages.length) {
              note.textContent = `${label}: บันทึกข้อความ ${t.name} (${pages.length} หน้า)…`;
              const res = await saveChunked(Object.assign({}, meta, { textMode: 'text' }, keyName ? { keyFilename: keyName } : {}), pages, keyPages.length ? keyPages : null, (k, total) => { note.textContent = `${label}: บันทึก ${t.name} (ส่วนที่ ${k + 1}/${total + 1})…`; });
              if (res.full) fails.push(`${t.name}: ยาวเกินกว่าจะเก็บข้อความทั้งหมด เก็บเฉพาะส่วนแรก (ราว 3 ล้านตัวอักษร)`);
              if (docPdf) state.local.set(localKey(res.id, 'doc'), t.file);
              if (keyPdf) state.local.set(localKey(res.id, 'key'), t.key);
              if (srv) { const e3 = await attachServer(res.id, t.file, t.key, label, note); fails.push(...e3); if (!e3.length) nSrv++; }
            } else {
              // PDF สแกน (ไม่มีตัวอักษร): สร้างรายการไว้ก่อน จำไฟล์ไว้ในหน้านี้ แล้วค่อยกด “ถอดข้อความ / OCR” ทีหลัง
              const id = (await api('api/library.php', Object.assign({ action: 'create_shell' }, meta))).id;
              state.local.set(localKey(id, 'doc'), t.file);
              if (keyPdf) state.local.set(localKey(id, 'key'), t.key);
              if (keyPages.length) await api('api/library.php', { action: 'save', id, keyPages, keyFilename: keyName });
              if (srv) { const e3 = await attachServer(id, t.file, t.key, label, note); fails.push(...e3); if (!e3.length) nSrv++; }
              noText++;
            }
            ok++;
          } catch (e) {
            fails.push(`${t.name}: ${e.message}`);
          }
        }
        $('files').value = '';
        $('keyFiles').value = '';
        $('pasteKey').value = '';
        $('pasteText').value = '';
        $('pasteTitle').value = '';
        note.textContent = `เพิ่มแล้ว ${ok} ไฟล์` + (drv ? ` · ขึ้น Google Drive ${nDrive}` : '') + (srv ? ` · เก็บบน Server ${nSrv}` : '') + (noText ? ` · ${noText} ไฟล์ยังไม่มีข้อความ (PDF สแกน) กดปุ่ม “ถอดข้อความ / OCR” ที่รายการเมื่อพร้อม อย่ารีเฟรชหน้าก่อน ไม่งั้นต้องเลือกไฟล์ใหม่` : '') + (fails.length ? ` · ไม่สำเร็จ ${fails.length}: ${fails[0].slice(0, 160)}` : '');
        if (fails.length) showError(fails.join('\n'));
      }
      await load();
    } catch (e) {
      showError(e.message);
      note.textContent = '';
    } finally {
      $('upBtn').disabled = false;
    }
  });

  /* ---------- รายการ + หมวดหมู่ ---------- */
  async function load() {
    try {
      const r = await api('api/library.php', { action: 'list' });
      state.items = r.items;
      render();
    } catch (e) {
      $('docs').textContent = 'โหลดรายการไม่สำเร็จ: ' + e.message;
    }
    loadPassages();
  }

  function visible() {
    const { grade, subject } = state.filter;
    const q = state.q.toLowerCase();
    return state.items.filter((m) => {
      if (grade && !((m.grades || []).length === 0 || m.grades.includes(grade))) return false;
      if (subject && (m.subject || '') !== subject) return false;
      if (q && !String(m.title).toLowerCase().includes(q)) return false;
      return true;
    });
  }

  function renderTree() {
    const subjByGrade = {};
    for (const m of state.items) {
      const gs = (m.grades || []).length ? m.grades : ['(ทุกชั้น)'];
      for (const g of gs) (subjByGrade[g] ||= new Set()).add(m.subject || '(ทุกวิชา)');
    }
    const order = [...GRADES, '(ทุกชั้น)'].filter((g) => subjByGrade[g]);
    const on = (g, s) => (state.filter.grade === g && state.filter.subject === s ? ' on' : '');
    let h = `<button data-g="" data-s="" class="${!state.filter.grade && !state.filter.subject ? 'on' : ''}">ทั้งหมด (${state.items.length})</button>`;
    for (const g of order) {
      const gv = g === '(ทุกชั้น)' ? '' : g;
      h += `<button data-g="${esc(gv)}" data-s="" class="${on(gv, '').trim()}">${esc(g)}</button>`;
      for (const s of subjByGrade[g]) {
        const sv = s === '(ทุกวิชา)' ? '' : s;
        h += `<button class="sub2${on(gv, sv)}" data-g="${esc(gv)}" data-s="${esc(sv)}">${esc(s)}</button>`;
      }
    }
    $('tree').innerHTML = h;
  }
  $('tree').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    state.filter = { grade: b.dataset.g, subject: b.dataset.s };
    render();
  });
  $('q').addEventListener('input', () => {
    state.q = $('q').value.trim();
    render();
  });

  function render() {
    renderTree();
    const list = visible();
    const need = state.items.filter(needsText);
    $('ocrAll').classList.toggle('hidden', !need.length);
    $('ocrAll').textContent = `🔍 ถอดข้อความ / OCR ทั้งหมดที่ยังไม่ถอด (${need.length})`;
    $('docCount').textContent = `(${list.length}/${state.items.length})`;
    const chips = (m) => {
      const mode = m.textMode || (m.pages > 0 ? 'text' : '');
      return (m.fileSize > 0 ? `<span class="chip" title="เก็บไฟล์ต้นฉบับไว้บน Server (${mb(m.fileSize)})">Server</span>` : '')
        + (m.driveUrl ? '<span class="chip" title="มีไฟล์ต้นฉบับใน Google Drive">Drive</span>' : '')
        + (mode === 'ocr' ? '<span class="chip green" title="อ่านตัวอักษรจากภาพด้วย OCR แล้ว เก็บข้อความไว้ในระบบ">OCR แล้ว</span>'
          : mode === 'text' ? '<span class="chip gray" title="ถอดข้อความจากไฟล์แล้ว">มีข้อความ</span>'
            : '<span class="chip amber" title="ยังไม่ได้ถอดข้อความ AI ยังใช้เอกสารนี้ไม่ได้">ยังไม่ถอดข้อความ</span>');
    };
    $('docs').innerHTML = list.length
      ? list
          .map(
            (m) => `<div class="doc-row"><div style="min-width:0;flex:1"><strong>${esc(m.title)}</strong><div>
            <span class="chip">${esc(KINDS[m.kind] || m.kind)}</span>
            ${(m.grades || []).map((g) => `<span class="chip gray">${esc(g)}</span>`).join('') || '<span class="chip gray">ทุกชั้น</span>'}
            ${chips(m)}${m.keyPages || m.keyDriveUrl ? '<span class="chip green" title="เก็บเฉลยไว้กับเอกสารนี้">มีเฉลย</span>' : ''}
            ${m.subject ? `<span class="chip gray">${esc(m.subject)}</span>` : ''}${m.term ? `<span class="chip gray">เทอม ${esc(m.term)}</span>` : ''}${m.unit ? `<span class="chip gray">${esc(m.unit)}</span>` : ''}
            <span class="chip ${m.rights === 'publisher' ? 'amber' : 'green'}">${esc((RIGHTS[m.rights] || '').split(' (')[0])}</span>
            <span style="color:var(--muted);font-size:12px">${m.pages > 0 ? m.pages + ' หน้า · ' + Number(m.chars).toLocaleString('th-TH') + ' ตัวอักษร' : 'ยังไม่มีข้อความ'} · ${esc(fmtDate(m.createdAt))}</span></div></div>
            <span class="row">${needsText(m) ? `<button class="small" data-extract="${esc(m.id)}">ถอดข้อความ / OCR</button>` : ''}${!(m.fileSize > 0) || (GD.configured() && !m.driveUrl) ? `<button class="ghost small" data-todrive="${esc(m.id)}" title="เลือกไฟล์ PDF ต้นฉบับของเอกสารนี้ แล้วเก็บไว้บน Server${GD.configured() && !m.driveUrl ? 'และ Google Drive' : ''}">⬆ เก็บไฟล์</button>` : ''}<button class="ghost small" data-open="${esc(m.id)}">เปิด</button><button class="ghost small" data-edit="${esc(m.id)}">แก้ข้อมูล</button><button class="ghost small" data-del="${esc(m.id)}">ลบ</button></span></div>`,
          )
          .join('')
      : '<div style="color:var(--muted)">ยังไม่มีเอกสารในหมวดนี้</div>';
  }

  $('docs').addEventListener('click', async (e) => {
    const ex = e.target.closest('[data-extract]');
    if (ex) { ex.disabled = true; return runExtract([ex.dataset.extract], false); }
    const td = e.target.closest('[data-todrive]');
    if (td) return toDrive(td);
    const o = e.target.closest('[data-open]');
    const ed = e.target.closest('[data-edit]');
    const d = e.target.closest('[data-del]');
    try {
      if (o) return openDoc(o.dataset.open);
      if (ed) return setEdit(state.items.find((m) => m.id === ed.dataset.edit));
      if (d) {
        const m = state.items.find((x) => x.id === d.dataset.del);
        if (!window.confirm(`ลบเอกสาร “${m ? m.title : ''}” ออกจากคลัง? (ลบแล้วกู้คืนไม่ได้ รวมทั้งข้อความที่ถอด/OCR ไว้ ไฟล์ PDF ที่เก็บบน Server จะถูกลบด้วย ส่วนไฟล์ใน Google Drive ไม่ถูกลบ)`)) return;
        await api('api/library.php', { action: 'delete', id: d.dataset.del });
        if (state.open && state.open.meta.id === d.dataset.del) closeDoc();
        load();
      }
    } catch (err) {
      showError(err.message);
    }
  });

  /** เลือกไฟล์ PDF ต้นฉบับ (ถ้ายังไม่มีในหน้านี้) แล้วเก็บไว้บน Server และ/หรือ Google Drive ตามที่ติ๊กไว้และยังไม่มี */
  async function toDrive(btn) {
    const m = state.items.find((x) => x.id === btn.dataset.todrive);
    if (!m) return;
    showError('');
    const note = $('upNote');
    btn.disabled = true;
    try {
      const doc = await getLocalFile(Object.assign({}, m, { driveUrl: '', fileSize: 0 }), 'doc', true); // ต้องเลือกไฟล์จากเครื่อง
      if (!doc) return;
      const key = state.local.get(localKey(m.id, 'key')) || null;
      const done = [];
      const errs = [];
      if (GD.configured() && $('toDrive').checked && !m.driveUrl) {
        try { const links = await pushToDrive(doc, m.keyDriveUrl ? null : key, m.title, note, m); await api('api/library.php', Object.assign({ action: 'save', id: m.id }, links)); done.push('Google Drive'); }
        catch (e) { errs.push('Google Drive: ' + e.message); }
      }
      if ($('toServer').checked && !(m.fileSize > 0)) {
        const e2 = await attachServer(m.id, doc, key && !(m.keyFileSize > 0) ? key : null, m.title, note);
        if (e2.length) errs.push(...e2); else done.push('Server');
      }
      note.textContent = done.length ? `เก็บ “${m.title}” ไว้ที่ ${done.join(' และ ')} แล้ว` : '';
      if (errs.length) showError(errs.join('\n'));
      await load();
    } catch (e) { showError(e.message); } finally { btn.disabled = false; }
  }

  /* ---------- อ่านเอกสาร + เลือกข้อความเป็นบทอ่าน ---------- */
  async function openDoc(id, tab) {
    const r = await api('api/library.php', { action: 'get', id });
    state.open = r;
    const m = r.meta;
    $('viewBox').classList.remove('hidden');
    $('viewTitle').textContent = m.title;
    $('viewMeta').innerHTML = `<span class="chip">${esc(KINDS[m.kind] || '')}</span>` + (m.rights === 'publisher' ? '<span class="chip amber">ของสำนักพิมพ์/ผู้อื่น: ใส่ที่มาทุกครั้ง</span>' : '');
    state.tab = tab || (bookSrc(m, 'doc') ? 'book' : 'doc');
    drawViewer();
    $('selbar').classList.add('hidden');
    $('viewBox').scrollIntoView({ behavior: 'smooth' });
  }

  const TAB_LABEL = { book: 'ใบงาน (ดูเป็นเล่ม)', keybook: 'เฉลย (ดูเป็นเล่ม)', doc: 'ข้อความใบงาน', key: 'ข้อความเฉลย', both: 'ข้อความ ใบงาน + เฉลย' };
  const txtOf = (arr) => arr.map((p) => `— หน้า ${p.n} —\n${p.text}`).join('\n\n');

  function drawViewer() {
    const r = state.open;
    if (!r) return;
    const m = r.meta;
    const keyPages = r.keyPages || [];
    const tabs = [];
    if (bookSrc(m, 'doc')) tabs.push('book');
    if (bookSrc(m, 'key')) tabs.push('keybook');
    if (r.pages.length) tabs.push('doc');
    if (keyPages.length) tabs.push('key');
    if (r.pages.length && keyPages.length) tabs.push('both');
    if (!tabs.includes(state.tab)) state.tab = tabs[0] || 'doc';
    const t = state.tab;
    $('viewTabs').classList.toggle('hidden', tabs.length < 2);
    $('viewTabs').innerHTML = tabs.map((k) => `<button class="small${k === t ? '' : ' ghost'}" data-tab="${k}">${TAB_LABEL[k]}</button>`).join('');
    const isBook = t === 'book' || t === 'keybook';
    $('bookView').classList.toggle('hidden', !isBook);
    $('viewer').classList.toggle('hidden', isBook);
    $('selbar').classList.add('hidden');
    drawTextTools(isBook);
    if (isBook) { showBook(t === 'key' || t === 'keybook' ? 'key' : 'doc'); return; }
    const pg = (arr, label, cls) => arr.map((p) => `<span class="pg" data-page="${p.n}">— ${label} หน้า ${p.n} —</span><span ${cls ? '' : `data-page="${p.n}"`}>${esc(p.text)}</span>`).join('\n');
    $('viewer').innerHTML = !tabs.length ? '<span style="color:var(--muted)">เอกสารนี้ยังไม่มีข้อความ</span>'
      : t === 'key' ? pg(keyPages, 'เฉลย', true)
        : t === 'both' ? pg(r.pages, 'ใบงาน', false) + '\n\n══════ เฉลย ══════\n' + pg(keyPages, 'เฉลย', true)
          : pg(r.pages, 'ใบงาน', false);
  }

  /* แถบสถานะข้อความ: บอกว่าถอดแบบไหน, ปุ่มถอดข้อความ/OCR, ดาวน์โหลดข้อความ */
  function drawTextTools(isBook) {
    const r = state.open;
    const m = r.meta;
    const mode = m.textMode || (r.pages.length ? 'text' : '');
    const when = m.ocrAt ? ' เมื่อ ' + fmtDate(m.ocrAt) : '';
    const status = mode === 'ocr' ? `✓ อ่านด้วย OCR แล้ว${when} · เก็บข้อความไว้ในระบบแล้ว ไม่ต้อง OCR ซ้ำ (ผลอาจมีคำผิด ตรวจที่แท็บข้อความ)`
      : mode === 'text' ? '✓ ถอดข้อความจากไฟล์แล้ว เก็บไว้ในระบบ'
        : '○ ยังไม่ได้ถอดข้อความ (AI ยังใช้เอกสารนี้ไม่ได้)';
    const btns = [];
    btns.push(`<button class="small${r.pages.length ? ' ghost' : ''}" data-act="extract" title="อ่านไฟล์ PDF จากเครื่องคุณ ไม่ได้อัปโหลดไฟล์ไว้บน Server">${r.pages.length ? 'OCR ใหม่' : 'ถอดข้อความ / OCR'}</button>`);
    if (!isBook && state.tab !== 'both' && (state.tab === 'key' ? (r.keyPages || []) : r.pages).length) btns.push('<button class="ghost small" data-act="txt">⬇ ดาวน์โหลดข้อความ (.txt)</button>');
    $('textTools').classList.remove('hidden');
    $('textTools').innerHTML = `<span style="font-size:13px;color:var(--muted);flex:1">${esc(status)}</span>${btns.join('')}`;
  }
  $('textTools').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || !state.open) return;
    const m = state.open.meta;
    if (b.dataset.act === 'extract') {
      if (state.open.pages.length && !window.confirm('OCR ใหม่จะแทนที่ข้อความเดิมของเอกสารนี้ ทำต่อไหม?')) return;
      b.disabled = true;
      return runExtract([m.id], !!state.open.pages.length);
    }
    const arr = state.tab === 'key' ? state.open.keyPages : state.open.pages;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([txtOf(arr)], { type: 'text/plain;charset=utf-8' }));
    a.download = m.title.replace(/[\\/:*?"<>|]+/g, '_') + (state.tab === 'key' ? '-เฉลย' : '') + '.txt';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  /* ---------- ดูเป็นเล่ม (PDF ต้นฉบับ) ---------- */
  /* แหล่งที่ใช้เปิดดูเป็นเล่ม: ลิงก์ Google Drive ของครู (ถาวร) หรือไฟล์ที่เลือกไว้ในหน้านี้ (ชั่วคราว) */
  function bookSrc(m, which) {
    const url = which === 'key' ? m.keyDriveUrl : m.driveUrl;
    const f = state.local.get(localKey(m.id, which));
    if (f) return { file: f, drive: url || '' };
    if (hasServerFile(m, which)) return { server: true, drive: url || '' };
    return url ? { drive: url } : null;
  }
  const driveEmbed = (u) => {
    const id = (String(u).match(/\/d\/([\w-]+)/) || String(u).match(/[?&]id=([\w-]+)/) || [])[1];
    return id ? `https://drive.google.com/file/d/${id}/preview` : '';
  };
  async function showBook(which) {
    const m = state.open.meta;
    const box = $('bookView');
    const src = bookSrc(m, which);
    const myTok = (state.bookTok = (state.bookTok || 0) + 1);
    state.book = null;
    if (!src) { box.innerHTML = '<div style="padding:14px;color:var(--muted)">ยังไม่มีไฟล์ให้เปิดดู ใส่ลิงก์ Google Drive ได้ที่ปุ่ม “แก้ข้อมูล”</div>'; return; }
    if (src.drive && !src.file && !src.server) {
      const emb = driveEmbed(src.drive);
      box.innerHTML = `<div class="book-bar"><span style="font-size:13px;color:var(--muted)">แสดงจาก Google Drive ของคุณ (ต้องล็อกอิน Google ที่มีสิทธิ์ หรือตั้งลิงก์เป็น “ทุกคนที่มีลิงก์”)</span><span class="book-sp"></span><a class="btnlink small" href="${esc(src.drive)}" target="_blank" rel="noopener">เปิดใน Drive ↗</a></div>`
        + (emb ? `<iframe src="${esc(emb)}" class="book-frame" allow="autoplay" referrerpolicy="no-referrer"></iframe>` : '<div style="padding:14px;color:var(--muted)">ลิงก์นี้เปิดฝังในหน้านี้ไม่ได้ (เช่น ลิงก์โฟลเดอร์) กด “เปิดใน Drive” แทน</div>');
      return;
    }
    box.innerHTML = `<div class="book-bar">
        <button class="ghost small" data-bk="prev" title="หน้าก่อนหน้า (←)">◀</button>
        <input type="number" id="bkPage" min="1" value="1" aria-label="หน้า"><span id="bkTotal"></span>
        <button class="ghost small" data-bk="next" title="หน้าถัดไป (→)">▶</button>
        <span class="book-sp"></span>
        <button class="ghost small" data-bk="out" title="ย่อ">−</button><button class="ghost small" data-bk="fit" title="พอดีความกว้าง">พอดีจอ</button><button class="ghost small" data-bk="in" title="ขยาย">＋</button>
      </div><div style="padding:4px 10px;font-size:12px;color:var(--muted);background:#fff">${src.server || hasServerFile(m, which) ? 'แสดงจากไฟล์ที่เก็บบน Server' : 'แสดงจากไฟล์ที่เลือกไว้ในหน้านี้ (ยังไม่ได้เก็บบน Server) กด “⬆ เก็บไฟล์” ที่รายการเพื่อเก็บไว้เปิดดูได้ตลอด'}${src.drive ? ` · <a href="${esc(src.drive)}" target="_blank" rel="noopener">เปิดใน Google Drive ↗</a>` : ''}</div><div class="book-scroll" id="bkScroll"><span style="color:var(--muted)">กำลังเปิดไฟล์…</span></div>`;
    try {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'assets/vendor/pdf.worker.min.js';
      if (src.server) {
        src.file = await serverDownload(m, which, (a, b) => { const sc = $('bkScroll'); if (sc) sc.firstChild.textContent = `กำลังดึงไฟล์จาก Server ${Math.round((a / b) * 100)}%`; });
        state.local.set(localKey(m.id, which), src.file);
      }
      const pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(await src.file.arrayBuffer()) }).promise;
      if (myTok !== state.bookTok) return;
      state.book = { which, pdf, page: 1, zoom: 1, token: 0 };
      $('bkTotal').textContent = '/ ' + pdf.numPages;
      $('bkPage').max = pdf.numPages;
      await renderBook();
    } catch (e) {
      $('bkScroll').innerHTML = `<div class="error">เปิดไฟล์ไม่ได้: ${esc(e.message)}</div>`;
    }
  }
  async function renderBook() {
    const b = state.book;
    if (!b) return;
    const tok = ++b.token;
    const page = await b.pdf.getPage(b.page);
    const wrap = $('bkScroll');
    if (!wrap) return;
    const base = page.getViewport({ scale: 1 });
    const scale = Math.max(0.2, ((wrap.clientWidth - 16) / base.width) * b.zoom);
    const dpr = window.devicePixelRatio || 1;
    const vp = page.getViewport({ scale: scale * dpr });
    const cv = document.createElement('canvas');
    cv.width = Math.round(vp.width);
    cv.height = Math.round(vp.height);
    cv.style.width = Math.round(vp.width / dpr) + 'px';
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, cv.width, cv.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    if (tok !== b.token) return; // มีการสั่งวาดหน้าใหม่แล้ว
    wrap.innerHTML = '';
    wrap.appendChild(cv);
    $('bkPage').value = b.page;
  }
  function bookGo(d) {
    const b = state.book;
    if (!b) return;
    b.page = Math.min(b.pdf.numPages, Math.max(1, d));
    renderBook();
  }
  $('bookView').addEventListener('click', (e) => {
    const k = e.target.closest('[data-bk]');
    const b = state.book;
    if (!k || !b) return;
    const a = k.dataset.bk;
    if (a === 'prev') bookGo(b.page - 1);
    else if (a === 'next') bookGo(b.page + 1);
    else {
      b.zoom = a === 'in' ? Math.min(4, b.zoom * 1.25) : a === 'out' ? Math.max(0.4, b.zoom / 1.25) : 1;
      renderBook();
    }
  });
  $('bookView').addEventListener('change', (e) => { if (e.target.id === 'bkPage') bookGo(Number(e.target.value) || 1); });
  $('bookView').addEventListener('keydown', (e) => {
    if (e.target.id === 'bkPage') return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); bookGo((state.book || {}).page + 1); }
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); bookGo((state.book || {}).page - 1); }
  });
  $('viewTabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (!b) return;
    state.tab = b.dataset.tab;
    drawViewer();
  });
  function closeDoc() {
    state.open = null;
    state.book = null;
    state.bookTok = (state.bookTok || 0) + 1;
    $('viewBox').classList.add('hidden');
  }
  $('viewClose').addEventListener('click', closeDoc);

  let selected = null;
  function readSelection() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !state.open) return null;
    const range = sel.getRangeAt(0);
    if (!$('viewer').contains(range.commonAncestorContainer)) return null;
    const text = sel.toString().replace(/\r/g, '').trim();
    if (text.length < 20) return null;
    const startEl = range.startContainer.nodeType === 1 ? range.startContainer : range.startContainer.parentElement;
    const pg = startEl && startEl.closest('[data-page]');
    return { text, page: pg ? Number(pg.dataset.page) : 0 };
  }
  document.addEventListener('selectionchange', () => {
    const s = readSelection();
    if (s) {
      selected = s;
      $('selInfo').textContent = `เลือกแล้ว ${s.text.length.toLocaleString('th-TH')} ตัวอักษร (หน้า ${s.page || '-'})`;
      $('selbar').classList.remove('hidden');
    }
  });
  $('selSave').addEventListener('mousedown', (e) => e.preventDefault()); // กันการเลือกหลุดตอนกดปุ่ม
  $('selSave').addEventListener('click', async () => {
    if (!selected || !state.open) return;
    try {
      const m = state.open.meta;
      await api('api/library.php', {
        action: 'passage_save', title: $('selTitle').value.trim(), text: selected.text, docId: m.id, docTitle: m.title, page: selected.page,
        rights: m.rights, grades: m.grades, subject: m.subject,
      });
      $('selTitle').value = '';
      selected = null;
      $('selbar').classList.add('hidden');
      window.getSelection().removeAllRanges();
      loadPassages();
    } catch (e) {
      showError(e.message);
    }
  });

  $('tryBtn').addEventListener('click', async () => {
    const q = $('trySearch').value.trim();
    if (!q) return;
    try {
      const m = state.open ? state.open.meta : null;
      const r = await api('api/library.php', { action: 'search', q, docIds: m ? [m.id] : [], grade: '', subject: '' });
      $('tryOut').innerHTML = r.hits.length
        ? r.hits.map((h) => `<div style="padding:6px 0;border-bottom:1px solid #eee"><span class="chip gray">${esc(h.title)} หน้า ${h.page}</span> <span class="chip">คะแนน ${h.score.toFixed(2)}</span><div style="white-space:pre-wrap">${esc(h.text.slice(0, 300))}${h.text.length > 300 ? '…' : ''}</div></div>`).join('')
        : 'ไม่พบท่อนที่เกี่ยวข้องในเอกสารที่เปิดอยู่';
    } catch (e) {
      showError(e.message);
    }
  });

  /* ---------- บทอ่านที่เก็บไว้ ---------- */
  async function loadPassages() {
    try {
      const r = await api('api/library.php', { action: 'passages' });
      $('pasCount').textContent = r.items.length ? `(${r.items.length})` : '';
      $('passages').innerHTML = r.items.length
        ? r.items
            .map(
              (p) => `<div class="doc-row"><div style="min-width:0;flex:1"><strong>${esc(p.title)}</strong>
              <div style="color:var(--muted);font-size:13px">${esc(p.docTitle || '')}${p.page ? ' หน้า ' + p.page : ''} · ${p.text.length.toLocaleString('th-TH')} ตัวอักษร</div>
              <div style="white-space:pre-wrap;font-size:13px;margin-top:4px">${esc(p.text.slice(0, 160))}${p.text.length > 160 ? '…' : ''}</div></div>
              <button class="ghost small" data-pdel="${esc(p.id)}">ลบ</button></div>`,
            )
            .join('')
        : '<div style="color:var(--muted)">ยังไม่มีบทอ่าน เปิดเอกสารแล้วลากเลือกข้อความเพื่อเก็บไว้</div>';
    } catch (e) {
      $('passages').textContent = 'โหลดไม่สำเร็จ: ' + e.message;
    }
  }
  $('passages').addEventListener('click', async (e) => {
    const d = e.target.closest('[data-pdel]');
    if (!d) return;
    try {
      await api('api/library.php', { action: 'passage_delete', id: d.dataset.pdel });
      loadPassages();
    } catch (err) {
      showError(err.message);
    }
  });

  /* ---------- พื้นที่ที่ใช้ + บีบอัด ---------- */
  const mb = (n) => (n / 1048576).toLocaleString('th-TH', { maximumFractionDigits: 1 }) + ' MB';
  /* ข้อความในคลังบีบอัดอัตโนมัติ: เอกสารใหม่บีบตอนบันทึก เอกสารเก่าที่ยังไม่บีบจะถูกบีบให้เองตอนเปิดหน้านี้ (ไฟล์ PDF ใน Google Drive ไม่ถูกแตะต้อง) */
  let autoCompacted = false;
  async function loadUsage() {
    try {
      const r = await api('api/library.php', { action: 'usage' });
      const u = r.usage;
      const fileTxt = r.fileCount ? `ไฟล์ PDF ต้นฉบับบน Server ${r.fileCount} ไฟล์ ${mb(r.fileBytes)}` : 'ยังไม่มีไฟล์ PDF ต้นฉบับบน Server';
      if (!u && !r.fileCount) { $('usageBox').classList.add('hidden'); return; }
      $('usageBox').classList.remove('hidden');
      const base = (u ? `ข้อความในคลังใช้พื้นที่ฐานข้อมูล ${mb(u.stored)} (ข้อความจริง ${mb(u.original)} · บีบอัดอัตโนมัติ) · ` : '') + fileTxt;
      $('usageText').textContent = base;
      const need = u && u.stored >= u.original * 0.7 && u.original >= 200000;
      $('compactBtn').classList.toggle('hidden', !need || !autoCompacted); // ปุ่มมือใช้เมื่ออัตโนมัติไม่สำเร็จเท่านั้น
      if (need && !autoCompacted) {
        autoCompacted = true;
        $('usageText').textContent = base + ' · กำลังบีบอัดเอกสารเก่าอัตโนมัติ…';
        try { await api('api/library.php', { action: 'compact' }); } catch { /* ปุ่มมือจะโผล่ให้ */ }
        loadUsage();
      }
    } catch { $('usageBox').classList.add('hidden'); }
  }
  $('compactBtn').addEventListener('click', async () => {
    $('compactBtn').disabled = true;
    $('usageText').textContent = 'กำลังบีบอัด…';
    try {
      const r = await api('api/library.php', { action: 'compact' });
      $('usageText').textContent = `บีบอัดแล้ว: ${mb(r.before.stored)} → ${mb(r.after.stored)}`;
    } catch (e) { showError(e.message); } finally { $('compactBtn').disabled = false; }
  });

  $('ocrAll').addEventListener('click', () => {
    $('ocrAll').disabled = true;
    runExtract(state.items.filter(needsText).map((m) => m.id), false).finally(() => { $('ocrAll').disabled = false; });
  });

  /* ---------- Google Drive (ผ่าน Apps Script ของโรงเรียน) ---------- */
  const GD = window.GDrive;
  state.driveCanEdit = false;
  const driveOn = () => GD.configured();
  const useDrive = () => GD.configured() && $('toDrive').checked;
  function drawDrive() {
    const st = GD.status();
    $('driveDot').classList.toggle('on', st.configured);
    $('driveText').textContent = !st.configured
      ? (state.driveCanEdit ? 'ยังไม่ได้ตั้งค่า · ไปที่เมนู “ตั้งค่า AI” เพื่อเชื่อมต่อ (ทำครั้งเดียว)' : 'ยังไม่ได้ตั้งค่า · ให้ผู้ดูแลระบบตั้งค่า Google Drive ก่อน')
      : `พร้อมใช้งาน${st.email ? ' · เก็บใน Drive ของ ' + st.email : ''} · จัดโฟลเดอร์ให้เอง: ชั้น / วิชา / เทอม${st.v && st.v < 3 ? ' · ⚠ สคริปต์เป็นรุ่นเก่า (ยังไม่จัดโฟลเดอร์/ยังดึงไฟล์มาอ่านไม่ได้) ให้แอดมินอัปเดตที่ ตั้งค่า AI' : ''}`;
    $('drivePing').classList.toggle('hidden', !st.configured);
    $('driveSetupBtn').classList.toggle('hidden', !state.driveCanEdit || st.configured);
    $('driveFolder').classList.toggle('hidden', !st.configured || !st.folderUrl);
    if (st.folderUrl) $('driveFolder').href = st.folderUrl;
    $('toDrive').disabled = !st.configured;
    $('toDriveHint').textContent = st.configured ? '· สำรองไว้นอกเว็บ จัดโฟลเดอร์ ชั้น / วิชา / เทอม ตามที่เลือกไว้ด้านบน' : '· ยังใช้ไม่ได้: ยังไม่ได้เชื่อม Google Drive (ผู้ดูแลระบบตั้งค่าที่เมนู “ตั้งค่า AI”) ตอนนี้ไฟล์จะไม่ถูกส่งขึ้น Drive';
    $('storeNote').textContent = '';
    if (!st.configured) $('linkBox').open = true; // ยังไม่ได้ตั้งค่า Drive = วางลิงก์เองเป็นทางเดียว
    else if (!$('driveUrl').value && !$('keyDriveUrl').value) $('linkBox').open = false;
    if (state.items.length) render();
  }
  GD.onChange(drawDrive);
  $('drivePing').addEventListener('click', async () => {
    showError('');
    $('drivePing').disabled = true;
    $('driveText').textContent = 'กำลังทดสอบ…';
    try { await GD.ping(); drawDrive(); } catch (e) { drawDrive(); showError(e.message); } finally { $('drivePing').disabled = false; }
  });
  (async () => {
    try {
      const r = await api('api/library.php', { action: 'drive_config' });
      state.driveCanEdit = !!r.canEdit;
      GD.init(r);
      if (r.scriptUrl && !GD.status().email) GD.ping().catch(() => {});
    } catch { $('driveText').textContent = 'ตรวจการตั้งค่า Google Drive ไม่ได้'; }
  })();

  /** อัปโหลดไฟล์ใบงาน/เฉลยขึ้น Drive แล้วคืน {driveUrl?, keyDriveUrl?} (ไม่ทับลิงก์ที่มีอยู่แล้ว) */
  async function pushToDrive(doc, key, label, note, meta) {
    const out = {};
    const path = GD.pathFor(meta || {});
    const prog = (what, f) => (a, b) => { note.textContent = `${label}: อัปโหลด${what}ขึ้น Google Drive ${f.name} ${Math.round((a / b) * 100)}%`; };
    if (doc && !(meta && meta.driveUrl)) out.driveUrl = await GD.upload(doc, prog('', doc), path);
    if (key && !(meta && meta.keyDriveUrl)) out.keyDriveUrl = await GD.upload(key, prog('เฉลย', key), path);
    return out;
  }

  load();
  loadUsage();
  const _up = $('upBtn');
  new MutationObserver(() => { if (!_up.disabled) loadUsage(); }).observe(_up, { attributes: true, attributeFilter: ['disabled'] });
})();
