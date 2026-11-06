import express, { Request, Response } from 'express';
import crypto from 'crypto';
import {
  storeGet,
  storePut,
  storeDel,
  storeHas,
  storeList,
  storeJsonGet,
  storeJsonPut,
  storeGetBuffer,
} from './store.js';
import {
  hasApiKey,
  getApiKey,
  generateGptJson,
  generateMockSheet,
  generateAccurateWorksheet,
  generateMockExamParts,
  generateAccurateCurriculumExamParts,
  generateSubjectSvg,
  generateSvgLineArt,
  shouldAttachFigure,
  renderSvgByType,
  generateCustomAiSvg,
  generateExamWithGpt,
} from './ai.js';
import { DIAGRAM_CATALOG, findDiagramById } from './svg-diagrams.js';
import { GPT_MODEL, gptText } from './openai.js';

export const apiRouter = express.Router();

function makeId(): string {
  const dateStr = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const rnd = crypto.randomBytes(4).toString('hex');
  return `${dateStr}-${rnd}`;
}

function getSubjectIndicators(grade: string, subject: string): Array<{ code: string; text: string }> {
  if (subject.includes('คณิต')) {
    return [
      { code: `ค 1.1 ${grade}/1`, text: `เข้าใจและใช้ความรู้เกี่ยวกับจำนวนและการดำเนินการในการแก้โจทย์ปัญหา (${subject})` },
      { code: `ค 1.1 ${grade}/2`, text: `หาผลลัพธ์ของการคำนวณและประเมินความสมเหตุสมผลของคำตอบ` },
      { code: `ค 2.1 ${grade}/1`, text: `เข้าใจพื้นฐานเกี่ยวกับการวัดและการแก้ปัญหาการวัด` },
      { code: `ค 2.2 ${grade}/1`, text: `จำแนกและระบุสมบัติของรูปเรขาคณิต` },
    ];
  }
  if (subject.includes('ภาษาไทย')) {
    return [
      { code: `ท 1.1 ${grade}/1`, text: `อ่านออกเสียงและอ่านจับใจความสำคัญของเรื่องที่กำหนดได้ถูกต้อง` },
      { code: `ท 1.1 ${grade}/2`, text: `อธิบายความหมายของคำและข้อความที่อ่านอย่างถูกต้อง` },
      { code: `ท 2.1 ${grade}/1`, text: `เขียนสื่อสารและบรรยายข้อมูลได้อย่างชัดเจนและสร้างสรรค์` },
      { code: `ท 4.1 ${grade}/1`, text: `เข้าใจธรรมชาติของภาษาและหลักเกณฑ์การใช้ภาษาไทย` },
    ];
  }
  if (subject.includes('อังกฤษ') || subject.toLowerCase().includes('english')) {
    return [
      { code: `ต 1.1 ${grade}/1`, text: `ปฏิบัติตามคำสั่ง คำขอร้อง และคำแนะนำภาษาอังกฤษง่ายๆ` },
      { code: `ต 1.2 ${grade}/1`, text: `พูดและเขียนเพื่อขอและให้ข้อมูลเกี่ยวกับตนเองและเรื่องใกล้ตัว` },
      { code: `ต 1.3 ${grade}/1`, text: `นำเสนอข้อมูลเกี่ยวกับตนเองและสิ่งแวดล้อมเป็นภาษาอังกฤษ` },
    ];
  }
  if (subject.includes('สังคม') || subject.includes('ประวัติ')) {
    return [
      { code: `ส 1.1 ${grade}/1`, text: `อธิบายความสำคัญและหลักธรรมทางศาสนาและการดำเนินชีวิต` },
      { code: `ส 2.1 ${grade}/1`, text: `ปฏิบัติตนตามหน้าที่และวิถีประชาธิปไตยในฐานะพลเมืองดี` },
      { code: `ส 5.1 ${grade}/1`, text: `เข้าใจลักษณะทางกายภาพและความสัมพันธ์ของสิ่งแวดล้อม` },
    ];
  }
  // Default Science / General
  return [
    { code: `ว 1.2 ${grade}/1`, text: `ระบุและอธิบายกระบวนการสำคัญและการเจริญเติบโตของสิ่งมีชีวิตในหัวข้อ ${subject}` },
    { code: `ว 1.2 ${grade}/2`, text: `ตระหนักถึงความจำเป็นของปัจจัยแวดล้อมและการรักษาสมดุล` },
    { code: `ว 2.1 ${grade}/1`, text: `ทดลองและอธิบายสมบัติทางกายภาพและกระบวนการเปลี่ยนแปลง` },
    { code: `ว 2.2 ${grade}/1`, text: `อธิบายแรงและการเคลื่อนที่ของวัตถุในชีวิตประจำวัน` },
  ];
}

// ---------------------------------------------------------------------------
// 1. /api/plan.php - Plan worksheets
// ---------------------------------------------------------------------------
apiRouter.all('/plan.php', async (req: Request, res: Response) => {
  try {
    const b = req.body || {};
    const count = Math.max(1, Math.min(20, Number(b.count) || 4));
    const topic = String(b.topic || 'ความรู้รอบตัว').trim();
    const grade = String(b.grade || 'ป.2').trim();
    const subject = String(b.subject || 'วิทยาศาสตร์และเทคโนโลยี').trim();
    const allowed = Array.isArray(b.types) && b.types.length ? b.types : ['multiple_choice', 'fill_blank', 'matching', 'true_false'];
    const availableInds = getSubjectIndicators(grade, subject);
    const codes = Array.isArray(b.indicators) && b.indicators.length
      ? b.indicators.map((i: any) => i.code || i).filter(Boolean)
      : availableInds.map(i => i.code);

    let sheets: any[] = [];

    if (hasApiKey('openai')) {
      try {
        const prompt = `วางแผนใบงานสำหรับนักเรียนชั้น ${grade} วิชา ${subject} เรื่อง "${topic}" จำนวน ${count} ใบงาน
เลือกรูปแบบโจทย์จาก: ${allowed.join(', ')}
ตอบเป็น JSON array ใน properties "sheets" โดยแต่ละใบประกอบด้วย:
- topic: หัวข้อย่อยของใบงานนี้
- type: รูปแบบโจทย์ (ต้องเป็นหนึ่งในรายการที่กำหนด)
- objective: จุดประสงค์การเรียนรู้สั้นๆ 1 ประโยค
${codes.length ? `- indicatorCodes: รหัสตัวชี้วัดที่ใบนี้วัด (เลือกจาก: ${codes.join(', ')})` : ''}`;

        const data = await generateGptJson(
          'คุณเป็นครูผู้เชี่ยวชาญการออกแบบสื่อการสอนและการวัดผลของไทย',
          prompt,
          {
            type: 'object',
            properties: {
              sheets: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    topic: { type: 'string' },
                    type: { type: 'string' },
                    objective: { type: 'string' },
                    indicatorCodes: { type: 'array', items: { type: 'string' } },
                  },
                  required: ['topic', 'type', 'objective'],
                },
              },
            },
            required: ['sheets'],
          }
        );

        if (Array.isArray(data?.sheets) && data.sheets.length) {
          sheets = data.sheets.slice(0, count).map((s: any, idx: number) => ({
            topic: String(s.topic || `${topic} ตอนที่ ${idx + 1}`),
            type: allowed.includes(s.type) ? s.type : allowed[idx % allowed.length],
            objective: String(s.objective || `เพื่อให้นักเรียนเข้าใจเนื้อหาเกี่ยวกับ ${topic}`),
            indicatorCodes: Array.isArray(s.indicatorCodes) ? s.indicatorCodes : [codes[idx % codes.length]],
          }));
        }
      } catch (err) {
        console.warn('GPT plan fallback active');
      }
    }

    if (!sheets.length) {
      const subParts = topic.split(/[,;/\n]+/).map(s => s.trim()).filter(Boolean);
      for (let i = 0; i < count; i++) {
        const type = allowed[i % allowed.length];
        const subTopic = subParts.length > 1
          ? subParts[i % subParts.length]
          : (count === 1 ? topic : `${topic} (ชุดที่ ${i + 1})`);
        sheets.push({
          topic: subTopic,
          type,
          objective: `เพื่อให้นักเรียนชั้น ${grade} ฝึกทักษะและเข้าใจเรื่อง ${subTopic} ในวิชา${subject}`,
          indicatorCodes: [codes[i % codes.length]],
        });
      }
    }

    res.json({ sheets });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'เกิดข้อผิดพลาดในการวางแผนใบงาน' });
  }
});

