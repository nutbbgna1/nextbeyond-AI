<?php
declare(strict_types=1);

/* JSON schema ที่บังคับให้ Gemini ตอบตามรูปแบบ (ใช้กับ responseJsonSchema) */

function s_str(string $desc = ''): array
{
    return $desc === '' ? ['type' => 'string'] : ['type' => 'string', 'description' => $desc];
}

function s_obj(array $props): array
{
    return ['type' => 'object', 'properties' => $props, 'required' => array_keys($props)];
}

function s_list(array $items, string $desc = ''): array
{
    $a = ['type' => 'array', 'items' => $items];
    if ($desc !== '') {
        $a['description'] = $desc;
    }
    return $a;
}

const S_IMG = 'คำบรรยายภาพเป็นภาษาอังกฤษสั้นๆ วัตถุเดียว เช่น "a sprouting seed" ใส่ค่าว่าง "" ถ้าไม่ต้องการภาพ';

function plan_schema(bool $withIndicators = false): array
{
    $one = [
        'topic'     => s_str('หัวข้อย่อยของใบงานนี้ ภาษาไทย สั้นกระชับ'),
        'type'      => ['type' => 'string', 'enum' => SHEET_TYPES],
        'objective' => s_str('จุดประสงค์การเรียนรู้ของใบงานนี้ 1 ประโยค'),
    ];
    if ($withIndicators) {
        $one['indicatorCodes'] = s_list(s_str(), 'รหัสตัวชี้วัด (จากรายการที่ให้) ที่ใบงานนี้วัด 1-3 รหัส');
    }
    return s_obj(['sheets' => s_list(s_obj($one))]);
}

/** เพิ่มช่องให้ทุกข้อในรายการ items/mcItems/writtenItems (เช่น indicator, level) */
function schema_add_item_fields(array $schema, array $fields): array
{
    foreach (['items', 'mcItems', 'writtenItems'] as $k) {
        if (isset($schema['properties'][$k]['items']['properties'])) {
            foreach ($fields as $name => $def) {
                $schema['properties'][$k]['items']['properties'][$name] = $def;
                $schema['properties'][$k]['items']['required'][] = $name;
            }
        }
    }
    return $schema;
}

const S_NUM = ['type' => 'number'];
const S_INT = ['type' => 'integer'];
const S_BOOL = ['type' => 'boolean'];
const S_REF = 'รหัสรูปจาก figures เช่น "F1" ถ้าข้อนี้ใช้รูปประกอบ หรือ "" ถ้าไม่ใช้';

function sheet_header_props(): array
{
    return [
        'topic'             => s_str('หัวข้อของใบงาน (ภาษาไทย)'),
        'instruction'       => s_str("คำชี้แจง 1 ประโยค ภาษาไทย ขึ้นต้นด้วย 'ให้นักเรียน'"),
        'headerImagePrompt' => s_str('ภาพตกแต่งมุมบนของใบงานเป็นภาษาอังกฤษ เช่น "a cute smiling sun" หรือ "" ถ้าไม่ต้องการ'),
    ];
}

/**
 * รูปประกอบที่ "ระบบวาดเอง" จากข้อมูล (แม่นยำกว่าให้ AI วาดภาพ) หรือให้ AI วาดจาก imagePrompt
 *  kind=graph   : กราฟเส้นจาก series[].points (แกน xLabel/yLabel) + marks = จุดกำกับ
 *  kind=diagram : แผนภาพบนพื้นที่ x 0-100, y 0-60 (y ชี้ขึ้น) จาก shapes (box/circle/line/dashed/arrow) + marks = ป้ายข้อความ
 *  kind=table   : ตาราง headers + rows
 *  kind=image   : ภาพประกอบทั่วไปที่ให้ AI วาดจาก imagePrompt
 */
