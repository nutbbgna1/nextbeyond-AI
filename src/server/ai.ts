import { gptJson, gptText, GPT_MODEL } from './openai.js';
import { storeJsonGet } from './store.js';
import {
  createFractionPieSvg,
  createFractionBarSvg,
  createRightTriangleSvg,
  createParallelLinesSvg,
  createBarChartSvg,
  createClockSvg,
  createPhotosynthesisSvg,
  createElectricCircuitSvg,
  createFoodChainSvg,
  createStatesOfMatterSvg,
  createMagnetFieldSvg,
  createThaiTriyangSvg,
  createPrepositionSvg,
  createCompassDirectionsSvg,
  createSufficiencyEconomySvg,
  createSentenceStructureSvg,
  createSpellingSectionSvg,
  createVennDiagramSvg,
  createLinearSystemGraphSvg,
  createCellDiagramSvg,
  createChemistrySafetySvg,
  createAnimalCellDiagramSvg,
  createHumanHeartAndCirculationSvg,
  createDnaAndGeneticsSvg,
  createForceAndMotionPhysicsSvg,
  createWaveAndOpticsSvg,
  createAtomicStructureSvg,
  createEarthStructureAndTectonicsSvg,
  createGeometry3DSolidsSvg,
  createStatisticsBoxplotAndNormalSvg,
  createThaiPoeticsChantaklakSvg,
  createEnglishTensesTimelineSvg,
  createEconomicsSupplyDemandSvg,
  createAlgorithmFlowchartSvg,
} from './svg-diagrams.js';
import {
  MATH_MC_POOL,
  SCIENCE_MC_POOL,
  THAI_MC_POOL,
  ENGLISH_MC_POOL,
  SOCIAL_MC_POOL,
  SETS_MC_POOL,
  LINEAR_SYSTEM_MC_POOL,
  CELL_BIOLOGY_MC_POOL,
  CHEMISTRY_SAFETY_MC_POOL,
  TF_POOL,
  MATCH_POOL,
  WRITTEN_POOL,
  ExamItemMc,
} from './curriculum-data.js';

export function getApiKey(provider: string = 'openai'): string {
  const settings = storeJsonGet<{ keys?: Record<string, string> }>('settings', 'settings.json');
  if (settings?.keys && settings.keys[provider]) {
    return settings.keys[provider];
  }
  if (provider === 'gemini') {
    return process.env.GEMINI_API_KEY || process.env.API_KEY || '';
  }
  if (provider === 'openai') {
    return process.env.OPENAI_API_KEY || '';
  }
  if (provider === 'openrouter') {
    return process.env.OPENROUTER_API_KEY || '';
  }
  return '';
}

export function hasApiKey(provider: string = 'openai'): boolean {
  const k = getApiKey(provider);
  if (!k || k.includes('ใส่_')) return false;
  const trimmed = k.trim();
  // Filter out internal IAM oauth tokens that lack generativelanguage scope
  if (provider === 'gemini' && trimmed.startsWith('AQ.')) return false;
  return trimmed.length > 10;
}

/**
 * Call OpenAI GPT for structured JSON responses
 */
export async function generateGptJson(
  systemInstruction: string,
  prompt: string,
  _schema?: any,
  _modelName?: string
): Promise<any> {
  return gptJson(systemInstruction, prompt);
}

/**
 * Generate educational SVG diagram by explicit type key
 */
export function renderSvgByType(svgType: string, mode: 'exam' | 'teach' = 'teach'): string {
  switch (svgType) {
    case 'fraction_pie': return createFractionPieSvg(3, 8);
    case 'fraction_bar': return createFractionBarSvg(3, 5);
    case 'right_triangle': return createRightTriangleSvg('6 ซม.', '8 ซม.', 'c');
    case 'parallel_lines': return createParallelLinesSvg();
    case 'bar_chart': return createBarChartSvg();
    case 'clock': return createClockSvg(8, 30);
    case 'venn_diagram': return createVennDiagramSvg();
    case 'linear_graph_1': return createLinearSystemGraphSvg(0);
    case 'linear_graph_2': return createLinearSystemGraphSvg(1);
    case 'linear_graph_3': return createLinearSystemGraphSvg(2);
    case 'geometry_3d': return createGeometry3DSolidsSvg();
    case 'boxplot_stats': return createStatisticsBoxplotAndNormalSvg();
    case 'photosynthesis': return createPhotosynthesisSvg();
    case 'electric_circuit': return createElectricCircuitSvg();
    case 'food_chain': return createFoodChainSvg();
    case 'states_of_matter': return createStatesOfMatterSvg();
    case 'magnet_field': return createMagnetFieldSvg();
    case 'cell_diagram': return createCellDiagramSvg(mode);
    case 'animal_cell': return createAnimalCellDiagramSvg(mode);
    case 'human_heart': return createHumanHeartAndCirculationSvg(mode);
    case 'dna_genetics': return createDnaAndGeneticsSvg();
    case 'physics_force': return createForceAndMotionPhysicsSvg();
    case 'physics_wave': return createWaveAndOpticsSvg();
    case 'atomic_structure': return createAtomicStructureSvg();
    case 'earth_layers': return createEarthStructureAndTectonicsSvg();
    case 'chem_safety': return createChemistrySafetySvg(0);
    case 'chem_glassware': return createChemistrySafetySvg(1);
    case 'thai_triyang': return createThaiTriyangSvg();
    case 'thai_sentence': return createSentenceStructureSvg();
    case 'thai_spelling': return createSpellingSectionSvg();
    case 'thai_poetics': return createThaiPoeticsChantaklakSvg();
    case 'prepositions': return createPrepositionSvg();
    case 'english_tenses': return createEnglishTensesTimelineSvg();
    case 'compass': return createCompassDirectionsSvg();
    case 'sufficiency_economy': return createSufficiencyEconomySvg();
    case 'economics_supply_demand': return createEconomicsSupplyDemandSvg();
    case 'algorithm_flowchart': return createAlgorithmFlowchartSvg();
    default: return '';
  }
}

/**
 * Generate educational SVG diagram based on subject, topic/question, and optional svgType
 */
export function generateSubjectSvg(
  subject: string,
  questionOrTopic: string = '',
  itemIndex: number = 0,
  _partType: string = 'mc',
  svgType: string = ''
): string {
  if (svgType) {
    const direct = renderSvgByType(svgType);
    if (direct) return direct;
  }

  const q = questionOrTopic.toLowerCase();
  const s = (subject + ' ' + questionOrTopic).toLowerCase();

  // 1. High-priority specific topic/question keywords (check question first!)
  if (q.includes('เวนน์') || q.includes('เซต') || q.includes('สับเซต') || q.includes('u ') || q.includes('∪') || q.includes('∩')) {
    return createVennDiagramSvg();
  }
  if (q.includes('ระบบสมการ') || q.includes('สมการเชิงเส้น') || q.includes('จุดตัด') || q.includes('คู่อันดับ') || q.includes('จตุภาค') || (q.includes('กราฟ') && (s.includes('คณิต') || q.includes('สมการ')))) {
    return createLinearSystemGraphSvg(itemIndex);
  }
  if (q.includes('เซลล์สัตว์') || q.includes('เซนทริโอล') || q.includes('ไลโซโซม')) {
    return createAnimalCellDiagramSvg();
  }
  if (q.includes('เซลล์') || q.includes('แวคิวโอล') || q.includes('นิวเคลียส') || q.includes('ไมโทคอนเดรีย') || q.includes('คลอโรพลาสต์') || q.includes('ออร์แกเนลล์')) {
    return createCellDiagramSvg();
  }
  if (q.includes('หัวใจ') || q.includes('ไหลเวียนเลือด') || q.includes('หลอดเลือด') || q.includes('เอออร์ตา') || q.includes('เวนาคาวา')) {
    return createHumanHeartAndCirculationSvg();
  }
  if (q.includes('ดีเอ็นเอ') || q.includes('dna') || q.includes('พันธุกรรม') || q.includes('โครโมโซม') || q.includes('ยีน') || q.includes('เมนเดล')) {
    return createDnaAndGeneticsSvg();
  }
  if (q.includes('บิวเรตต์') || q.includes('ปิเปตต์') || q.includes('บีกเกอร์') || q.includes('ขวดวัดปริมาตร') || q.includes('วัดปริมาตรของเหลว')) {
    return createChemistrySafetySvg(1);
  }
  if (q.includes('สัญลักษณ์') || q.includes('อันตราย') || q.includes('ไวไฟ') || q.includes('กรดเข้มข้น') || q.includes('ปฏิบัติการเคมี') || q.includes('nfpa')) {
    return createChemistrySafetySvg(0);
  }
  if (q.includes('อะตอม') || q.includes('โปรตอน') || q.includes('นิวตรอน') || q.includes('อิเล็กตรอน') || q.includes('ตารางธาตุ') || q.includes('เลขมวล')) {
    return createAtomicStructureSvg();
  }
  if (q.includes('แรง') || q.includes('พื้นเอียง') || q.includes('นิวตัน') || q.includes('ความเร่ง') || q.includes('เสียดทาน') || q.includes('การเคลื่อนที่')) {
    return createForceAndMotionPhysicsSvg();
  }
  if (q.includes('คลื่น') || q.includes('ความยาวคลื่น') || q.includes('แอมพลิจูด') || q.includes('ความถี่') || q.includes('เสียง') || q.includes('เลนส์')) {
    return createWaveAndOpticsSvg();
  }
  if (q.includes('โครงสร้างโลก') || q.includes('เปลือกโลก') || q.includes('เนื้อโลก') || q.includes('แก่นโลก') || q.includes('ธรณี')) {
    return createEarthStructureAndTectonicsSvg();
  }
  if (q.includes('วงจร') || q.includes('ไฟฟ้า') || q.includes('หลอดไฟ') || q.includes('สวิตช์') || q.includes('โอห์ม') || q.includes('ความต้านทาน')) {
    return createElectricCircuitSvg();
  }
  if (q.includes('สังเคราะห์ด้วยแสง') || q.includes('ปากใบ') || q.includes('คลอโรฟิลล์') || q.includes('สร้างอาหารของพืช')) {
    return createPhotosynthesisSvg();
  }
  if (q.includes('โซ่อาหาร') || q.includes('สายใยอาหาร') || q.includes('ตั๊กแตน') || q.includes('เหยี่ยว') || q.includes('ผู้ผลิต') || q.includes('ระบบนิเวศ')) {
    return createFoodChainSvg();
  }
  if (q.includes('แม่เหล็ก') || q.includes('ขั้วเหนือ') || q.includes('ขั้วใต้')) {
    return createMagnetFieldSvg();
  }
  if (q.includes('ของแข็ง') || q.includes('ของเหลว') || q.includes('แก๊ส') || q.includes('สถานะของสาร') || q.includes('อนุภาค') || q.includes('หลอมเหลว') || q.includes('ระเหิด')) {
    return createStatesOfMatterSvg();
  }
  if (q.includes('เศษส่วน') || q.includes('แรเงา') || q.includes('fraction')) {
    return itemIndex % 2 === 0 ? createFractionPieSvg(3, 8) : createFractionBarSvg(3, 5);
  }
  if (q.includes('ทรงกระบอก') || q.includes('กรวย') || q.includes('ปริซึม') || q.includes('พีระมิด') || q.includes('ปริมาตร') || q.includes('พื้นที่ผิว')) {
    return createGeometry3DSolidsSvg();
  }
  if (q.includes('แผนภาพกล่อง') || q.includes('ควอร์ไทล์') || q.includes('มัธยฐาน') || q.includes('พิสัย')) {
    return createStatisticsBoxplotAndNormalSvg();
  }
  if (q.includes('สามเหลี่ยม') || q.includes('มุมฉาก') || q.includes('พีทา') || q.includes('ตรีโกณ') || q.includes('สี่เหลี่ยม') || q.includes('รอบรูป')) {
    return createRightTriangleSvg('6 ซม.', '8 ซม.', 'c');
  }
  if (q.includes('เส้นขนาน') || q.includes('มุมแย้ง') || q.includes('เส้นตัดขวาง')) {
    return createParallelLinesSvg();
  }
  if (q.includes('แผนภูมิ') || q.includes('แท่ง') || q.includes('สถิติ') || q.includes('คะแนนเฉลี่ย') || q.includes('ค่าเฉลี่ย')) {
    return createBarChartSvg();
  }
  if (q.includes('นาฬิกา') || q.includes('เวลา') || q.includes('เข็มสั้น') || q.includes('clock')) {
    return createClockSvg(8, 30);
  }
  if (q.includes('กาพย์') || q.includes('กลอน') || q.includes('ฉันทลักษณ์') || q.includes('คำประพันธ์') || q.includes('สัมผัส')) {
    return createThaiPoeticsChantaklakSvg();
  }
  if (q.includes('ไตรยางศ์') || q.includes('อักษร 3 หมู่') || q.includes('อักษรสูง') || q.includes('อักษรกลาง') || q.includes('อักษรต่ำ') || q.includes('วรรณยุกต์')) {
    return createThaiTriyangSvg();
  }
  if (q.includes('ประโยค') || q.includes('ประธาน') || q.includes('กริยา') || q.includes('กรรม') || q.includes('คำนาม') || q.includes('คำสรรพนาม')) {
    return createSentenceStructureSvg();
  }
  if (q.includes('มาตรา') || q.includes('ตัวสะกด') || q.includes('แม่ก') || q.includes('ก กา') || q.includes('สะกดคำ') || q.includes('คำเป็น') || q.includes('คำตาย')) {
    return createSpellingSectionSvg();
  }
  if (q.includes('tense') || q.includes('grammar') || q.includes('present') || q.includes('past') || q.includes('future') || q.includes('yesterday') || q.includes('tomorrow')) {
    return createEnglishTensesTimelineSvg();
  }
  if (q.includes('preposition') || q.includes('table') || q.includes('ball') || q.includes('under') || q.includes('above')) {
    return createPrepositionSvg();
  }
  if (q.includes('อุปสงค์') || q.includes('อุปทาน') || q.includes('กลไกราคา') || q.includes('ดุลยภาพ') || q.includes('เศรษฐศาสตร์') || q.includes('ตลาด')) {
    return createEconomicsSupplyDemandSvg();
  }
  if (q.includes('ทิศ') || q.includes('เข็มทิศ') || q.includes('แผนที่') || q.includes('ภูมิศาสตร์') || q.includes('มาตราส่วน') || q.includes('ละติจูด')) {
    return createCompassDirectionsSvg();
  }
  if (q.includes('พอเพียง') || q.includes('3 ห่วง') || q.includes('ทฤษฎีใหม่')) {
    return createSufficiencyEconomySvg();
  }
  if (q.includes('อัลกอริทึม') || q.includes('ผังงาน') || q.includes('flowchart') || q.includes('โปรแกรม') || q.includes('รหัสลำลอง') || q.includes('วิทยาการคำนวณ')) {
    return createAlgorithmFlowchartSvg();
  }

  // 2. Subject-level cycle
  if (s.includes('ชีว') || s.includes('เซลล์')) {
    const bioSvgs = [
      () => createCellDiagramSvg(),
      () => createAnimalCellDiagramSvg(),
      () => createHumanHeartAndCirculationSvg(),
      () => createDnaAndGeneticsSvg(),
      () => createPhotosynthesisSvg(),
      () => createFoodChainSvg(),
    ];
    return bioSvgs[itemIndex % bioSvgs.length]();
  }
  if (s.includes('เคมี')) {
    const chemSvgs = [
      () => createChemistrySafetySvg(0),
      () => createChemistrySafetySvg(1),
      () => createAtomicStructureSvg(),
      () => createStatesOfMatterSvg(),
    ];
    return chemSvgs[itemIndex % chemSvgs.length]();
  }
  if (s.includes('ฟิสิกส์')) {
    const physSvgs = [
      () => createForceAndMotionPhysicsSvg(),
      () => createElectricCircuitSvg(),
      () => createWaveAndOpticsSvg(),
      () => createMagnetFieldSvg(),
    ];
    return physSvgs[itemIndex % physSvgs.length]();
  }
  if (s.includes('ดาราศาสตร์') || s.includes('โลก')) {
    return createEarthStructureAndTectonicsSvg();
  }
  if (s.includes('วิทยาการคำนวณ') || s.includes('คอมพิวเตอร์') || s.includes('เทคโนโลยี') || s.includes('coding')) {
    return createAlgorithmFlowchartSvg();
  }
  if (s.includes('วิทยา') || s.includes('วิทย์') || s.includes('science')) {
    const sciSvgs = [
      () => createCellDiagramSvg(),
      () => createPhotosynthesisSvg(),
      () => createElectricCircuitSvg(),
      () => createFoodChainSvg(),
      () => createStatesOfMatterSvg(),
      () => createHumanHeartAndCirculationSvg(),
      () => createForceAndMotionPhysicsSvg(),
      () => createAtomicStructureSvg(),
      () => createEarthStructureAndTectonicsSvg(),
      () => createMagnetFieldSvg(),
      () => createChemistrySafetySvg(1),
    ];
    return sciSvgs[itemIndex % sciSvgs.length]();
  }
  if (s.includes('คณิต') || s.includes('math') || s.includes('เลข')) {
    const mathSvgs = [
      () => createFractionPieSvg(3, 8),
      () => createLinearSystemGraphSvg(itemIndex),
      () => createVennDiagramSvg(),
      () => createRightTriangleSvg('6 ซม.', '8 ซม.', 'c'),
      () => createGeometry3DSolidsSvg(),
      () => createStatisticsBoxplotAndNormalSvg(),
      () => createFractionBarSvg(3, 5),
      () => createBarChartSvg(),
      () => createParallelLinesSvg(),
      () => createClockSvg(8, 30),
    ];
    return mathSvgs[itemIndex % mathSvgs.length]();
  }
  if (s.includes('ไทย')) {
    const thaiSvgs = [
      () => createThaiTriyangSvg(),
      () => createSentenceStructureSvg(),
      () => createSpellingSectionSvg(),
      () => createThaiPoeticsChantaklakSvg(),
    ];
    return thaiSvgs[itemIndex % thaiSvgs.length]();
  }
  if (s.includes('อังกฤษ') || s.includes('eng')) {
    const engSvgs = [
      () => createPrepositionSvg(),
      () => createEnglishTensesTimelineSvg(),
      () => createClockSvg(8, 30),
    ];
    return engSvgs[itemIndex % engSvgs.length]();
  }
  if (s.includes('สังคม') || s.includes('ประวัติ') || s.includes('ภูมิศาสตร์') || s.includes('เศรษฐ')) {
    const socSvgs = [
      () => createCompassDirectionsSvg(),
      () => createSufficiencyEconomySvg(),
      () => createEconomicsSupplyDemandSvg(),
    ];
    return socSvgs[itemIndex % socSvgs.length]();
  }

  const allSvgs = [
    () => createFractionPieSvg(3, 8),
    () => createPhotosynthesisSvg(),
    () => createRightTriangleSvg('6 ซม.', '8 ซม.', 'c'),
    () => createElectricCircuitSvg(),
    () => createFoodChainSvg(),
    () => createThaiTriyangSvg(),
    () => createCompassDirectionsSvg(),
    () => createStatesOfMatterSvg(),
    () => createGeometry3DSolidsSvg(),
    () => createAlgorithmFlowchartSvg(),
  ];
  return allSvgs[itemIndex % allSvgs.length]();
}

/**
 * Determine whether a question should include an illustration/diagram
 * - figMode === 'none' | false -> false
 * - figMode === 'all' -> true
 * - figMode === 'smart' | 'auto' | true -> true if the question explicitly references a figure/diagram/graph OR selectively (~40% of items)
 */
export function shouldAttachFigure(
  figMode: boolean | string | undefined,
  questionText: string,
  needsFigureFlag?: boolean,
  itemIndex: number = 0
): boolean {
  if (figMode === false || figMode === 'none') return false;
  if (figMode === 'all') return true;

  // Smart / realistic exam mode (บางข้อมีรูปประกอบ บางข้อไม่มีรูปประกอบ เหมือนข้อสอบจริง)
  if (needsFigureFlag === true) return true;
  if (needsFigureFlag === false) return false;

  const q = String(questionText || '').toLowerCase();
  const visualCues = [
    'จากแผนภาพ', 'จากกราฟ', 'จากรูป', 'จากภาพ', 'พิจารณารูป', 'สังเกต',
    'แผนภูมิ', 'วงจร', 'หน้าปัด', 'แรเงา', 'สัญลักษณ์', 'เข็มทิศ',
    'สายใยอาหาร', 'หมายเลข', 'ตาราง', 'picture', 'clock', 'diagram', 'graph',
  ];
  if (visualCues.some((cue) => q.includes(cue))) {
    return true;
  }

  // Otherwise attach to roughly every 3rd question so the exam has a natural mix of visual and text questions
  return itemIndex % 3 === 0;
}

/**
 * Generate custom academic SVG diagram using GPT or fallback
 */