// ---------------------------------------------------------------------------
// 2. /api/sheet.php - Generate single worksheet, review, or lesson
// ---------------------------------------------------------------------------
apiRouter.all('/sheet.php', async (req: Request, res: Response) => {
  try {
    const b = req.body || {};
    const step = String(b.step || 'generate');
    const plan = b.plan || {};
    const grade = String(b.grade || 'ป.2').trim();
    const subject = String(b.subject || 'วิทยาศาสตร์และเทคโนโลยี').trim();
    const topic = String(plan.topic || b.topic || 'ความรู้รอบตัว');
    const type = String(plan.type || 'multiple_choice');
    const itemCount = Math.max(2, Math.min(20, Number(b.itemCount) || 5));

    const figureMode = String(b.figureMode || plan.figureMode || 'code');

    if (step === 'generate') {
      let sheet: any = null;

      if (hasApiKey('openai')) {
        try {
          const prompt = `สร้างใบงานสำหรับชั้น ${grade} วิชา ${subject} เรื่อง "${topic}"
รูปแบบโจทย์: ${type}
จำนวนข้อ: ${itemCount} ข้อ
กติกาสำคัญ:
1. คำถามและคำตอบต้องอยู่ในขอบเขตวิชา "${subject}" เรื่อง "${topic}" สำหรับชั้น ${grade} เท่านั้น ห้ามออกนอกเรื่อง
2. ทุกข้อต้องไม่ซ้ำกัน และมีเฉลยที่ถูกต้องชัดเจน`;

          sheet = await generateGptJson(
            'คุณเป็นครูผู้เชี่ยวชาญการออกข้อสอบและแบบฝึกหัดของไทย ออกโจทย์ที่ได้มาตรฐาน วัดความรู้จริง ตัวเลือกไม่คลุมเครือ',
            prompt
          );
        } catch (err) {
          console.warn('GPT sheet gen fallback active');
        }
      }

      if (!sheet || !sheet.items) {
        sheet = generateAccurateWorksheet(type, topic, grade, subject, itemCount, figureMode);
      } else {
        // Attach accurate SVG figures to GPT-generated worksheet items when figureMode !== 'none'
        const fallback = generateAccurateWorksheet(type, topic, grade, subject, itemCount, figureMode);
        if (!sheet.figures && fallback.figures) sheet.figures = fallback.figures;
        if (Array.isArray(sheet.items) && figureMode !== 'none') {
          sheet.items = sheet.items.map((it: any, idx: number) => ({
            ...it,
            figure: it.figure || (idx === 0 ? 'fig1' : ''),
            svgFigure: it.svgFigure || (shouldAttachFigure('smart', String(it.question || it.statement || it.text || topic), idx === 0, idx) ? generateSubjectSvg(subject, `${topic} ${it.question || ''}`, idx, 'mc') : ''),
          }));
        }
      }

      sheet.type = type;
      sheet.topic = topic;
      res.json({ sheet, problems: [] });
      return;
    }

    if (step === 'lesson') {
      const figSvg = generateSubjectSvg(subject, topic, 0, 'mc');
      const lesson = {
        title: `ใบความรู้: ${topic}`,
        intro: `ใบความรู้นี้จัดทำขึ้นเพื่อให้นักเรียนชั้น ${grade} ได้ศึกษาทำความเข้าใจหลักการสำคัญของเรื่อง ${topic} ในวิชา ${subject}`,
        sections: [
          {
            heading: `1. ความหมายและแนวคิดพื้นฐานเรื่อง ${topic}`,
            body: `เรื่อง ${topic} เป็นเนื้อหาสำคัญในวิชา ${subject} ชั้น ${grade} ที่ช่วยให้นักเรียนเข้าใจหลักการ เหตุผล และการนำไปประยุกต์ใช้แก้โจทย์ปัญหาได้อย่างถูกต้อง`,
            bullets: [
              `เข้าใจนิยามและองค์ประกอบสำคัญของ ${topic}`,
              `จำแนกความสัมพันธ์และหลักการของ ${topic} ได้อย่างแม่นยำ`,
              `สามารถเชื่อมโยงความรู้เรื่อง ${topic} ไปใช้แก้ปัญหาในสถานการณ์จริง`,
            ],
            formula: '',
            variables: [],
            figure: figureMode !== 'none' ? 'lfig1' : '',
          },
          {
            heading: `2. ขั้นตอนการวิเคราะห์และสรุปสาระสำคัญ`,
            body: `การศึกษาเรื่อง ${topic} อย่างเป็นระบบ เริ่มจากการอ่านโจทย์หรือสถานการณ์ให้เข้าใจ สังเกตข้อมูลที่กำหนดให้ และเลือกใช้หลักการในวิชา ${subject} อย่างเหมาะสม`,
            bullets: [
              'พิจารณาข้อมูลหรือแผนภาพที่โจทย์กำหนดให้ครบถ้วน',
              'ตรวจสอบความถูกต้องตามหลักวิชาการและหน่วยวัด',
              'สรุปคำตอบพร้อมตรวจสอบความสมเหตุสมผล',
            ],
            formula: '',
            variables: [],
            figure: '',
          },
        ],
        figures: figureMode !== 'none' ? [
          {
            id: 'lfig1',
            kind: 'svg',
            caption: `แผนภาพสรุปแนวคิดเรื่อง ${topic}`,
            svg: figSvg,
          },
        ] : [],
        examples: [
          {
            problem: `ตัวอย่างการวิเคราะห์โจทย์เรื่อง ${topic}`,
            figure: '',
            steps: [
              `1. ระบุสิ่งที่โจทย์ถามเกี่ยวกับ ${topic}`,
              `2. นำหลักการของวิชา ${subject} เรื่อง ${topic} มาวิเคราะห์ทีละขั้น`,
              `3. สรุปคำตอบที่ถูกต้องและชัดเจน`,
            ],
            answer: `ได้คำตอบที่สอดคล้องกับหลักการเรื่อง ${topic}`,
            answerValue: 0,
            checkExpr: '',
          },
        ],
        pitfalls: [
          `ระวังการสับสนคำศัพท์หรือเงื่อนไขสำคัญในเรื่อง ${topic}`,
          'ควรอ่านคำสั่งและตรวจสอบหน่วยหรือตัวเลือกให้ครบทุกข้อก่อนตอบ',
        ],
        summaryHeaders: ['หัวข้อ', 'สาระสำคัญที่ต้องจำ'],
        summaryRows: [
          [topic, `แนวคิดหลักและการวิเคราะห์โจทย์ในวิชา ${subject}`],
          ['การนำไปใช้', `การแก้ปัญหาและการทำแบบทดสอบเรื่อง ${topic}`],
        ],
      };
      res.json({ lesson, problems: [] });
      return;
    }

    if (step === 'review') {
      res.json({ ok: true, issues: [] });
      return;
    }

    res.status(400).json({ error: 'step ไม่ถูกต้อง' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'เกิดข้อผิดพลาดในการสร้างใบงาน' });
  }
});

// ---------------------------------------------------------------------------
// 3. /api/image.php & /api/img.php - Image generator & server
// ---------------------------------------------------------------------------
apiRouter.all('/image.php', async (req: Request, res: Response) => {
  try {
    const b = req.body || {};
    const prompt = String(b.prompt || '').trim();
    if (!prompt) {
      res.status(400).json({ error: 'ไม่มีคำบรรยายภาพ' });
      return;
    }

    const id = crypto.createHash('sha1').update(prompt).digest('hex');
    const existing = storeHas('images', `${id}.svg`) || storeHas('images', `${id}.png`);

    if (existing && !b.force) {
      res.json({ id, url: `api/img.php?id=${id}`, cached: true });
      return;
    }

    const svg = generateSvgLineArt(prompt);
    storePut('images', `${id}.svg`, svg);

    res.json({ id, url: `api/img.php?id=${id}`, cached: false });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'สร้างภาพไม่สำเร็จ' });
  }
});

apiRouter.all('/img.php', (req: Request, res: Response) => {
  const id = String(req.query.id || '');
  if (!id) {
    res.status(400).send('Missing id');
    return;
  }

  const svg = storeGet('images', `${id}.svg`);
  if (svg) {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
    return;
  }

  const png = storeGetBuffer('images', `${id}.png`);
  if (png) {
    res.setHeader('Content-Type', 'image/png');
    res.send(png);
    return;
  }

  const jpg = storeGetBuffer('images', `${id}.jpg`);
  if (jpg) {
    res.setHeader('Content-Type', 'image/jpeg');
    res.send(jpg);
    return;
  }

  res.setHeader('Content-Type', 'image/svg+xml');
  res.send(generateSvgLineArt('ภาพประกอบ'));
});

