import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateAccurateCurriculumExamParts,
  generateAccurateWorksheet,
  generateSubjectSvg,
} from './ai.js';

test('generateSubjectSvg returns valid educational SVG matching specific topics', () => {
  const vennSvg = generateSubjectSvg('คณิตศาสตร์', 'เซตและแผนภาพเวนน์', 0, 'mc');
  assert.ok(vennSvg.startsWith('<svg') && vennSvg.endsWith('</svg>'));
  assert.ok(vennSvg.includes('circle'), 'Venn diagram SVG must contain circles');

  const linearSvg = generateSubjectSvg('คณิตศาสตร์', 'กราฟของระบบสมการเชิงเส้นสองตัวแปร', 0, 'mc');
  assert.ok(linearSvg.startsWith('<svg') && linearSvg.includes('line'));

  const cellSvg = generateSubjectSvg('ชีววิทยา', 'โครงสร้างและส่วนประกอบของเซลล์พืช', 0, 'mc');
  assert.ok(cellSvg.startsWith('<svg') && cellSvg.includes('ellipse'));

  const chemSvg = generateSubjectSvg('เคมี', 'ความปลอดภัยและทักษะในปฏิบัติการเคมี สัญลักษณ์ NFPA', 0, 'mc');
  assert.ok(chemSvg.startsWith('<svg') && chemSvg.includes('สีแดง'));
});

test('generateAccurateCurriculumExamParts respects selective figure mode (smart vs all vs none)', () => {
  const partsCfg = { mc: { count: 8, score: 1 } };

  // 1. Smart mode: some items have figures (e.g. Venn diagram question), some pure symbolic items do not
  const smartRes = generateAccurateCurriculumExamParts(
    partsCfg,
    'เซตและการดำเนินการของเซต',
    'ม.4',
    'คณิตศาสตร์',
    '',
    [],
    'smart',
    'แบบทดสอบเรื่องเซต'
  );
  const smartItems = smartRes.parts.mc.items;
  assert.equal(smartItems.length, 8);
  const withFigCount = smartItems.filter((it: any) => it.figure && it.figure.startsWith('<svg')).length;
  const withoutFigCount = smartItems.filter((it: any) => !it.figure).length;
  assert.ok(withFigCount > 0, 'Smart mode must attach figures to visual questions');
  assert.ok(withoutFigCount > 0, 'Smart mode must omit figures on pure symbolic questions');

  // 2. All mode: every question gets a figure
  const allRes = generateAccurateCurriculumExamParts(
    partsCfg,
    'เซต',
    'ม.4',
    'คณิตศาสตร์',
    '',
    [],
    'all'
  );
  for (const it of allRes.parts.mc.items) {
    assert.ok(it.figure && it.figure.startsWith('<svg'), 'All mode must attach SVG figure to every question');
  }

  // 3. None mode: no question gets a figure
  const noneRes = generateAccurateCurriculumExamParts(
    partsCfg,
    'เซต',
    'ม.4',
    'คณิตศาสตร์',
    '',
    [],
    'none'
  );
  for (const it of noneRes.parts.mc.items) {
    assert.equal(it.figure, '', 'None mode must not attach figures');
  }
});

test('generateAccurateCurriculumExamParts strictly adheres to Thai subject and never drifts to Math', () => {
  const partsCfg = { mc: { count: 20, score: 1 } };
  const { parts } = generateAccurateCurriculumExamParts(
    partsCfg,
    'คำเป็น คำตาย และมาตราตัวสะกด',
    'ป.4',
    'ภาษาไทย',
    'เน้นมาตราตัวสะกดและคำเป็นคำตาย',
    [],
    'smart',
    'ข้อสอบวิชาภาษาไทย เรื่อง คำเป็นคำตาย'
  );

  const items = parts.mc.items;
  assert.equal(items.length, 20);

  const uniqueQuestions = new Set(items.map((it: any) => it.question));
  assert.equal(uniqueQuestions.size, 20, 'All 20 Thai questions must be distinct');

  for (const it of items) {
    assert.ok(
      !it.question.includes('มะม่วง') && !it.question.includes('กิโลกรัมละ'),
      `Thai exam question must never drift to Math word problems: ${it.question}`
    );
  }
});

