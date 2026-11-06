/* เก็บไฟล์ต้นฉบับใน Google Drive ผ่าน Google Apps Script (Web app ที่ผู้ดูแลติดตั้งครั้งเดียว)
 * - ครูไม่ต้องล็อกอิน Google: ไฟล์ทั้งหมดไปอยู่ใน Drive ของบัญชีที่ Deploy สคริปต์ (โฟลเดอร์ “ผู้ช่วยครู AI - คลังเอกสาร”)
 * - ไฟล์ส่งจากเบราว์เซอร์ไป Google เป็นก้อนละ 4 MB ไม่ผ่าน/ไม่เก็บบน Server ของเว็บนี้ */
(function () {
  const CHUNK = 4 * 1024 * 1024; // ต้องเป็นทวีคูณของ 256 KB ตามกติกา Drive
  let url = '';
  let secret = '';
  let info = null; // { email, folderUrl } จากการทดสอบล่าสุด
  const listeners = new Set();
  const emit = () => listeners.forEach((f) => { try { f(api.status()); } catch { /* ไม่เป็นไร */ } });
  try { info = JSON.parse(localStorage.getItem('ta_gdrive_info') || 'null'); } catch { info = null; }

  async function call(body, tries) {
    let lastErr;
    for (let i = 0; i < (tries || 1); i++) {
      try {
        // text/plain = ไม่มี preflight (Apps Script ไม่ตอบ OPTIONS)
        const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ secret }, body)), redirect: 'follow' });
        const t = await r.text();
        let j;
        try { j = JSON.parse(t); } catch { throw new Error('สคริปต์ Google ไม่ตอบเป็นข้อมูล (ตรวจว่า Deploy เป็น Web app และตั้ง “Who has access” เป็น Anyone แล้ว)'); }
        if (j.error) throw Object.assign(new Error('Google Drive: ' + j.error), { fatal: true });
        return j;
      } catch (e) {
        lastErr = e.message === 'Failed to fetch' ? new Error('ติดต่อสคริปต์ Google ไม่ได้ (ตรวจอินเทอร์เน็ต หรือลิงก์ Web app)') : e;
        if (e.fatal) break;
        await new Promise((res) => setTimeout(res, 1500 * (i + 1)));
      }
    }
    throw lastErr;
  }

  const b64 = (blob) => new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result).slice(String(fr.result).indexOf(',') + 1));
    fr.onerror = () => rej(new Error('อ่านไฟล์ไม่ได้'));
    fr.readAsDataURL(blob);
  });

  const api = {
    init(cfg) {
      url = (cfg && cfg.scriptUrl) || '';
      secret = (cfg && cfg.secret) || '';
      emit();
    },
    configured: () => !!(url && secret),
    status: () => ({ configured: !!(url && secret), email: (info && info.email) || '', folderUrl: (info && info.folderUrl) || '', v: (info && info.v) || 0 }),
    onChange(f) { listeners.add(f); },
    /** ทดสอบการเชื่อมต่อ คืน { email, folderUrl } */
    async ping(tryUrl) {
      const keep = url;
      if (tryUrl) url = tryUrl;
      try {
        const j = await call({ action: 'ping' }, 2);
        info = { email: j.email || '', folderUrl: j.folderUrl || '', v: Number(j.v) || 1 };
        try { localStorage.setItem('ta_gdrive_info', JSON.stringify(info)); } catch { /* ไม่เป็นไร */ }
        emit();
        return info;
      } finally { if (tryUrl) url = keep; }
    },
    /** อัปโหลดไฟล์ขึ้น Drive คืนลิงก์ https://drive.google.com/file/d/ID/view */
    async upload(file, onProgress, path) {
      if (!api.configured()) throw new Error('ยังไม่ได้ตั้งค่า Google Drive');
      const type = file.type || (/\.pdf$/i.test(file.name) ? 'application/pdf' : 'application/octet-stream');
      const { session } = await call({ action: 'start', name: file.name, type, size: file.size, path: path || [] }, 2);
      let off = 0;
      if (onProgress) onProgress(0, file.size);
      for (;;) {
        const part = file.slice(off, Math.min(off + CHUNK, file.size));
        const j = await call({ action: 'chunk', session, offset: off, size: file.size, data: await b64(part) }, 3);
        if (j.url) { if (onProgress) onProgress(file.size, file.size); return j.url; }
        if (!(j.next > off)) throw new Error('อัปโหลดขึ้น Google Drive ไม่คืบหน้า');
        off = j.next;
        if (onProgress) onProgress(off, file.size);
      }
    },
    /** ดึงไฟล์จาก Drive (ของบัญชีที่ติดตั้งสคริปต์) มาเป็น File ในเบราว์เซอร์ ไว้ถอดข้อความ/OCR */
    async download(driveUrl, onProgress) {
      const id = (String(driveUrl).match(/\/d\/([\w-]+)/) || String(driveUrl).match(/[?&]id=([\w-]+)/) || [])[1];
      if (!id || !api.configured()) throw new Error('ลิงก์ Drive นี้ดึงไฟล์ไม่ได้');
      if (!(info && info.v >= 3)) { try { await api.ping(); } catch { /* ลองต่อ */ } }
      if (!(info && info.v >= 3)) throw new Error('สคริปต์ Google Drive เป็นรุ่นเก่า ยังดึงไฟล์มาอ่านไม่ได้ ให้ผู้ดูแลอัปเดตที่ “ตั้งค่า AI”');
      const meta = await call({ action: 'info', id }, 2);
      if (!meta.size) throw new Error('ไฟล์ใน Drive ว่างเปล่าหรือไม่ใช่ไฟล์ PDF');
      if (meta.size > 300 * 1024 * 1024) throw new Error('ไฟล์ใน Drive ใหญ่เกิน 300 MB');
      const parts = [];
      let off = 0;
      while (off < meta.size) {
        const j = await call({ action: 'read', id, offset: off, length: 3 * 1024 * 1024 }, 3);
        const bin = atob(j.data);
        const u8 = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
        if (!u8.length) throw new Error('อ่านไฟล์จาก Drive ไม่ครบ');
        parts.push(u8);
        off += u8.length;
        if (onProgress) onProgress(off, meta.size);
      }
      return new File(parts, meta.name || 'drive.pdf', { type: meta.mimeType || 'application/pdf' });
    },
    /** ทดสอบขั้นตอนจริงทีละขั้น (ติดต่อสคริปต์ → สร้างโฟลเดอร์ → อัปโหลด → แชร์ลิงก์) คืนรายการขั้นตอนพร้อมผล */
    async selfTest() {
      const steps = [];
      const step = async (name, fn) => { try { const v = await fn(); steps.push({ name, ok: true, v }); return v; } catch (e) { steps.push({ name, ok: false, v: e.message }); throw e; } };
      try {
        await step('ติดต่อสคริปต์ Google', () => api.ping());
        const f = new File([`ทดสอบจาก ผู้ช่วยครู AI ${new Date().toLocaleString('th-TH')}`], 'ทดสอบระบบ.txt', { type: 'text/plain' });
        const url = await step('อัปโหลดไฟล์ทดสอบเข้าโฟลเดอร์ “ทดสอบระบบ”', () => api.upload(f, null, ['ทดสอบระบบ']));
        await step('เปิดลิงก์ไฟล์ได้', async () => { const id = (url.match(/\/d\/([\w-]+)/) || [])[1]; return id ? url : Promise.reject(new Error('ไม่ได้ลิงก์ที่ถูกต้อง')); });
      } catch { /* บันทึกผลไว้แล้ว */ }
      return steps;
    },
    /** ย้ายไฟล์ที่ระบบอัปโหลดไว้ไปโฟลเดอร์ใหม่ (ไฟล์ที่ไม่ได้อัปโหลดผ่านระบบ ย้ายไม่ได้ จะคืน false) */
    async move(driveUrl, path) {
      const id = (String(driveUrl).match(/\/d\/([\w-]+)/) || [])[1];
      if (!id || !api.configured()) return false;
      try { await call({ action: 'move', id, path: path || [] }, 1); return true; } catch { return false; }
    },
    /** เส้นทางโฟลเดอร์จากข้อมูลเอกสาร: ชั้น / วิชา / เทอม */
    pathFor(m) {
      const g = (m.grades || []);
      return [g.length === 1 ? g[0] : g.length ? 'หลายชั้น' : 'ทุกชั้น', (m.subject || '').trim() || 'ไม่ระบุวิชา'].concat(m.term ? ['เทอม ' + m.term] : []);
    },
    folderUrl: () => (info && info.folderUrl) || '',
  };

  window.GDrive = api;
})();