// ---------------------------------------------------------------------------
// 4. /api/save.php - Worksheet persistence
// ---------------------------------------------------------------------------
apiRouter.all('/save.php', (req: Request, res: Response) => {
  try {
    const b = req.body || {};
    const action = String(b.action || '');

    if (action === 'save') {
      const sheets = Array.isArray(b.sheets) ? b.sheets : [];
      if (!sheets.length) {
        res.status(400).json({ error: 'ไม่มีใบงานให้บันทึก' });
        return;
      }

      let id = String(b.id || '').trim();
      if (!id || id.length < 5) {
        id = makeId();
      }

      const now = new Date().toISOString();
      const old = storeJsonGet<any>('saved', `${id}.json`) || {};
      const doc = {
        id,
        title: String(b.title || old.title || 'ชุดใบงาน').slice(0, 150),
        savedAt: now,
        meta: typeof b.meta === 'object' && b.meta !== null ? b.meta : old.meta || {},
        sheets,
        images: typeof b.images === 'object' && b.images !== null ? b.images : old.images || {},
        folders: old.folders || [],
        status: old.status || 'draft',
      };

      storeJsonPut('saved', `${id}.json`, doc);
      res.json({ id, savedAt: now, where: 'data' });
      return;
    }

    if (action === 'list') {
      const files = storeList('saved', '*.json');
      const items: any[] = [];
      for (const fn of Object.keys(files)) {
        if (fn.startsWith('_')) continue;
        const d = storeJsonGet<any>('saved', fn);
        if (d && d.id) {
          items.push({
            id: d.id,
            title: d.title || 'ชุดใบงาน',
            savedAt: d.savedAt || '',
            status: d.status || 'draft',
            folders: d.folders || [],
            meta: d.meta || {},
            sheetsCount: Array.isArray(d.sheets) ? d.sheets.length : 0,
            trashedAt: d.trashedAt || '',
          });
        }
      }
      items.sort((a, b) => (b.savedAt || '').localeCompare(a.savedAt || ''));
      res.json({
        items,
        folders: ['วิทยาศาสตร์', 'คณิตศาสตร์', 'ภาษาไทย'],
        statuses: { draft: 'ร่าง', reviewed: 'ตรวจแล้ว', used: 'ใช้สอนแล้ว' },
        trashCount: items.filter(x => x.trashedAt).length,
      });
      return;
    }

    if (action === 'load') {
      const id = String(b.id || '');
      const doc = storeJsonGet<any>('saved', `${id}.json`);
      if (!doc) {
        res.status(404).json({ error: 'ไม่พบชุดใบงานนี้' });
        return;
      }
      res.json({ data: doc, missingImages: [] });
      return;
    }

    if (action === 'delete') {
      const id = String(b.id || '');
      const doc = storeJsonGet<any>('saved', `${id}.json`);
      if (doc) {
        doc.trashedAt = new Date().toISOString();
        storeJsonPut('saved', `${id}.json`, doc);
      }
      res.json({ ok: true, trashed: true });
      return;
    }

    if (action === 'purge') {
      const id = String(b.id || '');
      storeDel('saved', `${id}.json`);
      res.json({ ok: true });
      return;
    }

    if (action === 'update') {
      const id = String(b.id || '');
      const doc = storeJsonGet<any>('saved', `${id}.json`);
      if (!doc) {
        res.status(404).json({ error: 'ไม่พบชุดใบงานนี้' });
        return;
      }
      if (b.title) doc.title = String(b.title);
      if (b.status) doc.status = String(b.status);
      if (b.folders) doc.folders = b.folders;
      storeJsonPut('saved', `${id}.json`, doc);
      res.json({ ok: true });
      return;
    }

    if (action === 'copy') {
      const id = String(b.id || '');
      const doc = storeJsonGet<any>('saved', `${id}.json`);
      if (!doc) {
        res.status(404).json({ error: 'ไม่พบชุดใบงานนี้' });
        return;
      }
      const newId = makeId();
      doc.id = newId;
      doc.title = `${doc.title || 'ชุดใบงาน'} (สำเนา)`;
      doc.savedAt = new Date().toISOString();
      delete doc.trashedAt;
      storeJsonPut('saved', `${newId}.json`, doc);
      res.json({ ok: true, id: newId });
      return;
    }

    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'บันทึกไม่สำเร็จ' });
  }
});

// ---------------------------------------------------------------------------
// 5. /api/term.php - Semester plan
// ---------------------------------------------------------------------------
apiRouter.all('/term.php', async (req: Request, res: Response) => {
  try {
    const b = req.body || {};
    const action = String(b.action || '');

    if (action === 'generate') {
      const grade = String(b.grade || 'ป.2').trim();
      const subject = String(b.subject || 'วิทยาศาสตร์และเทคโนโลยี').trim();
      const weeks = Math.max(1, Math.min(24, Number(b.weeks) || 18));
      const reviewWeeks = Math.max(0, Math.min(4, Number(b.reviewWeeks) || 1));
      const examWeeks = Math.max(0, Math.min(4, Number(b.examWeeks) || 2));
      const inds = getSubjectIndicators(grade, subject);

      const rows: any[] = [];
      for (let i = 1; i <= weeks; i++) {
        let kind = 'lesson';
        let sheetType = 'multiple_choice';
        let topic = `บทเรียนสัปดาห์ที่ ${i}: สาระการเรียนรู้ที่ ${i}`;
        let unit = `หน่วยการเรียนรู้ที่ ${Math.ceil(i / 3)}`;

        if (i === weeks - 1 && reviewWeeks > 0) {
          kind = 'review';
          sheetType = 'multiple_choice';
          topic = 'สรุปทบทวนเนื้อหาและเตรียมความพร้อม';
        } else if (i === weeks && examWeeks > 0) {
          kind = 'exam';
          sheetType = 'exam';
          topic = 'วัดผลประเมินผลปลายภาคเรียน';
        }

        rows.push({
          week: i,
          unit,
          topic,
          kind,
          sheetType,
          indicatorCodes: [inds[(i - 1) % inds.length].code],
          note: '',
        });
      }

      res.json({ rows, indicators: inds, edition: 'ฉบับแกนกลาง 2560' });
      return;
    }

    if (action === 'list') {
      const files = storeList('terms', '*.json');
      const items: any[] = [];
      for (const fn of Object.keys(files)) {
        const d = storeJsonGet<any>('terms', fn);
        if (d && d.id) {
          items.push({
            id: d.id,
            title: d.title || 'แผนภาคเรียน',
            savedAt: d.savedAt || '',
            grade: d.grade || '',
            subject: d.subject || '',
            weeksCount: Array.isArray(d.rows) ? d.rows.length : 0,
          });
        }
      }
      items.sort((a, b) => (b.savedAt || '').localeCompare(a.savedAt || ''));
      res.json({ items });
      return;
    }

    if (action === 'save') {
      const id = String(b.id || makeId());
      const doc = {
        id,
        savedAt: new Date().toISOString(),
        title: String(b.title || 'แผนภาคเรียน').slice(0, 150),
        grade: String(b.grade || ''),
        subject: String(b.subject || ''),
        term: String(b.term || ''),
        rows: Array.isArray(b.rows) ? b.rows : [],
      };
      storeJsonPut('terms', `${id}.json`, doc);
      res.json({ id });
      return;
    }

    if (action === 'get') {
      const id = String(b.id || '');
      const doc = storeJsonGet<any>('terms', `${id}.json`);
      if (!doc) {
        res.status(404).json({ error: 'ไม่พบแผนนี้' });
        return;
      }
      res.json({ data: doc });
      return;
    }

    if (action === 'delete') {
      const id = String(b.id || '');
      storeDel('terms', `${id}.json`);
      res.json({ ok: true });
      return;
    }

    res.status(400).json({ error: 'action ไม่ถูกต้อง' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'เกิดข้อผิดพลาดเกี่ยวกับแผนภาคเรียน' });
  }
});