export async function generateCustomAiSvg(
  prompt: string,
  subject: string = 'วิทยาศาสตร์',
  grade: string = 'ม.2',
  mode: 'exam' | 'teach' = 'teach'
): Promise<string> {
  if (hasApiKey('openai')) {
    try {
      const isExam = mode === 'exam';
      const systemInstruction = `You are a professional graphic designer and educational curriculum specialist creating vector diagrams (SVG) for textbooks and school exams in Thailand.
Generate a valid standalone SVG diagram with viewBox="0 0 680 420". Use clear Thai labels and accurate academic content.
Mode: ${isExam ? 'EXAM MODE: use numbered blank labels for students.' : 'TEACHING MODE: include named labels and explanations.'}
Return only the SVG code.`;
      const text = await gptText(systemInstruction, `Grade: ${grade}; Subject: ${subject}; Topic: ${prompt}; Mode: ${mode}`);
      const svgMatch = text.match(/<svg[\s\S]*?<\/svg>/i);
      if (svgMatch) return svgMatch[0];
    } catch (err) {
      console.warn('GPT custom SVG generation fallback:', err);
    }
  }

  // Fallback to curriculum diagram generator
  return generateSubjectSvg(subject, prompt, 0, 'mc', '');
}

/**
 * Generate high-creativity, standard-aligned exam items using GPT
 */
export async function generateExamWithGpt(
  subject: string,
  grade: string,
  scope: string,
  title: string,
  hint: string,
  partsCfg: Record<string, any>,
  indicators: string[],
  figMode: 'smart' | 'all' | 'none',
  creativeMode: string = 'hots'
): Promise<any> {
  if (!hasApiKey('openai')) throw new Error('NO_OPENAI_KEY');

  const mcCount = Number(partsCfg.mc?.count || (typeof partsCfg.mc === 'number' ? partsCfg.mc : 0));
  const tfCount = Number(partsCfg.tf?.count || (typeof partsCfg.tf === 'number' ? partsCfg.tf : 0));
  const matchCount = Number(partsCfg.match?.count || (typeof partsCfg.match === 'number' ? partsCfg.match : 0));
  const writtenCount = Number(partsCfg.written?.count || (typeof partsCfg.written === 'number' ? partsCfg.written : 0));

  const systemInstruction = `คุณเป็นกรรมการออกข้อสอบมาตรฐานระดับชาติและผู้เชี่ยวชาญการวัดผลการศึกษา (สพฐ., สทศ. ONET, PISA) ของกระทรวงศึกษาธิการไทย
ภารกิจ: ออกข้อสอบวิชา "${subject}" ระดับชั้น "${grade}" โดยใช้ AI คิดวิเคราะห์โจทย์ใหม่อย่างสร้างสรรค์ ไม่ซ้ำซาก เพื่อฝึกให้นักเรียนทำคะแนนสอบได้สูง
เกณฑ์สำคัญ:
1. **คิดโจทย์เชิงวิเคราะห์ (Higher-Order Thinking Skills: HOTS)**: ทุกข้อต้องมีบริบท สถานการณ์จำลอง ผลการทดลอง ตารางข้อมูล หรือการแก้ปัญหาในชีวิตจริง ห้ามถามความจำสั้นๆ ซ้ำไปซ้ำมา
2. **ไม่ซ้ำกันเด็ดขาด**: แต่ละข้อต้องทดสอบประเด็น ทฤษฎี หรือมุมมองที่แตกต่างกันอย่างสิ้นเชิง
3. **การกระจายเฉลยอย่างสมดุล (mc.answerIndex)**: คำตอบที่ถูกต้องต้องกระจายเฉลี่ยเท่าๆ กันในตัวเลือก 0 (ก), 1 (ข), 2 (ค), 3 (ง) ห้ามตอบ ก. ซ้ำกันเกิน 2 ข้อ
4. **ตัวลวงคุณภาพสูง**: ตัวเลือกที่ผิดต้องเป็นตัวลวงที่น่าเชื่อถือและดักจับความเข้าใจผิดที่พบบ่อย (Common Misconceptions) ของนักเรียน
5. **คำอธิบายเฉลยที่เพิ่มคะแนน (explain)**: อธิบายเหตุผลตามหลักวิชาการ + เสริม "💡 เทคนิคพิชิตคะแนน:" บอกวิธีตัดชอยส์หรือวิธีคิดลัด
6. **รูปประกอบ (needsFigure)**: หากเป็นข้อที่ต้องพิจารณาแผนภาพ กราฟ หรือโครงสร้าง ให้ระบุ needsFigure: true`;

  const prompt = `ออกข้อสอบอย่างสร้างสรรค์:
- วิชา: ${subject}
- ระดับชั้น: ${grade}
- ขอบเขตเนื้อหา: ${scope}
${title ? `- หัวข้อการสอบ: ${title}\n` : ''}${hint ? `- คำแนะนำเพิ่มเติม: ${hint}\n` : ''}- แนวคิด: ${creativeMode === 'hots' ? 'เน้นการคิดวิเคราะห์ขั้นสูง (HOTS) และฝึกโจทย์แนว O-NET / สพฐ. เพื่อเพิ่มคะแนนสอบ' : 'เน้นสถานการณ์จริงและการประยุกต์ใช้'}

สเปกข้อสอบที่ต้องการ:
${mcCount > 0 ? `- ปรนัย 4 ตัวเลือก (mc): จำนวน ${mcCount} ข้อ (ต้องมี 4 ตัวเลือกเสมอ)` : ''}
${tfCount > 0 ? `- ถูก/ผิด (tf): จำนวน ${tfCount} ข้อ (โจทย์สถานการณ์สมมุติและข้อความวิเคราะห์)` : ''}
${matchCount > 0 ? `- จับคู่ (match): จำนวน ${matchCount} คู่ (ซ้ายเป็นประเด็น/สถานการณ์ ขวาเป็นความสัมพันธ์/ผลลัพธ์)` : ''}
${writtenCount > 0 ? `- อัตนัย (written): จำนวน ${writtenCount} ข้อ (โจทย์ที่ต้องแสดงขั้นตอนวิเคราะห์หรือวิธีคำนวณ)` : ''}

ตอบเป็น JSON ตามโครงสร้างนี้เท่านั้น:
{
  "mc": [
    {
      "question": "คำถามสถานการณ์...",
      "choices": ["ตัวเลือก ก", "ตัวเลือก ข", "ตัวเลือก ค", "ตัวเลือก ง"],
      "answerIndex": 1,
      "explain": "คำอธิบายทางวิชาการ... 💡 เทคนิคพิชิตคะแนน: จุดสังเกตในการตัดชอยส์...",
      "level": 3,
      "needsFigure": false,
      "svgKeyword": ""
    }
  ],
  "tf": [
    {
      "statement": "ข้อความสถานการณ์...",
      "answer": true,
      "explain": "คำอธิบายเหตุผล... 💡 เทคนิคพิชิตคะแนน: ...",
      "level": 2
    }
  ],
  "match": [
    {
      "left": "ประเด็นทางซ้าย",
      "right": "คู่ความสัมพันธ์ทางขวา",
      "explain": "คำอธิบาย...",
      "level": 2
    }
  ],
  "written": [
    {
      "question": "โจทย์สถานการณ์ที่ต้องแสดงวิธีคิด...",
      "solution": ["ขั้นที่ 1...", "ขั้นที่ 2...", "ขั้นที่ 3..."],
      "answer": "แนวคำตอบและเกณฑ์ให้คะแนน...",
      "lines": 6,
      "level": 3
    }
  ]
}`;

  const data = await gptJson(systemInstruction, prompt);
  const usedModelName = GPT_MODEL;

  const parts: Record<string, any> = {};
  let totalItems = 0;
  let totalScore = 0;
  const indCodes = indicators.length > 0 ? indicators : [getDefaultIndicatorCode(subject, grade)];

  if (mcCount > 0 && Array.isArray(data.mc) && data.mc.length > 0) {
    const mcScore = Number(partsCfg.mc?.score) || 1;
    const items = data.mc.slice(0, mcCount).map((it: any, i: number) => {
      const qText = String(it.question || '');
      const attach = shouldAttachFigure(figMode, qText, Boolean(it.needsFigure), i);
      const ansIdx = Math.max(0, Math.min(3, Number(it.answerIndex) || 0));
      return {
        question: qText,
        choices: Array.isArray(it.choices) && it.choices.length === 4 ? it.choices : ['ก', 'ข', 'ค', 'ง'],
        answerIndex: ansIdx,
        explain: String(it.explain || ''),
        level: Math.max(1, Math.min(4, Number(it.level) || 2)),
        score: mcScore,
        indicator: indCodes[i % indCodes.length],
        source: 'ai',
        model: GPT_MODEL,
        figure: attach ? generateSubjectSvg(subject, `${scope} ${it.svgKeyword || ''} ${qText}`, i, 'mc') : '',
      };
    });
    parts.mc = { score: mcScore, items };
    totalItems += items.length;
    totalScore += items.length * mcScore;
  }

  if (tfCount > 0 && Array.isArray(data.tf) && data.tf.length > 0) {
    const tfScore = Number(partsCfg.tf?.score) || 1;
    const items = data.tf.slice(0, tfCount).map((it: any, i: number) => {
      const stmt = String(it.statement || '');
      const attach = shouldAttachFigure(figMode, stmt, false, i);
      return {
        statement: stmt,
        answer: Boolean(it.answer),
        explain: String(it.explain || ''),
        level: Math.max(1, Math.min(4, Number(it.level) || 2)),
        score: tfScore,
        indicator: indCodes[i % indCodes.length],
        source: 'ai',
        model: GPT_MODEL,
        figure: attach ? generateSubjectSvg(subject, `${scope} ${stmt}`, i, 'tf') : '',
      };
    });
    parts.tf = { score: tfScore, items };
    totalItems += items.length;
    totalScore += items.length * tfScore;
  }

  if (matchCount > 0 && Array.isArray(data.match) && data.match.length > 0) {
    const matchScore = Number(partsCfg.match?.score) || 1;
    const items = data.match.slice(0, matchCount).map((it: any, i: number) => ({
      left: String(it.left || ''),
      right: String(it.right || ''),
      explain: String(it.explain || ''),
      level: Math.max(1, Math.min(4, Number(it.level) || 2)),
      score: matchScore,
      indicator: indCodes[i % indCodes.length],
      source: 'ai',
      model: GPT_MODEL,
    }));
    parts.match = { score: matchScore, items };
    totalItems += items.length;
    totalScore += items.length * matchScore;
  }

  if (writtenCount > 0 && Array.isArray(data.written) && data.written.length > 0) {
    const writtenScore = Number(partsCfg.written?.score) || 5;
    const items = data.written.slice(0, writtenCount).map((it: any, i: number) => {
      const qText = String(it.question || '');
      const attach = shouldAttachFigure(figMode, qText, false, i);
      return {
        question: qText,
        solution: Array.isArray(it.solution) ? it.solution : [String(it.solution || '')],
        answer: String(it.answer || ''),
        lines: Number(it.lines) || 6,
        level: Math.max(1, Math.min(4, Number(it.level) || 3)),
        score: writtenScore,
        indicator: indCodes[i % indCodes.length],
        source: 'ai',
        model: GPT_MODEL,
        figure: attach ? generateSubjectSvg(subject, `${scope} ${qText}`, i, 'written') : '',
      };
    });
    parts.written = { score: writtenScore, items };
    totalItems += items.length;
    totalScore += items.length * writtenScore;
  }

  return { parts, totalItems, totalScore, model: usedModelName };
}

/**
 * Extract clean list of sub-topics / units from user scope, title, and hint
 */
export function extractTargetUnits(scope: string, title: string, hint: string, subject: string): {
  units: string[];
  focusedTopic: string;
} {
  const cleanTitle = String(title || '')
    .replace(/^(ข้อสอบ|แบบทดสอบ)(กลางภาค|ปลายภาค|ท้ายหน่วย|ก่อนเรียน|หลังเรียน)?\s*/g, '')
    .replace(new RegExp(subject, 'g'), '')
    .replace(/(ป\.\d|ม\.\d)/g, '')
    .trim();

  const rawScope = String(scope || '').trim();
  const rawHint = String(hint || '').trim();

  const splitUnits = (str: string) =>
    str
      .split(/[,،;\n•·/]+/)
      .map((u) => u.trim())
      .filter((u) => u.length >= 2 && u !== 'การสอบวัดผลสัมฤทธิ์');

  const scopeUnits = splitUnits(rawScope);
  const hintUnits = splitUnits(rawHint);

  // If user typed a specific custom title or hint, or if scope has only 1-3 focused topics
  let focusedTopic = '';
  if (rawHint) {
    focusedTopic = rawHint;
  } else if (cleanTitle && cleanTitle.length >= 2 && !cleanTitle.includes('ปีการศึกษา')) {
    focusedTopic = cleanTitle;
  } else if (scopeUnits.length >= 1 && scopeUnits.length <= 3) {
    focusedTopic = scopeUnits.join(' ');
  }

  const units = [
    ...(cleanTitle ? [cleanTitle] : []),
    ...hintUnits,
    ...scopeUnits,
  ].filter(Boolean);

  return {
    units: units.length > 0 ? units : [subject || 'สาระการเรียนรู้แกนกลาง'],
    focusedTopic,
  };
}

/**
 * Synthesize an accurate, curriculum-aligned Multiple Choice item strictly for the given subject and unit/topic!
 */
