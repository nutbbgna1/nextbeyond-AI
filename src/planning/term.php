<?php
declare(strict_types=1);

require_once __DIR__ . '/../core/core.php';
require_once __DIR__ . '/../core/store.php';

/* แผนทั้งภาคเรียน: data/terms/{id}.json */

function term_id_ok(string $id): bool
{
    return preg_match('/^[0-9]{8}-[0-9]{6}-[a-f0-9]{8}$/', $id) === 1;
}

function term_read(string $id): ?array
{
    return term_id_ok($id) ? store_json_get('terms', "{$id}.json") : null;
}

function term_write(string $id, array $doc): void
{
    store_json_put('terms', "{$id}.json", $doc, 500000, 'บันทึกแผนไม่ได้ (ข้อมูลใหญ่เกินไป หรือที่เก็บข้อมูลเขียนไม่ได้)');
}

function term_list(): array
{
    $out = [];
    $seen = [];
    {
        foreach (array_keys(store_list('terms', '*.json')) as $fn) {
            $id = basename($fn, '.json');
            if (!term_id_ok($id) || isset($seen[$id])) {
                continue;
            }
            $seen[$id] = true;
            $doc = store_json_get('terms', $fn);
            if (is_array($doc)) {
                $out[] = ['id' => $id, 'title' => (string) ($doc['title'] ?? ''), 'grade' => (string) ($doc['grade'] ?? ''), 'subject' => (string) ($doc['subject'] ?? ''), 'weeks' => count((array) ($doc['rows'] ?? [])), 'savedAt' => (string) ($doc['savedAt'] ?? '')];
            }
        }
    }
    usort($out, fn($a, $b) => strcmp($b['savedAt'], $a['savedAt']));
    return $out;
}

function term_schema(): array
{
    return [
        'type' => 'object',
        'properties' => ['rows' => s_list(s_obj([
            'week'           => ['type' => 'integer', 'description' => 'สัปดาห์ที่ (เริ่ม 1)'],
            'unit'           => s_str('ชื่อหน่วยการเรียนรู้ (ใช้ตามรายการที่ให้ ถ้ามี)'),
            'topic'          => s_str('หัวข้อสอนของสัปดาห์นี้ ภาษาไทย สั้นกระชับ'),
            'kind'           => ['type' => 'string', 'enum' => ['lesson', 'review', 'exam']],
            'sheetType'      => ['type' => 'string', 'enum' => SHEET_TYPES],
            'indicatorCodes' => s_list(s_str(), 'รหัสตัวชี้วัด (จากรายการที่ให้เท่านั้น) ที่สอนในสัปดาห์นี้'),
            'note'           => s_str('หมายเหตุสั้นๆ เช่น กิจกรรม หรือ "" ถ้าไม่มี'),
        ]))],
        'required' => ['rows'],
        'additionalProperties' => false,
    ];
}