// ---------------------------------------------------------------------------
// 6. /api/lplan.php - Lesson plans
// ---------------------------------------------------------------------------
apiRouter.all('/lplan.php', async (req: Request, res: Response) => {
  try {
    const b = req.body || {};
    const action = String(b.action || '');

    if (action === 'generate') {
      const grade = String(b.grade || 'ป.2');
      const subject = String(b.subject || 'วิทยาศาสตร์และเทคโนโลยี');
      const topic = String(b.topic || 'วัฏจักรของพืช');
      const hours = Number(b.hours) || 1;
      const model = String(b.model || '3stage');
      const inds = getSubjectIndicators(grade, subject);

      const plan = {
        title: `แผนการจัดการเรียนรู้เรื่อง ${topic}`,
        standards: `${inds[0].code.slice(0, 5)} เข้าใจสมบัติของสิ่งมีชีวิตและกระบวนการสำคัญ`,
        indicators: inds.map(i => `${i.code} ${i.text}`).join(' · '),
        essence: `เรื่อง ${topic} มุ่งเน้นให้นักเรียนเกิดความรู้ความเข้าใจในกระบวนการสำคัญ สามารถอธิบายและสังเกตผลที่เกิดขึ้นได้อย่างถูกต้อง`,
        objectives: {
          knowledge: `อธิบายหลักการและความสำคัญของเรื่อง ${topic} ได้อย่างถูกต้อง (K)`,
          process: `สังเกต วิเคราะห์ และทำกิจกรรมเกี่ยวกับ ${topic} ได้ตามกระบวนการ (P)`,
          attitude: `มีความมุ่งมั่น ใฝ่เรียนรู้ และทำงานร่วมกับผู้อื่นได้ (A)`,
        },
        learningContents: `สาระการเรียนรู้แกนกลางและกระบวนการเกี่ยวกับ ${topic}`,
        competencies: ['ความสามารถในการสื่อสาร', 'ความสามารถในการคิด', 'ความสามารถในการแก้ปัญหา'],
        traits: ['มีวินัย', 'ใฝ่เรียนรู้', 'มุ่งมั่นในการทำงาน'],
        activities: [
          { stage: 'ขั้นนำ', teacherActivity: `ครูนำเข้าสู่บทเรียนโดยสนทนาและกระตุ้นความสนใจเกี่ยวกับ "${topic}"`, studentActivity: 'นักเรียนร่วมกันสังเกต ตอบคำถาม และแลกเปลี่ยนประสบการณ์เดิม', minutes: 10 },
          { stage: 'ขั้นสอน', teacherActivity: `ครูอธิบายเนื้อหา จัดกิจกรรมกลุ่ม และมอบหมายภารกิจใบงาน`, studentActivity: 'นักเรียนลงมือศึกษาข้อมูล ปฏิบัติกิจกรรมกลุ่ม และบันทึกผลอย่างเป็นระบบ', minutes: 30 },
          { stage: 'ขั้นสรุป', teacherActivity: 'ครูและนักเรียนร่วมกันอภิปรายสรุปองค์ความรู้', studentActivity: 'นักเรียนสะท้อนสิ่งที่ได้เรียนรู้และสรุปข้อค้นพบร่วมกัน', minutes: 10 },
        ],
        tasks: [`ใบงานกิจกรรมเรื่อง ${topic}`, 'การนำเสนอผลงานกลุ่ม'],
        media: ['สื่อภาพนิ่งและสไลด์ประกอบการสอน', 'อุปกรณ์จำลอง/ของจริง', 'ใบงานและใบความรู้'],
        assessment: [
          { method: 'ประเมินจากใบงาน', tool: 'แบบตรวจใบงาน', criterion: 'ได้คะแนนร้อยละ 70 ขึ้นไป' },
          { method: 'สังเกตพฤติกรรมการเรียนรู้', tool: 'แบบสังเกตพฤติกรรม', criterion: 'ผ่านเกณฑ์ในระดับดี' },
        ],
        worksheetIdeas: [
          { topic: `${topic} - สำรวจและทำความเข้าใจ`, type: 'multiple_choice', purpose: 'วัดความรู้ความจำและความเข้าใจ' },
          { topic: `${topic} - ลำดับขั้นตอนกระบวนการ`, type: 'ordering', purpose: 'ฝึกทักษะการจัดลำดับกระบวนการ' },
        ],
      };

      res.json({ plan, head: b });
      return;
    }

    if (action === 'list') {
      const files = storeList('lplans', '*.json');
      const items: any[] = [];
      for (const fn of Object.keys(files)) {
        const d = storeJsonGet<any>('lplans', fn);
        if (d && d.id) {
          items.push({
            id: d.id,
            title: d.plan?.title || d.head?.topic || 'แผนการสอน',
            savedAt: d.savedAt || '',
            grade: d.head?.grade || '',
            subject: d.head?.subject || '',
            unit: d.head?.unit || '',
          });
        }
      }
      items.sort((a, b) => (b.savedAt || '').localeCompare(a.savedAt || ''));
      res.json({ items });
      return;
    }

    if (action === 'save') {
      const id = String(b.id || makeId());
      const doc = {
        id,
        savedAt: new Date().toISOString(),
        head: b.head || {},
        plan: b.plan || {},
      };
      storeJsonPut('lplans', `${id}.json`, doc);
      res.json({ id });
      return;
    }

    if (action === 'get') {
      const id = String(b.id || '');
      const doc = storeJsonGet<any>('lplans', `${id}.json`);
      if (!doc) {
        res.status(404).json({ error: 'ไม่พบแผนนี้' });
        return;
      }
      res.json({ data: doc });
      return;
    }

    if (action === 'delete') {
      const id = String(b.id || '');
      storeDel('lplans', `${id}.json`);
      res.json({ ok: true });
      return;
    }

    res.status(400).json({ error: 'action ไม่ถูกต้อง' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'เกิดข้อผิดพลาดเกี่ยวกับแผนการสอน' });
  }
});