export function synthesizeSubjectTopicMc(
  subject: string,
  unitTopic: string,
  grade: string,
  index: number,
  score: number
): any {
  const s = subject.toLowerCase();
  const u = (unitTopic || subject).trim();
  const uLow = u.toLowerCase();
  const variant = index + 1;

  // 1. Specific High-Demand Topics (Sets, Linear Equations, Cells, Chemistry Safety)
  if (uLow.includes('เซต') || uLow.includes('เวนน์') || uLow.includes('สับเซต')) {
    const nElem = (index % 4) + 3; // 3, 4, 5, 6
    const totalSub = Math.pow(2, nElem);
    const properSub = totalSub - 1;
    const uTotal = 50 + (index % 5) * 10;
    const nA = 25 + (index % 4) * 3;
    const nB = 22 + (index % 4) * 2;
    const nInter = 10 + (index % 3) * 2;
    const nUnion = nA + nB - nInter;
    const setTemplates = [
      {
        question: `กำหนดให้เซต A มีสมาชิกที่แตกต่างกัน ${nElem} ตัว จำนวนสับเซตแท้ทั้งหมดของเซต A เท่ากับข้อใด?`,
        choices: [`${properSub} สับเซต`, `${totalSub} สับเซต`, `${nElem * 2} สับเซต`, `${totalSub + 1} สับเซต`],
        answerIndex: 0,
        explain: `เมื่อ n(A) = ${nElem} จำนวนสับเซตทั้งหมดคือ 2^${nElem} = ${totalSub} สับเซต และสับเซตแท้คือ 2^${nElem} - 1 = ${properSub} สับเซต 💡 เทคนิคพิชิตคะแนน: ข้อสอบมักลวงคำว่า "สับเซตแท้" อย่าลืมหักเซตตัวเองออก 1 เสมอ`,
        svgType: '',
        needsFigure: false,
        indicator: `ค 1.1 ${grade}/1`,
      },
      {
        question: `จากการสำรวจกลุ่มตัวอย่าง ${uTotal} คน พบว่ามีผู้ชอบอ่านหนังสือพิมพ์ A จำนวน ${nA} คน ชอบอ่านหนังสือพิมพ์ B จำนวน ${nB} คน และชอบอ่านทั้งสองฉบับ ${nInter} คน จงหาจำนวนผู้ที่ไม่ชอบอ่านหนังสือพิมพ์ทั้งสองฉบับนี้เลย`,
        choices: [
          `${uTotal - nUnion} คน`,
          `${uTotal - (nA + nB)} คน`,
          `${nUnion} คน`,
          `${uTotal - nInter} คน`,
        ],
        answerIndex: 0,
        explain: `จากสูตร n(A ∪ B) = n(A) + n(B) - n(A ∩ B) = ${nA} + ${nB} - ${nInter} = ${nUnion} คน ดังนั้นผู้ที่ไม่ชอบทั้งสองฉบับ = n(U) - n(A ∪ B) = ${uTotal} - ${nUnion} = ${uTotal - nUnion} คน 💡 เทคนิคพิชิตคะแนน: วาดแผนภาพเวนน์ 2 วง ใส่ส่วนทับซ้อนตรงกลางก่อน แล้วค่อยหักลบพื้นที่ด้านนอก`,
        svgType: 'venn_diagram',
        needsFigure: true,
        indicator: `ค 1.1 ${grade}/1`,
      },
      {
        question: `กำหนดให้ A = { x ∈ I | x² - ${(variant + 1) * (variant + 1)} = 0 } และ B = { x ∈ N | x ≤ ${variant + 2} } ข้อใดแสดงเซต A ∩ B ได้ถูกต้อง?`,
        choices: [
          `{ ${variant + 1} }`,
          `{ -${variant + 1}, ${variant + 1} }`,
          `∅`,
          `{ 1, 2, ..., ${variant + 1} }`,
        ],
        answerIndex: 0,
        explain: `A คือจำนวนเต็มที่ยกกำลังสองได้ ${(variant + 1) * (variant + 1)} จึงได้ A = { -${variant + 1}, ${variant + 1} } ส่วน B เป็นจำนวนนับ (N) ที่ไม่เกิน ${variant + 2} ดังนั้นสมาชิกที่ร่วมกัน (A ∩ B) มีเพียงจำนวนบวกคือ { ${variant + 1} } 💡 เทคนิคพิชิตคะแนน: สังเกตเงื่อนไข x ∈ N (จำนวนนับ) ต้องเป็นจำนวนเต็มบวกเท่านั้น ห้ามนำจำนวนลบมารวม`,
        svgType: '',
        needsFigure: false,
        indicator: `ค 1.1 ${grade}/1`,
      },
      {
        question: `พิจารณาข้อความเกี่ยวกับเพาเวอร์เซต: กำหนด A = { ∅, {1} } ข้อใดกล่าวถูกต้องที่สุด?`,
        choices: [
          `{ ∅ } ∈ P(A) และ ∅ ∈ P(A)`,
          `P(A) มีสมาชิกทั้งหมด 2 ตัว`,
          `{ 1 } ∈ P(A)`,
          `P(A) = { ∅, {1} }`,
        ],
        answerIndex: 0,
        explain: `A มีสมาชิก 2 ตัวคือ ∅ และ {1} ดังนั้น P(A) จะมีสมาชิก 2² = 4 ตัว ได้แก่ ∅, {∅}, {{1}}, และ {∅, {1}} ดังนั้นทั้ง {∅} และ ∅ ล้วนเป็นสมาชิกของ P(A) 💡 เทคนิคพิชิตคะแนน: เซตว่าง ∅ เป็นสับเซตของทุกเซตเสมอ ดังนั้น ∅ จึงเป็นสมาชิกของ P(A) เสมอ`,
        svgType: '',
        needsFigure: false,
        indicator: `ค 1.1 ${grade}/1`,
      },
    ];
    const t = setTemplates[index % setTemplates.length];
    return { ...t, level: ((index % 3) + 2), score, source: 'ai' };
  }

  if (uLow.includes('ระบบสมการ') || uLow.includes('สมการเชิงเส้น')) {
    const xVal = (index % 5) + 2;
    const yVal = (index % 4) + 3;
    const sumXY = xVal + yVal;
    const diffXY = xVal - yVal;
    const adultPrice = 50 + (index % 4) * 10;
    const childPrice = 20 + (index % 3) * 5;
    const eqTemplates = [
      {
        question: `กำหนดระบบสมการเชิงเส้นสองตัวแปร: x + y = ${sumXY} และ x - y = ${diffXY} คำตอบของระบบสมการ (x, y) สอดคล้องกับข้อใด?`,
        choices: [
          `(${xVal}, ${yVal})`,
          `(${yVal}, ${xVal})`,
          `(${xVal + 1}, ${yVal - 1})`,
          `ไม่มีคำตอบในระบบจำนวนจริง`,
        ],
        answerIndex: 0,
        explain: `นำสมการ (1) + (2): 2x = ${sumXY + diffXY} จะได้ x = ${xVal} นำไปแทนใน (1) จะได้ y = ${sumXY} - ${xVal} = ${yVal} 💡 เทคนิคพิชิตคะแนน: ใช้วิธีกำจัดตัวแปร (Elimination) เมื่อสัมประสิทธิ์หน้า y มีเครื่องหมายตรงข้ามกัน จะบวกกันได้คำตอบใน 10 วินาที`,
        svgType: `linear_graph_${(index % 3) + 1}`,
        needsFigure: false,
        indicator: `ค 1.3 ${grade}/3`,
      },
      {
        question: `ตั๋วเข้าชมสวนสัตว์สำหรับผู้ใหญ่ราคาใบละ ${adultPrice} บาท และเด็กราคาใบละ ${childPrice} บาท ครอบครัวหนึ่งซื้อตั๋วรวม 10 ใบ จ่ายเงินไปทั้งหมด ${(4 * adultPrice) + (6 * childPrice)} บาท มีตั๋วผู้ใหญ่กี่ใบ?`,
        choices: [
          '4 ใบ',
          '6 ใบ',
          '5 ใบ',
          '3 ใบ',
        ],
        answerIndex: 0,
        explain: `ให้ผู้ใหญ่ x ใบ เด็ก 10 - x ใบ ตั้งสมการ: ${adultPrice}x + ${childPrice}(10 - x) = ${(4 * adultPrice) + (6 * childPrice)} แก้สมการได้ x = 4 ใบ 💡 เทคนิคพิชิตคะแนน: แทนค่าชอยส์ตรวจคำตอบในโจทย์เงิน/ตั๋วจะเร็วกว่าการตั้งสมการซับซ้อน`,
        svgType: '',
        needsFigure: false,
        indicator: `ค 1.3 ${grade}/3`,
      },
      {
        question: `พิจารณากราฟเส้นตรงสองเส้น L₁: 2x - 3y = 6 และ L₂: 4x - 6y = k หากระบบสมการนี้ "มีคำตอบมากมายนับไม่ถ้วน" ค่าของ k ต้องมีค่าเท่าใด?`,
        choices: [
          '12',
          '6',
          '-12',
          '0',
        ],
        answerIndex: 0,
        explain: `การที่ระบบสมการเชิงเส้นมีคำตอบมากมายไม่จำกัด แสดงว่ากราฟทั้งสองเส้นทับกันสนิท (อัตราส่วนสัมประสิทธิ์เท่ากันทุกพจน์): 2/4 = -3/-6 = 6/k ดังนั้น 1/2 = 6/k จะได้ k = 12 💡 เทคนิคพิชิตคะแนน: จำสูตรลัด a₁/a₂ = b₁/b₂ = c₁/c₂ คือเส้นทับกัน (มีคำตอบนับไม่ถ้วน), ถ้า a₁/a₂ = b₁/b₂ ≠ c₁/c₂ คือขนานกัน (ไม่มีคำตอบ)`,
        svgType: 'linear_graph_2',
        needsFigure: true,
        indicator: `ค 1.3 ${grade}/3`,
      },
    ];
    const t = eqTemplates[index % eqTemplates.length];
    return { ...t, level: ((index % 3) + 2), score, source: 'ai' };
  }

  if (uLow.includes('เซลล์') || s.includes('ชีววิทยา') || s.includes('ชีว')) {
    const bioTemplates = [
      {
        question: `ในการทดลองแช่เซลล์เยื่อหอม (เซลล์พืช) และเซลล์เม็ดเลือดแดง (เซลล์สัตว์) ลงใน "สารละลายน้ำเกลือเข้มข้นสูง (Hypertonic Solution)" เป็นเวลา 15 นาที จะสังเกตเห็นผลลัพธ์ตามข้อใด?`,
        choices: [
          'เซลล์เยื่อหอมเกิดพลาสโมไลซิส (ไซโทพลาซึมหดตัวแต่ผนังเซลล์คงรูป) ส่วนเซลล์เม็ดเลือดแดงเหี่ยวและแตกตัว',
          'เซลล์เยื่อหอมเต่งจนแตก แต่เซลล์เม็ดเลือดแดงยังคงรูปเดิมได้',
          'ทั้งสองเซลล์ดูดน้ำเข้าจนเต่งและแตกออกพร้อมกัน',
          'ไม่มีการเปลี่ยนแปลงใดๆ เกิดขึ้น เพราะน้ำเคลื่อนที่เข้าออกเท่ากัน',
        ],
        answerIndex: 0,
        explain: `ในสารละลาย Hypertonic น้ำจะออสโมซิสออกจากเซลล์ เซลล์พืชมีผนังเซลล์ (Cell Wall) ช่วยคงรูปร่างภายนอกไว้แต่เยื่อหุ้มเซลล์จะหดตัวเข้าด้านใน (Plasmolysis) ขณะที่เซลล์สัตว์ไม่มีผนังเซลล์จึงเหี่ยวลงอย่างชัดเจน 💡 เทคนิคพิชิตคะแนน: จำคีย์เวิร์ด "พืชไม่แตกเพราะมี Cell Wall สัตว์ไม่มี Cell Wall จึงเหี่ยวหรือแตกได้"`,
        svgType: 'cell_diagram',
        needsFigure: true,
        indicator: `ว 1.2 ${grade}/1`,
      },
      {
        question: `หากยาปฏิชีวนะชนิดหนึ่งมีฤทธิ์ยับยั้งการทำงานของ "ไรโบโซม (Ribosome)" ภายในเซลล์แบคทีเรียอย่างจำเพาะเจาะจง กระบวนการทางชีวเคมีใดของเซลล์จะหยุดชะงักลงทันที?`,
        choices: [
          'การสังเคราะห์โปรตีนและเอนไซม์ที่จำเป็นต่อการดำรงชีวิต',
          'การจำลองตัวเองของสารพันธุกรรม DNA ในนิวเคลียส',
          'การสร้างพลังงาน ATP ในกระบวนการหายใจระดับเซลล์',
          'การขนส่งสารผ่านกระบวนการฟาโกไซโทซิส',
        ],
        answerIndex: 0,
        explain: 'ไรโบโซม (Ribosome) มีหน้าที่หลักในการแปลรหัสพันธุกรรม (Translation) เพื่อสังเคราะห์โปรตีน เมื่อไรโบโซมถูกยับยั้ง เซลล์จะไม่สามารถสร้างโปรตีนโครงสร้างและเอนไซม์ได้ 💡 เทคนิคพิชิตคะแนน: จำหน้าที่หลักออร์แกเนลล์ให้แม่น: ไรโบโซม = โปรตีน, ไมโทคอนเดรีย = ATP, กอลจิ = บรรจุ/ส่งออก',
        svgType: 'cell_diagram',
        needsFigure: false,
        indicator: `ว 1.2 ${grade}/1`,
      },
      {
        question: `จากแผนภาพโครงสร้างเซลล์พืช 3 มิติ โครงสร้างที่เป็นแหล่งสร้างพลังงานในรูป ATP ให้แก่เซลล์พืชผ่านการหายใจระดับเซลล์ตรงกับออร์แกเนลล์ใด?`,
        choices: [
          'ไมโทคอนเดรีย (Mitochondria)',
          'คลอโรพลาสต์ (Chloroplast)',
          'แวคิวโอล (Central Vacuole)',
          'ร่างแหเอนโดพลาซึมชนิดเรียบ (SER)',
        ],
        answerIndex: 0,
        explain: 'ไมโทคอนเดรียทำหน้าที่สลายสารอาหารเพื่อให้ได้พลังงานเคมีในรูป ATP ทั้งในเซลล์พืชและเซลล์สัตว์ ส่วนคลอโรพลาสต์ทำหน้าที่เปลี่ยนพลังงานแสงเป็นน้ำตาลกลูโคส 💡 เทคนิคพิชิตคะแนน: นักเรียนมักเข้าใจผิดว่าพืชมีแต่คลอโรพลาสต์ไม่มีไมโทคอนเดรีย ความจริงพืช "มีทั้งสองอย่าง" เพื่อสร้างอาหารและนำอาหารมาสร้างพลังงาน',
        svgType: 'cell_diagram',
        needsFigure: true,
        indicator: `ว 1.2 ${grade}/1`,
      },
      {
        question: `โครงสร้างคู่ใดต่อไปนี้ที่พบใน "เซลล์สัตว์" แต่ไม่พบใน "เซลล์พืชชั้นสูง"?`,
        choices: [
          'เซนทริโอล (Centriole) และ ไลโซโซม (Lysosome)',
          'ผนังเซลล์ และ พลาสโมเดสมาตา',
          'คลอโรพลาสต์ และ แวคิวโอลขนาดใหญ่',
          'เยื่อหุ้มเซลล์ และ ไรโบโซม',
        ],
        answerIndex: 0,
        explain: 'เซนทริโอล (ช่วยสร้างเส้นใยสปินเดิลในการแบ่งเซลล์สัตว์) และไลโซโซม (ย่อยสลายสาร) เป็นโครงสร้างที่มีในเซลล์สัตว์แต่ไม่พบในเซลล์พืชชั้นสูง 💡 เทคนิคพิชิตคะแนน: ข้อสอบ ONET มักออกเปรียบเทียบพืช vs สัตว์เสมอ: พืชมี Cell Wall + Chloroplast สัตว์มี Centriole + Lysosome',
        svgType: 'animal_cell',
        needsFigure: true,
        indicator: `ว 1.2 ${grade}/1`,
      },
    ];
    const t = bioTemplates[index % bioTemplates.length];
    return { ...t, level: ((index % 3) + 2), score, source: 'ai' };
  }

  if (uLow.includes('เคมี') || uLow.includes('เลขนัยสำคัญ') || s.includes('เคมี')) {
    const chemTemplates = [
      {
        question: `ในการเจือจางกรดซัลฟิวริกเข้มข้น (Concentrated H₂SO₄) ในห้องปฏิบัติการ ข้อควรระวังด้านความปลอดภัยที่สำคัญที่สุดคือข้อใด?`,
        choices: [
          'ต้องเทกรดเข้มข้นลงในน้ำอย่างช้าๆ พร้อมคนตลอดเวลา ห้ามเทน้ำลงในกรดเด็ดขาด',
          'เทน้ำลงในกรดเข้มข้นอย่างรวดเร็วเพื่อให้กรดเจือจางทันที',
          'ใช้อุปกรณ์พลาสติกธรรมดาในการผสมเพื่อป้องกันการแตกหัก',
          'ทำการทดลองในภาชนะปิดสนิทโดยไม่เปิดระบายอากาศ',
        ],
        answerIndex: 0,
        explain: 'การละลายของกรดเข้มข้นในน้ำเป็นปฏิกิริยาคายความร้อนสูงมาก (Exothermic) หากเทน้ำลงในกรด น้ำที่มีความหนาแน่นน้อยกว่าจะเดือดทันทีและพาลดกรดกระเด็นใส่ผู้ทำการทดลอง 💡 เทคนิคพิชิตคะแนน: ท่องจำกฎห้องแล็บ: "กรดลงน้ำ ช้าๆ คนตลอด ห้ามน้ำลงกรดเด็ดขาด"',
        svgType: 'chem_safety',
        needsFigure: true,
        indicator: `ว 2.1 ${grade}/1`,
      },
      {
        question: `นักเรียนชั่งสารเคมี A ได้ 14.50 กรัม ผสมกับสารเคมี B ได้ 3.2 กรัม ผลรวมของมวลสารตามหลักการนับ "เลขนัยสำคัญ" มีค่าตรงกับข้อใด?`,
        choices: [
          '17.7 กรัม (ทศนิยม 1 ตำแหน่ง)',
          '17.70 กรัม (ทศนิยม 2 ตำแหน่ง)',
          '18 กรัม (จำนวนเต็ม)',
          '17.700 กรัม (ทศนิยม 3 ตำแหน่ง)',
        ],
        answerIndex: 0,
        explain: 'การบวกและลบเลขนัยสำคัญ ผลลัพธ์ต้องมีจำนวนตำแหน่งทศนิยมเท่ากับข้อมูลที่มีทศนิยม "น้อยที่สุด" ในที่นี้ 3.2 มีทศนิยม 1 ตำแหน่ง ผลรวม 17.70 จึงต้องปัดเป็น 17.7 กรัม 💡 เทคนิคพิชิตคะแนน: การบวก/ลบ ยึด "ตำแหน่งทศนิยมที่น้อยที่สุด" ส่วนการคูณ/หาร ยึด "จำนวนเลขนัยสำคัญที่น้อยที่สุด"',
        svgType: '',
        needsFigure: false,
        indicator: `ว 2.1 ${grade}/1`,
      },
      {
        question: `สัญลักษณ์เตือนภัยสารเคมีสากล (GHS) รูปเปลวไฟบนวงกลม (Flame over circle) หมายถึงอันตรายในประเภทใด?`,
        choices: [
          'สารออกซิไดซ์ (Oxidizing agent) ที่ช่วยเร่งการลุกไหม้ของสารอื่น',
          'สารไวไฟธรรมดา (Flammable)',
          'สารกัมมันตรังสี (Radioactive)',
          'สารกัดกร่อนผิวหนัง (Corrosive)',
        ],
        answerIndex: 0,
        explain: 'เปลวไฟที่มีวงกลมอยู่ด้านล่างหมายถึง สารออกซิไดซ์ (Oxidizer) ซึ่งให้ออกซิเจนและส่งเสริมการเผาไหม้ ไม่ใช่สารไวไฟธรรมดา 💡 เทคนิคพิชิตคะแนน: สังเกต "ตัว O กลมๆ ด้านล่างเปลวไฟ" O = Oxidizing',
        svgType: 'chem_safety',
        needsFigure: true,
        indicator: `ว 2.1 ${grade}/1`,
      },
    ];
    const t = chemTemplates[index % chemTemplates.length];
    return { ...t, level: ((index % 3) + 2), score, source: 'ai' };
  }

  // 2. Subject-strict generation (NEVER mix subjects!)
  // ---- ภาษาไทย ----
  if (s.includes('ภาษาไทย') || s.includes('ไทย')) {
    const thaiTemplates = [
      {
        question: `ข้อความใดต่อไปนี้เป็น "ประโยคความซ้อน (สังกรประโยค)" ที่มีประโยคย่อยทำหน้าที่ขยายคำนามในประโยคหลัก?`,
        choices: [
          'คุณครูชื่นชมนักเรียนที่ตั้งใจประดิษฐ์ผลงานวิทยาศาสตร์จนได้รับรางวัล',
          'คุณพ่อและคุณแม่ไปออกกำลังกายที่สวนสาธารณะทุกเช้า',
          'เธอจะไปเที่ยวทะเลหรือจะไปเดินเล่นที่ห้างสรรพสินค้า',
          'ฝนตกหนักมากเมื่อคืนนี้น้ำจึงท่วมถนนหน้าหมู่บ้าน',
        ],
        answerIndex: 0,
        explain: `ข้อ ก มีประโยคหลักคือ "คุณครูชื่นชมนักเรียน" และมีประโยคย่อย "ที่ตั้งใจประดิษฐ์ผลงาน..." เชื่อมด้วย "ที่" ทำหน้าที่เป็นวิเศษณานุประโยคขยายคำนาม "นักเรียน" 💡 เทคนิคพิชิตคะแนน: จำคำเชื่อมประโยคความซ้อน: "ที่ ซึ่ง อัน ผู้" (ขยายคำนาม) และ "เมื่อ เพราะ จนกระทั่ง เพื่อ" (ขยายกริยา)`,
        svgType: 'thai_sentence',
        needsFigure: false,
        indicator: `ท 4.1 ${grade}/1`,
      },
      {
        question: `สำนวนไทยในข้อใดมีความหมายสอดคล้องกับสถานการณ์: "การทำงานที่ต้องใช้ความรอบคอบ ละเอียดถี่ถ้วน ไม่ควรรีบร้อนจนเกิดข้อผิดพลาด"?`,
        choices: [
          'ช้าๆ ได้พร้าเล่มงาม',
          'ตีวัวกระทบคราด',
          'น้ำขึ้นให้รีบตัก',
          'ขี่ช้างจับตั๊กแตน',
        ],
        answerIndex: 0,
        explain: '"ช้าๆ ได้พร้าเล่มงาม" หมายถึง การทำสิ่งใดอย่างรอบคอบใจเย็นจะทำให้ผลงานสำเร็จเรียบร้อยงดงาม 💡 เทคนิคพิชิตคะแนน: วิเคราะห์บริบทของโจทย์ว่าเน้น "ความรอบคอบ" หรือ "การฉวยโอกาส" ถ้ารีบคว้าโอกาสจะตรงกับ "น้ำขึ้นให้รีบตัก"',
        svgType: '',
        needsFigure: false,
        indicator: `ท 1.1 ${grade}/2`,
      },
      {
        question: `ข้อใดมีคำที่สะกดถูกต้องตามพจนานุกรมฉบับราชบัณฑิตยสถาน "ทุกคำ"?`,
        choices: [
          'กะเพรา, ผูกพัน, อนุญาต, อัศจรรย์',
          'กระเพรา, ผูกพันธ์, อนุญาติ, อัศจรรย์',
          'กะเพรา, ผูกพันธ์, อนุญาต, อัศจรรย์',
          'กระเพรา, ผูกพัน, อนุญาติ, อัศจัน',
        ],
        answerIndex: 0,
        explain: 'กะเพรา (ไม่มี ร), ผูกพัน (ไม่มี ธ์), อนุญาต (ไม่มีสระอิ) เป็นคำที่นักเรียนมักเขียนผิดบ่อยที่สุดในข้อสอบภาษาไทย 💡 เทคนิคพิชิตคะแนน: ท่องจำ 3 คำปราบเซียน: กะเพราไม่มี ร, อนุญาตไม่มีอิ, ผูกพันไม่มี ธ์',
        svgType: 'thai_spelling',
        needsFigure: false,
        indicator: `ท 4.1 ${grade}/2`,
      },
      {
        question: `จากฉันทลักษณ์ของ "กลอนสุภาพ (กลอนแปด)" คำสุดท้ายของวรรคสดับ (วรรคแรก) นิยมและไม่นิยมใช้เสียงวรรณยุกต์ใดมากที่สุด?`,
        choices: [
          'ใช้ได้ทุกเสียงวรรณยุกต์ แต่ไม่นิยมเสียงสามัญ',
          'ต้องลงท้ายด้วยเสียงจัตวาเท่านั้น',
          'ต้องลงท้ายด้วยเสียงเอกหรือโทเท่านั้น',
          'ห้ามใช้เสียงตรีและเสียงจัตวาเด็ดขาด',
        ],
        answerIndex: 0,
        explain: 'วรรคสดับ (วรรคที่ 1) กำหนดให้ใช้เสียงวรรณยุกต์ใดก็ได้ แต่ไม่นิยมเสียงสามัญ ส่วนวรรคสดับ วรรครับ (วรรคที่ 2) นิยมเสียงจัตวา และห้ามเสียงสามัญ 💡 เทคนิคพิชิตคะแนน: สูตรจำเสียงท้ายวรรคกลอนแปด: "วรรค 1 ไม่ชอบสามัญ / วรรค 2 ชอบจัตวา ห้ามสามัญ / วรรค 3-4 ชอบสามัญ-ตรี"',
        svgType: 'thai_poetics',
        needsFigure: true,
        indicator: `ท 4.1 ${grade}/3`,
      },
      {
        question: `ข้อใดใช้คำราชาศัพท์สำหรับพระมหากษัตริย์ได้ถูกต้องตามหลักภาษาไทย?`,
        choices: [
          'พระบาทสมเด็จพระเจ้าอยู่หัวเสด็จพระราชดำเนินไปทรงเปิดอาคารโรงพยาบาล',
          'พระบาทสมเด็จพระเจ้าอยู่หัวทรงเสด็จพระราชดำเนินไปเปิดอาคาร',
          'พระบาทสมเด็จพระเจ้าอยู่หัวทรงพระราชดำเนินไปทรงเปิดอาคาร',
          'พระบาทสมเด็จพระเจ้าอยู่หัวเสด็จไปทรงพระราชดำเนินเปิดอาคาร',
        ],
        answerIndex: 0,
        explain: '"เสด็จพระราชดำเนิน" เป็นคำกริยาราชาศัพท์ในตัวเองอยู่แล้ว ห้ามใส่ "ทรง" นำหน้าซ้อนเข้าไปอีก (ห้ามใช้ ทรงเสด็จ) 💡 เทคนิคพิชิตคะแนน: กฎเหล็กราชาศัพท์: ถ้าเป็นกริยาราชาศัพท์แท้ เช่น เสด็จ, โปรด, ตรัส, กริ้ว "ห้ามใช้ทรงนำหน้าเด็ดขาด"',
        svgType: '',
        needsFigure: false,
        indicator: `ท 4.1 ${grade}/4`,
      },
      {
        question: `กลุ่มคำในข้อใดจัดเป็น "คำตาย" ทุกคำตามหลักภาษาไทย?`,
        choices: [
          'นกกระจอก, เป็ดน้ำ, กบฏ, ผักกาด',
          'ลมโชย, รวงข้าว, ดวงเดือน, สายสร้อย',
          'กานดา, จริงใจ, เด็กดี, มะม่วง',
          'มาลัย, สายใจ, ไมตรี, ใบบัว',
        ],
        answerIndex: 0,
        explain: 'คำตายคือคำที่สะกดด้วยแม่ กก กบ กด (กบด = กบฏ ตายเร็ว) หรือสระเสียงสั้นในแม่ ก กา 💡 เทคนิคพิชิตคะแนน: ท่องจำ "กบด = คำตาย (จำว่า กบฏ ต้องตาย)"',
        svgType: 'thai_spelling',
        needsFigure: false,
        indicator: `ท 4.1 ${grade}/1`,
      },
      {
        question: `กลุ่มคำในข้อใดจัดเป็น "คำเป็น" ทุกคำตามหลักภาษาไทย?`,
        choices: [
          'สายน้ำ, ลมพัด, ทองคำ, ดาวเรือง',
          'บทเรียน, เมฆหมอก, บทบาท, กฎเกณฑ์',
          'ผักสด, ปลากรอบ, ข้าวต้ม, เป็ดพะโล้',
          'จุดจบ, ดอกไม้, ตกใจ, มะกอก',
        ],
        answerIndex: 0,
        explain: 'คำเป็นคือคำที่สะกดด้วยแม่ กง กน กม เกย เกอว (นมยวง) หรือสระเสียงยาวในแม่ ก กา และสระเกิน อำ ไอ ใอ เอา 💡 เทคนิคพิชิตคะแนน: ท่องจำ "นมยวง = คำเป็น เป็นแล้วไม่ตาย"',
        svgType: 'thai_spelling',
        needsFigure: false,
        indicator: `ท 4.1 ${grade}/1`,
      },
      {
        question: `คำในข้อใดสะกดด้วย "มาตราแม่กด" ที่ใช้พยัญชนะสะกดไม่ตรงรูปทั้งหมด?`,
        choices: [
          'ปรากฏ, กฎหมาย, อากาศ, รสชาติ',
          'มดคัน, เป็ดน้ำ, ถาดข้าว, จดหมาย',
          'บทเรียน, กาลเวลา, ผลบุญ, เกสร',
          'โชคดี, เมฆฝน, ตัวเลข, เชื้อโรค',
        ],
        answerIndex: 0,
        explain: 'ปรากฏ (ฏ), กฎหมาย (ฎ), อากาศ (ศ), รสชาติ (ส, ต) ล้วนออกเสียงเหมือน ด สะกด แต่ใช้พยัญชนะรูปอื่นสะกด 💡 เทคนิคพิชิตคะแนน: มาตราแม่กดมีพยัญชนะสะกดมากที่สุดถึง 16 ตัว',
        svgType: 'thai_spelling',
        needsFigure: false,
        indicator: `ท 4.1 ${grade}/1`,
      },
      {
        question: `ข้อใดมีคำที่สะกดด้วย "มาตราแม่กน" ทุกคำ?`,
        choices: [
          'กาลเวลา, วาฬ, บริเวณ, สัญญาณ',
          'ความสุข, ตัวเลข, เมฆหมอก, โชคดี',
          'กรอบรูป, ทะเลสาบ, โลภมาก, ยีราฟ',
          'อากาศ, รสชาติ, ปรากฏ, กระดาษ',
        ],
        answerIndex: 0,
        explain: 'กาล (ล), วาฬ (ฬ), บริเวณ (ณ), สัญญาณ (ญ, ณ) ล้วนออกเสียงเหมือน น สะกด จัดอยู่ในแม่กนทั้งหมด 💡 เทคนิคพิชิตคะแนน: พยัญชนะแม่กน: น ณ ญ ร ล ฬ',
        svgType: 'thai_spelling',
        needsFigure: false,
        indicator: `ท 4.1 ${grade}/1`,
      },
      {
        question: `คำในข้อใดจัดอยู่ในกลุ่ม "อักษรสูง" ทั้งหมดตามหลักไตรยางศ์?`,
        choices: [
          'ข้าวสาร, ฉิ่งฉับ, ถุงผ้า, หีบเหล็ก',
          'กานดา, จริงใจ, เด็กดี, เต่าทอง',
          'ช้างศึก, ทหาร, พานทอง, ม้าเร็ว',
          'งูใหญ่, นกน้อย, ลมพัด, วัวด่าง',
        ],
        answerIndex: 0,
        explain: 'อักษรสูงมี 11 ตัว ได้แก่ ข ฃ ฉ ฐ ถ ผ ฝ ศ ษ ส ห (ผีฝากถุงข้าวสารให้ฉัน) 💡 เทคนิคพิชิตคะแนน: อักษรสูงพื้นเสียงเป็นเสียงจัตวา',
        svgType: 'thai_triyang',
        needsFigure: true,
        indicator: `ท 4.1 ${grade}/1`,
      },
      {
        question: `คำในข้อใดจัดเป็น "คำควบกล้ำแท้" ทุกคำ?`,
        choices: [
          'กวาดบ้าน, คลองกว้าง, แปลงผัก, พริกไทย',
          'สร้างบ้าน, จริงใจ, ไซร้หา, สรงน้ำ',
          'ทราบข่าว, พุทรา, ทรุดโทรม, อินทรี',
          'ตลาด, ขนม, องุ่น, ฉลาม',
        ],
        answerIndex: 0,
        explain: 'คำควบแท้คือคำที่มีพยัญชนะต้น 2 ตัว ออกเสียงควบกล้ำพร้อมกัน (ร ล ว) ส่วน สร้าง จริง เป็นควบไม่แท้ ทร ออกเสียง ซ ก็เป็นควบไม่แท้ 💡 เทคนิคพิชิตคะแนน: สังเกตการออกเสียงกล้ำพร้อมกัน ถ้าออกเสียงพยางค์เดียวแบบ ซ หรือตัวเดียวคือควบไม่แท้',
        svgType: '',
        needsFigure: false,
        indicator: `ท 4.1 ${grade}/2`,
      },
      {
        question: `ข้อใดมีคำที่เป็น "อักษรนำ" ทุกคำ?`,
        choices: [
          'ขนม, ตลาด, องุ่น, สลัด',
          'กวาด, คลอง, แปลง, พริก',
          'สร้าง, จริง, สรง, ไซร้',
          'กานดา, จริงใจ, เด็กดี, เต่า',
        ],
        answerIndex: 0,
        explain: 'ขนม (ขะ-หนม), ตลาด (ตะ-หลาด), องุ่น (อะ-หงุ่น), สลัด (สะ-หลัด) มีพยัญชนะตัวหน้าเป็นอักษรสูงหรือกลาง นำอักษรต่ำเดี่ยวให้ออกเสียงวรรณยุกต์ตามตัวหน้า 💡 เทคนิคพิชิตคะแนน: อักษรนำอ่าน 2 พยางค์ พยางค์หลังออกเสียงเหมือนมี ห นำ',
        svgType: '',
        needsFigure: false,
        indicator: `ท 4.1 ${grade}/1`,
      },
      {
        question: `ข้อใดเป็น "คำสมาส" ที่ไม่มีการสนธิ?`,
        choices: [
          'ราชการ, รัฐศาสตร์, ภูมิศาสตร์',
          'สุนทรพจน์, คมนาคม, ธันวาคม',
          'ตู้เย็น, พ่อบ้าน, รถไฟ',
          'กะเพรา, ผูกพัน, อนุญาต',
        ],
        answerIndex: 0,
        explain: 'ราชการ (ราช + การ), รัฐศาสตร์ (รัฐ + ศาสตร์) เป็นคำภาษาบาลี-สันสกฤตนำมาเรียงต่อกันโดยไม่อาการเชื่อมเสียงกลืนกัน จัดเป็นคำสมาสแท้ 💡 เทคนิคพิชิตคะแนน: สมาส = ชน (อ่านต่อกัน), สนธิ = เชื่อม (กลืนเสียงมีสระเปลี่ยน)',
        svgType: '',
        needsFigure: false,
        indicator: `ท 4.1 ${grade}/3`,
      },
      {
        question: `ข้อใดเป็น "คำประสม" ที่เกิดจากคำมูลในภาษาไทยประสมกันจนเกิดความหมายใหม่?`,
        choices: [
          'พ่อบ้าน, ตู้เย็น, แปรงสีฟัน',
          'ราชการ, ภูมิศาสตร์, วารสาร',
          'มกราคม, กุมภาพันธ์, มีนาคม',
          'จริงใจ, สร้างสรรค์, ปรากฏ',
        ],
        answerIndex: 0,
        explain: 'คำประสมเกิดจากการนำคำมูลที่มีความหมายต่างกันมารวมกันแล้วเกิดเป็นความหมายใหม่ เช่น ตู้ + เย็น = ตู้แช่อาหาร 💡 เทคนิคพิชิตคะแนน: คำประสมต้องเกิด "ความหมายใหม่" ที่ยังมีเค้าความหมายเดิม',
        svgType: '',
        needsFigure: false,
        indicator: `ท 4.1 ${grade}/2`,
      },
      {
        question: `ฉันทลักษณ์ของ "กาพย์ยานี ๑๑" หนึ่งบทมีกี่บาท และแต่ละวรรคมีจำนวนคำเท่าใด?`,
        choices: [
          'มี ๒ บาท วรรคหน้ามี ๕ คำ วรรคหลังมี ๖ คำ รวมบาทละ ๑๑ คำ',
          'มี ๔ บาท วรรคหน้ามี ๖ คำ วรรคหลังมี ๖ คำ',
          'มี ๒ บาท วรรคหน้ามี ๗ คำ วรรคหลังมี ๔ คำ',
          'มี ๑ บาท วรรคหน้ามี ๔ คำ วรรคหลังมี ๗ คำ',
        ],
        answerIndex: 0,
        explain: 'กาพย์ยานี ๑๑ มี ๒ บาท (๔ วรรค) วรรคหน้า ๕ คำ วรรคหลัง ๖ คำ รวมบาทละ ๑๑ คำ สองบาทรวมเป็น ๒๒ คำ 💡 เทคนิคพิชิตคะแนน: ท่องจำ "ยานี ๑๑: หน้า ๕ หลัง ๖"',
        svgType: 'thai_poetics',
        needsFigure: true,
        indicator: `ท 4.1 ${grade}/3`,
      },
      {
        question: `คำว่า "เพลา" ในข้อความ: "เมื่อถึงเพลาเย็น เพลารถยนต์ของเขาก็หักลง" คำทั้งสองจัดเป็นคำลักษณะใด?`,
        choices: [
          'คำพ้องรูป (เขียนเหมือนกันแต่อ่านและมีความหมายต่างกัน)',
          'คำพ้องเสียง (อ่านออกเสียงเหมือนกันแต่เขียนต่างกัน)',
          'คำสมาสที่ไม่มีการสนธิ',
          'คำซ้ำที่บอกความถี่ของการกระทำ',
        ],
        answerIndex: 0,
        explain: 'เพลา (เพ-ลา แปลว่าเวลา) และเพลา (เพลา แกนล้อ) เขียนรูปเหมือนกันแต่ออกเสียงและความหมายต่างกัน จัดเป็นคำพ้องรูป 💡 เทคนิคพิชิตคะแนน: พ้องรูป = ตาดูเหมือนกัน, พ้องเสียง = หูฟังเหมือนกัน',
        svgType: '',
        needsFigure: false,
        indicator: `ท 4.1 ${grade}/1`,
      },
      {
        question: `ข้อใดใช้คำสันธานเชื่อม "ประโยคความรวม (สมนัยประโยค)" ที่มีเนื้อความขัดแย้งกันได้ถูกต้อง?`,
        choices: [
          'พี่ชอบอ่านหนังสือนิยายแต่น้องชอบเล่นกีฬาฟุตบอล',
          'เขาวิ่งออกกำลังกายทุกวันเพราะต้องการให้ร่างกายแข็งแรง',
          'เมื่อครูเดินเข้ามาในห้องนักเรียนก็ลุกขึ้นทำความเคารพ',
          'เธอจะรับประทานข้าวผัดหรือก๋วยเตี๋ยวน้ำใส',
        ],
        answerIndex: 0,
        explain: 'คำว่า "แต่" เป็นสันธานแสดงเนื้อความขัดแย้งกัน เชื่อมประโยคความเดียวสองประโยคเข้าเป็นประโยคความรวม 💡 เทคนิคพิชิตคะแนน: สันธานขัดแย้ง: แต่, แต่ทว่า, ถึง...ก็',
        svgType: 'thai_sentence',
        needsFigure: false,
        indicator: `ท 4.1 ${grade}/2`,
      },
      {
        question: `การอ่านจับใจความสำคัญของบทความทั่วไป ควรใช้เทคนิค 5W1H เพื่อตอบคำถามประเด็นใดบ้าง?`,
        choices: [
          'ใคร (Who), ทำอะไร (What), ที่ไหน (Where), เมื่อไร (When), ทำไม (Why), อย่างไร (How)',
          'คำศัพท์ยาก, คำราชาศัพท์, จำนวนคำ, จำนวนบรรทัด',
          'ความคิดเห็นส่วนตัวของผู้สอบ, ข้อผิดพลาดของตัวละคร',
          'การสัมผัสสระ, การสัมผัสอักษร, จังหวะการอ่าน',
        ],
        answerIndex: 0,
        explain: '5W1H เป็นหัวใจของการจับใจความสำคัญ: ใคร ทำอะไร ที่ไหน เมื่อไร เพราะเหตุใด และผลเป็นอย่างไร 💡 เทคนิคพิชิตคะแนน: อ่านจบแล้วสรุป 1 ประโยคว่า "ใครทำอะไรและเกิดผลอย่างไร"',
        svgType: '',
        needsFigure: false,
        indicator: `ท 1.1 ${grade}/1`,
      },
      {
        question: `สำนวนไทยในข้อใดมีความหมายตรงกับ: "การเริ่มลงมือทำสิ่งใดในขณะที่มีโอกาสดีหรือจังหวะอำนวย"?`,
        choices: [
          'น้ำขึ้นให้รีบตัก',
          'ช้าๆ ได้พร้าเล่มงาม',
          'ขี่ช้างจับตั๊กแตน',
          'วัวหายล้อมคอก',
        ],
        answerIndex: 0,
        explain: '"น้ำขึ้นให้รีบตัก" หมายถึง เมื่อมีโอกาสดีผ่านเข้ามาให้รีบฉวยโอกาสทำทันที 💡 เทคนิคพิชิตคะแนน: เปรียบเทียบกับ "วัวหายล้อมคอก" คือเกิดเรื่องแล้วค่อยมาป้องกัน',
        svgType: '',
        needsFigure: false,
        indicator: `ท 1.1 ${grade}/2`,
      },
      {
        question: `ในการเขียนจดหมายลาป่วยถึงคุณครูประจำชั้น คำขึ้นต้นและคำลงท้ายข้อใดถูกต้องตามแบบแผน?`,
        choices: [
          'คำขึ้นต้น: เรียน คุณครูประจำชั้น... คำลงท้าย: ด้วยความเคารพอย่างสูง',
          'คำขึ้นต้น: กราบเรียน... คำลงท้าย: ขอแสดงความนับถือ',
          'คำขึ้นต้น: สวัสดีคุณครู... คำลงท้าย: ด้วยความรักและคิดถึง',
          'คำขึ้นต้น: ถึงคุณครู... คำลงท้าย: ขอแสดงความยินดี',
        ],
        answerIndex: 0,
        explain: 'การเขียนจดหมายถึงคุณครู ใช้คำขึ้นต้นว่า "เรียน..." และคำลงท้ายว่า "ด้วยความเคารพอย่างสูง" 💡 เทคนิคพิชิตคะแนน: ลาป่วย/ลากิจส่งครู: เรียน... / ด้วยความเคารพอย่างสูง',
        svgType: '',
        needsFigure: false,
        indicator: `ท 2.1 ${grade}/2`,
      },
    ];
    const t = thaiTemplates[index % thaiTemplates.length];
    return { ...t, level: ((index % 3) + 2), score, source: 'ai' };
  }

  // ---- คณิตศาสตร์ ----
  if (s.includes('คณิต') || s.includes('math') || s.includes('เลข')) {
    const aVal = 3 * (index % 4 + 1);
    const bVal = 4 * (index % 4 + 1);
    const cVal = 5 * (index % 4 + 1);
    const rVal = (index % 5) + 3;
    const hVal = (index % 4) + 7;
    const origPrice = 1000 + (index % 5) * 200;
    const discPct = 20;
    const netPrice = origPrice * 0.8;
    const mathTemplates = [
      {
        question: `บันไดมีความยาว ${cVal} เมตร วางพาดกับกำแพงตึก โดยให้โคนบันไดอยู่ห่างจากผนังตึก ${aVal} เมตร ปลายบนของบันไดจะอยู่สูงจากพื้นดินกี่เมตร?`,
        choices: [
          `${bVal} เมตร`,
          `${bVal + 1} เมตร`,
          `${cVal - aVal} เมตร`,
          `${Math.round(Math.sqrt(cVal * cVal + aVal * aVal))} เมตร`,
        ],
        answerIndex: 0,
        explain: `ตามทฤษฎีบทพีทาโกรัส: ด้านตรงข้ามมุมฉาก c² = a² + b² จะได้ b² = ${cVal}² - ${aVal}² = ${cVal * cVal} - ${aVal * aVal} = ${bVal * bVal} ดังนั้น b = ${bVal} เมตร 💡 เทคนิคพิชิตคะแนน: ท่องอัตราส่วนชุดสามเหลี่ยมมุมฉากยอดนิยม: 3:4:5, 5:12:13, 7:24:25, 8:15:17 ประหยัดเวลาคิดได้ทันที`,
        svgType: 'right_triangle',
        needsFigure: true,
        indicator: `ค 2.2 ${grade}/1`,
      },
      {
        question: `ถังเก็บน้ำทรงกระบอกมีรัศมีของฐานยาว ${rVal} เมตร และมีความสูง ${hVal} เมตร หากต้องการบรรจุน้ำให้เต็มถัง จะต้องใช้น้ำประมาณกี่ลูกบาศก์เมตร? (กำหนด π ≈ 22/7)`,
        choices: [
          `${Math.round((22 / 7) * rVal * rVal * hVal)} ลบ.ม.`,
          `${Math.round(2 * (22 / 7) * rVal * hVal)} ลบ.ม.`,
          `${Math.round((22 / 7) * rVal * hVal)} ลบ.ม.`,
          `${Math.round((1 / 3) * (22 / 7) * rVal * rVal * hVal)} ลบ.ม.`,
        ],
        answerIndex: 0,
        explain: `สูตรปริมาตรทรงกระบอก V = πr²h = (22/7) × ${rVal}² × ${hVal} = ${Math.round((22 / 7) * rVal * rVal * hVal)} ลูกบาศก์เมตร 💡 เทคนิคพิชิตคะแนน: จำแนกสูตรให้ชัดเจน: ปริมาตรทรงกระบอก = πr²h ส่วนกรวยมี (1/3) นำหน้า`,
        svgType: 'geometry_3d',
        needsFigure: true,
        indicator: `ค 2.1 ${grade}/2`,
      },
      {
        question: `ร้านค้าติดป้ายราคาสินค้าไว้ ${origPrice} บาท ต่อมาจัดรายการส่งเสริมการขายลดราคา ${discPct}% และคิดภาษีมูลค่าเพิ่ม (VAT) 7% จากราคาที่ลดแล้ว ลูกค้าต้องจ่ายเงินจริงกี่บาท?`,
        choices: [
          `${(netPrice * 1.07).toFixed(2)} บาท`,
          `${(origPrice * 0.87).toFixed(2)} บาท`,
          `${netPrice.toFixed(2)} บาท`,
          `${(origPrice * 1.07 - netPrice).toFixed(2)} บาท`,
        ],
        answerIndex: 0,
        explain: `ราคาหลังลด 20% = ${origPrice} × 0.80 = ${netPrice} บาท จากนั้นคิด VAT 7%: ${netPrice} × 1.07 = ${(netPrice * 1.07).toFixed(2)} บาท 💡 เทคนิคพิชิตคะแนน: คำนวณลดราคาก่อนแล้วค่อยคูณ 1.07 ห้ามนำเปอร์เซ็นต์ส่วนลดและ VAT มาบวกลบกันโดยตรง`,
        svgType: '',
        needsFigure: false,
        indicator: `ค 1.1 ${grade}/1`,
      },
      {
        question: `จากข้อมูลคะแนนสอบของนักเรียน 9 คน ดังนี้: 12, 15, 18, 20, 22, 25, 28, 30, 35 ค่ามัธยฐาน (Median) และพิสัยระหว่างควอร์ไทล์ (IQR) ของข้อมูลชุดนี้มีค่าเท่าใด?`,
        choices: [
          'มัธยฐาน = 22, IQR = 12',
          'มัธยฐาน = 20, IQR = 15',
          'มัธยฐาน = 22, IQR = 23',
          'มัธยฐาน = 25, IQR = 10',
        ],
        answerIndex: 0,
        explain: 'ข้อมูลเรียงลำดับแล้ว ตำแหน่งมัธยฐานคือตัวที่ (9+1)/2 = ตัวที่ 5 คือ 22 ควอร์ไทล์ที่ 1 (Q₁) = 16.5 และ Q₃ = 28.5 ดังนั้น IQR = Q₃ - Q₁ = 12 💡 เทคนิคพิชิตคะแนน: เรียงข้อมูลจากน้อยไปหามากเสมอก่อนหามัธยฐานและควอร์ไทล์',
        svgType: 'boxplot_stats',
        needsFigure: true,
        indicator: `ค 3.1 ${grade}/1`,
      },
      {
        question: `ถ้าสามเท่าของจำนวนเต็มจำนวนหนึ่งลบด้วย 8 มีค่าเท่ากับ 19 จงหาจำนวนเต็มจำนวนนั้น`,
        choices: [
          '9',
          '8',
          '7',
          '11',
        ],
        answerIndex: 0,
        explain: 'ตั้งสมการ: 3x - 8 = 19 นำ 8 ไปบวกทั้งสองข้าง จะได้ 3x = 27 หารด้วย 3 ได้ x = 9 💡 เทคนิคพิชิตคะแนน: การแปลงโจทย์ปัญหาเป็นสมการ ให้สมมุติตัวแปร x แทนสิ่งที่โจทย์ถามหา',
        svgType: '',
        needsFigure: false,
        indicator: `ค 1.3 ${grade}/1`,
      },
      {
        question: `ในฟาร์มแห่งหนึ่งมีเป็ดและวัวรวมกัน 30 ตัว เมื่อนับขารวมกันได้ 84 ขา อยากทราบว่าในฟาร์มนี้มีวัวกี่ตัว?`,
        choices: [
          '12 ตัว',
          '18 ตัว',
          '15 ตัว',
          '10 ตัว',
        ],
        answerIndex: 0,
        explain: 'ให้เป็ดมี x ตัว วัวมี y ตัว; x + y = 30 และ 2x + 4y = 84; นำสมการแรกคูณ 2: 2x + 2y = 60; ลบกันจะได้ 2y = 24 ดังนั้น y = 12 ตัว 💡 เทคนิคพิชิตคะแนน: ข้อสอบนับขา ให้สมมุติว่าสัตว์ทุกตัวมี 2 ขาก่อน (30×2=60) ขาที่เกินมา 84-60 = 24 ขา คือขาคู่หน้าของวัว 24/2 = 12 ตัว',
        svgType: '',
        needsFigure: false,
        indicator: `ค 1.3 ${grade}/2`,
      },
      {
        question: `กล่องทึบใบหนึ่งบรรจุลูกปิงปองสีส้ม 5 ลูก สีขาว 7 ลูก และสีฟ้า 8 ลูก สุ่มหยิบลูกปิงปองขึ้นมา 1 ลูก ความน่าจะเป็นที่จะหยิบได้ลูกปิงปองสีส้มตรงกับข้อใด?`,
        choices: [
          '1/4',
          '1/5',
          '5/15',
          '3/10',
        ],
        answerIndex: 0,
        explain: 'จำนวนลูกปิงปองทั้งหมด n(S) = 5 + 7 + 8 = 20 ลูก จำนวนลูกสีส้ม n(E) = 5 ลูก ดังนั้น P(E) = 5/20 = 1/4 💡 เทคนิคพิชิตคะแนน: สูตรความน่าจะเป็น P(E) = n(E) / n(S) อย่าลืมทอนเป็นเศษส่วนอย่างต่ำเสมอ',
        svgType: '',
        needsFigure: false,
        indicator: `ค 3.2 ${grade}/1`,
      },
      {
        question: `ค่าของผลลัพธ์ (3⁴ × 9²) ÷ 27² มีค่าตรงกับจำนวนใด?`,
        choices: [
          '9',
          '27',
          '3',
          '81',
        ],
        answerIndex: 0,
        explain: 'แปลงฐานเป็น 3 ทั้งหมด: 9² = (3²)² = 3⁴ และ 27² = (3³)² = 3⁶; ดังนั้น (3⁴ × 3⁴) ÷ 3⁶ = 3⁸ ÷ 3⁶ = 3² = 9 💡 เทคนิคพิชิตคะแนน: เมื่อเจอเลขยกกำลังฐานต่างกัน ให้เปลี่ยนเป็นฐานจำนวนเฉพาะตัวเดียวกันก่อนเสมอ',
        svgType: '',
        needsFigure: false,
        indicator: `ค 1.1 ${grade}/1`,
      },
      {
        question: `รูปสี่เหลี่ยมรูปหนึ่งมีขนาดของมุมภายในสามมุมเท่ากับ 80°, 105° และ 95° มุมภายในมุมที่สี่จะมีขนาดกี่องศา?`,
        choices: [
          '80°',
          '75°',
          '85°',
          '90°',
        ],
        answerIndex: 0,
        explain: 'ผลรวมมุมภายในรูปสี่เหลี่ยม = 360° ดังนั้น มุมที่สี่ = 360° - (80° + 105° + 95°) = 360° - 280° = 80° 💡 เทคนิคพิชิตคะแนน: ผลรวมมุมภายในของรูป n เหลี่ยม = (n - 2) × 180° สามเหลี่ยม=180°, สี่เหลี่ยม=360°',
        svgType: '',
        needsFigure: false,
        indicator: `ค 2.2 ${grade}/1`,
      },
      {
        question: `ตามทฤษฎีบทเรขาคณิตเกี่ยวกับวงกลม "มุมในครึ่งวงกลม" จะมีขนาดเท่ากับข้อใดเสมอ?`,
        choices: [
          '90 องศา (มุมฉาก)',
          '180 องศา',
          '60 องศา',
          '45 องศา',
        ],
        answerIndex: 0,
        explain: 'ทฤษฎีบทวงกลมระบุว่า มุมที่มีจุดยอดอยู่บนเส้นรอบวงและแขนทั้งสองรองรับเส้นผ่านศูนย์กลาง (มุมในครึ่งวงกลม) จะมีขนาดกาง 90 องศาเสมอ 💡 เทคนิคพิชิตคะแนน: มองหาเส้นผ่านศูนย์กลาง หากมีสามเหลี่ยมรองรับ ยอดของมุมนั้นจะกาง 90° เสมอ',
        svgType: '',
        needsFigure: false,
        indicator: `ค 2.2 ${grade}/2`,
      },
      {
        question: `พหุนาม x² - 8x + 15 สามารถแยกตัวประกอบได้ตรงกับข้อใด?`,
        choices: [
          '(x - 3)(x - 5)',
          '(x + 3)(x + 5)',
          '(x - 1)(x - 15)',
          '(x + 1)(x - 15)',
        ],
        answerIndex: 0,
        explain: 'หาจำนวนสองจำนวนที่คูณกันได้ +15 และบวกกันได้ -8 คือ -3 และ -5 ดังนั้นแยกได้เป็น (x - 3)(x - 5) 💡 เทคนิคพิชิตคะแนน: ถ้าพจน์ท้ายเป็นบวกและพจน์กลางเป็นลบ เครื่องหมายในทั้งสองวงเล็บต้องเป็น "ลบทั้งคู่"',
        svgType: '',
        needsFigure: false,
        indicator: `ค 1.2 ${grade}/1`,
      },
      {
        question: `เซตคำตอบของอสมการเชิงเส้นตัวแปรเดียว 5x - 7 ≤ 3x + 9 คือข้อใด?`,
        choices: [
          'x ≤ 8',
          'x ≥ 8',
          'x ≤ 1',
          'x ≥ 1',
        ],
        answerIndex: 0,
        explain: 'ย้าย 3x มาลบทางซ้าย: 5x - 3x ≤ 9 + 7 => 2x ≤ 16 => x ≤ 8 💡 เทคนิคพิชิตคะแนน: การแก้อสมการ เครื่องหมายจะกลับทิศทางก็ต่อเมื่อ "คูณหรือหารด้วยจำนวนลบ" เท่านั้น',
        svgType: '',
        needsFigure: false,
        indicator: `ค 1.3 ${grade}/1`,
      },
      {
        question: `แผนที่ภูมิประเทศใช้มาตราส่วน 1 : 250,000 ถ้าระยะห่างระหว่างอำเภอ A กับอำเภอ B ในแผนที่วัดได้ 6 เซนติเมตร ระยะทางจริงในภูมิประเทศเท่ากับกี่กิโลเมตร?`,
        choices: [
          '15 กิโลเมตร',
          '150 กิโลเมตร',
          '1.5 กิโลเมตร',
          '25 กิโลเมตร',
        ],
        answerIndex: 0,
        explain: 'ระยะทางจริง = 6 × 250,000 ซม. = 1,500,000 ซม. แปลงเป็นเมตรตัดศูนย์ 2 ตัว = 15,000 ม. แปลงเป็นกิโลเมตรตัดศูนย์ 3 ตัว = 15 กม. 💡 เทคนิคพิชิตคะแนน: จำสูตรตัดศูนย์มาตราส่วน: 100,000 ซม. = 1 กม. ดังนั้น 1,500,000 ซม. = 15 กม.',
        svgType: '',
        needsFigure: false,
        indicator: `ค 1.1 ${grade}/2`,
      },
      {
        question: `ยืนอยู่ห่างจากโคนเสาธงเป็นระยะ 20 เมตร มองเห็นยอดเสาธงเป็นมุมเงย 45° ถ้าระดับสายตาอยู่สูงจากพื้น 1.6 เมตร เสาธงนี้มีความสูงกี่เมตร?`,
        choices: [
          '21.6 เมตร',
          '20.0 เมตร',
          '18.4 เมตร',
          '24.0 เมตร',
        ],
        answerIndex: 0,
        explain: 'จาก tan 45° = ด้านตรงข้ามมุม / ด้านประชิดมุม = h / 20 => h = 20 × 1 = 20 เมตร; ความสูงเสาธง = h + ระดับสายตา = 20 + 1.6 = 21.6 เมตร 💡 เทคนิคพิชิตคะแนน: อย่าลืมบวก "ความสูงระดับสายตา" ของผู้สังเกตกลับเข้าไปด้วยเสมอ',
        svgType: 'right_triangle',
        needsFigure: true,
        indicator: `ค 2.2 ${grade}/2`,
      },
      {
        question: `กรวยกลมตรงอันหนึ่งมีรัศมีของฐานยาว 6 เซนติเมตร และมีส่วนสูงเอียงยาว 10 เซนติเมตร ความสูงตรงของกรวยนี้มีค่าเท่ากับกี่เซนติเมตร?`,
        choices: [
          '8 เซนติเมตร',
          '4 เซนติเมตร',
          '12 เซนติเมตร',
          '16 เซนติเมตร',
        ],
        answerIndex: 0,
        explain: 'รัศมี (r), ความสูงตรง (h), และสูงเอียง (l) ประกอบกันเป็นสามเหลี่ยมมุมฉาก โดย l² = r² + h² => 10² = 6² + h² => h² = 100 - 36 = 64 => h = 8 ซม. 💡 เทคนิคพิชิตคะแนน: อัตราส่วนพีทาโกรัส 6:8:10 (ย่อส่วนมาจาก 3:4:5)',
        svgType: 'geometry_3d',
        needsFigure: true,
        indicator: `ค 2.1 ${grade}/2`,
      },
      {
        question: `นักเรียนกลุ่มหนึ่งจำนวน 4 คน มีน้ำหนักเฉลี่ย 45 กิโลกรัม เมื่อมีนักเรียนใหม่ย้ายเข้ามาเพิ่มอีก 1 คน ทำให้น้ำหนักเฉลี่ยกลายเป็น 46 กิโลกรัม นักเรียนที่ย้ายมาใหม่หนักกี่กิโลกรัม?`,
        choices: [
          '50 กิโลกรัม',
          '48 กิโลกรัม',
          '52 กิโลกรัม',
          '46 กิโลกรัม',
        ],
        answerIndex: 0,
        explain: 'น้ำหนักรวมเดิม 4 คน = 4 × 45 = 180 กก. น้ำหนักรวมใหม่ 5 คน = 5 × 46 = 230 กก. น้ำหนักคนใหม่ = 230 - 180 = 50 กก. 💡 เทคนิคพิชิตคะแนน: ผลรวมใหม่ - ผลรวมเดิม = ค่าของข้อมูลตัวที่เพิ่มเข้ามา',
        svgType: '',
        needsFigure: false,
        indicator: `ค 3.1 ${grade}/1`,
      },
      {
        question: `กราฟของฟังก์ชันกำลังสอง y = -2(x - 4)² + 7 มีลักษณะของเส้นกราฟและจุดยอดตรงกับข้อใด?`,
        choices: [
          'กราฟคว่ำ จุดยอดอยู่ที่ (4, 7)',
          'กราฟหงาย จุดยอดอยู่ที่ (4, 7)',
          'กราฟคว่ำ จุดยอดอยู่ที่ (-4, 7)',
          'กราฟหงาย จุดยอดอยู่ที่ (-4, 7)',
        ],
        answerIndex: 0,
        explain: 'จากสมการรูปมาตรฐาน y = a(x - h)² + k มีค่า a = -2 (เป็นลบ กราฟจึงคว่ำ) และจุดยอด (h, k) อยู่ที่ (4, 7) 💡 เทคนิคพิชิตคะแนน: a > 0 กราฟหงายให้ค่าต่ำสุด, a < 0 กราฟคว่ำให้ค่าสูงสุด',
        svgType: 'linear_graph_2',
        needsFigure: true,
        indicator: `ค 1.2 ${grade}/2`,
      },
      {
        question: `ถ้าเซต A มีจำนวนสมาชิก 4 ตัว จำนวนสับเซตทั้งหมดของเซต A จะมีค่าเท่ากับข้อใด?`,
        choices: [
          '16 สับเซต',
          '8 สับเซต',
          '4 สับเซต',
          '12 สับเซต',
        ],
        answerIndex: 0,
        explain: 'สูตรจำนวนสับเซตทั้งหมดของเซตที่มีสมาชิก n ตัว คือ 2ⁿ ดังนั้น เมื่อ n = 4 จะได้ 2⁴ = 16 สับเซต 💡 เทคนิคพิชิตคะแนน: อย่าลืมว่าเซตว่าง (∅) และตัวเซตเอง นับเป็นสับเซตเสมอ หากโจทย์ถาม "สับเซตแท้" จะเท่ากับ 2ⁿ - 1',
        svgType: '',
        needsFigure: false,
        indicator: `ค 1.1 ${grade}/1`,
      },
      {
        question: `พจน์ที่ 20 ของลำดับเลขคณิต 5, 9, 13, 17, ... มีค่าตรงกับข้อใด?`,
        choices: [
          '81',
          '85',
          '77',
          '80',
        ],
        answerIndex: 0,
        explain: 'สูตรพจน์ทั่วไปลำดับเลขคณิต an = a₁ + (n - 1)d โดย a₁ = 5, ผลต่างร่วม d = 9 - 5 = 4; ดังนั้น a₂₀ = 5 + (20 - 1)(4) = 5 + 19(4) = 5 + 76 = 81 💡 เทคนิคพิชิตคะแนน: สังเกตผลต่างร่วม d ก่อนเสมอ แล้วใช้สูตร an = a₁ + (n - 1)d',
        svgType: '',
        needsFigure: false,
        indicator: `ค 1.2 ${grade}/2`,
      },
      {
        question: `จุดพิกัด P(3, 4) เมื่อถูกหมุนรอบจุดกำเนิด (0, 0) ทวนเข็มนาฬิกาเป็นมุม 90 องศา พิกัดใหม่ของจุด P' คือข้อใด?`,
        choices: [
          '(-4, 3)',
          '(4, -3)',
          '(-3, -4)',
          '(-3, 4)',
        ],
        answerIndex: 0,
        explain: 'การหมุนจุด (x, y) ทวนเข็มนาฬิกา 90° รอบจุดกำเนิด พิกัดใหม่จะแปลงเป็น (-y, x) ดังนั้นจุด (3, 4) จะกลายเป็น (-4, 3) 💡 เทคนิคพิชิตคะแนน: หมุนทวนเข็ม 90°: (x, y) → (-y, x); หมุน 180°: (x, y) → (-x, -y)',
        svgType: '',
        needsFigure: false,
        indicator: `ค 2.2 ${grade}/1`,
      },
    ];
    const t = mathTemplates[index % mathTemplates.length];
    return { ...t, level: ((index % 3) + 2), score, source: 'ai' };
  }

  // ---- วิทยาศาสตร์และเทคโนโลยี ----
  if (s.includes('วิทยา') || s.includes('วิทย์') || s.includes('science') || s.includes('ฟิสิกส์')) {
    const sciTemplates = [
      {
        question: `นักเรียนออกแบบการทดลองเพื่อศึกษา "ผลของความเข้มแสงต่ออัตราการสังเคราะห์ด้วยแสงของสาหร่ายหางกระรอก" ในการทดลองนี้ ข้อใดจัดเป็น "ตัวแปรต้น (Independent Variable)" และ "ตัวแปรควบคุม (Controlled Variable)" ตามลำดับ?`,
        choices: [
          'ระยะห่างระหว่างโคมไฟกับสาหร่าย (ตัวแปรต้น), อุณหภูมิของน้ำและปริมาณสาหร่าย (ตัวแปรควบคุม)',
          'จำนวนฟองแก๊สออกซิเจนที่เกิดขึ้น (ตัวแปรต้น), ชนิดของพืชน้ำ (ตัวแปรควบคุม)',
          'อุณหภูมิของน้ำ (ตัวแปรต้น), ระยะห่างของโคมไฟ (ตัวแปรควบคุม)',
          'ชนิดของแก๊สที่สะสม (ตัวแปรต้น), เวลาที่ใช้ทดลอง (ตัวแปรควบคุม)',
        ],
        answerIndex: 0,
        explain: 'ตัวแปรต้นคือสิ่งที่ผู้วิจัยกำหนดให้แตกต่างกัน (ความเข้มแสง/ระยะโคมไฟ) ตัวแปรตามคือสิ่งที่วัดผล (จำนวนฟองแก๊ส O₂) และตัวแปรควบคุมคือสิ่งที่ต้องจัดให้เหมือนกันทุกชุดทดลอง 💡 เทคนิคพิชิตคะแนน: ตัวแปรต้น = สิ่งที่จัดให้ต่าง, ตัวแปรตาม = ผลที่ตามมาจากการวัด, ตัวแปรควบคุม = สิ่งที่ต้องคุมให้นิ่งเหมือนกัน',
        svgType: 'photosynthesis',
        needsFigure: true,
        indicator: `ว 1.2 ${grade}/1`,
      },
      {
        question: `วงจรไฟฟ้าในบ้านหลังหนึ่งประกอบด้วยหลอดไฟ 3 ดวง ต่อแบบ "ขนาน" หากหลอดไฟดวงหนึ่งเกิดไส้หลอดขาด วงจรและหลอดไฟที่เหลือจะเป็นอย่างไร?`,
        choices: [
          'หลอดไฟอีก 2 ดวงยังคงสว่างตามปกติและมีความสว่างเท่าเดิม',
          'หลอดไฟที่เหลือทั้ง 2 ดวงจะดับทั้งหมดทันที',
          'หลอดไฟอีก 2 ดวงจะสว่างวาบขึ้นเป็น 2 เท่าแล้วขาดตามไป',
          'เกิดไฟฟ้าลัดวงจรและเบรกเกอร์จะตัดไฟทันที',
        ],
        answerIndex: 0,
        explain: 'การต่อวงจรแบบขนาน แต่ละสาขาจะมีความต่างศักย์เท่ากันและทำงานอิสระจากกัน หากหลอดใดหลอดหนึ่งขาด กระแสไฟฟ้ายังคงไหลผ่านสาขาอื่นได้ตามปกติ 💡 เทคนิคพิชิตคะแนน: การต่อเครื่องใช้ไฟฟ้าในบ้านต่อแบบ "ขนานเสมอ" เพื่อให้ปิด-เปิดแยกกันได้และแรงดันไฟฟ้าเท่ากัน 220V',
        svgType: 'electric_circuit',
        needsFigure: true,
        indicator: `ว 2.3 ${grade}/2`,
      },
      {
        question: `ในระบบนิเวศแห่งหนึ่ง หากเกษตรกรฉีดพ่นสารเคมีกำจัดแมลงที่มีสารพิษตกค้างไม่สลายตัวลงสู่แปลงนา ห่วงโซ่อาหารใดต่อไปนี้ สิ่งมีชีวิตชนิดใดจะเกิดการสะสมสารพิษทางชีวภาพ (Biomagnification) สูงที่สุด?`,
        choices: [
          'เหยี่ยว (ผู้บริโภคลำดับสุดท้าย)',
          'งู (ผู้บริโภคลำดับที่สอง)',
          'กบ (ผู้บริโภคลำดับที่หนึ่ง)',
          'ต้นข้าว (ผู้ผลิต)',
        ],
        answerIndex: 0,
        explain: 'สารพิษที่ไม่สลายตัวจะสะสมในเนื้อเยื่อไขมันและถ่ายทอดผ่านห่วงโซ่อาหาร โดยปริมาณความเข้มข้นของสารพิษจะทวีคูณเพิ่มขึ้นเรื่อยๆ ไปยังผู้บริโภคลำดับสูงสุด (Biomagnification) 💡 เทคนิคพิชิตคะแนน: "พลังงานถ่ายทอดได้ 10% ยิ่งขึ้นไปยิ่งน้อย แต่สารพิษไม่สลายตัว ยิ่งขึ้นไปยิ่งเข้มข้นสูงสุด"',
        svgType: 'food_chain',
        needsFigure: true,
        indicator: `ว 1.1 ${grade}/1`,
      },
      {
        question: `วัตถุมวล 5 กิโลกรัม วางอยู่นิ่งบนพื้นราบเรียบ หากมีแรงคงที่ขนาด 20 นิวตัน มากระทำในแนวราบเป็นเวลา 4 วินาที วัตถุจะมีความเร็วสุดท้ายกี่เมตรต่อวินาที? (ไม่คิดแรงเสียดทาน)`,
        choices: [
          '16 เมตร/วินาที',
          '4 เมตร/วินาที',
          '80 เมตร/วินาที',
          '20 เมตร/วินาที',
        ],
        answerIndex: 0,
        explain: 'จากกฎข้อที่สองของนิวตัน ΣF = ma จะได้ความเร่ง a = F/m = 20/5 = 4 m/s² จากนั้นใช้สูตร v = u + at เมื่อเริ่มต้นจากหยุดนิ่ง (u = 0) จะได้ v = 0 + (4)(4) = 16 m/s 💡 เทคนิคพิชิตคะแนน: หา a จาก F=ma ให้ได้ก่อน แล้วนำไปต่อในสูตรการเคลื่อนที่เส้นตรง',
        svgType: 'physics_force',
        needsFigure: true,
        indicator: `ว 2.2 ${grade}/1`,
      },
      {
        question: `ออร์แกเนลล์คู่ใดต่อไปนี้สามารถพบได้ในเซลล์พืช แต่ "ไม่พบ" ในเซลล์สัตว์?`,
        choices: [
          'ผนังเซลล์ (Cell wall) และ คลอโรพลาสต์ (Chloroplast)',
          'ไมโทคอนเดรีย (Mitochondria) และ ไรโบโซม (Ribosome)',
          'นิวเคลียส (Nucleus) และ กอลจิบอดี (Golgi body)',
          'เยื่อหุ้มเซลล์ (Cell membrane) และ แวคิวโอล (Vacuole)',
        ],
        answerIndex: 0,
        explain: 'เซลล์พืชมีผนังเซลล์ที่ให้ความแข็งแรงและคลอโรพลาสต์ที่ใช้สังเคราะห์ด้วยแสง ซึ่งไม่พบในเซลล์สัตว์ 💡 เทคนิคพิชิตคะแนน: พืชมีผนังเซลล์และคลอโรพลาสต์ ส่วนไมโทคอนเดรียพบในทั้งเซลล์พืชและสัตว์',
        svgType: 'cell_diagram',
        needsFigure: true,
        indicator: `ว 1.2 ${grade}/1`,
      },
      {
        question: `การแบ่งเซลล์แบบ "ไมโทซิส (Mitosis)" แตกต่างจากการแบ่งเซลล์แบบ "ไมโอซิส (Meiosis)" ในประเด็นใดสำคัญที่สุด?`,
        choices: [
          'ไมโทซิสได้เซลล์ลูก 2 เซลล์ที่มีจำนวนโครโมโซมเท่าเซลล์เดิม ส่วนไมโอซิสได้ 4 เซลล์ที่มีโครโมโซมลดลงครึ่งหนึ่ง',
          'ไมโทซิสสร้างเซลล์สืบพันธุ์ ส่วนไมโอซิสสร้างเซลล์ร่างกาย',
          'ไมโทซิสแบ่งนิวเคลียส 2 ครั้ง ส่วนไมโอซิสแบ่งนิวเคลียสเพียงครั้งเดียว',
          'ไมโทซิสทำให้เกิดความหลากหลายทางพันธุกรรมมากกว่าไมโอซิส',
        ],
        answerIndex: 0,
        explain: 'ไมโทซิสเป็นการแบ่งเซลล์ร่างกายเพื่อการเจริญเติบโต ได้เซลล์ลูก 2 เซลล์ (2n) ส่วนไมโอซิสเป็นการสร้างเซลล์สืบพันธุ์ ได้เซลล์ลูก 4 เซลล์ (n) 💡 เทคนิคพิชิตคะแนน: ท่องจำ "ไมโท = ทวีคูณร่างกาย โครโมโซมเท่าเดิม / ไมโอ = สร้างไข่และอสุจิ โครโมโซมลดลงครึ่งหนึ่ง"',
        svgType: 'mitosis_meiosis',
        needsFigure: true,
        indicator: `ว 1.3 ${grade}/1`,
      },
      {
        question: `นำต้นถั่วลันเตารุ่นพ่อแม่ที่มีจีโนไทป์พันธุ์ทางสำหรับลักษณะความสูง (Tt) มาผสมพันธุ์กันเอง อัตราส่วนฟีโนไทป์ของรุ่นลูก (ต้นสูง : ต้นเตี้ย) จะเป็นเท่าใด?`,
        choices: [
          '3 : 1',
          '1 : 1',
          '1 : 2 : 1',
          '4 : 0',
        ],
        answerIndex: 0,
        explain: 'จากการเขียนตาราง Punnett Square: Tt × Tt จะได้จีโนไทป์ TT : Tt : tt ในอัตราส่วน 1 : 2 : 1 โดย TT และ Tt จะแสดงลักษณะต้นสูง (ยีนเด่นข่มยีนด้อย) มี 3 ส่วน และ tt แสดงต้นเตี้ย 1 ส่วน 💡 เทคนิคพิชิตคะแนน: พันธุ์ทางผสมกันเอง (Tt × Tt) จะได้อัตราส่วนฟีโนไทป์ เด่น:ด้อย = 3:1 เสมอ',
        svgType: 'punnett_genetics',
        needsFigure: true,
        indicator: `ว 1.3 ${grade}/2`,
      },
      {
        question: `ห้องหัวใจของมนุษย์ห้องใดที่มีผนังกล้ามเนื้อหนาที่สุด และทำหน้าที่สูบฉีดเลือดไปยังส่วนต่างๆ ทั่วร่างกาย?`,
        choices: [
          'หัวใจห้องล่างซ้าย (Left Ventricle)',
          'หัวใจห้องล่างขวา (Right Ventricle)',
          'หัวใจห้องบนซ้าย (Left Atrium)',
          'หัวใจห้องบนขวา (Right Atrium)',
        ],
        answerIndex: 0,
        explain: 'หัวใจห้องล่างซ้ายต้องใช้แรงบีบตัวมหาศาลเพื่อส่งเลือดที่มีออกซิเจนสูงผ่านหลอดเลือดเอออร์ตาไปเลี้ยงทั่วร่างกาย ผนังจึงหนาที่สุด 💡 เทคนิคพิชิตคะแนน: ท่องจำเส้นทางเลือด: "ขวาบนรับเลือดดำ ขวาล่างส่งไปปอด ซ้ายบนรับเลือดแดง ซ้ายล่างหนาสุดส่งทั่วตัว"',
        svgType: 'heart_circulation',
        needsFigure: true,
        indicator: `ว 1.2 ${grade}/2`,
      },
      {
        question: `อวัยวะใดในระบบทางเดินอาหารของมนุษย์ที่มีการย่อยสารอาหารประเภทคาร์โบไฮเดรต โปรตีน และไขมันอย่างสมบูรณ์ และเป็นแหล่งดูดซึมสารอาหารมากที่สุด?`,
        choices: [
          'ลำไส้เล็ก',
          'กระเพาะอาหาร',
          'ปาก',
          'ลำไส้ใหญ่',
        ],
        answerIndex: 0,
        explain: 'ลำไส้เล็กได้รับเอนไซม์จากตับอ่อนและน้ำดีจากตับ จึงเกิดการย่อยสารอาหารทุกประเภทจนโมเลกุลเล็กที่สุดและดูดซึมผ่านวิลไล (Villi) 💡 เทคนิคพิชิตคะแนน: กระเพาะอาหารย่อยโปรตีนเท่านั้น ส่วนลำไส้เล็กย่อยและดูดซึม "ทุกสารอาหาร"',
        svgType: 'digestive_system',
        needsFigure: true,
        indicator: `ว 1.2 ${grade}/2`,
      },
      {
        question: `การแลกเปลี่ยนแก๊สออกซิเจน (O₂) และคาร์บอนไดออกไซด์ (CO₂) ระหว่างถุงลมปอดกับหลอดเลือดฝอยเกิดขึ้นโดยอาศัยกลไกใด?`,
        choices: [
          'การแพร่แบบธรรมดา (Simple Diffusion) ตามความต่างของความดันย่อยของแก๊ส',
          'การลำเลียงแบบใช้พลังงาน (Active Transport) โดยใช้ ATP',
          'กระบวนการฟาโกไซโทซิส (Phagocytosis)',
          'การออสโมซิสของโมเลกุลน้ำ',
        ],
        answerIndex: 0,
        explain: 'แก๊สจะแพร่จากบริเวณที่มีความดันย่อยสูงไปยังบริเวณที่มีความดันย่อยต่ำกว่าโดยไม่ต้องใช้พลังงาน ATP 💡 เทคนิคพิชิตคะแนน: แก๊สในปอดเคลื่อนที่ด้วย "การแพร่ (Diffusion)" เสมอ ไม่ใช่การลำเลียงแบบใช้พลังงาน',
        svgType: 'respiratory_alveoli',
        needsFigure: true,
        indicator: `ว 1.2 ${grade}/2`,
      },
      {
        question: `เมื่อนำเซลล์เม็ดเลือดแดงของมนุษย์ไปแช่ใน "น้ำกลั่นบริสุทธิ์" จะเกิดการเปลี่ยนแปลงตามข้อใด?`,
        choices: [
          'น้ำจากภายนอกจะออสโมซิสเข้าสู่เซลล์ จนเซลล์เต่งและแตกออกในที่สุด',
          'น้ำจากภายในเซลล์จะออสโมซิสออก เซลล์จะเหี่ยวลง',
          'เซลล์จะไม่เปลี่ยนแปลงขนาดเพราะมีเยื่อหุ้มเซลล์หนา',
          'เซลล์จะแบ่งตัวเพิ่มจำนวนอย่างรวดเร็ว',
        ],
        answerIndex: 0,
        explain: 'น้ำกลั่นเป็นสารละลายไฮโพโทนิก (Hypotonic) น้ำจะออสโมซิสเข้าสู่เซลล์ และเนื่องจากเซลล์สัตว์ไม่มีผนังเซลล์ เซลล์จึงแตก (Hemolysis) 💡 เทคนิคพิชิตคะแนน: ไฮโพโทนิก (น้ำเข้าจนแตก) / ไฮเพอร์โทนิก (น้ำออกจนเหี่ยว)',
        svgType: 'osmosis_diffusion',
        needsFigure: true,
        indicator: `ว 1.2 ${grade}/1`,
      },
      {
        question: `ธาตุในหมู่ 1A (โลหะแอลคาไล เช่น Na, K) มีสมบัติทางเคมีที่สำคัญตามข้อใด?`,
        choices: [
          'มีเวเลนซ์อิเล็กตรอนเท่ากับ 1 สูญเสียอิเล็กตรอนได้ง่าย และทำปฏิกิริยารุนแรงกับน้ำได้แก๊สไฮโดรเจน',
          'มีเวเลนซ์อิเล็กตรอนเท่ากับ 7 รับอิเล็กตรอนได้ง่าย และเป็นก๊าซเฉื่อย',
          'ไม่ทำปฏิกิริยากับสารใดๆ เลยในสภาวะปกติ',
          'มีความเป็นอโลหะสูงและนำไฟฟ้าไม่ได้',
        ],
        answerIndex: 0,
        explain: 'โลหะแอลคาไลมี 1 เวเลนซ์อิเล็กตรอน จึงว่องไวต่อการเสียอิเล็กตรอนเพื่อจัดเรียงอิเล็กตรอนให้เสถียร เมื่อทำปฏิกิริยากับน้ำจะเกิดเบสและแก๊ส H₂ 💡 เทคนิคพิชิตคะแนน: เลขหมู่บอกจำนวน "เวเลนซ์อิเล็กตรอน" หมู่ 1 = เวเลนซ์ 1 เสียอิเล็กตรอนง่ายที่สุด',
        svgType: 'periodic_table',
        needsFigure: true,
        indicator: `ว 2.1 ${grade}/1`,
      },
      {
        question: `เมื่อนำสารละลายกรดไฮโดรคลอริก (HCl) ผสมกับสารละลายโซเดียมไฮดรอกไซด์ (NaOH) ในสัดส่วนที่พอดีกัน จะเกิดสารผลิตภัณฑ์ชนิดใด?`,
        choices: [
          'เกลือโซเดียมคลอไรด์ (NaCl) และน้ำ (H₂O)',
          'แก๊สไฮโดรเจน และเกลือคลอไรด์',
          'แก๊สคาร์บอนไดออกไซด์ และน้ำ',
          'สารละลายเบสแก่และกรดแก่',
        ],
        answerIndex: 0,
        explain: 'ปฏิกิริยาสะเทิน (Neutralization): กรด + เบส → เกลือ + น้ำ (HCl + NaOH → NaCl + H₂O) 💡 เทคนิคพิชิตคะแนน: ท่องจำแม่นยำ: "กรด + เบส ได้ เกลือ + น้ำ เสมอ"',
        svgType: 'chem_safety',
        needsFigure: true,
        indicator: `ว 2.1 ${grade}/2`,
      },
      {
        question: `ปรากฏการณ์ "ลมบก" และ "ลมทะเล" เกิดขึ้นจากกระบวนการถ่ายโอนความร้อนในข้อใดเป็นหลัก?`,
        choices: [
          'การพาความร้อน (Convection) เนื่องจากความจุความร้อนจำเพาะของดินและน้ำแตกต่างกัน',
          'การนำความร้อน (Conduction) ผ่านโมเลกุลของพื้นดินสู่ชั้นบรรยากาศ',
          'การแผ่รังสีความร้อน (Radiation) ของดวงอาทิตย์โดยตรงในเวลากลางคืน',
          'การเกิดปฏิกิริยานิวเคลียร์ฟิวชันในอากาศ',
        ],
        answerIndex: 0,
        explain: 'ดินร้อนเร็วกว่าและเย็นเร็วกว่าน้ำ ทำให้อากาศร้อนลอยตัวสูงขึ้นและอากาศเย็นพัดเข้ามาแทนที่ด้วยกระบวนการพาความร้อน 💡 เทคนิคพิชิตคะแนน: ท่องจำ "ลมทะเล พัดจากทะเลเข้าหาฝั่ง (เกิดกลางวัน) / ลมบก พัดจากบกออกสู่ทะเล (เกิดกลางคืน)"',
        svgType: '',
        needsFigure: false,
        indicator: `ว 2.3 ${grade}/1`,
      },
      {
        question: `เมื่อแสงเดินทางผ่านจากตัวกลาง "น้ำ" ออกสู่อากาศ ลำแสงที่หักเหจะเดินทางในลักษณะใด?`,
        choices: [
          'เบนออกจากเส้นแนวฉาก และมีมุมหักเหโตกว่ามุมตกกระทบ',
          'เบนเข้าหาเส้นแนวฉาก และมีมุมหักเหน้อยกว่ามุมตกกระทบ',
          'เดินทางเป็นเส้นตรงในทิศทางเดิมโดยไม่เกิดการหักเห',
          'สะท้อนกลับหมดโดยไม่มีแสงผ่านสู่อากาศได้เลยทุกกรณี',
        ],
        answerIndex: 0,
        explain: 'เมื่อแสงเดินทางจากตัวกลางที่มีความหนาแน่นมาก (ความเร็วแสงน้อย) ไปยังตัวกลางที่มีความหนาแน่นน้อย (ความเร็วแสงมาก) แสงจะเบนออกจากเส้นแนวฉาก 💡 เทคนิคพิชิตคะแนน: ท่องจำ "หนาแน่นมากไปน้อย = เบนออก, หนาแน่นน้อยไปมาก = เบนเข้าหาเส้นปกติ"',
        svgType: 'light_optics',
        needsFigure: true,
        indicator: `ว 2.3 ${grade}/3`,
      },
      {
        question: `คลื่นเสียงเป็นคลื่นกลที่ต้องอาศัยตัวกลางในการเคลื่อนที่ ข้อใดสรุปเกี่ยวกับความเร็วของคลื่นเสียงได้ถูกต้องที่สุด?`,
        choices: [
          'เสียงเดินทางในของแข็งได้เร็วกว่าในของเหลว และในของเหลวเร็วกว่าในแก๊ส',
          'เสียงเดินทางในอากาศได้เร็วกว่าในน้ำและของแข็ง',
          'เสียงสามารถเคลื่อนที่ผ่านสุญญากาศในอวกาศได้ดีที่สุด',
        ],
        answerIndex: 0,
        explain: 'ของแข็งมีอนุภาคเรียงชิดติดกันมากที่สุด จึงส่งผ่านแรงสั่นสะเทือนได้รวดเร็วที่สุด และเสียงไม่สามารถเดินทางผ่านสุญญากาศได้ 💡 เทคนิคพิชิตคะแนน: ความเร็วเสียง: ของแข็ง > ของเหลว > แก๊ส > สุญญากาศ (เดินทางไม่ได้)',
        svgType: '',
        needsFigure: false,
        indicator: `ว 2.3 ${grade}/2`,
      },
      {
        question: `โครงสร้างภายในโลกชั้นใดที่มีสถานะเป็น "ของเหลวหนืดหลอมเหลว" และการหมุนเวียนของชั้นนี้เป็นสาเหตุสำคัญที่ทำให้เกิดสนามแม่เหล็กโลก?`,
        choices: [
          'แก่นโลกชั้นนอก (Outer Core)',
          'แก่นโลกชั้นใน (Inner Core)',
          'เนื้อโลกชั้นบน (Asthenosphere)',
          'เปลือกโลกภาคพื้นทวีป (Crust)',
        ],
        answerIndex: 0,
        explain: 'แก่นโลกชั้นนอกประกอบด้วยเหล็กและนิกเกิลหลอมเหลว การหมุนวนของโลหะเหลวเหนี่ยวนำให้เกิดสนามแม่เหล็กโลก (Geodynamo) 💡 เทคนิคพิชิตคะแนน: แก่นโลกชั้นนอก = ของเหลวเหนี่ยวนำสนามแม่เหล็ก / แก่นโลกชั้นใน = ของแข็งความดันสูง',
        svgType: 'earth_layers',
        needsFigure: true,
        indicator: `ว 3.2 ${grade}/1`,
      },
      {
        question: `หินชนิดใดต่อไปนี้จัดเป็น "หินอัคนีแทรกซอน (Intrusive Igneous Rock)" ที่เกิดจากการเย็นตัวอย่างช้าๆ ของแมกมาใต้เปลือกโลก ทำให้มีเนื้อหินเป็นผลึกขนาดใหญ่?`,
        choices: [
          'หินแกรนิต (Granite)',
          'หินบะซอลต์ (Basalt)',
          'หินออบซิเดียน (Obsidian)',
          'หินปูน (Limestone)',
        ],
        answerIndex: 0,
        explain: 'หินแกรนิตเกิดจากแมกมาเย็นตัวใต้ผิวโลกอย่างช้าๆ ทำให้แร่มีเวลาตกผลึกจนได้ผลึกขนาดใหญ่ 💡 เทคนิคพิชิตคะแนน: เย็นตัวใต้ดินช้าๆ = ผลึกใหญ่ (แกรนิต) / ลาวาพุขึ้นมาผิวดินเย็นตัวเร็ว = ผลึกละเอียดแก้ว (บะซอลต์, ออบซิเดียน)',
        svgType: 'rock_cycle',
        needsFigure: true,
        indicator: `ว 3.2 ${grade}/2`,
      },
      {
        question: `แก๊สเรือนกระจกชนิดใดที่มีศักยภาพในการกักเก็บความร้อนสูงกว่าแก๊สคาร์บอนไดออกไซด์ (CO₂) ถึง 28 เท่า และมักเกิดจากการทำเกษตรกรรม ปศุสัตว์ และการฝังกลบขยะ?`,
        choices: [
          'แก๊สมีเทน (CH₄)',
          'แก๊สออกซิเจน (O₂)',
          'แก๊สไนโตรเจน (N₂)',
          'แก๊สอาร์กอน (Ar)',
        ],
        answerIndex: 0,
        explain: 'แก๊สมีเทน (CH₄) เป็นแก๊สเรือนกระจกที่มีศักยภาพในการกักเก็บความร้อน (Global Warming Potential) สูงกว่า CO₂ มาก 💡 เทคนิคพิชิตคะแนน: แก๊สเรือนกระจกสำคัญ: ไอน้ำ, CO₂, CH₄, N₂O, สาร CFCs',
        svgType: '',
        needsFigure: false,
        indicator: `ว 3.2 ${grade}/3`,
      },
      {
        question: `ปรากฏการณ์ "น้ำเกิด (Spring Tide)" ที่ทำให้ระดับน้ำทะเลขึ้นสูงสุดและลงต่ำสุด เกิดขึ้นในวันทางจันทรคติข้อใด?`,
        choices: [
          'วันขึ้น 15 ค่ำ (วันเพ็ญ) และ วันแรม 15 ค่ำ (วันเดือนดับ)',
          'วันขึ้น 8 ค่ำ และ วันแรม 8 ค่ำ',
          'วันขึ้น 1 ค่ำ และ วันแรม 1 ค่ำ',
          'เกิดขึ้นเฉพาะช่วงฤดูมรสุมเท่านั้น',
        ],
        answerIndex: 0,
        explain: 'ในวันขึ้น 15 ค่ำ และแรม 15 ค่ำ ดวงอาทิตย์ โลก และดวงจันทร์ โคจรมาอยู่ในแนวเส้นตรงเดียวกัน แรงดึงดูดของดวงอาทิตย์และดวงจันทร์จึงเสริมกัน เกิดเป็นน้ำเกิด 💡 เทคนิคพิชิตคะแนน: เรียงแนวเดียวกัน (15 ค่ำ) = น้ำเกิด (น้ำขึ้นสูงสุด-ลงต่ำสุด) / ตั้งฉากกัน (8 ค่ำ) = น้ำตาย (ระดับน้ำต่างกันน้อย)',
        svgType: 'moon_phases',
        needsFigure: true,
        indicator: `ว 3.1 ${grade}/1`,
      },
    ];
    const t = sciTemplates[index % sciTemplates.length];
    return { ...t, level: ((index % 3) + 2), score, source: 'ai' };
  }

  // ---- วิทยาการคำนวณ ----
  if (s.includes('คำนวณ') || s.includes('คอมพิวเตอร์') || uLow.includes('อัลกอริทึม') || uLow.includes('โปรแกรม')) {
    const compTemplates = [
      {
        question: `พิจารณาขั้นตอนวิธี (Algorithm) ต่อไปนี้:\n1. กำหนด x = 5, sum = 0\n2. ทำซ้ำขณะที่ x > 0:\n    sum = sum + x\n    x = x - 2\n3. แสดงผลลัพธ์ sum\nเมื่อโปรแกรมทำงานเสร็จสิ้น ผลลัพธ์ของ sum มีค่าตรงกับข้อใด?`,
        choices: [
          '9',
          '15',
          '8',
          '5',
        ],
        answerIndex: 0,
        explain: 'รอบที่ 1: sum = 0+5=5, x = 3; รอบที่ 2: sum = 5+3=8, x = 1; รอบที่ 3: sum = 8+1=9, x = -1 (หยุดวนลูป) ได้ผลรวม sum = 9 💡 เทคนิคพิชิตคะแนน: สร้างตารางไล่ค่าตัวแปร (Trace Table) ทีละรอบ จะไม่สับสนเงื่อนไขลูป',
        svgType: 'algorithm_flowchart',
        needsFigure: true,
        indicator: `ว 4.2 ${grade}/2`,
      },
      {
        question: `เมื่อนักเรียนได้รับอีเมลแจ้งเตือนว่า "บัญชีธนาคารของท่านถูกระงับชั่วคราว กรุณาคลิกลิงก์ด้านล่างเพื่อยืนยันรหัสผ่านและข้อมูลบัตรประชาชนทันที" การปฏิบัติตามข้อใดปลอดภัยที่สุด?`,
        choices: [
          'ไม่คลิกลิงก์ใดๆ ในอีเมล และโทรศัพท์ติดต่อตรวจสอบกับธนาคารโดยตรงผ่านหมายเลขทางการ',
          'รีบกดคลิกลิงก์เพื่อเข้าไปเปลี่ยนรหัสผ่านทันทีเพื่อป้องกันเงินหาย',
          'ส่งต่ออีเมลนี้ให้เพื่อนทุกคนช่วยกันตรวจสอบ',
          'ตอบกลับอีเมลพร้อมแจ้งหมายเลขบัตรประชาชนเพื่อขอปลดระงับ',
        ],
        answerIndex: 0,
        explain: 'อีเมลดังกล่าวเป็นเทคนิคการหลอกลวงแบบ Phishing เพื่อดักขโมยข้อมูลส่วนตัว ห้ามคลิกลิงก์ในอีเมลหรือข้อความที่ไม่น่าเชื่อถือเด็ดขาด 💡 เทคนิคพิชิตคะแนน: จำหลักความปลอดภัยไซเบอร์: "หน่วยงานทางการและธนาคารไม่มีนโยบายส่งลิงก์ให้กรอกรหัสผ่านผ่าน SMS หรืออีเมล"',
        svgType: '',
        needsFigure: false,
        indicator: `ว 4.2 ${grade}/4`,
      },
    ];
    const t = compTemplates[index % compTemplates.length];
    return { ...t, level: ((index % 3) + 2), score, source: 'ai' };
  }

  // ---- สังคมศึกษา และ ประวัติศาสตร์ ----
  if (s.includes('สังคม') || s.includes('ประวัติ') || s.includes('ศาสนา')) {
    const socTemplates = [
      {
        question: `ในภาวะเศรษฐกิจที่มีปัญหา "เงินเฟ้อ (Inflation)" สูงขึ้นอย่างต่อเนื่อง ธนาคารแห่งประเทศไทย (ธปท.) ควรดำเนินนโยบายการเงินตามข้อใดเพื่อรักษาเสถียรภาพทางเศรษฐกิจ?`,
        choices: [
          'ปรับขึ้นอัตราดอกเบี้ยนโยบาย เพื่อชะลอการกู้ยืมและลดปริมาณเงินหมุนเวียนในระบบ',
          'ปรับลดอัตราดอกเบี้ยนโยบาย เพื่อกระตุ้นให้ประชาชนกู้เงินมาใช้จ่ายเพิ่มขึ้น',
          'พิมพ์ธนบัตรเพิ่มขึ้นแล้วแจกจ่ายให้แก่ประชาชนทุกคน',
          'ลดอัตราเงินสำรองตามกฎหมายของธนาคารพาณิชย์',
        ],
        answerIndex: 0,
        explain: 'เมื่อเกิดเงินเฟ้อ ปริมาณเงินในระบบมีมากเกินไป ธนาคารกลางจะใช้นโยบายการเงินแบบเข้มงวด โดย "ขึ้นอัตราดอกเบี้ย" เพื่อดูดซับสภาพคล่องกลับและชะลอการบริโภค 💡 เทคนิคพิชิตคะแนน: ท่องจำความสัมพันธ์นโยบายการเงิน: "เงินเฟ้อ = ขึ้นดอกเบี้ยดูดเงินกลับ, เงินฝืด = ลดดอกเบี้ยอัดฉีดเงินเข้าสู่ระบบ"',
        svgType: 'economics_supply_demand',
        needsFigure: true,
        indicator: `ส 3.1 ${grade}/2`,
      },
      {
        question: `ข้อใดจัดเป็น "หลักฐานชั้นต้น (Primary Source)" ทางประวัติศาสตร์ไทยที่มีความน่าเชื่อถือสูงที่สุดในการศึกษาเรื่องราวสมัยอยุธยา?`,
        choices: [
          'จดหมายเหตุของบาทหลวงเดอ ชัวซี และบันทึกของเยเรเมียส ฟาน ฟลีต (วัน วลิต)',
          'หนังสือแบบเรียนประวัติศาสตร์ไทยของกระทรวงศึกษาธิการ',
          'นวนิยายอิงประวัติศาสตร์เรื่องบุพเพสันนิวาส',
          'บทความวิเคราะห์ประวัติศาสตร์ในเว็บไซต์สารานุกรมออนไลน์',
        ],
        answerIndex: 0,
        explain: 'หลักฐานชั้นต้นคือหลักฐานที่บันทึกหรือสร้างขึ้นโดยบุคคลที่อยู่ในเหตุการณ์หรือยุคสมัยนั้นจริง เช่น จดหมายเหตุ เอกสารราชการ และจารึก 💡 เทคนิคพิชิตคะแนน: หลักฐานชั้นต้น = คนร่วมยุคสมัยบันทึกไว้, หลักฐานชั้นรอง = คนรุ่นหลังนำมาเรียบเรียงวิเคราะห์ใหม่',
        svgType: '',
        needsFigure: false,
        indicator: `ส 4.1 ${grade}/1`,
      },
    ];
    const t = socTemplates[index % socTemplates.length];
    return { ...t, level: ((index % 3) + 2), score, source: 'ai' };
  }

  // ---- ภาษาอังกฤษ ----
  if (s.includes('อังกฤษ') || s.includes('english') || s.includes('eng')) {
    const engTemplates = [
      {
        question: `Read the situation and choose the best expression:\nSituation: You accidentally spilled coffee on your friend's notebook. What should you say politely?\nYou: "_________________________"`,
        choices: [
          `"I'm terribly sorry! Let me clean it up and buy you a new one."`,
          `"It doesn't matter at all, don't worry about it."`,
          `"Why did you leave your notebook on my table?"`,
          `"Never mind, you can just rewrite it tonight."`,
        ],
        answerIndex: 0,
        explain: 'When you make a mistake or cause damage to someone else, the polite standard reaction is to apologize sincerely and offer a remedy. 💡 เทคนิคพิชิตคะแนน: ข้อสอบสนทนาภาษาอังกฤษ (Situational Dialogues) ให้เลือกตัวเลือกที่ "สุภาพที่สุด แสดงความรับผิดชอบ และแก้ปัญหาอย่างประนีประนอม"',
        svgType: '',
        needsFigure: false,
        indicator: `ต 1.2 ${grade}/1`,
      },
      {
        question: `Choose the grammatically correct sentence that uses the Present Perfect Tense appropriately:`,
        choices: [
          'She has lived in Chiang Mai for five years and still enjoys living there.',
          'She has lived in Chiang Mai yesterday afternoon.',
          'She lived in Chiang Mai since five years ago right now.',
          'She is living in Chiang Mai five years ago.',
        ],
        answerIndex: 0,
        explain: 'Present Perfect Tense (has/have + V.3) is used for actions that started in the past and continue into the present, especially with "for" and "since". It cannot be used with specific past time markers like "yesterday". 💡 เทคนิคพิชิตคะแนน: ถ้าเห็นคำบอกเวลาอดีตเจาะจง (yesterday, last year, ago) ใช้ Past Simple (V.2) ห้ามใช้ Present Perfect',
        svgType: 'english_tenses',
        needsFigure: true,
        indicator: `ต 1.1 ${grade}/2`,
      },
    ];
    const t = engTemplates[index % engTemplates.length];
    return { ...t, level: ((index % 3) + 2), score, source: 'ai' };
  }

  // ---- กลุ่มสาระอื่นๆ (สุขศึกษา, ศิลปะ, การงานอาชีพ) ----
  const defaultTemplates = [
    {
      question: `ในสาระการเรียนรู้วิชา${subject} ชั้น ${grade} หัวข้อ "${u}" การนำหลักกระบวนการทำงานและการแก้ปัญหาไปปฏิบัติในสถานการณ์จริง ข้อใดแสดงถึงความเข้าใจอย่างลึกซึ้งที่สุด?`,
      choices: [
        `การวิเคราะห์สาเหตุของปัญหา วางแผนขั้นตอนการแก้ปัญหาอย่างรอบคอบ และประเมินผลสัมฤทธิ์อย่างเป็นรูปธรรม`,
        `การลงมือปฏิบัติตามความเคยชินโดยไม่ต้องวางแผนล่วงหน้าเพื่อความรวดเร็ว`,
        `การเลือกวิธีแก้ปัญหาที่ง่ายที่สุดโดยไม่คำนึงถึงความปลอดภัยและมาตรฐาน`,
        `การหลีกเลี่ยงการทำงานร่วมกับผู้อื่นและไม่ยอมรับฟังความคิดเห็น`,
      ],
      answerIndex: 0,
      explain: `การเรียนรู้วิชา${subject} มุ่งเน้นกระบวนการคิดวิเคราะห์ การวางแผนเชิงระบบ และการประเมินผลอย่างมีวิจารณญาณ 💡 เทคนิคพิชิตคะแนน: ตัวเลือกที่มีกระบวนการวางแผน เป็นขั้นตอน และคำนึงถึงความปลอดภัยมักเป็นคำตอบที่ถูกต้อง`,
      svgType: '',
      needsFigure: false,
      indicator: getDefaultIndicatorCode(subject, grade),
    },
    {
      question: `จากเรื่อง "${u}" ในวิชา${subject} ข้อใดเป็นการประเมินคุณค่าและการตัดสินใจที่สอดคล้องกับคุณธรรมจริยธรรมและการพัฒนาอย่างยั่งยืน?`,
      choices: [
        `เลือกใช้วัสดุและแนวปฏิบัติที่เป็นมิตรต่อสิ่งแวดล้อม คุ้มค่า และเกิดประโยชน์สูงสุดต่อส่วนรวม`,
        `เลือกวิธีที่ให้ผลกำไรระยะสั้นมากที่สุดแม้จะก่อมลพิษต่อชุมชน`,
        `ปฏิบัติตามผู้อื่นโดยไม่มีการตรวจสอบข้อเท็จจริง`,
        `ละเลยกฎระเบียบความปลอดภัยเพื่อลดต้นทุนการทำงาน`,
      ],
      answerIndex: 0,
      explain: `คุณลักษณะอันพึงประสงค์ตามหลักสูตรแกนกลางฯ มุ่งเน้นความรับผิดชอบต่อส่วนรวมและการพัฒนาอย่างยั่งยืน 💡 เทคนิคพิชิตคะแนน: มองหาตัวเลือกที่เน้นประโยชน์ส่วนรวม ความปลอดภัย และความยั่งยืน`,
      svgType: '',
      needsFigure: false,
      indicator: getDefaultIndicatorCode(subject, grade),
    },
  ];

  const t = defaultTemplates[index % defaultTemplates.length];
  return { ...t, level: ((index % 3) + 2), score, source: 'ai' };
}

