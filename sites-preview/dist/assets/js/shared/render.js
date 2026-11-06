/* แม่แบบหน้าใบงาน/ใบความรู้ A4 (สไตล์เด็กและสไตล์ทางการ) ที่ใช้ร่วมกันระหว่างหน้าสร้างใบงาน (app.js) และหน้ารวมเล่ม (book.js) */
(function (root) {
  'use strict';
  const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const LETTERS = ['ก', 'ข', 'ค', 'ง', 'จ', 'ฉ'];

  /** สลับลำดับแบบคงที่ (ผลเหมือนเดิมทุกครั้งที่เรนเดอร์) */
  function seeded(list, seedText) {
    let h = 2166136261;
    for (const c of seedText) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    const rnd = () => {
      h += 0x6d2b79f5;
      let t = h;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const a = [...list];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /** ลำดับสลับที่ไม่ตรงกับลำดับเดิม (กรณีสุ่มแล้วได้ลำดับเดิมพอดี) */
  function shuffledIdx(n, seed) {
    const idx = Array.from({ length: n }, (_, i) => i);
    if (n < 2) return idx;
    let out = seeded(idx, seed);
    let k = 0;
    while (out.every((v, i) => v === i) && k++ < 5) out = seeded(idx, seed + k);
    if (out.every((v, i) => v === i)) out = [...idx.slice(1), idx[0]];
    return out;
  }

  /* ------------------------------------------------------------------ */
  /*  ตัวช่วยทั่วไป                                                       */
  /* ------------------------------------------------------------------ */
  const NEW_TYPES = ['short_answer', 'calculation', 'multi_statement', 'data_set', 'exam'];
  const EXAM_WRITTEN_POINTS = 3;
  const arr = (x) => (Array.isArray(x) ? x : []);
  /** ข้อความที่อาจมีสูตร LaTeX ($...$): escape HTML แล้วขึ้นบรรทัดใหม่ตาม \n (KaTeX จะแปลงสูตรภายหลัง) */
  const tx = (s) => esc(s).replace(/\n/g, '<br>');
  const LEVEL_LABEL = { 1: 'ง่าย', 2: 'ปานกลาง', 3: 'ยาก', 4: 'ยากมาก' };
  const anchorAttr = (opts) => (opts && opts.anchor ? ` data-anchor="${esc(opts.anchor)}"` : '');

  /** ข้อความสำหรับใส่ใน SVG (แปลง LaTeX พื้นฐานเป็นตัวอักษร) + ตัวห้อย/ยกกำลังแบบ F_1, m^2 */
  const GREEK = {
    alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', Delta: 'Δ', theta: 'θ', lambda: 'λ', mu: 'μ', pi: 'π', rho: 'ρ',
    sigma: 'σ', tau: 'τ', phi: 'φ', omega: 'ω', Omega: 'Ω', varepsilon: 'ε', epsilon: 'ε', times: '×', cdot: '·',
    circ: '°', degree: '°', approx: '≈', leq: '≤', geq: '≥', rightarrow: '→', to: '→',
  };
  function svgText(raw) {
    let s = String(raw ?? '')
      .replace(/\$/g, '')
      .replace(/\\(?:mathrm|text|mathbf)\{([^}]*)\}/g, '$1')
      .replace(/\\([a-zA-Z]+)/g, (m, w) => GREEK[w] ?? w)
      .replace(/[{}]/g, (c) => c) // คงวงเล็บปีกกาไว้ให้ตัวห้อยแบบ x_{12}
      .replace(/\\,|\\ /g, ' ');
    let out = '';
    const re = /([_^])(\{[^}]*\}|[A-Za-z0-9α-ωΑ-Ω+\-]+)/g;
    let last = 0;
    let m;
    while ((m = re.exec(s))) {
      out += esc(s.slice(last, m.index).replace(/[{}]/g, ''));
      const t = m[2].replace(/[{}]/g, '');
      out += `<tspan baseline-shift="${m[1] === '_' ? 'sub' : 'super'}" font-size="70%">${esc(t)}</tspan>`;
      last = m.index + m[0].length;
    }
    return out + esc(s.slice(last).replace(/[{}]/g, ''));
  }

  function niceStep(range, target) {
    const raw = range / Math.max(1, target);
    const p = Math.pow(10, Math.floor(Math.log10(raw || 1)));
    const f = raw / p;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
  }
  const fmtNum = (v) => String(Math.round(v * 1000) / 1000);

  /* ------------------------------------------------------------------ */
  /*  รูปประกอบที่ระบบวาดเอง: กราฟ / แผนภาพ / ตาราง                       */
  /* ------------------------------------------------------------------ */
  function graphSVG(f) {
    const series = arr(f.series).filter((s) => arr(s.points).length >= 2);
    const pts = series.flatMap((s) => arr(s.points)).concat(arr(f.marks));
    if (!pts.length) return '';
    const xs = pts.map((p) => Number(p.x) || 0);
    const ys = pts.map((p) => Number(p.y) || 0);
    let x0 = Math.min(0, ...xs), x1 = Math.max(...xs), y0 = Math.min(0, ...ys), y1 = Math.max(...ys);
    if (x1 === x0) x1 = x0 + 1;
    if (y1 === y0) y1 = y0 + 1;
    const xs_ = niceStep(x1 - x0, 6), ys_ = niceStep(y1 - y0, 5);
    x1 = Math.ceil(x1 / xs_) * xs_;
    y1 = Math.ceil((y1 * 1.05) / ys_) * ys_;
    x0 = Math.floor(x0 / xs_) * xs_;
    y0 = Math.floor(y0 / ys_) * ys_;
    const W = 400, H = 240, L = 52, R = 70, T = 24, B = 34;
    const X = (v) => L + ((v - x0) / (x1 - x0)) * (W - L - R);
    const Y = (v) => H - B - ((v - y0) / (y1 - y0)) * (H - T - B);
    let g = '';
    // เส้นตารางและตัวเลขบนแกน
    for (let v = x0; v <= x1 + 1e-9; v += xs_) {
      g += `<line x1="${X(v)}" y1="${Y(y0)}" x2="${X(v)}" y2="${Y(y1)}" stroke="#ddd" stroke-width="0.6"/>`;
      g += `<text x="${X(v)}" y="${Y(y0) + 15}" text-anchor="middle" font-size="11">${fmtNum(v)}</text>`;
    }
    for (let v = y0; v <= y1 + 1e-9; v += ys_) {
      g += `<line x1="${X(x0)}" y1="${Y(v)}" x2="${X(x1)}" y2="${Y(v)}" stroke="#ddd" stroke-width="0.6"/>`;
      g += `<text x="${X(x0) - 6}" y="${Y(v) + 4}" text-anchor="end" font-size="11">${fmtNum(v)}</text>`;
    }
    const ax = Y(Math.max(y0, Math.min(0, y1))), ay = X(Math.max(x0, Math.min(0, x1)));
    g += `<line x1="${X(x0)}" y1="${ax}" x2="${X(x1) + 14}" y2="${ax}" stroke="#000" stroke-width="1.4" marker-end="url(#ah)"/>`;
    g += `<line x1="${ay}" y1="${Y(y0)}" x2="${ay}" y2="${Y(y1) - 12}" stroke="#000" stroke-width="1.4" marker-end="url(#ah)"/>`;
    g += `<text x="${X(x1) + 18}" y="${ax + 4}" font-size="12">${svgText(f.xLabel)}</text>`;
    g += `<text x="${ay + 6}" y="${T - 8}" font-size="12">${svgText(f.yLabel)}</text>`;
    const dashes = ['', '6 4', '2 3', '10 4 2 4'];
    series.forEach((s, k) => {
      const p = arr(s.points).map((q) => [X(Number(q.x) || 0), Y(Number(q.y) || 0)]);
      if (s.shade) {
        const base = Y(Math.max(y0, 0));
        g += `<polygon points="${p[0][0]},${base} ${p.map((q) => q.join(',')).join(' ')} ${p[p.length - 1][0]},${base}" fill="#d9d9d9" stroke="none"/>`;
      }
      g += `<polyline points="${p.map((q) => q.join(',')).join(' ')}" fill="none" stroke="#000" stroke-width="2" stroke-dasharray="${dashes[k % 4]}" stroke-linejoin="round"/>`;
      if (s.label) {
        const q = p[p.length - 1];
        g += `<text x="${q[0] + 5}" y="${q[1] - 4}" font-size="12">${svgText(s.label)}</text>`;
      }
    });
    for (const mk of arr(f.marks)) {
      const mx = X(Number(mk.x) || 0), my = Y(Number(mk.y) || 0);
      g += `<circle cx="${mx}" cy="${my}" r="3" fill="#000"/>`;
      if (mk.label) g += `<text x="${mx + 6}" y="${my - 6}" font-size="12" font-weight="700">${svgText(mk.label)}</text>`;
    }
    return `<svg class="fig-svg" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="Sarabun, sans-serif">${ARROW_DEF}${g}</svg>`;
  }

  const ARROW_DEF =
    '<defs><marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#000"/></marker></defs>';

  function diagramSVG(f) {
    const S = 6; // 1 หน่วย = 6 px บนพื้นที่ 100 x 60
    const X = (v) => (Number(v) || 0) * S;
    const Y = (v) => (60 - (Number(v) || 0)) * S;
    let g = '';
    for (const sh of arr(f.shapes)) {
      const { x1, y1, x2, y2 } = sh;
      const label = sh.label ? svgText(sh.label) : '';
      if (sh.shape === 'box') {
        const lx = Math.min(X(x1), X(x2)), ty = Math.min(Y(y1), Y(y2));
        const w = Math.abs(X(x2) - X(x1)), h = Math.abs(Y(y2) - Y(y1));
        g += `<rect x="${lx}" y="${ty}" width="${w}" height="${h}" fill="#fff" stroke="#000" stroke-width="2.4"/>`;
        if (label) g += `<text x="${lx + w / 2}" y="${ty + h / 2 + 7}" text-anchor="middle" font-size="22">${label}</text>`;
      } else if (sh.shape === 'circle') {
        g += `<circle cx="${X(x1)}" cy="${Y(y1)}" r="${Math.abs(Number(x2) || 3) * S}" fill="#fff" stroke="#000" stroke-width="2.4"/>`;
        if (label) g += `<text x="${X(x1)}" y="${Y(y1) + 7}" text-anchor="middle" font-size="22">${label}</text>`;
      } else if (sh.shape === 'arrow') {
        g += `<line x1="${X(x1)}" y1="${Y(y1)}" x2="${X(x2)}" y2="${Y(y2)}" stroke="#000" stroke-width="2.6" marker-end="url(#ah)"/>`;
        if (label) {
          const dx = X(x2) - X(x1), dy = Y(y2) - Y(y1), len = Math.hypot(dx, dy) || 1;
          g += `<text x="${X(x2) + (dx / len) * 18}" y="${Y(y2) + (dy / len) * 18 + 7}" text-anchor="middle" font-size="22" font-weight="700">${label}</text>`;
        }
      } else {
        g += `<line x1="${X(x1)}" y1="${Y(y1)}" x2="${X(x2)}" y2="${Y(y2)}" stroke="#000" stroke-width="${sh.shape === 'dashed' ? 1.6 : 2.6}"${sh.shape === 'dashed' ? ' stroke-dasharray="5 4"' : ''}/>`;
        if (label) g += `<text x="${(X(x1) + X(x2)) / 2}" y="${(Y(y1) + Y(y2)) / 2 - 8}" text-anchor="middle" font-size="20">${label}</text>`;
      }
    }
    for (const mk of arr(f.marks)) {
      if (mk.label) g += `<text x="${X(mk.x)}" y="${Y(mk.y)}" text-anchor="middle" font-size="22">${svgText(mk.label)}</text>`;
    }
    // ตัดขอบว่างออก: ใช้เฉพาะกรอบที่มีรูปจริง
    const xs = [], ys = [];
    for (const sh of arr(f.shapes)) {
      if (sh.shape === 'circle') {
        const r = Math.abs(Number(sh.x2) || 3);
        xs.push(X(sh.x1) - r * S, X(sh.x1) + r * S);
        ys.push(Y(sh.y1) - r * S, Y(sh.y1) + r * S);
      } else {
        xs.push(X(sh.x1), X(sh.x2));
        ys.push(Y(sh.y1), Y(sh.y2));
      }
    }
    for (const mk of arr(f.marks)) {
      xs.push(X(mk.x));
      ys.push(Y(mk.y));
    }
    if (!xs.length) return '';
    const pad = 34;
    const vx = Math.min(...xs) - pad, vy = Math.min(...ys) - pad, vw = Math.max(...xs) - Math.min(...xs) + pad * 2, vh = Math.max(...ys) - Math.min(...ys) + pad * 2;
    const widthMm = Math.min(150, Math.max(50, vw * 0.19));
    return `<svg class="fig-svg diagram" style="width:${widthMm.toFixed(1)}mm" viewBox="${vx} ${vy} ${vw} ${vh}" xmlns="http://www.w3.org/2000/svg" font-family="Sarabun, sans-serif">${ARROW_DEF}${g}</svg>`;
  }

  function tableHTML(headers, rows, cls) {
    const h = arr(headers);
    if (!h.length && !arr(rows).length) return '';
    return `<table class="${cls || 'ftab'}">${h.length ? `<thead><tr>${h.map((c) => `<th>${tx(c)}</th>`).join('')}</tr></thead>` : ''}<tbody>${arr(rows)
      .map((r) => `<tr>${arr(r).map((c) => `<td>${tx(c)}</td>`).join('')}</tr>`)
      .join('')}</tbody></table>`;
  }

  /** คำบรรยายภาพที่ต้องให้ AI วาดสำหรับรูปนี้ ('' = ไม่ต้องใช้ภาพ AI) */
  function figPrompt(f, style, mode) {
    if (!f || mode === 'none' || !String(f.imagePrompt || '').trim()) return '';
    const needAi = f.kind === 'image' || (mode === 'ai' && (f.kind === 'graph' || f.kind === 'diagram'));
    if (!needAi) return '';
    return (style === 'formal' ? 'tb:' : '') + String(f.imagePrompt).trim();
  }

  function figHTML(f, no, c) {
    if (!f || c.figureMode === 'none') return '';
    let inner = '';
    const ai = figPrompt(f, c.style, c.figureMode);
    if (ai) inner = c.img(ai, 'fig-img');
    else if (f.kind === 'svg' && f.svg) inner = f.svg;
    else if (f.kind === 'graph') inner = graphSVG(f);
    else if (f.kind === 'diagram') inner = diagramSVG(f);
    else if (f.kind === 'table') inner = tableHTML(f.headers, f.rows);
    if (!inner) return '';
    return `<div class="fig"><div class="fig-box">${inner}</div><div class="fig-cap">รูปที่ ${no}${f.caption ? ' ' + tx(f.caption) : ''}</div></div>`;
  }

  /** บริบทการวาด: ตัวหารูป + ติดตามว่ารูปไหนแสดงแล้ว (รูปจะแสดงก่อนข้อแรกที่อ้างถึง) */
  function ctx(doc, imgFn, opts, style) {
    const figs = arr(doc.figures);
    const byId = {};
    figs.forEach((f, i) => (byId[String(f.id || '').trim()] = { f, no: i + 1 }));
    const shown = new Set();
    const c = { img: imgFn, style, figureMode: opts.figureMode || 'code', byId, shown, showInd: opts.showInd !== false };
    /** ป้ายเล็กท้ายโจทย์: รหัสตัวชี้วัด (ถ้าเปิดไว้) และระดับความยาก (เฉพาะหน้าเฉลย) */
    c.tag = (it, answers) => {
      const parts = [];
      if (c.showInd && it && it.indicator) parts.push(esc(it.indicator));
      if (answers && it && LEVEL_LABEL[it.level]) parts.push('ระดับ' + LEVEL_LABEL[it.level]);
      return parts.length ? `<div class="ind-tag">${parts.join(' · ')}</div>` : '';
    };
    c.fig = (ref) => {
      const k = String(ref || '').trim();
      if (!k || !byId[k] || shown.has(k)) return '';
      shown.add(k);
      return figHTML(byId[k].f, byId[k].no, c);
    };
    c.rest = () =>
      figs
        .map((f) => c.fig(f.id))
        .filter(Boolean)
        .join('');
    return c;
  }

  /* ------------------------------------------------------------------ */
  /*  ส่วนเนื้อหาโจทย์ (ใช้ได้ทั้งสไตล์ทางการและสไตล์เด็ก)                    */
  /* ------------------------------------------------------------------ */
  const shortChoices = (ch) => arr(ch).every((x) => String(x).replace(/\$[^$]*\$/g, 'xxxx').length <= 26);

  function choicesHTML(ch, ansIdx, answers) {
    return `<div class="fch${shortChoices(ch) ? ' two' : ''}">${arr(ch)
      .map((c, j) => {
        const right = answers && j === ansIdx;
        return `<div${right ? ' class="ans"' : ''}><span class="cl">${LETTERS[j]}.</span> ${tx(c)}${right ? ' ✓' : ''}</div>`;
      })
      .join('')}</div>`;
  }

  const qBlock = (n, inner, cls) => `<div class="fq${cls ? ' ' + cls : ''}"><div class="fq-n">${n}.</div><div class="fq-t">${inner}</div></div>`;
  const dots = (k) => Array.from({ length: k }, () => '<div class="wline"></div>').join('');

  function mcItem(it, n, answers, c) {
    const pre = c.fig(it.figure);
    const ex = answers && it.explain ? `<div class="ans-note">${tx(it.explain)}</div>` : '';
    return pre + qBlock(n, `${tx(it.question)}${choicesHTML(it.choices, it.answerIndex, answers)}${ex}${c.tag(it, answers)}`);
  }

  function calcItem(it, n, answers, c) {
    const pre = c.fig(it.figure);
    const work = answers
      ? `<div class="sol"><div class="sol-h">วิธีทำ</div>${arr(it.solution)
          .map((l) => `<div>${tx(l)}</div>`)
          .join('')}<div class="sol-a">ตอบ ${tx(it.answer)}</div></div>`
      : `<div class="work">${dots(Math.max(2, Math.min(12, Number(it.lines) || 5)))}</div>`;
    return pre + qBlock(n, `${tx(it.question)}${work}${c.tag(it, answers)}`, 'calc');
  }

  /** ตัวเลือก ก-ง ของโจทย์ "ข้อใดถูก 1, 2, 3" สร้างจากชุดข้อความ (คงที่ทุกครั้งที่แสดง) */
  function multiChoices(it, seed) {
    const n = arr(it.statements).length;
    const correct = [...new Set(arr(it.correct).map(Number).filter((x) => x >= 1 && x <= n))].sort((a, b) => a - b);
    const key = (s) => s.join(',');
    const all = [];
    for (let m = 1; m < 1 << n; m++) all.push(Array.from({ length: n }, (_, i) => i + 1).filter((i) => m & (1 << (i - 1))));
    const others = seeded(all.filter((s) => key(s) !== key(correct)), seed).slice(0, 3);
    const opts = [correct, ...others].sort((a, b) => a.length - b.length || key(a).localeCompare(key(b)));
    return { labels: opts.map((s) => s.join(', ')), answerIndex: opts.findIndex((s) => key(s) === key(correct)) };
  }

  function multiItem(it, n, answers, c, seed) {
    const pre = c.fig(it.figure);
    const { labels, answerIndex } = multiChoices(it, seed);
    const st = arr(it.statements)
      .map((s, k) => `<div class="stm"><span>${k + 1}.</span> ${tx(s)}</div>`)
      .join('');
    const ex = answers && it.explain ? `<div class="ans-note">${tx(it.explain)}</div>` : '';
    return pre + qBlock(n, `${tx(it.question)}<div class="stms">${st}</div><div class="cq">คำตอบที่ถูกต้องคือ</div>${choicesHTML(labels, answerIndex, answers)}${ex}${c.tag(it, answers)}`);
  }

  function shortItem(it, n, answers, c) {
    const pre = c.fig(it.figure);
    const line = answers ? `<div class="sa"><span class="ans">${tx(it.answer)}</span></div>` : '<div class="sa"><span class="wline inline"></span></div>';
    return pre + qBlock(n, `${tx(it.question)}${line}${c.tag(it, answers)}`);
  }

  /** บรรทัดสรุปตัวชี้วัดท้ายใบงาน/ใบความรู้ */
  function indicatorFoot(doc, opts) {
    const l = arr(doc && doc.indicators).filter((x) => x && x.code);
    if (!l.length || (opts && opts.showInd === false)) return '';
    return `<div class="ind-foot"><b>ตัวชี้วัด</b> ` + l.map((x) => `${esc(x.code)} ${esc(x.text)}`).join(' &nbsp;·&nbsp; ') + '</div>';
  }

  /** บทอ่านที่ยกมาจากคลังเอกสารตรงตามต้นฉบับ (แยกย่อหน้าเป็นบล็อกเพื่อให้แบ่งหน้าได้) */
  function passageHTML(sheet) {
    const ps = sheet && sheet.passage;
    if (!ps || !ps.text) return '';
    const paras = String(ps.text).split(/\n+/).map((t) => t.trim()).filter(Boolean);
    return (
      `<div class="pas-h keep-next">${ps.title ? 'บทอ่าน: ' + esc(ps.title) : 'บทอ่าน'}</div>` +
      paras.map((t) => `<div class="pas-p">${esc(t)}</div>`).join('') +
      (ps.source ? `<div class="pas-src">${esc(ps.source)}</div>` : '')
    );
  }

  /** เนื้อหาของรูปแบบใหม่ (คืน HTML เป็นบล็อกเรียงกัน) */
  function newTypeBody(sheet, answers, c) {
    const items = arr(sheet.items);
    const seed = String(sheet.topic || '');
    let out = '';
    if (sheet.type === 'short_answer') out = items.map((it, i) => shortItem(it, i + 1, answers, c)).join('');
    else if (sheet.type === 'calculation') out = items.map((it, i) => calcItem(it, i + 1, answers, c)).join('');
    else if (sheet.type === 'multi_statement') out = items.map((it, i) => multiItem(it, i + 1, answers, c, seed + i)).join('');
    else if (sheet.type === 'data_set') {
      const n1 = 1, n2 = items.length;
      out =
        `<div class="stim"><div class="stim-h">ข้อมูลต่อไปนี้ใช้ตอบคำถามข้อ ${n1}–${n2}</div>${tx(sheet.stimulus)}</div>` +
        c.fig(sheet.stimulusFigure) +
        items.map((it, i) => mcItem(it, i + 1, answers, c)).join('');
    } else if (sheet.type === 'exam') {
      const mc = arr(sheet.mcItems), wr = arr(sheet.writtenItems);
      out =
        `<div class="part">ตอนที่ 1 แบบปรนัย ${mc.length} ข้อ (ข้อละ 1 คะแนน) ให้เลือกคำตอบที่ถูกต้องที่สุดเพียงคำตอบเดียว</div>` +
        mc.map((it, i) => mcItem(it, i + 1, answers, c)).join('') +
        `<div class="part">ตอนที่ 2 แบบอัตนัย ${wr.length} ข้อ (ข้อละ ${EXAM_WRITTEN_POINTS} คะแนน) ให้แสดงวิธีทำอย่างละเอียด</div>` +
        wr.map((it, i) => calcItem(it, mc.length + i + 1, answers, c)).join('');
    } else if (sheet.type === 'multiple_choice') {
      out = items.map((it, i) => mcItem(it, i + 1, answers, c)).join('');
    }
    return out + c.rest();
  }

  /** รูปแบบเดิม (เติมคำ/จับคู่/ถูกผิด/เรียงลำดับ) แบบทางการ */
  function formalClassicBody(sheet, answers, c) {
    const items = arr(sheet.items);
    if (sheet.type === 'fill_blank') {
      const bank = seeded(arr(sheet.wordBank), sheet.topic + 'bank');
      return (
        `<div class="wbank"><b>คำที่กำหนดให้:</b> ${bank.map((w) => tx(w)).join(' &nbsp;/&nbsp; ')}</div>` +
        items
          .map((it, i) => {
            const parts = String(it.text).split(/_{3,}/);
            return qBlock(i + 1, `${tx(parts[0])}<span class="fblank">${answers ? `<span class="ans">${tx(it.answer)}</span>` : ''}</span>${tx(parts.slice(1).join(''))}`);
          })
          .join('')
      );
    }
    if (sheet.type === 'true_false') {
      return (
        '<div class="hint-line">ให้เขียนเครื่องหมาย ✓ หน้าข้อความที่ถูก และ ✗ หน้าข้อความที่ผิด</div>' +
        items
          .map(
            (it, i) =>
              `<div class="fq"><div class="tfp">(${answers ? `<span class="ans">${it.answer ? '✓' : '✗'}</span>` : '&nbsp;&nbsp;&nbsp;'})</div><div class="fq-n">${i + 1}.</div><div class="fq-t">${tx(it.statement)}</div></div>`,
          )
          .join('')
      );
    }
    if (sheet.type === 'matching') {
      const order = shuffledIdx(items.length, sheet.topic + 'match');
      const letterOf = {};
      order.forEach((idx, k) => (letterOf[idx] = LETTERS.concat(['ช', 'ซ', 'ฌ', 'ญ', 'ฎ'])[k]));
      const L2 = LETTERS.concat(['ช', 'ซ', 'ฌ', 'ญ', 'ฎ']);
      const rows = items.map(
        (it, i) =>
          `<tr><td class="mblank">${answers ? `<span class="ans">${letterOf[i]}</span>` : '.......'}</td><td>${i + 1}. ${tx(it.left)}</td><td>${L2[i]}. ${tx(items[order[i]].right)}</td></tr>`,
      );
      return `<table class="mtab"><tbody>${rows.join('')}</tbody></table>`;
    }
    if (sheet.type === 'ordering') {
      const order = shuffledIdx(items.length, sheet.topic + 'order');
      return (
        '<div class="hint-line">ให้เขียนตัวเลขลำดับที่ถูกต้องลงในวงเล็บหน้าข้อความ</div>' +
        order
          .map((idx) => {
            const it = items[idx];
            return `<div class="fq"><div class="tfp">(${answers ? `<span class="ans">${it.order}</span>` : '&nbsp;&nbsp;&nbsp;'})</div><div class="fq-t">${tx(it.label)}</div></div>`;
          })
          .join('')
      );
    }
    return '';
  }

  /* ------------------------------------------------------------------ */
  /*  หน้าแบบทางการ (มัธยม)                                                 */
  /* ------------------------------------------------------------------ */
  function courseLine(h) {
    const parts = [];
    if (h.subject) parts.push(`รายวิชา${h.subject}${h.course ? ` (${h.course})` : ''}`);
    if (h.grade) parts.push(`ชั้น${h.grade}`);
    return parts.join(' ');
  }

  const nameRow = (scoreText) =>
    `<div class="fm-name"><span>ชื่อ-สกุล</span><span class="dl"></span><span>ชั้น</span><span class="dl s"></span><span>เลขที่</span><span class="dl xs"></span>${scoreText ? `<span>${scoreText}</span><span class="dl xs"></span>` : ''}</div>`;

  function formalSheetHTML(sheet, number, answers, imgHTML, opts) {
    const h = opts.header || {};
    const c = ctx(sheet, imgHTML, opts, 'formal');
    const label = opts.label || 'ใบงานที่ ' + number;
    let head, body;
    if (sheet.type === 'exam') {
      const mc = arr(sheet.mcItems).length, wr = arr(sheet.writtenItems).length;
      const full = mc + wr * EXAM_WRITTEN_POINTS;
      head =
        `<div class="ex-head">` +
        `<div class="b">${h.school ? esc(h.school) : 'โรงเรียน........................................................'}</div>` +
        `<div class="b">${answers ? 'เฉลย' : ''}แบบทดสอบ เรื่อง ${tx(sheet.topic)}</div>` +
        `<div class="r3"><span>วิชา${esc(h.subject || '')}</span><span>รหัสวิชา ${h.course ? esc(h.course) : '..........'}</span><span>ชั้น${esc(h.grade || '')}</span></div>` +
        `<div class="b">คะแนนเต็ม ${full} คะแนน &nbsp; เวลา ${h.minutes ? esc(h.minutes) : '......'} นาที</div>` +
        `</div>` +
        nameRow('คะแนนที่ได้');
      body = `<div class="instr-box"><b>คำชี้แจง</b> ${tx(sheet.instruction)}</div>` + passageHTML(sheet) + newTypeBody(sheet, answers, c) + indicatorFoot(sheet, opts);
    } else {
      head =
        `<div class="fm-top"><div>${esc(courseLine(h))}</div>${h.teacher ? `<div>${esc(h.teacher)}</div>` : ''}</div>` +
        `<div class="fm-title">${answers ? 'เฉลย' : ''}${esc(label)} เรื่อง ${tx(sheet.topic)}</div>` +
        nameRow('คะแนน');
      body =
        `<div class="instr-box"><b>คำชี้แจง</b> ${tx(sheet.instruction)}</div>` +
        passageHTML(sheet) +
        (NEW_TYPES.includes(sheet.type) || sheet.type === 'multiple_choice' ? newTypeBody(sheet, answers, c) : formalClassicBody(sheet, answers, c) + c.rest()) +
        indicatorFoot(sheet, opts);
    }
    return `<div class="page formal" data-flow="1"${anchorAttr(opts)} data-cont="${esc((answers ? 'เฉลย' : '') + label + ' (ต่อ)')}">
      <div class="fm-head">${head}</div>
      <div class="sh-body">${body}</div>
      <div class="pageno">${esc(opts.pageNo != null ? opts.pageNo : number)}</div>
    </div>`;
  }

  /* ------------------------------------------------------------------ */
  /*  ใบความรู้                                                           */
  /* ------------------------------------------------------------------ */
  function lessonHTML(lesson, number, imgHTML, opts) {
    opts = opts || {};
    const style = opts.style === 'formal' ? 'formal' : 'kid';
    const h = opts.header || {};
    const c = ctx(lesson, imgHTML || (() => ''), opts, style);
    const label = opts.label || 'ใบความรู้ที่ ' + number;
    const paras = (t) =>
      String(t || '')
        .split(/\n+/)
        .map((x) => x.trim())
        .filter(Boolean)
        .map((x) => `<p>${tx(x)}</p>`)
        .join('');
    let body = '';
    const indList = arr(lesson.indicators).filter((x) => x && x.code);
    if (indList.length && opts.showInd !== false)
      body += `<div class="ls-obj"><b>ตัวชี้วัด</b><ul>${indList.map((x) => `<li>${esc(x.code)} ${esc(x.text)}</li>`).join('')}</ul></div>`;
    if (lesson.intro) body += `<div class="ls-intro">${paras(lesson.intro)}</div>`;
    arr(lesson.sections).forEach((s, i) => {
      body += `<div class="ls-sec"><h3>${i + 1}. ${tx(s.heading)}</h3>${paras(s.body)}</div>`;
      if (arr(s.bullets).length) body += `<ul class="ls-ul">${arr(s.bullets).map((b) => `<li>${tx(b)}</li>`).join('')}</ul>`;
      if (String(s.formula || '').trim()) body += `<div class="ls-formula">$$${esc(String(s.formula).replace(/^\$+|\$+$/g, ''))}$$</div>`;
      if (arr(s.variables).length)
        body += tableHTML(
          ['สัญลักษณ์', 'ความหมาย', 'หน่วย'],
          arr(s.variables).map((v) => [`$${String(v.symbol || '').replace(/\$/g, '')}$`, v.meaning, v.unit]),
          'ftab vars',
        );
      body += c.fig(s.figure);
    });
    const exs = arr(lesson.examples);
    if (exs.length) {
      body += '<div class="ls-h2">ตัวอย่าง</div>';
      exs.forEach((e, i) => {
        body +=
          c.fig(e.figure) +
          `<div class="ls-ex"><div class="ex-q"><b>ตัวอย่างที่ ${i + 1}</b> ${tx(e.problem)}</div><div class="ex-s"><b>วิธีคิด</b>${arr(e.steps)
            .map((x) => `<div>${tx(x)}</div>`)
            .join('')}<div class="ex-a"><b>ตอบ</b> ${tx(e.answer)}</div></div></div>`;
      });
    }
    if (arr(lesson.pitfalls).length) body += `<div class="ls-warn"><b>ข้อควรระวัง</b><ul>${arr(lesson.pitfalls).map((x) => `<li>${tx(x)}</li>`).join('')}</ul></div>`;
    if (arr(lesson.summaryRows).length) body += `<div class="ls-h2">สรุป</div>` + tableHTML(lesson.summaryHeaders, lesson.summaryRows, 'ftab sum');
    body += c.rest();

    const title = `${label} เรื่อง ${tx(lesson.title || '')}`;
    const head =
      style === 'formal'
        ? `<div class="fm-top"><div>${esc(courseLine(h))}</div>${h.teacher ? `<div>${esc(h.teacher)}</div>` : ''}</div><div class="fm-title ls">${title}</div>`
        : `<div class="sh-title"><div class="tt"><div class="pill">${esc(label)}</div><div class="pill sm">${tx(lesson.title || '')}</div></div></div>`;
    return `<div class="page lesson ${style}" data-flow="1"${anchorAttr(opts)} data-cont="${esc(label + ' (ต่อ)')}">
      ${style === 'kid' ? '<div class="frame"></div>' : ''}
      <div class="${style === 'formal' ? 'fm-head' : 'sh-head'}">${head}</div>
      <div class="sh-body ls-body">${body}</div>
      <div class="pageno">${esc(opts.pageNo != null ? opts.pageNo : number)}</div>
    </div>`;
  }

  /** ทุกคำบรรยายภาพที่ต้องสร้างด้วย AI สำหรับใบงาน (และใบความรู้ ถ้ามี) */
  function imagePrompts(sheet, opts, lesson) {
    opts = opts || {};
    const style = opts.style === 'formal' ? 'formal' : 'kid';
    const mode = opts.figureMode || 'code';
    const out = [];
    if (sheet) {
      if (style === 'kid' && mode !== 'none') {
        out.push(sheet.headerImagePrompt, ...arr(sheet.items).map((it) => it && it.imagePrompt));
      }
      out.push(...arr(sheet.figures).map((f) => figPrompt(f, style, mode)));
    }
    if (lesson) out.push(...arr(lesson.figures).map((f) => figPrompt(f, style, mode)));
    return [...new Set(out.filter((p) => p && String(p).trim()))];
  }

  /* ------------------------------------------------------------------ */
  /*  สูตร (KaTeX) และการแบ่งหน้าอัตโนมัติ                                 */
  /* ------------------------------------------------------------------ */
  function typeset(el) {
    if (!el || typeof root.renderMathInElement !== 'function') return;
    try {
      root.renderMathInElement(el, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\(', right: '\\)', display: false },
        ],
        throwOnError: false,
        ignoredClasses: ['no-math'],
      });
    } catch (e) {
      /* สูตรผิดรูปแบบ: แสดงข้อความดิบแทน */
    }
  }

  const PX_PER_MM = 96 / 25.4;

  /** ตัดบล็อกที่ล้นหน้า A4 ไปขึ้นหน้าใหม่ (ไม่ตัดกลางข้อ) */
  function paginatePage(page, guard) {
    const body = page.querySelector(':scope > .sh-body');
    if (!body || guard > 30) return;
    const pr = page.getBoundingClientRect();
    if (!pr.height) return; // ยังไม่ได้วาดบนจอ (เช่นซ่อนอยู่)
    const sc = page.offsetHeight ? pr.height / page.offsetHeight : 1; // หน้าถูกย่อให้พอดีจอมือถือ: แปลงระยะเป็นสเกลเดียวกัน
    const limit = pr.bottom - 17 * PX_PER_MM * sc;
    const blocks = [...body.children];
    let cut = -1;
    for (let i = 0; i < blocks.length; i++) {
      if (blocks[i].getBoundingClientRect().bottom > limit) {
        cut = i === 0 ? (blocks.length > 1 ? 1 : -1) : i; // บล็อกแรกใหญ่เกินหน้า: ปล่อยไว้ ตัดที่บล็อกถัดไป
        break;
      }
    }
    while (cut > 1 && blocks[cut - 1].matches('.ls-h2, .part, .keep-next')) cut--; // หัวข้อต้องอยู่หน้าเดียวกับเนื้อหาถัดไป
    if (cut < 0 || cut >= blocks.length) return;
    const np = document.createElement('div');
    np.className = page.className.replace(/\s*\bcont\b/g, '') + ' cont';
    np.dataset.flow = '1';
    np.dataset.cont = page.dataset.cont || '';
    const kid = page.classList.contains('kid') || (page.classList.contains('lesson') && !page.classList.contains('formal'));
    np.innerHTML = `${kid ? '<div class="frame"></div>' : ''}<div class="cont-head">${esc(page.dataset.cont || '')}</div><div class="sh-body${
      body.classList.contains('ls-body') ? ' ls-body' : ''
    }"></div><div class="pageno"></div>`;
    const nb = np.querySelector('.sh-body');
    for (const b of blocks.slice(cut)) nb.appendChild(b);
    page.after(np);
    paginatePage(np, (guard || 0) + 1);
  }

  function paginate(rootEl) {
    if (!rootEl) return;
    const pages = rootEl.matches && rootEl.matches('.page[data-flow]') ? [rootEl] : [...rootEl.querySelectorAll('.page[data-flow]:not(.cont)')];
    for (const p of pages) paginatePage(p, 0);
  }

  /** สูตร → แบ่งหน้า (เรียกหลังใส่ HTML ลงหน้าเว็บทุกครั้ง) */
  function finish(el) {
    typeset(el);
    paginate(el);
  }

  /** ใส่เลขหน้าเรียงตามลำดับจริงหลังแบ่งหน้า (start = เลขของหน้าแรก, skipFirst = ไม่พิมพ์เลขบนหน้าแรก เช่นหน้าปก) */
  function numberPages(container, start, skipFirst) {
    const pages = [...container.querySelectorAll('.page')];
    pages.forEach((p, i) => {
      const n = (start || 1) + i;
      p.dataset.no = String(n);
      const el = p.querySelector(':scope > .pageno');
      if (el) el.textContent = skipFirst && i === 0 ? '' : String(n);
    });
    return pages.length;
  }

  /** สไตล์ตั้งต้นตามชั้น: มัธยม = ทางการ */
  const defaultStyle = (grade) => (/^ม\./.test(String(grade || '')) ? 'formal' : 'kid');

  /**
   * imgFn(prompt, cls) → HTML ของภาพ (ผู้เรียกกำหนดเองว่าจะหาภาพจากไหน)
   * opts.pageNo = เลขหน้าที่พิมพ์ท้ายหน้า, opts.label = ข้อความในป้าย (ค่าเริ่มต้น "ใบงานที่ N")
   */
  function sheetHTML(sheet, number, answers, imgFn, opts) {
    opts = opts || {};
    const imgHTML = imgFn || (() => '');
    if (opts.style === 'formal') return formalSheetHTML(sheet, number, answers, imgHTML, opts);
    let body = '';

    const itemMedia = (it, cls) => {
      if (opts.figureMode === 'none') return '';
      if (it && it.svgFigure) return `<div class="qi-svg" style="max-width:160px;margin-left:8px">${it.svgFigure}</div>`;
      return imgHTML(it.imagePrompt, cls);
    };

    if (sheet.type === 'fill_blank') {
      const bank = seeded(sheet.wordBank, sheet.topic + 'bank');
      body =
        `<div class="bank">${bank.map((w) => `<span>${esc(w)}</span>`).join('')}</div>` +
        sheet.items
          .map((it, i) => {
            const parts = String(it.text).split(/_{3,}/);
            return `<div class="q"><div class="n">${i + 1}.</div><div class="t">${esc(parts[0])}<span class="blank">${
              answers ? `<span class="ans">${esc(it.answer)}</span>` : ''
            }</span>${esc(parts.slice(1).join(''))}</div>${itemMedia(it, 'qi')}</div>`;
          })
          .join('');
    } else if (sheet.type === 'multiple_choice') {
      body = sheet.items
        .map(
          (it, i) =>
            `<div class="q"><div class="n">${i + 1}.</div><div class="t">${esc(it.question)}${it.svgFigure && opts.figureMode !== 'none' ? `<div style="margin:6px 0;text-align:center">${it.svgFigure}</div>` : ''}<div class="choices">${it.choices
              .map((c, j) => {
                const right = answers && j === it.answerIndex;
                return `<div${right ? ' class="ans"' : ''}>${LETTERS[j]}. ${esc(c)}${right ? ' ✓' : ''}</div>`;
              })
              .join('')}</div></div>${!it.svgFigure ? imgHTML(it.imagePrompt, 'qi') : ''}</div>`,
        )
        .join('');
    } else if (sheet.type === 'matching') {
      const order = answers ? sheet.items.map((_, i) => i) : shuffledIdx(sheet.items.length, sheet.topic + 'match');
      body =
        '<div class="match">' +
        sheet.items
          .map((it, i) => {
            const r = sheet.items[order[i]];
            return (
              '<div style="display:contents">' +
              `<div class="m-cell l">${imgHTML(it.imagePrompt, 'qi')}<span>${esc(it.left)}</span><span class="dot" style="margin-left:auto"></span></div>` +
              `<div class="m-cell r"><span class="dot"></span><span${answers ? ' class="ans"' : ''}>${esc(r.right)}</span></div>` +
              '</div>'
            );
          })
          .join('') +
        '</div>';
    } else if (sheet.type === 'true_false') {
      body = sheet.items
        .map(
          (it, i) =>
            `<div class="tf"><div class="box">${answers ? `<span class="ans">${it.answer ? '✓' : '✗'}</span>` : ''}</div>` +
            `<div class="t" style="flex:1">${i + 1}. ${esc(it.statement)}</div>${imgHTML(it.imagePrompt, 'qi')}</div>`,
        )
        .join('');
    } else if (sheet.type === 'ordering') {
      const order = shuffledIdx(sheet.items.length, sheet.topic + 'order');
      body =
        '<div class="ord">' +
        order
          .map((idx) => {
            const it = sheet.items[idx];
            return `<div class="card">${imgHTML(it.imagePrompt, '')}<div>${esc(it.label)}</div><div class="num">${
              answers ? `<span class="ans">${it.order}</span>` : ''
            }</div></div>`;
          })
          .join('') +
        '</div>';
    } else {
      body = newTypeBody(sheet, answers, ctx(sheet, imgHTML, opts, 'kid')); // รูปแบบใหม่ในสไตล์เด็ก
    }

    return `<div class="page kid" data-flow="1"${anchorAttr(opts)} data-cont="${esc((opts.label || 'ใบงานที่ ' + number) + ' (ต่อ)')}">
      <div class="frame"></div>
      <div class="sh-head">
        <div class="sh-name"><span>ชื่อ-สกุล</span><span class="ln"></span><span>ชั้น</span><span class="ln s"></span><span>เลขที่</span><span class="ln s"></span></div>
        <div class="sh-title">
          <div class="tt">
            <div class="pill">${esc(opts.label || 'ใบงานที่ ' + number)}${answers ? ' (เฉลย)' : ''}</div>
            <div class="pill sm">${esc(sheet.topic)}</div>
          </div>
          ${imgHTML(sheet.headerImagePrompt, 'sh-deco')}
          <div class="score"><span>คะแนน</span></div>
        </div>
      </div>
      <div class="sh-body"><div class="instr">คำชี้แจง: ${esc(sheet.instruction)}</div>${passageHTML(sheet)}${body}${indicatorFoot(sheet, opts)}</div>
      <div class="pageno">${esc(opts.pageNo != null ? opts.pageNo : number)}</div>
    </div>`;
  }

  root.WSRender = {
    esc, LETTERS, seeded, shuffledIdx, sheetHTML, lessonHTML, imagePrompts, typeset, paginate, finish, numberPages, defaultStyle,
    multiChoices, graphSVG, diagramSVG, NEW_TYPES,
  };
})(typeof window !== 'undefined' ? window : globalThis);

