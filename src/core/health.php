<?php
declare(strict_types=1);

require_once __DIR__ . '/core.php';
require_once __DIR__ . '/store.php';
require_once __DIR__ . '/../ai/ai.php';
require_once __DIR__ . '/../reference/curriculum.php';
require_once __DIR__ . '/../reference/library.php';
require_once __DIR__ . '/../worksheet/saved.php';
require_once __DIR__ . '/../planning/lplan.php';
require_once __DIR__ . '/../planning/term.php';
require_once __DIR__ . '/../worksheet/bank.php';
require_once __DIR__ . '/../planning/exam.php';

/** รายการไฟล์ที่ต้องมีครบ (สร้างตอนแพ็กเวอร์ชัน) */
function health_manifest(): array
{
    $f = __DIR__ . '/manifest.php';
    return is_file($f) ? (array) (include $f) : [];
}

/** ไฟล์ที่ขาด หรือมีแต่ Apache อ่านไม่ได้ */
function health_files(): array
{
    $root = dirname(__DIR__, 2);
    $missing = [];
    $unreadable = [];
    foreach (health_manifest() as $rel) {
        $p = $root . '/' . $rel;
        if (!is_file($p)) {
            $missing[] = $rel;
        } elseif (!is_readable($p)) {
            $unreadable[] = $rel;
        }
    }
    return ['missing' => $missing, 'unreadable' => $unreadable, 'total' => count(health_manifest())];
}

function health_writable(): array
{
    $out = [];
    if (store_backend() === 'db') { // โหมดฐานข้อมูล: ลองเขียน/อ่าน/ลบแถวทดสอบ
        $ok = false;
        try {
            store_put('settings', '_probe.txt', 'ok');
            $ok = store_get('settings', '_probe.txt') === 'ok';
            store_del('settings', '_probe.txt');
        } catch (Throwable $e) {
            $ok = false;
        }
        foreach (['images', 'saved', 'library', 'curriculum', 'lplans', 'terms', 'exams', 'settings', 'bank', 'books'] as $sub) {
            $out[$sub] = $ok;
        }
        return $out;
    }
    foreach (['images', 'saved', 'library', 'curriculum', 'lplans', 'terms', 'exams', 'settings', 'bank', 'books'] as $sub) {
        $d = store_primary($sub);
        if (!is_dir($d)) {
            @mkdir($d, 0775, true);
        }
        $out[$sub] = is_dir($d) && is_writable($d);
    }
    return $out;
}

/**
 * รายการตรวจความพร้อม: [ ['level'=>'ok|warn|bad', 'title', 'detail', 'link'=>[href,label]|null, 'cmd'=>string|null] ]
 */
