<?php
declare(strict_types=1);

/* ------------------------------------------------------------------ */
/*  ความยาก 4 ระดับ + สัดส่วนต่อใบงาน                                     */
/*  นิยามเป็นมิติที่ตรวจได้ (ระดับการคิด จำนวนขั้นตอน ตัวลวง ฯลฯ)          */
/*  ไม่ปล่อยให้ AI เดาจากคำว่า "ยาก" เฉยๆ                                 */
/* ------------------------------------------------------------------ */

const LEVEL_IDS = ['easy' => 1, 'medium' => 2, 'hard' => 3, 'expert' => 4];
const LEVEL_NAME = ['easy' => 'ง่าย', 'medium' => 'ปานกลาง', 'hard' => 'ยาก', 'expert' => 'ยากมาก'];

/** ประเภทใบงานที่แท็กระดับความยากรายข้อได้ (จับคู่/เรียงลำดับ/เติมคำไม่มีความหมายเรื่องระดับ) */
const LEVEL_TYPES = ['multiple_choice', 'short_answer', 'calculation', 'multi_statement', 'data_set', 'exam', 'true_false'];

const LEVEL_DEF = [
    'easy'   => 'ระดับ 1 ง่าย: ระดับจำ/เข้าใจ ใช้แนวคิดเดียว 1 ขั้นตอน บริบทคุ้นเคย ตัวเลขจำนวนเต็มขนาดเล็ก ตัวเลือกลวงต่างจากคำตอบชัดเจน',
    'medium' => 'ระดับ 2 ปานกลาง: ระดับเข้าใจ/ประยุกต์ 2 ขั้นตอน บริบททั่วไป ตัวเลขทั่วไป ตัวเลือกลวงสมเหตุสมผล',
    'hard'   => 'ระดับ 3 ยาก: ระดับวิเคราะห์ 3-4 ขั้นตอน รวม 2-3 แนวคิด สถานการณ์ใหม่ที่ไม่เหมือนตัวอย่างทั่วไป ตัวเลขทศนิยม/เศษส่วน ตัวเลือกลวงมาจากความคลาดเคลื่อนที่พบบ่อย',
    'expert' => 'ระดับ 4 ยากมาก: ระดับประเมิน/สร้าง ตั้งแต่ 5 ขั้นตอนขึ้นไป รวมหลายแนวคิดต่างหัวข้อ ข้อมูลซับซ้อนหรือมีข้อมูลเกินจำเป็น ต้องเลือกวิธีแก้เอง ตัวเลือกลวงใกล้เคียงคำตอบมาก',
];

/** สัดส่วนตั้งต้น (เปอร์เซ็นต์) */
const LEVEL_PRESETS = [
    'review'  => ['easy' => 50, 'medium' => 40, 'hard' => 10, 'expert' => 0],
    'std'     => ['easy' => 20, 'medium' => 50, 'hard' => 30, 'expert' => 0],
    'exam'    => ['easy' => 10, 'medium' => 30, 'hard' => 40, 'expert' => 20],
    'contest' => ['easy' => 0, 'medium' => 20, 'hard' => 40, 'expert' => 40],
];

/** ค่าความยากแบบเก่า → แบบใหม่ (ใบงานที่บันทึกไว้ก่อนมี 4 ระดับ) */
function norm_difficulty(string $d): string
{
    return match ($d) {
        'basic' => 'easy',
        'exam'  => 'hard',
        'easy', 'medium', 'hard', 'expert' => $d,
        default => 'medium',
    };
}

/** สัดส่วนที่ใช้งาน: ถ้าไม่ได้ส่งมา = ระดับเดียว 100% ตาม $difficulty */
function norm_level_mix($mix, string $difficulty): array
{
    $out = [];
    if (is_array($mix)) {
        foreach (LEVEL_IDS as $k => $_) {
            $v = (float) ($mix[$k] ?? 0);
            if ($v > 0) {
                $out[$k] = $v;
            }
        }
    }
    if (!$out) {
        return [norm_difficulty($difficulty) => 100.0];
    }
    $sum = array_sum($out);
    foreach ($out as $k => $v) {
        $out[$k] = round($v * 100 / $sum, 2);
    }
    return $out;
}