function figure_schema(): array
{
    return s_obj([
        'id'          => s_str('รหัสรูป F1, F2, ... ไม่ซ้ำกัน'),
        'kind'        => ['type' => 'string', 'enum' => ['graph', 'diagram', 'table', 'image']],
        'caption'     => s_str('คำอธิบายใต้รูปสั้นๆ ภาษาไทย (ไม่ต้องใส่คำว่า "รูปที่")'),
        'imagePrompt' => s_str('คำบรรยายรูปนี้เป็นภาษาอังกฤษ 1 ประโยค (ใช้เมื่อครูเลือกให้ AI วาดภาพ) ห้ามมีตัวหนังสือในภาพ'),
        'xLabel'      => s_str('ชื่อแกน x พร้อมหน่วย เช่น "s (m)" หรือ ""'),
        'yLabel'      => s_str('ชื่อแกน y พร้อมหน่วย เช่น "F (N)" หรือ ""'),
        'series'      => s_list(s_obj([
            'label'  => s_str('ชื่อเส้น หรือ ""'),
            'shade'  => ['type' => 'boolean', 'description' => 'true = แรเงาพื้นที่ใต้เส้น'],
            'points' => s_list(s_obj(['x' => S_NUM, 'y' => S_NUM]), 'จุดบนเส้นเรียงตาม x อย่างน้อย 2 จุด'),
        ]), 'สำหรับ kind=graph เท่านั้น นอกนั้นใส่ []'),
        'marks'       => s_list(s_obj(['x' => S_NUM, 'y' => S_NUM, 'label' => s_str()]), 'จุด/ป้ายข้อความกำกับ เช่น "A" หรือ "5 kg" ใส่ [] ถ้าไม่มี'),
        'shapes'      => s_list(s_obj([
            'shape' => ['type' => 'string', 'enum' => ['box', 'circle', 'line', 'dashed', 'arrow']],
            'x1'    => S_NUM,
            'y1'    => S_NUM,
            'x2'    => S_NUM,
            'y2'    => S_NUM,
            'label' => s_str('ข้อความในกล่อง/ปลายลูกศร หรือ ""'),
        ]), 'สำหรับ kind=diagram: box=(x1,y1) มุมล่างซ้าย (x2,y2) มุมบนขวา, circle=(x1,y1) จุดศูนย์กลาง x2=รัศมี, line/dashed=เส้นตรง, arrow=ลูกศรจาก (x1,y1) ไป (x2,y2) นอกนั้นใส่ []'),
        'headers'     => s_list(s_str(), 'หัวตาราง สำหรับ kind=table นอกนั้นใส่ []'),
        'rows'        => s_list(s_list(s_str()), 'แถวของตาราง จำนวนช่องเท่ากับ headers นอกนั้นใส่ []'),
    ]);
}

function mc_item(bool $formal): array
{
    $it = [
        'question'    => s_str('คำถาม'),
        'choices'     => s_list(s_str(), 'ตัวเลือก 4 ข้อ ไม่ซ้ำกัน ไม่ต้องใส่ ก. ข. ค. ง.'),
        'answerIndex' => ['type' => 'integer', 'description' => 'ลำดับตัวเลือกที่ถูก 0-3'],
    ];
    if ($formal) {
        $it['explain'] = s_str('เหตุผลหรือวิธีคิดสั้นๆ สำหรับเฉลย 1-2 ประโยค');
        $it['figure'] = s_str(S_REF);
    } else {
        $it['imagePrompt'] = s_str(S_IMG);
    }
    return s_obj($it);
}

function calc_item(): array
{
    return s_obj([
        'question'    => s_str('โจทย์ที่ให้ค่าครบสำหรับคำนวณ ระบุหน่วยชัดเจน'),
        'solution'    => s_list(s_str(), 'วิธีทำทีละบรรทัด: สูตรที่ใช้ → แทนค่า → คำตอบ (ใช้ LaTeX ใน $...$)'),
        'answer'      => s_str('คำตอบสุดท้ายพร้อมหน่วย เช่น "40 N"'),
        'answerValue' => ['type' => 'number', 'description' => 'ค่าตัวเลขของคำตอบสุดท้าย (หน่วยเดียวกับ answer) หรือ 0 ถ้าไม่ใช่ตัวเลข'],
        'checkExpr'   => s_str('นิพจน์คณิตศาสตร์ที่คำนวณได้ answerValue จากค่าในโจทย์ ใช้ได้เฉพาะตัวเลข + - * / ^ ( ) sqrt sin cos tan (องศา) log ln pi เช่น "(5+10)*(40/15)" หรือ "" ถ้าไม่ใช่โจทย์คำนวณ'),
        'lines'       => ['type' => 'integer', 'description' => 'จำนวนบรรทัดว่างสำหรับเขียนวิธีทำ 3-10'],
        'figure'      => s_str(S_REF),
    ]);
}