// ---------------------------------------------------------------------------
// 7. /api/exam.php - Exam creation & analysis
// ---------------------------------------------------------------------------
apiRouter.all('/exam.php', async (req: Request, res: Response) => {
  try {
    const b = req.body || {};
    const action = String(b.action || '');
    const grade = String(b.grade || 'ป.2').trim();
    const subject = String(b.subject || 'วิทยาศาสตร์และเทคโนโลยี').trim();
    const indicators = getSubjectIndicators(grade, subject);

    if (action === 'indicators') {
      res.json({
        indicators,
        edition: 'หลักสูตรแกนกลาง 2560',
      });
      return;
    }

    if (action === 'check_ai') {
      const hasKey = hasApiKey('openai');
      const key = getApiKey('openai');
      res.json({
        connected: hasKey,
        model: GPT_MODEL,
        maskedKey: hasKey ? `${key.slice(0, 4)}...${key.slice(-4)}` : '',
        provider: 'OpenAI GPT',
      });
      return;
    }

    if (action === 'set_openai_key') {
      const newKey = String(b.key || '').trim();
      if (!newKey) {
        res.status(400).json({ error: 'กรุณากรอก API Key' });
        return;
      }
      const s = storeJsonGet<any>('settings', 'settings.json') || {};
      s.keys = s.keys || {};
      s.keys['openai'] = newKey;
      storeJsonPut('settings', 'settings.json', s);
      process.env.OPENAI_API_KEY = newKey;
      res.json({ ok: true, connected: true, model: GPT_MODEL });
      return;
    }

    if (action === 'plan') {
      const partsCfg = b.parts || { mc: { count: 20, score: 1 } };
      const analysis = indicators.map(ind => ({
        code: ind.code,
        text: ind.text,
        levels: [5, 10, 5, 0],
        score: [5, 10, 5, 0],
        items: 20,
        points: 20,
      }));

      res.json({
        analysis,
        bank: {
          mc: { need: partsCfg.mc?.count || 0, fromBank: 0 },
          tf: { need: partsCfg.tf?.count || 0, fromBank: 0 },
          match: { need: partsCfg.match?.count || 0, fromBank: 0 },
          written: { need: partsCfg.written?.count || 0, fromBank: 0 },
        },
        mix: b.mix || { easy: 20, medium: 50, hard: 30, expert: 0 },
      });
      return;
    }

    if (action === 'generate') {
      const partsCfg = b.parts || { mc: { count: 20, score: 1 } };
      const rawTitle = String(b.title || '').trim();
      const rawScope = String(b.scope || '').trim();
      const hint = String(b.hint || '').trim();
      const scopeEdited = Boolean(b.scopeEdited);
      const figMode: 'smart' | 'all' | 'none' =
        b.figMode === 'all' || b.figMode === 'none' || b.figMode === 'smart'
          ? b.figMode
          : b.withFigures === false
          ? 'none'
          : 'smart';
      const inds = Array.isArray(b.indicators) ? b.indicators : [];

      // Prioritize user-specified scope/title/hint so questions never drift out of scope
      const effectiveScope = scopeEdited && rawScope
        ? rawScope
        : rawTitle
        ? `${rawTitle}${rawScope ? ', ' + rawScope : ''}`
        : rawScope || subject;

      let resultParts: any = null;
      let usedModel = 'curriculum-engine';
      const warnings: string[] = [];

      // If OpenAI API is available, generate tailored exam questions with GPT
      if (hasApiKey('openai')) {
        try {
          const gRes = await generateExamWithGpt(
            subject,
            grade,
            effectiveScope,
            rawTitle,
            hint,
            partsCfg,
            inds.map((x: any) => typeof x === 'string' ? x : x.code),
            figMode,
            b.creativeMode || 'hots'
          );
          if (gRes && gRes.parts && Object.keys(gRes.parts).length > 0) {
            resultParts = gRes.parts;
            usedModel = gRes.model || GPT_MODEL;
          }
        } catch (err: any) {
          console.warn('GPT exam gen fallback to enhanced curriculum engine:', err);
          warnings.push(`ไม่สามารถเรียก OpenAI GPT ได้ (${err?.message || 'Connection Error'}) ระบบจึงสลับมาใช้คลังหลักสูตรแกนกลางอัจฉริยะแทน`);
        }
      } else {
        warnings.push(`ยังไม่ได้ระบุ OpenAI API Key ระบบจึงใช้คลังหลักสูตรแกนกลางอัจฉริยะ (สามารถใส่ API Key ที่กล่องด้านบนเพื่อเปิดการคิดโจทย์ใหม่สดๆ จาก GPT)`);
      }

      if (!resultParts) {
        resultParts = generateAccurateCurriculumExamParts(
          partsCfg,
          effectiveScope,
          grade,
          subject,
          hint,
          inds,
          figMode,
          rawTitle
        ).parts;
      }

      const totalItems: number = Object.values<any>(resultParts || {}).reduce((s: number, p: any) => s + (p?.items?.length || 0), 0);
      const totalScore: number = Object.values<any>(resultParts || {}).reduce((s: number, p: any) => s + ((p?.items?.length || 0) * (p?.score || 1)), 0);

      // Build analysis table rows
      const analysisRows = indicators.map(ind => ({
        code: ind.code,
        text: ind.text,
        levels: [Math.ceil(totalItems * 0.2), Math.ceil(totalItems * 0.5), Math.ceil(totalItems * 0.3), 0],
        score: [Math.ceil(totalScore * 0.2), Math.ceil(totalScore * 0.5), Math.ceil(totalScore * 0.3), 0],
        items: totalItems,
        points: totalScore,
      }));

      res.json({
        parts: resultParts,
        analysis: analysisRows,
        warnings,
        stats: {
          bank: 0,
          ai: totalItems,
          missing: 0,
          model: usedModel,
          isCloudAi: usedModel !== 'curriculum-engine',
        },
        indicators,
        aiModel: usedModel,
      });
      return;
    }

    if (action === 'regen') {
      const part = String(b.part || 'mc');
      const level = Number(b.level) || 2;
      const topic = String(b.scope || b.hint || subject);
      const avoid: string[] = Array.isArray(b.avoid) ? b.avoid.map(String) : [];
      let item: any = null;

      if (part === 'mc') {
        const pool = generateAccurateCurriculumExamParts({ mc: { count: 12, score: 1 } }, topic, grade, subject, String(b.hint || ''), [], 'smart', String(b.title || ''));
        const candidates = pool.parts.mc.items.filter((it: any) => !avoid.includes(it.question));
        const chosen = candidates.length > 0
          ? candidates[Math.floor(Math.random() * candidates.length)]
          : pool.parts.mc.items[Math.floor(Math.random() * pool.parts.mc.items.length)];
        item = {
          ...chosen,
          level,
          score: 1,
          source: 'ai',
        };
      } else if (part === 'tf') {
        item = {
          statement: `การประยุกต์ใช้ความรู้เรื่อง "${topic}" ในวิชา ${subject} สามารถสังเกตผลการทดลองและตรวจสอบข้อเท็จจริงได้`,
          answer: true,
          level,
          score: 1,
          source: 'ai',
          figure: generateSubjectSvg(subject, topic, 1, 'tf'),
        };
      } else if (part === 'match') {
        item = {
          left: `คำศัพท์สำคัญในวิชา ${subject}`,
          right: `คำจำกัดความและความหมายที่ถูกต้องตามหลักสูตร`,
          level,
          score: 1,
          source: 'ai',
        };
      } else {
        item = {
          question: `จงอธิบายแนวคิดและการแสดงวิธีทำเรื่อง "${topic}" ในวิชา ${subject} พร้อมยกตัวอย่างประกอบ`,
          solution: ['1. ระบุสิ่งที่โจทย์กำหนดให้', '2. แสดงขั้นตอนการวิเคราะห์', '3. สรุปคำตอบพร้อมเหตุผล'],
          answer: 'คำตอบที่ถูกต้องตามหลักวิชาการ',
          lines: 5,
          level,
          score: 5,
          source: 'ai',
          figure: generateSubjectSvg(subject, topic, 0, 'written'),
        };
      }

      res.json({ item, warnings: [] });
      return;
    }

    if (action === 'regen_fig') {
      const topic = String(b.question || b.topic || subject);
      const idx = Math.floor(Math.random() * 10);
      const figure = generateSubjectSvg(subject, topic, idx, String(b.part || 'mc'));
      res.json({ figure });
      return;
    }

    if (action === 'list') {
      const files = storeList('exams', '*.json');
      const items: any[] = [];
      for (const fn of Object.keys(files)) {
        const d = storeJsonGet<any>('exams', fn);
        if (d && d.id) {
          items.push({
            id: d.id,
            title: d.title || 'ข้อสอบ',
            savedAt: d.savedAt || '',
            grade: d.grade || '',
            subject: d.subject || '',
          });
        }
      }
      items.sort((a, b) => (b.savedAt || '').localeCompare(a.savedAt || ''));
      res.json({ items });
      return;
    }

    if (action === 'save') {
      const id = String(b.id || makeId());
      const doc = {
        id,
        savedAt: new Date().toISOString(),
        title: String(b.title || 'ข้อสอบ').slice(0, 150),
        school: String(b.school || ''),
        kind: String(b.kind || 'ปลายภาค'),
        grade: String(b.grade || ''),
        subject: String(b.subject || ''),
        term: String(b.term || ''),
        year: String(b.year || ''),
        minutes: Number(b.minutes) || 60,
        parts: b.parts || {},
        indicators: b.indicators || [],
      };
      storeJsonPut('exams', `${id}.json`, doc);
      res.json({ id, addedToBank: 0 });
      return;
    }

    if (action === 'get') {
      const id = String(b.id || '');
      const doc = storeJsonGet<any>('exams', `${id}.json`);
      if (!doc) {
        res.status(404).json({ error: 'ไม่พบข้อสอบนี้' });
        return;
      }
      res.json({ data: doc });
      return;
    }

    if (action === 'delete') {
      const id = String(b.id || '');
      storeDel('exams', `${id}.json`);
      res.json({ ok: true });
      return;
    }

    res.status(400).json({ error: 'action ไม่ถูกต้อง' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'เกิดข้อผิดพลาดเกี่ยวกับข้อสอบ' });
  }
});

// ---------------------------------------------------------------------------
// 8. /api/bank.php - Question Bank
// ---------------------------------------------------------------------------
apiRouter.all('/bank.php', (req: Request, res: Response) => {
  try {
    const b = req.body || {};
    const action = String(b.action || 'list');
    const all = storeJsonGet<Record<string, any>>('bank', 'bank.json') || {};

    if (action === 'list') {
      const items = Object.values(all);
      res.json({
        items,
        total: items.length,
        all: items.length,
        facets: { grades: {}, subjects: {}, types: {} },
      });
      return;
    }

    if (action === 'add_saved') {
      res.json({ added: 0, skipped: 0, total: Object.keys(all).length });
      return;
    }

    if (action === 'delete') {
      const ids: string[] = Array.isArray(b.ids) ? b.ids : [];
      for (const id of ids) {
        delete all[id];
      }
      storeJsonPut('bank', 'bank.json', all);
      res.json({ deleted: ids.length, total: Object.keys(all).length });
      return;
    }

    res.status(400).json({ error: 'action ไม่ถูกต้อง' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'คลังข้อสอบผิดพลาด' });
  }
});

// ---------------------------------------------------------------------------
// 9. /api/books.php & /api/book_ai.php - Books
// ---------------------------------------------------------------------------
apiRouter.all('/books.php', (req: Request, res: Response) => {
  try {
    const b = req.body || {};
    const action = String(b.action || '');

    if (action === 'list') {
      const files = storeList('books', '*.json');
      const items: any[] = [];
      for (const fn of Object.keys(files)) {
        const d = storeJsonGet<any>('books', fn);
        if (d && d.id) {
          items.push({
            id: d.id,
            title: d.title || 'เล่มใบงาน',
            savedAt: d.savedAt || '',
            count: Array.isArray(d.book?.entries) ? d.book.entries.length : 0,
          });
        }
      }
      items.sort((a, b) => (b.savedAt || '').localeCompare(a.savedAt || ''));
      res.json({ items });
      return;
    }

    if (action === 'save') {
      const id = String(b.id || makeId());
      const doc = {
        id,
        savedAt: new Date().toISOString(),
        title: String(b.title || 'เล่มใบงาน').slice(0, 150),
        book: b.book || {},
        images: b.images || {},
      };
      storeJsonPut('books', `${id}.json`, doc);
      res.json({ id, savedAt: doc.savedAt, where: 'data' });
      return;
    }

    if (action === 'load') {
      const id = String(b.id || '');
      const doc = storeJsonGet<any>('books', `${id}.json`);
      if (!doc) {
        res.status(404).json({ error: 'ไม่พบเล่มนี้' });
        return;
      }
      res.json({ data: doc, missingImages: [] });
      return;
    }

    if (action === 'delete') {
      const id = String(b.id || '');
      storeDel('books', `${id}.json`);
      res.json({ ok: true });
      return;
    }

    res.status(400).json({ error: 'action ไม่ถูกต้อง' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'บันทึกเล่มไม่สำเร็จ' });
  }
});