/* ---------- ย่อหน้า A4 ให้พอดีจอมือถือ/แท็บเล็ต (ย่อเฉพาะกระดาษ ปุ่มเครื่องมือยังขนาดปกติ; ไม่กระทบการพิมพ์และการแบ่งหน้า) ---------- */
(function () {
  const A4 = 210 * 96 / 25.4;
  const reset = (pg) => { pg.style.transform = pg.style.marginRight = pg.style.marginBottom = pg.style.transformOrigin = ''; };
  function fit(pg) {
    const wrap = pg.parentElement;
    const box = wrap && wrap.parentElement;
    if (!box) return;
    const s = Math.min(1, box.clientWidth / A4);
    wrap.classList.toggle('fitted', s < 0.999);
    if (s >= 0.999) return reset(pg);
    const h = pg.offsetHeight; // ขนาดก่อนย่อ (transform ไม่เปลี่ยน offsetHeight)
    pg.style.transformOrigin = 'top left';
    pg.style.transform = `scale(${s})`;
    pg.style.marginRight = `${-(A4 * (1 - s))}px`;
    pg.style.marginBottom = `${-(h * (1 - s))}px`;
  }
  const all = () => document.querySelectorAll('.pages > .page-wrap > .page');
  let t = 0;
  const scan = () => all().forEach(fit);
  const later = () => { clearTimeout(t); t = setTimeout(scan, 60); };
  window.addEventListener('resize', later);
  window.addEventListener('beforeprint', () => all().forEach(reset));
  window.addEventListener('afterprint', later);
  const start = () => { scan(); new MutationObserver(later).observe(document.body, { childList: true, subtree: true }); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
