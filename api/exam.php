<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/planning/exam.php';

/**
 * ข้อสอบ
 *   indicators { grade, subject }                → { indicators, edition }
 *   plan  { grade, subject, parts, indicators, mix, useBank } → { analysis, slots, bank:{part:{need,fromBank}} }   (ไม่เรียก AI)
 *   generate { ...เหมือน plan, scope, hint, kind } → { parts, analysis, warnings, stats }
 *   regen { grade, subject, part, level, indicator, scope, hint, avoid[] } → { item }
 *   save { id?, doc... , addToBank? } | list | get { id } | delete { id }
 */
function exam_request_context(array $b): array
{
    $grade = mb_substr(trim((string) ($b['grade'] ?? '')), 0, 20);
    $subject = mb_substr(trim((string) ($b['subject'] ?? '')), 0, 80);
    if ($grade === '' || $subject === '') {
        json_out(['error' => 'ระบุชั้นและวิชา'], 400);
    }
    $ind = cur_indicators_for($grade, $subject);
    $byCode = [];
    foreach ($ind['indicators'] as $i) {
        $byCode[$i['code']] = $i;
    }
    $codes = [];
    foreach ((array) ($b['indicators'] ?? []) as $c) {
        $c = (string) $c;
        if (isset($byCode[$c]) && !in_array($c, $codes, true)) {
            $codes[] = $c;
        }
    }
    $chosen = array_map(fn($c) => ['code' => $c, 'text' => (string) $byCode[$c]['text']], $codes);
    return [
        'grade' => $grade, 'subject' => $subject, 'codes' => $codes, 'chosen' => $chosen,
        'ctx' => [
            'grade' => $grade, 'subject' => $subject,
            'kind' => mb_substr(trim((string) ($b['kind'] ?? '')) ?: 'ปลายภาค', 0, 40),
            'scope' => mb_substr(trim((string) ($b['scope'] ?? '')), 0, 1500),
            'hint' => mb_substr(trim((string) ($b['hint'] ?? '')), 0, 400),
            'indText' => array_column($chosen, 'text', 'code'),
            'avoid' => [],
        ],
    ];
}

