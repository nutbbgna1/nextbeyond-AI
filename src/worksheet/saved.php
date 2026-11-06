<?php
declare(strict_types=1);

require_once __DIR__ . '/../core/core.php';
require_once __DIR__ . '/../core/store.php';

/* ------------------------------------------------------------------ */
/*  คลังใบงานที่บันทึกไว้: อ่าน/เขียนไฟล์ + ดัชนี (สรุปรายชุด เพื่อให้หน้าคลังเปิดเร็ว)   */
/*   data/saved/{id}.json   ชุดใบงาน (เนื้อหาเต็ม)                          */
/*   data/saved/_index.json ดัชนีสรุป สร้างใหม่อัตโนมัติเมื่อไฟล์เปลี่ยน          */
/*   data/saved/_folders.json รายชื่อโฟลเดอร์ (รวมโฟลเดอร์ที่ยังว่าง)            */
/* ------------------------------------------------------------------ */

const SAVED_STATUSES = ['draft' => 'ร่าง', 'checked' => 'ตรวจแล้ว', 'used' => 'ใช้สอนแล้ว'];
const SAVED_TRASH_DAYS = 30;

function saved_id_ok(string $id): bool
{
    return preg_match('/^[0-9]{8}-[0-9]{6}-[a-f0-9]{8}$/', $id) === 1;
}

/** ปีการศึกษา (พ.ศ.) และภาคเรียนโดยประมาณจากวันที่ (เปิดเทอม พ.ค. / พ.ย.) */
function saved_auto_term(string $iso): array
{
    $t = strtotime($iso) ?: time();
    $y = (int) date('Y', $t);
    $m = (int) date('n', $t);
    if ($m >= 5) {
        return [(string) ($y + 543), $m <= 10 ? '1' : '2'];
    }
    return [(string) ($y + 542), $m <= 3 ? '2' : ''];
}

function saved_read(string $id): ?array
{
    return store_json_get('saved', "{$id}.json");
}

/** เขียนชุดลงที่เดิม (ถ้าไฟล์อยู่ในโฟลเดอร์สำรองก็เขียนที่นั่น) หรือโฟลเดอร์ที่เขียนได้ถ้ายังไม่มี */
function saved_write(string $id, array $doc): string
{
    $json = json_encode($doc, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PARTIAL_OUTPUT_ON_ERROR);
    if ($json === false || strlen($json) > 3_000_000) {
        throw new ApiException('ข้อมูลใหญ่เกินไปที่จะบันทึก', 413, 'TOO_BIG');
    }
    store_put('saved', "{$id}.json", $json);
    return store_where('saved');
}

function saved_json_write(string $name, array $data): void
{
    $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PARTIAL_OUTPUT_ON_ERROR);
    if ($json !== false) {
        try {
            store_put('saved', $name, $json);
        } catch (ApiException $e) { // ดัชนีเป็นแค่แคช เขียนไม่ได้ก็สร้างใหม่รอบหน้า
        }
    }
}

function saved_json_read(string $name): array
{
    return store_json_get('saved', $name) ?? [];
}

/** ข้อความโจทย์ย่อๆ ไว้ค้นหา */
function saved_item_text(array $it): string
{
    foreach (['question', 'text', 'statement', 'left', 'label', 'problem'] as $k) {
        if (!empty($it[$k]) && is_string($it[$k])) {
            return $it[$k];
        }
    }
    return '';
}

