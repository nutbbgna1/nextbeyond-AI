<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/ai/ai.php';
require_once __DIR__ . '/../src/ai/schemas.php';
require_once __DIR__ . '/../src/ai/prompts.php';

/**
 * POST { grade, subject, hint?, items:[{uid,topic,type,objective}] }
 *   → { title, subtitle, tagline, preface, coverImagePrompt, chapters:[{title,uids}] }
 * เรียก AI 1 ครั้ง แล้วตรวจ/ซ่อมผลในโค้ด (uid ต้องครบ ไม่ซ้ำ ไม่แต่งใหม่)
 */
try {
    $b = api_guard();
    $clean = fn($v, int $n) => mb_substr(trim((string) $v), 0, $n);

    $items = [];
    foreach (array_slice((array) ($b['items'] ?? []), 0, 80) as $it) {
        if (!is_array($it)) {
            continue;
        }
        $uid = $clean($it['uid'] ?? '', 40);
        if ($uid === '' || isset($items[$uid]) || !preg_match('/^[A-Za-z0-9_-]+$/', $uid)) {
            continue;
        }
        $items[$uid] = ['uid' => $uid, 'topic' => $clean($it['topic'] ?? '', 120), 'type' => $clean($it['type'] ?? '', 30), 'objective' => $clean($it['objective'] ?? '', 200)];
    }
    if (!$items) {
        json_out(['error' => 'ยังไม่มีใบงานในเล่ม'], 400);
    }

    $provider = resolve_provider('text', $b['textProvider'] ?? null);
    require_provider($provider);
    check_quota(1);

    $grade   = $clean($b['grade'] ?? 'ป.2', 20);
    $subject = $clean($b['subject'] ?? 'วิทยาศาสตร์', 80);
    $out = ai_generate_json($provider, 'text', system_book_editor(), book_prompt($grade, $subject, $clean($b['hint'] ?? '', 300), array_values($items)), book_schema(), 3072);

    // ซ่อมการจัดหมวด: เก็บเฉพาะ uid ที่มีจริง ไม่ซ้ำ; uid ที่ AI ลืมต่อท้ายหมวดสุดท้าย
    $seen = [];
    $chapters = [];
    foreach ((array) ($out['chapters'] ?? []) as $ch) {
        $uids = [];
        foreach ((array) ($ch['uids'] ?? []) as $u) {
            $u = (string) $u;
            if (isset($items[$u]) && !isset($seen[$u])) {
                $seen[$u] = true;
                $uids[] = $u;
            }
        }
        if ($uids) {
            $chapters[] = ['title' => $clean($ch['title'] ?? '', 80) ?: 'หมวดที่ ' . (count($chapters) + 1), 'uids' => $uids];
        }
    }
    $missing = array_values(array_diff(array_keys($items), array_keys($seen)));
    if ($missing) {
        if ($chapters) {
            $chapters[count($chapters) - 1]['uids'] = array_merge($chapters[count($chapters) - 1]['uids'], $missing);
        } else {
            $chapters[] = ['title' => 'ใบงานทั้งหมด', 'uids' => $missing];
        }
    }

    $coverPrompt = $clean($out['coverImagePrompt'] ?? '', 250);
    json_out([
        'title'            => $clean($out['title'] ?? '', 80) ?: "ใบงาน{$subject} {$grade}",
        'subtitle'         => $clean($out['subtitle'] ?? '', 120),
        'tagline'          => $clean($out['tagline'] ?? '', 160),
        'preface'          => mb_substr(trim((string) ($out['preface'] ?? '')), 0, 1800),
        'coverImagePrompt' => $coverPrompt !== '' ? $coverPrompt : 'a happy child reading a book',
        'chapters'         => $chapters,
    ]);
} catch (Throwable $e) {
    json_error($e);
}