/**
 * Synthesize creative, non-repetitive True/False statements with pedagogical explanations
 */
export function synthesizeSubjectTopicTf(
  subject: string,
  unitTopic: string,
  grade: string,
  index: number,
  score: number
): any {
  const s = subject.toLowerCase();
  const u = (unitTopic || subject).trim();
  const variant = index + 1;
  const isTrue = index % 2 === 0;

  if (s.includes('วิทย์') || s.includes('ชีว') || s.includes('เคมี') || s.includes('ฟิสิกส์')) {
    const sciTf = [
      {
        statement: 'ไมโทคอนเดรีย (Mitochondria) ทำหน้าที่สลายสารอาหารเพื่อให้ได้พลังงานเคมีในรูป ATP สำหรับกิจกรรมต่างๆ ภายในเซลล์',
        answer: true,
        explain: 'ถูกต้อง ไมโทคอนเดรียคือโรงไฟฟ้าของเซลล์ (Powerhouse of the cell) ทำหน้าที่สร้าง ATP ผ่านการหายใจระดับเซลล์ 💡 เทคนิคพิชิตคะแนน: จำไมโทคอนเดรีย = ATP',
        svgType: 'cell_diagram',
        needsFigure: true,
      },
      {
        statement: 'เซลล์พืชไม่มีไมโทคอนเดรีย เพราะสามารถใช้คลอโรพลาสต์สร้างพลังงานทดแทนได้ทั้งหมด',
        answer: false,
        explain: 'ไม่ถูกต้อง เซลล์พืชมีทั้งคลอโรพลาสต์ (สร้างอาหาร) และไมโทคอนเดรีย (สลายอาหารเป็นพลังงาน ATP) 💡 เทคนิคพิชิตคะแนน: พืชมีทั้งสองอย่าง สัตว์มีเฉพาะไมโทคอนเดรีย',
        svgType: 'cell_diagram',
        needsFigure: false,
      },
      {
        statement: 'ในวงจรไฟฟ้าแบบขนาน หากหลอดไฟดวงหนึ่งขาด หลอดไฟดวงอื่นในวงจรจะยังคงสว่างได้ตามปกติ',
        answer: true,
        explain: 'ถูกต้อง เพราะการต่อแบบขนาน กระแสไฟฟ้ามีเส้นทางไหลแยกอิสระในแต่ละสาขา 💡 เทคนิคพิชิตคะแนน: ขนาน = อิสระ, อนุกรม = ดับทั้งหมด',
        svgType: 'electric_circuit',
        needsFigure: true,
      },
      {
        statement: 'การเจือจางกรดเข้มข้นอย่างปลอดภัย ควรเทน้ำปริมาณมากลงในกรดเข้มข้นอย่างรวดเร็ว',
        answer: false,
        explain: 'ไม่ถูกต้อง ต้องเทกรดเข้มข้นลงในน้ำอย่างช้าๆ เสมอ เพื่อป้องกันกรดเดือดและกระเด็น 💡 เทคนิคพิชิตคะแนน: "กรดลงน้ำ ห้ามน้ำลงกรด"',
        svgType: 'chem_safety',
        needsFigure: true,
      },
    ];
    const t = sciTf[index % sciTf.length];
    return { ...t, level: ((index % 3) + 1), score, source: 'ai' };
  }

  if (s.includes('คณิต') || s.includes('math')) {
    const mathTf = [
      {
        statement: `เซตว่าง (∅) เป็นสับเซตของทุกเซตเสมอ`,
        answer: true,
        explain: 'ถูกต้อง ตามนิยามทางคณิตศาสตร์ เซตว่างเป็นสับเซตของทุกเซตเสมอรวมทั้งตัวมันเอง 💡 เทคนิคพิชิตคะแนน: ∅ ⊂ A เสมอ',
        svgType: '',
        needsFigure: false,
      },
      {
        statement: `เส้นตรงสองเส้นที่มีความชันเท่ากันและระยะตัดแกน Y ต่างกัน จะมีจุดตัดกัน 1 จุดเสมอ`,
        answer: false,
        explain: 'ไม่ถูกต้อง เส้นตรงที่มีความชันเท่ากันแต่ระยะตัดแกน Y ต่างกัน คือเส้นที่ขนานกัน จึงไม่มีจุดตัดและไม่มีคำตอบ 💡 เทคนิคพิชิตคะแนน: ความชันเท่ากัน = ขนานกัน',
        svgType: 'linear_graph_2',
        needsFigure: true,
      },
      {
        statement: `รูปสามเหลี่ยมมุมฉากที่มีด้านประกอบมุมฉากยาว 6 ซม. และ 8 ซม. จะมีด้านตรงข้ามมุมฉากยาว 10 ซม.`,
        answer: true,
        explain: 'ถูกต้อง จากทฤษฎีพีทาโกรัส c² = 6² + 8² = 36 + 64 = 100 ดังนั้น c = 10 ซม. 💡 เทคนิคพิชิตคะแนน: อัตราส่วน 3:4:5 ขยาย 2 เท่าเป็น 6:8:10',
        svgType: 'right_triangle',
        needsFigure: true,
      },
    ];
    const t = mathTf[index % mathTf.length];
    return { ...t, level: ((index % 3) + 1), score, source: 'ai' };
  }

  return {
    statement: isTrue
      ? `ในการเรียนรู้เรื่อง "${u}" วิชา${subject} การวิเคราะห์หลักการและตรวจสอบข้อมูลเป็นขั้นตอนสำคัญที่ถูกต้องตามมาตรฐาน`
      : `ในการปฏิบัติเรื่อง "${u}" วิชา${subject} เราสามารถละเลยขั้นตอนความปลอดภัยและกฎระเบียบได้หากต้องการความรวดเร็ว`,
    answer: isTrue,
    explain: isTrue
      ? `ถูกต้อง การวิเคราะห์หลักการและตรวจสอบข้อมูลเป็นหัวใจสำคัญของเรื่อง "${u}" 💡 เทคนิคพิชิตคะแนน: ตรวจสอบความถูกต้องและเป็นระบบเสมอ`
      : `ไม่ถูกต้อง การปฏิบัติงานทุกประเภทต้องยึดมั่นในความปลอดภัยและระเบียบขั้นตอนเสมอ 💡 เทคนิคพิชิตคะแนน: กฎความปลอดภัยสำคัญอันดับหนึ่ง`,
    level: ((index % 3) + 1),
    score,
    source: 'ai',
    svgType: '',
    needsFigure: false,
  };
}

