<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/ai/ai.php';
require_once __DIR__ . '/../src/ai/schemas.php';
require_once __DIR__ . '/../src/ai/prompts.php';
require_once __DIR__ . '/../src/reference/curriculum.php';
require_once __DIR__ . '/../src/reference/library.php';
require_once __DIR__ . '/../src/planning/lplan.php';

/**
 * แผนการจัดการเรียนรู้
 *   meta                                   → { models, competencies, traits }
 *   generate { grade, subject, term, unit, unitNo, planNo, topic, hours, periodMinutes, model, indicators, types?, hint?, refMode?, id? }
 *                                          → { plan, head }   (ยังไม่บันทึก ให้ครูตรวจก่อน)
 *   save { id?, head, plan }               → { id }
 *   list                                   → { items }
 *   get { id }  copy { id }  delete { id }
 */
function lp_clean_head(array $h): array
{
    $s = fn($k, $n) => mb_substr(trim((string) ($h[$k] ?? '')), 0, $n);
    return [
        'grade' => $s('grade', 20), 'subject' => $s('subject', 80), 'term' => in_array((string) ($h['term'] ?? ''), ['1', '2'], true) ? (string) $h['term'] : '',
        'year' => preg_replace('/[^0-9]/', '', (string) ($h['year'] ?? '')), 'unit' => $s('unit', 150), 'unitNo' => $s('unitNo', 10), 'planNo' => $s('planNo', 10),
        'topic' => $s('topic', 200), 'hours' => max(1, min(10, (int) ($h['hours'] ?? 1))), 'periodMinutes' => max(30, min(120, (int) ($h['periodMinutes'] ?? 50))),
        'model' => isset(LP_MODELS[(string) ($h['model'] ?? '')]) ? (string) $h['model'] : '3stage',
        'indicators' => clean_indicators($h['indicators'] ?? []), 'school' => $s('school', 150), 'teacher' => $s('teacher', 120),
    ];
}

try {
    $b = api_guard();
    $action = (string) ($b['action'] ?? '');

    if ($action === 'meta') {
        json_out(['models' => array_map(fn($m) => $m, LP_MODELS), 'competencies' => LP_COMPETENCIES, 'traits' => LP_TRAITS]);
    }

    if ($action === 'generate') {
        $h = lp_clean_head($b);
        if ($h['grade'] === '' || $h['subject'] === '' || $h['topic'] === '') {
            json_out(['error' => 'ระบุชั้น วิชา และเรื่องที่จะสอน'], 400);
        }
        $types = array_values(array_filter((array) ($b['types'] ?? []), fn($t) => in_array($t, SHEET_TYPES, true)));
        $prev = [];
        if ($h['unit'] !== '') {
            foreach (lp_list() as $x) {
                if ($x['id'] !== ($b['id'] ?? '') && $x['grade'] === $h['grade'] && $x['subject'] === $h['subject'] && $x['unit'] === $h['unit'] && $x['title'] !== '') {
                    $prev[] = $x['title'];
                }
            }
        }
        $refBlock = '';
        if (($b['refMode'] ?? 'auto') !== 'off') {
            $refBlock = library_reference_block(library_search($h['grade'], $h['subject'], $h['topic'] . ' ' . $h['unit'], 5));
        }
        $provider = resolve_provider('text', $b['textProvider'] ?? null);
        require_provider($provider);
        check_quota(1);
        $total = $h['hours'] * $h['periodMinutes'];
        $plan = ai_generate_json(
            $provider,
            'text',
            system_teacher($h['grade'], $h['subject'], is_secondary($h['grade'])) . ' คุณเขียนแผนการจัดการเรียนรู้ตามแบบที่โรงเรียนในประเทศไทยใช้ เป็นภาษาไทยที่เป็นทางการ กระชับ นำไปใช้สอนได้จริง',
            lp_prompt([
                'grade' => $h['grade'], 'subject' => $h['subject'], 'term' => $h['term'], 'unit' => $h['unit'], 'topic' => $h['topic'],
                'hours' => $h['hours'], 'periodMinutes' => $h['periodMinutes'], 'model' => $h['model'], 'inds' => $h['indicators'], 'types' => $types,
                'prev' => mb_substr(implode(' / ', array_slice($prev, -8)), 0, 600), 'refBlock' => $refBlock, 'hint' => mb_substr(trim((string) ($b['hint'] ?? '')), 0, 500),
            ]),
            lp_schema($h['model']),
            12288
        );
        $plan = lp_tidy($plan, $h['model'], $total, array_column($h['indicators'], 'code'));
        if (trim((string) ($plan['title'] ?? '')) === '') {
            $plan['title'] = $h['topic'];
        }
        json_out(['plan' => $plan, 'head' => $h]);
    }

    if ($action === 'list') {
        json_out(['items' => lp_list()]);
    }

    if ($action === 'save') {
        $id = (string) ($b['id'] ?? '');
        if (!lp_id_ok($id)) {
            $id = date('Ymd-His') . '-' . bin2hex(random_bytes(4));
        }
        $head = lp_clean_head((array) ($b['head'] ?? []));
        $plan = (array) ($b['plan'] ?? []);
        if (trim((string) ($plan['title'] ?? '')) === '') {
            json_out(['error' => 'แผนยังไม่มีชื่อเรื่อง'], 400);
        }
        $plan = lp_tidy($plan, $head['model'], 0, array_column($head['indicators'], 'code'));
        $plan['postTeaching'] = mb_substr((string) (($b['plan']['postTeaching'] ?? '')), 0, 4000);
        lp_write($id, ['id' => $id, 'savedAt' => date('c'), 'head' => $head, 'plan' => $plan]);
        json_out(['id' => $id]);
    }

    $id = (string) ($b['id'] ?? '');
    if (!lp_id_ok($id)) {
        json_out(['error' => 'รหัสแผนไม่ถูกต้อง'], 400);
    }
    if ($action === 'get') {
        $d = lp_read($id);
        $d ? json_out(['data' => $d]) : json_out(['error' => 'ไม่พบแผนนี้'], 404);
    }
    if ($action === 'copy') {
        $d = lp_read($id);
        if (!$d) {
            json_out(['error' => 'ไม่พบแผนนี้'], 404);
        }
        $new = date('Ymd-His') . '-' . bin2hex(random_bytes(4));
        $d['id'] = $new;
        $d['savedAt'] = date('c');
        $d['plan']['title'] = mb_substr((string) ($d['plan']['title'] ?? '') . ' (สำเนา)', 0, 200);
        lp_write($new, $d);
        json_out(['id' => $new]);
    }
    if ($action === 'delete') {
        store_del('lplans', "{$id}.json");
        json_out(['ok' => true]);
    }
    json_out(['error' => 'action ไม่ถูกต้อง'], 400);
} catch (Throwable $e) {
    json_error($e);
}