function health_report(): array
{
    $root = dirname(__DIR__, 2);
    $rows = [];
    $add = function (string $level, string $title, string $detail = '', ?array $link = null, ?string $cmd = null) use (&$rows) {
        $rows[] = ['level' => $level, 'title' => $title, 'detail' => $detail, 'link' => $link, 'cmd' => $cmd];
    };
    $fix = 'chmod -R a+rX ' . escapeshellarg($root) . ' && chmod -R a+rwX ' . escapeshellarg($root . '/data');

    $f = health_files();
    if ($f['missing'] || $f['unreadable']) {
        $bits = [];
        if ($f['missing']) {
            $bits[] = 'ไฟล์ที่ไม่พบ (' . count($f['missing']) . '): ' . implode(', ', array_slice($f['missing'], 0, 8)) . (count($f['missing']) > 8 ? ' …' : '');
        }
        if ($f['unreadable']) {
            $bits[] = 'ไฟล์ที่ Apache อ่านไม่ได้ (' . count($f['unreadable']) . '): ' . implode(', ', array_slice($f['unreadable'], 0, 8)) . (count($f['unreadable']) > 8 ? ' …' : '');
        }
        $add('bad', 'ไฟล์ของโปรแกรมไม่ครบหรืออ่านไม่ได้ (เมนูอาจขึ้น 404 หรือ 500)', implode(' | ', $bits) . ($f['unreadable'] ? ' — รันคำสั่งนี้ใน Terminal หนึ่งครั้ง:' : ' — ให้ก๊อปไฟล์อัปเดตล่าสุดมาทับให้ครบ'), null, $f['unreadable'] ? $fix : null);
    } else {
        $add('ok', 'ไฟล์ของโปรแกรมครบ ' . $f['total'] . ' ไฟล์ และอ่านได้');
    }

    $w = health_writable();
    $bad = array_keys(array_filter($w, fn($x) => !$x));
    if ($bad) {
        if (store_backend() === 'db') {
            $add('bad', 'บันทึกข้อมูลลงฐานข้อมูลไม่ได้ (ตาราง ta_files)', 'ตรวจว่าผู้ใช้ฐานข้อมูลมีสิทธิ์ CREATE/INSERT/DELETE และ max_allowed_packet อย่างน้อย 1MB หรือรัน docs/schema.sql สร้างตารางเอง');
        } else {
            $add('bad', 'บันทึกข้อมูลไม่ได้ (โฟลเดอร์ data/' . implode(', data/', $bad) . ' เขียนไม่ได้)', 'ระบบจะใช้โฟลเดอร์ชั่วคราวแทน ซึ่งอาจหายเมื่อรีสตาร์ตเครื่อง รันคำสั่งนี้ใน Terminal หนึ่งครั้ง:', null, $fix);
        }
    } else {
        $add('ok', 'บันทึกข้อมูลได้ปกติ');
    }

    $ready = array_values(array_filter(PROVIDERS, 'provider_has_key'));
    if ($ready) {
        $add('ok', 'ตั้งค่า AI แล้ว: ' . implode(', ', array_map(fn($p) => PROVIDER_LABEL[$p], $ready)));
    } else {
        $add('bad', 'ยังไม่ได้ใส่ API Key ของ AI', 'เปิดไฟล์ config.php แล้วใส่คีย์ของ Gemini / OpenAI / OpenRouter อย่างน้อยหนึ่งตัว (ดูวิธีใน README.md)');
    }

    $ed = cur_editions();
    $subs = cur_subjects($ed['active']['default']);
    $nInd = array_sum(array_map(fn($s) => (int) ($s['count'] ?? 0), $subs));
    if ($nInd > 0) {
        $add('ok', 'มีตัวชี้วัดในระบบ ' . $nInd . ' ข้อ (' . count($subs) . ' วิชา)', '', ['curriculum.php', 'จัดการตัวชี้วัด']);
    } else {
        $add('warn', 'ยังไม่มีตัวชี้วัดของหลักสูตร', 'ไม่บังคับ แต่ถ้านำเข้า ระบบจะผูกตัวชี้วัดกับแผนการสอนและใบงานได้ (ดาวน์โหลด PDF ตัวชี้วัดจาก สพฐ./สสวท. แล้วนำเข้า)', ['curriculum.php', 'นำเข้าตัวชี้วัด']);
    }

    $nLib = count(lib_list());
    $add($nLib ? 'ok' : 'warn', $nLib ? "คลังเอกสารมี {$nLib} รายการ" : 'ยังไม่มีเอกสารอ้างอิงในคลัง', $nLib ? '' : 'ไม่บังคับ ถ้าอัปโหลดหนังสือเรียน/แผนสถานศึกษา AI จะใช้เป็นแนวทางและดึงบทอ่านใส่ใบงานได้', ['library.php', 'ไปคลังเอกสาร']);

    $add(password_required() ? 'ok' : 'warn', password_required() ? 'ตั้งรหัสผ่านเข้าใช้งานแล้ว' : 'ยังไม่ตั้งรหัสผ่าน', password_required() ? '' : 'ถ้าใช้เฉพาะในเครื่องตัวเองไม่ต้องตั้ง แต่ถ้านำขึ้นอินเทอร์เน็ตต้องตั้ง app_password ใน config.php');
    return $rows;
}

/** จำนวนข้อมูลของแต่ละคลัง (แสดงบนหน้าเริ่มต้น) */
function health_counts(): array
{
    $saved = saved_index();
    $active = array_filter($saved, fn($s) => $s['trashedAt'] === '');
    return [
        'lplans' => count(lp_list()),
        'terms'  => count(term_list()),
        'exams'  => count(exam_list()),
        'saved'  => count($active),
        'bank'   => count(bank_read()),
        'library' => count(lib_list()),
    ];
}
