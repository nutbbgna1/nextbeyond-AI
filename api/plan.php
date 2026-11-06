<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/ai/ai.php';
require_once __DIR__ . '/../src/ai/schemas.php';
require_once __DIR__ . '/../src/ai/prompts.php';
require_once __DIR__ . '/../src/reference/curriculum.php';
require_once __DIR__ . '/../src/planning/lplan.php';

try {
    $b = api_guard();

    $count = max(1, min(20, (int) ($b['count'] ?? 1)));
    $topic = mb_substr(trim((string) ($b['topic'] ?? '')), 0, 200);
    if ($topic === '') {
        json_out(['error' => 'กรุณาใส่หัวข้อ'], 400);
    }
    $types = array_values(array_filter((array) ($b['types'] ?? []), fn($t) => in_array($t, SHEET_TYPES, true)));
    $allowed = $types ?: SHEET_TYPES;

    $inds      = clean_indicators($b['indicators'] ?? []);
    $codes = array_column($inds, 'code');

    // มาจากแผนการจัดการเรียนรู้: ใช้ใบงานที่แผนกำหนดไว้ (ไม่ต้องให้ AI วางแผนซ้ำ) ถ้าจำนวนพอ
    $lp = lp_read((string) ($b['lessonPlanId'] ?? ''));
    $ideas = $lp ? (array) ($lp['plan']['worksheetIdeas'] ?? []) : [];
    $pick = isset($b['ideaIndex']) && is_numeric($b['ideaIndex']) ? (int) $b['ideaIndex'] : -1;
    if ($pick >= 0 && isset($ideas[$pick])) {
        $ideas = [$ideas[$pick]];
    }
    if ($ideas && count($ideas) >= $count && empty($b['avoid'])) {
        $lpCodes = array_values(array_filter((array) ($lp['plan']['indicatorCodes'] ?? []), fn($c) => !$codes || in_array($c, $codes, true)));
        $sheets = [];
        foreach (array_slice($ideas, 0, $count) as $i => $w) {
            $row = [
                'topic' => (string) $w['topic'],
                'type' => in_array($w['type'] ?? '', $allowed, true) ? $w['type'] : $allowed[$i % count($allowed)],
                'objective' => (string) ($w['purpose'] ?? ''),
            ];
            if ($codes) {
                $row['indicatorCodes'] = $lpCodes ?: $codes;
            }
            $sheets[] = $row;
        }
        json_out(['sheets' => $sheets, 'fromLessonPlan' => true]);
    }

    $provider = resolve_provider('text', $b['textProvider'] ?? null);
    require_provider($provider);
    check_quota(1);

    $gradeIn   = mb_substr(trim((string) ($b['grade'] ?? 'ป.2')), 0, 20);
    $subjectIn = mb_substr(trim((string) ($b['subject'] ?? 'วิทยาศาสตร์')), 0, 80);
    $plan = ai_generate_json(
        $provider,
        'text',
        system_teacher($gradeIn, $subjectIn),
        trim(plan_prompt($gradeIn, $subjectIn, $topic, $count, $allowed, array_slice(array_map(fn($t) => mb_substr(trim((string) $t), 0, 120), (array) ($b['avoid'] ?? [])), -30), $inds) . "\n" . lp_context_block($lp)),
        plan_schema(!empty($inds)),
        2048
    );

    // กันกรณี AI ให้จำนวนไม่ตรง หรือใช้ type นอกรายการ
    $sheets = [];
    foreach (array_slice($plan['sheets'] ?? [], 0, $count) as $i => $s) {
        $s['type'] = in_array($s['type'] ?? '', $allowed, true) ? $s['type'] : $allowed[$i % count($allowed)];
        $row = [
            'topic'     => (string) ($s['topic'] ?? ''),
            'type'      => $s['type'],
            'objective' => (string) ($s['objective'] ?? ''),
        ];
        if ($codes) {
            $mine = [];
            foreach ((array) ($s['indicatorCodes'] ?? []) as $c) {
                $m = match_indicator((string) $c, $codes);
                if ($m !== '' && !in_array($m, $mine, true)) {
                    $mine[] = $m;
                }
            }
            $row['indicatorCodes'] = array_slice($mine, 0, 3);
        }
        $sheets[] = $row;
    }
    // ตัวชี้วัดที่ AI ไม่ได้กระจายไปให้ใบใดเลย: แจกให้ครบแบบวนรอบ (ทุกตัวชี้วัดต้องมีอย่างน้อยหนึ่งใบที่วัด)
    if ($codes && $sheets) {
        $covered = array_merge(...array_map(fn($r) => $r['indicatorCodes'], $sheets));
        $k = 0;
        foreach ($codes as $c) {
            if (!in_array($c, $covered, true)) {
                $sheets[$k % count($sheets)]['indicatorCodes'][] = $c;
                $k++;
            }
        }
        foreach (array_keys($sheets) as $ix) {
            if (!$sheets[$ix]['indicatorCodes']) {
                $sheets[$ix]['indicatorCodes'] = [$codes[$ix % count($codes)]];
            }
        }
    }
    if (!$sheets) {
        throw new ApiException('AI วางแผนไม่สำเร็จ ลองใหม่อีกครั้ง', 502, 'EMPTY_PLAN');
    }
    json_out(['sheets' => $sheets]);
} catch (Throwable $e) {
    json_error($e);
}
