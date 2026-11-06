/**
 * Educational SVG Diagram Generator for Primary & Secondary School Subjects
 * Publication-grade 3D isometric, anatomical, geometric, and infographic vector graphics
 * with Sarabun typography, multi-stop gradients, leader lines, and numbered callout badges.
 */

function svgWrap(content: string, width = 560, height = 310, caption = ''): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="max-width:100%;height:auto;display:inline-block;background:#ffffff;border:1px solid #cbd5e1;border-radius:12px;padding:4px;box-sizing:border-box;box-shadow:0 2px 10px rgba(15,23,42,0.04);">
  <style>
    text { font-family: 'Sarabun', 'Mali', sans-serif; }
    .label { font-size: 13px; font-weight: bold; fill: #0f172a; }
    .sublabel { font-size: 11px; fill: #475569; }
    .axis { stroke: #334155; stroke-width: 1.8; }
    .grid { stroke: #e2e8f0; stroke-width: 1; stroke-dasharray: 3,3; }
    .badge-bg { fill: #0f172a; }
    .badge-txt { font-size: 11px; font-weight: bold; fill: #ffffff; }
  </style>
  <defs>
    <filter id="stdShadow" x="-8%" y="-8%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#0f172a" flood-opacity="0.10" />
    </filter>
    <linearGradient id="hdrGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#f8fafc" />
      <stop offset="50%" stop-color="#f1f5f9" />
      <stop offset="100%" stop-color="#f8fafc" />
    </linearGradient>
    <linearGradient id="blue3D" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#60a5fa" />
      <stop offset="55%" stop-color="#3b82f6" />
      <stop offset="100%" stop-color="#1d4ed8" />
    </linearGradient>
    <linearGradient id="green3D" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4ade80" />
      <stop offset="55%" stop-color="#16a34a" />
      <stop offset="100%" stop-color="#15803d" />
    </linearGradient>
    <linearGradient id="amber3D" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fde047" />
      <stop offset="50%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#b45309" />
    </linearGradient>
    <linearGradient id="rose3D" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fb7185" />
      <stop offset="55%" stop-color="#e11d48" />
      <stop offset="100%" stop-color="#9f1239" />
    </linearGradient>
    <linearGradient id="purple3D" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#c084fc" />
      <stop offset="55%" stop-color="#8b5cf6" />
      <stop offset="100%" stop-color="#5b21b6" />
    </linearGradient>
  </defs>
  ${content}
  ${caption ? `<text x="${width / 2}" y="${height - 8}" text-anchor="middle" class="sublabel">${caption}</text>` : ''}
</svg>`;
}

// ----------------- Mathematics Diagrams -----------------

export function createFractionPieSvg(numerator: number = 3, denominator: number = 8): string {
  const cx = 155;
  const cy = 148;
  const r = 82;
  let paths = '';

  for (let i = 0; i < denominator; i++) {
    const startAngle = (i * 2 * Math.PI) / denominator - Math.PI / 2;
    const endAngle = ((i + 1) * 2 * Math.PI) / denominator - Math.PI / 2;
    const midAngle = (startAngle + endAngle) / 2;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const lx = cx + (r * 0.63) * Math.cos(midAngle);
    const ly = cy + (r * 0.63) * Math.sin(midAngle) + 4;
    const isShaded = i < numerator;
    const fill = isShaded ? 'url(#blue3D)' : '#f8fafc';
    const txtColor = isShaded ? '#ffffff' : '#64748b';

    paths += `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z" fill="${fill}" stroke="#1e3a8a" stroke-width="1.6" />`;
    paths += `<text x="${lx}" y="${ly}" text-anchor="middle" font-size="10" font-weight="bold" fill="${txtColor}">1/${denominator}</text>`;
  }

  const pct = ((numerator / denominator) * 100).toFixed(1).replace(/\.0$/, '');
  const dec = (numerator / denominator).toFixed(3).replace(/0+$/, '').replace(/\.$/, '');

  const content = `
    <rect width="100%" height="100%" fill="#ffffff" />
    <rect x="90" y="10" width="380" height="26" rx="13" fill="url(#hdrGrad)" stroke="#cbd5e1" />
    <text x="280" y="27" text-anchor="middle" font-size="12" font-weight="bold" fill="#0f172a">แผนภาพวงกลมแสดงความสัมพันธ์ของเศษส่วน ทศนิยม และร้อยละ</text>

    <!-- วงกลม 3D พร้อมเงา -->
    <g filter="url(#stdShadow)">
      <ellipse cx="${cx}" cy="${cy + 6}" rx="${r}" ry="${r}" fill="#cbd5e1" opacity="0.5" />
      ${paths}
      <circle cx="${cx}" cy="${cy}" r="14" fill="#ffffff" stroke="#1e3a8a" stroke-width="2" />
      <circle cx="${cx}" cy="${cy}" r="4" fill="#1e3a8a" />
    </g>

    <!-- แผงวิเคราะห์ทางขวา -->
    <g transform="translate(285, 58)">
      <rect x="0" y="0" width="245" height="175" rx="10" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.2" />
      <rect x="0" y="0" width="245" height="30" rx="10" fill="#eff6ff" />
      <text x="122" y="20" text-anchor="middle" font-size="12" font-weight="bold" fill="#1d4ed8">ข้อมูลวิเคราะห์สัดส่วน (Fraction Analysis)</text>

      <!-- 1. จำนวนส่วนที่แรเงา -->
      <rect x="14" y="42" width="22" height="22" rx="5" fill="#2563eb" />
      <text x="25" y="57" text-anchor="middle" class="badge-txt">1</text>
      <text x="45" y="53" font-size="11" font-weight="bold" fill="#0f172a">ส่วนที่แรเงา (ตัวเศษ): ${numerator} ส่วน</text>
      <text x="45" y="67" font-size="10" fill="#475569">จากจำนวนช่องที่แบ่งเท่ากันทั้งหมด ${denominator} ส่วน</text>

      <!-- 2. รูปเศษส่วนและทศนิยม -->
      <rect x="14" y="82" width="22" height="22" rx="5" fill="#0f172a" />
      <text x="25" y="97" text-anchor="middle" class="badge-txt">2</text>
      <text x="45" y="93" font-size="11" font-weight="bold" fill="#0f172a">เขียนในรูปเศษส่วน: ${numerator}/${denominator}</text>
      <text x="45" y="107" font-size="10" fill="#475569">ค่าทศนิยม = ${dec} (${pct}%)</text>

      <!-- 3. ส่วนที่ไม่แรเงา -->
      <rect x="14" y="122" width="22" height="22" rx="5" fill="#64748b" />
      <text x="25" y="137" text-anchor="middle" class="badge-txt">3</text>
      <text x="45" y="133" font-size="11" font-weight="bold" fill="#0f172a">ส่วนที่เหลือ (ไม่แรเงา): ${denominator - numerator}/${denominator}</text>
      <text x="45" y="147" font-size="10" fill="#475569">รวมทั้งวงกลม = ${numerator}/${denominator} + ${denominator - numerator}/${denominator} = 1 หน่วย</text>
    </g>

    <text x="280" y="258" text-anchor="middle" class="label">ส่วนที่แรเงาคิดเป็นเศษส่วนเท่าใดของรูปทั้งหมด?</text>
  `;
  return svgWrap(content, 560, 272);
}

export function createFractionBarSvg(shaded = 3, total = 5): string {
  const x = 60;
  const y = 65;
  const w = 440;
  const h = 48;
  const segW = w / total;
  let segments = '';
  let numberLineTicks = '';

  for (let i = 0; i < total; i++) {
    const isShaded = i < shaded;
    segments += `<rect x="${x + i * segW}" y="${y}" width="${segW}" height="${h}" fill="${isShaded ? 'url(#blue3D)' : '#f8fafc'}" stroke="#1e3a8a" stroke-width="1.8" />`;
    segments += `<text x="${x + i * segW + segW / 2}" y="${y + h / 2 + 5}" text-anchor="middle" fill="${isShaded ? '#ffffff' : '#64748b'}" font-size="13" font-weight="bold">1/${total}</text>`;
  }

  for (let i = 0; i <= total; i++) {
    const tx = x + i * segW;
    numberLineTicks += `<line x1="${tx}" y1="162" x2="${tx}" y2="176" stroke="#0f172a" stroke-width="2" />`;
    numberLineTicks += `<text x="${tx}" y="194" text-anchor="middle" font-size="11" font-weight="bold" fill="${i === shaded ? '#dc2626' : '#334155'}">${i}/${total}</text>`;
    if (i === shaded) {
      numberLineTicks += `<circle cx="${tx}" cy="169" r="5.5" fill="#dc2626" stroke="#ffffff" stroke-width="1.5" />`;
    }
  }

  const content = `
    <rect width="100%" height="100%" fill="#ffffff" />
    <rect x="110" y="10" width="340" height="25" rx="12" fill="url(#hdrGrad)" stroke="#cbd5e1" />
    <text x="280" y="27" text-anchor="middle" class="label">แถบเศษส่วนและเส้นจำนวนแสดงสัดส่วน (Fraction Bar &amp; Number Line)</text>

    <!-- แถบเศษส่วน 3D -->
    <g filter="url(#stdShadow)">
      ${segments}
    </g>

    <!-- ปีกกาแสดงส่วนที่แรเงา -->
    <line x1="${x}" y1="126" x2="${x + shaded * segW}" y2="126" stroke="#2563eb" stroke-width="2" />
    <line x1="${x}" y1="120" x2="${x}" y2="132" stroke="#2563eb" stroke-width="2" />
    <line x1="${x + shaded * segW}" y1="120" x2="${x + shaded * segW}" y2="132" stroke="#2563eb" stroke-width="2" />
    <rect x="${x + (shaded * segW) / 2 - 55}" y="116" width="110" height="20" rx="10" fill="#2563eb" />
    <text x="${x + (shaded * segW) / 2}" y="130" text-anchor="middle" font-size="11" font-weight="bold" fill="#ffffff">แรเงา ${shaded} ใน ${total} ส่วน (${shaded}/${total})</text>

    <!-- เส้นจำนวนเปรียบเทียบ -->
    <line x1="${x - 15}" y1="169" x2="${x + w + 15}" y2="169" stroke="#334155" stroke-width="2" />
    ${numberLineTicks}

    <text x="280" y="218" text-anchor="middle" class="sublabel">แถบยาวทั้งหมดแบ่งออกเป็น ${total} ส่วนเท่าๆ กัน (แต่ละช่องมีค่า 1/${total} หน่วย)</text>
  `;
  return svgWrap(content, 560, 232);
}

export function createRightTriangleSvg(a = '6 ซม.', b = '8 ซม.', c = 'c'): string {
  const content = `
    <rect width="100%" height="100%" fill="#ffffff" />
    <rect x="90" y="8" width="380" height="25" rx="12" fill="url(#hdrGrad)" stroke="#cbd5e1" />
    <text x="280" y="25" text-anchor="middle" class="label">ทฤษฎีบทพีทาโกรัสและอัตราส่วนตรีโกณมิติในรูปสามเหลี่ยมมุมฉาก</text>

    <!-- รูปสามเหลี่ยมมุมฉาก ABC -->
    <g filter="url(#stdShadow)">
      <polygon points="85,195 275,195 85,55" fill="#ecfdf5" stroke="#059669" stroke-width="2.5" stroke-linejoin="round" />
    </g>

    <!-- สัญลักษณ์มุมฉากที่จุด B (85,195) -->
    <rect x="85" y="177" width="18" height="18" fill="#a7f3d0" stroke="#059669" stroke-width="1.8" />
    <circle cx="94" cy="186" r="2" fill="#059669" />

    <!-- ส่วนโค้งมุม θ ที่จุด C (275,195) -->
    <path d="M 235 195 A 40 40 0 0 1 243 171 L 275 195 Z" fill="#fef08a" fill-opacity="0.7" stroke="#ca8a04" stroke-width="1.6" />
    <text x="225" y="188" font-size="12" font-weight="bold" fill="#854d0e">θ</text>

    <!-- จุดยอด A, B, C -->
    <circle cx="85" cy="55" r="4" fill="#0f172a" />
    <text x="72" y="52" font-size="13" font-weight="bold" fill="#0f172a">A</text>
    <circle cx="85" cy="195" r="4" fill="#0f172a" />
    <text x="68" y="205" font-size="13" font-weight="bold" fill="#0f172a">B (90°)</text>
    <circle cx="275" cy="195" r="4" fill="#0f172a" />
    <text x="284" y="202" font-size="13" font-weight="bold" fill="#0f172a">C</text>

    <!-- ป้ายกำกับด้านทั้งสาม -->
    <rect x="24" y="112" width="52" height="24" rx="5" fill="#0f172a" />
    <text x="50" y="128" text-anchor="middle" font-size="11" font-weight="bold" fill="#ffffff">${a}</text>

    <rect x="150" y="204" width="60" height="24" rx="5" fill="#0f172a" />
    <text x="180" y="220" text-anchor="middle" font-size="11" font-weight="bold" fill="#ffffff">${b}</text>

    <rect x="180" y="96" width="68" height="25" rx="6" fill="#dc2626" />
    <text x="214" y="113" text-anchor="middle" font-size="12" font-weight="bold" fill="#ffffff">${c} = ?</text>

    <!-- กรอบสรุปสูตรและหลักการทางขวา -->
    <g transform="translate(310, 48)">
      <rect x="0" y="0" width="230" height="175" rx="10" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.2" />
      <rect x="0" y="0" width="230" height="28" rx="10" fill="#f0fdf4" />
      <text x="115" y="19" text-anchor="middle" font-size="11" font-weight="bold" fill="#166534">ความสัมพันธ์ของรูปสามเหลี่ยมมุมฉาก</text>

      <text x="14" y="48" font-size="12" font-weight="bold" fill="#0f172a">1. ทฤษฎีบทพีทาโกรัส:</text>
      <rect x="14" y="55" width="202" height="28" rx="6" fill="#ffffff" stroke="#86efac" />
      <text x="115" y="74" text-anchor="middle" font-size="13" font-weight="bold" fill="#dc2626">c² = a² + b²</text>

      <text x="14" y="102" font-size="11" font-weight="bold" fill="#0f172a">2. ชื่อเรียกด้านเทียบกับมุม θ:</text>
      <text x="18" y="120" font-size="10.5" fill="#334155">• ด้านตรงข้ามมุมฉาก (Hypotenuse) = c</text>
      <text x="18" y="136" font-size="10.5" fill="#334155">• ด้านตรงข้ามมุม θ (ข้าม) = AB (${a})</text>
      <text x="18" y="152" font-size="10.5" fill="#334155">• ด้านประชิดมุม θ (ชิด) = BC (${b})</text>
      <text x="18" y="168" font-size="10" font-weight="bold" fill="#047857">sin θ = ข้าม/ฉาก · cos θ = ชิด/ฉาก · tan θ = ข้าม/ชิด</text>
    </g>

    <text x="280" y="246" text-anchor="middle" class="sublabel">รูปสามเหลี่ยมมุมฉาก มีมุมหนึ่งเป็นมุมฉาก (90°) ด้านตรงข้ามมุมฉากยาวที่สุดเสมอ</text>
  `;
  return svgWrap(content, 560, 260);
}

export function createParallelLinesSvg(): string {
  const content = `
    <rect width="100%" height="100%" fill="#ffffff" />
    <rect x="95" y="8" width="370" height="25" rx="12" fill="url(#hdrGrad)" stroke="#cbd5e1" />
    <text x="280" y="25" text-anchor="middle" class="label">สมบัติของเส้นขนานและเส้นตัดขวาง (Parallel Lines &amp; Transversal)</text>

    <!-- เส้นขนาน 2 เส้น L1 และ L2 -->
    <line x1="40" y1="85" x2="345" y2="85" stroke="#0f172a" stroke-width="2.6" />
    <line x1="40" y1="168" x2="345" y2="168" stroke="#0f172a" stroke-width="2.6" />
    <text x="355" y="90" class="label" fill="#1d4ed8">L₁</text>
    <text x="355" y="173" class="label" fill="#1d4ed8">L₂</text>

    <!-- สัญลักษณ์ลูกศรแสดงการขนาน -->
    <path d="M 105 79 L 117 85 L 105 91" fill="none" stroke="#2563eb" stroke-width="2.4" />
    <path d="M 113 79 L 125 85 L 113 91" fill="none" stroke="#2563eb" stroke-width="2.4" />
    <path d="M 105 162 L 117 168 L 105 174" fill="none" stroke="#2563eb" stroke-width="2.4" />
    <path d="M 113 162 L 125 168 L 113 174" fill="none" stroke="#2563eb" stroke-width="2.4" />

    <!-- เส้นตัดขวาง T -->
    <line x1="125" y1="215" x2="275" y2="42" stroke="#dc2626" stroke-width="2.5" />
    <text x="282" y="46" class="label" fill="#dc2626">T (เส้นตัดขวาง)</text>

    <!-- มุมแย้งภายใน (มุม 1 และ มุม 2) และมุมภายในข้างเดียวกัน (มุม 3) -->
    <!-- จุดตัดบน (238, 85), จุดตัดล่าง (166, 168) -->
    <path d="M 238 85 L 210 85 A 28 28 0 0 0 220 106 Z" fill="#fde047" stroke="#ca8a04" stroke-width="1.5" />
    <text x="208" y="103" class="label" fill="#854d0e">1</text>

    <path d="M 166 168 L 194 168 A 28 28 0 0 0 184 147 Z" fill="#fde047" stroke="#ca8a04" stroke-width="1.5" />
    <text x="190" y="162" class="label" fill="#854d0e">2</text>

    <path d="M 238 85 L 266 85 A 28 28 0 0 1 256 64 Z" fill="#bae6fd" stroke="#0284c7" stroke-width="1.5" />
    <text x="258" y="78" class="label" fill="#0369a1">3</text>

    <path d="M 238 85 L 266 85 A 28 28 0 0 0 220 106 Z" fill="none" />
    <text x="252" y="106" font-size="12" font-weight="bold" fill="#475569">4</text>

    <!-- แผงสรุปทฤษฎีบททางขวา -->
    <g transform="translate(382, 48)">
      <rect x="0" y="0" width="162" height="162" rx="8" fill="#f8fafc" stroke="#cbd5e1" />
      <text x="81" y="20" text-anchor="middle" font-size="11" font-weight="bold" fill="#0f172a">เมื่อ L₁ // L₂ จะได้ว่า:</text>
      <line x1="10" y1="27" x2="152" y2="27" stroke="#e2e8f0" />
      <text x="10" y="46" font-size="10.5" font-weight="bold" fill="#b45309">• มุมแย้งมีขนาดเท่ากัน</text>
      <text x="18" y="62" font-size="10.5" fill="#334155">∠1 = ∠2</text>
      <text x="10" y="84" font-size="10.5" font-weight="bold" fill="#0369a1">• มุมภายนอกและภายใน</text>
      <text x="18" y="99" font-size="10.5" fill="#334155">ข้างเดียวกัน: ∠2 = ∠3</text>
      <text x="10" y="121" font-size="10.5" font-weight="bold" fill="#15803d">• มุมภายในข้างเดียวกัน</text>
      <text x="18" y="137" font-size="10.5" fill="#334155">รวมกันได้ 180°:</text>
      <text x="18" y="152" font-size="10.5" font-weight="bold" fill="#dc2626">∠2 + ∠4 = 180°</text>
    </g>

    <text x="280" y="236" text-anchor="middle" class="sublabel">ถ้าเส้นตรง L₁ ขนานกับ L₂ แล้ว มุม 1 และ มุม 2 มีความสัมพันธ์กันอย่างไร?</text>
  `;
  return svgWrap(content, 560, 250);
}

export function createBarChartSvg(title = 'คะแนนเฉลี่ยจำแนกตามวิชา'): string {
  const content = `
    <rect width="100%" height="100%" fill="#ffffff" />
    <rect x="100" y="8" width="360" height="25" rx="12" fill="url(#hdrGrad)" stroke="#cbd5e1" />
    <text x="280" y="25" text-anchor="middle" class="label">${title}</text>

    <!-- แกน X และ Y -->
    <line x1="75" y1="45" x2="75" y2="195" class="axis" />
    <line x1="75" y1="195" x2="395" y2="195" class="axis" />
    <text x="68" y="42" text-anchor="end" font-size="10" font-weight="bold" fill="#334155">คะแนน</text>

    <!-- เส้นกริดระดับคะแนน -->
    <line x1="75" y1="157" x2="395" y2="157" class="grid" />
    <line x1="75" y1="120" x2="395" y2="120" class="grid" />
    <line x1="75" y1="82" x2="395" y2="82" class="grid" />
    <line x1="75" y1="45" x2="395" y2="45" class="grid" />
    <text x="65" y="199" text-anchor="end" class="sublabel">0</text>
    <text x="65" y="161" text-anchor="end" class="sublabel">10</text>
    <text x="65" y="124" text-anchor="end" class="sublabel">20</text>
    <text x="65" y="86" text-anchor="end" class="sublabel">30</text>
    <text x="65" y="49" text-anchor="end" class="sublabel">40</text>

    <!-- แท่งกราฟ 3D -->
    <g filter="url(#stdShadow)">
      <!-- คณิต = 25 -->
      <rect x="102" y="101" width="48" height="94" fill="url(#blue3D)" rx="4" />
      <rect x="110" y="78" width="32" height="19" rx="4" fill="#1e3a8a" />
      <text x="126" y="91" text-anchor="middle" font-size="11" font-weight="bold" fill="#ffffff">25</text>
      <text x="126" y="214" text-anchor="middle" class="label">คณิต</text>

      <!-- วิทย์ = 20 -->
      <rect x="180" y="120" width="48" height="75" fill="url(#green3D)" rx="4" />
      <rect x="188" y="97" width="32" height="19" rx="4" fill="#14532d" />
      <text x="204" y="110" text-anchor="middle" font-size="11" font-weight="bold" fill="#ffffff">20</text>
      <text x="204" y="214" text-anchor="middle" class="label">วิทย์</text>

      <!-- ภาษาไทย = 30 -->
      <rect x="258" y="82" width="48" height="113" fill="url(#amber3D)" rx="4" />
      <rect x="266" y="59" width="32" height="19" rx="4" fill="#78350f" />
      <text x="282" y="72" text-anchor="middle" font-size="11" font-weight="bold" fill="#ffffff">30</text>
      <text x="282" y="214" text-anchor="middle" class="label">ภาษาไทย</text>

      <!-- อังกฤษ = 25 -->
      <rect x="332" y="101" width="48" height="94" fill="url(#purple3D)" rx="4" />
      <rect x="340" y="78" width="32" height="19" rx="4" fill="#4c1d95" />
      <text x="356" y="91" text-anchor="middle" font-size="11" font-weight="bold" fill="#ffffff">25</text>
      <text x="356" y="214" text-anchor="middle" class="label">อังกฤษ</text>
    </g>

    <!-- เส้นค่าเฉลี่ยรวม (x̄ = 25) -->
    <line x1="75" y1="101" x2="395" y2="101" stroke="#dc2626" stroke-width="1.8" stroke-dasharray="5,3" />
    <text x="392" y="96" text-anchor="end" font-size="10" font-weight="bold" fill="#dc2626">ค่าเฉลี่ยเลขคณิต (x̄) = 25</text>

    <!-- กล่องสรุปข้อมูลสถิติ -->
    <g transform="translate(410, 52)">
      <rect x="0" y="0" width="135" height="142" rx="8" fill="#f8fafc" stroke="#cbd5e1" />
      <text x="67" y="20" text-anchor="middle" font-size="11" font-weight="bold" fill="#0f172a">สรุปค่าสถิติเบื้องต้น</text>
      <line x1="8" y1="26" x2="127" y2="26" stroke="#e2e8f0" />
      <text x="10" y="46" font-size="10.5" fill="#334155">• สูงสุด (Max): <tspan font-weight="bold">30</tspan></text>
      <text x="10" y="66" font-size="10.5" fill="#334155">• ต่ำสุด (Min): <tspan font-weight="bold">20</tspan></text>
      <text x="10" y="86" font-size="10.5" fill="#334155">• พิสัย (Range): <tspan font-weight="bold">10</tspan></text>
      <text x="10" y="106" font-size="10.5" fill="#334155">• ฐานนิยม: <tspan font-weight="bold">25</tspan></text>
      <text x="10" y="126" font-size="10.5" fill="#dc2626">• ค่าเฉลี่ย (x̄): <tspan font-weight="bold">25.0</tspan></text>
    </g>
  `;
  return svgWrap(content, 560, 235);
}

export function createClockSvg(hour = 8, minute = 30): string {
  const cx = 165;
  const cy = 135;
  const r = 82;

  const minAngle = (minute * 6 * Math.PI) / 180 - Math.PI / 2;
  const hrAngle = ((hour % 12) * 30 + minute * 0.5) * (Math.PI / 180) - Math.PI / 2;

  const mx = cx + (r - 16) * Math.cos(minAngle);
  const my = cy + (r - 16) * Math.sin(minAngle);
  const hx = cx + (r - 34) * Math.cos(hrAngle);
  const hy = cy + (r - 34) * Math.sin(hrAngle);

  let ticks = '';
  for (let i = 1; i <= 12; i++) {
    const a = (i * 30 * Math.PI) / 180 - Math.PI / 2;
    const tx = cx + (r - 14) * Math.cos(a);
    const ty = cy + (r - 14) * Math.sin(a) + 4;
    const x1 = cx + (r - 5) * Math.cos(a);
    const y1 = cy + (r - 5) * Math.sin(a);
    const x2 = cx + r * Math.cos(a);
    const y2 = cy + r * Math.sin(a);
    ticks += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#334155" stroke-width="2" />`;
    ticks += `<text x="${tx}" y="${ty}" text-anchor="middle" font-size="12" font-weight="bold" fill="#0f172a">${i}</text>`;
  }

  const pad = (n: number) => String(n).padStart(2, '0');

  const content = `
    <rect width="100%" height="100%" fill="#ffffff" />
    <rect x="115" y="8" width="330" height="25" rx="12" fill="url(#hdrGrad)" stroke="#cbd5e1" />
    <text x="280" y="25" text-anchor="middle" class="label">การอ่านเวลาจากหน้าปัดนาฬิกาและระบบ 24 ชั่วโมง</text>

    <!-- หน้าปัดนาฬิกา 3D -->
    <g filter="url(#stdShadow)">
      <circle cx="${cx}" cy="${cy}" r="${r + 6}" fill="#1e293b" />
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2" />
      ${ticks}
      <!-- เข็มสั้น (ชั่วโมง) -->
      <line x1="${cx}" y1="${cy}" x2="${hx}" y2="${hy}" stroke="#0f172a" stroke-width="4.5" stroke-linecap="round" />
      <!-- เข็มยาว (นาที) -->
      <line x1="${cx}" y1="${cy}" x2="${mx}" y2="${my}" stroke="#2563eb" stroke-width="3" stroke-linecap="round" />
      <!-- จุดหมุนกลาง -->
      <circle cx="${cx}" cy="${cy}" r="5" fill="#dc2626" stroke="#ffffff" stroke-width="1.5" />
    </g>

    <!-- แผงเปรียบเทียบเวลาทางขวา -->
    <g transform="translate(290, 52)">
      <rect x="0" y="0" width="245" height="165" rx="10" fill="#f8fafc" stroke="#cbd5e1" />
      <rect x="18" y="14" width="209" height="44" rx="8" fill="#0f172a" />
      <text x="122" y="43" text-anchor="middle" font-family="monospace" font-size="24" font-weight="bold" fill="#38bdf8">${pad(hour)}:${pad(minute)} น.</text>

      <text x="16" y="80" font-size="11" font-weight="bold" fill="#0f172a">• เข็มสั้น (สีดำ): บอกชั่วโมง</text>
      <text x="26" y="96" font-size="10.5" fill="#475569">ชี้กึ่งกลางระหว่างเลข ${hour} กับ ${hour + 1}</text>
      <text x="16" y="118" font-size="11" font-weight="bold" fill="#1d4ed8">• เข็มยาว (สีน้ำเงิน): บอกนาที</text>
      <text x="26" y="134" font-size="10.5" fill="#475569">ชี้ที่เลข ${minute / 5 || 12} (${minute} นาที · ช่องละ 5 นาที)</text>
      <text x="16" y="154" font-size="10.5" font-weight="bold" fill="#047857">เวลากลางวัน = ${pad(hour)}.${pad(minute)} น. | กลางคืน = ${pad((hour % 12) + 12)}.${pad(minute)} น.</text>
    </g>

    <text x="280" y="242" text-anchor="middle" class="sublabel">นาฬิกานี้บอกเวลาใด?</text>
  `;
  return svgWrap(content, 560, 255);
}

// ----------------- Science Diagrams -----------------

export function createPhotosynthesisSvg(): string {
  const content = `
    <rect width="100%" height="100%" fill="#ffffff" />
    <rect x="85" y="8" width="390" height="26" rx="13" fill="url(#hdrGrad)" stroke="#cbd5e1" />
    <text x="280" y="25" text-anchor="middle" class="label">กระบวนการสังเคราะห์ด้วยแสงของพืช (Photosynthesis Process)</text>

    <!-- ดวงอาทิตย์และพลังงานแสง (Light Energy) -->
    <g filter="url(#stdShadow)">
      <circle cx="68" cy="74" r="24" fill="url(#amber3D)" stroke="#d97706" stroke-width="2" />
      <text x="68" y="78" text-anchor="middle" font-size="10" font-weight="bold" fill="#78350f">ดวงอาทิตย์</text>
    </g>
    <path d="M 96 86 L 162 118" stroke="#f59e0b" stroke-width="2.5" stroke-dasharray="5,3" />
    <polygon points="165,120 155,120 160,112" fill="#f59e0b" />
    <rect x="102" y="64" width="82" height="20" rx="5" fill="#fef3c7" stroke="#f59e0b" />
    <text x="143" y="78" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#b45309">1. แสงแดด (Photons)</text>

    <!-- ใบไม้ 3D และคลอโรพลาสต์ขยาย -->
    <g filter="url(#stdShadow)">
      <path d="M 135 152 C 155 88, 265 76, 355 122 C 378 135, 390 148, 390 156 C 390 182, 310 222, 200 208 C 155 200, 135 170, 135 152 Z" fill="url(#green3D)" stroke="#14532d" stroke-width="2.5" />
      <!-- เส้นกลางใบและท่อลำเลียง (Vascular Bundle: Xylem & Phloem) -->
      <path d="M 115 162 Q 250 148 390 156" fill="none" stroke="#dcfce7" stroke-width="3.2" stroke-linecap="round" />
      <line x1="195" y1="154" x2="232" y2="115" stroke="#bbf7d0" stroke-width="1.8" />
      <line x1="260" y1="152" x2="302" y2="122" stroke="#bbf7d0" stroke-width="1.8" />
      <line x1="225" y1="154" x2="262" y2="188" stroke="#bbf7d0" stroke-width="1.8" />

      <!-- วงกลมซูมคลอโรพลาสต์และปากใบ -->
      <circle cx="268" cy="152" r="28" fill="#f0fdf4" stroke="#166534" stroke-width="2" />
      <ellipse cx="268" cy="145" rx="18" ry="9" fill="#22c55e" stroke="#14532d" stroke-width="1.2" />
      <text x="268" y="148" text-anchor="middle" font-size="8.5" font-weight="bold" fill="#ffffff">คลอโรฟิลล์</text>
      <text x="268" y="168" text-anchor="middle" font-size="8.5" font-weight="bold" fill="#14532d">คลอโรพลาสต์</text>
    </g>

    <!-- 2. ก๊าซคาร์บอนไดออกไซด์ (CO2) เข้าทางปากใบ -->
    <path d="M 225 56 L 238 96" stroke="#334155" stroke-width="2.2" />
    <polygon points="240,100 233,93 242,91" fill="#334155" />
    <rect x="192" y="38" width="168" height="22" rx="6" fill="#f1f5f9" stroke="#64748b" />
    <text x="276" y="53" text-anchor="middle" font-size="11" font-weight="bold" fill="#1e293b">2. CO₂ (ก๊าซคาร์บอนไดออกไซด์) เข้าปากใบ</text>

    <!-- 3. น้ำ (H2O) ลำเลียงจากรากผ่านท่อไซเล็ม -->
    <path d="M 78 205 L 138 172" stroke="#0284c7" stroke-width="2.5" />
    <polygon points="142,170 132,170 137,178" fill="#0284c7" />
    <rect x="18" y="202" width="135" height="24" rx="6" fill="#e0f2fe" stroke="#0284c7" />
    <text x="85" y="218" text-anchor="middle" font-size="11" font-weight="bold" fill="#0369a1">3. น้ำ (H₂O) จากท่อไซเล็ม</text>

    <!-- 4. ก๊าซออกซิเจน (O2) คายออกสู่บรรยากาศ -->
    <path d="M 345 112 L 405 74" stroke="#0284c7" stroke-width="2.4" />
    <polygon points="409,71 399,72 404,80" fill="#0284c7" />
    <rect x="385" y="48" width="155" height="24" rx="6" fill="#ecfeff" stroke="#0891b2" />
    <text x="462" y="64" text-anchor="middle" font-size="11" font-weight="bold" fill="#0e7490">4. O₂ (ก๊าซออกซิเจน) ผลผลิต</text>

    <!-- 5. น้ำตาลกลูโคส (C6H12O6) และแป้ง ลำเลียงผ่านโฟลเอ็ม -->
    <path d="M 365 182 L 415 205" stroke="#15803d" stroke-width="2.4" />
    <polygon points="419,207 409,207 413,199" fill="#15803d" />
    <rect x="372" y="198" width="172" height="26" rx="6" fill="#dcfce7" stroke="#16a34a" />
    <text x="458" y="215" text-anchor="middle" font-size="11" font-weight="bold" fill="#166534">5. น้ำตาลกลูโคส (C₆H₁₂O₆) / แป้ง</text>

    <!-- สมการเคมีมาตรฐานด้านล่าง -->
    <rect x="35" y="238" width="490" height="28" rx="8" fill="#0f172a" />
    <text x="280" y="256" text-anchor="middle" font-size="11.5" font-weight="bold" fill="#ffffff">
      สมการสุทธิ: 6CO₂ + 12H₂O —(แสง + คลอโรฟิลล์)→ C₆H₁₂O₆ + 6O₂ + 6H₂O
    </text>
  `;
  return svgWrap(content, 560, 276);
}

export function createElectricCircuitSvg(): string {
  const content = `
    <rect width="100%" height="100%" fill="#ffffff" />
    <rect x="85" y="8" width="390" height="25" rx="12" fill="url(#hdrGrad)" stroke="#cbd5e1" />
    <text x="280" y="25" text-anchor="middle" class="label">วงจรไฟฟ้าและกฎของโอห์ม (Simple &amp; Metered Electric Circuit: V = IR)</text>

    <!-- สายไฟหลักของวงจร -->
    <rect x="75" y="68" width="260" height="128" rx="6" fill="none" stroke="#1e293b" stroke-width="3" />

    <!-- ทิศทางกระแสไฟฟ้าสมมติ (I) จากขั้วบวกไปขั้วลบ -->
    <polygon points="265,68 255,63 255,73" fill="#dc2626" />
    <text x="260" y="56" text-anchor="middle" font-size="11" font-weight="bold" fill="#dc2626">กระแสไฟฟ้า (I)</text>
    <polygon points="145,196 155,191 155,201" fill="#dc2626" />

    <!-- 1. แหล่งกำเนิดไฟฟ้า / แบตเตอรี่ (E = 12 V) ด้านบน -->
    <rect x="165" y="50" width="66" height="34" rx="5" fill="#ffffff" stroke="#cbd5e1" />
    <line x1="182" y1="52" x2="182" y2="84" stroke="#dc2626" stroke-width="3.5" />
    <line x1="194" y1="60" x2="194" y2="76" stroke="#0f172a" stroke-width="2.5" />
    <line x1="206" y1="52" x2="206" y2="84" stroke="#dc2626" stroke-width="3.5" />
    <line x1="218" y1="60" x2="218" y2="76" stroke="#0f172a" stroke-width="2.5" />
    <text x="173" y="54" font-size="12" font-weight="bold" fill="#dc2626">+</text>
    <text x="226" y="54" font-size="12" font-weight="bold" fill="#0f172a">-</text>
    <text x="198" y="46" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#0f172a">แบตเตอรี่ (E = 12V)</text>

    <!-- 2. สวิตช์ (Switch S) ด้านซ้าย -->
    <rect x="58" y="110" width="34" height="44" fill="#ffffff" />
    <circle cx="75" cy="114" r="4.5" fill="#0f172a" />
    <circle cx="75" cy="150" r="4.5" fill="#0f172a" />
    <line x1="75" y1="114" x2="94" y2="144" stroke="#dc2626" stroke-width="3" stroke-linecap="round" />
    <text x="52" y="135" text-anchor="end" font-size="11" font-weight="bold" fill="#0f172a">สวิตช์ (เปิด/ปิด)</text>

    <!-- 3. แอมมิเตอร์ (Ammeter A - ต่ออนุกรม) ด้านขวา -->
    <circle cx="335" cy="132" r="20" fill="#eff6ff" stroke="#2563eb" stroke-width="2.5" />
    <text x="335" y="137" text-anchor="middle" font-size="15" font-weight="bold" fill="#1d4ed8">A</text>
    <text x="362" y="128" font-size="10.5" font-weight="bold" fill="#1d4ed8">แอมมิเตอร์</text>
    <text x="362" y="142" font-size="9.5" fill="#475569">(ต่ออนุกรมวัด I)</text>

    <!-- 4. หลอดไฟและตัวต้านทาน (Lamp / Load R) ด้านล่าง -->
    <circle cx="205" cy="196" r="20" fill="#fef08a" stroke="#ca8a04" stroke-width="2.5" filter="url(#stdShadow)" />
    <path d="M 195 196 Q 205 180 215 196" fill="none" stroke="#854d0e" stroke-width="2" />
    <line x1="205" y1="220" x2="205" y2="230" stroke="#eab308" stroke-width="2" />
    <line x1="183" y1="214" x2="175" y2="222" stroke="#eab308" stroke-width="2" />
    <line x1="227" y1="214" x2="235" y2="222" stroke="#eab308" stroke-width="2" />
    <text x="205" y="170" text-anchor="middle" font-size="11" font-weight="bold" fill="#854d0e">หลอดไฟ (R = 6 Ω)</text>

    <!-- 5. โวลต์มิเตอร์ (Voltmeter V - ต่อขนานคร่อมหลอดไฟ) -->
    <path d="M 155 196 L 155 242 L 255 242 L 255 196" fill="none" stroke="#059669" stroke-width="1.8" stroke-dasharray="4,2" />
    <circle cx="205" cy="242" r="15" fill="#ecfdf5" stroke="#059669" stroke-width="2" />
    <text x="205" y="247" text-anchor="middle" font-size="13" font-weight="bold" fill="#047857">V</text>

    <!-- กรอบสรุปความรู้ทางขวา -->
    <g transform="translate(425, 52)">
      <rect x="0" y="0" width="122" height="175" rx="8" fill="#f8fafc" stroke="#cbd5e1" />
      <text x="61" y="20" text-anchor="middle" font-size="11" font-weight="bold" fill="#0f172a">กฎของโอห์ม</text>
      <rect x="12" y="28" width="98" height="26" rx="5" fill="#0f172a" />
      <text x="61" y="45" text-anchor="middle" font-size="13" font-weight="bold" fill="#fde047">V = I × R</text>
      <text x="10" y="72" font-size="10" fill="#334155">• V: ความต่างศักย์ (V)</text>
      <text x="10" y="90" font-size="10" fill="#334155">• I: กระแสไฟฟ้า (A)</text>
      <text x="10" y="108" font-size="10" fill="#334155">• R: ความต้านทาน (Ω)</text>
      <line x1="10" y1="118" x2="112" y2="118" stroke="#e2e8f0" />
      <text x="10" y="135" font-size="9.5" font-weight="bold" fill="#15803d">• วงจรปิด: ไฟสว่าง</text>
      <text x="10" y="152" font-size="9.5" font-weight="bold" fill="#dc2626">• วงจรเปิด: ไฟดับ</text>
    </g>

    <text x="220" y="268" text-anchor="middle" class="sublabel">วงจรไฟฟ้าอย่างง่าย (ถ่านไฟฉาย สวิตช์ และหลอดไฟ)</text>
  `;
  return svgWrap(content, 560, 280);
}

export function createFoodChainSvg(): string {
  const content = `
    <rect width="100%" height="100%" fill="#ffffff" />
    <rect x="75" y="8" width="410" height="25" rx="12" fill="url(#hdrGrad)" stroke="#cbd5e1" />
    <text x="280" y="25" text-anchor="middle" class="label">การถ่ายทอดพลังงานในโซ่อาหารและพีระมิดพลังงาน (กฎ 10%)</text>

    <!-- โซ่อาหารด้านซ้าย-กลาง -->
    <g transform="translate(18, 52)" filter="url(#stdShadow)">
      <!-- 1. ผู้ผลิต (หญ้า) -->
      <rect x="0" y="0" width="84" height="68" rx="10" fill="#dcfce7" stroke="#16a34a" stroke-width="2" />
      <rect x="8" y="6" width="18" height="16" rx="4" fill="#16a34a" />
      <text x="17" y="18" text-anchor="middle" font-size="10" font-weight="bold" fill="#ffffff">T₁</text>
      <text x="45" y="28" text-anchor="middle" class="label" fill="#14532d">หญ้า</text>
      <text x="42" y="45" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#15803d">(ผู้ผลิต)</text>
      <text x="42" y="60" text-anchor="middle" font-size="9.5" fill="#166534">10,000 kcal</text>

      <!-- ลูกศร 1 (10%) -->
      <path d="M 88 34 L 114 34" stroke="#059669" stroke-width="2.5" />
      <polygon points="118,34 109,29 109,39" fill="#059669" />
      <text x="103" y="25" text-anchor="middle" font-size="9" font-weight="bold" fill="#047857">10%</text>

      <!-- 2. ผู้บริโภคลำดับที่ 1 (ตั๊กแตน) -->
      <rect x="122" y="0" width="88" height="68" rx="10" fill="#fef3c7" stroke="#d97706" stroke-width="2" />
      <rect x="130" y="6" width="18" height="16" rx="4" fill="#d97706" />
      <text x="139" y="18" text-anchor="middle" font-size="10" font-weight="bold" fill="#ffffff">T₂</text>
      <text x="168" y="28" text-anchor="middle" class="label" fill="#78350f">ตั๊กแตน</text>
      <text x="166" y="45" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#b45309">(ผู้บริโภคพืช)</text>
      <text x="166" y="60" text-anchor="middle" font-size="9.5" fill="#92400e">1,000 kcal</text>

      <!-- ลูกศร 2 (10%) -->
      <path d="M 214 34 L 240 34" stroke="#d97706" stroke-width="2.5" />
      <polygon points="244,34 235,29 235,39" fill="#d97706" />
      <text x="229" y="25" text-anchor="middle" font-size="9" font-weight="bold" fill="#b45309">10%</text>

      <!-- 3. ผู้บริโภคลำดับที่ 2 (กบ) -->
      <rect x="248" y="0" width="84" height="68" rx="10" fill="#e0e7ff" stroke="#4f46e5" stroke-width="2" />
      <rect x="256" y="6" width="18" height="16" rx="4" fill="#4f46e5" />
      <text x="265" y="18" text-anchor="middle" font-size="10" font-weight="bold" fill="#ffffff">T₃</text>
      <text x="292" y="28" text-anchor="middle" class="label" fill="#1e1b4b">กบ</text>
      <text x="290" y="45" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#4338ca">(ผู้บริโภคสัตว์)</text>
      <text x="290" y="60" text-anchor="middle" font-size="9.5" fill="#3730a3">100 kcal</text>

      <!-- ลูกศร 3 (10%) -->
      <path d="M 336 34 L 362 34" stroke="#4f46e5" stroke-width="2.5" />
      <polygon points="366,34 357,29 357,39" fill="#4f46e5" />
      <text x="351" y="25" text-anchor="middle" font-size="9" font-weight="bold" fill="#4338ca">10%</text>

      <!-- 4. ผู้บริโภคลำดับสูงสุด (เหยี่ยว) -->
      <rect x="370" y="0" width="88" height="68" rx="10" fill="#fee2e2" stroke="#dc2626" stroke-width="2" />
      <rect x="378" y="6" width="18" height="16" rx="4" fill="#dc2626" />
      <text x="387" y="18" text-anchor="middle" font-size="10" font-weight="bold" fill="#ffffff">T₄</text>
      <text x="416" y="28" text-anchor="middle" class="label" fill="#7f1d1d">เหยี่ยว</text>
      <text x="414" y="45" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#b91c1c">(ลำดับสูงสุด)</text>
      <text x="414" y="60" text-anchor="middle" font-size="9.5" fill="#991b1b">10 kcal</text>
    </g>

    <!-- ผู้ย่อยสลายสารอินทรีย์ (Decomposers) ด้านล่าง -->
    <path d="M 60 124 L 60 154 L 185 154" fill="none" stroke="#64748b" stroke-width="1.6" stroke-dasharray="4,2" />
    <path d="M 430 124 L 430 154 L 315 154" fill="none" stroke="#64748b" stroke-width="1.6" stroke-dasharray="4,2" />
    <rect x="175" y="138" width="150" height="32" rx="8" fill="#f1f5f9" stroke="#475569" stroke-width="1.5" />
    <text x="250" y="153" text-anchor="middle" font-size="11" font-weight="bold" fill="#1e293b">ผู้ย่อยสลาย (Decomposers)</text>
    <text x="250" y="165" text-anchor="middle" font-size="9.5" fill="#475569">เห็ด รา แบคทีเรีย (หมุนเวียนแร่ธาตุ)</text>

    <!-- พีระมิดพลังงานทางขวา -->
    <g transform="translate(485, 50)">
      <polygon points="32,8 58,68 6,68" fill="#fee2e2" stroke="#dc2626" stroke-width="1.2" />
      <polygon points="19,38 45,38 52,53 12,53" fill="#fef3c7" stroke="#d97706" stroke-width="1" />
      <polygon points="6,68 58,68 64,84 0,84" fill="#dcfce7" stroke="#16a34a" stroke-width="1.2" />
      <text x="32" y="100" text-anchor="middle" font-size="9.5" font-weight="bold" fill="#334155">พีระมิดพลังงาน</text>
      <text x="32" y="114" text-anchor="middle" font-size="9" fill="#64748b">กฎ 10% ของลินเดแมน</text>
    </g>

    <text x="280" y="192" text-anchor="middle" class="label">ลูกศรแสดงทิศทางการถ่ายทอดพลังงานในสายใยอาหาร (หัวลูกศรชี้ไปผู้กินเสมอ)</text>
  `;
  return svgWrap(content, 560, 208);
}

export function createStatesOfMatterSvg(): string {
  const content = `
    <rect width="100%" height="100%" fill="#ffffff" />
    <rect x="85" y="8" width="390" height="25" rx="12" fill="url(#hdrGrad)" stroke="#cbd5e1" />
    <text x="280" y="25" text-anchor="middle" class="label">การจัดเรียงอนุภาคและการเปลี่ยนสถานะของสสาร (States of Matter)</text>

    <!-- 1. ของแข็ง (Solid) -->
    <g filter="url(#stdShadow)">
      <rect x="35" y="55" width="120" height="105" fill="#f8fafc" stroke="#1e293b" stroke-width="2" rx="8" />
      <g fill="url(#blue3D)" stroke="#1e3a8a" stroke-width="1">
        <circle cx="62" cy="82" r="9" /><circle cx="84" cy="82" r="9" /><circle cx="106" cy="82" r="9" /><circle cx="128" cy="82" r="9" />
        <circle cx="62" cy="104" r="9" /><circle cx="84" cy="104" r="9" /><circle cx="106" cy="104" r="9" /><circle cx="128" cy="104" r="9" />
        <circle cx="62" cy="126" r="9" /><circle cx="84" cy="126" r="9" /><circle cx="106" cy="126" r="9" /><circle cx="128" cy="126" r="9" />
      </g>
    </g>
    <text x="95" y="180" text-anchor="middle" class="label" fill="#1d4ed8">ของแข็ง (Solid)</text>
    <text x="95" y="196" text-anchor="middle" class="sublabel">(เรียงชิดแน่น แรงยึดเหนี่ยวสูงมาก)</text>
    <text x="95" y="210" text-anchor="middle" font-size="10" fill="#475569">ปริมาตรคงที่ · รูปร่างคงที่</text>

    <!-- ลูกศรของแข็ง <-> ของเหลว -->
    <path d="M 162 92 L 212 92" stroke="#dc2626" stroke-width="2" />
    <polygon points="216,92 208,88 208,96" fill="#dc2626" />
    <text x="188" y="84" text-anchor="middle" font-size="9.5" font-weight="bold" fill="#dc2626">การหลอมเหลว</text>

    <path d="M 214 122 L 164 122" stroke="#0284c7" stroke-width="2" />
    <polygon points="160,122 168,118 168,126" fill="#0284c7" />
    <text x="188" y="136" text-anchor="middle" font-size="9.5" font-weight="bold" fill="#0284c7">การแข็งตัว</text>

    <!-- 2. ของเหลว (Liquid) -->
    <g filter="url(#stdShadow)">
      <rect x="222" y="55" width="120" height="105" fill="#f8fafc" stroke="#1e293b" stroke-width="2" rx="8" />
      <path d="M 224 95 Q 252 90, 282 95 T 340 95 L 340 158 L 224 158 Z" fill="#ecfdf5" />
      <g fill="url(#green3D)" stroke="#065f46" stroke-width="1">
        <circle cx="246" cy="112" r="9" /><circle cx="276" cy="108" r="9" /><circle cx="308" cy="114" r="9" />
        <circle cx="256" cy="138" r="9" /><circle cx="288" cy="134" r="9" /><circle cx="318" cy="140" r="9" />
        <circle cx="238" cy="142" r="9" />
      </g>
    </g>
    <text x="282" y="180" text-anchor="middle" class="label" fill="#15803d">ของเหลว (Liquid)</text>
    <text x="282" y="196" text-anchor="middle" class="sublabel">(อยู่ใกล้ เคลื่อนที่ได้ไหลเทได้)</text>
    <text x="282" y="210" text-anchor="middle" font-size="10" fill="#475569">ปริมาตรคงที่ · รูปร่างตามภาชนะ</text>

    <!-- ลูกศรของเหลว <-> แก๊ส -->
    <path d="M 349 92 L 399 92" stroke="#dc2626" stroke-width="2" />
    <polygon points="403,92 395,88 395,96" fill="#dc2626" />
    <text x="375" y="84" text-anchor="middle" font-size="9.5" font-weight="bold" fill="#dc2626">การกลายเป็นไอ</text>

    <path d="M 401 122 L 351 122" stroke="#0284c7" stroke-width="2" />
    <polygon points="347,122 355,118 355,126" fill="#0284c7" />
    <text x="375" y="136" text-anchor="middle" font-size="9.5" font-weight="bold" fill="#0284c7">การควบแน่น</text>

    <!-- 3. แก๊ส (Gas) -->
    <g filter="url(#stdShadow)">
      <rect x="408" y="55" width="120" height="105" fill="#f8fafc" stroke="#1e293b" stroke-width="2" rx="8" />
      <g fill="url(#amber3D)" stroke="#92400e" stroke-width="1">
        <circle cx="435" cy="78" r="9" />
        <circle cx="502" cy="88" r="9" />
        <circle cx="458" cy="134" r="9" />
        <circle cx="506" cy="140" r="9" />
      </g>
      <!-- เส้นความเร็วพลังงานจลน์ -->
      <line x1="422" y1="84" x2="414" y2="90" stroke="#d97706" stroke-width="1.5" />
      <line x1="514" y1="80" x2="522" y2="74" stroke="#d97706" stroke-width="1.5" />
      <line x1="446" y1="128" x2="436" y2="122" stroke="#d97706" stroke-width="1.5" />
    </g>
    <text x="468" y="180" text-anchor="middle" class="label" fill="#b45309">แก๊ส (Gas)</text>
    <text x="468" y="196" text-anchor="middle" class="sublabel">(ฟุ้งกระจายห่างกัน พลังงานจลน์สูง)</text>
    <text x="468" y="210" text-anchor="middle" font-size="10" fill="#475569">ปริมาตรและรูปร่างไม่คงที่</text>

    <!-- เส้นโค้งการระเหิดด้านบน -->
    <path d="M 95 52 Q 282 28, 468 52" fill="none" stroke="#dc2626" stroke-width="1.5" stroke-dasharray="4,2" />
    <text x="282" y="46" text-anchor="middle" font-size="10" font-weight="bold" fill="#dc2626">การระเหิด (Sublimation: ดูดความร้อน) →</text>
  `;
  return svgWrap(content, 560, 228);
}

export function createMagnetFieldSvg(): string {
  const content = `
    <rect width="100%" height="100%" fill="#ffffff" />
    <rect x="95" y="8" width="370" height="25" rx="12" fill="url(#hdrGrad)" stroke="#cbd5e1" />
    <text x="280" y="25" text-anchor="middle" class="label">สนามแม่เหล็กและทิศทางของเส้นแรงแม่เหล็ก (Magnetic Field Lines)</text>

    <!-- เส้นแรงแม่เหล็กด้านบนและด้านล่าง -->
    <path d="M 205 110 C 175 35, 385 35, 355 110" fill="none" stroke="#475569" stroke-width="2" stroke-dasharray="5,3" />
    <polygon points="286,54 274,49 274,59" fill="#dc2626" />
    <path d="M 235 110 C 220 65, 340 65, 325 110" fill="none" stroke="#64748b" stroke-width="1.6" stroke-dasharray="4,2" />
    <polygon points="285,76 275,72 275,80" fill="#dc2626" />

    <path d="M 205 154 C 175 228, 385 228, 355 154" fill="none" stroke="#475569" stroke-width="2" stroke-dasharray="5,3" />
    <polygon points="286,210 274,205 274,215" fill="#dc2626" />
    <path d="M 235 154 C 220 198, 340 198, 325 154" fill="none" stroke="#64748b" stroke-width="1.6" stroke-dasharray="4,2" />
    <polygon points="285,188 275,184 275,192" fill="#dc2626" />

    <!-- เส้นพุ่งออกที่ขั้ว N และพุ่งเข้าที่ขั้ว S -->
    <path d="M 160 132 L 95 132" stroke="#dc2626" stroke-width="2" />
    <polygon points="90,132 100,127 100,137" fill="#dc2626" />
    <path d="M 160 118 L 105 92" stroke="#dc2626" stroke-width="1.8" />
    <path d="M 160 146 L 105 172" stroke="#dc2626" stroke-width="1.8" />

    <path d="M 465 132 L 405 132" stroke="#2563eb" stroke-width="2" />
    <polygon points="400,132 410,127 410,137" fill="#2563eb" />
    <path d="M 455 92 L 400 118" stroke="#2563eb" stroke-width="1.8" />
    <path d="M 455 172 L 400 146" stroke="#2563eb" stroke-width="1.8" />

    <!-- แท่งแม่เหล็ก 3D N และ S -->
    <g filter="url(#stdShadow)">
      <rect x="160" y="110" width="120" height="44" rx="4" fill="url(#rose3D)" stroke="#881337" stroke-width="2" />
      <text x="220" y="139" text-anchor="middle" fill="#ffffff" font-weight="bold" font-size="20">N (ขั้วเหนือ)</text>
      <rect x="280" y="110" width="120" height="44" rx="4" fill="url(#blue3D)" stroke="#1e3a8a" stroke-width="2" />
      <text x="340" y="139" text-anchor="middle" fill="#ffffff" font-weight="bold" font-size="20">S (ขั้วใต้)</text>
    </g>

    <text x="280" y="236" text-anchor="middle" class="sublabel">เส้นแรงแม่เหล็กภายนอกแท่งแม่เหล็กพุ่งออกจากขั้วเหนือ (N) เข้าสู่ขั้วใต้ (S) เสมอ</text>
  `;
  return svgWrap(content, 560, 250);
}

// ----------------- Thai & English & Social Diagrams -----------------

export function createThaiTriyangSvg(): string {
  const content = `
    <rect width="100%" height="100%" fill="#ffffff" />
    <rect x="95" y="8" width="370" height="25" rx="12" fill="url(#hdrGrad)" stroke="#cbd5e1" />
    <text x="280" y="25" text-anchor="middle" class="label">ไตรยางศ์ (อักษร 3 หมู่) และการผันวรรณยุกต์ไทย</text>

    <!-- 1. อักษรสูง -->
    <g filter="url(#stdShadow)">
      <rect x="22" y="45" width="164" height="148" rx="10" fill="#ecfdf5" stroke="#059669" stroke-width="2" />
      <rect x="22" y="45" width="164" height="30" rx="10" fill="#059669" />
      <text x="104" y="65" text-anchor="middle" font-size="13" font-weight="bold" fill="#ffffff">1. อักษรสูง (11 ตัว)</text>
      <text x="104" y="94" text-anchor="middle" font-size="13" font-weight="bold" fill="#065f46">ข ฃ ฉ ฐ ถ ผ ฝ ศ ษ ส ห</text>
      <rect x="32" y="106" width="144" height="24" rx="5" fill="#ffffff" stroke="#6ee7b7" />
      <text x="104" y="122" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#047857">"ผี ฝาก ถุง ข้าว สาร ให้ ฉัน"</text>
      <text x="104" y="148" text-anchor="middle" font-size="10" fill="#334155">คำเป็นผันได้ 3 เสียง:</text>
      <text x="104" y="164" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#065f46">เอก · โท · จัตวา (พื้นเสียงจัตวา)</text>
    </g>

    <!-- 2. อักษรกลาง -->
    <g filter="url(#stdShadow)">
      <rect x="198" y="45" width="164" height="148" rx="10" fill="#eff6ff" stroke="#2563eb" stroke-width="2" />
      <rect x="198" y="45" width="164" height="30" rx="10" fill="#2563eb" />
      <text x="280" y="65" text-anchor="middle" font-size="13" font-weight="bold" fill="#ffffff">2. อักษรกลาง (9 ตัว)</text>
      <text x="280" y="94" text-anchor="middle" font-size="13" font-weight="bold" fill="#1e3a8a">ก จ ด ต บ ป อ ฎ ฏ</text>
      <rect x="208" y="106" width="144" height="24" rx="5" fill="#ffffff" stroke="#93c5fd" />
      <text x="280" y="122" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#1d4ed8">"ไก่ จิก เด็ก ตาย บน ปาก โอ่ง"</text>
      <text x="280" y="148" text-anchor="middle" font-size="10" fill="#334155">คำเป็นผันได้ครบ 5 เสียง:</text>
      <text x="280" y="164" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#1e40af">สามัญ · เอก · โท · ตรี · จัตวา</text>
    </g>

    <!-- 3. อักษรต่ำ -->
    <g filter="url(#stdShadow)">
      <rect x="374" y="45" width="164" height="148" rx="10" fill="#fff7ed" stroke="#ea580c" stroke-width="2" />
      <rect x="374" y="45" width="164" height="30" rx="10" fill="#ea580c" />
      <text x="456" y="65" text-anchor="middle" font-size="13" font-weight="bold" fill="#ffffff">3. อักษรต่ำ (24 ตัว)</text>
      <text x="456" y="92" text-anchor="middle" font-size="11.5" font-weight="bold" fill="#9a3412">ต่ำเดี่ยว (10): ง ญ ณ น ม ย ร ล ว ฬ</text>
      <text x="456" y="110" text-anchor="middle" font-size="11" font-weight="bold" fill="#c2410c">ต่ำคู่ (14): ค ฅ ฆ ช ซ ฌ ฑ ฒ ท ธ พ ฟ ภ ฮ</text>
      <rect x="384" y="118" width="144" height="22" rx="5" fill="#ffffff" stroke="#fdba74" />
      <text x="456" y="133" text-anchor="middle" font-size="10" font-weight="bold" fill="#9a3412">"งู ใหญ่ นอน อยู่ ณ ริม วัด โม ฬี โลก"</text>
      <text x="456" y="156" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#9a3412">ผันได้ 3 เสียง: สามัญ · โท · ตรี</text>
      <text x="456" y="172" text-anchor="middle" font-size="9.5" fill="#7c2d12">(รูปเอก→เสียงโท, รูปโท→เสียงตรี)</text>
    </g>
  `;
  return svgWrap(content, 560, 210);
}

export function createPrepositionSvg(): string {
  const content = `
    <rect width="100%" height="100%" fill="#ffffff" />
    <rect x="105" y="8" width="350" height="25" rx="12" fill="url(#hdrGrad)" stroke="#cbd5e1" />
    <text x="280" y="25" text-anchor="middle" class="label">Prepositions of Place &amp; Position (คำบุพบทบอกสถานที่)</text>

    <!-- โต๊ะ 3D กลางห้อง -->
    <g filter="url(#stdShadow)">
      <polygon points="150,115 350,115 380,135 120,135" fill="#d97706" stroke="#78350f" stroke-width="1.8" />
      <rect x="120" y="135" width="260" height="10" fill="#b45309" stroke="#78350f" stroke-width="1.5" />
      <rect x="140" y="145" width="12" height="65" fill="#92400e" />
      <rect x="348" y="145" width="12" height="65" fill="#92400e" />
    </g>

    <!-- 1. ON (ลูกบอลสีแดงวางอยู่บนโต๊ะ) -->
    <circle cx="215" cy="100" r="20" fill="url(#rose3D)" stroke="#881337" stroke-width="2" filter="url(#stdShadow)" />
    <text x="215" y="104" text-anchor="middle" fill="#ffffff" font-weight="bold" font-size="12">ON</text>

    <!-- 2. ABOVE (โคมไฟลอยเหนือโต๊ะโดยไม่สัมผัส) -->
    <path d="M 295 40 L 295 62 M 278 62 L 312 62 L 304 50 L 286 50 Z" fill="#fef08a" stroke="#ca8a04" stroke-width="2" />
    <rect x="268" y="66" width="54" height="18" rx="4" fill="#0f172a" />
    <text x="295" y="79" text-anchor="middle" fill="#fde047" font-weight="bold" font-size="10">ABOVE</text>

    <!-- 3. UNDER (ลูกบอลสีน้ำเงินอยู่ใต้โต๊ะ) -->
    <circle cx="250" cy="182" r="18" fill="url(#blue3D)" stroke="#1e3a8a" stroke-width="2" filter="url(#stdShadow)" />
    <text x="250" y="186" text-anchor="middle" fill="#ffffff" font-weight="bold" font-size="10">UNDER</text>

    <!-- 4. IN (กล่องใส่หนังสือด้านขวา) -->
    <rect x="415" y="145" width="76" height="58" rx="4" fill="#fef3c7" stroke="#b45309" stroke-width="2" />
    <circle cx="453" cy="162" r="14" fill="url(#green3D)" stroke="#065f46" stroke-width="1.5" />
    <text x="453" y="166" text-anchor="middle" fill="#ffffff" font-weight="bold" font-size="11">IN</text>
    <text x="453" y="194" text-anchor="middle" font-size="10" font-weight="bold" fill="#78350f">in the box</text>

    <!-- 5. NEXT TO (ตั้งอยู่ข้างโต๊ะด้านซ้าย) -->
    <rect x="45" y="148" width="62" height="55" rx="6" fill="#f3e8ff" stroke="#7e22ce" stroke-width="2" />
    <text x="76" y="175" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#6b21a8">NEXT TO</text>
    <text x="76" y="190" text-anchor="middle" font-size="9" fill="#581c87">(ข้างๆ โต๊ะ)</text>

    <text x="280" y="232" text-anchor="middle" class="sublabel">The red ball is ON the table, and the blue ball is UNDER the table.</text>
  `;
  return svgWrap(content, 560, 246);
}

export function createCompassDirectionsSvg(): string {
  const cx = 165;
  const cy = 135;
  const r = 74;
  const content = `
    <rect width="100%" height="100%" fill="#ffffff" />
    <rect x="95" y="8" width="370" height="25" rx="12" fill="url(#hdrGrad)" stroke="#cbd5e1" />
    <text x="280" y="25" text-anchor="middle" class="label">เครื่องมือทางภูมิศาสตร์: ทิศทั้ง 8 และองค์ประกอบของแผนที่</text>

    <!-- วงแหวนเข็มทิศ 8 ทิศ -->
    <g filter="url(#stdShadow)">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="#f8fafc" stroke="#475569" stroke-width="2" />
      <circle cx="${cx}" cy="${cy}" r="${r - 12}" fill="none" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="3,2" />

      <!-- แกนทิศรอง NE, SE, SW, NW -->
      <line x1="${cx - 42}" y1="${cy - 42}" x2="${cx + 42}" y2="${cy + 42}" stroke="#94a3b8" stroke-width="1.5" />
      <line x1="${cx + 42}" y1="${cy - 42}" x2="${cx - 42}" y2="${cy + 42}" stroke="#94a3b8" stroke-width="1.5" />
      <text x="${cx + 54}" y="${cy - 48}" font-size="10" font-weight="bold" fill="#475569">NE (ตะวันออกเฉียงเหนือ)</text>
      <text x="${cx + 54}" y="${cy + 58}" font-size="10" font-weight="bold" fill="#475569">SE (ตะวันออกเฉียงใต้)</text>
      <text x="${cx - 60}" y="${cy - 48}" text-anchor="end" font-size="10" font-weight="bold" fill="#475569">NW</text>
      <text x="${cx - 60}" y="${cy + 58}" text-anchor="end" font-size="10" font-weight="bold" fill="#475569">SW</text>

      <!-- ดาวเข็มทิศหลัก N, S, E, W -->
      <polygon points="${cx},${cy - r + 8} ${cx - 11},${cy} ${cx + 11},${cy}" fill="#dc2626" />
      <polygon points="${cx},${cy + r - 8} ${cx - 11},${cy} ${cx + 11},${cy}" fill="#334155" />
      <polygon points="${cx - r + 8},${cy} ${cx},${cy - 11} ${cx},${cy + 11}" fill="#64748b" />
      <polygon points="${cx + r - 8},${cy} ${cx},${cy - 11} ${cx},${cy + 11}" fill="#64748b" />
      <circle cx="${cx}" cy="${cy}" r="5" fill="#ffffff" stroke="#0f172a" stroke-width="2" />
    </g>

    <text x="${cx}" y="${cy - r - 8}" text-anchor="middle" class="label" fill="#dc2626">N (เหนือ - 0°)</text>
    <text x="${cx}" y="${cy + r + 18}" text-anchor="middle" class="label">S (ใต้ - 180°)</text>
    <text x="${cx + r + 28}" y="${cy + 5}" text-anchor="middle" class="label">E (ออก - 90°)</text>
    <text x="${cx - r - 28}" y="${cy + 5}" text-anchor="middle" class="label">W (ตก - 270°)</text>

    <!-- กรอบมาตราส่วนแผนที่และสัญลักษณ์ทางขวา -->
    <g transform="translate(335, 52)">
      <rect x="0" y="0" width="205" height="165" rx="10" fill="#f8fafc" stroke="#cbd5e1" />
      <text x="102" y="20" text-anchor="middle" font-size="11.5" font-weight="bold" fill="#0f172a">องค์ประกอบสำคัญของแผนที่</text>
      <line x1="12" y1="28" x2="193" y2="28" stroke="#e2e8f0" />
      <text x="14" y="48" font-size="10.5" font-weight="bold" fill="#1d4ed8">1. มาตราส่วน (Map Scale):</text>
      <text x="20" y="64" font-size="10" fill="#334155">เช่น 1 : 50,000 (1 ซม. ในแผนที่</text>
      <text x="20" y="78" font-size="10" fill="#334155">แทนระยะจริง 50,000 ซม. หรือ 0.5 กม.)</text>

      <!-- แถบมาตราส่วนเส้น -->
      <rect x="20" y="88" width="40" height="7" fill="#0f172a" />
      <rect x="60" y="88" width="40" height="7" fill="#ffffff" stroke="#0f172a" />
      <rect x="100" y="88" width="40" height="7" fill="#0f172a" />
      <text x="20" y="106" font-size="8.5" fill="#334155">0</text>
      <text x="60" y="106" font-size="8.5" fill="#334155">1</text>
      <text x="100" y="106" font-size="8.5" fill="#334155">2</text>
      <text x="140" y="106" font-size="8.5" fill="#334155">3 กม.</text>

      <text x="14" y="126" font-size="10.5" font-weight="bold" fill="#047857">2. พิกัดภูมิศาสตร์:</text>
      <text x="20" y="142" font-size="10" fill="#334155">• ละติจูด (เส้นขนานแนวนอน: บอกเขตอากาศ)</text>
      <text x="20" y="156" font-size="10" fill="#334155">• ลองจิจูด (เส้นเมอริเดียนแนวตั้ง: บอกเวลา)</text>
    </g>
  `;
  return svgWrap(content, 560, 240);
}

export function createSufficiencyEconomySvg(): string {
  const content = `
    <rect width="100%" height="100%" fill="#ffffff" />
    <rect x="85" y="8" width="390" height="25" rx="12" fill="url(#hdrGrad)" stroke="#cbd5e1" />
    <text x="280" y="25" text-anchor="middle" class="label">ปรัชญาเศรษฐกิจพอเพียง (3 ห่วง 2 เงื่อนไข สู่ความสมดุล 4 มิติ)</text>

    <!-- 3 ห่วงซ้อนด้านซ้าย -->
    <g filter="url(#stdShadow)">
      <circle cx="135" cy="92" r="42" fill="#dbeafe" stroke="#2563eb" stroke-width="2.2" opacity="0.88" />
      <text x="135" y="88" text-anchor="middle" font-size="12" font-weight="bold" fill="#1e40af">1. พอประมาณ</text>
      <text x="135" y="103" text-anchor="middle" font-size="9.5" fill="#1d4ed8">(ไม่เบียดเบียนตน/ผู้อื่น)</text>

      <circle cx="225" cy="92" r="42" fill="#dcfce7" stroke="#16a34a" stroke-width="2.2" opacity="0.88" />
      <text x="225" y="88" text-anchor="middle" font-size="12" font-weight="bold" fill="#15803d">2. มีเหตุผล</text>
      <text x="225" y="103" text-anchor="middle" font-size="9.5" fill="#166534">(คิดไตร่ตรองตามเหตุปัจจัย)</text>

      <circle cx="180" cy="142" r="42" fill="#fef3c7" stroke="#d97706" stroke-width="2.2" opacity="0.9" />
      <text x="180" y="140" text-anchor="middle" font-size="12" font-weight="bold" fill="#b45309">3. มีภูมิคุ้มกัน</text>
      <text x="180" y="155" text-anchor="middle" font-size="9.5" fill="#92400e">(พร้อมรับการเปลี่ยนแปลง)</text>
    </g>

    <!-- ฐาน 2 เงื่อนไข -->
    <rect x="48" y="196" width="128" height="34" rx="6" fill="#eff6ff" stroke="#1d4ed8" stroke-width="1.8" />
    <text x="112" y="212" text-anchor="middle" class="label" fill="#1e3a8a">เงื่อนไขความรู้</text>
    <text x="112" y="224" text-anchor="middle" font-size="9.5" fill="#475569">(รอบรู้ รอบคอบ ระมัดระวัง)</text>

    <rect x="184" y="196" width="128" height="34" rx="6" fill="#f0fdf4" stroke="#15803d" stroke-width="1.8" />
    <text x="248" y="212" text-anchor="middle" class="label" fill="#14532d">เงื่อนไขคุณธรรม</text>
    <text x="248" y="224" text-anchor="middle" font-size="9.5" fill="#475569">(ซื่อสัตย์ สุจริต ขยัน อดทน)</text>

    <!-- ลูกศรเชื่อมไปผลลัพธ์ 4 มิติ -->
    <path d="M 320 135 L 352 135" stroke="#0f172a" stroke-width="2.5" />
    <polygon points="356,135 347,130 347,140" fill="#0f172a" />

    <!-- กรอบสมดุล 4 มิติและเกษตรทฤษฎีใหม่ (30:30:30:10) -->
    <g transform="translate(362, 48)">
      <rect x="0" y="0" width="180" height="182" rx="10" fill="#f8fafc" stroke="#cbd5e1" />
      <rect x="0" y="0" width="180" height="28" rx="10" fill="#0f172a" />
      <text x="90" y="18" text-anchor="middle" font-size="11" font-weight="bold" fill="#ffffff">ผลลัพธ์และการประยุกต์ใช้</text>
      <text x="12" y="46" font-size="10.5" font-weight="bold" fill="#0f172a">ทางสายกลาง 4 มิติยั่งยืน:</text>
      <text x="16" y="63" font-size="10" fill="#334155">1. มิติเศรษฐกิจ (ลดรายจ่าย เพิ่มรายได้)</text>
      <text x="16" y="79" font-size="10" fill="#334155">2. มิติสังคม (ช่วยเหลือเกื้อกูลชุมชน)</text>
      <text x="16" y="95" font-size="10" fill="#334155">3. มิติสิ่งแวดล้อม (อนุรักษ์ทรัพยากร)</text>
      <text x="16" y="111" font-size="10" fill="#334155">4. มิติวัฒนธรรม (ภูมิปัญญาท้องถิ่น)</text>
      <line x1="12" y1="120" x2="168" y2="120" stroke="#cbd5e1" />
      <text x="12" y="138" font-size="10.5" font-weight="bold" fill="#047857">เกษตรทฤษฎีใหม่ (30:30:30:10):</text>
      <text x="16" y="154" font-size="9.5" fill="#334155">น้ำ 30% · นาข้าว 30% · พืชผสม 30%</text>
      <text x="16" y="168" font-size="9.5" fill="#334155">ที่อยู่อาศัยและเลี้ยงสัตว์ 10%</text>
    </g>
  `;
  return svgWrap(content, 560, 245);
}

export function createSentenceStructureSvg(): string {
  const content = `
    <rect width="100%" height="100%" fill="#ffffff" />
    <rect x="95" y="8" width="370" height="25" rx="12" fill="url(#hdrGrad)" stroke="#cbd5e1" />
    <text x="280" y="25" text-anchor="middle" class="label">โครงสร้างประโยคและการจำแนกชนิดของประโยคในภาษาไทย</text>
    
    <!-- ภาคประธาน -->
    <g filter="url(#stdShadow)">
      <rect x="20" y="44" width="248" height="118" rx="8" fill="#eff6ff" stroke="#3b82f6" stroke-width="1.8" />
      <text x="144" y="66" text-anchor="middle" font-size="13" font-weight="bold" fill="#1d4ed8">1. ภาคประธาน (ผู้กระทำ/หัวข้อ)</text>
      <line x1="32" y1="74" x2="256" y2="74" stroke="#bfdbfe" stroke-width="1.2" />
      
      <rect x="32" y="84" width="106" height="66" rx="6" fill="#ffffff" stroke="#93c5fd" />
      <text x="85" y="105" text-anchor="middle" font-size="11.5" font-weight="bold" fill="#1e40af">บทประธาน</text>
      <text x="85" y="122" text-anchor="middle" font-size="10" fill="#475569">คำนาม / คำสรรพนาม</text>
      <text x="85" y="138" text-anchor="middle" font-size="9.5" font-weight="bold" fill="#2563eb">เช่น "นักเรียน"</text>

      <rect x="150" y="84" width="106" height="66" rx="6" fill="#ffffff" stroke="#93c5fd" />
      <text x="203" y="105" text-anchor="middle" font-size="11.5" font-weight="bold" fill="#1e40af">บทขยายประธาน</text>
      <text x="203" y="122" text-anchor="middle" font-size="10" fill="#475569">คำวิเศษณ์ / วลี</text>
      <text x="203" y="138" text-anchor="middle" font-size="9.5" font-weight="bold" fill="#2563eb">เช่น "ชั้น ม.1"</text>
    </g>

    <!-- ภาคแสดง -->
    <g filter="url(#stdShadow)">
      <rect x="284" y="44" width="256" height="118" rx="8" fill="#f0fdf4" stroke="#22c55e" stroke-width="1.8" />
      <text x="412" y="66" text-anchor="middle" font-size="13" font-weight="bold" fill="#15803d">2. ภาคแสดง (กริยาอาการ/ผลลัพธ์)</text>
      <line x1="296" y1="74" x2="528" y2="74" stroke="#bbf7d0" stroke-width="1.2" />

      <rect x="294" y="84" width="76" height="66" rx="6" fill="#ffffff" stroke="#86efac" />
      <text x="332" y="105" text-anchor="middle" font-size="11" font-weight="bold" fill="#166534">บทกริยา</text>
      <text x="332" y="122" text-anchor="middle" font-size="9.5" fill="#475569">(อกรรม/สกรรม)</text>
      <text x="332" y="138" text-anchor="middle" font-size="9.5" font-weight="bold" fill="#15803d">"อ่าน"</text>

      <rect x="376" y="84" width="74" height="66" rx="6" fill="#ffffff" stroke="#86efac" />
      <text x="413" y="105" text-anchor="middle" font-size="11" font-weight="bold" fill="#166534">บทกรรม</text>
      <text x="413" y="122" text-anchor="middle" font-size="9.5" fill="#475569">(ผู้ถูกกระทำ)</text>
      <text x="413" y="138" text-anchor="middle" font-size="9.5" font-weight="bold" fill="#15803d">"หนังสือ"</text>

      <rect x="456" y="84" width="74" height="66" rx="6" fill="#ffffff" stroke="#86efac" />
      <text x="493" y="105" text-anchor="middle" font-size="11" font-weight="bold" fill="#166534">ขยายกริยา</text>
      <text x="493" y="122" text-anchor="middle" font-size="9.5" fill="#475569">(บอกเวลา/อาการ)</text>
      <text x="493" y="138" text-anchor="middle" font-size="9.5" font-weight="bold" fill="#15803d">"อย่างตั้งใจ"</text>
    </g>

    <!-- สรุปประโยค 3 ชนิดด้านล่าง -->
    <rect x="20" y="172" width="520" height="32" rx="6" fill="#f8fafc" stroke="#cbd5e1" />
    <text x="280" y="192" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#334155">
      ชนิดประโยค: ① ประโยคสามัญ (ใจความเดียว) · ② ประโยครวม (สันธานเชื่อม และ/แต่/หรือ/จึง) · ③ ประโยคซ้อน (ที่/ซึ่ง/อัน/ว่า/เพราะ)
    </text>
  `;
  return svgWrap(content, 560, 218);
}

export function createSpellingSectionSvg(): string {
  const content = `
    <rect width="100%" height="100%" fill="#ffffff" />
    <rect x="85" y="8" width="390" height="25" rx="12" fill="url(#hdrGrad)" stroke="#cbd5e1" />
    <text x="280" y="25" text-anchor="middle" class="label">มาตราตัวสะกดในภาษาไทย (๘ มาตรา + แม่ ก กา) และคำเป็น-คำตาย</text>
    
    <!-- ตรงตามมาตรา (คำเป็น น-ม-ย-ว-ง) -->
    <g filter="url(#stdShadow)">
      <rect x="20" y="45" width="250" height="132" rx="8" fill="#fdf4ff" stroke="#a855f7" stroke-width="1.8" />
      <rect x="20" y="45" width="250" height="28" rx="8" fill="#9333ea" />
      <text x="145" y="64" text-anchor="middle" font-size="12" font-weight="bold" fill="#ffffff">สะกดตรงตามมาตรา (มีตัวสะกดตัวเดียว)</text>
      <text x="34" y="92" font-size="11.5" font-weight="bold" fill="#581c87">• แม่กง (ง) เช่น ลิง ทอง ร้องเพลง</text>
      <text x="34" y="112" font-size="11.5" font-weight="bold" fill="#581c87">• แม่กม (ม) เช่น ลม ชมพู ยิ้มแย้ม</text>
      <text x="34" y="132" font-size="11.5" font-weight="bold" fill="#581c87">• แม่เกย (ย) เช่น เนย ชาย สวยงาม</text>
      <text x="34" y="152" font-size="11.5" font-weight="bold" fill="#581c87">• แม่เกอว (ว) เช่น ดาว ข้าวเหนียว</text>
      <text x="34" y="169" font-size="10.5" font-weight="bold" fill="#047857">★ แม่ ก กา: ไม่มีตัวสะกด (เช่น ปลา ทะเล)</text>
    </g>

    <!-- ไม่ตรงตามมาตรา -->
    <g filter="url(#stdShadow)">
      <rect x="284" y="45" width="256" height="132" rx="8" fill="#fffbeb" stroke="#f59e0b" stroke-width="1.8" />
      <rect x="284" y="45" width="256" height="28" rx="8" fill="#d97706" />
      <text x="412" y="64" text-anchor="middle" font-size="12" font-weight="bold" fill="#ffffff">สะกดไม่ตรงตามมาตรา (มีตัวสะกดหลายตัว)</text>
      <text x="296" y="92" font-size="11" font-weight="bold" fill="#78350f">• แม่กน (น ณ ญ ร ล ฬ) → คำเป็น</text>
      <text x="296" y="112" font-size="11" font-weight="bold" fill="#991b1b">• แม่กก (ก ข ค ฆ) → คำตาย (กบด)</text>
      <text x="296" y="132" font-size="11" font-weight="bold" fill="#991b1b">• แม่กด (ด จ ช ซ ฎ ฏ ฐ ฑ ฒ ต ถ ท ธ ศ ษ ส)</text>
      <text x="296" y="152" font-size="11" font-weight="bold" fill="#991b1b">• แม่กบ (บ ป พ ฟ ภ) → คำตาย (กบด)</text>
      <text x="296" y="169" font-size="10" fill="#475569">หลักจำ: คำเป็น = "นมยวง" + สระเสียงยาว | คำตาย = "กบด"</text>
    </g>
  `;
  return svgWrap(content, 560, 194);
}

/**
 * 17. แผนภาพเวนน์-ออยเลอร์ 3 เซต (A, B, C ในเอกภพสัมพัทธ์ U) เหมือนข้อสอบคณิตศาสตร์ ม.4
 */
export function createVennDiagramSvg(): string {
  const content = `
    <rect width="100%" height="100%" fill="#ffffff" />
    <rect x="95" y="6" width="370" height="24" rx="12" fill="url(#hdrGrad)" stroke="#cbd5e1" />
    <text x="280" y="22" text-anchor="middle" class="label">แผนภาพเวนน์-ออยเลอร์แสดงความสัมพันธ์ของเซต A, B และ C ในเอกภพสัมพัทธ์ U</text>

    <!-- กรอบเอกภพสัมพัทธ์ U -->
    <rect x="25" y="36" width="320" height="178" rx="6" fill="#f8fafc" stroke="#0f172a" stroke-width="2" />
    <text x="332" y="54" text-anchor="end" font-size="15" font-weight="bold" font-style="italic" fill="#0f172a">U</text>

    <!-- วงกลม A, B, C โปร่งแสงซ้อนทับ -->
    <circle cx="150" cy="102" r="52" fill="#dbeafe" fill-opacity="0.45" stroke="#1d4ed8" stroke-width="1.8" />
    <circle cx="214" cy="102" r="52" fill="#dcfce7" fill-opacity="0.45" stroke="#15803d" stroke-width="1.8" />
    <circle cx="182" cy="152" r="52" fill="#fef3c7" fill-opacity="0.45" stroke="#b45309" stroke-width="1.8" />

    <!-- ชื่อเซต -->
    <text x="98" y="60" font-size="14" font-weight="bold" fill="#1e40af">A</text>
    <text x="260" y="60" font-size="14" font-weight="bold" fill="#15803d">B</text>
    <text x="238" y="198" font-size="14" font-weight="bold" fill="#b45309">C</text>

    <!-- สมาชิกในแต่ละบริเวณ -->
    <text x="120" y="90" text-anchor="middle" font-size="11.5" font-weight="bold" fill="#0f172a">1</text>
    <text x="142" y="76" text-anchor="middle" font-size="11.5" font-weight="bold" fill="#0f172a">2</text>
    <text x="122" y="114" text-anchor="middle" font-size="11.5" font-weight="bold" fill="#0f172a">11</text>
    <text x="148" y="102" text-anchor="middle" font-size="11.5" font-weight="bold" fill="#0f172a">16</text>

    <!-- A ∩ B - C -->
    <text x="182" y="84" text-anchor="middle" font-size="11.5" font-weight="bold" fill="#0f172a">3</text>

    <!-- เฉพาะ B -->
    <text x="220" y="76" text-anchor="middle" font-size="11.5" font-weight="bold" fill="#0f172a">4</text>
    <text x="242" y="90" text-anchor="middle" font-size="11.5" font-weight="bold" fill="#0f172a">5</text>
    <text x="216" y="104" text-anchor="middle" font-size="11.5" font-weight="bold" fill="#0f172a">14</text>
    <text x="242" y="118" text-anchor="middle" font-size="11.5" font-weight="bold" fill="#0f172a">17</text>

    <!-- A ∩ B ∩ C -->
    <circle cx="182" cy="116" r="10" fill="#dc2626" />
    <text x="182" y="120" text-anchor="middle" font-size="11.5" font-weight="bold" fill="#ffffff">6</text>

    <!-- A ∩ C - B -->
    <text x="155" y="130" text-anchor="middle" font-size="11" font-weight="bold" fill="#0f172a">7</text>
    <text x="162" y="144" text-anchor="middle" font-size="11" font-weight="bold" fill="#0f172a">12, 19</text>

    <!-- B ∩ C - A -->
    <text x="206" y="136" text-anchor="middle" font-size="11.5" font-weight="bold" fill="#0f172a">9</text>

    <!-- เฉพาะ C -->
    <text x="166" y="176" text-anchor="middle" font-size="11.5" font-weight="bold" fill="#0f172a">8</text>
    <text x="202" y="176" text-anchor="middle" font-size="11.5" font-weight="bold" fill="#0f172a">10</text>

    <!-- นอกเซต A, B, C -->
    <text x="54" y="196" text-anchor="middle" font-size="11.5" font-weight="bold" fill="#475569">20</text>
    <text x="278" y="80" text-anchor="middle" font-size="11.5" font-weight="bold" fill="#475569">13</text>
    <text x="298" y="106" text-anchor="middle" font-size="11.5" font-weight="bold" fill="#475569">18</text>
    <text x="304" y="196" text-anchor="middle" font-size="11.5" font-weight="bold" fill="#475569">15</text>

    <!-- แผงสัญลักษณ์การดำเนินการทางขวา -->
    <g transform="translate(360, 36)">
      <rect x="0" y="0" width="180" height="178" rx="8" fill="#f8fafc" stroke="#cbd5e1" />
      <text x="90" y="22" text-anchor="middle" font-size="11.5" font-weight="bold" fill="#0f172a">สรุปการดำเนินการของเซต</text>
      <line x1="10" y1="29" x2="170" y2="29" stroke="#e2e8f0" />
      <text x="12" y="48" font-size="10.5" fill="#1e293b">• <tspan font-weight="bold">A ∪ B</tspan> : ยูเนียน (เอาทั้งหมด)</text>
      <text x="12" y="68" font-size="10.5" fill="#1e293b">• <tspan font-weight="bold">A ∩ B</tspan> : อินเตอร์เซกชัน (ซ้ำกัน)</text>
      <text x="12" y="88" font-size="10.5" fill="#dc2626">• <tspan font-weight="bold">A ∩ B ∩ C = {6}</tspan></text>
      <text x="12" y="108" font-size="10.5" fill="#1e293b">• <tspan font-weight="bold">A - B</tspan> : อยู่ใน A แต่ไม่อยู่ใน B</text>
      <text x="12" y="128" font-size="10.5" fill="#1e293b">• <tspan font-weight="bold">A'</tspan> : คอมพลีเมนต์ (นอกเซต A)</text>
      <rect x="10" y="140" width="160" height="28" rx="5" fill="#0f172a" />
      <text x="90" y="158" text-anchor="middle" font-size="9.5" font-weight="bold" fill="#ffffff">n(A∪B) = n(A) + n(B) - n(A∩B)</text>
    </g>
  `;
  return svgWrap(content, 560, 226);
}

/**
 * 18. กราฟระบบสมการเชิงเส้นสองตัวแปรบนระนาบพิกัดฉาก (X-Y Grid) เหมือนข้อสอบคณิตศาสตร์ ม.3
 */
export function createLinearSystemGraphSvg(variant: number = 0): string {
  const ox = 165;
  const oy = 122;
  const step = 20;
  let grid = '';
  for (let gx = -5; gx <= 5; gx++) {
    const x = ox + gx * step;
    grid += `<line x1="${x}" y1="24" x2="${x}" y2="204" stroke="#e2e8f0" stroke-width="0.9" />`;
    if (gx !== 0 && gx >= -4 && gx <= 4) {
      grid += `<line x1="${x}" y1="${oy - 3}" x2="${x}" y2="${oy + 3}" stroke="#0f172a" stroke-width="1.3" />`;
      grid += `<text x="${x}" y="${oy + 15}" text-anchor="middle" font-size="10" font-weight="bold" fill="#334155">${gx}</text>`;
    }
  }
  for (let gy = -4; gy <= 4; gy++) {
    const y = oy - gy * step;
    grid += `<line x1="55" y1="${y}" x2="275" y2="${y}" stroke="#e2e8f0" stroke-width="0.9" />`;
    if (gy !== 0 && gy >= -3 && gy <= 4) {
      grid += `<line x1="${ox - 3}" y1="${y}" x2="${ox + 3}" y2="${y}" stroke="#0f172a" stroke-width="1.3" />`;
      grid += `<text x="${ox - 10}" y="${y + 4}" text-anchor="end" font-size="10" font-weight="bold" fill="#334155">${gy}</text>`;
    }
  }

  let lines = '';
  let infoTitle = '';
  let eq1 = '';
  let eq2 = '';
  let solText = '';

  if (variant % 3 === 0) {
    lines = `
      <line x1="${ox - 4 * step}" y1="${oy - (-1) * step}" x2="${ox + 1.5 * step}" y2="${oy - 4.5 * step}" stroke="#1d4ed8" stroke-width="2.4" />
      <line x1="${ox - 4 * step}" y1="${oy - 3.5 * step}" x2="${ox + 4 * step}" y2="${oy - (-0.5) * step}" stroke="#dc2626" stroke-width="2.4" />
      <circle cx="${ox - 1 * step}" cy="${oy - 2 * step}" r="4.5" fill="#dc2626" stroke="#ffffff" stroke-width="1.5" />
      <rect x="${ox - 1 * step - 28}" y="${oy - 2 * step - 24}" width="56" height="18" rx="4" fill="#0f172a" />
      <text x="${ox - 1 * step}" y="${oy - 2 * step - 12}" text-anchor="middle" font-size="10" font-weight="bold" fill="#ffffff">(-1, 2)</text>
    `;
    infoTitle = 'กรณีเส้นตรงตัดกัน 1 จุด';
    eq1 = 'L₁ : x - y = -3';
    eq2 = 'L₂ : x + 2y = 3';
    solText = 'มีคำตอบเดียว คือจุดตัด (-1, 2)';
  } else if (variant % 3 === 1) {
    lines = `
      <line x1="${ox - 3.5 * step}" y1="${oy - (-2.5) * step}" x2="${ox + 3 * step}" y2="${oy - 4 * step}" stroke="#1d4ed8" stroke-width="2.4" />
      <line x1="${ox - 1.5 * step}" y1="${oy - (-3) * step}" x2="${ox + 4 * step}" y2="${oy - 2.5 * step}" stroke="#dc2626" stroke-width="2.4" />
    `;
    infoTitle = 'กรณีเส้นตรงขนานกัน (L₁ // L₂)';
    eq1 = 'L₁ : y = x + 1 (ความชัน m₁ = 1)';
    eq2 = 'L₂ : y = x - 1.5 (ความชัน m₂ = 1)';
    solText = 'ไม่มีคำตอบของระบบสมการ (ไม่ตัดกัน)';
  } else {
    lines = `
      <line x1="${ox - 4 * step}" y1="${oy - 1 * step}" x2="${ox + 4 * step}" y2="${oy - (-3) * step}" stroke="#1d4ed8" stroke-width="2.4" />
      <line x1="${ox + 1 * step}" y1="${oy - (-3) * step}" x2="${ox + 4.5 * step}" y2="${oy - 0.5 * step}" stroke="#dc2626" stroke-width="2.4" />
      <circle cx="${ox + 2 * step}" cy="${oy - (-2) * step}" r="4.5" fill="#dc2626" stroke="#ffffff" stroke-width="1.5" />
      <rect x="${ox + 2 * step - 28}" y="${oy - (-2) * step + 8}" width="56" height="18" rx="4" fill="#0f172a" />
      <text x="${ox + 2 * step}" y="${oy - (-2) * step + 20}" text-anchor="middle" font-size="10" font-weight="bold" fill="#ffffff">(2, -2)</text>
    `;
    infoTitle = 'กรณีเส้นตรงตัดกันในจตุภาคที่ 4';
    eq1 = 'L₁ : x + 2y = -2';
    eq2 = 'L₂ : x - y = 4';
    solText = 'มีคำตอบเดียว คือจุดตัด (2, -2)';
  }

  const content = `
    <rect width="100%" height="100%" fill="#ffffff" />
    ${grid}
    <!-- แกน X และ Y -->
    <line x1="48" y1="${oy}" x2="284" y2="${oy}" stroke="#0f172a" stroke-width="1.8" />
    <polygon points="288,${oy} 280,${oy - 4} 280,${oy + 4}" fill="#0f172a" />
    <text x="294" y="${oy + 4}" font-size="12" font-weight="bold" fill="#0f172a">X</text>

    <line x1="${ox}" y1="206" x2="${ox}" y2="20" stroke="#0f172a" stroke-width="1.8" />
    <polygon points="${ox},15 ${ox - 4},23 ${ox + 4},23" fill="#0f172a" />
    <text x="${ox}" y="12" text-anchor="middle" font-size="11" font-weight="bold" fill="#0f172a">Y</text>
    <text x="${ox - 8}" y="${oy + 13}" font-size="10" font-weight="bold" fill="#0f172a">0</text>
    ${lines}

    <!-- กรอบวิเคราะห์กราฟระบบสมการเชิงเส้น -->
    <g transform="translate(318, 28)">
      <rect x="0" y="0" width="222" height="172" rx="10" fill="#f8fafc" stroke="#cbd5e1" />
      <rect x="0" y="0" width="222" height="28" rx="10" fill="#eff6ff" />
      <text x="111" y="19" text-anchor="middle" font-size="11.5" font-weight="bold" fill="#1e3a8a">${infoTitle}</text>
      <text x="14" y="50" font-size="11" font-weight="bold" fill="#1d4ed8">• สมการเส้นที่ 1: ${eq1}</text>
      <text x="14" y="72" font-size="11" font-weight="bold" fill="#dc2626">• สมการเส้นที่ 2: ${eq2}</text>
      <line x1="14" y1="84" x2="208" y2="84" stroke="#e2e8f0" />
      <text x="14" y="104" font-size="10.5" font-weight="bold" fill="#0f172a">สรุปคำตอบของระบบสมการ:</text>
      <text x="14" y="122" font-size="10.5" font-weight="bold" fill="#047857">${solText}</text>
      <text x="14" y="145" font-size="9.5" fill="#475569">หมายเหตุ: คู่อันดับ (x, y) ที่เป็นจุดตัด</text>
      <text x="14" y="159" font-size="9.5" fill="#475569">จะสอดคล้องกับสมการทั้งสองพร้อมกัน</text>
    </g>
  `;
  return svgWrap(content, 560, 222);
}

/**
 * 19. แผนภาพโครงสร้างและออร์แกเนลล์ของเซลล์พืชแบบภาพตัดขวาง 3 มิติ (3D Isometric Cutaway Plant Cell)
 * มาตรฐานแบบเรียนชีววิทยา สพฐ. / สทศ. / ONET พร้อมเส้นชี้และหมายเลขกำกับสำหรับการทดสอบ
 */
export function createCellDiagramSvg(mode: 'exam' | 'teach' | 'labeled' = 'teach'): string {
  const isExam = mode === 'exam';
  const content = `
    <defs>
      <!-- เงาตกกระทบและมิติ 3D -->
      <filter id="cellShadow" x="-10%" y="-10%" width="130%" height="130%">
        <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#0f172a" flood-opacity="0.12" />
      </filter>

      <!-- สีผนังเซลล์ 3D (Cell Wall) ด้านนอก ด้านบน และรอยตัดขวาง -->
      <linearGradient id="cwTopRim" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#c8a26b" />
        <stop offset="50%" stop-color="#b0864e" />
        <stop offset="100%" stop-color="#8a6332" />
      </linearGradient>
      <linearGradient id="cwCutL" x1="0%" y1="0%" x2="100%" y2="50%">
        <stop offset="0%" stop-color="#e8caa0" />
        <stop offset="60%" stop-color="#d4aa71" />
        <stop offset="100%" stop-color="#be9257" />
      </linearGradient>
      <linearGradient id="cwCutR" x1="0%" y1="0%" x2="50%" y2="100%">
        <stop offset="0%" stop-color="#f1dcb8" />
        <stop offset="70%" stop-color="#dcba86" />
        <stop offset="100%" stop-color="#c3975a" />
      </linearGradient>
      <linearGradient id="cwOuterL" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#9a7344" />
        <stop offset="100%" stop-color="#694a21" />
      </linearGradient>
      <linearGradient id="cwOuterR" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#886337" />
        <stop offset="100%" stop-color="#553816" />
      </linearGradient>

      <!-- เยื่อหุ้มเซลล์ (Plasma Membrane) เส้นสีเหลืองทอง -->
      <linearGradient id="pmGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#fef08a" />
        <stop offset="50%" stop-color="#facc15" />
        <stop offset="100%" stop-color="#ca8a04" />
      </linearGradient>

      <!-- ไซโทพลาซึมภายในเซลล์พืช -->
      <radialGradient id="cytoBg" cx="45%" cy="40%" r="65%">
        <stop offset="0%" stop-color="#f7fee7" />
        <stop offset="60%" stop-color="#ecfccb" />
        <stop offset="100%" stop-color="#d9f99d" />
      </radialGradient>

      <!-- นิวเคลียสทรงกลม 3D และนิวคลีโอลัส (Nucleus & Nucleolus) -->
      <radialGradient id="nuc3D" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stop-color="#e9d5ff" />
        <stop offset="25%" stop-color="#c084fc" />
        <stop offset="65%" stop-color="#8b5cf6" />
        <stop offset="90%" stop-color="#6d28d9" />
        <stop offset="100%" stop-color="#4c1d95" />
      </radialGradient>
      <radialGradient id="ncl3D" cx="35%" cy="30%" r="65%">
        <stop offset="0%" stop-color="#7e22ce" />
        <stop offset="80%" stop-color="#3b0764" />
        <stop offset="100%" stop-color="#240444" />
      </radialGradient>

      <!-- แวคิวโอลขนาดใหญ่ (Central Vacuole) น้ำของเหลวใสเหลือบฟ้า -->
      <radialGradient id="vac3D" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9" />
        <stop offset="30%" stop-color="#e0f2fe" stop-opacity="0.85" />
        <stop offset="70%" stop-color="#bae6fd" stop-opacity="0.8" />
        <stop offset="95%" stop-color="#7dd3fc" stop-opacity="0.85" />
        <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.9" />
      </radialGradient>

      <!-- คลอโรพลาสต์ (Chloroplast) แคปซูลเขียวพร้อมเม็ดไทลาคอยด์ -->
      <radialGradient id="chl3D" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stop-color="#86efac" />
        <stop offset="45%" stop-color="#22c55e" />
        <stop offset="85%" stop-color="#15803d" />
        <stop offset="100%" stop-color="#14532d" />
      </radialGradient>

      <!-- ไมโทคอนเดรีย (Mitochondrion) เม็ดส้มอิฐ/ทอง พร้อมคริสตี -->
      <radialGradient id="mit3D" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stop-color="#fed7aa" />
        <stop offset="50%" stop-color="#f97316" />
        <stop offset="90%" stop-color="#c2410c" />
        <stop offset="100%" stop-color="#7c2d12" />
      </radialGradient>

      <!-- กอลจิบอดี (Golgi Complex) รอยพับสีฟ้าครามอมเขียว -->
      <linearGradient id="gol3D" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#a5f3fc" />
        <stop offset="40%" stop-color="#06b6d4" />
        <stop offset="100%" stop-color="#0891b2" />
      </linearGradient>

      <!-- ร่างแหเอนโดพลาซึม RER สีม่วงคราม -->
      <linearGradient id="rer3D" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#c7d2fe" />
        <stop offset="50%" stop-color="#818cf8" />
        <stop offset="100%" stop-color="#4f46e5" />
      </linearGradient>
    </defs>

    <!-- พื้นหลังแคนวาสกล่องแสดงผล -->
    <rect width="100%" height="100%" fill="#ffffff" />

    <!-- แถบหัวเรื่องแผนภาพมาตรฐาน -->
    <rect x="140" y="8" width="400" height="26" rx="13" fill="${isExam ? '#fffbeb' : '#f8fafc'}" stroke="${isExam ? '#f59e0b' : '#e2e8f0'}" stroke-width="1.2" />
    <text x="340" y="25" text-anchor="middle" font-size="12" font-weight="bold" fill="${isExam ? '#92400e' : '#1e293b'}">${isExam ? 'แบบทดสอบ: โครงสร้างเซลล์พืช (ระบุออร์แกเนลล์ตามหมายเลข 1–10)' : 'โครงสร้างและออร์แกเนลล์ของเซลล์พืช 3 มิติ (Plant Cell Cutaway 3D)'}</text>

    <!-- ==================== โครงร่าง 3D เซลล์พืช (ผนังเซลล์และเยื่อหุ้มเซลล์) ==================== -->
    <g id="cellWall3D" filter="url(#cellShadow)">
      <!-- ผนังหลังด้านใน (Back Inner Walls) -->
      <polygon points="340,78 448,130 448,255 340,325 232,255 232,130" fill="url(#cytoBg)" stroke="#84cc16" stroke-width="1.5" />

      <!-- ผนังเซลล์หน้าตัดบน (Top Rim Bevels) -->
      <polygon points="340,62 462,120 448,130 340,78" fill="url(#cwTopRim)" stroke="#553816" stroke-width="1.2" />
      <polygon points="340,62 218,120 232,130 340,78" fill="url(#cwTopRim)" stroke="#553816" stroke-width="1.2" />

      <!-- ผนังภายนอกด้านข้างซ้าย (Outer Left Wall) -->
      <polygon points="218,120 232,130 232,265 218,252" fill="url(#cwOuterL)" stroke="#553816" stroke-width="1.2" />
      <!-- ผนังภายนอกด้านข้างขวา (Outer Right Wall) -->
      <polygon points="462,120 448,130 448,265 462,252" fill="url(#cwOuterR)" stroke="#553816" stroke-width="1.2" />

      <!-- ผนังตัดผ่า 3D ด้านหน้าซ้าย (Front Left Cut Face) เผยให้เห็นความหนาของผนังเซลล์ -->
      <polygon points="218,252 232,265 315,315 315,365 295,385 200,315" fill="url(#cwCutL)" stroke="#553816" stroke-width="1.5" />
      <!-- ผนังตัดผ่า 3D ด้านหน้าขวา (Front Right Cut Face) -->
      <polygon points="462,252 448,265 365,315 365,365 385,385 480,315" fill="url(#cwCutR)" stroke="#553816" stroke-width="1.5" />

      <!-- ฐานค้ำยันรูปหกเหลี่ยมหน้า (Front Basal Notch) -->
      <polygon points="315,365 340,380 365,365 365,395 340,410 315,395" fill="url(#cwTopRim)" stroke="#553816" stroke-width="1.2" />

      <!-- พลาสโมเดสมาตา (Plasmodesmata) ท่อเชื่อมต่อทะลุผนังเซลล์ -->
      <ellipse cx="238" cy="292" rx="4.5" ry="3" fill="#65a30d" stroke="#365314" stroke-width="1" />
      <ellipse cx="258" cy="310" rx="4" ry="2.5" fill="#65a30d" stroke="#365314" stroke-width="1" />
      <ellipse cx="278" cy="328" rx="4.5" ry="3" fill="#65a30d" stroke="#365314" stroke-width="1" />
      <ellipse cx="442" cy="292" rx="4.5" ry="3" fill="#65a30d" stroke="#365314" stroke-width="1" />
      <ellipse cx="422" cy="310" rx="4" ry="2.5" fill="#65a30d" stroke="#365314" stroke-width="1" />
      <ellipse cx="402" cy="328" rx="4.5" ry="3" fill="#65a30d" stroke="#365314" stroke-width="1" />
      <circle cx="340" cy="378" r="3.5" fill="#65a30d" stroke="#365314" stroke-width="0.9" />

      <!-- เยื่อหุ้มเซลล์ (Plasma Membrane) เส้นสีเหลืองทองขอบใน -->
      <path d="M 233 131 L 340 80 L 447 131 L 447 266 L 366 316 L 340 330 L 314 316 L 233 266 Z" fill="none" stroke="url(#pmGold)" stroke-width="3" stroke-linejoin="round" />
      <path d="M 235 133 L 340 82 L 445 133 L 445 264 L 365 314 L 340 328 L 315 314 L 235 264 Z" fill="none" stroke="#ca8a04" stroke-width="1" stroke-dasharray="4,2" />
    </g>

    <!-- ==================== ออร์แกเนลล์ภายในเซลล์พืช ==================== -->
    <g id="organelles">
      <!-- 1. แวคิวโอลขนาดใหญ่ (Central Vacuole) ถุงของเหลวโปร่งแสงกลางเซลล์ -->
      <g id="vacuole">
        <!-- เงาใต้แวคิวโอล -->
        <path d="M 275 195 C 330 185, 420 190, 428 245 C 435 290, 360 320, 305 305 C 265 295, 245 240, 275 195 Z" fill="#38bdf8" fill-opacity="0.25" />
        <!-- ตัวแวคิวโอล 3D -->
        <path d="M 280 185 C 340 170, 420 180, 428 238 C 436 295, 365 318, 310 300 C 260 285, 248 230, 280 185 Z" fill="url(#vac3D)" stroke="#0284c7" stroke-width="2" />
        <!-- แสงสะท้อนผิวน้ำ/ของเหลว (Meniscus Reflection Highlights) -->
        <path d="M 295 192 C 345 180, 400 190, 412 225" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity="0.8" />
        <path d="M 315 200 C 355 192, 390 200, 402 225" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" opacity="0.6" />
        <ellipse cx="370" cy="275" rx="28" ry="12" fill="#ffffff" fill-opacity="0.3" />
      </g>

      <!-- 2. นิวเคลียส (Nucleus) และ นิวคลีโอลัส (Nucleolus) -->
      <g id="nucleus">
        <!-- ร่างแหเอนโดพลาซึม RER ชั้นนอกที่หุ้มนิวเคลียส (Rough Endoplasmic Reticulum) -->
        <path d="M 255 110 C 275 92, 335 92, 355 118 C 365 130, 368 152, 358 172" fill="none" stroke="url(#rer3D)" stroke-width="5.5" stroke-linecap="round" />
        <path d="M 250 118 C 270 102, 328 100, 348 125 C 358 138, 360 158, 348 178" fill="none" stroke="url(#rer3D)" stroke-width="4.5" stroke-linecap="round" />
        <path d="M 252 128 C 268 115, 318 112, 338 132 C 346 142, 348 160, 338 175" fill="none" stroke="url(#rer3D)" stroke-width="3.5" stroke-linecap="round" />

        <!-- ไรโบโซม (Ribosomes) เม็ดจุดสีเข้มบน RER -->
        <circle cx="262" cy="106" r="1.6" fill="#1e1b4b" />
        <circle cx="274" cy="99" r="1.6" fill="#1e1b4b" />
        <circle cx="290" cy="96" r="1.6" fill="#1e1b4b" />
        <circle cx="308" cy="96" r="1.6" fill="#1e1b4b" />
        <circle cx="326" cy="102" r="1.6" fill="#1e1b4b" />
        <circle cx="344" cy="112" r="1.6" fill="#1e1b4b" />
        <circle cx="356" cy="125" r="1.6" fill="#1e1b4b" />
        <circle cx="362" cy="142" r="1.6" fill="#1e1b4b" />
        <circle cx="358" cy="158" r="1.6" fill="#1e1b4b" />
        <circle cx="254" cy="122" r="1.6" fill="#1e1b4b" />
        <circle cx="268" cy="112" r="1.6" fill="#1e1b4b" />
        <circle cx="316" cy="106" r="1.6" fill="#1e1b4b" />
        <circle cx="336" cy="120" r="1.6" fill="#1e1b4b" />
        <circle cx="350" cy="136" r="1.6" fill="#1e1b4b" />

        <!-- ก้อนนิวเคลียสทรงกลม 3D (Spherical Nucleus) -->
        <circle cx="305" cy="142" r="33" fill="url(#nuc3D)" stroke="#3b0764" stroke-width="1.8" />
        <!-- รอยผ่าตัดเปิด 1/4 (Cutaway Wedge) เพื่อมองเห็นนิวคลีโอลัสข้างใน -->
        <path d="M 305 142 L 338 142 A 33 33 0 0 1 305 175 Z" fill="#6b21a8" stroke="#3b0764" stroke-width="1.4" />
        <!-- นิวคลีโอลัส (Nucleolus) แกนกลางเข้ม -->
        <circle cx="315" cy="152" r="13" fill="url(#ncl3D)" stroke="#1e1b4b" stroke-width="1.2" />
        <circle cx="312" cy="149" r="3.5" fill="#c084fc" opacity="0.6" />

        <!-- รูบนเยื่อหุ้มนิวเคลียส (Nuclear Pores) -->
        <circle cx="285" cy="125" r="1.5" fill="#3b0764" />
        <circle cx="298" cy="118" r="1.5" fill="#3b0764" />
        <circle cx="278" cy="140" r="1.5" fill="#3b0764" />
        <circle cx="288" cy="155" r="1.5" fill="#3b0764" />
        <circle cx="320" cy="122" r="1.5" fill="#3b0764" />
      </g>

      <!-- 3. กอลจิบอดี / กอลจิคอมเพล็กซ์ (Golgi Apparatus / Complex) -->
      <g id="golgi">
        <!-- ชั้นพับซิสเทอร์นี (Cisternae stacks) -->
        <path d="M 238 185 C 248 188, 255 198, 252 210" fill="none" stroke="url(#gol3D)" stroke-width="4.5" stroke-linecap="round" />
        <path d="M 242 188 C 252 192, 258 202, 256 215" fill="none" stroke="url(#gol3D)" stroke-width="4" stroke-linecap="round" />
        <path d="M 246 192 C 256 196, 262 206, 260 220" fill="none" stroke="url(#gol3D)" stroke-width="3.5" stroke-linecap="round" />
        <path d="M 250 196 C 260 200, 265 210, 264 224" fill="none" stroke="url(#gol3D)" stroke-width="3" stroke-linecap="round" />
        <!-- ถุงเวสิเคิลที่หลุดออก (Golgi Vesicles) -->
        <circle cx="236" cy="180" r="3.2" fill="#22d3ee" stroke="#0891b2" stroke-width="1" />
        <circle cx="242" cy="174" r="2.8" fill="#22d3ee" stroke="#0891b2" stroke-width="1" />
        <circle cx="258" cy="226" r="3" fill="#22d3ee" stroke="#0891b2" stroke-width="1" />
        <circle cx="266" cy="222" r="2.5" fill="#22d3ee" stroke="#0891b2" stroke-width="1" />
      </g>

      <!-- 4. คลอโรพลาสต์ 3D (Chloroplast) แบบผ่าแสดงเหรียญไทลาคอยด์ (Grana stacks) -->
      <g id="chloroplast">
        <!-- คลอโรพลาสต์หลักด้านหน้า (ผ่าตัดขวางเห็นเหรียญไทลาคอยด์ซ้อนเป็นกรานุม) -->
        <g transform="translate(375, 290) rotate(-15)">
          <!-- เปลือกนอก 3D -->
          <ellipse cx="0" cy="0" rx="30" ry="18" fill="url(#chl3D)" stroke="#14532d" stroke-width="1.8" />
          <!-- สโตรมาด้านใน (Stroma) -->
          <ellipse cx="2" cy="0" rx="25" ry="14" fill="#15803d" />
          <!-- ไทลาคอยด์กรานุม 1 (Grana Stack 1) -->
          <ellipse cx="-14" cy="-4" rx="5" ry="2" fill="#86efac" stroke="#166534" stroke-width="0.8" />
          <ellipse cx="-14" cy="-1" rx="5" ry="2" fill="#4ade80" stroke="#166534" stroke-width="0.8" />
          <ellipse cx="-14" cy="2" rx="5" ry="2" fill="#22c55e" stroke="#166534" stroke-width="0.8" />
          <ellipse cx="-14" cy="5" rx="5" ry="2" fill="#16a34a" stroke="#166534" stroke-width="0.8" />
          <!-- ไทลาคอยด์กรานุม 2 (Grana Stack 2) -->
          <ellipse cx="0" cy="-6" rx="5.5" ry="2.2" fill="#86efac" stroke="#166534" stroke-width="0.8" />
          <ellipse cx="0" cy="-3" rx="5.5" ry="2.2" fill="#4ade80" stroke="#166534" stroke-width="0.8" />
          <ellipse cx="0" cy="0" rx="5.5" ry="2.2" fill="#22c55e" stroke="#166534" stroke-width="0.8" />
          <ellipse cx="0" cy="3" rx="5.5" ry="2.2" fill="#16a34a" stroke="#166534" stroke-width="0.8" />
          <ellipse cx="0" cy="6" rx="5.5" ry="2.2" fill="#15803d" stroke="#166534" stroke-width="0.8" />
          <!-- ไทลาคอยด์กรานุม 3 (Grana Stack 3) -->
          <ellipse cx="14" cy="-3" rx="4.5" ry="2" fill="#86efac" stroke="#166534" stroke-width="0.8" />
          <ellipse cx="14" cy="0" rx="4.5" ry="2" fill="#4ade80" stroke="#166534" stroke-width="0.8" />
          <ellipse cx="14" cy="3" rx="4.5" ry="2" fill="#22c55e" stroke="#166534" stroke-width="0.8" />
          <!-- สโตรมาลาเมลลา (Stroma lamellae) เส้นเชื่อมกรานา -->
          <line x1="-10" y1="2" x2="-4" y2="2" stroke="#86efac" stroke-width="1.2" />
          <line x1="4" y1="0" x2="10" y2="0" stroke="#86efac" stroke-width="1.2" />
        </g>

        <!-- คลอโรพลาสต์เม็ดที่สองด้านหลังขวา (เต็มใบรูปวงรี) -->
        <g transform="translate(425, 205) rotate(35)">
          <ellipse cx="0" cy="0" rx="24" ry="14" fill="url(#chl3D)" stroke="#14532d" stroke-width="1.6" />
          <path d="M -16 -4 C -6 -10, 6 -10, 16 -4" fill="none" stroke="#bbf7d0" stroke-width="1.8" opacity="0.7" />
        </g>
      </g>

      <!-- 5. ไมโทคอนเดรีย (Mitochondrion) เม็ดส้มพร้อมสันคริสตี (Cristae) พับทบไปมา -->
      <g id="mitochondria">
        <!-- ไมโทคอนเดรียหลักด้านหน้าล่างซ้าย -->
        <g transform="translate(305, 305) rotate(20)">
          <!-- เยื่อหุ้มชั้นนอก (Outer membrane) -->
          <ellipse cx="0" cy="0" rx="26" ry="14" fill="url(#mit3D)" stroke="#7c2d12" stroke-width="1.6" />
          <!-- เมทริกซ์และคริสตีชั้นใน (Inner folded cristae) -->
          <path d="M -18 0 C -12 -5, -8 -5, -6 0 C -4 5, 0 5, 2 0 C 4 -5, 8 -5, 10 0 C 12 5, 16 5, 18 0" fill="none" stroke="#ffedd5" stroke-width="2.2" stroke-linecap="round" />
          <path d="M -14 -4 C -10 1, -6 1, -2 -4" fill="none" stroke="#fed7aa" stroke-width="1.5" stroke-linecap="round" />
          <path d="M 0 4 C 4 -1, 8 -1, 12 4" fill="none" stroke="#fed7aa" stroke-width="1.5" stroke-linecap="round" />
        </g>

        <!-- ไมโทคอนเดรียเม็ดที่สองด้านขวาบน -->
        <g transform="translate(415, 165) rotate(-25)">
          <ellipse cx="0" cy="0" rx="20" ry="11" fill="url(#mit3D)" stroke="#7c2d12" stroke-width="1.4" />
          <path d="M -12 0 C -8 -3, -4 -3, -2 0 C 0 3, 4 3, 6 0 C 8 -3, 10 -3, 12 0" fill="none" stroke="#ffedd5" stroke-width="1.8" stroke-linecap="round" />
        </g>
      </g>

      <!-- 6. เพอรอกซิโซม (Peroxisome) ถุงกลมเอนไซม์สลาย H2O2 -->
      <g id="peroxisome">
        <circle cx="272" cy="265" r="7.5" fill="url(#prxGrad)" stroke="#475569" stroke-width="1.2" />
        <rect x="270" y="263" width="4" height="4" fill="#334155" />
        <circle cx="395" cy="188" r="6.5" fill="url(#prxGrad)" stroke="#475569" stroke-width="1" />
      </g>

      <!-- 7. ไซโทสเกเลตัน (Cytoskeleton Microfilaments) เส้นใยโครงร่างเซลล์ -->
      <path d="M 245 155 Q 265 210, 290 270" fill="none" stroke="#94a3b8" stroke-width="1" stroke-dasharray="3,3" opacity="0.6" />
      <path d="M 370 140 Q 380 200, 420 270" fill="none" stroke="#94a3b8" stroke-width="1" stroke-dasharray="3,3" opacity="0.6" />
    </g>

    <!-- ==================== เส้นชี้และป้ายข้อความ (Leader Lines & Badges 1 - 10) ==================== -->
    <g id="labels" font-family="'Sarabun', 'Mali', sans-serif">
      <!-- ฝั่งซ้าย (Left Callouts) -->
      <!-- 1: ผนังเซลล์ (Cell Wall) -->
      <line x1="210" y1="285" x2="148" y2="285" stroke="#1e293b" stroke-width="1.4" />
      <circle cx="210" cy="285" r="3" fill="#0f172a" stroke="#ffffff" stroke-width="1" />
      <rect x="25" y="272" width="120" height="26" rx="6" fill="#0f172a" />
      <text x="36" y="289" font-size="12" font-weight="bold" fill="#ffffff">1</text>
      ${isExam ? `<text x="54" y="289" font-size="11" font-weight="bold" fill="#facc15">หมายเลข (1)</text><text x="25" y="310" font-size="10" font-weight="600" fill="#94a3b8">......................................</text>` : `<text x="54" y="289" font-size="11" font-weight="bold" fill="#ffffff">ผนังเซลล์</text><text x="25" y="310" font-size="10" font-weight="600" fill="#475569">Cell Wall</text>`}

      <!-- 2: เยื่อหุ้มเซลล์ (Plasma Membrane) -->
      <line x1="234" y1="240" x2="148" y2="240" stroke="#1e293b" stroke-width="1.4" />
      <circle cx="234" cy="240" r="3" fill="#0f172a" stroke="#ffffff" stroke-width="1" />
      <rect x="25" y="227" width="120" height="26" rx="6" fill="#0f172a" />
      <text x="36" y="244" font-size="12" font-weight="bold" fill="#ffffff">2</text>
      ${isExam ? `<text x="54" y="244" font-size="11" font-weight="bold" fill="#facc15">หมายเลข (2)</text><text x="25" y="265" font-size="10" font-weight="600" fill="#94a3b8">......................................</text>` : `<text x="54" y="244" font-size="11" font-weight="bold" fill="#ffffff">เยื่อหุ้มเซลล์</text><text x="25" y="265" font-size="10" font-weight="600" fill="#475569">Plasma Membrane</text>`}

      <!-- 3: นิวเคลียส (Nucleus) -->
      <line x1="290" y1="135" x2="148" y2="135" stroke="#1e293b" stroke-width="1.4" />
      <circle cx="290" cy="135" r="3" fill="#0f172a" stroke="#ffffff" stroke-width="1" />
      <rect x="25" y="122" width="120" height="26" rx="6" fill="#0f172a" />
      <text x="36" y="139" font-size="12" font-weight="bold" fill="#ffffff">3</text>
      ${isExam ? `<text x="54" y="139" font-size="11" font-weight="bold" fill="#facc15">หมายเลข (3)</text><text x="25" y="160" font-size="10" font-weight="600" fill="#94a3b8">......................................</text>` : `<text x="54" y="139" font-size="11" font-weight="bold" fill="#ffffff">นิวเคลียส</text><text x="25" y="160" font-size="10" font-weight="600" fill="#475569">Nucleus (มีนิวคลีโอลัส)</text>`}

      <!-- 7: ร่างแหเอนโดพลาซึม (Endoplasmic Reticulum) -->
      <line x1="262" y1="102" x2="148" y2="78" stroke="#1e293b" stroke-width="1.4" />
      <circle cx="262" cy="102" r="3" fill="#0f172a" stroke="#ffffff" stroke-width="1" />
      <rect x="25" y="65" width="120" height="26" rx="6" fill="#0f172a" />
      <text x="36" y="82" font-size="12" font-weight="bold" fill="#ffffff">7</text>
      ${isExam ? `<text x="54" y="82" font-size="11" font-weight="bold" fill="#facc15">หมายเลข (7)</text><text x="25" y="103" font-size="10" font-weight="600" fill="#94a3b8">......................................</text>` : `<text x="54" y="82" font-size="11" font-weight="bold" fill="#ffffff">เอนโดพลาสมิกฯ</text><text x="25" y="103" font-size="10" font-weight="600" fill="#475569">Endoplasmic Reticulum</text>`}

      <!-- 8: กอลจิบอดี / กอลจิคอมเพล็กซ์ (Golgi Apparatus) -->
      <line x1="242" y1="205" x2="148" y2="185" stroke="#1e293b" stroke-width="1.4" />
      <circle cx="242" cy="205" r="3" fill="#0f172a" stroke="#ffffff" stroke-width="1" />
      <rect x="25" y="172" width="120" height="26" rx="6" fill="#0f172a" />
      <text x="36" y="189" font-size="12" font-weight="bold" fill="#ffffff">8</text>
      ${isExam ? `<text x="54" y="189" font-size="11" font-weight="bold" fill="#facc15">หมายเลข (8)</text><text x="25" y="210" font-size="10" font-weight="600" fill="#94a3b8">......................................</text>` : `<text x="54" y="189" font-size="11" font-weight="bold" fill="#ffffff">กอลจิบอดี</text><text x="25" y="210" font-size="10" font-weight="600" fill="#475569">Golgi Apparatus</text>`}

      <!-- ฝั่งขวา (Right Callouts) -->
      <!-- 4: แวคิวโอลขนาดใหญ่ (Central Vacuole) -->
      <line x1="390" y1="225" x2="530" y2="145" stroke="#1e293b" stroke-width="1.4" />
      <circle cx="390" cy="225" r="3" fill="#0f172a" stroke="#ffffff" stroke-width="1" />
      <rect x="532" y="132" width="122" height="26" rx="6" fill="#0f172a" />
      <text x="544" y="149" font-size="12" font-weight="bold" fill="#ffffff">4</text>
      ${isExam ? `<text x="562" y="149" font-size="11" font-weight="bold" fill="#facc15">หมายเลข (4)</text><text x="532" y="170" font-size="10" font-weight="600" fill="#94a3b8">......................................</text>` : `<text x="562" y="149" font-size="11" font-weight="bold" fill="#ffffff">แวคิวโอล</text><text x="532" y="170" font-size="10" font-weight="600" fill="#475569">Central Vacuole</text>`}

      <!-- 5: คลอโรพลาสต์ (Chloroplast) -->
      <line x1="395" y1="285" x2="530" y2="285" stroke="#1e293b" stroke-width="1.4" />
      <circle cx="395" cy="285" r="3" fill="#0f172a" stroke="#ffffff" stroke-width="1" />
      <rect x="532" y="272" width="122" height="26" rx="6" fill="#0f172a" />
      <text x="544" y="289" font-size="12" font-weight="bold" fill="#ffffff">5</text>
      ${isExam ? `<text x="562" y="289" font-size="11" font-weight="bold" fill="#facc15">หมายเลข (5)</text><text x="532" y="310" font-size="10" font-weight="600" fill="#94a3b8">......................................</text>` : `<text x="562" y="289" font-size="11" font-weight="bold" fill="#ffffff">คลอโรพลาสต์</text><text x="532" y="310" font-size="10" font-weight="600" fill="#475569">Chloroplast (มีไทลาคอยด์)</text>`}

      <!-- 6: ไมโทคอนเดรีย (Mitochondrion) -->
      <line x1="325" y1="315" x2="530" y2="340" stroke="#1e293b" stroke-width="1.4" />
      <circle cx="325" cy="315" r="3" fill="#0f172a" stroke="#ffffff" stroke-width="1" />
      <rect x="532" y="327" width="122" height="26" rx="6" fill="#0f172a" />
      <text x="544" y="344" font-size="12" font-weight="bold" fill="#ffffff">6</text>
      ${isExam ? `<text x="562" y="344" font-size="11" font-weight="bold" fill="#facc15">หมายเลข (6)</text><text x="532" y="365" font-size="10" font-weight="600" fill="#94a3b8">......................................</text>` : `<text x="562" y="344" font-size="11" font-weight="bold" fill="#ffffff">ไมโทคอนเดรีย</text><text x="532" y="365" font-size="10" font-weight="600" fill="#475569">Mitochondrion (มีคริสตี)</text>`}

      <!-- 9: พลาสโมเดสมาตา (Plasmodesmata) -->
      <line x1="435" y1="315" x2="530" y2="225" stroke="#1e293b" stroke-width="1.4" />
      <circle cx="435" cy="315" r="3" fill="#0f172a" stroke="#ffffff" stroke-width="1" />
      <rect x="532" y="212" width="122" height="26" rx="6" fill="#0f172a" />
      <text x="544" y="229" font-size="12" font-weight="bold" fill="#ffffff">9</text>
      ${isExam ? `<text x="562" y="229" font-size="11" font-weight="bold" fill="#facc15">หมายเลข (9)</text><text x="532" y="250" font-size="10" font-weight="600" fill="#94a3b8">......................................</text>` : `<text x="562" y="229" font-size="11" font-weight="bold" fill="#ffffff">พลาสโมเดสมาตา</text><text x="532" y="250" font-size="10" font-weight="600" fill="#475569">Plasmodesmata</text>`}

      <!-- 10: ไรโบโซม (Ribosomes) -->
      <line x1="345" y1="112" x2="530" y2="85" stroke="#1e293b" stroke-width="1.4" />
      <circle cx="345" cy="112" r="3" fill="#0f172a" stroke="#ffffff" stroke-width="1" />
      <rect x="532" y="72" width="122" height="26" rx="6" fill="#0f172a" />
      <text x="540" y="89" font-size="12" font-weight="bold" fill="#ffffff">10</text>
      ${isExam ? `<text x="562" y="89" font-size="11" font-weight="bold" fill="#facc15">หมายเลข (10)</text><text x="532" y="110" font-size="10" font-weight="600" fill="#94a3b8">......................................</text>` : `<text x="562" y="89" font-size="11" font-weight="bold" fill="#ffffff">ไรโบโซม</text><text x="532" y="110" font-size="10" font-weight="600" fill="#475569">Ribosomes</text>`}
    </g>

    <!-- กล่องสรุปสัญลักษณ์ใต้ภาพ สำหรับพิมพ์ข้อสอบ -->
    ${isExam ? `
    <rect x="40" y="415" width="600" height="24" rx="6" fill="#fffbeb" stroke="#fcd34d" stroke-width="1" />
    <text x="340" y="431" text-anchor="middle" font-size="11" font-weight="bold" fill="#b45309">
      คำชี้แจง: ให้นักเรียนระบุชื่อและหน้าที่ของโครงสร้างและออร์แกเนลล์ตามหมายเลข 1–10 ที่ปรากฏในแผนภาพให้ถูกต้อง
    </text>
    ` : `
    <rect x="40" y="415" width="600" height="24" rx="6" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1" />
    <text x="340" y="431" text-anchor="middle" font-size="11" fill="#475569">
      ① ผนังเซลล์ · ② เยื่อหุ้มเซลล์ · ③ นิวเคลียส · ④ แวคิวโอล · ⑤ คลอโรพลาสต์ · ⑥ ไมโทคอนเดรีย · ⑦ RER · ⑧ กอลจิบอดี · ⑨ พลาสโมเดสมาตา
    </text>
    `}
  `;
  return svgWrap(content, 680, 448);
}

/**
 * 20. สัญลักษณ์ความปลอดภัยในห้องปฏิบัติการเคมี (NFPA 704 Diamond & GHS) และอุปกรณ์วัดปริมาตร 3D
 */
export function createChemistrySafetySvg(variant: number = 0): string {
  if (variant % 2 === 1) {
    const content = `
      <rect width="100%" height="100%" fill="#ffffff" />
      <rect x="85" y="8" width="390" height="25" rx="12" fill="url(#hdrGrad)" stroke="#cbd5e1" />
      <text x="280" y="25" text-anchor="middle" class="label">อุปกรณ์วัดปริมาตรของเหลวและการอ่านค่าท้องน้ำเว้า (Meniscus) ในปฏิบัติการเคมี</text>

      <g filter="url(#stdShadow)">
        <!-- 1. บีกเกอร์ (Beaker) -->
        <rect x="35" y="75" width="60" height="78" rx="3" fill="#e0f2fe" fill-opacity="0.65" stroke="#0f172a" stroke-width="2" />
        <rect x="37" y="108" width="56" height="43" fill="#38bdf8" fill-opacity="0.45" />
        <line x1="30" y1="75" x2="98" y2="75" stroke="#0f172a" stroke-width="2.5" />
        <line x1="76" y1="92" x2="93" y2="92" stroke="#0f172a" stroke-width="1.2" />
        <line x1="76" y1="110" x2="93" y2="110" stroke="#0f172a" stroke-width="1.2" />
        <line x1="76" y1="128" x2="93" y2="128" stroke="#0f172a" stroke-width="1.2" />
        <text x="65" y="172" text-anchor="middle" font-size="11.5" font-weight="bold" fill="#0f172a">1. บีกเกอร์</text>
        <text x="65" y="186" text-anchor="middle" font-size="9.5" fill="#475569">(วัดปริมาตรหยาบ)</text>

        <!-- 2. บิวเรตต์ (Burette: ขีด 0 อยู่ด้านบนสุด) -->
        <rect x="148" y="42" width="16" height="92" fill="#e0f2fe" fill-opacity="0.7" stroke="#0f172a" stroke-width="1.8" />
        <rect x="150" y="65" width="12" height="67" fill="#38bdf8" fill-opacity="0.5" />
        <polygon points="148,134 164,134 156,154" fill="#e0f2fe" stroke="#0f172a" stroke-width="1.6" />
        <line x1="142" y1="141" x2="170" y2="141" stroke="#dc2626" stroke-width="3" stroke-linecap="round" />
        <text x="172" y="52" font-size="9.5" font-weight="bold" fill="#dc2626">0.00 mL</text>
        <text x="172" y="128" font-size="9.5" font-weight="bold" fill="#0f172a">50.00 mL</text>
        <text x="156" y="172" text-anchor="middle" font-size="11.5" font-weight="bold" fill="#0f172a">2. บิวเรตต์</text>
        <text x="156" y="186" text-anchor="middle" font-size="9.5" fill="#dc2626">(ไทเทรต: ทศนิยม 2 ตำแหน่ง)</text>

        <!-- 3. ปิเปตต์แบบกระเปาะ (Volumetric Pipette) -->
        <line x1="255" y1="42" x2="255" y2="75" stroke="#0f172a" stroke-width="4" />
        <line x1="248" y1="58" x2="262" y2="58" stroke="#dc2626" stroke-width="1.8" />
        <ellipse cx="255" cy="94" rx="12" ry="22" fill="#bae6fd" stroke="#0f172a" stroke-width="1.8" />
        <line x1="255" y1="116" x2="255" y2="152" stroke="#0f172a" stroke-width="4" />
        <text x="255" y="172" text-anchor="middle" font-size="11.5" font-weight="bold" fill="#0f172a">3. ปิเปตต์</text>
        <text x="255" y="186" text-anchor="middle" font-size="9.5" fill="#047857">(ถ่ายเทปริมาตรแม่นยำสูง)</text>

        <!-- 4. ขวดวัดปริมาตร (Volumetric Flask) -->
        <rect x="344" y="48" width="12" height="44" fill="#e0f2fe" stroke="#0f172a" stroke-width="1.8" />
        <line x1="340" y1="68" x2="360" y2="68" stroke="#dc2626" stroke-width="2" />
        <path d="M 326 152 Q 312 108, 344 92 L 356 92 Q 388 108, 374 152 Z" fill="#bae6fd" fill-opacity="0.7" stroke="#0f172a" stroke-width="1.8" />
        <text x="350" y="172" text-anchor="middle" font-size="11.5" font-weight="bold" fill="#0f172a">4. ขวดวัดปริมาตร</text>
        <text x="350" y="186" text-anchor="middle" font-size="9.5" fill="#1d4ed8">(เตรียมสารละลายมาตรฐาน)</text>
      </g>

      <!-- กรอบขยายการอ่านค่าท้องน้ำเว้า (Meniscus) ในระดับสายตา -->
      <g transform="translate(415, 44)">
        <rect x="0" y="0" width="130" height="148" rx="8" fill="#f8fafc" stroke="#cbd5e1" />
        <text x="65" y="18" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#0f172a">การอ่านค่า Meniscus</text>
        <rect x="44" y="30" width="42" height="72" fill="#ffffff" stroke="#334155" stroke-width="1.8" />
        <path d="M 45 55 Q 65 68, 85 55 L 85 101 L 45 101 Z" fill="#38bdf8" fill-opacity="0.55" />
        <path d="M 45 55 Q 65 68, 85 55" fill="none" stroke="#0284c7" stroke-width="2" />
        <line x1="25" y1="62" x2="105" y2="62" stroke="#dc2626" stroke-width="1.6" stroke-dasharray="3,2" />
        <text x="65" y="118" text-anchor="middle" font-size="9.5" font-weight="bold" fill="#dc2626">อ่านที่จุดต่ำสุดของส่วนเว้า</text>
        <text x="65" y="132" text-anchor="middle" font-size="9" fill="#475569">ในระดับสายตา (Eye Level)</text>
      </g>
    `;
    return svgWrap(content, 560, 205);
  }

  // NFPA 704 Diamond (สีแดง 3, สีน้ำเงิน 0, สีเหลือง 0, สีขาว)
  const content = `
    <rect width="100%" height="100%" fill="#ffffff" />
    <rect x="85" y="8" width="390" height="25" rx="12" fill="url(#hdrGrad)" stroke="#cbd5e1" />
    <text x="280" y="25" text-anchor="middle" class="label">สัญลักษณ์แสดงความเป็นอันตรายของสารเคมี ระบบ NFPA 704 และ GHS</text>

    <g filter="url(#stdShadow)">
      <!-- ช่องบน (สีแดง - ความไวไฟ) -->
      <polygon points="155,42 205,92 155,142 105,92" fill="#fca5a5" stroke="#0f172a" stroke-width="2" />
      <text x="155" y="90" text-anchor="middle" font-size="24" font-weight="bold" fill="#7f1d1d">3</text>
      <text x="155" y="108" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#7f1d1d">สีแดง (ไวไฟ)</text>

      <!-- ช่องซ้าย (สีน้ำเงิน - สุขภาพ) -->
      <polygon points="105,92 155,142 105,192 55,142" fill="#93c5fd" stroke="#0f172a" stroke-width="2" />
      <text x="105" y="140" text-anchor="middle" font-size="24" font-weight="bold" fill="#1e3a8a">0</text>
      <text x="105" y="158" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#1e3a8a">สีน้ำเงิน</text>

      <!-- ช่องขวา (สีเหลือง - ความว่องไว) -->
      <polygon points="205,92 255,142 205,192 155,142" fill="#fde047" stroke="#0f172a" stroke-width="2" />
      <text x="205" y="140" text-anchor="middle" font-size="24" font-weight="bold" fill="#78350f">0</text>
      <text x="205" y="158" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#78350f">สีเหลือง</text>

      <!-- ช่องล่าง (สีขาว - อันตรายพิเศษ) -->
      <polygon points="155,142 205,192 155,242 105,192" fill="#ffffff" stroke="#0f172a" stroke-width="2" />
      <text x="155" y="196" text-anchor="middle" font-size="11.5" font-weight="bold" fill="#0f172a">สีขาว</text>
    </g>

    <!-- ตารางอธิบายความหมายระบบ NFPA 704 ทางขวา -->
    <g transform="translate(285, 45)">
      <rect x="0" y="0" width="255" height="195" rx="10" fill="#f8fafc" stroke="#cbd5e1" />
      <rect x="0" y="0" width="255" height="28" rx="10" fill="#0f172a" />
      <text x="127" y="18" text-anchor="middle" font-size="11" font-weight="bold" fill="#ffffff">ความหมายรหัสสีและระดับอันตราย (0 - 4)</text>

      <rect x="12" y="38" width="14" height="14" rx="3" fill="#ef4444" />
      <text x="34" y="49" font-size="10.5" font-weight="bold" fill="#991b1b">สีแดง (ด้านบน): ความไวไฟ (Flammability)</text>
      <text x="34" y="63" font-size="9.5" fill="#475569">ระดับ 3 = ติดไฟได้ที่อุณหภูมิห้อง (เช่น เอทานอล)</text>

      <rect x="12" y="76" width="14" height="14" rx="3" fill="#3b82f6" />
      <text x="34" y="87" font-size="10.5" font-weight="bold" fill="#1e40af">สีน้ำเงิน (ด้านซ้าย): อันตรายต่อสุขภาพ (Health)</text>
      <text x="34" y="101" font-size="9.5" fill="#475569">0 = ปลอดภัย · 4 = อันตรายถึงชีวิตเฉียบพลัน</text>

      <rect x="12" y="114" width="14" height="14" rx="3" fill="#eab308" />
      <text x="34" y="125" font-size="10.5" font-weight="bold" fill="#854d0e">สีเหลือง (ด้านขวา): ความว่องไวต่อปฏิกิริยา</text>
      <text x="34" y="139" font-size="9.5" fill="#475569">0 = เสถียรปกติ · 4 = เสี่ยงระเบิดได้เอง</text>

      <rect x="12" y="152" width="14" height="14" rx="3" fill="#ffffff" stroke="#334155" />
      <text x="34" y="163" font-size="10.5" font-weight="bold" fill="#0f172a">สีขาว (ด้านล่าง): อันตรายจำเพาะ (Special)</text>
      <text x="34" y="177" font-size="9.5" fill="#475569">OX = ออกซิไดซ์ · W = ห้ามใช้น้ำ · COR = กัดกร่อน</text>
    </g>
  `;
  return svgWrap(content, 560, 255);
}

/**
 * 21. แผนภาพเซลล์สัตว์ 3 มิติตัดขวาง (3D Cutaway Animal Cell Diagram)
 * เปรียบเทียบกับเซลล์พืช: ไม่มีผนังเซลล์ ไม่มีคลอโรพลาสต์ มีเซนทริโอล (Centrioles) และไลโซโซม (Lysosome)
 */
export function createAnimalCellDiagramSvg(mode: 'exam' | 'teach' = 'teach'): string {
  const isExam = mode === 'exam';
  const content = `
    <defs>
      <radialGradient id="acCyto" cx="45%" cy="40%" r="65%">
        <stop offset="0%" stop-color="#fff1f2" />
        <stop offset="65%" stop-color="#ffe4e6" />
        <stop offset="100%" stop-color="#fecdd3" />
      </radialGradient>
      <linearGradient id="acMembrane" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#fb7185" />
        <stop offset="50%" stop-color="#e11d48" />
        <stop offset="100%" stop-color="#9f1239" />
      </linearGradient>
      <radialGradient id="acNuc" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stop-color="#e9d5ff" />
        <stop offset="50%" stop-color="#9333ea" />
        <stop offset="100%" stop-color="#4c1d95" />
      </radialGradient>
    </defs>

    <rect width="100%" height="100%" fill="#ffffff" />
    <rect x="140" y="8" width="400" height="26" rx="13" fill="${isExam ? '#fffbeb' : 'url(#hdrGrad)'}" stroke="${isExam ? '#f59e0b' : '#cbd5e1'}" />
    <text x="340" y="25" text-anchor="middle" font-size="12.5" font-weight="bold" fill="${isExam ? '#92400e' : '#0f172a'}">${isExam ? 'แบบทดสอบ: โครงสร้างเซลล์สัตว์ (ระบุออร์แกเนลล์ตามหมายเลข 1–6)' : 'โครงสร้างและออร์แกเนลล์ของเซลล์สัตว์ 3 มิติ (Animal Cell Cutaway 3D)'}</text>

    <!-- ตัวเซลล์สัตว์ทรงกลมรีผ่าตัดขวาง 3 มิติ -->
    <g filter="url(#stdShadow)">
      <!-- เปลือกนอกเยื่อหุ้มเซลล์ (Plasma Membrane) -->
      <ellipse cx="340" cy="215" rx="145" ry="118" fill="url(#acMembrane)" stroke="#881337" stroke-width="2" />
      <!-- หน้าตัดไซโทพลาซึมด้านใน -->
      <ellipse cx="340" cy="206" rx="134" ry="106" fill="url(#acCyto)" stroke="#fda4af" stroke-width="2" />

      <!-- 1. นิวเคลียสและนิวคลีโอลัสกลางเซลล์ -->
      <circle cx="335" cy="175" r="42" fill="url(#acNuc)" stroke="#3b0764" stroke-width="2" />
      <path d="M 335 175 L 377 175 A 42 42 0 0 1 335 217 Z" fill="#581c87" stroke="#3b0764" stroke-width="1.5" />
      <circle cx="346" cy="186" r="15" fill="#2e1065" stroke="#c084fc" stroke-width="1.2" />

      <!-- 2. ร่างแหเอนโดพลาซึมขรุขระ (RER) และเรียบ (SER) -->
      <path d="M 278 145 C 295 120, 365 118, 388 145" fill="none" stroke="#6366f1" stroke-width="5" stroke-linecap="round" />
      <path d="M 272 156 C 288 132, 355 128, 382 156" fill="none" stroke="#818cf8" stroke-width="4" stroke-linecap="round" />
      <circle cx="288" cy="134" r="1.8" fill="#1e1b4b" />
      <circle cx="310" cy="126" r="1.8" fill="#1e1b4b" />
      <circle cx="335" cy="124" r="1.8" fill="#1e1b4b" />
      <circle cx="360" cy="129" r="1.8" fill="#1e1b4b" />

      <!-- 3. เซนทริโอล / เซนโทรโซม (Centrioles - พบในเซลล์สัตว์ช่วยแบ่งเซลล์) -->
      <g transform="translate(255, 185)">
        <rect x="-12" y="-6" width="22" height="10" rx="3" fill="#facc15" stroke="#a16207" stroke-width="1.5" />
        <rect x="-4" y="-16" width="10" height="22" rx="3" fill="#fde047" stroke="#a16207" stroke-width="1.5" />
      </g>

      <!-- 4. ไลโซโซม (Lysosome - บรรจุเอนไซม์ย่อยสลาย) -->
      <circle cx="282" cy="252" r="14" fill="url(#amber3D)" stroke="#78350f" stroke-width="1.6" />
      <circle cx="278" cy="249" r="2.5" fill="#78350f" />
      <circle cx="286" cy="254" r="2.5" fill="#78350f" />
      <circle cx="281" cy="257" r="2" fill="#78350f" />

      <!-- 5. ไมโทคอนเดรีย (Mitochondria) -->
      <g transform="translate(392, 245) rotate(-20)">
        <ellipse cx="0" cy="0" rx="26" ry="14" fill="url(#blue3D)" stroke="#1e3a8a" stroke-width="1.6" />
        <path d="M -18 0 C -12 -5, -8 -5, -4 0 C 0 5, 4 5, 8 0 C 12 -5, 16 -5, 18 0" fill="none" stroke="#dbeafe" stroke-width="2" />
      </g>

      <!-- 6. กอลจิคอมเพล็กซ์ (Golgi Apparatus) -->
      <path d="M 405 175 C 420 180, 425 196, 418 210" fill="none" stroke="#06b6d4" stroke-width="4.5" stroke-linecap="round" />
      <path d="M 412 180 C 426 185, 430 200, 424 214" fill="none" stroke="#22d3ee" stroke-width="4" stroke-linecap="round" />
      <circle cx="430" cy="218" r="3.5" fill="#22d3ee" stroke="#0891b2" />

      <!-- 7. แวคิวโอลขนาดเล็ก (Small Vacuole) -->
      <circle cx="338" cy="268" r="11" fill="#bae6fd" stroke="#0284c7" stroke-width="1.5" />
    </g>

    <!-- ป้ายชี้ส่วนประกอบ (Callout Badges) -->
    <!-- ซ้าย -->
    <line x1="205" y1="165" x2="145" y2="120" stroke="#0f172a" stroke-width="1.4" />
    <rect x="18" y="106" width="126" height="26" rx="6" fill="#0f172a" />
    <text x="81" y="123" text-anchor="middle" class="badge-txt">${isExam ? '1. หมายเลข (1) [ ... ]' : '1. เยื่อหุ้มเซลล์ (ไม่มีผนัง)'}</text>

    <line x1="255" y1="185" x2="145" y2="185" stroke="#0f172a" stroke-width="1.4" />
    <rect x="18" y="172" width="126" height="26" rx="6" fill="#b45309" />
    <text x="81" y="189" text-anchor="middle" class="badge-txt">${isExam ? '2. หมายเลข (2) [ ... ]' : '2. เซนทริโอล (แบ่งเซลล์)'}</text>

    <line x1="282" y1="252" x2="145" y2="252" stroke="#0f172a" stroke-width="1.4" />
    <rect x="18" y="239" width="126" height="26" rx="6" fill="#dc2626" />
    <text x="81" y="256" text-anchor="middle" class="badge-txt">${isExam ? '3. หมายเลข (3) [ ... ]' : '3. ไลโซโซม (ย่อยสลาย)'}</text>

    <!-- ขวา -->
    <line x1="355" y1="165" x2="528" y2="115" stroke="#0f172a" stroke-width="1.4" />
    <rect x="530" y="102" width="132" height="26" rx="6" fill="#581c87" />
    <text x="596" y="119" text-anchor="middle" class="badge-txt">${isExam ? '4. หมายเลข (4) [ ... ]' : '4. นิวเคลียสและนิวคลีโอลัส'}</text>

    <line x1="422" y1="195" x2="528" y2="185" stroke="#0f172a" stroke-width="1.4" />
    <rect x="530" y="172" width="132" height="26" rx="6" fill="#0891b2" />
    <text x="596" y="189" text-anchor="middle" class="badge-txt">${isExam ? '5. หมายเลข (5) [ ... ]' : '5. กอลจิคอมเพล็กซ์'}</text>

    <line x1="398" y1="245" x2="528" y2="252" stroke="#0f172a" stroke-width="1.4" />
    <rect x="530" y="239" width="132" height="26" rx="6" fill="#1d4ed8" />
    <text x="596" y="256" text-anchor="middle" class="badge-txt">${isExam ? '6. หมายเลข (6) [ ... ]' : '6. ไมโทคอนเดรีย (ATP)'}</text>

    <rect x="35" y="346" width="610" height="26" rx="6" fill="${isExam ? '#fffbeb' : '#f8fafc'}" stroke="${isExam ? '#fcd34d' : '#cbd5e1'}" />
    <text x="340" y="363" text-anchor="middle" font-size="11" font-weight="bold" fill="${isExam ? '#b45309' : '#334155'}">
      ${isExam ? 'คำชี้แจง: ให้นักเรียนระบุชื่อออร์แกเนลล์ตามหมายเลข 1–6 และระบุว่าออร์แกเนลล์ใดพบเฉพาะในเซลล์สัตว์' : 'ข้อแตกต่างสำคัญ: เซลล์สัตว์มีเซนทริโอลและไลโซโซม แต่ "ไม่มีผนังเซลล์" และ "ไม่มีคลอโรพลาสต์"'}
    </text>
  `;
  return svgWrap(content, 680, 382);
}

/**
 * 22. โครงสร้างหัวใจมนุษย์ 4 ห้องและระบบไหลเวียนเลือด (Human Heart & Double Circulation)
 */
export function createHumanHeartAndCirculationSvg(mode: 'exam' | 'teach' = 'teach'): string {
  const isExam = mode === 'exam';
  const content = `
    <rect width="100%" height="100%" fill="#ffffff" />
    <rect x="75" y="8" width="450" height="26" rx="13" fill="${isExam ? '#fffbeb' : 'url(#hdrGrad)'}" stroke="${isExam ? '#f59e0b' : '#cbd5e1'}" />
    <text x="300" y="25" text-anchor="middle" class="label" fill="${isExam ? '#92400e' : '#0f172a'}">${isExam ? 'แบบทดสอบ: กายวิภาคหัวใจมนุษย์ 4 ห้อง (ระบุชื่อห้องตามหมายเลข 1–4)' : 'โครงสร้างหัวใจมนุษย์ 4 ห้อง และทิศทางการไหลเวียนเลือด (Human Heart)'}</text>

    <!-- แผนผังหัวใจ 4 ห้องพร้อมหลอดเลือดแดง/ดำ -->
    <g filter="url(#stdShadow)">
      <!-- หลอดเลือดด้านบน: Vena Cava (น้ำเงิน), Pulmonary Artery (น้ำเงินไปปอด), Aorta (แดงไปทั่วร่างกาย) -->
      <path d="M 165 55 L 165 110" stroke="#2563eb" stroke-width="18" stroke-linecap="round" />
      <text x="115" y="65" text-anchor="end" font-size="10.5" font-weight="bold" fill="#1d4ed8">${isExam ? 'หลอดเลือด A' : 'เวนาคาวา (Vena Cava)'}</text>
      <text x="115" y="79" text-anchor="end" font-size="9.5" fill="#475569">${isExam ? '(รับเลือดเข้าหัวใจ)' : 'รับเลือดดำจากร่างกาย'}</text>

      <path d="M 275 95 C 275 45, 345 45, 355 85" fill="none" stroke="#dc2626" stroke-width="18" stroke-linecap="round" />
      <text x="372" y="56" font-size="11" font-weight="bold" fill="#dc2626">${isExam ? 'หลอดเลือด B' : 'เอออร์ตา (Aorta)'}</text>
      <text x="372" y="70" font-size="9.5" fill="#475569">${isExam ? '(ส่งเลือดไปเลี้ยงร่างกาย)' : 'ส่งเลือดแดงไปเลี้ยงร่างกาย'}</text>

      <!-- ห้องหัวใจฝั่งขวาของภาพ (ซ้ายของร่างกาย: เลือดแดง O2 สูง) และฝั่งซ้ายของภาพ (ขวาของร่างกาย: เลือดดำ O2 ต่ำ) -->
      <!-- ซีกขวาของร่างกาย (RA & RV - สีน้ำเงิน) -->
      <path d="M 135 100 C 105 110, 100 165, 130 215 C 155 255, 205 280, 235 288 L 235 100 Z" fill="url(#blue3D)" stroke="#1e3a8a" stroke-width="2.5" />
      <!-- ซีกซ้ายของร่างกาย (LA & LV - สีแดง ผนังหนาสุดที่ LV) -->
      <path d="M 235 100 L 235 288 C 265 280, 325 250, 345 205 C 365 155, 345 105, 305 100 Z" fill="url(#rose3D)" stroke="#881337" stroke-width="4" />

      <!-- ผนังกั้นห้องหัวใจ (Septum) และลิ้นหัวใจ -->
      <line x1="235" y1="100" x2="235" y2="288" stroke="#f8fafc" stroke-width="4" />
      <line x1="115" y1="175" x2="232" y2="175" stroke="#ffffff" stroke-width="3" stroke-dasharray="6,3" />
      <line x1="238" y1="175" x2="348" y2="175" stroke="#ffffff" stroke-width="3" stroke-dasharray="6,3" />

      <!-- ชื่อห้องหัวใจทั้ง 4 -->
      <text x="175" y="142" text-anchor="middle" font-size="12" font-weight="bold" fill="#ffffff">${isExam ? '1. ห้อง (1) [ ... ]' : '1. ห้องบนขวา (RA)'}</text>
      <text x="175" y="158" text-anchor="middle" font-size="9.5" fill="#dbeafe">${isExam ? '(เลือด O₂ ต่ำ)' : '(รับเลือดดำ O₂ ต่ำ)'}</text>

      <text x="180" y="220" text-anchor="middle" font-size="12" font-weight="bold" fill="#ffffff">${isExam ? '2. ห้อง (2) [ ... ]' : '2. ห้องล่างขวา (RV)'}</text>
      <text x="180" y="236" text-anchor="middle" font-size="9.5" fill="#dbeafe">${isExam ? '(สูบไปปอด)' : '(สูบฉีดไปฟอกที่ปอด)'}</text>

      <text x="292" y="142" text-anchor="middle" font-size="12" font-weight="bold" fill="#ffffff">${isExam ? '3. ห้อง (3) [ ... ]' : '3. ห้องบนซ้าย (LA)'}</text>
      <text x="292" y="158" text-anchor="middle" font-size="9.5" fill="#ffe4e6">${isExam ? '(รับจากปอด)' : '(รับเลือดแดงจากปอด)'}</text>

      <text x="290" y="220" text-anchor="middle" font-size="12" font-weight="bold" fill="#ffffff">${isExam ? '4. ห้อง (4) [ ... ]' : '4. ห้องล่างซ้าย (LV)'}</text>
      <text x="290" y="236" text-anchor="middle" font-size="9.5" fill="#ffe4e6">${isExam ? '(ผนังหนาสุด)' : '(ผนังหนาสุด สูบไปร่างกาย)'}</text>
    </g>

    <!-- ตารางสรุปลิ้นหัวใจและหลอดเลือดทางขวา -->
    <g transform="translate(388, 92)">
      ${isExam ? `
      <rect x="0" y="0" width="195" height="192" rx="10" fill="#fffbeb" stroke="#fcd34d" />
      <rect x="0" y="0" width="195" height="28" rx="10" fill="#b45309" />
      <text x="97" y="18" text-anchor="middle" font-size="11" font-weight="bold" fill="#ffffff">คำถามประจำแผนภาพ</text>
      <text x="10" y="48" font-size="10" font-weight="bold" fill="#92400e">1. จงระบุชื่อห้องหัวใจ 1–4</text>
      <text x="10" y="70" font-size="10" font-weight="bold" fill="#92400e">2. ห้องใดมีผนังหนาที่สุด?</text>
      <text x="10" y="92" font-size="10" font-weight="bold" fill="#92400e">3. หลอดเลือดใดนำเลือด</text>
      <text x="16" y="106" font-size="10" font-weight="bold" fill="#92400e">ออกจากหัวใจไปฟอกที่ปอด?</text>
      <line x1="10" y1="120" x2="185" y2="120" stroke="#fcd34d" />
      <text x="10" y="142" font-size="9.5" fill="#78350f">ตอบ: ..............................</text>
      <text x="10" y="162" font-size="9.5" fill="#78350f">..........................................</text>
      ` : `
      <rect x="0" y="0" width="195" height="192" rx="10" fill="#f8fafc" stroke="#cbd5e1" />
      <rect x="0" y="0" width="195" height="28" rx="10" fill="#0f172a" />
      <text x="97" y="18" text-anchor="middle" font-size="11" font-weight="bold" fill="#ffffff">สรุปกลไกการไหลเวียนเลือด</text>
      <text x="10" y="46" font-size="10" font-weight="bold" fill="#1d4ed8">• เลือดดำ (O₂ ต่ำ): ร่างกาย → RA</text>
      <text x="16" y="61" font-size="9.5" fill="#334155">ผ่านลิ้นไตรคัสพิด → RV → ปอด</text>
      <text x="10" y="82" font-size="10" font-weight="bold" fill="#dc2626">• เลือดแดง (O₂ สูง): ปอด → LA</text>
      <text x="16" y="97" font-size="9.5" fill="#334155">ผ่านลิ้นไบคัสพิด (ไมทรัล) → LV → Aorta</text>
      <line x1="10" y1="108" x2="185" y2="108" stroke="#cbd5e1" />
      <text x="10" y="125" font-size="10" font-weight="bold" fill="#047857">★ ข้อควรจำออกสอบบ่อย:</text>
      <text x="12" y="142" font-size="9.5" fill="#334155">1. พัลโมนารีอาร์เทอรี = อาร์เทอรีเดียวที่มีเลือดดำ</text>
      <text x="12" y="158" font-size="9.5" fill="#334155">2. พัลโมนารีเวน = เวนเดียวที่มีเลือดแดง</text>
      <text x="12" y="174" font-size="9.5" fill="#334155">3. ห้อง LV มีผนังกล้ามเนื้อหนาที่สุด</text>
      `}
    </g>
  `;
  return svgWrap(content, 600, 302);
}

/**
 * 23. โครงสร้างเกลียวคู่ DNA และการถ่ายทอดลักษณะทางพันธุกรรม (DNA Double Helix & Punnett Square)
 */
export function createDnaAndGeneticsSvg(): string {
  const content = `
    <rect width="100%" height="100%" fill="#ffffff" />
    <rect x="85" y="8" width="410" height="25" rx="12" fill="url(#hdrGrad)" stroke="#cbd5e1" />
    <text x="290" y="25" text-anchor="middle" class="label">โครงสร้างเกลียวคู่ DNA (เบสคู่สม A-T, C-G) และตารางพันเนตต์ (Punnett Square)</text>

    <!-- เกลียวคู่ DNA ด้านซ้าย -->
    <g transform="translate(35, 48)" filter="url(#stdShadow)">
      <rect x="0" y="0" width="245" height="190" rx="10" fill="#f8fafc" stroke="#cbd5e1" />
      <text x="122" y="22" text-anchor="middle" font-size="11.5" font-weight="bold" fill="#1e3a8a">เกลียวคู่ DNA (Double Helix)</text>

      <!-- คู่เบสขั้นบันได -->
      <line x1="65" y1="52" x2="122" y2="52" stroke="#ef4444" stroke-width="6" />
      <line x1="122" y1="52" x2="180" y2="52" stroke="#3b82f6" stroke-width="6" />
      <text x="122" y="47" text-anchor="middle" font-size="9.5" font-weight="bold" fill="#0f172a">A = T (2 พันธะไฮโดรเจน)</text>

      <line x1="58" y1="88" x2="122" y2="88" stroke="#10b981" stroke-width="6" />
      <line x1="122" y1="88" x2="186" y2="88" stroke="#f59e0b" stroke-width="6" />
      <text x="122" y="83" text-anchor="middle" font-size="9.5" font-weight="bold" fill="#0f172a">C ≡ G (3 พันธะไฮโดรเจน)</text>

      <line x1="65" y1="124" x2="122" y2="124" stroke="#3b82f6" stroke-width="6" />
      <line x1="122" y1="124" x2="180" y2="124" stroke="#ef4444" stroke-width="6" />
      <text x="122" y="119" text-anchor="middle" font-size="9.5" font-weight="bold" fill="#0f172a">T = A</text>

      <line x1="72" y1="158" x2="122" y2="158" stroke="#f59e0b" stroke-width="6" />
      <line x1="122" y1="158" x2="172" y2="158" stroke="#10b981" stroke-width="6" />
      <text x="122" y="153" text-anchor="middle" font-size="9.5" font-weight="bold" fill="#0f172a">G ≡ C</text>

      <!-- สายแกนน้ำตาล-ฟอสเฟต (Sugar-Phosphate Backbone) -->
      <path d="M 52 38 C 85 75, 35 125, 78 175" fill="none" stroke="#1d4ed8" stroke-width="5" stroke-linecap="round" />
      <path d="M 192 38 C 160 75, 210 125, 166 175" fill="none" stroke="#7e22ce" stroke-width="5" stroke-linecap="round" />
    </g>

    <!-- ตารางพันเนตต์ (Punnett Square: Tt x Tt) ด้านขวา -->
    <g transform="translate(302, 48)" filter="url(#stdShadow)">
      <rect x="0" y="0" width="245" height="190" rx="10" fill="#f8fafc" stroke="#cbd5e1" />
      <text x="122" y="22" text-anchor="middle" font-size="11.5" font-weight="bold" fill="#047857">กฎของเมนเดล (ผสมพันธุ์ Tt × Tt)</text>

      <!-- ตาราง 2x2 -->
      <rect x="65" y="54" width="58" height="42" fill="#dcfce7" stroke="#15803d" stroke-width="1.5" />
      <text x="94" y="80" text-anchor="middle" font-size="14" font-weight="bold" fill="#14532d">TT</text>

      <rect x="123" y="54" width="58" height="42" fill="#dcfce7" stroke="#15803d" stroke-width="1.5" />
      <text x="152" y="80" text-anchor="middle" font-size="14" font-weight="bold" fill="#14532d">Tt</text>

      <rect x="65" y="96" width="58" height="42" fill="#dcfce7" stroke="#15803d" stroke-width="1.5" />
      <text x="94" y="122" text-anchor="middle" font-size="14" font-weight="bold" fill="#14532d">Tt</text>

      <rect x="123" y="96" width="58" height="42" fill="#fef3c7" stroke="#d97706" stroke-width="1.5" />
      <text x="152" y="122" text-anchor="middle" font-size="14" font-weight="bold" fill="#92400e">tt</text>

      <!-- เซลล์สืบพันธุ์พ่อ-แม่ -->
      <text x="94" y="46" text-anchor="middle" font-size="13" font-weight="bold" fill="#0f172a">T</text>
      <text x="152" y="46" text-anchor="middle" font-size="13" font-weight="bold" fill="#0f172a">t</text>
      <text x="48" y="80" text-anchor="middle" font-size="13" font-weight="bold" fill="#0f172a">T</text>
      <text x="48" y="122" text-anchor="middle" font-size="13" font-weight="bold" fill="#0f172a">t</text>

      <text x="122" y="158" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#0f172a">อัตราส่วนจีโนไทป์ TT : Tt : tt = 1 : 2 : 1</text>
      <text x="122" y="175" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#15803d">อัตราส่วนฟีโนไทป์ เด่น : ด้อย = 3 : 1</text>
    </g>
  `;
  return svgWrap(content, 580, 252);
}

/**
 * 24. กลศาสตร์ฟิสิกส์: การแตกแรงบนพื้นเอียงและกฎการเคลื่อนที่ของนิวตัน (Inclined Plane Free-Body Diagram)
 */
export function createForceAndMotionPhysicsSvg(): string {
  const content = `
    <rect width="100%" height="100%" fill="#ffffff" />
    <rect x="80" y="8" width="400" height="25" rx="12" fill="url(#hdrGrad)" stroke="#cbd5e1" />
    <text x="280" y="25" text-anchor="middle" class="label">แผนภาพวัตถุอิสระ (Free-Body Diagram) บนพื้นเอียง และกฎของนิวตัน</text>

    <!-- พื้นเอียงสามเหลี่ยมมุม θ = 30° -->
    <polygon points="45,215 345,215 345,75" fill="#f1f5f9" stroke="#334155" stroke-width="2.5" />
    <path d="M 105 215 A 60 60 0 0 0 98 190" fill="none" stroke="#0f172a" stroke-width="1.8" />
    <text x="115" y="206" font-size="13" font-weight="bold" fill="#0f172a">θ</text>

    <!-- มวล m บนพื้นเอียง หมุนตามมุมพื้นเอียง (-25 deg) -->
    <g transform="translate(205, 140) rotate(-25)">
      <rect x="-28" y="-44" width="56" height="44" rx="4" fill="url(#blue3D)" stroke="#1e3a8a" stroke-width="2" filter="url(#stdShadow)" />
      <text x="0" y="-18" text-anchor="middle" font-size="14" font-weight="bold" fill="#ffffff">m</text>

      <!-- แรงแนวฉาก N -->
      <line x1="0" y1="-44" x2="0" y2="-96" stroke="#059669" stroke-width="3" />
      <polygon points="0,-102 -5,-92 5,-92" fill="#059669" />
      <text x="12" y="-88" font-size="12" font-weight="bold" fill="#047857">N</text>

      <!-- แรงเสียดทาน f (ต้านการไถลลง) -->
      <line x1="28" y1="-22" x2="84" y2="-22" stroke="#d97706" stroke-width="3" />
      <polygon points="90,-22 80,-27 80,-17" fill="#d97706" />
      <text x="68" y="-30" font-size="11.5" font-weight="bold" fill="#b45309">f (แรงเสียดทาน)</text>

      <!-- แรงดึงลงตามแนวพื้นเอียง mg sin θ -->
      <line x1="-28" y1="-22" x2="-92" y2="-22" stroke="#dc2626" stroke-width="3" />
      <polygon points="-98,-22 -88,-27 -88,-17" fill="#dc2626" />
      <text x="-75" y="-32" text-anchor="middle" font-size="11.5" font-weight="bold" fill="#dc2626">mg sin θ</text>

      <!-- แรงกดตั้งฉากพื้นเอียง mg cos θ -->
      <line x1="0" y1="0" x2="0" y2="54" stroke="#64748b" stroke-width="2.2" stroke-dasharray="4,2" />
      <polygon points="0,60 -4,52 4,52" fill="#64748b" />
      <text x="28" y="50" font-size="11" font-weight="bold" fill="#334155">mg cos θ</text>
    </g>

    <!-- แรงโน้มถ่วง mg ดิ่งลงสู่พื้นโลก -->
    <line x1="196" y1="120" x2="196" y2="205" stroke="#1e293b" stroke-width="2.5" />
    <polygon points="196,212 191,202 201,202" fill="#1e293b" />
    <text x="180" y="198" text-anchor="end" font-size="12" font-weight="bold" fill="#0f172a">W = mg</text>

    <!-- กรอบสมการกฎของนิวตันทางขวา -->
    <g transform="translate(368, 46)">
      <rect x="0" y="0" width="176" height="172" rx="10" fill="#f8fafc" stroke="#cbd5e1" />
      <rect x="0" y="0" width="176" height="28" rx="10" fill="#0f172a" />
      <text x="88" y="18" text-anchor="middle" font-size="11" font-weight="bold" fill="#ffffff">สรุปสมการการเคลื่อนที่</text>
      <text x="12" y="46" font-size="11" font-weight="bold" fill="#dc2626">1. กฎข้อที่ 2 ของนิวตัน:</text>
      <text x="20" y="64" font-size="12" font-weight="bold" fill="#0f172a">ΣF = m · a</text>
      <text x="12" y="88" font-size="10.5" font-weight="bold" fill="#1d4ed8">2. แนวขนานพื้นเอียง:</text>
      <text x="16" y="104" font-size="10.5" fill="#334155">mg sin θ - f = ma</text>
      <text x="12" y="126" font-size="10.5" font-weight="bold" fill="#047857">3. แนวตั้งฉากพื้นเอียง:</text>
      <text x="16" y="142" font-size="10.5" fill="#334155">N = mg cos θ</text>
      <text x="16" y="158" font-size="10.5" fill="#b45309">แรงเสียดทาน: f = μN</text>
    </g>
  `;
  return svgWrap(content, 560, 235);
}

/**
 * 25. ฟิสิกส์คลื่นและแสง: องค์ประกอบของคลื่นตามขวาง (Transverse Wave: λ, A, สันคลื่น, ท้องคลื่น)
 */
export function createWaveAndOpticsSvg(): string {
  const content = `
    <rect width="100%" height="100%" fill="#ffffff" />
    <rect x="80" y="8" width="400" height="25" rx="12" fill="url(#hdrGrad)" stroke="#cbd5e1" />
    <text x="280" y="25" text-anchor="middle" class="label">องค์ประกอบของคลื่นกลตามขวาง (Transverse Wave: ความยาวคลื่น λ และแอมพลิจูด A)</text>

    <!-- แกนสมดุลและการกระจัด -->
    <line x1="45" y1="128" x2="395" y2="128" stroke="#334155" stroke-width="2" />
    <line x1="45" y1="52" x2="45" y2="204" stroke="#334155" stroke-width="2" />
    <text x="398" y="132" font-size="10.5" font-weight="bold" fill="#334155">ระยะทาง (x)</text>
    <text x="45" y="44" text-anchor="middle" font-size="10" font-weight="bold" fill="#334155">การกระจัด (y)</text>

    <!-- ลูกคลื่นไซน์ 2 ลูกคลื่น (ความยาวคลื่นละ 160px) -->
    <path d="M 45 128 Q 85 48, 125 128 T 205 128 T 285 128 T 365 128" fill="none" stroke="#2563eb" stroke-width="3.5" />

    <!-- สันคลื่น (Crest) และ ท้องคลื่น (Trough) -->
    <circle cx="85" cy="88" r="4.5" fill="#dc2626" />
    <text x="85" y="75" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#dc2626">สันคลื่น (Crest)</text>

    <circle cx="165" cy="168" r="4.5" fill="#059669" />
    <text x="165" y="188" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#047857">ท้องคลื่น (Trough)</text>

    <!-- แอมพลิจูด (A) -->
    <line x1="245" y1="128" x2="245" y2="88" stroke="#dc2626" stroke-width="2" stroke-dasharray="3,2" />
    <text x="252" y="112" font-size="11" font-weight="bold" fill="#dc2626">แอมพลิจูด (A)</text>

    <!-- ความยาวคลื่น (Wavelength λ) ระหว่างสันคลื่นถึงสันคลื่น -->
    <line x1="85" y1="56" x2="245" y2="56" stroke="#7e22ce" stroke-width="2" />
    <line x1="85" y1="50" x2="85" y2="62" stroke="#7e22ce" stroke-width="2" />
    <line x1="245" y1="50" x2="245" y2="62" stroke="#7e22ce" stroke-width="2" />
    <rect x="122" y="44" width="86" height="20" rx="5" fill="#7e22ce" />
    <text x="165" y="58" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#ffffff">ความยาวคลื่น (λ)</text>

    <!-- กรอบสูตรคำนวณคลื่นทางขวา -->
    <g transform="translate(420, 48)">
      <rect x="0" y="0" width="125" height="162" rx="8" fill="#f8fafc" stroke="#cbd5e1" />
      <text x="62" y="20" text-anchor="middle" font-size="11" font-weight="bold" fill="#0f172a">สมการอัตราเร็วคลื่น</text>
      <rect x="12" y="28" width="101" height="26" rx="5" fill="#0f172a" />
      <text x="62" y="45" text-anchor="middle" font-size="13" font-weight="bold" fill="#38bdf8">v = f · λ = λ / T</text>
      <text x="10" y="72" font-size="10" fill="#334155">• v : อัตราเร็ว (m/s)</text>
      <text x="10" y="90" font-size="10" fill="#334155">• f : ความถี่ (Hz)</text>
      <text x="10" y="108" font-size="10" fill="#334155">• λ : ความยาวคลื่น (m)</text>
      <text x="10" y="126" font-size="10" fill="#334155">• T : คาบ (s) = 1/f</text>
      <text x="10" y="146" font-size="9.5" font-weight="bold" fill="#dc2626">เฟสตรงกันห่างกัน = λ</text>
    </g>
  `;
  return svgWrap(content, 560, 224);
}

/**
 * 26. เคมี: แบบจำลองอะตอม การจัดเรียงอิเล็กตรอน และสัญลักษณ์นิวเคลียร์ (Atomic Structure & Nuclear Symbol)
 */
export function createAtomicStructureSvg(): string {
  const content = `
    <rect width="100%" height="100%" fill="#ffffff" />
    <rect x="80" y="8" width="400" height="25" rx="12" fill="url(#hdrGrad)" stroke="#cbd5e1" />
    <text x="280" y="25" text-anchor="middle" class="label">โครงสร้างอะตอม การจัดเรียงอิเล็กตรอน และสัญลักษณ์นิวเคลียร์ (²³₁₁Na)</text>

    <!-- แบบจำลองอะตอมของโบร์ (Bohr Model: 2, 8, 1) -->
    <g transform="translate(155, 134)">
      <!-- ระดับพลังงาน n=1 (K), n=2 (L), n=3 (M) -->
      <circle cx="0" cy="0" r="82" fill="none" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="4,3" />
      <circle cx="0" cy="0" r="56" fill="none" stroke="#64748b" stroke-width="1.5" />
      <circle cx="0" cy="0" r="32" fill="none" stroke="#475569" stroke-width="1.5" />

      <!-- นิวเคลียสตรงกลาง (11p+ , 12n) -->
      <circle cx="0" cy="0" r="18" fill="url(#rose3D)" stroke="#881337" stroke-width="1.8" />
      <text x="0" y="-2" text-anchor="middle" font-size="9" font-weight="bold" fill="#ffffff">11p⁺</text>
      <text x="0" y="9" text-anchor="middle" font-size="9" font-weight="bold" fill="#ffe4e6">12n</text>

      <!-- ชั้น K (2e-) -->
      <circle cx="0" cy="-32" r="4.5" fill="#2563eb" stroke="#ffffff" stroke-width="1" />
      <circle cx="0" cy="32" r="4.5" fill="#2563eb" stroke="#ffffff" stroke-width="1" />

      <!-- ชั้น L (8e-) -->
      <circle cx="0" cy="-56" r="4.5" fill="#059669" stroke="#ffffff" stroke-width="1" />
      <circle cx="0" cy="56" r="4.5" fill="#059669" stroke="#ffffff" stroke-width="1" />
      <circle cx="-56" cy="0" r="4.5" fill="#059669" stroke="#ffffff" stroke-width="1" />
      <circle cx="56" cy="0" r="4.5" fill="#059669" stroke="#ffffff" stroke-width="1" />
      <circle cx="-40" cy="-40" r="4.5" fill="#059669" stroke="#ffffff" stroke-width="1" />
      <circle cx="40" cy="-40" r="4.5" fill="#059669" stroke="#ffffff" stroke-width="1" />
      <circle cx="-40" cy="40" r="4.5" fill="#059669" stroke="#ffffff" stroke-width="1" />
      <circle cx="40" cy="40" r="4.5" fill="#059669" stroke="#ffffff" stroke-width="1" />

      <!-- ชั้นนอกสุด M (เวเลนซ์อิเล็กตรอน = 1e-) -->
      <circle cx="82" cy="0" r="6" fill="#dc2626" stroke="#ffffff" stroke-width="1.5" />
      <text x="94" y="4" font-size="10" font-weight="bold" fill="#dc2626">เวเลนซ์ e⁻ = 1 (หมู่ IA คาบ 3)</text>
    </g>

    <!-- กรอบสัญลักษณ์นิวเคลียร์ทางขวา -->
    <g transform="translate(325, 46)" filter="url(#stdShadow)">
      <rect x="0" y="0" width="215" height="175" rx="10" fill="#f8fafc" stroke="#cbd5e1" />
      <rect x="0" y="0" width="215" height="28" rx="10" fill="#0f172a" />
      <text x="107" y="18" text-anchor="middle" font-size="11" font-weight="bold" fill="#ffffff">สัญลักษณ์นิวเคลียร์ (Nuclear Symbol)</text>

      <!-- สัญลักษณ์ A_Z X -->
      <text x="48" y="62" font-size="16" font-weight="bold" fill="#dc2626">A (23)</text>
      <text x="48" y="92" font-size="16" font-weight="bold" fill="#2563eb">Z (11)</text>
      <text x="108" y="82" font-size="34" font-weight="bold" fill="#0f172a">Na</text>

      <line x1="12" y1="104" x2="203" y2="104" stroke="#cbd5e1" />
      <text x="14" y="122" font-size="10.5" fill="#1e293b">• <tspan font-weight="bold" fill="#2563eb">Z (เลขอะตอม)</tspan> = โปรตอน (p⁺) = 11</text>
      <text x="14" y="140" font-size="10.5" fill="#1e293b">• <tspan font-weight="bold" fill="#dc2626">A (เลขมวล)</tspan> = p⁺ + n = 23</text>
      <text x="14" y="158" font-size="10.5" font-weight="bold" fill="#047857">• นิวตรอน (n) = A - Z = 23 - 11 = 12</text>
    </g>
  `;
  return svgWrap(content, 560, 236);
}

/**
 * 27. โลกและดาราศาสตร์: โครงสร้างภายในโลก 3 มิติตัดขวาง (3D Cutaway Earth Layers)
 */
export function createEarthStructureAndTectonicsSvg(): string {
  const content = `
    <rect width="100%" height="100%" fill="#ffffff" />
    <rect x="85" y="8" width="390" height="25" rx="12" fill="url(#hdrGrad)" stroke="#cbd5e1" />
    <text x="280" y="25" text-anchor="middle" class="label">โครงสร้างภายในโลกแบ่งตามองค์ประกอบทางเคมีและกายภาพ (Earth Layers)</text>

    <!-- ทรงกลมโลกผ่าซีก 3D -->
    <g transform="translate(155, 134)" filter="url(#stdShadow)">
      <!-- 1. เปลือกโลก (Crust) -->
      <circle cx="0" cy="0" r="84" fill="#2563eb" stroke="#1e3a8a" stroke-width="4" />
      <path d="M -60 -45 Q -30 -60, 0 -40 T 50 -20 L 30 30 Q -20 40, -60 -45 Z" fill="#16a34a" opacity="0.85" />

      <!-- รอยผ่าแสดงชั้นภายในโลก -->
      <!-- 2. เนื้อโลก (Mantle) -->
      <path d="M 0 0 L 84 0 A 84 84 0 0 1 0 84 Z" fill="#ea580c" stroke="#7c2d12" stroke-width="1.5" />
      <path d="M 0 0 L 0 -84 A 84 84 0 0 1 84 0 Z" fill="#f97316" stroke="#7c2d12" stroke-width="1.5" />

      <!-- 3. แก่นโลกชั้นนอก (Outer Core - ของเหลวเหล็ก-นิกเกิล) -->
      <path d="M 0 0 L 0 -52 A 52 52 0 0 1 52 0 A 52 52 0 0 1 0 52 Z" fill="#facc15" stroke="#b45309" stroke-width="1.5" />

      <!-- 4. แก่นโลกชั้นใน (Inner Core - ของแข็งความดันสูง) -->
      <circle cx="10" cy="0" r="22" fill="#fef9c3" stroke="#ca8a04" stroke-width="2" />
    </g>

    <!-- ป้ายชี้โครงสร้างโลกทั้ง 4 ชั้นทางขวา -->
    <g transform="translate(275, 46)">
      <rect x="0" y="0" width="265" height="176" rx="10" fill="#f8fafc" stroke="#cbd5e1" />
      <text x="132" y="20" text-anchor="middle" font-size="11.5" font-weight="bold" fill="#0f172a">ชั้นโครงสร้างโลก (จากผิวนอกสู่ใจกลาง)</text>
      <line x1="12" y1="27" x2="253" y2="27" stroke="#e2e8f0" />

      <rect x="12" y="36" width="18" height="18" rx="4" fill="#1d4ed8" />
      <text x="21" y="49" text-anchor="middle" class="badge-txt">1</text>
      <text x="38" y="49" font-size="10.5" font-weight="bold" fill="#0f172a">เปลือกโลก (Crust): หนา 5–70 กม. (ไซอัล/ไซมา)</text>

      <rect x="12" y="68" width="18" height="18" rx="4" fill="#ea580c" />
      <text x="21" y="81" text-anchor="middle" class="badge-txt">2</text>
      <text x="38" y="81" font-size="10.5" font-weight="bold" fill="#9a3412">เนื้อโลก (Mantle): หนา ~2,900 กม. (มีแมกมา)</text>

      <rect x="12" y="100" width="18" height="18" rx="4" fill="#d97706" />
      <text x="21" y="113" text-anchor="middle" class="badge-txt">3</text>
      <text x="38" y="113" font-size="10.5" font-weight="bold" fill="#b45309">แก่นโลกชั้นนอก (Outer Core): ของเหลว Fe-Ni</text>

      <rect x="12" y="132" width="18" height="18" rx="4" fill="#ca8a04" />
      <text x="21" y="145" text-anchor="middle" class="badge-txt">4</text>
      <text x="38" y="145" font-size="10.5" font-weight="bold" fill="#854d0e">แก่นโลกชั้นใน (Inner Core): ของแข็ง Fe-Ni</text>
      <text x="38" y="162" font-size="9.5" fill="#475569">อุณหภูมิสูง ~5,000–6,000 °C และเกิดสนามแม่เหล็กโลก</text>
    </g>
  `;
  return svgWrap(content, 560, 236);
}

/**
 * 28. คณิตศาสตร์: รูปเรขาคณิตสามมิติ พื้นที่ผิวและปริมาตร (3D Isometric Solids: ทรงกระบอก, กรวย, ปริซึม, พีระมิด)
 */
export function createGeometry3DSolidsSvg(): string {
  const content = `
    <rect width="100%" height="100%" fill="#ffffff" />
    <rect x="85" y="8" width="390" height="25" rx="12" fill="url(#hdrGrad)" stroke="#cbd5e1" />
    <text x="280" y="25" text-anchor="middle" class="label">รูปเรขาคณิตสามมิติและสูตรการหาปริมาตร (3D Geometric Solids)</text>

    <!-- 1. ทรงกระบอก (Cylinder) -->
    <g transform="translate(35, 52)" filter="url(#stdShadow)">
      <rect x="15" y="22" width="76" height="82" fill="#dbeafe" stroke="#1d4ed8" stroke-width="1.8" />
      <ellipse cx="53" cy="22" rx="38" ry="12" fill="#93c5fd" stroke="#1d4ed8" stroke-width="1.8" />
      <ellipse cx="53" cy="104" rx="38" ry="12" fill="#bfdbfe" stroke="#1d4ed8" stroke-width="1.8" />
      <line x1="53" y1="22" x2="91" y2="22" stroke="#dc2626" stroke-width="2" />
      <text x="72" y="18" text-anchor="middle" font-size="10" font-weight="bold" fill="#dc2626">r</text>
      <line x1="53" y1="22" x2="53" y2="104" stroke="#0f172a" stroke-width="1.5" stroke-dasharray="3,2" />
      <text x="45" y="68" text-anchor="end" font-size="10" font-weight="bold" fill="#0f172a">h</text>
      <text x="53" y="135" text-anchor="middle" font-size="11.5" font-weight="bold" fill="#1e3a8a">1. ทรงกระบอก</text>
      <text x="53" y="151" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#dc2626">V = πr²h</text>
    </g>

    <!-- 2. กรวย (Cone) -->
    <g transform="translate(175, 52)" filter="url(#stdShadow)">
      <polygon points="53,12 15,104 91,104" fill="#dcfce7" stroke="#15803d" stroke-width="1.8" />
      <ellipse cx="53" cy="104" rx="38" ry="12" fill="#86efac" stroke="#15803d" stroke-width="1.8" />
      <line x1="53" y1="12" x2="53" y2="104" stroke="#0f172a" stroke-width="1.5" stroke-dasharray="3,2" />
      <line x1="53" y1="104" x2="91" y2="104" stroke="#dc2626" stroke-width="2" />
      <text x="72" y="100" text-anchor="middle" font-size="10" font-weight="bold" fill="#dc2626">r</text>
      <text x="46" y="68" text-anchor="end" font-size="10" font-weight="bold" fill="#0f172a">h</text>
      <text x="53" y="135" text-anchor="middle" font-size="11.5" font-weight="bold" fill="#14532d">2. กรวย</text>
      <text x="53" y="151" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#dc2626">V = (1/3)πr²h</text>
    </g>

    <!-- 3. ปริซึม (Prism) -->
    <g transform="translate(310, 52)" filter="url(#stdShadow)">
      <rect x="12" y="34" width="64" height="72" fill="#fef3c7" stroke="#d97706" stroke-width="1.8" />
      <polygon points="12,34 34,16 98,16 76,34" fill="#fde68a" stroke="#d97706" stroke-width="1.8" />
      <polygon points="76,34 98,16 98,88 76,106" fill="#fcd34d" stroke="#d97706" stroke-width="1.8" />
      <text x="55" y="135" text-anchor="middle" font-size="11.5" font-weight="bold" fill="#92400e">3. ปริซึม</text>
      <text x="55" y="151" text-anchor="middle" font-size="10" font-weight="bold" fill="#dc2626">V = พื้นที่ฐาน × สูง</text>
    </g>

    <!-- 4. พีระมิด (Pyramid) -->
    <g transform="translate(435, 52)" filter="url(#stdShadow)">
      <polygon points="50,12 12,102 68,108" fill="#f3e8ff" stroke="#7e22ce" stroke-width="1.8" />
      <polygon points="50,12 68,108 94,88" fill="#e9d5ff" stroke="#7e22ce" stroke-width="1.8" />
      <line x1="50" y1="12" x2="50" y2="98" stroke="#dc2626" stroke-width="1.5" stroke-dasharray="3,2" />
      <text x="52" y="135" text-anchor="middle" font-size="11.5" font-weight="bold" fill="#6b21a8">4. พีระมิด</text>
      <text x="52" y="151" text-anchor="middle" font-size="10" font-weight="bold" fill="#dc2626">V = (1/3)×ฐาน×สูง</text>
    </g>
  `;
  return svgWrap(content, 560, 222);
}

/**
 * 29. คณิตศาสตร์สถิติ: แผนภาพกล่อง (Box Plot: Min, Q1, Q2/มัธยฐาน, Q3, Max และ IQR)
 */
export function createStatisticsBoxplotAndNormalSvg(): string {
  const content = `
    <rect width="100%" height="100%" fill="#ffffff" />
    <rect x="85" y="8" width="390" height="25" rx="12" fill="url(#hdrGrad)" stroke="#cbd5e1" />
    <text x="280" y="25" text-anchor="middle" class="label">แผนภาพกล่อง (Box Plot) และการแบ่งข้อมูลออกเป็น 4 ส่วนเท่าๆ กัน (ส่วนละ 25%)</text>

    <!-- เส้นจำนวนด้านล่าง (0 ถึง 100) -->
    <line x1="50" y1="168" x2="510" y2="168" stroke="#0f172a" stroke-width="2" />
    <line x1="80" y1="162" x2="80" y2="174" stroke="#0f172a" stroke-width="2" />
    <text x="80" y="188" text-anchor="middle" font-size="11" font-weight="bold" fill="#334155">15 (Min)</text>

    <line x1="175" y1="162" x2="175" y2="174" stroke="#1d4ed8" stroke-width="2" />
    <text x="175" y="188" text-anchor="middle" font-size="11" font-weight="bold" fill="#1d4ed8">35 (Q₁)</text>

    <line x1="270" y1="162" x2="270" y2="174" stroke="#dc2626" stroke-width="2" />
    <text x="270" y="188" text-anchor="middle" font-size="11" font-weight="bold" fill="#dc2626">55 (Q₂ / มัธยฐาน)</text>

    <line x1="385" y1="162" x2="385" y2="174" stroke="#15803d" stroke-width="2" />
    <text x="385" y="188" text-anchor="middle" font-size="11" font-weight="bold" fill="#15803d">78 (Q₃)</text>

    <line x1="480" y1="162" x2="480" y2="174" stroke="#0f172a" stroke-width="2" />
    <text x="480" y="188" text-anchor="middle" font-size="11" font-weight="bold" fill="#334155">95 (Max)</text>

    <!-- ตัวแผนภาพกล่อง (Box & Whiskers) -->
    <g filter="url(#stdShadow)">
      <!-- หนวดซ้ายและขวา -->
      <line x1="80" y1="102" x2="175" y2="102" stroke="#334155" stroke-width="2.5" />
      <line x1="80" y1="84" x2="80" y2="120" stroke="#0f172a" stroke-width="2.5" />
      <line x1="385" y1="102" x2="480" y2="102" stroke="#334155" stroke-width="2.5" />
      <line x1="480" y1="84" x2="480" y2="120" stroke="#0f172a" stroke-width="2.5" />

      <!-- กล่อง Q1 ถึง Q2 และ Q2 ถึง Q3 -->
      <rect x="175" y="68" width="95" height="68" fill="#dbeafe" stroke="#1d4ed8" stroke-width="2.2" />
      <rect x="270" y="68" width="115" height="68" fill="#dcfce7" stroke="#15803d" stroke-width="2.2" />
      <!-- เส้นมัธยฐาน Q2 -->
      <line x1="270" y1="64" x2="270" y2="140" stroke="#dc2626" stroke-width="3.5" />
    </g>

    <!-- สัดส่วนข้อมูลช่องละ 25% -->
    <text x="127" y="94" text-anchor="middle" font-size="11" font-weight="bold" fill="#475569">25%</text>
    <text x="222" y="106" text-anchor="middle" font-size="12" font-weight="bold" fill="#1e3a8a">25%</text>
    <text x="327" y="106" text-anchor="middle" font-size="12" font-weight="bold" fill="#14532d">25%</text>
    <text x="432" y="94" text-anchor="middle" font-size="11" font-weight="bold" fill="#475569">25%</text>

    <!-- ปีกกา IQR ด้านบน -->
    <line x1="175" y1="50" x2="385" y2="50" stroke="#0f172a" stroke-width="1.8" />
    <rect x="215" y="39" width="130" height="20" rx="5" fill="#0f172a" />
    <text x="280" y="53" text-anchor="middle" font-size="10" font-weight="bold" fill="#ffffff">พิสัยควอร์ไทล์ IQR = Q₃ - Q₁</text>
  `;
  return svgWrap(content, 560, 208);
}

/**
 * 30. ภาษาไทย: ผังฉันทลักษณ์คำประพันธ์ไทยและการโยงสัมผัส (กาพย์ยานี 11 และ กลอนสุภาพ 8)
 */
export function createThaiPoeticsChantaklakSvg(): string {
  let circlesLeft = '';
  let circlesRight = '';
  // วรรคหน้า 5 คำ, วรรคหลัง 6 คำ (2 บาท = 4 วรรค)
  for (let row = 0; row < 2; row++) {
    const cy = 78 + row * 56;
    for (let i = 0; i < 5; i++) {
      const cx = 55 + i * 32;
      const isRhyme = (row === 0 && i === 4) || (row === 1 && i === 4);
      circlesLeft += `<circle cx="${cx}" cy="${cy}" r="10" fill="${isRhyme ? '#fde047' : '#eff6ff'}" stroke="${isRhyme ? '#ca8a04' : '#2563eb'}" stroke-width="1.8" />`;
    }
    for (let i = 0; i < 6; i++) {
      const cx = 255 + i * 32;
      const isRhyme = (row === 0 && (i === 2 || i === 5));
      circlesRight += `<circle cx="${cx}" cy="${cy}" r="10" fill="${isRhyme ? '#fde047' : '#f0fdf4'}" stroke="${isRhyme ? '#ca8a04' : '#16a34a'}" stroke-width="1.8" />`;
    }
  }

  const content = `
    <rect width="100%" height="100%" fill="#ffffff" />
    <rect x="85" y="8" width="390" height="25" rx="12" fill="url(#hdrGrad)" stroke="#cbd5e1" />
    <text x="280" y="25" text-anchor="middle" class="label">แผนผังฉันทลักษณ์และการบังคับสัมผัส: กาพย์ยานี ๑๑ (หน้า ๕ หลัง ๖)</text>

    <text x="119" y="54" text-anchor="middle" font-size="11.5" font-weight="bold" fill="#1d4ed8">วรรคหน้า (๕ คำ)</text>
    <text x="335" y="54" text-anchor="middle" font-size="11.5" font-weight="bold" fill="#15803d">วรรคหลัง (๖ คำ)</text>

    ${circlesLeft}
    ${circlesRight}

    <!-- เส้นโยงสัมผัสระหว่างวรรคที่ 1 (คำที่ 5: x=183, y=78) ไปวรรคที่ 2 (คำที่ 3: x=319, y=78) -->
    <path d="M 183 68 Q 251 42, 319 68" fill="none" stroke="#dc2626" stroke-width="2.2" />
    <!-- เส้นโยงสัมผัสระหว่างวรรคที่ 2 (คำที่ 6: x=415, y=78) ไปวรรคที่ 3 (คำที่ 5: x=183, y=134) -->
    <path d="M 415 88 C 415 112, 183 102, 183 124" fill="none" stroke="#dc2626" stroke-width="2.2" />

    <!-- กรอบอธิบายหลักฉันทลักษณ์ทางขวา -->
    <g transform="translate(450, 48)">
      <rect x="0" y="0" width="96" height="120" rx="8" fill="#f8fafc" stroke="#cbd5e1" />
      <text x="48" y="22" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#0f172a">สรุปฉันทลักษณ์</text>
      <text x="8" y="44" font-size="9.5" fill="#334155">• 1 บาท = 2 วรรค</text>
      <text x="8" y="62" font-size="9.5" fill="#334155">• หน้า 5 + หลัง 6</text>
      <text x="8" y="80" font-size="9.5" fill="#334155">  รวมเป็น 11 คำ</text>
      <text x="8" y="98" font-size="9.5" font-weight="bold" fill="#dc2626">• บังคับสัมผัสสระ</text>
      <text x="8" y="112" font-size="9" fill="#475569">  ตามเส้นสีแดง</text>
    </g>

    <text x="280" y="190" text-anchor="middle" class="sublabel">ตัวอย่าง: "เรื่อยเรื่อยมาเรียงเรียง นกบินเฉียงไปทั้งหมู่ ตัวเดียวมาพลัดคู่ เหมือนพี่อยู่คนเดียวดาย"</text>
  `;
  return svgWrap(content, 560, 206);
}

/**
 * 31. ภาษาอังกฤษ: เส้นเวลาโครงสร้าง 12 Tenses (English Tenses Timeline Infographic)
 */
export function createEnglishTensesTimelineSvg(): string {
  const content = `
    <rect width="100%" height="100%" fill="#ffffff" />
    <rect x="85" y="8" width="390" height="25" rx="12" fill="url(#hdrGrad)" stroke="#cbd5e1" />
    <text x="280" y="25" text-anchor="middle" class="label">English Grammar Timeline: Past · Present · Future Tenses</text>

    <!-- แกนเส้นเวลาหลัก -->
    <line x1="40" y1="88" x2="520" y2="88" stroke="#0f172a" stroke-width="3" />
    <polygon points="526,88 514,82 514,94" fill="#0f172a" />

    <!-- จุด PAST, PRESENT (NOW), FUTURE -->
    <circle cx="120" cy="88" r="9" fill="#2563eb" stroke="#ffffff" stroke-width="2" />
    <text x="120" y="68" text-anchor="middle" font-size="12" font-weight="bold" fill="#1d4ed8">PAST (อดีต)</text>

    <circle cx="280" cy="88" r="10" fill="#dc2626" stroke="#ffffff" stroke-width="2" />
    <text x="280" y="68" text-anchor="middle" font-size="12" font-weight="bold" fill="#dc2626">NOW / PRESENT</text>

    <circle cx="440" cy="88" r="9" fill="#059669" stroke="#ffffff" stroke-width="2" />
    <text x="440" y="68" text-anchor="middle" font-size="12" font-weight="bold" fill="#047857">FUTURE (อนาคต)</text>

    <!-- การ์ดโครงสร้าง 3 ช่วงเวลา -->
    <g filter="url(#stdShadow)">
      <rect x="30" y="108" width="160" height="92" rx="8" fill="#eff6ff" stroke="#3b82f6" stroke-width="1.5" />
      <text x="110" y="128" text-anchor="middle" font-size="11" font-weight="bold" fill="#1e3a8a">Past Simple: S + V₂</text>
      <text x="110" y="146" text-anchor="middle" font-size="9.5" fill="#334155">(yesterday, last week, ago)</text>
      <text x="110" y="166" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#1d4ed8">Past Cont: S + was/were + V.ing</text>
      <text x="110" y="184" text-anchor="middle" font-size="9.5" fill="#334155">Past Perf: S + had + V₃</text>

      <rect x="200" y="108" width="160" height="92" rx="8" fill="#fff1f2" stroke="#e11d48" stroke-width="1.5" />
      <text x="280" y="128" text-anchor="middle" font-size="11" font-weight="bold" fill="#881337">Present Simple: S + V₁(s/es)</text>
      <text x="280" y="146" text-anchor="middle" font-size="9.5" fill="#334155">(always, usually, every day)</text>
      <text x="280" y="166" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#be123c">Present Cont: S + is/am/are + V.ing</text>
      <text x="280" y="184" text-anchor="middle" font-size="9.5" fill="#334155">Present Perf: S + have/has + V₃</text>

      <rect x="370" y="108" width="160" height="92" rx="8" fill="#ecfdf5" stroke="#10b981" stroke-width="1.5" />
      <text x="450" y="128" text-anchor="middle" font-size="11" font-weight="bold" fill="#065f46">Future Simple: S + will + V.inf</text>
      <text x="450" y="146" text-anchor="middle" font-size="9.5" fill="#334155">(tomorrow, next year, soon)</text>
      <text x="450" y="166" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#047857">Be going to + V.inf (วางแผนไว้)</text>
      <text x="450" y="184" text-anchor="middle" font-size="9.5" fill="#334155">Future Perf: S + will have + V₃</text>
    </g>
  `;
  return svgWrap(content, 560, 214);
}

/**
 * 32. สังคมศึกษา/เศรษฐศาสตร์: กราฟกลไกราคา อุปสงค์ (Demand) อุปทาน (Supply) และจุดดุลยภาพ (Equilibrium)
 */
export function createEconomicsSupplyDemandSvg(): string {
  const content = `
    <rect width="100%" height="100%" fill="#ffffff" />
    <rect x="80" y="8" width="400" height="25" rx="12" fill="url(#hdrGrad)" stroke="#cbd5e1" />
    <text x="280" y="25" text-anchor="middle" class="label">กลไกราคาในระบบเศรษฐกิจ: อุปสงค์ (Demand) อุปทาน (Supply) และดุลยภาพ (E)</text>

    <!-- แกนราคา (P) และปริมาณ (Q) -->
    <line x1="75" y1="45" x2="75" y2="198" stroke="#0f172a" stroke-width="2" />
    <line x1="75" y1="198" x2="315" y2="198" stroke="#0f172a" stroke-width="2" />
    <text x="68" y="46" text-anchor="end" font-size="11" font-weight="bold" fill="#0f172a">ราคา (P)</text>
    <text x="315" y="214" text-anchor="end" font-size="11" font-weight="bold" fill="#0f172a">ปริมาณสินค้า (Q)</text>

    <!-- เส้นอุปสงค์ D (เฉียงลง) และ เส้นอุปทาน S (เฉียงขึ้น) ตัดกันที่ (190, 120) -->
    <line x1="105" y1="58" x2="280" y2="182" stroke="#2563eb" stroke-width="3" />
    <text x="288" y="184" font-size="13" font-weight="bold" fill="#1d4ed8">D (อุปสงค์)</text>

    <line x1="105" y1="182" x2="280" y2="58" stroke="#16a34a" stroke-width="3" />
    <text x="288" y="62" font-size="13" font-weight="bold" fill="#15803d">S (อุปทาน)</text>

    <!-- เส้นประราคาดุลยภาพ Pe และปริมาณดุลยภาพ Qe -->
    <line x1="75" y1="120" x2="192" y2="120" stroke="#dc2626" stroke-width="1.8" stroke-dasharray="4,3" />
    <line x1="192" y1="120" x2="192" y2="198" stroke="#dc2626" stroke-width="1.8" stroke-dasharray="4,3" />
    <text x="65" y="124" text-anchor="end" font-size="11" font-weight="bold" fill="#dc2626">Pₑ</text>
    <text x="192" y="214" text-anchor="middle" font-size="11" font-weight="bold" fill="#dc2626">Qₑ</text>

    <!-- จุดดุลยภาพ E -->
    <circle cx="192" cy="120" r="6" fill="#dc2626" stroke="#ffffff" stroke-width="2" />
    <rect x="202" y="108" width="96" height="22" rx="5" fill="#dc2626" />
    <text x="250" y="123" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#ffffff">จุดดุลยภาพ (E)</text>

    <!-- กรอบสรุปเศรษฐศาสตร์ทางขวา -->
    <g transform="translate(335, 48)">
      <rect x="0" y="0" width="205" height="162" rx="10" fill="#f8fafc" stroke="#cbd5e1" />
      <text x="102" y="20" text-anchor="middle" font-size="11" font-weight="bold" fill="#0f172a">สรุปกฎอุปสงค์และอุปทาน</text>
      <line x1="10" y1="27" x2="195" y2="27" stroke="#e2e8f0" />
      <text x="12" y="46" font-size="10" font-weight="bold" fill="#1d4ed8">• กฎของอุปสงค์ (ผู้ซื้อ - D):</text>
      <text x="18" y="61" font-size="9.5" fill="#334155">ราคาสูง → ซื้อลดลง (แปรผกผัน)</text>
      <text x="12" y="82" font-size="10" font-weight="bold" fill="#15803d">• กฎของอุปทาน (ผู้ขาย - S):</text>
      <text x="18" y="97" font-size="9.5" fill="#334155">ราคาสูง → ขายเพิ่มขึ้น (แปรผันตรง)</text>
      <text x="12" y="118" font-size="10" font-weight="bold" fill="#dc2626">• ถ้าราคาสูงกว่า Pₑ:</text>
      <text x="18" y="133" font-size="9.5" fill="#334155">เกิดอุปทานส่วนเกิน (สินค้าล้นตลาด)</text>
      <text x="12" y="150" font-size="10" font-weight="bold" fill="#b45309">• ถ้าราคาต่ำกว่า Pₑ: สินค้าขาดตลาด</text>
    </g>
  `;
  return svgWrap(content, 560, 226);
}

/**
 * 33. วิทยาการคำนวณ: ผังงานอัลกอริทึมมาตรฐาน (Standard Algorithm Flowchart)
 */
export function createAlgorithmFlowchartSvg(): string {
  const content = `
    <rect width="100%" height="100%" fill="#ffffff" />
    <rect x="85" y="8" width="390" height="25" rx="12" fill="url(#hdrGrad)" stroke="#cbd5e1" />
    <text x="280" y="25" text-anchor="middle" class="label">วิทยาการคำนวณ: ผังงานอัลกอริทึมแบบมีเงื่อนไข (Selection Flowchart)</text>

    <g filter="url(#stdShadow)">
      <!-- 1. เริ่มต้น (Start) -->
      <rect x="135" y="42" width="110" height="28" rx="14" fill="#dcfce7" stroke="#16a34a" stroke-width="2" />
      <text x="190" y="60" text-anchor="middle" font-size="11.5" font-weight="bold" fill="#14532d">เริ่มต้น (Start)</text>
      <line x1="190" y1="70" x2="190" y2="86" stroke="#334155" stroke-width="2" />

      <!-- 2. รับค่าคะแนน (Input) -->
      <polygon points="130,86 260,86 250,114 120,114" fill="#dbeafe" stroke="#2563eb" stroke-width="2" />
      <text x="190" y="104" text-anchor="middle" font-size="11" font-weight="bold" fill="#1e3a8a">รับค่าคะแนน (x)</text>
      <line x1="190" y1="114" x2="190" y2="130" stroke="#334155" stroke-width="2" />

      <!-- 3. เงื่อนไขตัดสินใจ (Decision: x >= 50 ?) -->
      <polygon points="190,130 265,158 190,186 115,158" fill="#fef3c7" stroke="#d97706" stroke-width="2" />
      <text x="190" y="162" text-anchor="middle" font-size="11.5" font-weight="bold" fill="#92400e">x ≥ 50 ?</text>

      <!-- กิ่งจริง (True) ซ้าย และ กิ่งเท็จ (False) ขวา -->
      <path d="M 115 158 L 62 158 L 62 184" fill="none" stroke="#16a34a" stroke-width="2" />
      <text x="88" y="152" text-anchor="middle" font-size="10" font-weight="bold" fill="#15803d">จริง (True)</text>
      <rect x="20" y="184" width="84" height="28" rx="4" fill="#f0fdf4" stroke="#16a34a" stroke-width="1.8" />
      <text x="62" y="202" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#14532d">แสดงผล "ผ่าน"</text>

      <path d="M 265 158 L 318 158 L 318 184" fill="none" stroke="#dc2626" stroke-width="2" />
      <text x="292" y="152" text-anchor="middle" font-size="10" font-weight="bold" fill="#dc2626">เท็จ (False)</text>
      <rect x="276" y="184" width="84" height="28" rx="4" fill="#fff1f2" stroke="#e11d48" stroke-width="1.8" />
      <text x="318" y="202" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#881337">แสดงผล "ไม่ผ่าน"</text>
    </g>

    <!-- กรอบความหมายสัญลักษณ์ผังงานมาตรฐานทางขวา -->
    <g transform="translate(382, 44)">
      <rect x="0" y="0" width="164" height="168" rx="8" fill="#f8fafc" stroke="#cbd5e1" />
      <text x="82" y="20" text-anchor="middle" font-size="11" font-weight="bold" fill="#0f172a">สัญลักษณ์ผังงาน (ISO)</text>
      <line x1="10" y1="27" x2="154" y2="27" stroke="#e2e8f0" />
      <text x="12" y="48" font-size="10" fill="#334155">• แคปซูล: จุดเริ่มต้น / สิ้นสุด</text>
      <text x="12" y="70" font-size="10" fill="#334155">• สี่เหลี่ยมด้านขนาน: รับ/แสดงผล</text>
      <text x="12" y="92" font-size="10" fill="#334155">• สี่เหลี่ยมผืนผ้า: ประมวลผล</text>
      <text x="12" y="114" font-size="10" fill="#334155">• ข้าวหลามตัด: ตัดสินใจเงื่อนไข</text>
      <text x="12" y="136" font-size="10" fill="#334155">• ลูกศร: ทิศทางการทำงาน</text>
    </g>
  `;
  return svgWrap(content, 560, 226);
}
export interface DiagramMetadata {
  id: string;
  titleTh: string;
  titleEn: string;
  subject: 'science' | 'math' | 'social' | 'thai' | 'english' | 'cs';
  subjectLabel: string;
  category: string;
  gradeLevel: string;
  standard: string;
  description: string;
  supportsExamMode: boolean;
  sampleQuestion: string;
}

export const DIAGRAM_CATALOG: DiagramMetadata[] = [
  // Science - Biology
  {
    id: 'cell_diagram',
    titleTh: 'โครงสร้างเซลล์พืช 3 มิติตัดขวาง',
    titleEn: '3D Isometric Cutaway Plant Cell',
    subject: 'science',
    subjectLabel: 'วิทยาศาสตร์',
    category: 'ชีววิทยา',
    gradeLevel: 'ม.1 - ม.6',
    standard: 'มฐ. ว 1.2 ม.1/1 - ม.1/3',
    description: 'ภาพตัดขวาง 3D แสดงผนังเซลล์ เยื่อหุ้มเซลล์ นิวเคลียส แวคิวโอล คลอโรพลาสต์ ไมโทคอนเดรีย RER กอลจิบอดี และพลาสโมเดสมาตา พร้อมเส้นชี้ 10 ตำแหน่ง',
    supportsExamMode: true,
    sampleQuestion: 'จากแผนภาพโครงสร้างเซลล์พืช หมายเลขใดทำหน้าที่สังเคราะห์ด้วยแสง และหมายเลขใดควบคุมการผ่านเข้าออกของสารตามลำดับ?',
  },
  {
    id: 'animal_cell',
    titleTh: 'โครงสร้างเซลล์สัตว์ 3 มิติ',
    titleEn: '3D Cutaway Animal Cell Anatomy',
    subject: 'science',
    subjectLabel: 'วิทยาศาสตร์',
    category: 'ชีววิทยา',
    gradeLevel: 'ม.1 - ม.6',
    standard: 'มฐ. ว 1.2 ม.1/1 - ม.1/2',
    description: 'ภาพเซลล์สัตว์ 3 มิติ แสดงเยื่อหุ้มเซลล์ เซนทริโอล ไลโซโซม นิวเคลียส กอลจิคอมเพล็กซ์ และไมโทคอนเดรีย เน้นออร์แกเนลล์ที่ไม่พบในเซลล์พืช',
    supportsExamMode: true,
    sampleQuestion: 'จากแผนภาพเซลล์สัตว์ ออร์แกเนลล์หมายเลขใดมีบทบาทสำคัญในการแบ่งเซลล์ และออร์แกเนลล์ใดบรรจุเอนไซม์ย่อยสลาย?',
  },
  {
    id: 'human_heart',
    titleTh: 'กายวิภาคหัวใจ 4 ห้องและระบบไหลเวียนเลือด',
    titleEn: 'Human Heart Anatomy & Double Circulation',
    subject: 'science',
    subjectLabel: 'วิทยาศาสตร์',
    category: 'ชีววิทยา',
    gradeLevel: 'ม.2 - ม.5',
    standard: 'มฐ. ว 1.2 ม.2/4 - ม.2/5',
    description: 'ผังหัวใจ 4 ห้อง (RA, RV, LA, LV) หลอดเลือดเวนาคาวา เอออร์ตา ลิ้นไตรคัสพิดและไบคัสพิด พร้อมสรุปทิศทางการไหลของเลือดดำและเลือดแดง',
    supportsExamMode: true,
    sampleQuestion: 'ห้องหัวใจใดมีผนังกล้ามเนื้อหนาที่สุด และทำหน้าที่สูบฉีดเลือดแดงไปเลี้ยงส่วนต่างๆ ของร่างกาย?',
  },
  {
    id: 'photosynthesis',
    titleTh: 'กระบวนการสังเคราะห์ด้วยแสงและคลอโรพลาสต์',
    titleEn: 'Photosynthesis Process & Chemical Equation',
    subject: 'science',
    subjectLabel: 'วิทยาศาสตร์',
    category: 'ชีววิทยา',
    gradeLevel: 'ป.4 - ม.4',
    standard: 'มฐ. ว 1.2 ม.1/7 - ม.1/8',
    description: 'สมการเคมี ปัจจัยนำเข้า (แสงแดด, น้ำ, CO2) และผลผลิต (น้ำตาลกลูโคส, ออกซิเจน) พร้อมโครงสร้างปากใบเปิด-ปิด',
    supportsExamMode: false,
    sampleQuestion: 'ในกระบวนการสังเคราะห์ด้วยแสงของพืช แก๊สชนิดใดถูกใช้เป็นสารตั้งต้น และแก๊สชนิดใดเกิดขึ้นเป็นผลพลอยได้?',
  },
  {
    id: 'dna_genetics',
    titleTh: 'โครงสร้างเกลียวคู่ DNA และตารางพันเนตต์',
    titleEn: 'DNA Double Helix & Punnett Square',
    subject: 'science',
    subjectLabel: 'วิทยาศาสตร์',
    category: 'ชีววิทยา/พันธุศาสตร์',
    gradeLevel: 'ม.3 - ม.4',
    standard: 'มฐ. ว 1.3 ม.3/1 - ม.3/4',
    description: 'เกลียวคู่ DNA คู่เบส A=T, C≡G แกนน้ำตาล-ฟอสเฟต และตารางการถ่ายทอดลักษณะตามกฎของเมนเดล (Tt × Tt)',
    supportsExamMode: false,
    sampleQuestion: 'หากนำถั่วลันเตาลักษณะต้นสูงพันธุ์ทาง (Tt) ผสมกันเอง โอกาสที่จะได้ลูกลักษณะต้นเตี้ย (tt) คิดเป็นอัตราส่วนเท่าใด?',
  },
  {
    id: 'food_chain',
    titleTh: 'โซ่อาหาร สายใยอาหาร และพีระมิดพลังงาน',
    titleEn: 'Food Chain, Food Web & Energy Pyramid',
    subject: 'science',
    subjectLabel: 'วิทยาศาสตร์',
    category: 'นิเวศวิทยา',
    gradeLevel: 'ป.3 - ม.3',
    standard: 'มฐ. ว 1.1 ป.5/1 - ม.3/1',
    description: 'ห่วงโซ่อาหาร 4 ระดับ (ผู้ผลิต, ผู้บริโภคอันดับ 1-3, ผู้ย่อยสลาย) และกฎการถ่ายทอดพลังงาน 10% ตามระดับขั้นการกิน',
    supportsExamMode: false,
    sampleQuestion: 'หากประชากรตั๊กแตนในระบบนิเวศลดลงอย่างรวดเร็ว สิ่งมีชีวิตในระดับใดจะได้รับผลกระทบโดยตรงในลำดับถัดไป?',
  },

  // Science - Physics & Astronomy
  {
    id: 'electric_circuit',
    titleTh: 'วงจรไฟฟ้ากระแสตรงและกฎของโอห์ม',
    titleEn: 'DC Electric Circuit & Ohm’s Law',
    subject: 'science',
    subjectLabel: 'วิทยาศาสตร์',
    category: 'ฟิสิกส์',
    gradeLevel: 'ป.6 - ม.3',
    standard: 'มฐ. ว 2.3 ม.3/1 - ม.3/3',
    description: 'แผนภาพวงจรไฟฟ้าสมบูรณ์ แหล่งกำเนิด สวิตช์ แอมมิเตอร์ โวลต์มิเตอร์ ตัวต้านทาน และสูตร V = IR',
    supportsExamMode: false,
    sampleQuestion: 'จากวงจรไฟฟ้า หากความต่างศักย์ไฟฟ้าเท่ากับ 12 V และตัวต้านทานมีค่า 4 Ω กระแสไฟฟ้าที่ไหลผ่านวงจรมีค่ากี่แอมแปร์?',
  },
  {
    id: 'physics_force',
    titleTh: 'กฎการเคลื่อนที่ของนิวตันและแรงเสียดทาน',
    titleEn: 'Newton’s Laws of Motion & Friction',
    subject: 'science',
    subjectLabel: 'วิทยาศาสตร์',
    category: 'ฟิสิกส์',
    gradeLevel: 'ม.1 - ม.4',
    standard: 'มฐ. ว 2.2 ม.2/1 - ม.2/3',
    description: 'ผังเวกเตอร์แรงลัพธ์ แรงดึง แรงโน้มถ่วง แรงตั้งฉาก แรงเสียดทาน และกฎข้อ 1, 2, 3 ของนิวตัน (ΣF = ma)',
    supportsExamMode: false,
    sampleQuestion: 'เมื่อออกแรงผลักกล่องมวล 5 kg ด้วยแรง 20 N บนพื้นราบที่ไม่มีแรงเสียดทาน กล่องจะเคลื่อนที่ด้วยความเร่งเท่าใด?',
  },
  {
    id: 'physics_wave',
    titleTh: 'สมบัติของคลื่นและการสะท้อน-หักเหแสง',
    titleEn: 'Wave Properties & Optical Refraction',
    subject: 'science',
    subjectLabel: 'วิทยาศาสตร์',
    category: 'ฟิสิกส์',
    gradeLevel: 'ม.2 - ม.5',
    standard: 'มฐ. ว 2.3 ม.2/1 - ม.3/7',
    description: 'ส่วนประกอบคลื่น (สันคลื่น, ท้องคลื่น, ความยาวคลื่น λ, แอมพลิจูด) และการหักเหแสงผ่านปริซึมสามเหลี่ยม',
    supportsExamMode: false,
    sampleQuestion: 'เมื่อแสงเดินทางจากตัวกลางที่มีดรรชนีหักเหน้อยไปยังตัวกลางที่มีดรรชนีหักเหมาก รังสีหักเหจะเบนอย่างไรเทียบกับเส้นแนวฉาก?',
  },
  {
    id: 'magnet_field',
    titleTh: 'สนามแม่เหล็กและขั้วแม่เหล็กโลก',
    titleEn: 'Magnetic Field Lines & Earth Magnetism',
    subject: 'science',
    subjectLabel: 'วิทยาศาสตร์',
    category: 'ฟิสิกส์',
    gradeLevel: 'ป.6 - ม.3',
    standard: 'มฐ. ว 2.2 ป.6/1',
    description: 'เส้นแรงแม่เหล็กพุ่งจากขั้วเหนือ (N) สู่ขั้วใต้ (S) และความสัมพันธ์กับเข็มทิศ',
    supportsExamMode: false,
    sampleQuestion: 'เส้นแรงแม่เหล็กภายนอกแท่งแม่เหล็กมีทิศทางการเคลื่อนที่ออกจากขั้วใดไปยังขั้วใด?',
  },
  {
    id: 'earth_layers',
    titleTh: 'โครงสร้างโลก 3 มิติและธรณีสัณฐาน',
    titleEn: '3D Earth Layers & Tectonic Plates',
    subject: 'science',
    subjectLabel: 'วิทยาศาสตร์',
    category: 'ดาราศาสตร์และโลก',
    gradeLevel: 'ป.6 - ม.4',
    standard: 'มฐ. ว 3.2 ม.2/1 - ม.2/3',
    description: 'โครงสร้างตัดขวาง 3 มิติ เปลือกโลก (Crust) เนื้อโลก (Mantle) แก่นโลกชั้นนอก (Outer Core) และแก่นโลกชั้นใน (Inner Core)',
    supportsExamMode: false,
    sampleQuestion: 'ชั้นใดของโลกมีสถานะเป็นของเหลวและเป็นแหล่งกำเนิดสนามแม่เหล็กโลก?',
  },

  // Science - Chemistry
  {
    id: 'atomic_structure',
    titleTh: 'แบบจำลองอะตอมและการจัดเรียงอิเล็กตรอน',
    titleEn: 'Bohr Atomic Model & Electron Configuration',
    subject: 'science',
    subjectLabel: 'วิทยาศาสตร์',
    category: 'เคมี',
    gradeLevel: 'ม.1 - ม.4',
    standard: 'มฐ. ว 2.1 ม.1/1 - ม.4/1',
    description: 'นิวเคลียส (โปรตอน + นิวตรอน) วงโคจรระดับพลังงานอิเล็กตรอน K, L, M และเวเลนซ์อิเล็กตรอน',
    supportsExamMode: false,
    sampleQuestion: 'ธาตุโซเดียม (Na) มีเลขอะตอม 11 มีการจัดเรียงอิเล็กตรอนในระดับพลังงานหลักอย่างไร และมีเวเลนซ์อิเล็กตรอนกี่ตัว?',
  },
  {
    id: 'states_of_matter',
    titleTh: 'สถานะของสสารและการเปลี่ยนสถานะ',
    titleEn: 'States of Matter & Phase Transitions',
    subject: 'science',
    subjectLabel: 'วิทยาศาสตร์',
    category: 'เคมี',
    gradeLevel: 'ป.5 - ม.1',
    standard: 'มฐ. ว 2.1 ป.5/1 - ม.1/3',
    description: 'การจัดเรียงอนุภาคในของแข็ง ของเหลว แก๊ส และกระบวนการหลอมเหลว กลายเป็นไอ ควบแน่น และการระเหิด',
    supportsExamMode: false,
    sampleQuestion: 'กระบวนการเปลี่ยนสถานะจากของแข็งกลายเป็นแก๊สโดยตรงโดยไม่ผ่านการเป็นของเหลวเรียกว่าอะไร?',
  },
  {
    id: 'chem_safety',
    titleTh: 'สัญลักษณ์ความปลอดภัยในห้องปฏิบัติการเคมี (NFPA / GHS)',
    titleEn: 'Chemical Safety Diamonds & GHS Pictograms',
    subject: 'science',
    subjectLabel: 'วิทยาศาสตร์',
    category: 'เคมี',
    gradeLevel: 'ม.1 - ม.4',
    standard: 'มฐ. ว 2.1 ทักษะปฏิบัติการ',
    description: 'เพชรเตือนภัย NFPA 704 (แดง-ไวไฟ, น้ำเงิน-สุขภาพ, เหลือง-ไวต่อปฏิกิริยา) และสัญลักษณ์สากล GHS',
    supportsExamMode: false,
    sampleQuestion: 'สัญลักษณ์เตือนภัย NFPA สีแดงหมายเลข 4 บ่งบอกถึงอันตรายในด้านใดระดับใด?',
  },
  {
    id: 'chem_glassware',
    titleTh: 'อุปกรณ์วัดปริมาตรแก้วและการอ่านผิวหน้าเว้า (Meniscus)',
    titleEn: 'Laboratory Volumetric Glassware & Meniscus',
    subject: 'science',
    subjectLabel: 'วิทยาศาสตร์',
    category: 'เคมี',
    gradeLevel: 'ม.1 - ม.4',
    standard: 'มฐ. ว 2.1 ทักษะปฏิบัติการ',
    description: 'บีกเกอร์ บิวเรตต์ กระบอกตวง ปิเปตต์ และแนวสายตามาตรฐานในการอ่านระดับท้องน้ำเว้า',
    supportsExamMode: false,
    sampleQuestion: 'การอ่านปริมาตรของน้ำในกระบอกตวงที่ถูกต้อง สายตาของผู้ทดลองจะต้องอยู่ในระดับระนาบใดของผิวของเหลว?',
  },

  // Mathematics
  {
    id: 'right_triangle',
    titleTh: 'ทฤษฎีบทพีทาโกรัสและสามเหลี่ยมมุมฉาก',
    titleEn: 'Pythagorean Theorem & Right Triangle',
    subject: 'math',
    subjectLabel: 'คณิตศาสตร์',
    category: 'เรขาคณิต',
    gradeLevel: 'ม.2 - ม.3',
    standard: 'มฐ. ค 2.2 ม.2/5',
    description: 'สามเหลี่ยมมุมฉาก ด้านประกอบมุมฉาก a, b และด้านตรงข้ามมุมฉาก c พร้อมสูตร c² = a² + b²',
    supportsExamMode: false,
    sampleQuestion: 'ถ้าด้านประกอบมุมฉากของรูปสามเหลี่ยมมุมฉากยาว 6 เซนติเมตร และ 8 เซนติเมตร ด้านตรงข้ามมุมฉากจะยาวกี่เซนติเมตร?',
  },
  {
    id: 'fraction_pie',
    titleTh: 'แผนภาพวงกลมแสดงสัดส่วนเศษส่วนและร้อยละ',
    titleEn: 'Fraction Pie Chart & Percentage Representation',
    subject: 'math',
    subjectLabel: 'คณิตศาสตร์',
    category: 'จำนวนและพีชคณิต',
    gradeLevel: 'ป.3 - ม.1',
    standard: 'มฐ. ค 1.1 ป.4/3 - ป.5/1',
    description: 'วงกลมแบ่ง 8 ส่วนแรเงา 3 ส่วน แปลงเป็นทศนิยมและร้อยละ พร้อมแผงวิเคราะห์เศษส่วนด้านขวา',
    supportsExamMode: false,
    sampleQuestion: 'จากรูปวงกลมที่แบ่งออกเป็น 8 ส่วนเท่าๆ กัน และมีการแรเงาไป 3 ส่วน คิดเป็นเศษส่วนและทศนิยมเท่าใด?',
  },
  {
    id: 'fraction_bar',
    titleTh: 'แถบเปรียบเทียบเศษส่วนที่มีตัวส่วนไม่เท่ากัน',
    titleEn: 'Fraction Comparison Bar Models',
    subject: 'math',
    subjectLabel: 'คณิตศาสตร์',
    category: 'จำนวนและพีชคณิต',
    gradeLevel: 'ป.4 - ป.6',
    standard: 'มฐ. ค 1.1 ป.5/1',
    description: 'แถบจำลองเปรียบเทียบความยาวเศษส่วน 3/5 เทียบกับ 6/10 และ 1/2 เห็นภาพชัดเจน',
    supportsExamMode: false,
    sampleQuestion: 'เศษส่วน 3/5 กับ 6/10 มีความสัมพันธ์เชิงขนาดอย่างไร และสามารถทำตัวส่วนให้เท่ากันได้อย่างไร?',
  },
  {
    id: 'parallel_lines',
    titleTh: 'เส้นขนาน เส้นตัดขวาง และมุมแย้ง',
    titleEn: 'Parallel Lines, Transversals & Alternate Angles',
    subject: 'math',
    subjectLabel: 'คณิตศาสตร์',
    category: 'เรขาคณิต',
    gradeLevel: 'ม.1 - ม.2',
    standard: 'มฐ. ค 2.2 ม.2/2',
    description: 'เส้นขนานตัดขวาง มุมแย้งขนาดเท่ากัน มุมภายในบนข้างเดียวกันรวมกันได้ 180°',
    supportsExamMode: false,
    sampleQuestion: 'ถ้าเส้นตรงสองเส้นขนานกันและมีเส้นตัดขวาง มุมแย้งคู่หนึ่งจะมีขนาดเท่ากันหรือไม่ และมุมภายในข้างเดียวกันรวมกันได้กี่องศา?',
  },
  {
    id: 'geometry_3d',
    titleTh: 'รูปทรงเรขาคณิต 3 มิติ (ปริซึม พีระมิด ทรงกระบอก กรวย ทรงกลม)',
    titleEn: '3D Geometric Solids & Properties',
    subject: 'math',
    subjectLabel: 'คณิตศาสตร์',
    category: 'เรขาคณิต',
    gradeLevel: 'ป.6 - ม.3',
    standard: 'มฐ. ค 2.2 ป.6/1 - ม.3/1',
    description: 'แสดงรูปคลี่ หน้าตัด ฐาน ยอด ปริมาตร และพื้นที่ผิวของรูปทรงเรขาคณิต 3 มิติ 5 ชนิด',
    supportsExamMode: false,
    sampleQuestion: 'รูปทรงเรขาคณิต 3 มิติที่มีฐานเป็นรูปวงกลมและมียอดแหลมเพียงยอดเดียวคือรูปทรงใด และมีสูตรหาปริมาตรอย่างไร?',
  },
  {
    id: 'boxplot_stats',
    titleTh: 'แผนภาพกล่อง (Box Plot) และการแจกแจงแบบปกติ',
    titleEn: 'Box Plot & Five-Number Summary',
    subject: 'math',
    subjectLabel: 'คณิตศาสตร์',
    category: 'สถิติและความน่าจะเป็น',
    gradeLevel: 'ม.3 - ม.6',
    standard: 'มฐ. ค 3.1 ม.3/1 - ม.6/1',
    description: 'ค่าต่ำสุด ควอร์ไทล์ที่ 1, 2 (มัธยฐาน), 3 ค่าสูงสุด พิสัยระหว่างควอร์ไทล์ (IQR) และการกระจายตัวของข้อมูล',
    supportsExamMode: false,
    sampleQuestion: 'จากแผนภาพกล่อง ค่ามัธยฐานของข้อมูลชุดนี้ตรงกับตำแหน่งควอร์ไทล์ใด และค่า IQR คำนวณได้อย่างไร?',
  },
  {
    id: 'linear_graph_1',
    titleTh: 'กราฟระบบสมการเชิงเส้นสองตัวแปรและจุดตัด',
    titleEn: 'System of Linear Equations Graph & Solution',
    subject: 'math',
    subjectLabel: 'คณิตศาสตร์',
    category: 'พีชคณิต',
    gradeLevel: 'ม.3 - ม.4',
    standard: 'มฐ. ค 1.3 ม.3/1',
    description: 'เส้นตรง 2 เส้นตัดกันบนแกน X-Y พิกัดจุดตัด (x, y) ที่เป็นคำตอบของระบบสมการ',
    supportsExamMode: false,
    sampleQuestion: 'จุดตัดของกราฟเส้นตรงทั้งสองเส้นบนระนาบพิกัดฉาก มีความหมายอย่างไรต่อคำตอบของระบบสมการเชิงเส้นสองตัวแปร?',
  },
  {
    id: 'venn_diagram',
    titleTh: 'แผนภาพเวนน์-ออยเลอร์ และการดำเนินการของเซต',
    titleEn: 'Venn Diagram & Set Operations (Union, Intersect)',
    subject: 'math',
    subjectLabel: 'คณิตศาสตร์',
    category: 'เซตและตรรกศาสตร์',
    gradeLevel: 'ม.4',
    standard: 'มฐ. ค 1.1 ม.4/1',
    description: 'เอกภพสัมพัทธ์ เซต A, เซต B ส่วนยูเนียน (A ∪ B) ส่วนอินเตอร์เซกชัน (A ∩ B) และผลต่าง (A - B)',
    supportsExamMode: false,
    sampleQuestion: 'จากแผนภาพเวนน์ บริเวณที่เป็นพื้นที่ร่วมกันระหว่างเซต A และเซต B หมายถึงการดำเนินการใดของเซต?',
  },
  {
    id: 'bar_chart',
    titleTh: 'แผนภูมิแท่งเปรียบเทียบข้อมูลเชิงสถิติ',
    titleEn: 'Comparative Statistical Bar Chart',
    subject: 'math',
    subjectLabel: 'คณิตศาสตร์',
    category: 'สถิติ',
    gradeLevel: 'ป.4 - ม.1',
    standard: 'มฐ. ค 3.1 ป.5/1',
    description: 'แท่งกราฟสีสันสดใสพร้อมแกนแสดงความถี่ หมวดหมู่ และเส้นกริดช่วยอ่านค่า',
    supportsExamMode: false,
    sampleQuestion: 'จากแผนภูมิแท่ง หมวดหมู่ใดมีค่าความถี่สูงสุด และมีความแตกต่างจากหมวดหมู่ที่ต่ำที่สุดเท่าใด?',
  },
  {
    id: 'clock',
    titleTh: 'หน้าปัดนาฬิกาและการอ่านเวลา 24 ชั่วโมง',
    titleEn: 'Clock Face & Time Reading (24-Hour Format)',
    subject: 'math',
    subjectLabel: 'คณิตศาสตร์',
    category: 'การวัด',
    gradeLevel: 'ป.2 - ป.4',
    standard: 'มฐ. ค 2.1 ป.3/2',
    description: 'หน้าปัดนาฬิกาเข็มสั้น เข็มยาว ตัวเลขอารบิกและขีดบอกนาทีอย่างละเอียด',
    supportsExamMode: false,
    sampleQuestion: 'จากหน้าปัดนาฬิกา หากเข็มสั้นชี้ระหว่างเลข 8 กับ 9 และเข็มยาวชี้ที่เลข 6 ในเวลากลางวันจะอ่านเวลาได้เท่าใด?',
  },

  // Social Studies & Humanities
  {
    id: 'sufficiency_economy',
    titleTh: 'ปรัชญาเศรษฐกิจพอเพียง 3 ห่วง 2 เงื่อนไข',
    titleEn: 'Sufficiency Economy Philosophy (3 Loops, 2 Conditions)',
    subject: 'social',
    subjectLabel: 'สังคมศึกษา',
    category: 'เศรษฐศาสตร์',
    gradeLevel: 'ป.4 - ม.6',
    standard: 'มฐ. ส 3.1 ป.5/2 - ม.3/2',
    description: 'ห่วงความพอประมาณ ห่วงความมีเหตุผล ห่วงภูมิคุ้มกัน บนเงื่อนไขความรู้และคุณธรรม นำสู่ชีวิตที่สมดุลและยั่งยืน',
    supportsExamMode: false,
    sampleQuestion: 'หลักการ "มีภูมิคุ้มกันในตัวที่ดี" ตามปรัชญาเศรษฐกิจพอเพียงมีความหมายสอดคล้องกับข้อใดมากที่สุด?',
  },
  {
    id: 'economics_supply_demand',
    titleTh: 'กลไกราคา เส้นอุปสงค์ อุปทาน และจุดดุลยภาพ (E)',
    titleEn: 'Economics Price Mechanism (Demand, Supply, Equilibrium)',
    subject: 'social',
    subjectLabel: 'สังคมศึกษา',
    category: 'เศรษฐศาสตร์',
    gradeLevel: 'ม.1 - ม.6',
    standard: 'มฐ. ส 3.1 ม.3/1 - ม.5/1',
    description: 'กราฟราคา (P) ปริมาณ (Q) เส้นอุปสงค์ D ลาดลง เส้นอุปทาน S ชันขึ้น และจุดตัดดุลยภาพ Pe, Qe พร้อมสรุปกฎอุปสงค์-อุปทาน',
    supportsExamMode: false,
    sampleQuestion: 'เมื่อราคาสินค้าในท้องตลาดอยู่สูงกว่าราคาดุลยภาพ จะส่งผลให้เกิดภาวะใดในระบบเศรษฐกิจ?',
  },
  {
    id: 'compass',
    titleTh: 'เข็มทิศ 8 ทิศและพิกัดภูมิศาสตร์',
    titleEn: 'Compass 8 Cardinal & Intercardinal Directions',
    subject: 'social',
    subjectLabel: 'สังคมศึกษา',
    category: 'ภูมิศาสตร์',
    gradeLevel: 'ป.3 - ม.2',
    standard: 'มฐ. ส 5.1 ป.4/1 - ม.1/1',
    description: 'ทิศหลัก 4 ทิศ (อุดร, ทักษิณ, บูรพา, ประจิม) และทิศรอง 4 ทิศ พร้อมองศาเข็มทิศ 360 องศา',
    supportsExamMode: false,
    sampleQuestion: 'ทิศตะวันออกเฉียงเหนือ มีชื่อเรียกตามทิศโบราณของไทยว่าทิศใด?',
  },

  // Language & CS
  {
    id: 'thai_triyang',
    titleTh: 'ไตรยางศ์ (อักษร 3 หมู่) และการผันวรรณยุกต์',
    titleEn: 'Thai Triyang (3 Consonant Classes) & Tone Rules',
    subject: 'thai',
    subjectLabel: 'ภาษาไทย',
    category: 'หลักการใช้ภาษา',
    gradeLevel: 'ป.1 - ม.1',
    standard: 'มฐ. ท 4.1 ป.3/1 - ป.4/1',
    description: 'อักษรสูง (11 ตัว) อักษรกลาง (9 ตัว) อักษรต่ำ (24 ตัว) และตารางพื้นเสียงการผันวรรณยุกต์คำเป็น-คำตาย',
    supportsExamMode: false,
    sampleQuestion: 'พยัญชนะในอักษรกลางมีทั้งหมดกี่ตัว และสามารถผันวรรณยุกต์ได้ครบทั้ง 5 เสียงเมื่อเป็นคำเป็นใช่หรือไม่?',
  },
  {
    id: 'thai_sentence',
    titleTh: 'โครงสร้างประโยค ภาคประธานและภาคแสดง',
    titleEn: 'Thai Sentence Structure (Subject & Predicate)',
    subject: 'thai',
    subjectLabel: 'ภาษาไทย',
    category: 'หลักการใช้ภาษา',
    gradeLevel: 'ป.3 - ม.2',
    standard: 'มฐ. ท 4.1 ป.4/2 - ม.1/2',
    description: 'ผังจำแนกภาคประธาน (ประธาน, ขยายประธาน) และภาคแสดง (กริยา, กรรม, ขยายกริยา, ขยายกรรม)',
    supportsExamMode: false,
    sampleQuestion: 'จากประโยค "น้องคนเล็กอ่านหนังสือนิทานอย่างเพลิดเพลิน" คำว่า "อย่างเพลิดเพลิน" ทำหน้าที่ขยายส่วนใดของประโยค?',
  },
  {
    id: 'thai_poetics',
    titleTh: 'ฉันทลักษณ์กลอนสุภาพ (กลอนแปด)',
    titleEn: 'Thai Poetics Chanthalak (Klon Paed)',
    subject: 'thai',
    subjectLabel: 'ภาษาไทย',
    category: 'วรรณคดีและกวีนิพนธ์',
    gradeLevel: 'ป.5 - ม.3',
    standard: 'มฐ. ท 4.1 ม.2/3',
    description: 'ผังวรรคสดับ วรรครับ วรรครอง วรรคส่ง พร้อมเส้นสัมผัสนอก-สัมผัสใน และกฎเสียงวรรณยุกต์ท้ายวรรค',
    supportsExamMode: false,
    sampleQuestion: 'คำสุดท้ายของวรรคสดับในกลอนสุภาพ นิยมส่งสัมผัสไปยังคำที่เท่าใดของวรรครับ?',
  },
  {
    id: 'english_tenses',
    titleTh: 'เส้นเวลาโครงสร้าง 12 Tenses ภาษาอังกฤษ',
    titleEn: 'English 12 Tenses Timeline & Formulas',
    subject: 'english',
    subjectLabel: 'ภาษาต่างประเทศ',
    category: 'ไวยากรณ์',
    gradeLevel: 'ป.6 - ม.6',
    standard: 'มฐ. ต 1.2 ม.3/1',
    description: 'เปรียบเทียบ Past, Present, Future ในรูป Simple, Continuous, Perfect และ Perfect Continuous',
    supportsExamMode: false,
    sampleQuestion: 'โครงสร้างประโยค "Subject + have/has + V.3" คือ Tense ใด และใช้ในบริบทเหตุการณ์แบบใด?',
  },
  {
    id: 'algorithm_flowchart',
    titleTh: 'ผังงานอัลกอริทึมมาตรฐาน ISO',
    titleEn: 'Standard Selection Algorithm Flowchart',
    subject: 'cs',
    subjectLabel: 'วิทยาการคำนวณ',
    category: 'วิทยาการคำนวณ',
    gradeLevel: 'ป.4 - ม.4',
    standard: 'มฐ. ว 4.2 ม.1/1 - ม.2/1',
    description: 'สัญลักษณ์เริ่มต้น/สิ้นสุด (แคปซูล) รับค่า (ด้านขนาน) ประมวลผล (ผืนผ้า) เงื่อนไข (ข้าวหลามตัด) และลูกศร',
    supportsExamMode: false,
    sampleQuestion: 'สัญลักษณ์รูปสี่เหลี่ยมข้าวหลามตัด (Decision) ในผังงานอัลกอริทึมใช้สำหรับปฏิบัติการใดของโปรแกรม?',
  },
];

export function getDiagramCatalog(): DiagramMetadata[] {
  return DIAGRAM_CATALOG;
}

export function findDiagramById(id: string): DiagramMetadata | undefined {
  return DIAGRAM_CATALOG.find((d) => d.id === id);
}