function saved_summary(array $doc): array
{
    $m = (array) ($doc['meta'] ?? []);
    $sheets = array_values(array_filter((array) ($doc['sheets'] ?? []), 'is_array'));
    $types = [];
    $diffs = [];
    $inds = [];
    $blob = [(string) ($doc['title'] ?? ''), (string) ($m['topic'] ?? '')];
    $hasLesson = false;
    $hasPassage = false;
    $unit = '';
    $preview = '';
    $grade = (string) ($m['grade'] ?? '');
    $subject = (string) ($m['subject'] ?? '');
    foreach ($sheets as $s) {
        $t = (string) ($s['plan']['type'] ?? ($s['sheet']['type'] ?? ''));
        if ($t !== '' && !in_array($t, $types, true)) {
            $types[] = $t;
        }
        $d = (string) (($s['difficulty'] ?? '') ?: ($m['difficulty'] ?? ''));
        if ($d !== '' && !in_array($d, $diffs, true)) {
            $diffs[] = $d;
        }
        if (!empty($s['lesson'])) {
            $hasLesson = true;
        }
        $sh = (array) ($s['sheet'] ?? []);
        if (!empty($sh['passage'])) {
            $hasPassage = true;
        }
        $ex = (array) ($s['extra'] ?? []);
        if (count((array) ($ex['levelMix'] ?? [])) > 1 && !in_array('mix', $diffs, true)) {
            $diffs[] = 'mix';
        }
        if ($unit === '' && !empty($ex['unit'])) {
            $unit = (string) $ex['unit'];
        }
        foreach ((array) ($ex['indicators'] ?? []) as $ind) {
            $c = (string) ($ind['code'] ?? '');
            if ($c !== '' && !in_array($c, $inds, true)) {
                $inds[] = $c;
            }
        }
        if ($grade === '') {
            $grade = (string) ($s['grade'] ?? '');
        }
        if ($subject === '') {
            $subject = (string) ($s['subject'] ?? '');
        }
        $blob[] = (string) ($s['plan']['topic'] ?? '');
        foreach (['items', 'mcItems', 'writtenItems'] as $k) {
            foreach (array_slice((array) ($sh[$k] ?? []), 0, 6) as $it) {
                if (is_array($it)) {
                    $blob[] = saved_item_text($it);
                    if ($preview === '') {
                        $preview = mb_substr(saved_item_text($it), 0, 140);
                    }
                }
            }
        }
    }
    [$ay, $at] = saved_auto_term((string) ($doc['savedAt'] ?? ''));
    $status = (string) ($doc['status'] ?? 'draft');
    return [
        'id'         => (string) ($doc['id'] ?? ''),
        'title'      => (string) ($doc['title'] ?? ''),
        'savedAt'    => (string) ($doc['savedAt'] ?? ''),
        'count'      => count($sheets),
        'grade'      => $grade,
        'subject'    => $subject,
        'unit'       => $unit,
        'topic'      => (string) ($m['topic'] ?? ''),
        'types'      => $types,
        'difficulties' => $diffs,
        'preview'    => $preview,
        'hasLesson'  => $hasLesson,
        'hasPassage' => $hasPassage,
        'indicators' => $inds,
        'status'     => isset(SAVED_STATUSES[$status]) ? $status : 'draft',
        'folders'    => array_values(array_filter(array_map('strval', (array) ($doc['folders'] ?? [])))),
        'year'       => (string) (($doc['year'] ?? '') ?: $ay),
        'term'       => (string) (($doc['term'] ?? '') ?: $at),
        'trashedAt'  => (string) ($doc['trashedAt'] ?? ''),
        'blob'       => mb_strtolower(mb_substr(implode(' ', array_filter($blob)), 0, 4000)),
    ];
}

/** ดัชนีสรุปทุกชุด (สร้างซ้ำเฉพาะไฟล์ที่เปลี่ยน) */
function saved_index(): array
{
    $idx = saved_json_read('_index.json');
    $out = [];
    $changed = false;
    $seen = [];
    {
        foreach (store_list('saved', '*.json') as $fn => $st) {
            $id = basename($fn, '.json');
            if (!saved_id_ok($id) || isset($seen[$id])) {
                continue;
            }
            $seen[$id] = true;
            $sig = $st['mtime'] . ':' . $st['size'];
            if (isset($idx[$id]) && ($idx[$id]['sig'] ?? '') === $sig) {
                $out[$id] = $idx[$id]['s'];
                continue;
            }
            $doc = store_json_get('saved', $fn);
            if (!is_array($doc)) {
                continue;
            }
            $doc['id'] = $id;
            $out[$id] = saved_summary($doc);
            $idx[$id] = ['sig' => $sig, 's' => $out[$id]];
            $changed = true;
        }
    }
    foreach (array_keys($idx) as $id) {
        if (!isset($seen[$id])) {
            unset($idx[$id]);
            $changed = true;
        }
    }
    if ($changed) {
        saved_json_write('_index.json', $idx);
    }
    return $out;
}

/** ลบถาวรชุดที่อยู่ในถังขยะเกินกำหนด */
function saved_purge_old(array $index): void
{
    $limit = time() - SAVED_TRASH_DAYS * 86400;
    foreach ($index as $id => $s) {
        if ($s['trashedAt'] !== '' && (strtotime($s['trashedAt']) ?: PHP_INT_MAX) < $limit) {
            saved_delete_file($id);
        }
    }
}

function saved_delete_file(string $id): void
{
    store_del('saved', "{$id}.json");
}

function saved_folder_names(array $index): array
{
    $names = array_map('strval', (array) (saved_json_read('_folders.json')['names'] ?? []));
    foreach ($index as $s) {
        foreach ($s['folders'] as $f) {
            $names[] = $f;
        }
    }
    $names = array_values(array_unique(array_filter($names, fn($n) => $n !== '')));
    sort($names);
    return $names;
}

function saved_clean_folder(string $n): string
{
    return mb_substr(trim((string) preg_replace('/\s+/u', ' ', $n)), 0, 60);
}
