<?php
declare(strict_types=1);

require_once __DIR__ . '/src/core/core.php';
require_once __DIR__ . '/src/reference/library.php';

/* ส่งไฟล์ PDF ต้นฉบับของคลังเอกสาร (เฉพาะผู้ล็อกอิน และเฉพาะเอกสารของครูคนนั้น) library_file.php?id=…&which=doc|key */
if (!is_authed()) {
    http_response_code(401);
    exit;
}
$id = (string) ($_GET['id'] ?? '');
$which = ($_GET['which'] ?? 'doc') === 'key' ? 'key' : 'doc';
if (!lib_id_ok($id) || lib_read_json($id . '.meta.json') === null) {
    http_response_code(404);
    exit;
}
$f = lib_file_path($id, $which);
if (!is_file($f)) {
    http_response_code(404);
    exit;
}
if (function_exists('session_status') && session_status() === PHP_SESSION_ACTIVE) {
    session_write_close();
}
$size = (int) filesize($f);
$start = 0;
$end = $size - 1;
$code = 200;
if (preg_match('/^bytes=(\d*)-(\d*)$/', (string) ($_SERVER['HTTP_RANGE'] ?? ''), $r) && ($r[1] !== '' || $r[2] !== '')) {
    if ($r[1] === '') {
        $start = max(0, $size - (int) $r[2]);
    } else {
        $start = (int) $r[1];
        $end = $r[2] !== '' ? min((int) $r[2], $size - 1) : $end;
    }
    if ($start > $end || $start >= $size) {
        header('Content-Range: bytes */' . $size);
        http_response_code(416);
        exit;
    }
    $code = 206;
    header("Content-Range: bytes $start-$end/$size");
}
http_response_code($code);
header('Content-Type: application/pdf');
header('Content-Disposition: inline; filename="' . $id . ($which === 'key' ? '-key' : '') . '.pdf"');
header('Accept-Ranges: bytes');
header('Content-Length: ' . ($end - $start + 1));
header('Cache-Control: private, max-age=300');
header('X-Content-Type-Options: nosniff');
while (ob_get_level() > 0) {
    ob_end_clean();
}
$h = fopen($f, 'rb');
fseek($h, $start);
$left = $end - $start + 1;
while ($left > 0 && !feof($h)) {
    $buf = fread($h, min(65536, $left));
    if ($buf === false || $buf === '') {
        break;
    }
    echo $buf;
    $left -= strlen($buf);
}
fclose($h);
