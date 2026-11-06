/* ตัวช่วยร่วมของหน้าคลัง (คลังเอกสาร / คลังใบงาน / หลักสูตร) */
(() => {
  'use strict';
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const fmtDate = (iso) => {
    const d = new Date(iso);
    return isNaN(d) ? '' : d.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
  };
  class ApiError extends Error {
    constructor(message, code, retryAfter) {
      super(message);
      this.code = code;
      this.retryAfter = Number(retryAfter) || 0;
    }
  }
  const ls = {
    get(k) {
      try {
        return localStorage.getItem(k);
      } catch {
        return null;
      }
    },
    set(k, v) {
      try {
        localStorage.setItem(k, v);
      } catch {}
    },
  };
  /** ผู้ให้บริการ AI ที่เลือกไว้ในหน้าสร้างใบงาน (จำไว้ในเบราว์เซอร์) */
  function providers() {
    const p = {};
    const t = ls.get('ws_textProvider');
    const i = ls.get('ws_imageProvider');
    if (t) p.textProvider = t;
    if (i) p.imageProvider = i;
    if (p.textProvider === 'openrouter' || p.imageProvider === 'openrouter') {
      p.orModels = { text: ls.get('ws_orText') || '', review: ls.get('ws_orReview') || '', image: ls.get('ws_orImage') || '' };
    }
    return p;
  }
  async function api(url, body, withProviders, signal) {
    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'worksheet' },
        body: JSON.stringify(Object.assign({}, withProviders ? providers() : {}, body)),
        signal,
      });
    } catch (e) {
      if (e && e.name === 'AbortError') throw new ApiError('หยุดแล้ว', 'ABORT');
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
  /** ปุ่ม "หยุด" สำหรับงานที่ใช้เวลานาน: คืน { signal, done() } ส่ง signal ให้ api(...) แล้วเรียก done() ตอนจบ */
  function stoppable(stopBtn) {
    const ctl = new AbortController();
    const onClick = () => ctl.abort();
    stopBtn.classList.remove('hidden');
    stopBtn.addEventListener('click', onClick);
    return {
      signal: ctl.signal,
      done() {
        stopBtn.classList.add('hidden');
        stopBtn.removeEventListener('click', onClick);
      },
    };
  }
  const GRADES = ['ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6', 'ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6'];
  /** วิชาทั้งหมดที่รู้จัก (จาก curriculum.js) */
  function allSubjects() {
    const set = new Set();
    for (const g of Object.values(window.CURRICULUM || {})) for (const s of Object.keys(g)) set.add(s);
    return [...set];
  }
  function showError(msg) {
    const el = document.getElementById('jserr');
    if (!el) return;
    el.textContent = msg || '';
    el.classList.toggle('hidden', !msg);
  }
  window.WS = { esc, fmtDate, api, ApiError, ls, GRADES, allSubjects, showError, providers, stoppable };
})();
