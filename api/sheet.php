<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/ai/ai.php';
require_once __DIR__ . '/../src/ai/schemas.php';
require_once __DIR__ . '/../src/ai/prompts.php';
require_once __DIR__ . '/../src/worksheet/validate.php';
require_once __DIR__ . '/../src/reference/library.php';
require_once __DIR__ . '/../src/reference/curriculum.php';
require_once __DIR__ . '/../src/worksheet/difficulty.php';
require_once __DIR__ . '/../src/planning/lplan.php';

/**
 * ทำงานทีละ "ขั้น" คำขอละ 1 การเรียกโมเดล เพื่อให้แต่ละคำขอสั้น (โฮสต์ที่จำกัดเวลา 30-60 วินาทีก็ไม่ล้ม)
 *   step=generate : สร้างใบงาน 1 ใบ + ตรวจด้วยโค้ด → { sheet, problems }
 *   step=review   : ให้โมเดลตรวจทานตรวจความถูกต้อง → { ok, issues }
 *   step=lesson   : สร้างใบความรู้ 1 ฉบับคู่กับใบงาน 1 ใบ + ตรวจด้วยโค้ด → { lesson, problems }
 * หน้าเว็บ (assets/js/pages/app.js) เป็นตัววนซ้ำ: สร้าง → ตรวจ → ไม่ผ่านก็สร้างใหม่ (สูงสุด 3 รอบ)
 */
/** ตัดส่วนที่ไม่จำเป็นต่อการอ่านเนื้อหาออกก่อนส่งให้ AI (ประหยัด token) */
function strip_for_prompt(array $s, bool $keepFigures = false): array
{
    unset($s['headerImagePrompt']);
    if (!$keepFigures) {
        unset($s['passage']);
        unset($s['figures']);
    }
    foreach (['items', 'mcItems', 'writtenItems'] as $k) {
        if (isset($s[$k]) && is_array($s[$k])) {
            foreach ($s[$k] as &$it) {
                if (is_array($it)) {
                    unset($it['imagePrompt'], $it['lines']);
                }
            }
            unset($it);
        }
    }
    return $s;
}

function sheet_has_levels(array $s): bool
{
    foreach (['items', 'mcItems', 'writtenItems'] as $k) {
        foreach ((array) ($s[$k] ?? []) as $it) {
            if (is_array($it) && (int) ($it['level'] ?? 0) > 0) {
                return true;
            }
        }
    }
    return false;
}

/** จัดค่าที่ AI ให้มาให้อยู่ในช่วงที่ใช้ได้ (ไม่ต้องให้ AI แก้เรื่องเล็กๆ) */
function tidy_sheet(array &$s): void
{
    foreach (['items', 'writtenItems'] as $k) {
        if (isset($s[$k]) && is_array($s[$k])) {
            foreach ($s[$k] as &$it) {
                if (is_array($it) && array_key_exists('lines', $it)) {
                    $it['lines'] = max(2, min(12, (int) $it['lines'] ?: 5));
                }
            }
            unset($it);
        }
    }
    if (isset($s['figures']) && is_array($s['figures'])) {
        $s['figures'] = array_values(array_slice(array_filter($s['figures'], 'is_array'), 0, 6));
        foreach ($s['figures'] as &$f) {
            if (($f['kind'] ?? '') === 'table') { // ทำให้ทุกแถวมีจำนวนช่องเท่าหัวตาราง
                $n = count((array) ($f['headers'] ?? []));
                foreach ((array) ($f['rows'] ?? []) as $ri => $row) {
                    $row = array_slice(array_map('strval', (array) $row), 0, max($n, 1));
                    $f['rows'][$ri] = array_pad($row, max($n, 1), '');
                }
            }
        }
        unset($f);
    }
}

/** ท่อนข้อความจากคลังเอกสารที่เกี่ยวกับใบงานนี้ ('auto' = ค้นตามชั้น/วิชา, 'off' = ไม่ใช้, 'docs' = เฉพาะเอกสารที่เลือก) */
function reference_block_for(array $b, string $grade, string $subject, array $plan): string
{
    $lp = lp_context_block(lp_read((string) ($b['lessonPlanId'] ?? '')));
    return trim($lp . "\n" . reference_block_lib($b, $grade, $subject, $plan));
}