export function getDefaultIndicatorCode(subject: string, grade: string): string {
  const s = subject.toLowerCase();
  if (s.includes('ไทย')) return `ท 1.1 ${grade}/1`;
  if (s.includes('คณิต')) return `ค 1.1 ${grade}/1`;
  if (s.includes('คำนวณ') || s.includes('คอม')) return `ว 4.2 ${grade}/1`;
  if (s.includes('วิทยา') || s.includes('วิทย์') || s.includes('เคมี') || s.includes('ชีว') || s.includes('ฟิสิกส์')) return `ว 1.2 ${grade}/1`;
  if (s.includes('ประวัติ')) return `ส 4.1 ${grade}/1`;
  if (s.includes('สังคม')) return `ส 1.1 ${grade}/1`;
  if (s.includes('สุข') || s.includes('พลศึกษา')) return `พ 1.1 ${grade}/1`;
  if (s.includes('ศิลปะ')) return `ศ 1.1 ${grade}/1`;
  if (s.includes('การงาน')) return `ง 1.1 ${grade}/1`;
  if (s.includes('อังกฤษ') || s.includes('eng')) return `ต 1.1 ${grade}/1`;
  return `ว 1.1 ${grade}/1`;
}

/**
 * Filter subject pool so that when the user specifies a focused topic/scope,
 * ONLY relevant pool items are returned (preventing off-topic questions!).
 */
