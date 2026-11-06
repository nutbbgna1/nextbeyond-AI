<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/worksheet/bank.php';

/**
 * คลังข้อสอบ
 *   add_saved { ids:[saved id] }      → { added, skipped, total }   เก็บโจทย์จากชุดที่บันทึกไว้ (ซ้ำจะไม่เพิ่ม)
 *   list      { grade?, subject?, type?, level?, q?, indicator?, limit?, offset? } → { items, total, all, facets }
 *   delete    { ids:[bank id] }
 *   compose   { ids:[bank id], title? }     → { id }  สร้างชุดใหม่ในคลังใบงาน เปิดต่อได้ที่ index.php?open=
 */
try {
    $b = api_guard();
    $action = (string) ($b['action'] ?? '');
    $all = bank_read();

    if ($action === 'add_saved') {
        $added = 0;
        $skipped = 0;
        foreach (array_slice((array) ($b['ids'] ?? []), 0, 100) as $id) {
            $id = (string) $id;
            $doc = saved_id_ok($id) ? saved_read($id) : null;
            if (!$doc) {
                continue;
            }
            $doc['id'] = $id;
            [$items, $sk] = bank_harvest($doc);
            $skipped += $sk;
            foreach ($items as $k => $e) {
                if (!isset($all[$k])) {
                    if (count($all) >= BANK_MAX) {
                        throw new ApiException('คลังข้อสอบเต็ม (' . BANK_MAX . ' ข้อ) ลบข้อที่ไม่ใช้ก่อน', 400, 'BANK_FULL');
                    }
                    $all[$k] = $e;
                    $added++;
                }
            }
        }
        if ($added) {
            bank_write($all);
        }
        json_out(['added' => $added, 'skipped' => $skipped, 'total' => count($all)]);
    }

    if ($action === 'list') {
        $g = (string) ($b['grade'] ?? '');
        $s = mb_strtolower(trim((string) ($b['subject'] ?? '')));
        $t = (string) ($b['type'] ?? '');
        $lv = (int) ($b['level'] ?? 0);
        $tm = (string) ($b['term'] ?? '');
        $q = mb_strtolower(trim((string) ($b['q'] ?? '')));
        $ind = trim((string) ($b['indicator'] ?? ''));
        $facets = ['grades' => [], 'subjects' => [], 'types' => []];
        $rows = [];
        foreach ($all as $e) {
            $facets['grades'][$e['grade']] = ($facets['grades'][$e['grade']] ?? 0) + 1;
            $facets['subjects'][$e['subject']] = ($facets['subjects'][$e['subject']] ?? 0) + 1;
            $facets['types'][$e['type']] = ($facets['types'][$e['type']] ?? 0) + 1;
            if (($g !== '' && $e['grade'] !== $g) || ($s !== '' && mb_strtolower($e['subject']) !== $s) || ($t !== '' && $e['type'] !== $t) || ($lv && $e['level'] !== $lv) || ($tm !== '' && ($e['term'] ?? '') !== $tm)) {
                continue;
            }
            if ($ind !== '' && !str_contains($e['indicator'], $ind)) {
                continue;
            }
            if ($q !== '' && !str_contains(mb_strtolower(bank_item_text($e['item']) . ' ' . $e['topic']), $q)) {
                continue;
            }
            $rows[] = $e;
        }
        usort($rows, fn($x, $y) => strcmp((string) $y['addedAt'], (string) $x['addedAt']));
        $off = max(0, (int) ($b['offset'] ?? 0));
        $lim = max(1, min(200, (int) ($b['limit'] ?? 60)));
        json_out(['items' => array_map('bank_summary', array_slice($rows, $off, $lim)), 'total' => count($rows), 'all' => count($all), 'facets' => $facets]);
    }

    if ($action === 'delete') {
        $n = 0;
        foreach ((array) ($b['ids'] ?? []) as $id) {
            if (isset($all[(string) $id])) {
                unset($all[(string) $id]);
                $n++;
            }
        }
        if ($n) {
            bank_write($all);
        }
        json_out(['deleted' => $n, 'total' => count($all)]);
    }

    if ($action === 'compose') {
        $entries = [];
        foreach (array_slice((array) ($b['ids'] ?? []), 0, 200) as $id) {
            if (isset($all[(string) $id])) {
                $entries[] = $all[(string) $id];
            }
        }
        if (!$entries) {
            json_out(['error' => 'ยังไม่ได้เลือกข้อสอบ'], 400);
        }
        $title = mb_substr(trim((string) ($b['title'] ?? '')) ?: 'ชุดจากคลังข้อสอบ', 0, 150);
        $sheets = bank_compose($entries, $title);
        $id = date('Ymd-His') . '-' . bin2hex(random_bytes(4));
        $first = $entries[0];
        saved_write($id, [
            'id' => $id, 'title' => $title . ' (' . $first['grade'] . ' ' . $first['subject'] . ')', 'savedAt' => date('c'), 'status' => 'draft',
            'meta' => ['grade' => $first['grade'], 'subject' => $first['subject'], 'topic' => $title, 'difficulty' => 'medium'],
            'sheets' => $sheets, 'images' => new stdClass(),
        ]);
        json_out(['id' => $id, 'sheets' => count($sheets), 'items' => count($entries)]);
    }

    json_out(['error' => 'action ไม่ถูกต้อง'], 400);
} catch (Throwable $e) {
    json_error($e);
}
