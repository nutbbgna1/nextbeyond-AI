<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/core/core.php';
require_once __DIR__ . '/../src/core/store.php';
require_once __DIR__ . '/../src/worksheet/saved.php';

/**
 * เก็บ/เรียก/จัดการ "ชุดใบงานที่สร้างแล้ว" (เนื้อหา + รายการภาพ) เป็นไฟล์ JSON
 *   save   { id?, title, meta, sheets, images }       → { id, savedAt }   (คงสถานะ/โฟลเดอร์/ปีการศึกษาเดิมไว้)
 *   list   { trashed?, q?, limit? }                    → { items, folders, statuses, trashCount }
 *   load   { id }                                      → { data, missingImages:[key] }
 *   update { id, title?, status?, folders?, year?, term?, grade?, subject? }
 *   bulk   { ids, op: folder_add|folder_remove|status|trash|restore|purge, value? }
 *   copy   { id }                                      → { id }
 *   delete { id }  = ย้ายเข้าถังขยะ (กู้คืนได้ 30 วัน)   purge { id } = ลบถาวร   empty_trash
 *   folders { op: create|rename|delete, name, to? }
 * ภาพเก็บแยกอยู่แล้วในคลังภาพ (อ้างด้วย id) ชุดที่บันทึกจึงเล็ก
 */
function save_ids(array $ids): array
{
    return array_values(array_unique(array_filter(array_map('strval', $ids), 'saved_id_ok')));
}

function save_patch(string $id, callable $fn): bool
{
    $doc = saved_read($id);
    if (!$doc) {
        return false;
    }
    $fn($doc);
    saved_write($id, $doc);
    return true;
}