function sheet_schema(string $type, bool $formal = false): array
{
    $h = sheet_header_props();
    $figs = ['figures' => s_list(figure_schema(), 'รูปประกอบที่โจทย์อ้างถึง ใส่ [] ถ้าไม่ใช้')];
    switch ($type) {
        case 'fill_blank':
            return s_obj($h + [
                'wordBank' => s_list(s_str(), 'คลังคำ = คำตอบของทุกข้อ ไม่ซ้ำกัน จำนวนเท่ากับจำนวนข้อ'),
                'items'    => s_list(s_obj([
                    'text'        => s_str('ประโยคที่มีช่องว่าง ____ (ขีดล่าง 4 ตัว) เพียง 1 ช่อง'),
                    'answer'      => s_str('คำตอบ ต้องตรงกับคำในคลังคำ'),
                    'imagePrompt' => s_str(S_IMG),
                ])),
            ]);
        case 'multiple_choice':
            return s_obj($h + ['items' => s_list(mc_item($formal))] + ($formal ? $figs : []));
        case 'matching':
            return s_obj($h + [
                'items' => s_list(s_obj([
                    'left'        => s_str('ข้อความฝั่งซ้าย'),
                    'right'       => s_str('ข้อความฝั่งขวาที่จับคู่กับฝั่งซ้าย'),
                    'imagePrompt' => s_str(S_IMG),
                ])),
            ]);
        case 'true_false':
            return s_obj($h + [
                'items' => s_list(s_obj([
                    'statement'   => s_str('ข้อความที่ให้ตัดสินว่าถูกหรือผิด'),
                    'answer'      => ['type' => 'boolean', 'description' => 'true = ถูก, false = ผิด'],
                    'imagePrompt' => s_str(S_IMG),
                ])),
            ]);
        case 'ordering':
            return s_obj($h + [
                'items' => s_list(s_obj([
                    'label'       => s_str('ชื่อขั้นตอน/ระยะ สั้นๆ'),
                    'order'       => ['type' => 'integer', 'description' => 'ลำดับที่ถูกต้อง เริ่มที่ 1'],
                    'imagePrompt' => s_str(S_IMG),
                ])),
            ]);
        case 'short_answer':
            return s_obj($h + [
                'items' => s_list(s_obj([
                    'question' => s_str('คำถามที่ตอบได้สั้นๆ ชัดเจน คำตอบเดียว'),
                    'answer'   => s_str('คำตอบที่ถูกต้อง (สั้น)'),
                    'figure'   => s_str(S_REF),
                ])),
            ] + $figs);
        case 'calculation':
            return s_obj($h + ['items' => s_list(calc_item())] + $figs);
        case 'multi_statement':
            return s_obj($h + [
                'items' => s_list(s_obj([
                    'question'   => s_str('คำถามนำ เช่น "ข้อความใดต่อไปนี้ถูกต้อง"'),
                    'statements' => s_list(s_str(), 'ข้อความ 3-4 ข้อ (ไม่ต้องใส่เลขนำหน้า)'),
                    'correct'    => s_list(S_INT, 'เลขข้อความที่ถูกต้อง (เริ่มที่ 1) อย่างน้อย 1 ข้อ'),
                    'explain'    => s_str('เหตุผลสั้นๆ ว่าข้อความใดผิดเพราะอะไร'),
                    'figure'     => s_str(S_REF),
                ])),
            ] + $figs);
        case 'data_set':
            return s_obj($h + [
                'stimulus'       => s_str('ข้อมูล/สถานการณ์ที่ใช้ตอบทุกข้อ 2-5 ประโยค'),
                'stimulusFigure' => s_str('รหัสรูปของข้อมูลชุดนี้ เช่น "F1" (ควรมีกราฟหรือตาราง)'),
                'items'          => s_list(mc_item(true)),
            ] + $figs);
        case 'exam':
            return s_obj($h + [
                'mcItems'      => s_list(mc_item(true), 'ตอนที่ 1 ปรนัย 4 ตัวเลือก'),
                'writtenItems' => s_list(calc_item(), 'ตอนที่ 2 อัตนัย แสดงวิธีทำ/อธิบาย'),
            ] + $figs);
    }
    throw new ApiException('ไม่รู้จักรูปแบบใบงาน', 400, 'BAD_TYPE');
}

