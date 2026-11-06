<?php
/* ย่อภาพที่เก็บไว้แล้วในฐานข้อมูล (ta_files, bucket images) ให้เล็กลง — ใช้ครั้งเดียวหลังอัปเดต
 *   php teacher-ai/tools/shrink_images.php --dry-run     ดูก่อนว่าจะประหยัดเท่าไร
 *   php teacher-ai/tools/shrink_images.php               ย่อจริง (ภาพเดิมถูกแทนที่ด้วยไฟล์ .jpg ที่ id เดิม)
 *   เพิ่ม --max=900 --quality=78 เพื่อกำหนดเอง
 * โหมดไฟล์ (โปรเจกต์ AI เดิม): ใช้ได้เหมือนกัน เพิ่ม --file ถ้าไม่มี includes/db.php */
if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit('CLI only');
}
$o = getopt('', ['dry-run', 'max:', 'quality:', 'file']);
$dry = isset($o['dry-run']);
if (!isset($o['file'])) {
    require_once __DIR__ . '/../../includes/db.php';
    if (!isset($pdo) || !($pdo instanceof PDO)) {
        fwrite(STDERR, "ไม่พบ \$pdo จาก includes/db.php\n");
        exit(1);
    }
    $GLOBALS['TA_PDO'] = $pdo;
}
require_once __DIR__ . '/../src/core/core.php';
$max = (int) ($o['max'] ?? 900);
$q = (int) ($o['quality'] ?? 78);
$before = $after = $n = 0;
foreach (store_list('images', '*') as $name => $st) {
    if (!preg_match('/^([a-f0-9]{40})\.(png|jpg)$/', $name, $m)) {
        continue;
    }
    $bin = store_get('images', $name);
    if ($bin === null) {
        continue;
    }
    [$new, $ext] = image_shrink($bin, $m[2], $max, $q);
    if ($new === $bin) {
        continue;
    }
    $before += strlen($bin);
    $after += strlen($new);
    $n++;
    if (!$dry) {
        store_put('images', "{$m[1]}.{$ext}", $new);
        if ("{$m[1]}.{$ext}" !== $name) {
            store_del('images', $name);
        }
    }
}
printf("%s %d ภาพ: %.1f MB → %.1f MB\n", $dry ? 'จะย่อ' : 'ย่อแล้ว', $n, $before / 1048576, $after / 1048576);
