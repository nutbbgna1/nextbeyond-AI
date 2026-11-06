/* ถอดข้อความจากไฟล์ในเบราว์เซอร์: PDF (pdf.js), DOCX (JSZip), TXT/MD/CSV  คืน { pages:[{n,text}] } */
(() => {
  'use strict';
  const MAX_BYTES = 300 * 1024 * 1024;

  /** ข้อความยาวที่ไม่มีหน้า (docx/txt) → แบ่งเป็นหน้าสมมติ ~3000 ตัวอักษรตามย่อหน้า */
  function paginateText(text, size = 3000) {
    const paras = text.split(/\n+/);
    const pages = [];
    let cur = '';
    for (const p of paras) {
      if (cur && cur.length + p.length > size) {
        pages.push(cur);
        cur = '';
      }
      cur += (cur ? '\n' : '') + p;
    }
    if (cur.trim()) pages.push(cur);
    return pages.map((t, i) => ({ n: i + 1, text: t.trim() })).filter((p) => p.text);
  }

  /** ฟอนต์ภาษาไทยบางตัวใช้รหัสพิเศษ (U+F700-F71A) สำหรับสระ/วรรณยุกต์ที่ปรับตำแหน่ง → แปลงกลับเป็นอักษรไทยมาตรฐาน */
  const THAI_PUA = {
    0xf700: 0x0e10, 0xf701: 0x0e34, 0xf702: 0x0e35, 0xf703: 0x0e36, 0xf704: 0x0e37, 0xf705: 0x0e48, 0xf706: 0x0e49, 0xf707: 0x0e4a, 0xf708: 0x0e4b,
    0xf709: 0x0e4c, 0xf70a: 0x0e48, 0xf70b: 0x0e49, 0xf70c: 0x0e4a, 0xf70d: 0x0e4b, 0xf70e: 0x0e4c, 0xf70f: 0x0e0d, 0xf710: 0x0e31, 0xf711: 0x0e4d,
    0xf712: 0x0e47, 0xf713: 0x0e48, 0xf714: 0x0e49, 0xf715: 0x0e4a, 0xf716: 0x0e4b, 0xf717: 0x0e4c, 0xf718: 0x0e38, 0xf719: 0x0e39, 0xf71a: 0x0e3a,
  };
  const fixThai = (s) => s.replace(/[\uf700-\uf71a]/g, (c) => String.fromCharCode(THAI_PUA[c.charCodeAt(0)] || c.charCodeAt(0)));
  /** นิกหิต + สระอา แยกกัน (ํ า) → สระอำ */
  const joinAm = (s) => s.replace(/\u0e4d\s?\u0e32/g, '\u0e33');

  async function readPdf(file, onProgress) {
    const lib = window.pdfjsLib;
    if (!lib) throw new Error('โหลดตัวอ่าน PDF ไม่สำเร็จ (assets/vendor/pdf.min.js)');
    lib.GlobalWorkerOptions.workerSrc = 'assets/vendor/pdf.worker.min.js';
    const data = new Uint8Array(await file.arrayBuffer());
    const pdf = await lib.getDocument({ data }).promise;
    const pages = [];
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      if (onProgress && (n % 5 === 0 || n === pdf.numPages)) onProgress(n, pdf.numPages);
      const tc = await page.getTextContent();
      let out = '';
      let lastY = null;
      for (const it of tc.items) {
        if (!('str' in it)) continue;
        if (it.str.trim() === '' && it.width < 0.5) continue; // ช่องว่างกว้าง 0 ที่ pdf.js แทรกหลังสระ/วรรณยุกต์ (ไม่ใช่ช่องว่างจริง)
        const y = it.transform ? it.transform[5] : 0;
        if (lastY !== null && Math.abs(y - lastY) > 3) out += '\n';
        out += it.str;
        if (it.hasEOL) out += '\n';
        lastY = y;
      }
      pages.push({ n, text: joinAm(fixThai(out)).replace(/[ \t]+\n/g, '\n').trim() });
      page.cleanup(); // คืนหน่วยความจำของหน้าที่อ่านแล้ว (ไฟล์ใหญ่)
    }
    return pages.filter((p) => p.text);
  }

  /* ---------- OCR: PDF ที่เป็นภาพสแกน (Tesseract.js ทำงานในเบราว์เซอร์ ไฟล์ไม่ออกจากเครื่อง) ---------- */
  let ocrWorker = null;
  const loadScript = (src) => new Promise((ok, no) => {
    const el = document.createElement('script');
    el.src = src;
    el.onload = ok;
    el.onerror = () => no(new Error('โหลดตัวอ่านตัวอักษร (OCR) ไม่สำเร็จ: ' + src));
    document.head.appendChild(el);
  });
  async function getOcr() {
    if (ocrWorker) return ocrWorker;
    if (!window.Tesseract) await loadScript('assets/vendor/tesseract/tesseract.min.js');
    const base = new URL('assets/vendor/tesseract/', location.href).href;
    ocrWorker = await window.Tesseract.createWorker(['tha', 'eng'], 1, {
      workerPath: base + 'worker.min.js', corePath: base, langPath: base + 'lang', gzip: true, workerBlobURL: false,
    });
    return ocrWorker;
  }
  /** อ่านตัวอักษรจากภาพของแต่ละหน้า PDF (ไทย+อังกฤษ) ช้ากว่าปกติ หน้าละหลายวินาที */
  async function ocrPdf(file, onProgress) {
    const lib = window.pdfjsLib;
    lib.GlobalWorkerOptions.workerSrc = 'assets/vendor/pdf.worker.min.js';
    const pdf = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    const worker = await getOcr();
    const pages = [];
    // pdf.js วาดหน้าด้วย requestAnimationFrame ซึ่งจะหยุดเมื่อแท็บถูกซ่อน/สลับไปแท็บอื่น → ใช้ตัวจับเวลาแทนระหว่าง OCR เพื่อให้อ่านต่อได้แม้สลับแท็บ
    const rafOrig = window.requestAnimationFrame;
    window.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 16);
    try {
    for (let n = 1; n <= pdf.numPages; n++) {
      if (onProgress) onProgress(n, pdf.numPages);
      const page = await pdf.getPage(n);
      const vp = page.getViewport({ scale: 2 });
      const cv = document.createElement('canvas');
      cv.width = Math.round(vp.width);
      cv.height = Math.round(vp.height);
      const ctx = cv.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, cv.width, cv.height);
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
      const { data } = await worker.recognize(cv);
      cv.width = cv.height = 0;
      page.cleanup();
      // Tesseract ภาษาไทยมักแทรกช่องว่างระหว่างตัวอักษรไทย → ตัดออก (ช่องว่างระหว่างคำยังไม่มีก็อ่านได้ปกติ)
      const text = joinAm(data.text).replace(/([\u0E00-\u0E7F])[ \t]+(?=[\u0E00-\u0E7F])/g, '$1').replace(/[ \t]+\n/g, '\n').trim();
      if (text) pages.push({ n, text });
    }
    } finally {
      window.requestAnimationFrame = rafOrig;
    }
    return pages;
  }

  async function readDocx(file) {
    if (!window.JSZip) throw new Error('โหลดตัวอ่าน DOCX ไม่สำเร็จ (assets/vendor/jszip.min.js)');
    const zip = await window.JSZip.loadAsync(await file.arrayBuffer());
    const entry = zip.file('word/document.xml');
    if (!entry) throw new Error('ไฟล์ DOCX นี้ไม่มีเนื้อหา');
    const xml = new DOMParser().parseFromString(await entry.async('string'), 'application/xml');
    const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
    const lines = [];
    for (const p of xml.getElementsByTagNameNS(W, 'p')) {
      let t = '';
      for (const n of p.getElementsByTagName('*')) {
        if (n.namespaceURI !== W) continue;
        if (n.localName === 't') t += n.textContent;
        else if (n.localName === 'tab') t += '\t';
        else if (n.localName === 'br') t += '\n';
      }
      lines.push(t);
    }
    return paginateText(lines.join('\n'));
  }

  async function readText(file) {
    return paginateText(await file.text());
  }

  async function extract(file, onProgress) {
    if (file.size > MAX_BYTES) throw new Error(`ไฟล์ใหญ่เกินไป (${Math.round(file.size / 1048576)} MB, สูงสุด 300 MB)`);
    const name = (file.name || '').toLowerCase();
    let pages;
    if (name.endsWith('.pdf') || file.type === 'application/pdf') pages = await readPdf(file, onProgress);
    else if (name.endsWith('.docx')) pages = await readDocx(file);
    else if (/\.(txt|md|csv)$/.test(name) || (file.type || '').startsWith('text/')) pages = await readText(file);
    else throw new Error('ชนิดไฟล์นี้ยังไม่รองรับ (ใช้ PDF, DOCX, TXT, MD)');
    return { pages };
  }

  window.WSExtract = { extract, paginateText, ocrPdf };
})();