try {
    $b = api_guard();
    $action = (string) ($b['action'] ?? '');

    if ($action === 'indicators') {
        $ind = cur_indicators_for(trim((string) ($b['grade'] ?? '')), trim((string) ($b['subject'] ?? '')));
        json_out(['indicators' => array_map(fn($i) => ['code' => $i['code'], 'text' => $i['text']], $ind['indicators']), 'edition' => $ind['edition'] ?? '']);
    }

    if ($action === 'plan' || $action === 'generate') {
        $r = exam_request_context($b);
        $parts = exam_parts_from_request($b);
        if (!$parts) {
            json_out(['error' => 'ตั้งจำนวนข้ออย่างน้อย 1 ส่วน'], 400);
        }
        $mix = norm_level_mix($b['mix'] ?? null, 'medium');
        $slots = exam_slots($parts, $r['codes'], $mix);
        $analysis = exam_analysis($slots, $parts, $r['chosen']);
        $useBank = !empty($b['useBank']);

        if ($action === 'plan') {
            $bank = [];
            [$got, $missing] = $useBank ? exam_from_bank($slots, $r['grade'], $r['subject']) : [[], array_map(fn($l) => array_keys($l), $slots)];
            foreach ($parts as $p => $c) {
                $bank[$p] = ['need' => $c['count'], 'fromBank' => count($got[$p] ?? [])];
            }
            json_out(['analysis' => $analysis, 'bank' => $bank, 'mix' => $mix]);
        }

        $provider = resolve_provider('text', $b['textProvider'] ?? null);
        $calls = 0;
        [$got, $missing] = $useBank ? exam_from_bank($slots, $r['grade'], $r['subject']) : [[], array_map(fn($l) => array_keys($l), $slots)];
        foreach ($missing as $idxs) {
            $calls += (int) ceil(count($idxs) / EXAM_CHUNK);
        }
        if ($calls > 0) {
            require_provider($provider);
            check_quota($calls);
        }
        [$out, $warnings, $stats] = exam_build($provider, $parts, $slots, $r['ctx'], $useBank);
        json_out(['parts' => $out, 'analysis' => $analysis, 'warnings' => $warnings, 'stats' => $stats, 'indicators' => $r['chosen']]);
    }

    if ($action === 'regen') {
        $r = exam_request_context($b);
        $part = (string) ($b['part'] ?? '');
        if (!in_array($part, EXAM_PARTS, true)) {
            json_out(['error' => 'ส่วนของข้อสอบไม่ถูกต้อง'], 400);
        }
        $level = max(1, min(4, (int) ($b['level'] ?? 2)));
        $code = (string) ($b['indicator'] ?? '');
        $code = in_array($code, $r['codes'], true) ? $code : '';
        $ctx = $r['ctx'];
        $ctx['avoid'] = array_slice(array_map('strval', (array) ($b['avoid'] ?? [])), 0, 40);
        $provider = resolve_provider('text', $b['textProvider'] ?? null);
        require_provider($provider);
        check_quota(1);
        [$items, $w] = exam_ai_part($provider, $part, [['indicator' => $code, 'level' => $level]], $ctx);
        if (!$items[0]) {
            throw new ApiException('AI สร้างข้อใหม่ไม่สำเร็จ ลองอีกครั้ง' . ($w ? ' (' . $w[0] . ')' : ''), 502, 'EMPTY_ITEM');
        }
        json_out(['item' => $items[0], 'warnings' => $w]);
    }

    if ($action === 'list') {
        json_out(['items' => exam_list()]);
    }

    if ($action === 'save') {
        $id = (string) ($b['id'] ?? '');
        if (!exam_id_ok($id)) {
            $id = date('Ymd-His') . '-' . bin2hex(random_bytes(4));
        }
        $parts = exam_clean_parts((array) ($b['parts'] ?? []));
        if (!$parts) {
            json_out(['error' => 'ไม่มีข้อสอบให้บันทึก'], 400);
        }
        $ind = [];
        foreach (array_slice((array) ($b['indicators'] ?? []), 0, 80) as $i) {
            if (is_array($i) && !empty($i['code'])) {
                $ind[] = ['code' => mb_substr((string) $i['code'], 0, 40), 'text' => mb_substr((string) ($i['text'] ?? ''), 0, 400)];
            }
        }
        $doc = [
            'id' => $id, 'savedAt' => date('c'),
            'title'    => mb_substr(trim((string) ($b['title'] ?? '')) ?: 'ข้อสอบ', 0, 150),
            'school'   => mb_substr(trim((string) ($b['school'] ?? '')), 0, 120),
            'kind'     => mb_substr(trim((string) ($b['kind'] ?? '')), 0, 40),
            'grade'    => mb_substr((string) ($b['grade'] ?? ''), 0, 20),
            'subject'  => mb_substr((string) ($b['subject'] ?? ''), 0, 80),
            'term'     => in_array((string) ($b['term'] ?? ''), ['1', '2'], true) ? (string) $b['term'] : '',
            'year'     => mb_substr(trim((string) ($b['year'] ?? '')), 0, 8),
            'minutes'  => max(0, min(300, (int) ($b['minutes'] ?? 60))),
            'versions' => max(1, min(4, (int) ($b['versions'] ?? 1))),
            'seed'     => max(1, (int) ($b['seed'] ?? random_int(1, 2147483000))),
            'indicators' => $ind,
            'parts'    => $parts,
        ];
        $old = exam_read($id);
        if (is_array($old) && !empty($old['lms'])) {
            $doc['lms'] = $old['lms']; // จำรหัสข้อสอบที่เคยยิงเข้า LMS ไว้
        }
        exam_write($id, $doc);
        $added = !empty($b['addToBank']) ? exam_to_bank($doc) : 0;
        json_out(['id' => $id, 'addedToBank' => $added]);
    }

    $id = (string) ($b['id'] ?? '');
    if (!exam_id_ok($id)) {
        json_out(['error' => 'รหัสข้อสอบไม่ถูกต้อง'], 400);
    }
    if ($action === 'get') {
        $d = exam_read($id);
        $d ? json_out(['data' => $d]) : json_out(['error' => 'ไม่พบข้อสอบนี้'], 404);
    }
    if ($action === 'delete') {
        store_del('exams', "{$id}.json");
        json_out(['ok' => true]);
    }
    json_out(['error' => 'action ไม่ถูกต้อง'], 400);
} catch (Throwable $e) {
    json_error($e);
}
