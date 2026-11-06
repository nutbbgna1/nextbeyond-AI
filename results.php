<?php
declare(strict_types=1);

require_once __DIR__ . '/src/core/core.php';
require_once __DIR__ . '/src/lms/lms.php';
require_once __DIR__ . '/src/core/nav.php';

if (!is_authed()) {
    header('Location: index.php');
    exit;
}
$v = max(@filemtime(__DIR__ . '/assets/js/pages/results.js') ?: 1, @filemtime(__DIR__ . '/assets/css/results.css') ?: 1, @filemtime(__DIR__ . '/assets/css/style.css') ?: 1);
?><!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ผลการมอบหมาย</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Mali:wght@400;600;700&family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/css/style.css?v=<?= $v ?>">
<link rel="stylesheet" href="assets/css/results.css?v=<?= $v ?>">
</head>
<body>
<div class="app">
  <?= nav_html('results') ?>
  <h1>ผลการมอบหมาย</h1>
  <p class="sub">ใบงานและข้อสอบที่ยิงเข้าคอร์สแล้ว ดูว่าใครทำแล้ว ได้คะแนนเท่าไร และอ่อนตรงไหน</p>
  <?php if (!lms_ready()): ?>
    <div class="panel">หน้านี้ใช้ได้เมื่อเปิดผ่าน nextbeyond เท่านั้น</div>
  <?php else: ?>
    <div id="wr-app"><div class="wr-empty">กำลังโหลด...</div></div>
    <div id="wr-modal" class="wr-modal" hidden>
      <div class="wr-modal-box">
        <div class="wr-modal-head"><div id="wr-modal-title"></div><button type="button" id="wr-modal-close" class="wr-close" aria-label="ปิด">×</button></div>
        <div id="wr-modal-body" class="wr-modal-body"></div>
      </div>
    </div>
    <script src="assets/js/pages/results.js?v=<?= $v ?>" defer></script>
  <?php endif; ?>
</div>
</body>
</html>