function selectRelevantPool(subject: string, scope: string, title: string, hint: string): ExamItemMc[] {
  const s = subject.toLowerCase();
  const combinedTopic = `${title} ${hint} ${scope}`.toLowerCase();

  // Check for high-specificity topics first
  if (combinedTopic.includes('เซต') || combinedTopic.includes('เวนน์') || combinedTopic.includes('สับเซต')) {
    if (!combinedTopic.includes('จำนวนนับ') && !combinedTopic.includes('เศษส่วน')) {
      return SETS_MC_POOL;
    }
  }
  if (combinedTopic.includes('ระบบสมการ') || combinedTopic.includes('สมการเชิงเส้นสองตัวแปร')) {
    return LINEAR_SYSTEM_MC_POOL;
  }
  if (combinedTopic.includes('เซลล์') || s.includes('ชีววิทยา')) {
    return CELL_BIOLOGY_MC_POOL;
  }
  if (combinedTopic.includes('ปฏิบัติการเคมี') || combinedTopic.includes('ความปลอดภัย') || combinedTopic.includes('เลขนัยสำคัญ') || s.includes('เคมี')) {
    return CHEMISTRY_SAFETY_MC_POOL;
  }

  // Otherwise pick the strict subject pool
  let basePool: ExamItemMc[] = [];
  if (s.includes('ภาษาไทย') || s.includes('ไทย') || s.includes('วรรณคดี')) {
    basePool = THAI_MC_POOL;
  } else if (s.includes('คณิต') || s.includes('เลข') || s.includes('math')) {
    basePool = MATH_MC_POOL;
  } else if (s.includes('อังกฤษ') || s.includes('english') || s.includes('eng')) {
    basePool = ENGLISH_MC_POOL;
  } else if (s.includes('สังคม') || s.includes('ประวัติ') || s.includes('ศาสนา') || s.includes('ภูมิศาสตร์')) {
    basePool = SOCIAL_MC_POOL;
  } else if (s.includes('วิทยา') || s.includes('วิทย์') || s.includes('science') || s.includes('ฟิสิกส์')) {
    basePool = SCIENCE_MC_POOL;
  } else {
    // Computing, Health, Art, Career -> use dynamic topic synthesis directly so it's 100% on-subject
    return [];
  }

  // Filter basePool by user's scope/topic if the user specified a narrow topic (1-3 units)
  const { units, focusedTopic } = extractTargetUnits(scope, title, hint, subject);
  if (focusedTopic) {
    const focusLow = focusedTopic.toLowerCase();
    const matched = basePool.filter((it) => {
      const qLow = it.question.toLowerCase();
      const tagMatch = (it.tags || []).some((t) => focusLow.includes(t.toLowerCase()) || t.toLowerCase().includes(focusLow));
      const wordMatch = units.some((u) => u.length >= 2 && (qLow.includes(u.toLowerCase()) || (it.tags || []).some((t) => u.toLowerCase().includes(t.toLowerCase()))));
      return tagMatch || wordMatch;
    });
    if (matched.length > 0) {
      return matched;
    }
    // If the user typed a narrow custom topic that isn't in the static pool, return empty so synthesizeSubjectTopicMc creates questions specifically for that custom topic!
    if (units.length <= 2) {
      return [];
    }
  }

  return basePool;
}

