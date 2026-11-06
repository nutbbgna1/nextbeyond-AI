(() => {
  'use strict';
  const { esc, api, showError } = window.WS;
  const $ = (id) => document.getElementById(id);
  const PL = { gemini: 'Google Gemini', openai: 'OpenAI', openrouter: 'OpenRouter' };
  const KEYHELP = { gemini: 'aistudio.google.com/apikey', openai: 'platform.openai.com/api-keys', openrouter: 'openrouter.ai/keys' };
  const st = { s: null, loaded: {} };

  const provOpts = (v, blank) => `<option value="">${blank}</option>` + Object.entries(PL).map(([k, l]) => `<option value="${k}"${k === v ? ' selected' : ''}>${l}</option>`).join('');

  function renderKeys() {
    $('keys').innerHTML = Object.keys(PL).map((p) => {
      const k = st.s.keys[p];
      const badge = k.source === 'settings' ? `<span class="sok">✔ ตั้งไว้ที่นี่ (${esc(k.hint)})</span>` : k.source === 'config' ? `<span class="sok">✔ ใช้คีย์จาก config.php (${esc(k.hint)})</span>` : '<span class="sbad">✗ ยังไม่มีคีย์</span>';
      return `<div class="skey" data-p="${p}"><div><b>${PL[p]}</b><div class="sub" style="margin:0;font-size:11px">สร้างคีย์: ${KEYHELP[p]}</div></div><div style="font-size:13px">${badge}${k.source === 'settings' ? ` <button class="ghost small" data-clear="${p}">ล้างคีย์ที่ตั้งที่นี่</button>` : ''}</div><input type="password" autocomplete="off" data-key="${p}" placeholder="ใส่คีย์ใหม่ (เว้นว่าง = ไม่เปลี่ยน)"></div>`;
    }).join('');
  }

  /** ช่องตั้งค่า 1 ชุด (ค่าเริ่มต้น หรือหนึ่งเมนู) */
  function profileFields(id, p, opts) {
    const blank = id === 'default' ? 'ตาม config.php / ที่เลือกในหน้าใบงาน' : 'ตามค่าเริ่มต้น';
    const textPart = opts.text === false ? '' : `
      <label>ผู้ให้บริการ (ข้อความ)<select data-f="textProvider">${provOpts(p.textProvider, blank)}</select></label>
      <label>โมเดลสร้างเนื้อหา<input type="text" data-f="textModel" value="${esc(p.textModel)}" autocomplete="off"></label>
      ${opts.review ? `<label>โมเดลตรวจทาน (ถ้ามี)<input type="text" data-f="reviewModel" value="${esc(p.reviewModel)}" autocomplete="off"></label>` : ''}`;
    const imgPart = opts.image ? `
      <label>ผู้ให้บริการ (ภาพ)<select data-f="imageProvider">${provOpts(p.imageProvider, blank)}</select></label>
      <label>โมเดลภาพ<input type="text" data-f="imageModel" value="${esc(p.imageModel)}" autocomplete="off"></label>` : '';
    return `<div class="sgrid">${textPart}${imgPart}</div><div class="seff" data-eff="${id}"></div>${opts.text === false ? '' : `<div class="row" style="margin-top:6px"><button class="ghost small" data-test="${id}">ทดสอบการเชื่อมต่อ</button><span class="seff" data-testres="${id}" style="margin:0"></span></div>`}`;
  }
  function render() {
    renderKeys();
    $('defBox').dataset.id = 'default';
    $('defBox').innerHTML = profileFields('default', st.s.default, { review: true, image: true });
    $('feats').innerHTML = st.s.meta.map((m) => `<div class="sfeat" data-id="${m.id}"><h4>${esc(m.name)}</h4><div class="d">${esc(m.desc)}</div>${profileFields(m.id, st.s.features[m.id], m.image ? { text: false, image: true } : { review: m.id === 'sheet' })}</div>`).join('');
    refresh();
  }

  function readBox(box) {
    const o = { textProvider: '', textModel: '', reviewModel: '', imageProvider: '', imageModel: '' };
    box.querySelectorAll('[data-f]').forEach((el) => { o[el.dataset.f] = el.value.trim(); });
    return o;
  }
  function collect() {
    const def = readBox($('defBox'));
    const features = {};
    document.querySelectorAll('#feats .sfeat').forEach((b) => { features[b.dataset.id] = readBox(b); });
    return { default: def, features };
  }
  function cfgModel(prov, which) {
    return ((st.s.configModels || {})[prov] || {})[which] || '';
  }
  /** ค่าที่จะถูกใช้จริงของเมนูหนึ่ง (จำลองตามกติกาเดียวกับฝั่งเซิร์ฟเวอร์) */
  function effective(id, c) {
    const d = c.default, f = id === 'default' ? { textProvider: '', textModel: '', reviewModel: '', imageProvider: '', imageModel: '' } : c.features[id];
    const cp = st.s.configProviders || {};
    let tp = d.textProvider, tm = d.textModel, rm = d.reviewModel, ip = d.imageProvider, im = d.imageModel;
    if (f.textProvider) { tp = f.textProvider; tm = f.textModel; rm = f.reviewModel; } else { tm = f.textModel || tm; rm = f.reviewModel || rm; }
    if (f.imageProvider) { ip = f.imageProvider; im = f.imageModel; } else { im = f.imageModel || im; }
    const tpEff = tp || cp.text || 'gemini';
    const ipEff = ip || cp.image || 'gemini';
    return {
      tp: tpEff, tpSet: !!tp, tm: tm || cfgModel(tpEff, 'text') || (tpEff === 'openrouter' ? '— (เลือกในหน้าใบงาน)' : ''),
      rm: rm || cfgModel(tpEff, 'review') || '', ip: ipEff, im: im || cfgModel(ipEff, 'image') || (ipEff === 'openrouter' ? '— (เลือกในหน้าใบงาน)' : ''),
    };
  }
  function refresh() {
    const c = collect();
    document.querySelectorAll('[data-eff]').forEach((el) => {
      const id = el.dataset.eff;
      const e = effective(id, c);
      const meta = id === 'default' ? { image: true, review: true } : (st.s.meta.find((m) => m.id === id) || {});
      const isImg = meta.image;
      const parts = [];
      if (!isImg) parts.push(`ข้อความ: <b>${PL[e.tp]}</b> · ${esc(e.tm || 'โมเดลตาม config.php')}${meta.review || id === 'sheet' ? ` · ตรวจทาน: ${esc(e.rm || 'ตาม config.php')}` : ''}`);
      if (isImg || id === 'default') parts.push(`ภาพ: <b>${PL[e.ip]}</b> · ${esc(e.im || 'โมเดลตาม config.php')}`);
      el.innerHTML = '➜ ใช้จริง — ' + parts.join(' | ');
    });
    // ชุดรายชื่อโมเดลของแต่ละช่อง ตามผู้ให้บริการที่ใช้จริง
    document.querySelectorAll('.sfeat').forEach((box) => {
      const id = box.dataset.id || 'default';
      const e = effective(id, c);
      box.querySelectorAll('input[data-f$=Model]').forEach((inp) => {
        const img = inp.dataset.f === 'imageModel';
        const prov = img ? e.ip : e.tp;
        inp.setAttribute('list', `dl-${prov}-${img ? 'image' : 'text'}`);
        const f = inp.dataset.f;
        inp.placeholder = f === 'imageModel' ? (cfgModel(prov, 'image') || 'พิมพ์/เลือกชื่อโมเดล') : f === 'reviewModel' ? (cfgModel(prov, 'review') || 'ว่าง = ตามค่าเริ่มต้น') : (cfgModel(prov, 'text') || 'พิมพ์/เลือกชื่อโมเดล');
      });
    });
  }
  document.addEventListener('input', (e) => { if (e.target.closest('.sfeat')) refresh(); });
  document.addEventListener('change', (e) => { if (e.target.closest('.sfeat')) refresh(); });

  function fillDatalists(prov, kind, rows) {
    const dl = $(`dl-${prov}-${kind}`);
    if (dl) dl.innerHTML = rows.map((m) => `<option value="${esc(m.id)}">${esc(m.name || '')}</option>`).join('');
  }
  document.addEventListener('click', async (e) => {
    const L = e.target.closest('[data-load]');
    const T = e.target.closest('[data-test]');
    const C = e.target.closest('[data-clear]');
    try {
      if (C) {
        if (!window.confirm('ล้างคีย์ ' + PL[C.dataset.clear] + ' ที่ตั้งไว้ที่นี่? (จะกลับไปใช้ config.php ถ้ามี)')) return;
        await api('api/settings.php', { action: 'save', ...collect(), clearKeys: [C.dataset.clear] });
        await load();
      }
      if (L) {
        const p = L.dataset.load;
        L.disabled = true;
        $('loadNote').textContent = 'กำลังนำเข้ารายชื่อโมเดล ' + PL[p] + '…';
        let n = 0;
        for (const kind of ['text', 'image']) {
          const r = await api('api/settings.php', { action: 'models', provider: p, kind });
          fillDatalists(p, kind, r.models);
          n += r.count;
        }
        $('loadNote').textContent = `นำเข้า ${PL[p]} แล้ว ${n} โมเดล คลิกช่องโมเดลเพื่อเลือก`;
        L.disabled = false;
      }
      if (T) {
        const id = T.dataset.test, c = collect(), eff = effective(id, c);
        const out = document.querySelector(`[data-testres="${id}"]`);
        out.className = 'seff';
        out.textContent = 'กำลังทดสอบ…';
        T.disabled = true;
        try {
          const r = await api('api/settings.php', { action: 'test', provider: eff.tp, model: eff.tm.startsWith('—') ? '' : eff.tm });
          out.innerHTML = r.ok ? `<span class="sok">✔ ใช้งานได้ (${r.ms} ms) ตอบ “${esc(r.reply)}”</span>` : '<span class="sbad">✗ ตอบกลับผิดรูปแบบ</span>';
        } catch (er) {
          out.innerHTML = `<span class="sbad">✗ ${esc(er.message)}</span>`;
        }
        T.disabled = false;
      }
    } catch (er) {
      showError(er.message);
      document.querySelectorAll('[data-load]').forEach((b) => { b.disabled = false; });
      $('loadNote').textContent = '';
    }
  });

  $('save').addEventListener('click', async () => {
    showError('');
    const keys = {};
    document.querySelectorAll('[data-key]').forEach((i) => { if (i.value.trim()) keys[i.dataset.key] = i.value.trim(); });
    $('save').disabled = true;
    try {
      await api('api/settings.php', { action: 'save', ...collect(), keys });
      $('saveNote').textContent = 'บันทึกแล้ว ' + new Date().toLocaleTimeString('th-TH');
      await load();
    } catch (e) {
      showError(e.message);
    } finally {
      $('save').disabled = false;
    }
  });

  async function load() {
    st.s = await api('api/settings.php', { action: 'get' });
    render();
  }

  /* ---------- Google Drive (Apps Script) ---------- */
  const GD = window.GDrive;
  const dr = { cfg: null, canEdit: false };
  function drawDrive() {
    const st = GD.status();
    const need = !st.configured;
    $('driveDot').classList.toggle('on', st.configured);
    $('driveText').textContent = need
      ? (dr.canEdit ? 'ยังไม่ได้ตั้งค่า · ทำตามขั้นตอนด้านล่าง' : 'ยังไม่ได้ตั้งค่า · เฉพาะผู้ดูแลระบบ (Admin) ที่ตั้งค่าได้')
      : `เชื่อมต่อแล้ว${st.email ? ' · เก็บใน Drive ของ ' + st.email : ''}` + (st.v && st.v < 6 ? ' · ⚠ สคริปต์เป็นรุ่นเก่า (ยังดึงวิดีโอบันทึกจาก Meet ไม่ได้ หรือใช้ Google Calendar ไม่ครบ) กด “เปลี่ยนลิงก์ / ตั้งค่าใหม่” คัดลอกโค้ดใหม่ไปวางแทน รัน authorize แล้ว Deploy → Manage deployments → New version' : '');
    $('driveSetup').classList.toggle('hidden', !(dr.canEdit && (need || dr.open)));
    $('drivePing').classList.toggle('hidden', need);
    $('driveTest').classList.toggle('hidden', need);
    $('driveEdit').classList.toggle('hidden', !(dr.canEdit && !need && !dr.open));
    $('driveClear').classList.toggle('hidden', !(dr.canEdit && !need));
    $('driveFolder').classList.toggle('hidden', need || !st.folderUrl);
    if (st.folderUrl) $('driveFolder').href = st.folderUrl;
  }
  GD.onChange(drawDrive);
  $('driveEdit').addEventListener('click', () => { dr.open = true; drawDrive(); });
  $('driveCopy').addEventListener('click', async () => {
    const t = $('driveCode');
    try { await navigator.clipboard.writeText(t.value); } catch { t.select(); document.execCommand('copy'); }
    $('driveCopy').textContent = 'คัดลอกแล้ว ✓';
    setTimeout(() => { $('driveCopy').textContent = 'คัดลอกโค้ด'; }, 2000);
  });
  $('drivePing').addEventListener('click', async () => {
    showError('');
    $('drivePing').disabled = true;
    $('driveText').textContent = 'กำลังทดสอบ…';
    try { await GD.ping(); } catch (e) { showError(e.message); } finally { $('drivePing').disabled = false; drawDrive(); }
  });
  $('driveTest').addEventListener('click', async () => {
    showError('');
    const box = $('driveTestRes');
    box.classList.remove('hidden');
    box.textContent = 'กำลังทดสอบ… (ไฟล์เล็ก ใช้เวลาไม่กี่วินาที)';
    $('driveTest').disabled = true;
    try {
      const steps = await GD.selfTest();
      box.innerHTML = steps.map((x) => `<div>${x.ok ? '<span class="sok">✔</span>' : '<span class="sbad">✗</span>'} ${esc(x.name)}${x.ok ? '' : ' · <span class="sbad">' + esc(x.v) + '</span>'}</div>`).join('')
        + (steps.every((x) => x.ok) ? '<div class="sub" style="margin-top:6px">ผ่านทุกขั้น: เปิด Drive ดูโฟลเดอร์ “ผู้ช่วยครู AI - คลังเอกสาร / ทดสอบระบบ” จะเห็นไฟล์ “ทดสอบระบบ.txt” (ลบทิ้งได้) ถ้าไม่เห็นไฟล์ แปลว่าเปิดคนละบัญชีกับที่ติดตั้งสคริปต์ ตรวจอีเมลด้านบน</div>' : '<div class="sub" style="margin-top:6px">ติดที่ขั้นที่ ✗ แก้ตามข้อความ แล้วลองใหม่ (ส่วนมากเพราะยังไม่ได้ Deploy เป็น Web app หรือยังไม่ได้ Authorize)</div>');
      drawDrive();
    } finally { $('driveTest').disabled = false; }
  });
  $('driveCfgSave').addEventListener('click', async () => {
    showError('');
    const u = $('driveUrlCfg').value.trim();
    $('driveCfgSave').disabled = true;
    try {
      if (!u) throw new Error('วางลิงก์ Web app URL ก่อน');
      if (!/^https:\/\/script\.google\.com\/(a\/macros\/[\w.-]+|macros)\/s\/[\w-]{20,}\/exec$/.test(u)) throw new Error('ลิงก์ไม่ถูกต้อง: ต้องเป็น Web app URL ที่ขึ้นต้นด้วย https://script.google.com/macros/s/ และลงท้ายด้วย /exec (ไม่ใช่ลิงก์หน้าแก้โค้ด)');
      $('driveText').textContent = 'กำลังทดสอบสคริปต์…';
      await GD.ping(u);
      const r = await api('api/library.php', { action: 'drive_config_save', scriptUrl: u });
      GD.init({ scriptUrl: r.scriptUrl, secret: dr.cfg.secret });
      dr.open = false;
    } catch (e) { showError(e.message); } finally { $('driveCfgSave').disabled = false; drawDrive(); }
  });
  $('calSave').addEventListener('click', async () => {
    showError('');
    try {
      const id = $('calId').value.trim();
      const r = await api('api/library.php', { action: 'drive_config_save', calendarId: id });
      $('calNote').textContent = 'บันทึกแล้ว: ' + (r.calendarId || 'primary') + ' · แชร์ปฏิทินนี้ให้บัญชีที่ติดตั้งสคริปต์ (สิทธิ์แก้ไขกิจกรรม) แล้วเปิดหน้าปฏิทินใน LMS เพื่อซิงค์';
    } catch (e) { showError(e.message); }
  });
  $('driveClear').addEventListener('click', async () => {
    if (!window.confirm('ยกเลิกการเชื่อมต่อ Google Drive? (ไฟล์ใน Drive และลิงก์ที่บันทึกไว้ในคลังยังอยู่ครบ แต่จะอัปโหลดไฟล์ใหม่ไม่ได้จนกว่าจะตั้งค่าใหม่)')) return;
    showError('');
    try {
      await api('api/library.php', { action: 'drive_config_save', scriptUrl: '' });
      try { localStorage.removeItem('ta_gdrive_info'); } catch { /* ไม่เป็นไร */ }
      GD.init({ scriptUrl: '', secret: dr.cfg.secret });
      $('driveUrlCfg').value = '';
    } catch (e) { showError(e.message); }
  });
  (async () => {
    try {
      const r = await api('api/library.php', { action: 'drive_config' });
      dr.cfg = r; dr.canEdit = !!r.canEdit;
      $('driveCode').value = r.code || '';
      $('driveUrlCfg').value = r.scriptUrl || '';
      $('calId').value = r.calendarId && r.calendarId !== 'primary' ? r.calendarId : '';
      $('calNote').textContent = r.lastSync ? 'ซิงค์ล่าสุด ' + new Date(r.lastSync * 1000).toLocaleString('th-TH') : '';
      GD.init(r);
      if (r.scriptUrl && !GD.status().email) GD.ping().catch(() => {});
      if (location.hash === '#gdrive') $('gdrive').scrollIntoView();
    } catch { $('driveText').textContent = 'ตรวจการตั้งค่า Google Drive ไม่ได้'; }
  })();

  load().catch((e) => showError(e.message));
})();
