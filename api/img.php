<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/core/core.php';
require_once __DIR__ . '/../src/core/store.php';

// ส่งไฟล์ภาพจากคลัง (data/ ถูกบล็อกไม่ให้เปิดตรง จึงต้องผ่านไฟล์นี้)
if (!is_authed()) {
    http_response_code(401);
    exit;
}
$id = (string) ($_GET['id'] ?? '');
if (!preg_match('/^[a-f0-9]{40}$/', $id)) {
    http_response_code(400);
    exit('Bad id');
}
foreach (['png' => 'image/png', 'jpg' => 'image/jpeg'] as $ext => $mime) {
    $bin = store_get('images', "{$id}.{$ext}");
    if ($bin !== null) {
        header('Content-Type: ' . $mime);
        header('Content-Length: ' . strlen($bin));
        header('Cache-Control: private, max-age=86400');
        echo $bin;
        exit;
    }
}
http_response_code(404);
echo 'Not found';