export function balanceChoicesAndAnswer(item: any, targetIndex: number) {
  if (!item || !Array.isArray(item.choices) || item.choices.length !== 4) return item;
  const currentAns = Math.max(0, Math.min(3, Number(item.answerIndex) || 0));
  if (currentAns === targetIndex) return item;
  const newChoices = [...item.choices];
  const ansContent = newChoices[currentAns];
  newChoices.splice(currentAns, 1);
  newChoices.splice(targetIndex, 0, ansContent);
  return { ...item, choices: newChoices, answerIndex: targetIndex };
}

/**
 * Generate accurate, verified curriculum exam questions strictly matching subject & scope,
 * with selective or full figures.
 */
export function generateAccurateCurriculumExamParts(
  partsCfg: Record<string, any>,
  topic: string,
  grade: string,
  subject: string,
  hint: string = '',
  indicators: string[] = [],
  withFigures: boolean | string = 'smart',
  title: string = ''
) {
  const parts: Record<string, any> = {};
  let totalScore = 0;
  let totalItems = 0;

  const parsePart = (val: any, defaultScore: number) => {
    if (!val) return { count: 0, score: defaultScore };
    if (typeof val === 'number') return { count: Math.max(0, val), score: defaultScore };
    return {
      count: Math.max(0, Number(val.count) || 0),
      score: Number(val.score) > 0 ? Number(val.score) : defaultScore,
    };
  };

  const { units } = extractTargetUnits(topic, title, hint, subject);
  const relevantPool = selectRelevantPool(subject, topic, title, hint);
  const indCodes = Array.isArray(indicators) && indicators.length > 0
    ? indicators.map((x: any) => (typeof x === 'string' ? x : x.code)).filter(Boolean)
    : [getDefaultIndicatorCode(subject, grade)];

  // 1. Multiple Choice (ปรนัย 4 ตัวเลือก)
  const mc = parsePart(partsCfg.mc, 1);
  if (mc.count > 0) {
    const items = [];
    const usedQuestions = new Set<string>();

    for (let i = 0; i < mc.count; i++) {
      let item: any = null;
      let needsFig: boolean | undefined = undefined;
      let svgType = '';

      if (i < relevantPool.length) {
        const poolItem = relevantPool[i];
        svgType = poolItem.svgType || '';
        needsFig = poolItem.needsFigure;
        item = {
          question: poolItem.question,
          choices: [...poolItem.choices],
          answerIndex: poolItem.answerIndex,
          explain: poolItem.explain,
          level: poolItem.level,
          score: mc.score,
          indicator: indCodes[i % indCodes.length] || poolItem.indicator,
          source: 'ai',
        };
      } else {
        const targetUnit = units[i % units.length] || topic || subject;
        const syn = synthesizeSubjectTopicMc(subject, targetUnit, grade, i, mc.score);
        svgType = syn.svgType || '';
        needsFig = syn.needsFigure;
        item = {
          question: syn.question,
          choices: syn.choices,
          answerIndex: syn.answerIndex,
          explain: syn.explain,
          level: syn.level,
          score: mc.score,
          indicator: indCodes[i % indCodes.length] || syn.indicator,
          source: 'ai',
        };
      }

      // Ensure answers are balanced across 0 (ก), 1 (ข), 2 (ค), 3 (ง) if item was single-choice biased
      if (item.answerIndex === 0 && (i % 4 !== 0)) {
        item = balanceChoicesAndAnswer(item, i % 4);
      }

      if (usedQuestions.has(item.question)) {
        let attempts = 0;
        let altIndex = i + 17;
        while (usedQuestions.has(item.question) && attempts < 15) {
          const targetUnit = units[(i + attempts) % units.length] || topic || subject;
          const altSyn = synthesizeSubjectTopicMc(subject, targetUnit, grade, altIndex, mc.score);
          item.question = altSyn.question;
          item.choices = altSyn.choices;
          item.answerIndex = altSyn.answerIndex;
          item.explain = altSyn.explain;
          item.level = altSyn.level;
          item.svgType = altSyn.svgType || '';
          item.needsFigure = altSyn.needsFigure;
          altIndex += 29;
          attempts++;
        }
      }
      usedQuestions.add(item.question);

      if (shouldAttachFigure(withFigures, item.question, needsFig, i)) {
        item.figure = generateSubjectSvg(subject, item.question, i, 'mc', svgType);
      } else {
        item.figure = '';
      }

      items.push(item);
    }

    parts.mc = { score: mc.score, items };
    totalItems += mc.count;
    totalScore += mc.count * mc.score;
  }

  // 2. True / False (ถูก / ผิด)
  const tf = parsePart(partsCfg.tf, 1);
  if (tf.count > 0) {
    const items = [];
    const usedTf = new Set<string>();
    for (let i = 0; i < tf.count; i++) {
      const targetUnit = units[i % units.length] || topic || subject;
      let syn = synthesizeSubjectTopicTf(subject, targetUnit, grade, i, tf.score);
      let attempts = 0;
      let altIdx = i + 11;
      while (usedTf.has(syn.statement) && attempts < 10) {
        syn = synthesizeSubjectTopicTf(subject, targetUnit, grade, altIdx, tf.score);
        altIdx += 17;
        attempts++;
      }
      usedTf.add(syn.statement);

      const attach = shouldAttachFigure(withFigures, syn.statement, Boolean(syn.needsFigure), i);
      items.push({
        statement: syn.statement,
        answer: syn.answer,
        explain: syn.explain,
        level: syn.level,
        score: tf.score,
        indicator: indCodes[i % indCodes.length],
        source: 'ai',
        figure: attach ? generateSubjectSvg(subject, `${targetUnit} ${syn.statement}`, i, 'tf', syn.svgType) : '',
      });
    }
    parts.tf = { score: tf.score, items };
    totalItems += tf.count;
    totalScore += tf.count * tf.score;
  }

  // 3. Matching (จับคู่)
  const match = parsePart(partsCfg.match, 1);
  if (match.count > 0) {
    const items = [];
    for (let i = 0; i < match.count; i++) {
      const targetUnit = units[i % units.length] || `${topic || subject} หัวข้อที่ ${i + 1}`;
      items.push({
        left: `${targetUnit} (แนวคิดหลักที่ ${i + 1})`,
        right: `ความหมายและหลักการสำคัญของเรื่อง ${targetUnit} ในวิชา${subject}`,
        level: 1,
        score: match.score,
        indicator: indCodes[i % indCodes.length],
        source: 'ai',
      });
    }
    parts.match = { score: match.score, items };
    totalItems += match.count;
    totalScore += match.count * match.score;
  }

  // 4. Written (อัตนัย / แสดงวิธีทำ)
  const written = parsePart(partsCfg.written, 5);
  if (written.count > 0) {
    const items = [];
    for (let i = 0; i < written.count; i++) {
      const targetUnit = units[i % units.length] || topic || subject;
      const qText = `จงอธิบายหลักการสำคัญและแสดงวิธีคิด/ยกตัวอย่างการนำความรู้เรื่อง "${targetUnit}" ในวิชา${subject} ชั้น ${grade} ไปประยุกต์ใช้`;
      const attach = shouldAttachFigure(withFigures, qText, i === 0, i);
      items.push({
        question: qText,
        solution: [
          `ขั้นที่ 1: สรุปหลักการและแนวคิดสำคัญของเรื่อง "${targetUnit}"`,
          `ขั้นที่ 2: แสดงขั้นตอนการคิดวิเคราะห์หรือวิธีทำอย่างเป็นระบบ`,
          `ขั้นที่ 3: ยกตัวอย่างการนำไปใช้และสรุปคำตอบอย่างชัดเจน`,
        ],
        answer: `อธิบายหลักการของเรื่อง ${targetUnit} พร้อมแสดงขั้นตอนและยกตัวอย่างได้ถูกต้องครบถ้วน`,
        lines: 6,
        level: 3,
        score: written.score,
        indicator: indCodes[i % indCodes.length],
        source: 'ai',
        figure: attach ? generateSubjectSvg(subject, targetUnit, i, 'written') : '',
      });
    }
    parts.written = { score: written.score, items };
    totalItems += written.count;
    totalScore += written.count * written.score;
  }

  return { parts, totalItems, totalScore };
}