test('generateAccurateCurriculumExamParts matches specific topics (Linear Systems, Cell Biology, Chemistry Safety)', () => {
  const linearExam = generateAccurateCurriculumExamParts(
    { mc: { count: 4, score: 1 } },
    'ระบบสมการเชิงเส้นสองตัวแปร',
    'ม.3',
    'คณิตศาสตร์',
    '',
    [],
    'smart'
  );
  assert.ok(
    linearExam.parts.mc.items.some((it: any) => it.question.includes('สมการเชิงเส้น') || it.question.includes('กราฟ')),
    'Linear system exam must contain linear system questions'
  );

  const cellExam = generateAccurateCurriculumExamParts(
    { mc: { count: 4, score: 1 } },
    'โครงสร้างและหน้าที่ของเซลล์',
    'ม.4',
    'วิทยาศาสตร์และเทคโนโลยี',
    '',
    [],
    'smart'
  );
  assert.ok(
    cellExam.parts.mc.items.some((it: any) => it.question.includes('เซลล์') || it.question.includes('คลอโรพลาสต์') || it.question.includes('ไมโทคอนเดรีย')),
    'Cell biology exam must contain cell structure questions'
  );

  const chemExam = generateAccurateCurriculumExamParts(
    { mc: { count: 6, score: 1 } },
    'ความปลอดภัยและทักษะในปฏิบัติการเคมี เลขนัยสำคัญ',
    'ม.4',
    'วิทยาศาสตร์และเทคโนโลยี',
    '',
    [],
    'smart'
  );
  assert.ok(
    chemExam.parts.mc.items.some((it: any) => it.question.includes('บิวเรตต์') || it.question.includes('เลขนัยสำคัญ') || it.question.includes('อันตราย')),
    'Chemistry safety exam must contain lab equipment, safety symbol, or significant figure questions'
  );
});

test('generateAccurateWorksheet generates topic-specific items and SVG figures across worksheet types', () => {
  const mcSheet = generateAccurateWorksheet(
    'multiple_choice',
    'ระบบสมการเชิงเส้นสองตัวแปร',
    'ม.3',
    'คณิตศาสตร์',
    4,
    'code'
  );
  assert.equal(mcSheet.items.length, 4);
  assert.ok(mcSheet.figures && mcSheet.figures.length > 0 && mcSheet.figures[0].svg.startsWith('<svg'));
  assert.ok(mcSheet.items.some((it: any) => it.question.includes('สมการ') || it.question.includes('กราฟ')));

  const matchSheet = generateAccurateWorksheet(
    'matching',
    'โครงสร้างและหน้าที่ของเซลล์',
    'ม.4',
    'วิทยาศาสตร์และเทคโนโลยี',
    4,
    'code'
  );
  assert.equal(matchSheet.items.length, 4);
  assert.ok(matchSheet.items.every((it: any) => it.left && it.right));
});

test('createCellDiagramSvg produces textbook-standard 3D cutaway plant cell with all organelles and callouts', () => {
  const cellSvg = generateSubjectSvg('วิทยาศาสตร์', 'โครงสร้างและออร์แกเนลล์ของเซลล์พืช', 0, 'mc');
  assert.ok(cellSvg.startsWith('<svg') && cellSvg.endsWith('</svg>'));
  assert.ok(cellSvg.includes('Plant Cell Cutaway 3D'), 'Must have title Plant Cell Cutaway 3D');
  assert.ok(cellSvg.includes('ผนังเซลล์') && cellSvg.includes('Cell Wall'));
  assert.ok(cellSvg.includes('เยื่อหุ้มเซลล์') && cellSvg.includes('Plasma Membrane'));
  assert.ok(cellSvg.includes('นิวเคลียส') && cellSvg.includes('Nucleus'));
  assert.ok(cellSvg.includes('แวคิวโอล') && cellSvg.includes('Central Vacuole'));
  assert.ok(cellSvg.includes('คลอโรพลาสต์') && cellSvg.includes('Chloroplast'));
  assert.ok(cellSvg.includes('ไมโทคอนเดรีย') && cellSvg.includes('Mitochondrion'));
  assert.ok(cellSvg.includes('พลาสโมเดสมาตา') && cellSvg.includes('Plasmodesmata'));
});

