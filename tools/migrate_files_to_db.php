<?php
/* ย้ายข้อมูลเดิมจากโฟลเดอร์ data/ (แบบไฟล์) เข้าฐานข้อมูล nextbeyond (ตาราง ta_files)
 *
 * ใช้ใน Terminal (ไม่ต้องล็อกอินเว็บ):
 *   php admin/teacher-ai/tools/migrate_files_to_db.php --owner=1 --from=/Applications/XAMPP/xamppfiles/htdocs/AI/data
 *   เพิ่ม --dry-run เพื่อดูว่าจะย้ายอะไรบ้างโดยไม่เขียนจริง
 *
 *   --owner  รหัสครูใน users.id ที่จะเป็นเจ้าของใบงาน/แผน/ข้อสอบ/คลัง (ส่วน settings, curriculum, images เป็นของส่วนกลาง)
 *   --from   โฟลเดอร์ data เดิม
 * ย้ายซ้ำได้ปลอดภัย (ไฟล์ชื่อเดิมจะถูกเขียนทับ) ไฟล์ต้นทางไม่ถูกลบ
 */
if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit('CLI only');
}
$o = getopt('', ['owner:', 'from:', 'dry-run']);
$owner = (int) ($o['owner'] ?? 0);
$from = rtrim((string) ($o['from'] ?? ''), '/');
$dry = isset($o['dry-run']);
if ($owner < 1 || !is_dir($from)) {
    fwrite(STDERR, "ใช้: php migrate_files_to_db.php --owner=<users.id> --from=<โฟลเดอร์ data เดิม> [--dry-run]\n");
    exit(1);
}
require_once __DIR__ . '/../../includes/db.php'; // nextbeyond/includes/db.php (ให้ตัวแปร $pdo)
if (!isset($pdo) || !($pdo instanceof PDO)) {
    fwrite(STDERR, "ไม่พบการเชื่อมต่อฐานข้อมูล (\$pdo) จาก includes/db.php\n");
    exit(1);
}
$GLOBALS['TA_PDO'] = $pdo;
define('TA_OWNER_ID', $owner);
require_once __DIR__ . '/../src/core/core.php';

$buckets = ['saved', 'lplans', 'terms', 'exams', 'bank', 'books', 'library', 'curriculum', 'images', 'settings'];
$total = 0;
$skipped = 0;
foreach ($buckets as $b) {
    foreach (glob("{$from}/{$b}/*") ?: [] as $f) {
        $n = basename($f);
        if (!is_file($f) || str_ends_with($n, '.tmp') || $n === 'index.php' || $n === '.htaccess' || strlen($n) > 190) {
            $skipped++;
            continue;
        }
        if ($b === 'saved' && $n === '_index.json') { // ดัชนีสร้างใหม่ได้เอง
            continue;
        }
        if (!$dry) {
            store_put($b, $n, (string) file_get_contents($f));
        }
        $total++;
        echo ($dry ? '[dry] ' : '') . "{$b}/{$n}\n";
    }
}
foreach (['or_models_text.json', 'or_models_image.json'] as $n) { // แคชรายชื่อโมเดล สร้างใหม่ได้ ไม่ต้องย้าย
}
echo "\nเสร็จ: " . ($dry ? 'จะย้าย ' : 'ย้าย ') . "{$total} ไฟล์ (ข้าม {$skipped}) → ครูรหัส {$owner}\n";
