<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/core/core.php';
require_once __DIR__ . '/../src/core/store.php';

/**
 * เก็บ/เรียก/ลบ "เล่มใบงาน" (ปก คำนำ รายการใบงานที่ฝังเนื้อหาไว้ + รายการภาพ) เป็นไฟล์ JSON
 *   action=save   { id?, title, book, images }  → { id, savedAt }
 *   action=list                                           → { items:[{id,title,savedAt,count}] }
 *   action=load   { id }                                  → { data, missingImages:[key] }
 *   action=delete { id }                                  → { ok }
 * ภาพเก็บแยกอยู่แล้วในคลังภาพ (อ้างด้วย id) ชุดที่บันทึกจึงเล็ก
 */
function book_id_ok(string $id): bool
{
    return preg_match('/^[0-9]{8}-[0-9]{6}-[a-f0-9]{8}$/', $id) === 1;
}

try {
    $b = api_guard();
    $action = (string) ($b['action'] ?? '');

    if ($action === 'save') {
        $book = is_array($b['book'] ?? null) ? $b['book'] : [];
        $entries = array_values(array_filter((array) ($book['entries'] ?? []), fn($e) => is_array($e) && is_array($e['sheet'] ?? null)));
        if (!$entries) {
            json_out(['error' => 'ไม่มีใบงานในเล่ม'], 400);
        }
        $book['entries'] = $entries;
        $id = (string) ($b['id'] ?? '');
        if (!book_id_ok($id)) {
            $id = date('Ymd-His') . '-' . bin2hex(random_bytes(4));
        }
        $images = [];
        foreach ((array) ($b['images'] ?? []) as $key => $imgId) {
            if (is_string($key) && is_string($imgId) && preg_match('/^[a-f0-9]{40}$/', $imgId)) {
                $images[mb_substr($key, 0, 300)] = $imgId;
            }
        }
        $now = date('c');
        $doc = [
            'id'      => $id,
            'title'   => mb_substr(trim((string) ($b['title'] ?? '')) ?: 'เล่มใบงาน', 0, 150),
            'savedAt' => $now,
            'book'    => $book,
            'images'  => $images,
        ];
        $json = json_encode($doc, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PARTIAL_OUTPUT_ON_ERROR);
        if ($json === false || strlen($json) > 8_000_000) {
            json_out(['error' => 'เล่มใหญ่เกินไปที่จะบันทึก ลองลดจำนวนใบงาน'], 413);
        }
        store_put('books', "{$id}.json", $json);
        json_out(['id' => $id, 'savedAt' => $now, 'where' => store_where('books')]);
    }

    if ($action === 'list') {
        $items = [];
        $seen = [];
        {
            foreach (array_keys(store_list('books', '*.json')) as $fn) {
                $id = basename($fn, '.json');
                if (!book_id_ok($id) || isset($seen[$id])) {
                    continue;
                }
                $seen[$id] = true;
                $doc = store_json_get('books', $fn);
                if (!is_array($doc)) {
                    continue;
                }
                $items[] = [
                    'id'      => $id,
                    'title'   => (string) ($doc['title'] ?? $id),
                    'savedAt' => (string) ($doc['savedAt'] ?? ''),
                    'count'   => count((array) ($doc['book']['entries'] ?? [])),
                ];
            }
        }
        usort($items, fn($a, $b) => strcmp($b['savedAt'], $a['savedAt']));
        json_out(['items' => array_slice($items, 0, 100)]);
    }

    $id = (string) ($b['id'] ?? '');
    if (!book_id_ok($id)) {
        json_out(['error' => 'รหัสเล่มไม่ถูกต้อง'], 400);
    }

    if ($action === 'load') {
        $doc = store_json_get('books', "{$id}.json");
        if (!is_array($doc)) {
            json_out(['error' => 'ไม่พบเล่มนี้'], 404);
        }
        $missing = [];
        foreach ((array) ($doc['images'] ?? []) as $key => $imgId) {
            if (!store_has('images', "{$imgId}.png") && !store_has('images', "{$imgId}.jpg")) {
                $missing[] = (string) $key;
            }
        }
        json_out(['data' => $doc, 'missingImages' => $missing]);
    }

    if ($action === 'delete') {
        store_del('books', "{$id}.json");
        json_out(['ok' => true]);
    }

    json_out(['error' => 'action ไม่ถูกต้อง'], 400);
} catch (Throwable $e) {
    json_error($e);
}