try {
    $b = api_guard();
    $action = (string) ($b['action'] ?? '');

    if ($action === 'save') {
        $sheets = array_values(array_filter((array) ($b['sheets'] ?? []), fn($s) => is_array($s)));
        if (!$sheets) {
            json_out(['error' => 'ไม่มีใบงานให้บันทึก'], 400);
        }
        $id = (string) ($b['id'] ?? '');
        if (!saved_id_ok($id)) {
            $id = date('Ymd-His') . '-' . bin2hex(random_bytes(4));
        }
        $images = [];
        foreach ((array) ($b['images'] ?? []) as $key => $imgId) {
            if (is_string($key) && is_string($imgId) && preg_match('/^[a-f0-9]{40}$/', $imgId)) {
                $images[mb_substr($key, 0, 300)] = $imgId;
            }
        }
        $now = date('c');
        $old = saved_read($id) ?? [];
        $doc = [
            'id'      => $id,
            'title'   => mb_substr(trim((string) ($b['title'] ?? '')) ?: 'ชุดใบงาน', 0, 150),
            'savedAt' => $now,
            'meta'    => is_array($b['meta'] ?? null) ? $b['meta'] : [],
            'sheets'  => $sheets,
            'images'  => $images,
        ];
        // ข้อมูลการจัดการที่ครูตั้งไว้ในคลัง ไม่ให้การบันทึกอัตโนมัติทับ
        foreach (['status', 'folders', 'year', 'term', 'trashedAt', 'lms'] as $k) {
            if (isset($old[$k])) {
                $doc[$k] = $old[$k];
            }
        }
        $mt = (string) ($doc['meta']['term'] ?? '');
        if (in_array($mt, ['1', '2'], true)) { // ภาคเรียนที่เลือกในหน้าสร้างใบงาน
            $doc['term'] = $mt;
        }
        if (!empty($old['title']) && !empty($old['titleEdited'])) { // ครูตั้งชื่อเอง: คงชื่อไว้
            $doc['title'] = $old['title'];
            $doc['titleEdited'] = true;
        }
        $where = saved_write($id, $doc);
        json_out(['id' => $id, 'savedAt' => $now, 'where' => $where]);
    }

    if ($action === 'list') {
        $index = saved_index();
        saved_purge_old($index);
        $wantTrash = !empty($b['trashed']);
        $q = mb_strtolower(trim((string) ($b['q'] ?? '')));
        $trashCount = 0;
        $items = [];
        foreach ($index as $s) {
            $isTrash = $s['trashedAt'] !== '';
            if ($isTrash) {
                $trashCount++;
            }
            if ($isTrash !== $wantTrash) {
                continue;
            }
            if ($q !== '' && !str_contains($s['blob'], $q)) {
                continue;
            }
            unset($s['blob']);
            $items[] = $s;
        }
        usort($items, fn($a, $c) => strcmp($c['savedAt'], $a['savedAt']));
        $limit = (int) ($b['limit'] ?? 0);
        if ($limit > 0) {
            $items = array_slice($items, 0, $limit);
        }
        json_out(['items' => $items, 'folders' => saved_folder_names($index), 'statuses' => SAVED_STATUSES, 'trashCount' => $trashCount]);
    }

    if ($action === 'folders') {
        $op = (string) ($b['op'] ?? '');
        $name = saved_clean_folder((string) ($b['name'] ?? ''));
        $to = saved_clean_folder((string) ($b['to'] ?? ''));
        if ($name === '') {
            json_out(['error' => 'กรุณาใส่ชื่อโฟลเดอร์'], 400);
        }
        $names = array_map('strval', (array) (saved_json_read('_folders.json')['names'] ?? []));
        if ($op === 'create') {
            $names[] = $name;
        } elseif ($op === 'rename' || $op === 'delete') {
            if ($op === 'rename' && $to === '') {
                json_out(['error' => 'กรุณาใส่ชื่อใหม่'], 400);
            }
            $names = array_values(array_filter($names, fn($n) => $n !== $name));
            if ($op === 'rename') {
                $names[] = $to;
            }
            foreach (saved_index() as $s) {
                if (in_array($name, $s['folders'], true)) {
                    save_patch($s['id'], function (&$doc) use ($name, $to, $op) {
                        $f = array_values(array_filter((array) ($doc['folders'] ?? []), fn($x) => $x !== $name));
                        if ($op === 'rename' && !in_array($to, $f, true)) {
                            $f[] = $to;
                        }
                        $doc['folders'] = $f;
                    });
                }
            }
        } else {
            json_out(['error' => 'op ไม่ถูกต้อง'], 400);
        }
        saved_json_write('_folders.json', ['names' => array_values(array_unique($names))]);
        json_out(['ok' => true, 'folders' => saved_folder_names(saved_index())]);
    }

    if ($action === 'bulk') {
        $ids = save_ids((array) ($b['ids'] ?? []));
        $op = (string) ($b['op'] ?? '');
        $val = (string) ($b['value'] ?? '');
        $n = 0;
        foreach ($ids as $id) {
            if ($op === 'purge') {
                saved_delete_file($id);
                $n++;
                continue;
            }
            $ok = save_patch($id, function (&$doc) use ($op, $val) {
                $f = array_values(array_map('strval', (array) ($doc['folders'] ?? [])));
                if ($op === 'folder_add') {
                    $v = saved_clean_folder($val);
                    if ($v !== '' && !in_array($v, $f, true)) {
                        $f[] = $v;
                    }
                    $doc['folders'] = $f;
                } elseif ($op === 'folder_remove') {
                    $doc['folders'] = array_values(array_filter($f, fn($x) => $x !== $val));
                } elseif ($op === 'status' && isset(SAVED_STATUSES[$val])) {
                    $doc['status'] = $val;
                } elseif ($op === 'trash') {
                    $doc['trashedAt'] = date('c');
                } elseif ($op === 'restore') {
                    unset($doc['trashedAt']);
                }
            });
            $n += $ok ? 1 : 0;
        }
        json_out(['ok' => true, 'changed' => $n]);
    }

    if ($action === 'import') {
        $d = $b['doc'] ?? null;
        $sheets = is_array($d) ? array_values(array_filter((array) ($d['sheets'] ?? []), 'is_array')) : [];
        if (!$sheets) {
            json_out(['error' => 'ไฟล์ไม่ใช่ชุดใบงาน'], 400);
        }
        $new = date('Ymd-His') . '-' . bin2hex(random_bytes(4));
        $imgs = [];
        foreach ((array) ($d['images'] ?? []) as $key => $imgId) {
            if (is_string($key) && is_string($imgId) && preg_match('/^[a-f0-9]{40}$/', $imgId)) {
                $imgs[mb_substr($key, 0, 300)] = $imgId;
            }
        }
        $folders = array_values(array_unique(array_filter(array_map('saved_clean_folder', array_map('strval', (array) ($d['folders'] ?? []))))));
        saved_write($new, [
            'id'      => $new,
            'title'   => mb_substr(trim((string) ($d['title'] ?? '')) ?: 'ชุดใบงานที่นำเข้า', 0, 150),
            'savedAt' => date('c'),
            'status'  => isset(SAVED_STATUSES[(string) ($d['status'] ?? '')]) ? (string) $d['status'] : 'draft',
            'meta'    => (array) ($d['meta'] ?? []),
            'sheets'  => $sheets,
            'images'  => $imgs ?: new stdClass(),
            'folders' => $folders,
            'year'    => preg_replace('/[^0-9]/', '', (string) ($d['year'] ?? '')),
            'term'    => in_array((string) ($d['term'] ?? ''), ['1', '2', '3'], true) ? (string) $d['term'] : '',
        ]);
        json_out(['ok' => true, 'id' => $new]);
    }

    if ($action === 'empty_trash') {
        $n = 0;
        foreach (saved_index() as $s) {
            if ($s['trashedAt'] !== '') {
                saved_delete_file($s['id']);
                $n++;
            }
        }
        json_out(['ok' => true, 'purged' => $n]);
    }

    $id = (string) ($b['id'] ?? '');
    if (!saved_id_ok($id)) {
        json_out(['error' => 'รหัสชุดใบงานไม่ถูกต้อง'], 400);
    }

    if ($action === 'load') {
        $doc = saved_read($id);
        if (!$doc) {
            json_out(['error' => 'ไม่พบชุดใบงานนี้'], 404);
        }
        $missing = [];
        foreach ((array) ($doc['images'] ?? []) as $key => $imgId) {
            if (!store_has('images', "{$imgId}.png") && !store_has('images', "{$imgId}.jpg")) {
                $missing[] = (string) $key;
            }
        }
        json_out(['data' => $doc, 'missingImages' => $missing]);
    }

    if ($action === 'update') {
        $ok = save_patch($id, function (&$doc) use ($b) {
            if (isset($b['title'])) {
                $t = mb_substr(trim((string) $b['title']), 0, 150);
                if ($t !== '') {
                    $doc['title'] = $t;
                    $doc['titleEdited'] = true;
                }
            }
            if (isset($b['status']) && isset(SAVED_STATUSES[(string) $b['status']])) {
                $doc['status'] = (string) $b['status'];
            }
            if (isset($b['folders']) && is_array($b['folders'])) {
                $doc['folders'] = array_values(array_unique(array_filter(array_map('saved_clean_folder', array_map('strval', $b['folders'])))));
            }
            if (isset($b['year'])) {
                $doc['year'] = preg_replace('/[^0-9]/', '', (string) $b['year']);
            }
            if (isset($b['term'])) {
                $doc['term'] = in_array((string) $b['term'], ['1', '2', '3'], true) ? (string) $b['term'] : '';
            }
            foreach (['grade', 'subject'] as $k) {
                if (isset($b[$k])) {
                    $doc['meta'] = (array) ($doc['meta'] ?? []);
                    $doc['meta'][$k] = mb_substr(trim((string) $b[$k]), 0, 80);
                }
            }
        });
        if (!$ok) {
            json_out(['error' => 'ไม่พบชุดใบงานนี้'], 404);
        }
        json_out(['ok' => true]);
    }

    if ($action === 'copy') {
        $doc = saved_read($id);
        if (!$doc) {
            json_out(['error' => 'ไม่พบชุดใบงานนี้'], 404);
        }
        $new = date('Ymd-His') . '-' . bin2hex(random_bytes(4));
        $doc['id'] = $new;
        $doc['title'] = mb_substr((string) ($doc['title'] ?? 'ชุดใบงาน') . ' (สำเนา)', 0, 150);
        $doc['savedAt'] = date('c');
        $doc['status'] = 'draft';
        unset($doc['trashedAt'], $doc['titleEdited']);
        saved_write($new, $doc);
        json_out(['ok' => true, 'id' => $new]);
    }

    if ($action === 'delete' || $action === 'trash') {
        save_patch($id, function (&$doc) {
            $doc['trashedAt'] = date('c');
        });
        json_out(['ok' => true, 'trashed' => true]);
    }
    if ($action === 'restore') {
        save_patch($id, function (&$doc) {
            unset($doc['trashedAt']);
        });
        json_out(['ok' => true]);
    }
    if ($action === 'purge') {
        saved_delete_file($id);
        json_out(['ok' => true]);
    }

    json_out(['error' => 'action ไม่ถูกต้อง'], 400);
} catch (Throwable $e) {
    json_error($e);
}