/** ใบความรู้ (บทเรียนก่อนทำใบงาน) */
function lesson_schema(): array
{
    return s_obj([
        'title'    => s_str('ชื่อใบความรู้ ภาษาไทย'),
        'intro'    => s_str('บทนำ 1-3 ประโยค'),
        'sections' => s_list(s_obj([
            'heading'   => s_str('หัวข้อย่อย'),
            'body'      => s_str('คำอธิบาย 1-2 ย่อหน้า (คั่นย่อหน้าด้วย \n) ใช้ LaTeX ใน $...$ ได้'),
            'bullets'   => s_list(s_str(), 'ประเด็นสำคัญ หรือ []'),
            'formula'   => s_str('สูตรสำคัญของหัวข้อนี้เป็น LaTeX (ไม่ต้องมี $) หรือ ""'),
            'variables' => s_list(s_obj([
                'symbol'  => s_str('สัญลักษณ์เป็น LaTeX ไม่ต้องมี $ เช่น "F"'),
                'meaning' => s_str('ความหมาย'),
                'unit'    => s_str('หน่วย เช่น "นิวตัน (N)" หรือ "-"'),
            ]), 'ตัวแปรในสูตร หรือ [] ถ้าไม่มีสูตร'),
            'figure'    => s_str(S_REF),
        ]), 'เนื้อหา 2-5 หัวข้อย่อย'),
        'figures'  => s_list(figure_schema(), 'รูปประกอบที่ใช้ในใบความรู้ หรือ []'),
        'examples' => s_list(s_obj([
            'problem'     => s_str('ตัวอย่างโจทย์/สถานการณ์'),
            'figure'      => s_str(S_REF),
            'steps'       => s_list(s_str(), 'วิธีคิด/วิธีทำทีละขั้น'),
            'answer'      => s_str('คำตอบ'),
            'answerValue' => ['type' => 'number', 'description' => 'ค่าตัวเลขของคำตอบ หรือ 0 ถ้าไม่ใช่โจทย์คำนวณ'],
            'checkExpr'   => s_str('นิพจน์ตรวจคำตอบ (กติกาเดียวกับใบงาน) หรือ ""'),
        ]), 'ตัวอย่าง 1-3 ข้อ'),
        'pitfalls' => s_list(s_str(), 'ข้อควรระวัง/จุดที่มักเข้าใจผิด 2-4 ข้อ'),
        'summaryHeaders' => s_list(s_str(), 'หัวตารางสรุป เช่น ["เรื่อง","สาระสำคัญ"] หรือ []'),
        'summaryRows'    => s_list(s_list(s_str()), 'แถวตารางสรุป หรือ []'),
    ]);
}

function review_schema(): array
{
    return s_obj([
        'ok'     => ['type' => 'boolean', 'description' => 'true ถ้าไม่พบปัญหาใดเลย'],
        'issues' => s_list(s_str('ปัญหาที่พบ 1 ข้อความ ระบุข้อที่มีปัญหาชัดเจน')),
    ]);
}

/** ผลจาก AI สำหรับปก คำนำ และการจัดหมวดของเล่มใบงาน */
function book_schema(): array
{
    return s_obj([
        'title'            => s_str('ชื่อเล่ม ภาษาไทย สั้น น่าสนใจ ไม่เกิน 40 ตัวอักษร'),
        'subtitle'         => s_str('ชื่อรอง เช่น ชุดใบงานฝึกทักษะ ชั้น ... วิชา ... ไม่เกิน 60 ตัวอักษร'),
        'tagline'          => s_str('คำขวัญหรือข้อความให้กำลังใจผู้เรียนสั้นๆ 1 ประโยค (เหมาะกับวัย)'),
        'preface'          => s_str('คำนำ 2-3 ย่อหน้าสั้นๆ ภาษาไทย (คั่นย่อหน้าด้วย \n) กล่าวถึงเป้าหมายของเล่ม วิธีใช้ และคำแนะนำผู้เรียน/ผู้สอน'),
        'coverImagePrompt' => s_str('คำบรรยายภาพหน้าปกเป็นภาษาอังกฤษ วัตถุหรือฉากเดียวที่วาดเป็นภาพลายเส้นได้ ไม่มีตัวหนังสือ'),
        'chapters'         => s_list(s_obj([
            'title' => s_str('ชื่อหมวด/บท ภาษาไทย สั้นกระชับ'),
            'uids'  => s_list(s_str(), 'รหัส uid ของใบงานในหมวดนี้ เรียงตามลำดับที่ควรทำ'),
        ]), 'การจัดหมวดใบงาน ทุก uid ต้องปรากฏครั้งเดียวพอดี'),
    ]);
}

/** ตัวชี้วัดที่ AI ถอดจากข้อความของเอกสารหลักสูตร (ใช้เป็นทางเลือกเมื่อถอดด้วยรูปแบบรหัสไม่ได้) */
function indicator_extract_schema(): array
{
    return s_obj([
        'indicators' => s_list(s_obj([
            'code'     => s_str('รหัสเต็มของตัวชี้วัดตามที่ปรากฏในเอกสาร เช่น "ค 1.1 ป.4/5" หรือ "ว 2.1 ม.4-6/1" (ถ้าเอกสารมีแต่ "ป.4/5" ให้ต่อด้วยรหัสมาตรฐานที่อยู่เหนือขึ้นไป)'),
            'text'     => s_str('ข้อความตัวชี้วัดคัดลอกตรงตามเอกสารทุกตัวอักษร ห้ามสรุปหรือเรียบเรียงใหม่'),
            'standard' => s_str('รหัสมาตรฐาน เช่น "ค 1.1" หรือ ""'),
        ])),
    ]);
}
