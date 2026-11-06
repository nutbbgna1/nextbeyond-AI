(() => {
  'use strict';

  /* ------------------------------------------------------------------ */
  /*  ค่าคงที่และฟังก์ชันช่วย                                             */
  /* ------------------------------------------------------------------ */
  const $ = (id) => document.getElementById(id);
  const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const LETTERS = ['ก', 'ข', 'ค', 'ง', 'จ', 'ฉ'];
  const FATAL = ['NO_KEY', 'BAD_KEY', 'NO_CREDIT', 'QUOTA', 'MODEL_NOT_FOUND', 'MODEL_UNSUPPORTED', 'NO_MODEL', 'AUTH', 'FORBIDDEN'];
  const IMAGE_CONCURRENCY = 2; // สร้างภาพพร้อมกันได้กี่ภาพ (กันเรียกถี่เกินโควตาต่อนาที)
  const MAX_ATTEMPTS = 3; // สร้างใบงานใหม่ได้กี่รอบถ้าตรวจไม่ผ่าน
  const TYPE_LABEL = Object.fromEntries(window.SHEET_TYPES.map((t) => [t.id, t.label]));
  const imageKey = (p) => String(p).trim().toLowerCase();

  class ApiError extends Error {
    constructor(message, code, retryAfter) {
      super(message);
      this.code = code;
      this.retryAfter = Number(retryAfter) || 0;
    }
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ปุ่ม "หยุด": ยกเลิกคำขอที่ค้างอยู่ทั้งหมดของรอบนี้ (ใบที่กำลังสร้างจะขึ้น "หยุดแล้ว" ให้ลบ/สร้างใหม่เป็นรายใบได้) */
  let ctl = null;
  let stopped = false;
  function beginRun() {
    ctl = new AbortController();
    stopped = false;
  }

  function waitNote(msg) {
    const el = $('waitNote');
    if (el) el.textContent = msg || '';
  }

  /** เรียก API พร้อมลองใหม่เมื่อ Google หนาแน่น (503) หรือโควตาเต็มชั่วคราว (429) โดยรอตามเวลาที่ Google สั่ง */
  async function api(url, body, tries = 4) {
    for (let i = 0; ; i++) {
      try {
        const r = await apiOnce(url, body, true);
        waitNote('');
        return r;
      } catch (e) {
        const retryable = ['OVERLOADED', 'RATE_LIMIT'].includes(e.code);
        // ถ้า Google สั่งให้รอนานเกิน 90 วินาที (เช่นโควตารายวัน) ไม่รอ แจ้งผู้ใช้ทันที
        if (!retryable || i >= tries - 1 || e.retryAfter > 90) {
          waitNote('');
          throw e;
        }
        const ms = Math.min(60000, Math.max(6000 * (i + 1), e.retryAfter * 1000 + 1500));
        for (let left = Math.ceil(ms / 1000); left > 0; left--) {
          if (stopped) {
            waitNote('');
            throw new ApiError('หยุดแล้ว', 'ABORT');
          }
          waitNote(`รอโควตาของ Google ${left} วินาที แล้วจะลองใหม่อัตโนมัติ (ครั้งที่ ${i + 2}/${tries})`);
          await sleep(1000);
        }
        waitNote('');
      }
    }
  }

  /** ผู้ให้บริการที่เลือกบนหน้าเว็บ แนบไปกับทุกคำขอ */
  function providers() {
    const p = { textProvider: $('textProvider').value, imageProvider: $('imageProvider').value };
    if (p.textProvider === 'openrouter' || p.imageProvider === 'openrouter') {
      p.orModels = { text: $('orText').value.trim(), review: $('orReview').value.trim(), image: $('orImage').value.trim() };
    }
    return p;
  }

  /* ---------- OpenRouter: นำเข้ารายชื่อโมเดล ---------- */
  const orState = { text: [], image: [], loaded: false };
  function orLabel(m) {
    const price = m.free ? 'ฟรี' : m.in != null ? `$${m.in}/${m.out}` : '';
    return [m.name, m.ctx ? Math.round(m.ctx / 1000) + 'k' : '', price, m.structured ? 'JSON✓' : ''].filter(Boolean).join(' · ');
  }
  function orRender() {
    const free = $('orFree').checked;
    const fill = (id, list) => {
      $(id).innerHTML = list
        .filter((m) => !free || m.free)
        .map((m) => `<option value="${esc(m.id)}">${esc(orLabel(m))}</option>`)
        .join('');
    };
    fill('orTextList', orState.text);
    fill('orImageList', orState.image);
  }
  function orCheckNote() {
    const note = $('orNote');
    const t = orState.text.find((m) => m.id === $('orText').value.trim());
    if (t && !t.structured) {
      note.textContent = 'โมเดลเนื้อหาที่เลือกไม่ได้ระบุว่ารองรับ JSON schema ระบบจะใช้โหมดสำรอง (อาจผิดรูปแบบบ่อยขึ้น) แนะนำโมเดลที่มี JSON✓';
      note.style.color = '#7a5b00';
    } else if (orState.loaded) {
      note.textContent = `นำเข้าแล้ว: โมเดลข้อความ ${orState.text.length} รายการ, โมเดลภาพ ${orState.image.length} รายการ (JSON✓ = รองรับ schema, ราคา $ ต่อ 1 ล้าน token เข้า/ออก)`;
      note.style.color = '';
    }
  }
  async function orImport(refresh) {
    const btn = $('orImport');
    btn.disabled = true;
    $('orNote').textContent = 'กำลังนำเข้ารายชื่อโมเดล…';
    try {
      const [t, i] = await Promise.all([
        apiOnce('api/models.php', { provider: 'openrouter', kind: 'text', refresh: !!refresh }),
        apiOnce('api/models.php', { provider: 'openrouter', kind: 'image', refresh: !!refresh }).catch(() => ({ models: [] })),
      ]);
      orState.text = t.models || [];
      orState.image = i.models || [];
      orState.loaded = true;
      orRender();
      orCheckNote();
    } catch (e) {
      $('orNote').textContent = 'นำเข้าไม่สำเร็จ: ' + (e.message || e);
      $('orNote').style.color = '#b00020';
    } finally {
      btn.disabled = false;
    }
  }
  function orToggle() {
    const on = $('textProvider').value === 'openrouter' || $('imageProvider').value === 'openrouter';
    if ($('orBox')) $('orBox').classList.toggle('hidden', !on);
    if (on && !orState.loaded && $('orImport')) orImport(false);
  }

  async function apiOnce(url, body, cancellable = false) {
    body = Object.assign({}, providers(), body);
    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'worksheet' },
        body: JSON.stringify(body),
        signal: cancellable && ctl ? ctl.signal : undefined,
      });
    } catch (e) {
      if ((cancellable && stopped) || (e && e.name === 'AbortError')) throw new ApiError('หยุดแล้ว', 'ABORT');
      throw new ApiError('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจว่า Apache กำลังทำงานอยู่', 'NETWORK');
    }
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new ApiError(
        res.status === 404 ? 'ไม่พบไฟล์ของโปรแกรมที่ต้องใช้ (' + String(url).replace(/\?.*$/, '') + ') ไฟล์อาจยังก๊อปมาไม่ครบ — เปิดเมนู “🩺 ตรวจระบบ” เพื่อดูว่าขาดไฟล์ไหน'
        : res.status === 403 || res.status === 500 ? 'เซิร์ฟเวอร์เปิดไฟล์ไม่ได้ (HTTP ' + res.status + ') มักเกิดจากสิทธิ์ไฟล์ — เปิดเมนู “🩺 ตรวจระบบ” จะมีคำสั่งแก้ให้ก๊อปไปรันใน Terminal'
        : 'เซิร์ฟเวอร์ตอบกลับผิดรูปแบบ (ดู PHP error log): ' + text.replace(/<[^>]+>/g, ' ').trim().slice(0, 160),
        'BAD_RESPONSE',
      );
    }
    if (!res.ok) throw new ApiError(data.error || 'HTTP ' + res.status, data.code, data.retryAfter);
    return data;
  }

  const { seeded, shuffledIdx } = window.WSRender;


  /* ------------------------------------------------------------------ */
  /*  สถานะ                                                               */
  /* ------------------------------------------------------------------ */
  const state = {
    sheets: [], // { plan, status: pending|working|done|error, sheet, warnings, error }
    images: {}, // key -> { status: loading|done|error, url, error }
    view: 'both',
    busy: false,
    skipReview: false, // โควตาโมเดลตรวจทานเต็ม: ข้ามขั้นตรวจทานที่เหลือ
    setId: null, // รหัสชุดที่บันทึกบนเซิร์ฟเวอร์ (ได้ตอนบันทึกครั้งแรก)
    lpId: '', // แผนการจัดการเรียนรู้ที่ใช้เป็นแกน (ถ้ามี)
    lpIdea: -1, // เลือกใบงานข้อเดียวจากแผน (ใช้ครั้งเดียวตอนวางแผน)
    baseTitle: '', // ชื่อชุด (คงที่ตลอดแม้สร้างเพิ่มด้วยหัวข้ออื่น)
    inlineImages: false, // เซิร์ฟเวอร์เก็บไฟล์ภาพไม่ได้ ใช้ภาพแบบ inline แทน
  };
  const queue = [];
  const requested = new Set();
  let activeImages = 0;

  /* ------------------------------------------------------------------ */
  /*  เทมเพลตหน้า A4 (พอร์ตมาจาก SheetView)                              */
  /* ------------------------------------------------------------------ */
  function imgHTML(prompt, cls) {
    if (!prompt || !String(prompt).trim()) return '';
    const st = state.images[imageKey(prompt)];
    if (st && st.status === 'done' && st.url) return `<img class="${cls}" src="${esc(st.url)}" alt="">`;
    const inner =
      st && st.status === 'error'
        ? `<span class="no-print" style="cursor:pointer" data-retry="${esc(prompt)}">ภาพไม่สำเร็จ<br>กดลองใหม่</span>`
        : 'กำลังสร้างภาพ…';
    return `<div class="qi-ph ${cls}" title="${esc((st && st.error) || '')}">${inner}</div>`;
  }

  const R = window.WSRender;
  /** ค่าหัวกระดาษ (ใช้ชั้น/วิชาของใบนั้นๆ) */
  function headerFor(s) {
    return {
      school: $('hSchool').value.trim(),
      course: $('hCourse').value.trim(),
      teacher: $('hTeacher').value.trim(),
      minutes: $('hMinutes').value.trim(),
      subject: s.subject || $('subject').value,
      grade: s.grade || $('grade').value,
    };
  }
  const renderOpts = (s, extra) => Object.assign({ style: s.style || 'kid', figureMode: s.figureMode || 'code', header: headerFor(s), showInd: s.showInd !== false }, extra || {});
  const sheetHTML = (s, number, answers) => R.sheetHTML(s.sheet, number, answers, imgHTML, renderOpts(s));
  const promptsOf = (s) => (s.sheet ? R.imagePrompts(s.sheet, renderOpts(s), s.lesson) : []);

  function pageHTML(i) {
    const s = state.sheets[i];
    const canRegen = ['done', 'error', 'stopped'].includes(s.status) || (s.status === 'pending' && !state.busy);
    const tools =
      `<div class="page-tools no-print"><span style="margin-right:auto;font-weight:600">ใบที่ ${i + 1}: ${esc(s.plan.topic)} (${esc(
        TYPE_LABEL[s.plan.type] || s.plan.type,
      )})</span>` +
      (canRegen ? `<button class="ghost small" data-regen="${i}"${state.busy ? ' disabled' : ''}>${s.status === 'pending' ? 'สร้างใบนี้' : 'สร้างใบนี้ใหม่'}</button>` : '') +
      (s.status === 'done' && s.lessonStatus !== 'working'
        ? s.lesson
          ? `<button class="ghost small" data-lesson="${i}"${state.busy ? ' disabled' : ''} title="สร้างใบความรู้ของใบนี้ใหม่">↻ ใบความรู้</button><button class="ghost small" data-dellesson="${i}"${state.busy ? ' disabled' : ''}>ลบใบความรู้</button>`
          : `<button class="ghost small" data-lesson="${i}"${state.busy ? ' disabled' : ''} title="สร้างใบความรู้ (บทเรียน) ไว้ก่อนใบงานนี้">＋ ใบความรู้</button>`
        : '') +
      `<button class="ghost small" data-move="${i}:-1" title="เลื่อนขึ้น"${state.busy || i === 0 ? ' disabled' : ''}>▲</button>` +
      `<button class="ghost small" data-move="${i}:1" title="เลื่อนลง"${state.busy || i === state.sheets.length - 1 ? ' disabled' : ''}>▼</button>` +
      `<button class="ghost small" data-delsheet="${i}" title="ลบใบนี้ออกจากชุด"${state.busy ? ' disabled' : ''}>ลบ</button>` +
      '</div>';
    const warns = (s.warnings || []).map((w) => `<div class="warn no-print">⚠ ${esc(w)}</div>`).join('');
    let content;
    if (s.status === 'done' && s.sheet) {
      const answers = state.view === 'answers';
      const both = state.view === 'both'; // ใบงาน + เฉลยท้ายใบ ในไฟล์เดียว
      let lessonPart = '';
      if (!answers && s.lesson) lessonPart = R.lessonHTML(s.lesson, i + 1, imgHTML, renderOpts(s));
      else if (!answers && s.lessonStatus === 'working') lessonPart = '<div class="no-print panel" style="text-align:center;color:var(--muted)">กำลังสร้างใบความรู้…</div>';
      else if (!answers && s.lessonStatus === 'error') lessonPart = `<div class="warn no-print">สร้างใบความรู้ไม่สำเร็จ: ${esc(s.lessonError || '')} (กด “＋ ใบความรู้” เพื่อลองใหม่)</div>`;
      content = lessonPart + sheetHTML(s, i + 1, answers) + (both ? sheetHTML(s, i + 1, true) : '');
    } else {
      const msg = s.status === 'error' ? 'สร้างไม่สำเร็จ: ' + esc(s.error)
        : s.status === 'stopped' ? 'หยุดแล้ว — กด “สร้างใบนี้ใหม่” หรือ “ลบ” ด้านบนได้'
        : s.status === 'working' ? 'กำลังสร้างใบนี้…'
        : state.busy ? 'รอคิว' : 'ยังไม่ได้สร้าง — กด “สร้างใบนี้” ด้านบน หรือ “ลบ”';
      content = `<div class="no-print panel" style="text-align:center;color:var(--muted)">${msg}</div>`;
    }
    return `<div class="page-wrap" id="pw-${i}">${tools}${warns}${content}</div>`;
  }

  /* ------------------------------------------------------------------ */
  /*  วาดหน้าจอ (วาดเฉพาะหน้าที่เปลี่ยน เพื่อไม่ให้ภาพกะพริบ)              */
  /* ------------------------------------------------------------------ */
  const dirty = new Set();
  let rafId = 0;

  function fullRender() {
    $('pages').innerHTML = state.sheets.map((_, i) => pageHTML(i)).join('');
    R.finish($('pages'));
    R.numberPages($('pages'));
    updateToolbar();
  }

  function schedule(i) {
    dirty.add(i);
    if (rafId) return;
    rafId = setTimeout(() => { // setTimeout (ไม่ใช่ requestAnimationFrame) เพื่อให้วาดต่อแม้แท็บ/หน้าต่างถูกซ่อนอยู่
      rafId = 0;
      for (const k of dirty) {
        const el = $('pw-' + k);
        if (el && state.sheets[k]) {
          el.outerHTML = pageHTML(k);
          R.finish($('pw-' + k));
        }
      }
      dirty.clear();
      R.numberPages($('pages'));
      updateToolbar();
    }, 30);
  }

  function patch(i, p) {
    Object.assign(state.sheets[i], p);
    schedule(i);
  }

  function updateToolbar() {
    const n = state.sheets.length;
    $('toolbar').classList.toggle('hidden', n === 0);
    const done = state.sheets.filter((s) => s.status === 'done' || s.status === 'error').length;
    $('progressText').textContent = `สร้างแล้ว ${done}/${n} ใบ`;
    $('progressBar').style.width = n ? (done / n) * 100 + '%' : '0';
    $('viewBoth').className = state.view === 'both' ? '' : 'ghost';
    $('viewWs').className = state.view === 'worksheet' ? '' : 'ghost';
    $('viewAns').className = state.view === 'answers' ? '' : 'ghost';
    $('printBtn').textContent = `พิมพ์ / บันทึกเป็น PDF (${state.view === 'answers' ? 'เฉลย' : state.view === 'both' ? 'ใบงาน+เฉลย' : 'ใบงาน'})`;
    $('printBtn').disabled = state.busy;
    for (const b of ['appendBtn', 'regenAllBtn', 'copyBtn']) $(b).disabled = state.busy;
    document.querySelectorAll('.stopBtn').forEach((b) => b.classList.toggle('hidden', !state.busy));
    const failed = Object.values(state.images).filter((x) => x.status === 'error').length;
    $('retryImgs').classList.toggle('hidden', failed === 0);
    $('retryImgs').textContent = `ลองสร้างภาพที่ขาดใหม่ (${failed})`;
    const firstErr = Object.values(state.images).find((x) => x.status === 'error' && x.error);
    const parts = [];
    if (firstErr) parts.push(`ภาพบางภาพสร้างไม่สำเร็จ: ${firstErr.error}`);
    if (state.inlineImages) parts.push('เซิร์ฟเวอร์เก็บไฟล์ภาพไม่ได้ (สิทธิ์โฟลเดอร์ data) ภาพยังแสดง/พิมพ์ได้ แต่จะไม่ถูกเก็บถาวร — เปิด check_setup.php เพื่อดูวิธีแก้');
    $('imgErr').textContent = parts.join(' | ');
  }

  function stopRun() {
    if (!state.busy) return;
    stopped = true;
    if (ctl) ctl.abort();
    waitNote('');
    for (const p of queue.splice(0)) { // ภาพที่ยังไม่เริ่มสร้าง: ยกเลิก (กด "ลองสร้างภาพที่ขาดใหม่" ได้ภายหลัง)
      const k = imageKey(p);
      requested.delete(k);
      state.images[k] = { status: 'error', error: 'หยุดการสร้างแล้ว' };
      markImage(k);
    }
    showError('หยุดการสร้างแล้ว ใบที่ค้างอยู่กด “สร้างใบนี้ใหม่” หรือ “ลบ” ได้ที่หัวของแต่ละใบ');
  }

  function showError(msg) {
    const el = $('error');
    el.textContent = msg;
    el.classList.remove('hidden');
  }
  function clearError() {
    $('error').classList.add('hidden');
  }

  function setBusy(b, label) {
    state.busy = b;
    $('startBtn').disabled = b;
    $('startBtn').textContent = b ? label || 'กำลังสร้างใบงาน…' : 'สร้างใบงาน';
    fullRender();
  }

  /* ------------------------------------------------------------------ */
  /*  คิวสร้างภาพ                                                         */
  /* ------------------------------------------------------------------ */
  function markImage(key) {
    state.sheets.forEach((s, i) => {
      if (promptsOf(s).some((p) => imageKey(p) === key)) schedule(i);
    });
  }

  async function fetchImage(prompt, force) {
    const key = imageKey(prompt);
    state.images[key] = { status: 'loading', url: (state.images[key] || {}).url };
    markImage(key);
    try {
      const r = await api('api/image.php', { prompt, force });
      state.images[key] = { status: 'done', url: r.url };
      if (r.inline) state.inlineImages = true;
    } catch (e) {
      state.images[key] = { status: 'error', error: e.message };
      if (e.code && FATAL.includes(e.code)) {
        queue.length = 0; // สาเหตุเดียวกันจะเกิดซ้ำทุกภาพ หยุดคิวไว้ก่อน
        showError(e.message);
      }
    }
    markImage(key);
    scheduleSave(3000);
  }

  function pump() {
    while (activeImages < IMAGE_CONCURRENCY && queue.length) {
      const p = queue.shift();
      activeImages++;
      fetchImage(p, false).finally(() => {
        activeImages--;
        pump();
      });
    }
  }

  function enqueueImages(s) {
    for (const p of promptsOf(s)) {
      const k = imageKey(p);
      if (requested.has(k)) continue; // ภาพเดียวกันในชุดเดียวกัน สร้างครั้งเดียว
      requested.add(k);
      queue.push(p);
    }
    pump();
  }

  /* ------------------------------------------------------------------ */
  /*  สร้างใบงาน 1 ใบ: สร้าง → ตรวจด้วยโค้ด → ตรวจด้วย AI → ไม่ผ่านก็สร้างใหม่  */
  /* ------------------------------------------------------------------ */
  /* ------------------------------------------------------------------ */
  /*  ความยาก (ระดับเดียว/ผสมตามสัดส่วน) และตัวชี้วัดที่เลือก                    */
  /* ------------------------------------------------------------------ */
  function mixFromUI() {
    const v = $('difficulty').value;
    if (v.startsWith('mix:')) {
      const key = v.slice(4);
      const num = (id) => Math.max(0, Number($(id).value) || 0);
      const mix = key === 'custom' ? { easy: num('mixEasy'), medium: num('mixMedium'), hard: num('mixHard'), expert: num('mixExpert') } : Object.assign({}, (window.LEVEL_PRESETS || {})[key] || {});
      const entries = Object.entries(mix).filter(([, n]) => n > 0);
      if (!entries.length) return { difficulty: 'medium', levelMix: null };
      entries.sort((a, b) => b[1] - a[1]);
      return { difficulty: entries[0][0], levelMix: mix };
    }
    return { difficulty: v || 'medium', levelMix: null };
  }
  function syncMixUI() {
    const custom = $('difficulty').value === 'mix:custom';
    $('mixBox').classList.toggle('hidden', !custom);
    const sum = ['mixEasy', 'mixMedium', 'mixHard', 'mixExpert'].reduce((a, id) => a + (Number($(id).value) || 0), 0);
    $('mixSum').textContent = custom ? `รวม ${sum}%` + (sum === 100 ? '' : ' (ระบบจะปรับให้เป็น 100% ตามสัดส่วน)') : '';
    const m = mixFromUI();
    const hasExpert = m.levelMix ? m.levelMix.expert > 0 : m.difficulty === 'expert';
    $('beyondRow').classList.toggle('hidden', !hasExpert);
  }
  $('difficulty').addEventListener('change', syncMixUI);
  for (const id of ['mixEasy', 'mixMedium', 'mixHard', 'mixExpert']) $(id).addEventListener('input', syncMixUI);

  let indAll = []; // ตัวชี้วัดของชั้น/วิชาที่เลือก จากคลังหลักสูตร
  const indChecked = new Set();
  const selectedIndicators = () => indAll.filter((i) => indChecked.has(i.code)).map((i) => ({ code: i.code, text: i.text }));
  function renderIndicators() {
    $('indCount').textContent = indAll.length ? `(เลือก ${indChecked.size}/${indAll.length})` : '';
    if (!indAll.length) {
      $('indList').innerHTML = '<span style="color:var(--muted)">ยังไม่มีตัวชี้วัดของชั้น/วิชานี้ในหลักสูตรที่ใช้ — ไปที่หน้า <a href="curriculum.php" style="color:var(--pink)">หลักสูตร/ตัวชี้วัด</a> เพื่อนำเข้าจากไฟล์ (ไม่เลือกตัวชี้วัดก็สร้างใบงานตามหัวข้อได้ตามปกติ)</span>';
      return;
    }
    const unit = $('unit').value && $('unit').value !== CUSTOM_UNIT ? $('unit').value : '';
    const mapped = (i) => unit && i.units.includes(unit);
    const sorted = indAll.slice().sort((a, b) => Number(mapped(b)) - Number(mapped(a)));
    $('indList').innerHTML = sorted
      .map((i) => `<label style="display:flex;gap:8px;align-items:flex-start;font-weight:400;padding:2px 0"><input type="checkbox" data-ind="${esc(i.code)}"${indChecked.has(i.code) ? ' checked' : ''}><span><b>${esc(i.code)}</b> ${esc(i.text)}${mapped(i) ? ' <span class="chip green">ตรงหน่วยนี้</span>' : ''}</span></label>`)
      .join('');
  }
  function autoPickIndicators() {
    indChecked.clear();
    const unit = $('unit').value && $('unit').value !== CUSTOM_UNIT ? $('unit').value : '';
    if (unit) for (const i of indAll) if (i.units.includes(unit)) indChecked.add(i.code);
    renderIndicators();
  }
  async function loadIndicators() {
    try {
      const r = await apiOnce('api/curriculum.php', { action: 'for_grade', grade: $('grade').value, subject: $('subject').value });
      indAll = r.indicators || [];
    } catch {
      indAll = [];
    }
    autoPickIndicators();
  }
  $('indList').addEventListener('change', (e) => {
    const c = e.target.closest('[data-ind]');
    if (!c) return;
    c.checked ? indChecked.add(c.dataset.ind) : indChecked.delete(c.dataset.ind);
    renderIndicators();
  });
  $('indAll').addEventListener('click', () => {
    for (const i of indAll) indChecked.add(i.code);
    renderIndicators();
  });
  $('indNone').addEventListener('click', () => {
    indChecked.clear();
    renderIndicators();
  });

  function settings() {
    const grade = $('grade').value;
    const st = $('docStyle').value;
    return {
      grade,
      subject: $('subject').value.trim() || 'วิทยาศาสตร์และเทคโนโลยี',
      itemCount: Math.min(20, Math.max(3, Number($('itemCount').value) || 5)),
      style: st === 'auto' ? R.defaultStyle(grade) : st,
      difficulty: mixFromUI().difficulty,
      levelMix: mixFromUI().levelMix,
      beyond: $('beyond').checked,
      indicators: selectedIndicators(),
      showInd: $('showInd').checked,
      figureMode: $('figureMode').value,
      withLesson: $('withLesson').checked,
      passageId: $('passage').value,
      refMode: $('refMode').value,
      unit: $('unit').value && $('unit').value !== CUSTOM_UNIT ? $('unit').value : '',
      lessonPlanId: state.lpId || '',
    };
  }
  /** ค่าที่ติดไปกับแต่ละใบตอนวางแผน (ใบที่ดึงมาจากชุดอื่นจึงคงรูปแบบเดิมของมันไว้) */
  /** ค่าเพิ่มที่ติดกับแต่ละใบ (บันทึกและเรียกกลับได้) */
  const EXTRA_KEYS = ['passageId', 'refMode', 'unit', 'indicators', 'levelMix', 'beyond', 'showInd', 'lessonPlanId'];
  const pickExtra = (s) => Object.fromEntries(EXTRA_KEYS.filter((k) => s[k] !== undefined && s[k] !== '' && s[k] !== null).map((k) => [k, s[k]]));
  const entryOpts = (c) => ({ grade: c.grade, subject: c.subject, style: c.style, difficulty: c.difficulty, figureMode: c.figureMode, wantLesson: c.withLesson, passageId: c.passageId || '', refMode: c.refMode || 'auto', unit: c.unit || '', levelMix: c.levelMix || null, beyond: !!c.beyond, indicators: c.indicators || [], showInd: c.showInd !== false, lessonPlanId: c.lessonPlanId || '' });

  async function generateOne(i, plan, usedTopics, hint) {
    const cfgNow = settings();
    const itemCount = cfgNow.itemCount;
    const grade = state.sheets[i].grade || cfgNow.grade; // ใบที่สร้างต่อท้าย/ดึงมา ใช้ชั้น/วิชาของใบนั้น
    const subject = state.sheets[i].subject || cfgNow.subject;
    patch(i, { status: 'working', error: null, warnings: [] });
    let problems = [];
    let sheet = null;
    let warnings = [];
    try {
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        let r;
        try {
          const e = state.sheets[i];
          r = await api('api/sheet.php', {
            step: 'generate', grade, subject, plan, itemCount, usedTopics, hint, problems, attempt,
            formal: (e.style || cfgNow.style) === 'formal', difficulty: e.difficulty || cfgNow.difficulty, figureMode: e.figureMode || cfgNow.figureMode,
            passageId: e.passageId || '', refs: { mode: e.refMode || 'auto' }, unit: e.unit || '',
            levelMix: e.levelMix || null, beyond: !!e.beyond, indicators: e.indicators || [], lessonPlanId: e.lessonPlanId || '',
          });
        } catch (e) {
          if (e.code === 'TRUNCATED' && attempt < MAX_ATTEMPTS - 1) {
            problems = ['คำตอบยาวเกินไป ให้เขียนข้อความให้สั้นลงและตัดส่วนที่ไม่จำเป็น'];
            continue;
          }
          throw e;
        }
        sheet = r.sheet;
        problems = r.problems || [];
        if (problems.length) continue; // ตรวจด้วยโค้ดไม่ผ่าน → สร้างใหม่พร้อมแจ้งปัญหา

        if (!$('doReview').checked) {
          problems = [];
          break;
        }
        if (state.skipReview) {
          warnings = ['ข้ามขั้นตรวจทานด้วย AI เพราะโควตาของโมเดลตรวจทานเต็ม กรุณาตรวจเฉลยด้วยตัวเอง'];
          problems = [];
          break;
        }
        try {
          const rv = await api('api/sheet.php', { step: 'review', grade, subject, plan, sheet }, 2);
          if (rv.ok || !(rv.issues || []).length) {
            problems = [];
            break;
          }
          problems = rv.issues; // AI ตรวจไม่ผ่าน → สร้างใหม่
        } catch (e) {
          // ขั้นตรวจล้มเหลวไม่ควรขวางงาน: ใช้ใบงานที่ได้ แล้วเตือนให้ครูตรวจเอง
          if (['RATE_LIMIT', 'OVERLOADED'].includes(e.code)) state.skipReview = true;
          warnings = ['ข้ามขั้นตรวจทานด้วย AI (' + e.message + ') กรุณาตรวจเฉลยด้วยตัวเอง'];
          problems = [];
          break;
        }
      }
      if (!sheet) throw new ApiError('สร้างใบงานไม่สำเร็จ ลองใหม่อีกครั้ง');
      if (problems.length) warnings = problems; // ลองครบแล้วยังมีปัญหา: ให้ครูเห็นและแก้เอง
      const hadLesson = !!state.sheets[i].lesson;
      patch(i, { status: 'done', sheet, warnings, style: state.sheets[i].style || cfgNow.style, figureMode: state.sheets[i].figureMode || cfgNow.figureMode });
      enqueueImages(state.sheets[i]);
      // ใบความรู้: สร้างเมื่อเลือกไว้ หรือสร้างใหม่ให้ตรงกับใบงานที่เพิ่งสร้างใหม่
      if (state.sheets[i].wantLesson || hadLesson) await generateLesson(i, hint);
      return true;
    } catch (e) {
      if (e.code === 'ABORT' || stopped) {
        patch(i, { status: 'stopped', error: '' });
        return false; // หยุดทั้งชุด
      }
      patch(i, { status: 'error', error: e.message });
      if (e.code && FATAL.includes(e.code)) {
        showError(e.message);
        return false; // หยุดทั้งชุด เพราะสาเหตุเดียวกันจะเกิดซ้ำทุกใบ
      }
      return true;
    }
  }

  /** สร้างใบความรู้ 1 ฉบับคู่กับใบงานใบที่ i (ตรวจด้วยโค้ด ไม่ผ่านลองใหม่ได้ 1 ครั้ง) */
  async function generateLesson(i, hint) {
    const s = state.sheets[i];
    if (!s || !s.sheet) return;
    const c = settings();
    patch(i, { lessonStatus: 'working', lessonError: '' });
    let problems = [];
    let lesson = null;
    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        const r = await api('api/sheet.php', {
          step: 'lesson', grade: s.grade || c.grade, subject: s.subject || c.subject, plan: s.plan, sheet: s.sheet, hint: hint || '',
          formal: (s.style || c.style) === 'formal', figureMode: s.figureMode || c.figureMode, problems, attempt,
          refs: { mode: s.refMode || 'auto' }, unit: s.unit || '', indicators: s.indicators || [], lessonPlanId: s.lessonPlanId || '',
        });
        lesson = r.lesson;
        problems = r.problems || [];
        if (!problems.length) break;
      }
      const warnings = (s.warnings || []).filter((w) => !w.startsWith('ใบความรู้:')).concat(problems.map((p) => 'ใบความรู้: ' + p));
      patch(i, { lesson, lessonStatus: 'done', warnings, wantLesson: true });
      enqueueImages(state.sheets[i]);
    } catch (e) {
      patch(i, { lessonStatus: 'error', lessonError: e.code === 'ABORT' ? 'หยุดแล้ว' : e.message });
      if (e.code && FATAL.includes(e.code)) showError(e.message);
    }
  }

  /** ปุ่ม "＋ ใบความรู้" ของแต่ละใบ (สร้างทีหลังได้) */
  async function lessonFor(i) {
    if (state.busy || !state.sheets[i]) return;
    const hint = window.prompt('อยากให้ใบความรู้เน้นเรื่องใดเป็นพิเศษไหม (เว้นว่างได้)', '');
    if (hint === null) return;
    clearError();
    beginRun();
    state.busy = true;
    fullRender();
    try {
      await generateLesson(i, hint);
    } finally {
      state.busy = false;
      fullRender();
      scheduleSave(800);
    }
  }

  /** สร้างชุดใหม่ (append=false) หรือสร้างเพิ่มต่อท้ายชุดที่มีอยู่ (append=true) ตามค่าที่ตั้งในฟอร์ม */
  async function runBatch(append) {
    clearError();
    const topic = $('topic').value.trim();
    const types = [...document.querySelectorAll('#types input:checked')].map((x) => x.value);
    if (!topic) return showError('กรุณาใส่หัวข้อ');
    if (!types.length) return showError('กรุณาเลือกรูปแบบโจทย์อย่างน้อย 1 แบบ');
    if (append && !state.sheets.length) append = false;

    if (!append) {
      state.sheets = [];
      state.images = {};
      state.skipReview = false;
      state.setId = null; // ชุดใหม่ = บันทึกเป็นรายการใหม่
      state.baseTitle = `${topic} (${settings().grade} ${settings().subject})`;
      state.inlineImages = false;
      requested.clear();
      queue.length = 0;
    }
    const base = state.sheets.length;
    beginRun();
    setBusy(true, 'กำลังวางแผน…');
    try {
      const cfgNow = settings();
      const { grade, subject } = cfgNow;
      const count = Math.min(20, Math.max(1, Number($('count').value) || 1));
      const avoid = state.sheets.map((s) => s.plan.topic);
      const plan = await api('api/plan.php', { grade, subject, topic, count, types, avoid, indicators: cfgNow.indicators, lessonPlanId: state.lpId || '', ideaIndex: state.lpIdea >= 0 ? state.lpIdea : null });
      state.lpIdea = -1;
      state.sheets = state.sheets.concat(
        plan.sheets.map((p) => {
          const o = entryOpts(cfgNow);
          // ตัวชี้วัดของใบนี้ = เฉพาะรหัสที่ AI กระจายให้ใบนี้ (ไม่มีแผนกระจาย = ใช้ทั้งหมดที่เลือก)
          if (cfgNow.indicators.length && p.indicatorCodes && p.indicatorCodes.length) o.indicators = cfgNow.indicators.filter((i) => p.indicatorCodes.includes(i.code));
          return Object.assign({ plan: p, status: 'pending', warnings: [] }, o);
        }),
      );
      fullRender();
      $('startBtn').textContent = 'กำลังสร้างใบงาน…';

      // สร้างทีละใบ ทุกคำขอเล็กและแยกจากกัน
      const used = state.sheets.slice(0, base).map((s) => s.plan.topic);
      for (let i = base; i < state.sheets.length; i++) {
        const ok = await generateOne(i, state.sheets[i].plan, used.slice());
        if (!ok) break;
        used.push(state.sheets[i].plan.topic);
      }
      if (append) setTimeout(() => scrollTo_('pw-' + base, { behavior: 'smooth' }), 100);
    } catch (e) {
      showError(e.message);
    } finally {
      setBusy(false);
      scheduleSave(800);
    }
  }
  const start = () => runBatch(false);

  /** สร้างเนื้อหาใหม่ทุกใบด้วยแผนเดิม (เก็บชุดเดิมเป็นสำเนาไว้ก่อน) */
  async function regenerateAll() {
    if (state.busy || !state.sheets.length) return;
    const hint = window.prompt('อยากให้ปรับอะไรเป็นพิเศษกับทุกใบไหม (เว้นว่างได้) — ระบบจะเก็บชุดเดิมเป็นสำเนาให้ก่อน', '');
    if (hint === null) return;
    clearError();
    if (state.sheets.some((s) => s.status === 'done')) {
      try {
        await postSave(null, ' (ก่อนสร้างใหม่)');
      } catch (e) {
        if (!window.confirm('เก็บสำเนาชุดเดิมไม่สำเร็จ (' + e.message + ') ต้องการสร้างทับต่อหรือไม่?')) return;
      }
    }
    beginRun();
    setBusy(true, 'กำลังสร้างทั้งชุดใหม่…');
    try {
      const plans = state.sheets.map((s) => s.plan);
      const used = [];
      for (let i = 0; i < plans.length; i++) {
        const ok = await generateOne(i, plans[i], used.slice(), hint);
        if (!ok) break;
        used.push(plans[i].topic);
      }
    } finally {
      setBusy(false);
      scheduleSave(800);
    }
  }

  function scrollTo_(id, opts) {
    const el = $(id);
    if (el && el.scrollIntoView) el.scrollIntoView(opts);
  }

  function moveSheet(i, delta) {
    const j = i + delta;
    if (state.busy || j < 0 || j >= state.sheets.length) return;
    [state.sheets[i], state.sheets[j]] = [state.sheets[j], state.sheets[i]];
    fullRender();
    scrollTo_('pw-' + j, { block: 'nearest' });
    scheduleSave(800);
  }

  function deleteSheet(i) {
    if (state.busy || !state.sheets[i]) return;
    if (!window.confirm(`ลบใบที่ ${i + 1} “${state.sheets[i].plan.topic}” ออกจากชุดนี้?`)) return;
    state.sheets.splice(i, 1);
    fullRender();
    if (state.sheets.length) scheduleSave(800);
    else $('saveNote').textContent = 'ลบครบทุกใบแล้ว (ชุดที่บันทึกไว้เดิมยังอยู่ในรายการ ลบได้ที่กล่อง “ชุดใบงานที่บันทึกไว้”)';
  }

  async function regenerate(i) {
    const hint = window.prompt('อยากให้ปรับอะไรเป็นพิเศษไหม (เว้นว่างได้)', '');
    if (hint === null) return;
    clearError();
    const others = state.sheets.filter((_, k) => k !== i).map((s) => s.plan.topic);
    beginRun();
    state.busy = true;
    fullRender();
    try {
      await generateOne(i, state.sheets[i].plan, others, hint);
    } finally {
      state.busy = false;
      fullRender();
      scheduleSave(800);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  ชั้น → วิชา → หน่วยการเรียนรู้ (ข้อมูลจาก assets/js/data/curriculum.js)        */
  /* ------------------------------------------------------------------ */
  const CUR = window.CURRICULUM || {};
  const CUSTOM_UNIT = '__custom';
  const DEFAULT_SUBJECT = 'วิทยาศาสตร์และเทคโนโลยี';

  function setSubject(name) {
    const sel = $('subject');
    if (!name) return;
    if (![...sel.options].some((o) => o.value === name)) sel.add(new Option(name, name)); // วิชาที่ไม่อยู่ในรายการ (เช่นชุดเก่า)
    sel.value = name;
  }

  function fillSubjects(preferred) {
    const subs = Object.keys(CUR[$('grade').value] || {});
    if (!subs.length) return fillUnits();
    const keep = preferred || $('subject').value;
    $('subject').innerHTML = subs.map((n) => `<option value="${esc(n)}">${esc(n)}</option>`).join('');
    $('subject').value = subs.includes(keep) ? keep : subs.includes(DEFAULT_SUBJECT) ? DEFAULT_SUBJECT : subs[0];
    fillUnits();
  }

  function fillUnits() {
    const tsel = $('termSel').value;
    const units = ((CUR[$('grade').value] || {})[$('subject').value] || []).filter((u) => !tsel || String(u[0]) === tsel);
    const group = (t) => {
      const list = units.filter((u) => u[0] === t);
      return list.length ? `<optgroup label="ภาคเรียนที่ ${t}">${list.map((u) => `<option value="${esc(u[1])}">${esc(u[1])}</option>`).join('')}</optgroup>` : '';
    };
    $('unit').innerHTML =
      '<option value="">— เลือกหน่วยการเรียนรู้ —</option>' + group(1) + group(2) + `<option value="${CUSTOM_UNIT}">✎ พิมพ์หัวข้อเอง</option>`;
  }

  $('grade').addEventListener('change', () => {
    fillSubjects();
    remember();
  });
  $('subject').addEventListener('change', () => {
    fillUnits();
    remember();
  });
  $('termSel').addEventListener('change', () => {
    fillUnits();
    try { localStorage.setItem('ws_termSel', $('termSel').value); } catch {}
  });
  try { const t0 = localStorage.getItem('ws_termSel'); if (t0 === '1' || t0 === '2') { $('termSel').value = t0; fillUnits(); } } catch {}
  $('unit').addEventListener('change', () => {
    const v = $('unit').value;
    if (v && v !== CUSTOM_UNIT && !$('termSel').value) {
      const u = ((CUR[$('grade').value] || {})[$('subject').value] || []).find((x) => x[1] === v);
      if (u) $('termSel').value = String(u[0]); // เลือกหน่วยแล้วตั้งภาคเรียนให้ตามหน่วยนั้น (ไม่กรองรายการซ้ำ)
    }
    if (v === CUSTOM_UNIT) {
      $('topic').value = '';
      $('topic').focus();
    } else if (v) {
      $('topic').value = v;
    }
  });
  function remember() {
    try {
      localStorage.setItem('ws_grade', $('grade').value);
      localStorage.setItem('ws_subject', $('subject').value);
    } catch {}
  }
  try {
    const g = localStorage.getItem('ws_grade');
    if (g && CUR[g]) $('grade').value = g;
  } catch {}
  let savedSubject = '';
  try {
    savedSubject = localStorage.getItem('ws_subject') || '';
  } catch {}
  fillSubjects(savedSubject || DEFAULT_SUBJECT);

  /** บทอ่านที่เก็บไว้ในคลังเอกสาร (กรองตามชั้น/วิชา) */
  async function loadPassages() {
    try {
      const keep = $('passage').value;
      const r = await apiOnce('api/library.php', { action: 'passages', grade: $('grade').value, subject: $('subject').value });
      $('passage').innerHTML =
        '<option value="">— ไม่ใช้บทอ่าน —</option>' +
        r.items.map((p) => `<option value="${esc(p.id)}">${esc(p.title)}${p.docTitle ? ' · ' + esc(p.docTitle) : ''}</option>`).join('');
      if ([...$('passage').options].some((o) => o.value === keep)) $('passage').value = keep;
    } catch {
      /* คลังไม่พร้อม: ข้าม (ไม่กระทบการสร้างใบงาน) */
    }
  }
  loadPassages();
  $('grade').addEventListener('change', loadPassages);
  $('subject').addEventListener('change', loadPassages);
  loadIndicators();
  $('grade').addEventListener('change', loadIndicators);
  $('subject').addEventListener('change', loadIndicators);
  $('unit').addEventListener('change', autoPickIndicators);
  syncMixUI();

  /* ------------------------------------------------------------------ */
  /*  บันทึกชุดใบงานอัตโนมัติ / เปิดชุดที่บันทึกไว้                          */
  /* ------------------------------------------------------------------ */
  const imageIdOf = (st) => {
    const m = st && st.status === 'done' && st.url ? /[?&]id=([a-f0-9]{40})/.exec(st.url) : null;
    return m ? m[1] : null;
  };
  const fmtDate = (iso) => {
    const d = new Date(iso);
    return isNaN(d) ? '' : d.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
  };
  let saveTimer = 0;
  let saving = false;

  function scheduleSave(ms) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(doSave, ms);
  }

  /** ส่งชุดปัจจุบันไปบันทึก (id = null → เป็นรายการใหม่) คืนผลจากเซิร์ฟเวอร์ */
  async function postSave(id, titleSuffix = '') {
    const done = state.sheets.filter((s) => s.status === 'done' && s.sheet);
    const images = {};
    for (const [k, st] of Object.entries(state.images)) {
      const imgId = imageIdOf(st);
      if (imgId) images[k] = imgId;
    }
    const { grade, subject } = settings();
    const meta = Object.assign(
      {
        grade, subject, term: $('termSel').value, topic: $('topic').value.trim(), count: $('count').value, itemCount: $('itemCount').value,
        docStyle: $('docStyle').value, difficulty: $('difficulty').value, mixCustom: { easy: +$('mixEasy').value || 0, medium: +$('mixMedium').value || 0, hard: +$('mixHard').value || 0, expert: +$('mixExpert').value || 0 }, figureMode: $('figureMode').value, withLesson: $('withLesson').checked,
        header: { school: $('hSchool').value.trim(), course: $('hCourse').value.trim(), teacher: $('hTeacher').value.trim(), minutes: $('hMinutes').value.trim() },
      },
      providers(),
    );
    const title = `${state.baseTitle || `${meta.topic || 'ชุดใบงาน'} (${grade} ${subject})`} · ${done.length} ใบ${titleSuffix}`;
    meta.baseTitle = state.baseTitle;
    return apiOnce('api/save.php', {
      action: 'save',
      id,
      title,
      meta,
      images,
      sheets: state.sheets.map((s) => ({
        plan: s.plan, status: s.status === 'done' ? 'done' : 'error', sheet: s.sheet || null, warnings: s.warnings || [], error: s.error || '',
        grade: s.grade || '', subject: s.subject || '', style: s.style || 'kid', figureMode: s.figureMode || 'code', difficulty: s.difficulty || '',
        lesson: s.lesson || null, wantLesson: !!s.wantLesson, extra: pickExtra(s),
      })),
    });
  }

  async function doSave() {
    if (saving || state.busy || activeImages > 0 || queue.length) {
      // ยังสร้างอยู่ รอให้นิ่งก่อนแล้วค่อยบันทึก (ถ้ายังทำงานอยู่ ภาพถัดไปจะเรียกบันทึกอีกครั้ง)
      if (state.sheets.some((s) => s.status === 'done')) scheduleSave(2500);
      return;
    }
    if (!state.sheets.some((s) => s.status === 'done' && s.sheet)) return;
    saving = true;
    try {
      const r = await postSave(state.setId);
      state.setId = r.id;
      $('saveNote').textContent = `บันทึกอัตโนมัติแล้ว ${fmtDate(r.savedAt)}` + (r.where === 'temp' ? ' (เก็บในโฟลเดอร์ชั่วคราว: เปิด check_setup.php เพื่อดูวิธีแก้สิทธิ์)' : '');
      $('saveNote').style.color = '';
      loadSavedList();
    } catch (e) {
      $('saveNote').textContent = 'บันทึกอัตโนมัติไม่สำเร็จ: ' + e.message;
      $('saveNote').style.color = '#b00020';
    } finally {
      saving = false;
    }
  }

  async function saveCopy() {
    if (state.busy || !state.sheets.some((s) => s.status === 'done' && s.sheet)) return;
    try {
      const r = await postSave(null, ' (สำเนา)');
      state.setId = r.id; // แก้ไขต่อที่สำเนาใหม่ ชุดเดิมไม่ถูกแตะ
      $('saveNote').textContent = `บันทึกเป็นสำเนาใหม่แล้ว ${fmtDate(r.savedAt)} การแก้ไขต่อจากนี้จะบันทึกที่สำเนานี้`;
      $('saveNote').style.color = '';
      loadSavedList();
    } catch (e) {
      showError('บันทึกสำเนาไม่สำเร็จ: ' + e.message);
    }
  }

  async function loadSavedList() {
    try {
      const r = await apiOnce('api/save.php', { action: 'list', limit: 5 });
      $('savedCount').textContent = r.items.length ? '(ล่าสุด ' + r.items.length + ' ชุด)' : '';
      $('savedList').innerHTML = r.items.length
        ? r.items
            .map(
              (it) =>
                `<div class="row" style="justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee"><span>${esc(it.title)} <span style="color:var(--muted);font-size:12px">${esc(fmtDate(it.savedAt))}</span></span><span class="row"><button class="ghost small" data-open="${esc(it.id)}" title="เปิดชุดนี้แทนชุดที่แสดงอยู่">เปิด</button><button class="ghost small" data-append="${esc(it.id)}" title="ดึงทุกใบของชุดนี้มาต่อท้ายชุดที่แสดงอยู่">ดึงมาต่อท้าย</button><button class="ghost small" data-del="${esc(it.id)}">ลบ</button></span></div>`,
            )
            .join('')
        : '<span style="color:var(--muted)">ยังไม่มีชุดที่บันทึกไว้</span>';
      if (r.items.length) $('savedList').innerHTML += '<div style="margin-top:8px"><a href="saved.php" style="color:var(--pink);font-weight:600">ดูทั้งหมดในคลังใบงาน →</a></div>';
    } catch (e) {
      $('savedList').textContent = 'โหลดรายการไม่สำเร็จ: ' + e.message;
    }
  }

  /** เปิดชุดที่บันทึกไว้ (append=false: แทนที่ชุดที่แสดง / append=true: ดึงทุกใบมาต่อท้ายชุดที่แสดงอยู่) */
  async function loadSaved(id, append) {
    if (state.busy) return;
    try {
      const r = await apiOnce('api/save.php', { action: 'load', id });
      const d = r.data;
      const m = d.meta || {};
      const missing = new Set(r.missingImages || []);
      if (append && !state.sheets.length) append = false;
      const incoming = (d.sheets || []).map((s) => ({
        plan: s.plan,
        status: s.status,
        sheet: s.sheet || undefined,
        warnings: s.warnings || [],
        error: s.error || '',
        grade: s.grade || m.grade || '',
        subject: s.subject || m.subject || '',
        style: s.style || 'kid', // ชุดเก่าก่อนมีสไตล์ทางการ = สไตล์เด็ก
        figureMode: s.figureMode || 'code',
        difficulty: s.difficulty || '',
        lesson: s.lesson || null,
        lessonStatus: s.lesson ? 'done' : '',
        wantLesson: !!s.wantLesson,
        ...pickExtra(s.extra || {}),
      }));
      if (append) {
        state.sheets = state.sheets.concat(incoming);
      } else {
        state.setId = d.id;
        state.baseTitle = m.baseTitle || String(d.title || '').replace(/ · \d+ ใบ.*$/, '');
        state.sheets = incoming;
        state.images = {};
        const lpOf = incoming.map((x) => x.lessonPlanId).find(Boolean);
        setLessonPlan(lpOf || '', '');
        requested.clear();
        queue.length = 0;
      }
      for (const [k, imgId] of Object.entries(d.images || {})) {
        if (append && state.images[k] && state.images[k].status === 'done') continue; // ใช้ภาพที่มีอยู่แล้ว
        state.images[k] = missing.has(k) ? { status: 'error', error: 'ไฟล์ภาพไม่อยู่ในเครื่องแล้ว กดลองใหม่เพื่อสร้างภาพนี้อีกครั้ง' } : { status: 'done', url: `api/img.php?id=${imgId}` };
        requested.add(k);
      }
      for (const s of incoming) {
        if (!s.sheet) continue;
        for (const p of promptsOf(s)) {
          const k = imageKey(p);
          if (!state.images[k]) {
            state.images[k] = { status: 'error', error: 'ภาพนี้ยังไม่ได้สร้างหรือสร้างไม่สำเร็จ กดลองใหม่' };
            requested.add(k);
          }
        }
      }
      if (!append) {
        if (m.grade && CUR[m.grade]) $('grade').value = m.grade;
        const tm = String(d.term || m.term || '');
        $('termSel').value = tm === '1' || tm === '2' ? tm : '';
        fillSubjects(m.subject);
        if (m.subject) setSubject(m.subject);
        fillUnits();
        for (const [fid, key] of [['topic', 'topic'], ['count', 'count'], ['itemCount', 'itemCount'], ['docStyle', 'docStyle'], ['difficulty', 'difficulty'], ['figureMode', 'figureMode']]) {
          if (m[key] != null && m[key] !== '') $(fid).value = fid === 'difficulty' ? ({ basic: 'easy', exam: 'hard' }[m[key]] || m[key]) : m[key];
        }
        if (m.mixCustom) for (const [id3, k3] of [['mixEasy', 'easy'], ['mixMedium', 'medium'], ['mixHard', 'hard'], ['mixExpert', 'expert']]) $(id3).value = m.mixCustom[k3] ?? 0;
        syncMixUI();
        if (m.withLesson != null) $('withLesson').checked = !!m.withLesson;
        const h = m.header || {};
        for (const [fid, key] of [['hSchool', 'school'], ['hCourse', 'course'], ['hTeacher', 'teacher'], ['hMinutes', 'minutes']]) {
          if (h[key] != null) $(fid).value = h[key];
        }
        for (const id2 of ['textProvider', 'imageProvider']) {
          const opt = m[id2] && [...$(id2).options].find((o) => o.value === m[id2] && !o.disabled);
          if (opt) $(id2).value = m[id2];
        }
        if (m.orModels) {
          $('orText').value = m.orModels.text || '';
          $('orReview').value = m.orModels.review || '';
          $('orImage').value = m.orModels.image || '';
        }
        orToggle();
      }
      state.view = 'both';
      clearError();
      fullRender();
      if (append) {
        $('saveNote').textContent = `ดึง ${incoming.length} ใบจากชุด “${d.title}” มาต่อท้ายแล้ว (ชุดต้นทางไม่ถูกแก้ไข) ชุดปัจจุบันจะบันทึกอัตโนมัติ`;
        scheduleSave(800);
        setTimeout(() => scrollTo_('pw-' + (state.sheets.length - incoming.length), { behavior: 'smooth' }), 100);
      } else {
        $('saveNote').textContent = `เปิดชุด “${d.title}” (บันทึกเมื่อ ${fmtDate(d.savedAt)}) การแก้ไขต่อจากนี้จะบันทึกทับชุดนี้`;
        scrollTo_('pages', { behavior: 'smooth' });
      }
      $('saveNote').style.color = '';
    } catch (e) {
      showError('เปิดชุดที่บันทึกไว้ไม่สำเร็จ: ' + e.message);
    }
  }

  async function deleteSaved(id) {
    if (!window.confirm('ย้ายชุดใบงานนี้ไปถังขยะ? (กู้คืนได้ภายใน 30 วันที่หน้าคลังใบงาน)')) return;
    try {
      await apiOnce('api/save.php', { action: 'delete', id });
      if (state.setId === id) state.setId = null;
      loadSavedList();
    } catch (e) {
      showError('ลบไม่สำเร็จ: ' + e.message);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  ผูกปุ่ม                                                             */
  /* ------------------------------------------------------------------ */
  // ปุ่มรูปแบบโจทย์ถูกสร้างจาก PHP แล้ว สร้างจาก JS เฉพาะกรณีที่ยังว่าง
  if (!$('types').children.length) {
    $('types').innerHTML = window.SHEET_TYPES.map(
      (t) => `<label class="chip on"><input type="checkbox" value="${t.id}" checked> ${esc(t.label)}</label>`,
    ).join('');
  }
  $('types').addEventListener('change', (e) => e.target.closest('label').classList.toggle('on', e.target.checked));

  /* ---------- รูปแบบโจทย์ตั้งต้นตามระดับ (ประถม/มัธยม) และค่าที่จำไว้ ---------- */
  const levelOf = (g) => (/^ม\./.test(g) ? 'secondary' : 'primary');
  function applyTypeDefaults(level) {
    const want = (window.TYPE_DEFAULTS || {})[level] || [];
    for (const cb of document.querySelectorAll('#types input')) {
      cb.checked = want.includes(cb.value);
      cb.closest('label').classList.toggle('on', cb.checked);
    }
  }
  let lastLevel = levelOf($('grade').value);
  function onLevelMaybeChanged() {
    const lv = levelOf($('grade').value);
    if (lv === lastLevel) return;
    lastLevel = lv;
    applyTypeDefaults(lv);
    $('withLesson').checked = lv === 'secondary' ? store('ws_withLesson_sec', null) !== '0' : store('ws_withLesson_pri', null) === '1';
  }
  function store(k, v) {
    try {
      if (v === null) return localStorage.getItem(k);
      localStorage.setItem(k, v);
    } catch {}
    return null;
  }
  applyTypeDefaults(lastLevel);
  $('withLesson').checked = lastLevel === 'secondary' ? store('ws_withLesson_sec', null) !== '0' : store('ws_withLesson_pri', null) === '1';
  $('withLesson').addEventListener('change', () => store(lastLevel === 'secondary' ? 'ws_withLesson_sec' : 'ws_withLesson_pri', $('withLesson').checked ? '1' : '0'));
  $('grade').addEventListener('change', onLevelMaybeChanged);

  // ค่าที่จำไว้ในเบราว์เซอร์: รูปแบบเอกสาร ความยาก รูปประกอบ และหัวกระดาษ
  for (const id of ['docStyle', 'difficulty', 'figureMode', 'hSchool', 'hCourse', 'hTeacher', 'hMinutes']) {
    const v = store('ws_' + id, null);
    if (v != null && v !== '' && (!$(id).options || [...$(id).options].some((o) => o.value === v))) $(id).value = v;
    $(id).addEventListener('change', () => store('ws_' + id, $(id).value));
  }
  // แก้หัวกระดาษแล้วเห็นผลทันทีในใบที่แสดงอยู่
  let hdrTimer = 0;
  for (const id of ['hSchool', 'hCourse', 'hTeacher', 'hMinutes']) {
    $(id).addEventListener('input', () => {
      clearTimeout(hdrTimer);
      hdrTimer = setTimeout(() => {
        if (state.sheets.length) {
          fullRender();
          scheduleSave(2000);
        }
      }, 400);
    });
  }
  // ฟอนต์/สูตรโหลดเสร็จแล้วขนาดตัวอักษรเปลี่ยน: จัดหน้าใหม่ให้ถูกต้อง
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => state.sheets.length && fullRender());
  window.addEventListener('beforeprint', () => state.sheets.length && fullRender());

  // จำตัวเลือกผู้ให้บริการไว้ในเบราว์เซอร์ (ถ้าใช้ไม่ได้ก็ข้ามไป)
  for (const id of ['textProvider', 'imageProvider']) {
    try {
      const saved = localStorage.getItem('ws_' + id);
      const opt = saved && [...$(id).options].find((o) => o.value === saved && !o.disabled);
      if (opt) $(id).value = saved;
    } catch {}
    $(id).addEventListener('change', () => {
      try {
        localStorage.setItem('ws_' + id, $(id).value);
      } catch {}
    });
  }

  // ช่องโมเดล OpenRouter: จำค่าไว้ แสดงกล่องเมื่อเลือก OpenRouter
  for (const id of ['orText', 'orReview', 'orImage']) {
    const el = $(id);
    if (!el) continue;
    try {
      const saved = localStorage.getItem('ws_' + id);
      if (saved && !el.value) el.value = saved;
    } catch {}
    el.addEventListener('change', () => {
      try {
        localStorage.setItem('ws_' + id, el.value.trim());
      } catch {}
      orCheckNote();
    });
  }
  if ($('orImport')) $('orImport').addEventListener('click', () => orImport(true));
  if ($('orFree')) $('orFree').addEventListener('change', orRender);
  $('textProvider').addEventListener('change', orToggle);
  $('imageProvider').addEventListener('change', orToggle);
  orToggle();

  $('savedList').addEventListener('click', (e) => {
    const o = e.target.closest('[data-open]');
    if (o) return loadSaved(o.dataset.open, false);
    const ap = e.target.closest('[data-append]');
    if (ap) return loadSaved(ap.dataset.append, true);
    const d = e.target.closest('[data-del]');
    if (d) deleteSaved(d.dataset.del);
  });
  loadSavedList();

  /* ---------- แผนการจัดการเรียนรู้ที่ใช้เป็นแกน ---------- */
  async function setLessonPlan(id, title) {
    state.lpId = id || '';
    $('lpBar').classList.toggle('hidden', !state.lpId);
    if (!state.lpId) return;
    $('lpOpen').href = 'lplan.php?open=' + encodeURIComponent(state.lpId);
    $('lpTitle').textContent = title || '…';
    if (!title) {
      try {
        const d = (await api('api/lplan.php', { action: 'get', id: state.lpId })).data;
        $('lpTitle').textContent = (d.plan && d.plan.title) || '';
      } catch {
        $('lpTitle').textContent = '(ไม่พบแผนนี้แล้ว)';
      }
    }
  }
  $('lpClear').addEventListener('click', () => setLessonPlan(''));
  /** เปิดจากหน้าแผนการสอน: index.php?lp=ID[&idea=ลำดับใบงานในแผน] */
  async function startFromLessonPlan(id, idea) {
    try {
      const d = (await api('api/lplan.php', { action: 'get', id })).data;
      const h = d.head || {}, p = d.plan || {};
      if (h.grade && [...$('grade').options].some((o) => o.value === h.grade)) {
        $('grade').value = h.grade;
        fillSubjects(h.subject || undefined);
      }
      if (h.subject) setSubject(h.subject);
      $('termSel').value = h.term === '1' || h.term === '2' ? h.term : '';
      fillUnits();
      if (h.unit && [...$('unit').options].some((o) => o.value === h.unit)) $('unit').value = h.unit;
      const ideas = p.worksheetIdeas || [];
      const chosen = idea >= 0 && ideas[idea] ? [ideas[idea]] : ideas;
      $('topic').value = (idea >= 0 && ideas[idea] ? ideas[idea].topic : p.title) || h.topic || '';
      $('count').value = String(Math.max(1, chosen.length));
      const types = new Set(chosen.map((w) => w.type));
      if (types.size) for (const cb of document.querySelectorAll('#types input')) {
        cb.checked = types.has(cb.value);
        cb.dispatchEvent(new Event('change', { bubbles: true }));
      }
      state.lpIdea = idea >= 0 && ideas[idea] ? idea : -1;
      await setLessonPlan(id, p.title || '');
      const want = p.indicatorCodes || [];
      await loadIndicators();
      if (want.length) {
        indChecked.clear();
        for (const i of indAll) if (want.includes(i.code)) indChecked.add(i.code);
        renderIndicators();
      }
    } catch (e) {
      showError(e.message);
    }
  }

  // เปิดจากหน้าคลังใบงาน: index.php?open=ID (เปิดชุด) หรือ ?append=ID (ดึงมาต่อท้าย)
  try {
    const qs = new URLSearchParams(location.search);
    const openId = qs.get('open');
    const appendId = qs.get('append');
    if (openId || appendId) {
      history.replaceState(null, '', location.pathname);
      loadSaved(openId || appendId, !openId);
    } else if (qs.get('lp')) {
      const lp = qs.get('lp');
      const idea = qs.get('idea') != null ? Number(qs.get('idea')) : -1;
      history.replaceState(null, '', location.pathname);
      startFromLessonPlan(lp, Number.isInteger(idea) ? idea : -1);
    } else if (qs.get('topic')) {
      // เปิดจากหน้าแผนภาคเรียน: index.php?grade=&subject=&topic=&type=&ind=รหัส,รหัส
      const g = qs.get('grade');
      history.replaceState(null, '', location.pathname);
      if (g && [...$('grade').options].some((o) => o.value === g)) {
        $('grade').value = g;
        fillSubjects(qs.get('subject') || undefined);
      }
      if (qs.get('subject')) setSubject(qs.get("subject"));
      if (['1', '2'].includes(qs.get('term') || '')) { $('termSel').value = qs.get('term'); fillUnits(); }
      $('topic').value = qs.get('topic');
      $('count').value = '1';
      const ty = qs.get('type');
      if (ty) for (const cb of document.querySelectorAll('#types input')) {
        cb.checked = cb.value === ty;
        cb.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const want = (qs.get('ind') || '').split(',').filter(Boolean);
      if (want.length) loadIndicators().then(() => {
        for (const i of indAll) if (want.includes(i.code)) indChecked.add(i.code);
        renderIndicators();
      });
    }
  } catch {}

  $('startBtn').addEventListener('click', start);
  $('appendBtn').addEventListener('click', () => runBatch(true));
  $('regenAllBtn').addEventListener('click', regenerateAll);
  $('copyBtn').addEventListener('click', saveCopy);
  if ($('onlineWsBtn')) {
    $('onlineWsBtn').addEventListener('click', async () => {
      const doneSheets = state.sheets.filter((s) => s.status === 'done' && s.sheet);
      if (!doneSheets.length) {
        showError('กรุณาสร้างใบงานให้เสร็จอย่างน้อย 1 ใบก่อนแปลงเป็นข้อสอบออนไลน์');
        return;
      }
      const btn = $('onlineWsBtn');
      const box = $('onlineWsBox');
      btn.disabled = true;
      btn.textContent = 'กำลังแปลงเป็นข้อสอบออนไลน์…';
      try {
        const res = await apiOnce('api/online_exam.php', {
          action: 'create',
          sourceType: 'worksheet',
          id: state.onlineExamId || undefined,
          title: `แบบทดสอบออนไลน์: ${$('topic').value.trim() || state.baseTitle || 'ใบงาน'}`,
          topic: $('topic').value.trim(),
          subject: $('subject').value,
          grade: $('grade').value,
          school: $('hSchool').value.trim(),
          minutes: Number($('hMinutes').value) || 30,
          sheets: doneSheets,
        });
        state.onlineExamId = res.id;
        const fullUrl = `${location.origin}/${res.url}`;
        if (box) {
          box.classList.remove('hidden');
          box.innerHTML = `<div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:8px">
            <div><b>🌐 สร้างข้อสอบออนไลน์จากใบงานสำเร็จ!</b> (${res.exam.totalItems} ข้อ · มีรูปภาพประกอบเหมือนใบงาน)</div>
            <div class="row" style="gap:6px">
              <input type="text" readonly value="${esc(fullUrl)}" style="width:260px;padding:4px 8px;background:#fff;border:1px solid #93c5fd;border-radius:6px;font-size:12px" id="wsOnlineUrl">
              <button type="button" class="ghost small" id="wsCopyOnlineBtn">📋 คัดลอกลิงก์</button>
              <a href="${esc(res.url)}" target="_blank" style="background:#2563eb;color:#fff;text-decoration:none;padding:5px 12px;border-radius:8px;font-weight:700;font-size:13px">🚀 เปิดทำข้อสอบออนไลน์</a>
            </div>
          </div>`;
          const cp = $('wsCopyOnlineBtn');
          if (cp) {
            cp.addEventListener('click', () => {
              const inp = $('wsOnlineUrl');
              if (inp) {
                inp.select();
                if (navigator.clipboard) navigator.clipboard.writeText(inp.value).catch(() => {});
                cp.textContent = '✓ คัดลอกแล้ว';
              }
            });
          }
        }
      } catch (e) {
        showError(e.message || 'แปลงเป็นข้อสอบออนไลน์ไม่สำเร็จ');
      } finally {
        btn.disabled = false;
        btn.textContent = '🌐 แปลงเป็นข้อสอบออนไลน์';
      }
    });
  }
  $('viewBoth').addEventListener('click', () => {
    state.view = 'both';
    fullRender();
  });
  $('viewWs').addEventListener('click', () => {
    state.view = 'worksheet';
    fullRender();
  });
  $('viewAns').addEventListener('click', () => {
    state.view = 'answers';
    fullRender();
  });
  $('retryImgs').addEventListener('click', () => {
    for (const [key, st] of Object.entries(state.images)) {
      if (st.status !== 'error') continue;
      queue.push(key); // key คือคำบรรยายภาพที่ตัดช่องว่าง/ตัวพิมพ์เล็กแล้ว ใช้เป็นคำสั่งสร้างภาพได้เลย
    }
    clearError();
    if (!state.busy) beginRun(); // ล้างสถานะ "หยุด" ของรอบก่อน
    pump();
  });
  document.querySelectorAll('.stopBtn').forEach((b) => b.addEventListener('click', stopRun));
  $('printBtn').addEventListener('click', () => {
    const loading = Object.values(state.images).some((s) => s.status === 'loading');
    if (loading && !window.confirm('ยังมีภาพที่กำลังสร้างอยู่ พิมพ์ตอนนี้เลยไหม?')) return;
    window.print();
  });
  $('pages').addEventListener('click', (e) => {
    const regen = e.target.closest('[data-regen]');
    if (regen && !state.busy) return regenerate(Number(regen.dataset.regen));
    const mv = e.target.closest('[data-move]');
    if (mv) {
      const [idx, dl] = mv.dataset.move.split(':').map(Number);
      return moveSheet(idx, dl);
    }
    const ls = e.target.closest('[data-lesson]');
    if (ls) return lessonFor(Number(ls.dataset.lesson));
    const dl = e.target.closest('[data-dellesson]');
    if (dl) {
      const k = Number(dl.dataset.dellesson);
      if (!state.busy && window.confirm('ลบใบความรู้ของใบนี้?')) {
        patch(k, { lesson: null, lessonStatus: '', wantLesson: false });
        scheduleSave(800);
      }
      return;
    }
    const del = e.target.closest('[data-delsheet]');
    if (del) return deleteSheet(Number(del.dataset.delsheet));
    const retry = e.target.closest('[data-retry]');
    if (retry) {
      if (!state.busy) beginRun();
      fetchImage(retry.dataset.retry, true);
    }
  });
})();