apiRouter.all('/book_ai.php', (req: Request, res: Response) => {
  try {
    const b = req.body || {};
    const grade = String(b.grade || 'ป.2');
    const subject = String(b.subject || 'วิทยาศาสตร์');
    const items = Array.isArray(b.items) ? b.items : [];

    const chapters = [
      {
        title: 'หมวดที่ 1: การเรียนรู้และพัฒนาทักษะ',
        uids: items.map((x: any) => String(x.uid)),
      },
    ];

    res.json({
      title: `ชุดแบบฝึกหัดพัฒนาทักษะ ${subject} ${grade}`,
      subtitle: `เสริมสร้างการเรียนรู้และกระบวนการคิดตามหลักสูตรแกนกลางฯ`,
      tagline: `เรียนรู้อย่างสนุก เข้าใจง่าย เก่งขึ้นทุกวัน`,
      preface: `เอกสารรวมเล่มนี้จัดทำขึ้นเพื่อใช้ประกอบการจัดกิจกรรมการเรียนรู้\nมุ่งเน้นให้นักเรียนได้ฝึกทบทวนและพัฒนาศักยภาพอย่างต่อเนื่อง`,
      coverImagePrompt: 'a cheerful cute cartoon student holding an open book, thick clean line art coloring page',
      chapters,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'AI ทำเล่มไม่สำเร็จ' });
  }
});

// ---------------------------------------------------------------------------
// 10. /api/curriculum.php - Curriculum state
// ---------------------------------------------------------------------------
apiRouter.all('/curriculum.php', (req: Request, res: Response) => {
  try {
    const b = req.body || {};
    const action = String(b.action || 'state');
    const grade = String(b.grade || 'ป.2');
    const subject = String(b.subject || 'วิทยาศาสตร์และเทคโนโลยี');

    if (action === 'state') {
      res.json({
        editions: [
          { id: 'cur-2560', name: 'หลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน พ.ศ. 2551 (ปรับปรุง 2560)', year: '2560', note: 'ฉบับมาตรฐาน' },
        ],
        active: { default: 'cur-2560', byGrade: {} },
        grades: ['ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6', 'ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6'],
      });
      return;
    }

    if (action === 'for_grade') {
      res.json({
        indicators: getSubjectIndicators(grade, subject),
        edition: 'หลักสูตรแกนกลาง 2560',
      });
      return;
    }

    res.json({ ok: true, indicators: getSubjectIndicators(grade, subject), subjects: [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'หลักสูตรผิดพลาด' });
  }
});

// ---------------------------------------------------------------------------
// 11. /api/settings.php & /api/models.php - Settings & Models
// ---------------------------------------------------------------------------
apiRouter.all('/settings.php', async (req: Request, res: Response) => {
  try {
    const b = req.body || {};
    const action = String(b.action || 'get');

    if (action === 'get') {
      const s = storeJsonGet<any>('settings', 'settings.json') || {};
      const geminiKey = (s.keys && s.keys.gemini) || process.env.GEMINI_API_KEY || process.env.API_KEY || '';
      const geminiHasKey = Boolean(geminiKey && !geminiKey.includes('ใส่_'));
      const geminiHint = geminiHasKey ? `${geminiKey.slice(0, 4)}...${geminiKey.slice(-4)}` : '';
      const geminiSource = s.keys?.gemini ? 'settings' : (process.env.GEMINI_API_KEY ? 'config' : 'none');

      res.json({
        keys: {
          gemini: { hasKey: geminiHasKey, fromConfig: Boolean(process.env.GEMINI_API_KEY), source: geminiSource, hint: geminiHint },
          openai: { hasKey: Boolean(s.keys?.openai || process.env.OPENAI_API_KEY), fromConfig: Boolean(process.env.OPENAI_API_KEY) },
          openrouter: { hasKey: Boolean(s.keys?.openrouter || process.env.OPENROUTER_API_KEY), fromConfig: Boolean(process.env.OPENROUTER_API_KEY) },
        },
        default: s.default || { textProvider: 'openai', imageProvider: 'openai', textModel: GPT_MODEL, imageModel: 'gpt-image-1' },
        features: s.features || {},
        meta: [
          { id: 'worksheet', name: 'สร้างใบงาน', desc: 'สร้างเนื้อหา ตรวจทาน และภาพประกอบ', image: true },
          { id: 'lplan', name: 'แผนการสอน', desc: 'ร่างแผนการจัดการเรียนรู้', image: false },
          { id: 'term', name: 'แผนภาคเรียน', desc: 'ร่างแผนรายสัปดาห์ทั้งภาคเรียน', image: false },
          { id: 'exam', name: 'ข้อสอบ', desc: 'สร้างข้อสอบกลางภาค/ปลายภาค', image: false },
          { id: 'book', name: 'รวมเล่ม', desc: 'คิดชื่อเล่ม คำนำ และภาพปก', image: true },
        ],
        configModels: {
          gemini: { text: 'gemini-3.8-flash', review: 'gemini-3.8-flash', image: 'gemini-3.8-flash' },
          openai: { text: GPT_MODEL, image: 'gpt-image-1' },
          openrouter: { text: 'google/gemini-2.5-flash', image: '' },
        },
        configProviders: { text: 'openai', image: 'openai' },
      });
      return;
    }

    if (action === 'save') {
      const s = storeJsonGet<any>('settings', 'settings.json') || {};
      if (b.keys) {
        s.keys = s.keys || {};
        for (const [k, v] of Object.entries(b.keys)) {
          if (typeof v === 'string' && v.trim()) {
            s.keys[k] = v.trim();
            if (k === 'openai') process.env.OPENAI_API_KEY = v.trim();
          }
        }
      }
      if (Array.isArray(b.clearKeys)) {
        for (const k of b.clearKeys) {
          if (s.keys) delete s.keys[k];
          if (k === 'openai') delete process.env.OPENAI_API_KEY;
        }
      }
      if (b.default) s.default = b.default;
      if (b.features) s.features = b.features;
      storeJsonPut('settings', 'settings.json', s);
      res.json({ ok: true });
      return;
    }

    if (action === 'test') {
      if (!hasApiKey('openai')) throw new Error('ยังไม่ได้ตั้ง OpenAI API Key');
      const started = Date.now();
      const reply = await gptText('ตอบสั้นที่สุด', 'พิมพ์คำว่า พร้อม');
      res.json({ ok: true, ms: Date.now() - started, reply });
      return;
    }

    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'ตั้งค่าผิดพลาด' });
  }
});

apiRouter.all('/models.php', (req: Request, res: Response) => {
  res.json({
    models: [{ id: GPT_MODEL, name: GPT_MODEL }],
    count: 1,
    kind: 'text',
  });
});

// ---------------------------------------------------------------------------
// 12. /api/library.php - Document library
// ---------------------------------------------------------------------------
apiRouter.all('/library.php', (req: Request, res: Response) => {
  try {
    const b = req.body || {};
    const action = String(b.action || 'list');

    if (action === 'list') {
      const files = storeList('library', '*.json');
      const items: any[] = [];
      for (const fn of Object.keys(files)) {
        if (!fn.endsWith('.meta.json')) continue;
        const d = storeJsonGet<any>('library', fn);
        if (d && d.id) items.push(d);
      }
      res.json({
        items,
        kinds: { textbook: 'หนังสือเรียน', plan: 'แผนการสอน', exercise: 'แบบฝึกหัด/ใบงาน' },
        rights: { own: 'ครูสร้างเอง', school: 'ของโรงเรียน', osec: 'สพฐ./สสวท.' },
      });
      return;
    }

    if (action === 'passages') {
      res.json({ items: [] });
      return;
    }

    if (action === 'search') {
      res.json({ hits: [] });
      return;
    }

    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'คลังเอกสารผิดพลาด' });
  }
});

// ---------------------------------------------------------------------------
// 13. Stubs for other features
// ---------------------------------------------------------------------------
apiRouter.all('/schedule.php', (req: Request, res: Response) => {
  res.json({
    configured: false,
    teachers: [],
    courses: [],
    cfg: {},
  });
});

apiRouter.all('/results.php', (req: Request, res: Response) => {
  res.json({ success: true, assignments: [] });
});

apiRouter.all('/live.php', (req: Request, res: Response) => {
  res.json({ ok: true });
});