function reference_block_lib(array $b, string $grade, string $subject, array $plan): string
{
    $refs = (array) ($b['refs'] ?? []);
    $mode = (string) ($refs['mode'] ?? 'auto');
    if ($mode === 'off') {
        return '';
    }
    $docIds = $mode === 'docs' ? array_values(array_filter(array_map('strval', (array) ($refs['docIds'] ?? [])), 'lib_id_ok')) : [];
    if ($mode === 'docs' && !$docIds) {
        return '';
    }
    $q = trim(($plan['topic'] ?? '') . ' ' . ($plan['objective'] ?? '') . ' ' . ($b['unit'] ?? ''));
    return library_reference_block(library_search($grade, $subject, $q, 4, $docIds));
}

/** บทอ่านที่ครูเลือก (โหลดจากคลังฝั่งเซิร์ฟเวอร์ ไม่เชื่อข้อความที่ส่งมาจากหน้าเว็บ) */
function passage_for(array $b): ?array
{
    $id = (string) ($b['passageId'] ?? '');
    if ($id === '' || !lib_id_ok($id)) {
        return null;
    }
    return lib_passage_get($id);
}

try {
    $b    = api_guard();
    $step = (string) ($b['step'] ?? '');
    $plan = (array) ($b['plan'] ?? []);
    if (!in_array($plan['type'] ?? '', SHEET_TYPES, true)) {
        json_out(['error' => 'แผนใบงานไม่ถูกต้อง'], 400);
    }
    $grade   = mb_substr(trim((string) ($b['grade'] ?? 'ป.2')), 0, 20);
    $subject = mb_substr(trim((string) ($b['subject'] ?? 'วิทยาศาสตร์')), 0, 80);
    $formal  = !empty($b['formal']);
    $figureMode = in_array($b['figureMode'] ?? '', ['code', 'ai', 'none'], true) ? $b['figureMode'] : 'code';
    $difficulty = norm_difficulty((string) ($b['difficulty'] ?? 'medium'));
    $inds = clean_indicators($b['indicators'] ?? []);
    $heavy = in_array($plan['type'], ['calculation', 'data_set', 'exam'], true) || $formal;

    if ($step === 'generate') {
        $itemCount = max(2, min(20, (int) ($b['itemCount'] ?? 5)));
        $attempt   = max(0, (int) ($b['attempt'] ?? 0));
        // ความยากรายข้อ: แบ่งจำนวนข้อตามสัดส่วน (เฉพาะรูปแบบที่แท็กระดับได้)
        $mix = norm_level_mix($b['levelMix'] ?? null, $difficulty);
        $useLevels = in_array($plan['type'], LEVEL_TYPES, true);
        $parts = [];    // ป้ายส่วน => จำนวนข้อต่อระดับ (ใช้ใน prompt)
        $expected = []; // ชื่อรายการ => จำนวนข้อต่อระดับ (ใช้ตรวจ)
        if ($useLevels) {
            if ($plan['type'] === 'exam') {
                [$mcN, $wrN] = exam_split($itemCount);
                $parts['ตอนที่ 1 (mcItems)'] = $expected['mcItems'] = level_counts($mcN, $mix);
                $parts['ตอนที่ 2 (writtenItems)'] = $expected['writtenItems'] = level_counts($wrN, $mix);
            } else {
                $parts['items'] = $expected['items'] = level_counts($itemCount, $mix);
            }
        }
        arsort($mix);
        $req = [
            'grade'      => $grade,
            'subject'    => $subject,
            'plan'       => $plan,
            'itemCount'  => $itemCount,
            'usedTopics' => array_slice(array_map('strval', (array) ($b['usedTopics'] ?? [])), -30),
            'hint'       => mb_substr((string) ($b['hint'] ?? ''), 0, 300),
            'formal'     => $formal,
            'difficulty' => (string) array_key_first($mix),
            'levelLines' => $useLevels ? level_prompt_lines($parts, !empty($b['beyond'])) : [],
            'figureMode' => $figureMode,
            'examSplit'  => exam_split($itemCount),
            'refBlock'   => reference_block_for($b, $grade, $subject, $plan),
            'indicatorBlock' => cur_prompt_block($inds),
        ];
        $passage = passage_for($b);
        if ($passage) {
            $req['passage'] = $passage['text'];
        }
        $problems = array_slice(array_map('strval', (array) ($b['problems'] ?? [])), 0, 12);

        $schema = sheet_schema($plan['type'], $formal);
        $extraFields = [];
        if ($useLevels) {
            $extraFields['level'] = ['type' => 'integer', 'enum' => [1, 2, 3, 4], 'description' => 'ระดับความยากของข้อนี้ 1=ง่าย 2=ปานกลาง 3=ยาก 4=ยากมาก ตามนิยามที่กำหนด'];
        }
        if ($inds) {
            $extraFields['indicator'] = s_str('รหัสตัวชี้วัดที่ข้อนี้วัด (ใช้รหัสตามรายการที่ให้เท่านั้น)');
        }
        if ($extraFields) {
            $schema = schema_add_item_fields($schema, $extraFields);
        }

        $provider = resolve_provider('text', $b['textProvider'] ?? null);
        require_provider($provider);
        check_quota(1);
        $sheet = ai_generate_json(
            $provider,
            'text',
            system_teacher($grade, $subject, $formal),
            sheet_prompt($req, $problems),
            $schema,
            // token ที่ใช้ "คิด" ถูกนับรวมใน output ด้วย จึงเผื่อไว้ และเพิ่มเมื่อลองซ้ำ
            ($heavy ? 12288 : 8192) + ($attempt === 0 ? 0 : 4096)
        );
        $sheet['type'] = $plan['type'];
        if ($passage) {
            $sheet['passage'] = ['title' => $passage['title'], 'text' => $passage['text'], 'source' => lib_source_line($passage)];
        }
        tidy_sheet($sheet);
        tidy_levels_indicators($sheet, $useLevels, $inds);
        if ($useLevels) {
            enforce_level_counts($sheet, $expected);
        }
        balance_answer_positions($sheet);
        $problems = array_merge(validate_sheet($sheet, $itemCount), validate_levels_indicators($sheet, $expected, $inds));
        json_out(['sheet' => $sheet, 'problems' => $problems]);
    }

    if ($step === 'lesson') {
        $sheet = (array) ($b['sheet'] ?? []);
        $problems = array_slice(array_map('strval', (array) ($b['problems'] ?? [])), 0, 12);
        $provider = resolve_provider('text', $b['textProvider'] ?? null);
        require_provider($provider);
        check_quota(1);
        $lesson = ai_generate_json(
            $provider,
            'text',
            system_teacher($grade, $subject, $formal),
            lesson_prompt([
                'grade' => $grade, 'subject' => $subject, 'plan' => $plan, 'formal' => $formal, 'figureMode' => $figureMode,
                'hint' => mb_substr((string) ($b['hint'] ?? ''), 0, 300), 'problems' => $problems,
                'refBlock' => reference_block_for($b, $grade, $subject, $plan), 'indicatorBlock' => cur_prompt_block($inds),
                'sheetJson' => mb_substr(json_encode(strip_for_prompt($sheet), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), 0, 6000),
            ]),
            lesson_schema(),
            12288 + ((int) ($b['attempt'] ?? 0) > 0 ? 4096 : 0)
        );
        tidy_sheet($lesson);
        if ($inds) {
            $lesson['indicators'] = $inds;
        }
        json_out(['lesson' => $lesson, 'problems' => validate_lesson($lesson)]);
    }

    if ($step === 'review') {
        $sheet = (array) ($b['sheet'] ?? []);
        $provider = resolve_provider('text', $b['textProvider'] ?? null);
        require_provider($provider);
        check_quota(1);
        $r = ai_generate_json(
            $provider,
            'review',
            system_reviewer($subject),
            review_prompt($grade, $plan, json_encode(strip_for_prompt($sheet, true), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), sheet_has_levels($sheet)),
            review_schema(),
            4096,
            'LOW'
        );
        json_out(['ok' => (bool) ($r['ok'] ?? false), 'issues' => array_values(array_map('strval', (array) ($r['issues'] ?? [])))]);
    }

    json_out(['error' => 'step ไม่ถูกต้อง'], 400);
} catch (Throwable $e) {
    json_error($e);
}