test('Cell biology examination generates standardized 20 questions with balanced answer distribution', () => {
  const cellExam = generateAccurateCurriculumExamParts(
    { mc: { count: 20, score: 1 } },
    'โครงสร้างและหน้าที่ของเซลล์พืชและเซลล์สัตว์',
    'ม.4',
    'ชีววิทยา',
    'เน้นออร์แกเนลล์และการทำงานร่วมกัน',
    [],
    'smart',
    'ข้อสอบมาตรฐานวิชาชีววิทยา เรื่อง เซลล์'
  );

  const items = cellExam.parts.mc.items;
  assert.equal(items.length, 20);

  // Check all questions are unique
  const questions = new Set(items.map((it: any) => it.question));
  assert.equal(questions.size, 20, 'All 20 questions must be distinct');

  // Check answer distribution is balanced across 0 (ก), 1 (ข), 2 (ค), 3 (ง)
  const counts = [0, 0, 0, 0];
  for (const it of items) {
    assert.ok(it.answerIndex >= 0 && it.answerIndex <= 3, 'Answer index must be between 0 and 3');
    counts[it.answerIndex]++;
    assert.equal(it.choices.length, 4, 'Must have exactly 4 choices');
    assert.ok(it.explain && it.explain.length > 20, 'Must have detailed academic explanation');
  }

  // Ensure answer key is NOT biased to one choice (e.g. not all ก)
  for (let c = 0; c < 4; c++) {
    assert.ok(counts[c] >= 2, `Answer choice ${c} must appear at least 2 times out of 20, got ${counts[c]}`);
  }
});

test('Multi-subject SVG diagrams cover Physics, Chemistry, Biology, Earth, Math, Thai, English, Social, and Coding with standard quality', () => {
  const cases: Array<[string, string, string]> = [
    ['ชีววิทยา', 'เซลล์สัตว์และเซนทริโอล', 'Animal Cell Cutaway 3D'],
    ['ชีววิทยา', 'โครงสร้างหัวใจและการไหลเวียนเลือด', 'Human Heart'],
    ['ชีววิทยา', 'โครงสร้างดีเอ็นเอและพันธุกรรมของเมนเดล', 'Double Helix'],
    ['ฟิสิกส์', 'การแตกแรงบนพื้นเอียงและกฎของนิวตัน', 'Free-Body Diagram'],
    ['ฟิสิกส์', 'องค์ประกอบของคลื่นและความยาวคลื่น', 'Transverse Wave'],
    ['เคมี', 'แบบจำลองอะตอมและการจัดเรียงอิเล็กตรอน', 'Nuclear Symbol'],
    ['วิทยาศาสตร์', 'โครงสร้างโลก เปลือกโลก เนื้อโลก แก่นโลก', 'Earth Layers'],
    ['คณิตศาสตร์', 'ปริมาตรของทรงกระบอกและกรวย', '3D Geometric Solids'],
    ['คณิตศาสตร์', 'แผนภาพกล่องและควอร์ไทล์', 'Box Plot'],
    ['ภาษาไทย', 'ฉันทลักษณ์กาพย์ยานี 11 และการโยงสัมผัส', 'กาพย์ยานี ๑๑'],
    ['ภาษาอังกฤษ', 'Present Simple and Past Simple Tense grammar', 'English Grammar Timeline'],
    ['สังคมศึกษา', 'กลไกราคา อุปสงค์ และอุปทาน', 'จุดดุลยภาพ'],
    ['วิทยาการคำนวณ', 'การเขียนผังงานอัลกอริทึม', 'Flowchart'],
  ];

  for (const [subject, topic, expectedMarker] of cases) {
    const svg = generateSubjectSvg(subject, topic, 0, 'mc');
    assert.ok(svg.startsWith('<svg') && svg.endsWith('</svg>'), `${subject} (${topic}) must return valid SVG`);
    assert.ok(
      svg.includes(expectedMarker),
      `${subject} (${topic}) SVG must contain marker "${expectedMarker}"`
    );
  }
});