apiRouter.all('/lms.php', (req: Request, res: Response) => {
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// 14. /api/online_exam.php - Convert Exam or Worksheet to Interactive Online Exam
// ---------------------------------------------------------------------------
function normalizeOnlineQuestionsFromExam(doc: any): any[] {
  const questions: any[] = [];
  const parts = doc?.parts || {};

  if (parts.mc && Array.isArray(parts.mc.items)) {
    const sc = Number(parts.mc.score) || 1;
    parts.mc.items.forEach((it: any, idx: number) => {
      questions.push({
        id: `mc_${idx + 1}`,
        type: 'mc',
        question: String(it.question || ''),
        choices: Array.isArray(it.choices) ? it.choices.map(String) : ['ก', 'ข', 'ค', 'ง'],
        answerIndex: Number(it.answerIndex) || 0,
        explain: String(it.explain || ''),
        figure: String(it.figure || ''),
        score: sc,
        indicator: String(it.indicator || ''),
      });
    });
  }

  if (parts.tf && Array.isArray(parts.tf.items)) {
    const sc = Number(parts.tf.score) || 1;
    parts.tf.items.forEach((it: any, idx: number) => {
      questions.push({
        id: `tf_${idx + 1}`,
        type: 'tf',
        question: String(it.statement || ''),
        choices: ['ถูก (✓)', 'ผิด (✗)'],
        answerIndex: it.answer ? 0 : 1,
        explain: String(it.explain || `คำตอบที่ถูกต้องคือ ${it.answer ? 'ถูก' : 'ผิด'}`),
        figure: String(it.figure || ''),
        score: sc,
        indicator: String(it.indicator || ''),
      });
    });
  }

  if (parts.match && Array.isArray(parts.match.items) && parts.match.items.length > 0) {
    const sc = Number(parts.match.score) || 1;
    const allRights = parts.match.items.map((m: any) => String(m.right || ''));
    parts.match.items.forEach((it: any, idx: number) => {
      const correctRight = String(it.right || '');
      const distractors = allRights.filter((r: string, rIdx: number) => rIdx !== idx).slice(0, 3);
      while (distractors.length < 3) {
        distractors.push(`ตัวเลือกหลอกที่ ${distractors.length + 1}`);
      }
      const choices = [correctRight, ...distractors];
      const shift = idx % choices.length;
      const rotated = choices.slice(shift).concat(choices.slice(0, shift));
      questions.push({
        id: `match_${idx + 1}`,
        type: 'mc',
        question: `จับคู่ความสัมพันธ์: "${it.left}" ตรงกับข้อใด`,
        choices: rotated,
        answerIndex: rotated.indexOf(correctRight),
        explain: `"${it.left}" คู่กับ "${correctRight}"`,
        figure: String(it.figure || ''),
        score: sc,
        indicator: String(it.indicator || ''),
      });
    });
  }

  if (parts.written && Array.isArray(parts.written.items)) {
    const sc = Number(parts.written.score) || 5;
    parts.written.items.forEach((it: any, idx: number) => {
      questions.push({
        id: `written_${idx + 1}`,
        type: 'short',
        question: String(it.question || ''),
        answerText: String(it.answer || ''),
        explain: Array.isArray(it.solution) ? it.solution.join(' → ') : String(it.answer || ''),
        figure: String(it.figure || ''),
        score: sc,
        indicator: String(it.indicator || ''),
      });
    });
  }

  return questions;
}

function normalizeOnlineQuestionsFromWorksheet(payload: any): any[] {
  const questions: any[] = [];
  const sheets = Array.isArray(payload?.sheets) ? payload.sheets : [];
  const subject = String(payload?.subject || 'วิทยาศาสตร์และเทคโนโลยี');

  sheets.forEach((entry: any, sIdx: number) => {
    const sh = entry?.sheet || entry;
    if (!sh) return;
    const figsById: Record<string, string> = {};
    if (Array.isArray(sh.figures)) {
      sh.figures.forEach((f: any) => {
        if (f && f.id && f.svg) figsById[String(f.id)] = String(f.svg);
      });
    }
    const defaultFig = Object.values(figsById)[0] || '';
    const items = Array.isArray(sh.items) ? sh.items : [];

    items.forEach((it: any, idx: number) => {
      const figSvg = it.svgFigure || (it.figure && figsById[it.figure]) || (idx === 0 ? defaultFig : '');

      if (sh.type === 'multiple_choice' || sh.type === 'multi_statement') {
        const stem = it.stem
          ? `${it.stem}\n${(it.statements || []).map((st: string, k: number) => `${k + 1}) ${st}`).join('\n')}`
          : String(it.question || '');
        questions.push({
          id: `ws_${sIdx + 1}_${idx + 1}`,
          type: 'mc',
          question: stem,
          choices: Array.isArray(it.choices) ? it.choices.map(String) : ['ก', 'ข', 'ค', 'ง'],
          answerIndex: Number(it.answerIndex) || 0,
          explain: String(it.explanation || it.explain || ''),
          figure: figSvg,
          score: 1,
          indicator: String(it.indicator || ''),
        });
      } else if (sh.type === 'true_false') {
        questions.push({
          id: `ws_${sIdx + 1}_${idx + 1}`,
          type: 'tf',
          question: String(it.statement || ''),
          choices: ['ถูก (✓)', 'ผิด (✗)'],
          answerIndex: it.answer ? 0 : 1,
          explain: String(it.explanation || `คำตอบที่ถูกต้องคือ ${it.answer ? 'ถูก' : 'ผิด'}`),
          figure: figSvg,
          score: 1,
          indicator: String(it.indicator || ''),
        });
      } else if (sh.type === 'matching') {
        const allRights = items.map((m: any) => String(m.right || ''));
        const correctRight = String(it.right || '');
        const distractors = allRights.filter((_: string, rIdx: number) => rIdx !== idx).slice(0, 3);
        while (distractors.length < 3) distractors.push(`ตัวเลือกที่ ${distractors.length + 1}`);
        const choices = [correctRight, ...distractors];
        const shift = idx % choices.length;
        const rotated = choices.slice(shift).concat(choices.slice(0, shift));
        questions.push({
          id: `ws_${sIdx + 1}_${idx + 1}`,
          type: 'mc',
          question: `จับคู่: "${it.left}" สอดคล้องกับข้อใด`,
          choices: rotated,
          answerIndex: rotated.indexOf(correctRight),
          explain: `"${it.left}" คู่กับ "${correctRight}"`,
          figure: figSvg || (idx === 0 ? generateSubjectSvg(subject, String(sh.topic || ''), idx, 'mc') : ''),
          score: 1,
          indicator: String(it.indicator || ''),
        });
      } else {
        // fill_blank, short_answer, calculation, ordering, etc.
        const qText = String(it.question || it.text || it.problem || it.label || '');
        const ansText = String(it.answer || it.order || '');
        questions.push({
          id: `ws_${sIdx + 1}_${idx + 1}`,
          type: 'short',
          question: qText,
          answerText: ansText,
          explain: Array.isArray(it.solution) ? it.solution.join(' → ') : `เฉลย: ${ansText}`,
          figure: figSvg,
          score: 1,
          indicator: String(it.indicator || ''),
        });
      }
    });

    if (sh.type === 'exam' && Array.isArray(sh.written)) {
      sh.written.forEach((w: any, wIdx: number) => {
        questions.push({
          id: `ws_${sIdx + 1}_w_${wIdx + 1}`,
          type: 'short',
          question: String(w.question || ''),
          answerText: String(w.answer || ''),
          explain: Array.isArray(w.solution) ? w.solution.join(' → ') : String(w.answer || ''),
          figure: w.figure && figsById[w.figure] ? figsById[w.figure] : '',
          score: 2,
          indicator: String(w.indicator || ''),
        });
      });
    }
  });

  return questions;
}

apiRouter.all('/online_exam.php', (req: Request, res: Response) => {
  try {
    const b = req.body || {};
    const action = String(b.action || req.query.action || 'get');

    if (action === 'create') {
      const sourceType = String(b.sourceType || 'exam');
      const id = String(b.id || makeId());
      let title = String(b.title || 'ข้อสอบออนไลน์').trim();
      let subject = String(b.subject || 'วิทยาศาสตร์และเทคโนโลยี').trim();
      let grade = String(b.grade || 'ม.1').trim();
      let school = String(b.school || '').trim();
      let minutes = Number(b.minutes) || 45;
      let questions: any[] = [];

      if (sourceType === 'worksheet') {
        title = String(b.title || `แบบทดสอบออนไลน์: ${b.topic || 'ใบงาน'}`).trim();
        subject = String(b.subject || 'วิทยาศาสตร์และเทคโนโลยี');
        grade = String(b.grade || 'ป.4');
        questions = normalizeOnlineQuestionsFromWorksheet(b);
      } else {
        const doc = b.doc || b;
        title = String(doc.title || title);
        subject = String(doc.subject || subject);
        grade = String(doc.grade || grade);
        school = String(doc.school || school);
        minutes = Number(doc.minutes) || minutes;
        questions = normalizeOnlineQuestionsFromExam(doc);
      }

      const existing = storeJsonGet<any>('online_exams', `${id}.json`);
      const totalScore = questions.reduce((sum, q) => sum + (Number(q.score) || 1), 0);
      const record = {
        id,
        sourceType,
        title,
        subject,
        grade,
        school,
        minutes,
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        questions,
        totalItems: questions.length,
        totalScore,
        submissions: Array.isArray(existing?.submissions) ? existing.submissions : [],
      };

      storeJsonPut('online_exams', `${id}.json`, record);
      res.json({
        ok: true,
        id,
        url: `online-exam.php?id=${encodeURIComponent(id)}`,
        exam: record,
      });
      return;
    }

    if (action === 'get') {
      const id = String(b.id || req.query.id || '').trim();
      if (!id) {
        // Return the most recent online exam if no id specified, or a demo exam
        const files = storeList('online_exams', '*.json');
        const keys = Object.keys(files);
        if (keys.length > 0) {
          const latest = storeJsonGet<any>('online_exams', keys[keys.length - 1]);
          if (latest) {
            res.json({ ok: true, exam: latest });
            return;
          }
        }
        res.status(404).json({ error: 'ไม่พบข้อสอบออนไลน์ที่ระบุ' });
        return;
      }
      const exam = storeJsonGet<any>('online_exams', `${id}.json`);
      if (!exam) {
        res.status(404).json({ error: 'ไม่พบข้อสอบออนไลน์รหัสนี้' });
        return;
      }
      res.json({ ok: true, exam });
      return;
    }

    if (action === 'submit') {
      const id = String(b.id || '').trim();
      const exam = storeJsonGet<any>('online_exams', `${id}.json`);
      if (!exam) {
        res.status(404).json({ error: 'ไม่พบข้อสอบออนไลน์รหัสนี้' });
        return;
      }

      const studentName = String(b.studentName || 'นักเรียนไม่ระบุชื่อ').trim();
      const studentClass = String(b.studentClass || exam.grade || '').trim();
      const studentNo = String(b.studentNo || '').trim();
      const answers = b.answers && typeof b.answers === 'object' ? b.answers : {};
      const durationSec = Number(b.durationSec) || 0;

      let earnedScore = 0;
      let correctCount = 0;
      const itemResults = (exam.questions || []).map((q: any) => {
        const rawAns = answers[q.id];
        const sc = Number(q.score) || 1;
        let isCorrect = false;
        if (q.type === 'mc' || q.type === 'tf') {
          isCorrect = rawAns !== undefined && rawAns !== null && String(rawAns) !== '' && Number(rawAns) === Number(q.answerIndex);
        } else {
          const given = String(rawAns || '').trim().toLowerCase();
          const target = String(q.answerText || '').trim().toLowerCase();
          isCorrect = given.length > 0 && (given === target || (target.length > 0 && given.includes(target)));
        }
        if (isCorrect) {
          earnedScore += sc;
          correctCount++;
        }
        return {
          id: q.id,
          isCorrect,
          givenAnswer: rawAns,
          correctAnswer: q.type === 'mc' || q.type === 'tf' ? q.answerIndex : q.answerText,
          explain: q.explain || '',
          score: isCorrect ? sc : 0,
          maxScore: sc,
        };
      });

      const totalScore = Number(exam.totalScore) || exam.questions.length || 1;
      const percent = Math.round((earnedScore / totalScore) * 100);
      const submission = {
        subId: makeId(),
        submittedAt: new Date().toISOString(),
        studentName,
        studentClass,
        studentNo,
        score: earnedScore,
        totalScore,
        correctCount,
        totalItems: (exam.questions || []).length,
        percent,
        durationSec,
      };

      exam.submissions = Array.isArray(exam.submissions) ? exam.submissions : [];
      exam.submissions.unshift(submission);
      storeJsonPut('online_exams', `${id}.json`, exam);

      res.json({
        ok: true,
        submission,
        results: itemResults,
      });
      return;
    }

    if (action === 'list') {
      const files = storeList('online_exams', '*.json');
      const items: any[] = [];
      for (const fn of Object.keys(files)) {
        const d = storeJsonGet<any>('online_exams', fn);
        if (d && d.id) {
          items.push({
            id: d.id,
            title: d.title,
            subject: d.subject,
            grade: d.grade,
            totalItems: d.totalItems || 0,
            submissionsCount: Array.isArray(d.submissions) ? d.submissions.length : 0,
            updatedAt: d.updatedAt || d.createdAt,
          });
        }
      }
      items.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
      res.json({ ok: true, items });
      return;
    }

    res.status(400).json({ error: 'action ไม่ถูกต้อง' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'ระบบข้อสอบออนไลน์ขัดข้อง' });
  }
});

// ---------------------------------------------------------------------------
// 19. Educational Diagram Studio & Catalog APIs
// ---------------------------------------------------------------------------

apiRouter.get('/diagrams/catalog', (req: Request, res: Response) => {
  const subject = String(req.query.subject || '').trim().toLowerCase();
  const grade = String(req.query.grade || '').trim();
  const q = String(req.query.q || '').trim().toLowerCase();

  let list = DIAGRAM_CATALOG;
  if (subject && subject !== 'all') {
    list = list.filter((d) => d.subject === subject || d.category.toLowerCase().includes(subject));
  }
  if (grade && grade !== 'all') {
    list = list.filter((d) => d.gradeLevel.includes(grade));
  }
  if (q) {
    list = list.filter((d) =>
      d.titleTh.toLowerCase().includes(q) ||
      d.titleEn.toLowerCase().includes(q) ||
      d.description.toLowerCase().includes(q) ||
      d.standard.toLowerCase().includes(q) ||
      d.category.toLowerCase().includes(q)
    );
  }

  res.json({
    ok: true,
    total: list.length,
    catalog: list,
  });
});

apiRouter.get('/diagrams/render', (req: Request, res: Response) => {
  const id = String(req.query.id || req.query.type || 'cell_diagram').trim();
  const mode = (String(req.query.mode || 'teach').toLowerCase() === 'exam') ? 'exam' : 'teach';
  const format = String(req.query.format || 'json').toLowerCase();

  const metadata = findDiagramById(id);
  const svg = renderSvgByType(id, mode);

  if (!svg) {
    res.status(404).json({ ok: false, error: `ไม่พบแผนภาพรหัส '${id}'` });
    return;
  }

  if (format === 'svg') {
    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.send(svg);
    return;
  }

  res.json({
    ok: true,
    id,
    mode,
    title: metadata ? (mode === 'exam' ? `${metadata.titleTh} (โหมดข้อสอบ)` : metadata.titleTh) : id,
    metadata: metadata || null,
    svg,
  });
});

apiRouter.post('/diagrams/generate', async (req: Request, res: Response) => {
  try {
    const { prompt, subject = 'วิทยาศาสตร์', grade = 'ม.2', mode = 'teach' } = req.body || {};
    const textPrompt = String(prompt || '').trim();

    if (!textPrompt) {
      res.status(400).json({ ok: false, error: 'กรุณาระบุหัวข้อหรือคำสั่งสำหรับสร้างแผนภาพ' });
      return;
    }

    const svgMode = mode === 'exam' ? 'exam' : 'teach';
    const svg = await generateCustomAiSvg(textPrompt, String(subject), String(grade), svgMode);

    res.json({
      ok: true,
      prompt: textPrompt,
      subject,
      grade,
      mode: svgMode,
      svg,
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message || 'เกิดข้อผิดพลาดในการสร้างแผนภาพ AI' });
  }
});

// Legacy compatibility for /api/diagrams.php and /api/diagram.php
apiRouter.all(['/diagrams.php', '/diagram.php'], async (req: Request, res: Response) => {
  const action = String(req.query.action || req.body?.action || 'catalog');
  if (action === 'catalog') {
    res.json({ ok: true, catalog: DIAGRAM_CATALOG });
    return;
  }
  if (action === 'render') {
    const id = String(req.query.id || req.body?.id || 'cell_diagram');
    const mode = (String(req.query.mode || req.body?.mode || 'teach') === 'exam') ? 'exam' : 'teach';
    const svg = renderSvgByType(id, mode);
    res.json({ ok: true, id, mode, svg });
    return;
  }
  if (action === 'generate') {
    const prompt = String(req.body?.prompt || '');
    const subject = String(req.body?.subject || 'วิทยาศาสตร์');
    const grade = String(req.body?.grade || 'ม.2');
    const mode = (String(req.body?.mode || 'teach') === 'exam') ? 'exam' : 'teach';
    const svg = await generateCustomAiSvg(prompt, subject, grade, mode);
    res.json({ ok: true, svg, prompt, mode });
    return;
  }
  res.json({ ok: true, catalog: DIAGRAM_CATALOG });
});