/** แบ่งจำนวนข้อตามสัดส่วนด้วยวิธีเศษมากสุด คืน [easy=>n, medium=>n, hard=>n, expert=>n] ผลรวม = $n */
function level_counts(int $n, array $mix): array
{
    $cnt = array_fill_keys(array_keys(LEVEL_IDS), 0);
    $rem = [];
    $used = 0;
    foreach ($mix as $k => $pct) {
        $exact = $n * $pct / 100;
        $cnt[$k] = (int) floor($exact);
        $rem[$k] = $exact - $cnt[$k];
        $used += $cnt[$k];
    }
    arsort($rem);
    foreach (array_keys($rem) as $k) {
        if ($used >= $n) {
            break;
        }
        $cnt[$k]++;
        $used++;
    }
    return $cnt;
}

function level_counts_text(array $counts): string
{
    $parts = [];
    foreach ($counts as $k => $c) {
        if ($c > 0) {
            $parts[] = LEVEL_NAME[$k] . " {$c} ข้อ (level " . LEVEL_IDS[$k] . ')';
        }
    }
    return implode(', ', $parts);
}

/** ข้อความความยากสำหรับ prompt ($counts = [list ชื่อรายการ => counts]) */
function level_prompt_lines(array $partCounts, bool $beyond): array
{
    $used = [];
    foreach ($partCounts as $counts) {
        foreach ($counts as $k => $c) {
            if ($c > 0) {
                $used[$k] = true;
            }
        }
    }
    $lines = ['นิยามระดับความยากที่ใช้ในใบงานนี้:'];
    foreach (LEVEL_DEF as $k => $def) {
        if (isset($used[$k])) {
            $lines[] = '- ' . $def;
        }
    }
    foreach ($partCounts as $label => $counts) {
        $lines[] = "จำนวนข้อตามระดับของ {$label}: " . level_counts_text($counts) . ' (ต้องตรงตามนี้ทุกระดับ)';
    }
    $lines[] = 'ใส่ค่า level (1-4) ของแต่ละข้อให้ตรงกับนิยามจริงของข้อนั้น และเรียงข้อจากง่ายไปยาก';
    if (isset($used['expert'])) {
        $lines[] = $beyond
            ? 'ข้อ level 4 ยกระดับเทียบข้อสอบแข่งขัน/ข้อสอบคัดเลือกได้ แม้เกินขอบเขตเนื้อหาของชั้นนี้เล็กน้อย (แต่งใหม่ ห้ามอ้างว่าเป็นข้อสอบจริง)'
            : 'ข้อ level 4 ต้องอยู่ในขอบเขตเนื้อหาของชั้นนี้ ยากด้วยความซับซ้อนของการคิด ไม่ใช่ด้วยเนื้อหานอกหลักสูตร';
    }
    return $lines;
}

/** ตรวจจำนวนข้อต่อระดับของรายการ $items เทียบกับ $expected คืนรายการปัญหา */
function check_levels(array $items, array $expected, string $label): array
{
    $got = array_fill_keys(array_keys(LEVEL_IDS), 0);
    $bad = 0;
    foreach ($items as $it) {
        $lv = (int) ($it['level'] ?? 0);
        $k = array_search($lv, LEVEL_IDS, true);
        if ($k === false) {
            $bad++;
        } else {
            $got[$k]++;
        }
    }
    $p = [];
    if ($bad) {
        $p[] = "{$label}: มี {$bad} ข้อที่ไม่ได้ระบุ level (1-4)";
    }
    $tol = count($items) > 8 ? 1 : 0; // ใบยาว ยอมคลาดเคลื่อน 1 ข้อต่อระดับ
    foreach ($expected as $k => $want) {
        if (abs($got[$k] - $want) > $tol) {
            $p[] = "{$label}: ระดับ" . LEVEL_NAME[$k] . " ต้องมี {$want} ข้อ แต่ได้ {$got[$k]} ข้อ";
        }
    }
    return $p;
}