/** Backward compatible alias for legacy callers */
export function generateMockExamParts(partsCfg: Record<string, any>, topic: string, grade: string, subject: string) {
  return generateAccurateCurriculumExamParts(partsCfg, topic, grade, subject, '', [], 'smart');
}

/**
 * Generate an accurate, topic-grounded, subject-specific worksheet for all 10 worksheet types in index.php!
 * Also attaches clean SVG diagrams (`figures` array + `figure` refs) so worksheets look like real exams/worksheets.
 */
export function generateAccurateWorksheet(
  type: string,
  topic: string,
  grade: string,
  subject: string = 'วิทยาศาสตร์และเทคโนโลยี',
  itemCount: number = 5,
  figureMode: string = 'code'
): any {
  const cleanTopic = String(topic || subject || 'สาระการเรียนรู้').replace(/\s*\(ตอนที่\s*\d+\)\s*$/, '').trim();
  const indCode = getDefaultIndicatorCode(subject, grade);
  const generatedExam = generateAccurateCurriculumExamParts(
    { mc: { count: Math.max(itemCount, 6), score: 1 } },
    cleanTopic,
    grade,
    subject,
    cleanTopic,
    [indCode],
    figureMode === 'none' ? 'none' : 'smart',
    cleanTopic
  );
  const mcItems = generatedExam.parts.mc?.items || [];

  // Build WSRender-compatible figures array for items that have a figure
  const figures: any[] = [];
  const registerFigure = (svgStr: string, caption: string, idx: number): string => {
    if (!svgStr || figureMode === 'none') return '';
    const figId = `fig_${idx + 1}`;
    figures.push({
      id: figId,
      kind: 'svg',
      svg: svgStr,
      caption,
      imagePrompt: `${subject} ${cleanTopic} diagram ${idx + 1}`,
    });
    return figId;
  };

  const baseSheet: any = {
    title: `ใบงานเรื่อง ${topic}`,
    topic,
    subject,
    grade,
    type: type || 'multiple_choice',
    time: '30 นาที',
    score: itemCount,
    objective: `เพื่อให้นักเรียนชั้น ${grade} ฝึกทักษะและเข้าใจเนื้อหาเรื่อง ${cleanTopic} ในวิชา${subject}`,
    indicators: [{ code: indCode, text: `เข้าใจและประยุกต์ใช้ความรู้เรื่อง ${cleanTopic} (${subject})` }],
    headerImagePrompt: `${subject} ${cleanTopic}`,
  };

  if (type === 'fill_blank') {
    const wordBank: string[] = [];
    const items = mcItems.slice(0, itemCount).map((mc: any, i: number) => {
      const ans = String(mc.choices[mc.answerIndex] || `คำตอบที่ ${i + 1}`).slice(0, 45);
      wordBank.push(ans);
      const qClean = String(mc.question).replace(/\?$/, '');
      const figRef = registerFigure(mc.figure, `ภาพประกอบข้อที่ ${i + 1}`, i);
      return {
        text: `${qClean} คือ ________`,
        answer: ans,
        figure: figRef,
        svgFigure: mc.figure || '',
        imagePrompt: mc.figure ? `${subject} ${cleanTopic} item ${i + 1}` : '',
      };
    });
    return {
      ...baseSheet,
      instruction: 'ให้นักเรียนเลือกคำหรือข้อความที่กำหนดให้ เติมลงในช่องว่างให้ถูกต้องสมบูรณ์',
      wordBank,
      items,
      figures,
    };
  }

  if (type === 'true_false') {
    const items = mcItems.slice(0, itemCount).map((mc: any, i: number) => {
      const isTrue = i % 2 === 0;
      const chosenChoice = isTrue ? mc.choices[mc.answerIndex] : mc.choices[(mc.answerIndex + 1) % mc.choices.length];
      const statement = `${String(mc.question).replace(/\?$/, '')} คำตอบที่ถูกต้องคือ "${chosenChoice}"`;
      const figRef = registerFigure(mc.figure, `ภาพประกอบข้อที่ ${i + 1}`, i);
      return {
        statement,
        answer: isTrue,
        explain: mc.explain,
        figure: figRef,
        svgFigure: mc.figure || '',
        imagePrompt: mc.figure ? `${subject} ${cleanTopic} item ${i + 1}` : '',
      };
    });
    return {
      ...baseSheet,
      instruction: 'ให้พิจารณาข้อความต่อไปนี้ หากถูกต้องให้เขียนเครื่องหมาย ✓ หากผิดให้เขียนเครื่องหมาย ✗ หน้าข้อ',
      items,
      figures,
    };
  }

  if (type === 'matching') {
    const items = mcItems.slice(0, itemCount).map((mc: any, i: number) => ({
      left: String(mc.question).replace(/\?$/, ''),
      right: String(mc.choices[mc.answerIndex]),
      imagePrompt: '',
    }));
    return {
      ...baseSheet,
      instruction: 'ให้นักเรียนจับคู่โจทย์หรือข้อความทางด้านซ้าย กับคำตอบที่สัมพันธ์กันทางด้านขวาให้ถูกต้อง',
      items,
      figures: [],
    };
  }

  if (type === 'ordering') {
    const items = mcItems.slice(0, itemCount).map((mc: any, i: number) => ({
      label: `ขั้นที่ ${i + 1}: ${mc.choices[mc.answerIndex]} (${String(mc.question).slice(0, 40)})`,
      order: i + 1,
      imagePrompt: '',
    }));
    return {
      ...baseSheet,
      instruction: `ให้นักเรียนเรียงลำดับขั้นตอนหรือกระบวนการของเรื่อง "${cleanTopic}" จากลำดับที่ 1 ถึง ${itemCount}`,
      items,
      figures: [],
    };
  }

  if (type === 'short_answer') {
    const items = mcItems.slice(0, itemCount).map((mc: any, i: number) => {
      const figRef = registerFigure(mc.figure, `แผนภาพประกอบข้อ ${i + 1}`, i);
      return {
        question: mc.question,
        answer: mc.choices[mc.answerIndex],
        explain: mc.explain,
        level: mc.level,
        indicator: indCode,
        figure: figRef,
        svgFigure: mc.figure || '',
      };
    });
    return {
      ...baseSheet,
      instruction: 'ให้นักเรียนตอบคำถามต่อไปนี้ให้ถูกต้องและกระชับได้ใจความ',
      items,
      figures,
    };
  }

  if (type === 'calculation') {
    const items = mcItems.slice(0, itemCount).map((mc: any, i: number) => {
      const figRef = registerFigure(mc.figure, `แผนภาพประกอบข้อ ${i + 1}`, i);
      return {
        question: mc.question,
        solution: [
          `วิเคราะห์โจทย์: ${mc.question}`,
          `วิธีคิด/หลักการ: ${mc.explain}`,
        ],
        answer: mc.choices[mc.answerIndex],
        lines: 4,
        level: mc.level,
        indicator: indCode,
        figure: figRef,
        svgFigure: mc.figure || '',
      };
    });
    return {
      ...baseSheet,
      instruction: 'ให้นักเรียนแสดงวิธีคิดหรือวิธีทำอย่างละเอียด พร้อมระบุคำตอบที่ถูกต้อง',
      items,
      figures,
    };
  }

  if (type === 'multi_statement') {
    const items = mcItems.slice(0, itemCount).map((mc: any, i: number) => {
      const figRef = registerFigure(mc.figure, `แผนภาพประกอบข้อ ${i + 1}`, i);
      return {
        question: `พิจารณาข้อความเกี่ยวกับ "${cleanTopic}" ต่อไปนี้ (${mc.question})`,
        statements: [
          `${mc.choices[mc.answerIndex]} (สอดคล้องกับหลักวิชาการ)`,
          `${mc.explain}`,
          `${mc.choices[(mc.answerIndex + 1) % 4]} (ข้อความคลาดเคลื่อน)`,
        ],
        correct: [1, 2],
        explain: mc.explain,
        level: mc.level,
        indicator: indCode,
        figure: figRef,
        svgFigure: mc.figure || '',
      };
    });
    return {
      ...baseSheet,
      instruction: 'ให้พิจารณาข้อความย่อยที่กำหนดให้ แล้วเลือกตัวเลือกที่ระบุข้อความที่ถูกต้องทั้งหมด',
      items,
      figures,
    };
  }

  if (type === 'data_set') {
    const mainSvg = generateSubjectSvg(subject, cleanTopic, 0, 'mc');
    const stimFigId = registerFigure(mainSvg, `ข้อมูลและแผนภาพเรื่อง ${cleanTopic}`, 0);
    const items = mcItems.slice(0, itemCount).map((mc: any) => ({
      question: mc.question,
      choices: mc.choices,
      answerIndex: mc.answerIndex,
      explain: mc.explain,
      level: mc.level,
      indicator: indCode,
      figure: '',
    }));
    return {
      ...baseSheet,
      instruction: 'ให้นักเรียนศึกษารายละเอียดและแผนภาพที่กำหนดให้ แล้วตอบคำถามให้ถูกต้อง',
      stimulus: `สถานการณ์และข้อมูลทางวิชาการเรื่อง "${cleanTopic}" สำหรับวิชา${subject} ชั้น ${grade}: ให้นักเรียนสังเกตแผนภาพและวิเคราะห์ข้อมูลเพื่อใช้ตอบคำถาม`,
      stimulusFigure: stimFigId,
      items,
      figures,
    };
  }

  if (type === 'exam') {
    const mcSub = mcItems.slice(0, Math.max(2, itemCount - 1)).map((mc: any, i: number) => {
      const figRef = registerFigure(mc.figure, `แผนภาพประกอบข้อ ${i + 1}`, i);
      return {
        question: mc.question,
        choices: mc.choices,
        answerIndex: mc.answerIndex,
        explain: mc.explain,
        level: mc.level,
        indicator: indCode,
        figure: figRef,
        svgFigure: mc.figure || '',
      };
    });
    const lastMc = mcItems[mcItems.length - 1] || mcItems[0];
    const writtenItems = [
      {
        question: `จงอธิบายหลักการสำคัญและแสดงวิธีคิดในเรื่อง "${cleanTopic}" (${lastMc.question})`,
        solution: [`1. วิเคราะห์โจทย์และหลักการของ ${cleanTopic}`, `2. ${lastMc.explain}`],
        answer: lastMc.choices[lastMc.answerIndex],
        lines: 5,
        level: 3,
        indicator: indCode,
        figure: '',
      },
    ];
    return {
      ...baseSheet,
      instruction: 'แบบทดสอบฉบับนี้แบ่งเป็น 2 ตอน ได้แก่ ตอนที่ 1 แบบปรนัย 4 ตัวเลือก และตอนที่ 2 แบบอัตนัยแสดงวิธีทำ',
      mcItems: mcSub,
      writtenItems,
      items: mcSub,
      figures,
    };
  }

  // Default: multiple_choice
  const items = mcItems.slice(0, itemCount).map((mc: any, i: number) => {
    const figRef = registerFigure(mc.figure, `แผนภาพประกอบข้อที่ ${i + 1}`, i);
    return {
      question: mc.question,
      choices: mc.choices,
      answerIndex: mc.answerIndex,
      explain: mc.explain,
      level: mc.level,
      indicator: indCode,
      figure: figRef,
      svgFigure: mc.figure || '',
      imagePrompt: mc.figure ? `${subject} ${cleanTopic} item ${i + 1}` : '',
    };
  });

  return {
    ...baseSheet,
    instruction: 'ให้นักเรียนเลือกคำตอบที่ถูกต้องที่สุดเพียงข้อเดียว',
    items,
    figures,
  };
}

/** Generate mock single worksheet (backward compatible) */
export function generateMockSheet(type: string, topic: string, grade: string, itemCount: number = 5, subject: string = 'วิทยาศาสตร์และเทคโนโลยี'): any {
  return generateAccurateWorksheet(type, topic, grade, subject, itemCount, 'code');
}

/** Generate SVG line art for educational diagrams */
export function generateSvgLineArt(prompt: string): string {
  return generateSubjectSvg('', prompt, 0, 'mc');
}