test('DIAGRAM_CATALOG provides publication-grade metadata and supports exam & teach mode toggling', async () => {
  const { DIAGRAM_CATALOG, createCellDiagramSvg, createAnimalCellDiagramSvg, createHumanHeartAndCirculationSvg } = await import('./svg-diagrams.js');
  const { renderSvgByType, generateCustomAiSvg } = await import('./ai.js');

  assert.ok(Array.isArray(DIAGRAM_CATALOG), 'DIAGRAM_CATALOG must be an array');
  assert.ok(DIAGRAM_CATALOG.length >= 30, `Catalog must have at least 30 curriculum diagrams, got ${DIAGRAM_CATALOG.length}`);

  for (const item of DIAGRAM_CATALOG) {
    assert.ok(item.id, 'Item must have an id');
    assert.ok(item.titleTh, `Item ${item.id} must have titleTh`);
    assert.ok(item.subject, `Item ${item.id} must have subject`);
    assert.ok(item.category, `Item ${item.id} must have category`);
    assert.ok(item.gradeLevel, `Item ${item.id} must have gradeLevel`);
    assert.ok(item.standard, `Item ${item.id} must have standard`);
    assert.ok(item.sampleQuestion, `Item ${item.id} must have sampleQuestion`);

    const rendered = renderSvgByType(item.id, 'teach');
    assert.ok(rendered.startsWith('<svg') && rendered.endsWith('</svg>'), `${item.id} must render valid SVG`);
  }

  // Test Plant Cell Exam Mode vs Teach Mode
  const plantTeach = createCellDiagramSvg('teach');
  const plantExam = createCellDiagramSvg('exam');
  assert.ok(plantTeach.includes('Plant Cell Cutaway 3D'), 'Plant cell teach mode has full title');
  assert.ok(plantTeach.includes('ผนังเซลล์'), 'Plant cell teach mode has Thai organelle label');
  assert.ok(plantTeach.includes('Cell Wall'), 'Plant cell teach mode has English organelle label');
  assert.ok(plantExam.includes('แบบทดสอบ'), 'Plant cell exam mode has exam header');
  assert.ok(plantExam.includes('หมายเลข (1)'), 'Plant cell exam mode has numbered blank marker');

  // Test Animal Cell Exam Mode vs Teach Mode
  const animalTeach = createAnimalCellDiagramSvg('teach');
  const animalExam = createAnimalCellDiagramSvg('exam');
  assert.ok(animalTeach.includes('Animal Cell Cutaway 3D'), 'Animal cell teach mode has full title');
  assert.ok(animalExam.includes('แบบทดสอบ'), 'Animal cell exam mode has exam header');

  // Test Human Heart Exam Mode vs Teach Mode
  const heartTeach = createHumanHeartAndCirculationSvg('teach');
  const heartExam = createHumanHeartAndCirculationSvg('exam');
  assert.ok(heartTeach.includes('สรุปกลไกการไหลเวียนเลือด'), 'Heart teach mode has circulation summary');
  assert.ok(heartExam.includes('คำถามประจำแผนภาพ'), 'Heart exam mode has question guide');

  // Test AI generator fallback
  const aiFallback = await generateCustomAiSvg('ทฤษฎีบทพีทาโกรัส', 'คณิตศาสตร์', 'ม.2', 'exam');
  assert.ok(aiFallback.startsWith('<svg') && aiFallback.endsWith('</svg>'), 'AI generator must return valid SVG');
});

test('Creative HOTS exam items have distinct questions without robotic suffixes and include score-boosting tips', () => {
  const exam = generateAccurateCurriculumExamParts(
    { mc: { count: 20, score: 1 }, tf: { count: 4, score: 1 } },
    'ระบบนิเวศและห่วงโซ่อาหาร',
    'ม.3',
    'วิทยาศาสตร์และเทคโนโลยี',
    'เน้นการคิดวิเคราะห์ขั้นสูง (HOTS) และการประยุกต์ใช้เพื่อเพิ่มคะแนนสอบ',
    [],
    'smart',
    'ข้อสอบเตรียมสอบ O-NET วิชาวิทยาศาสตร์'
  );

  const mcItems = exam.parts.mc.items;
  assert.equal(mcItems.length, 20);

  // 1. Ensure all 20 questions are completely unique
  const qSet = new Set(mcItems.map((it: any) => it.question));
  assert.equal(qSet.size, 20, 'All 20 MC questions must be unique');

  // 2. Ensure NO question contains robotic suffixes like "(ประเด็นศึกษาเรื่อง ... ข้อที่ X)"
  for (const it of mcItems) {
    assert.ok(!it.question.includes('ประเด็นศึกษาเรื่อง'), 'Questions must not contain robotic repetitive suffixes');
    assert.ok(!it.question.includes('ข้อที่ '), 'Questions must not append arbitrary item numbers');
  }

  // 3. Ensure explanations contain score-boosting tips for high exam marks
  const hasTips = mcItems.some((it: any) => it.explain.includes('💡 เทคนิคพิชิตคะแนน'));
  assert.ok(hasTips, 'Items must provide score-boosting tips (เทคนิคพิชิตคะแนน) in explanation');

  // 4. Ensure True/False items are distinct and non-repeating
  const tfItems = exam.parts.tf.items;
  assert.equal(tfItems.length, 4);
  const tfSet = new Set(tfItems.map((it: any) => it.statement));
  assert.equal(tfSet.size, 4, 'All True/False statements must be distinct');
});



