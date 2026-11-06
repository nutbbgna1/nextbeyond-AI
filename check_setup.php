<?php
declare(strict_types=1);

/**
 * ตรวจระบบ: ไฟล์ครบ/อ่านได้ไหม เขียนข้อมูลได้ไหม ตั้งค่า AI แล้วหรือยัง
 * เปิดในเบราว์เซอร์:  http://localhost/ai/check_setup.php
 */
require_once __DIR__ . '/src/core/core.php';
require_once __DIR__ . '/src/core/nav.php';
require_once __DIR__ . '/src/core/health.php';

if (!is_authed()) {
    header('Location: index.php');
    exit;
}
$user = function_exists('posix_geteuid') ? (posix_getpwuid(posix_geteuid())['name'] ?? '?') : get_current_user();
$report = health_report();
$files = health_files();
$w = health_writable();
$ic = ['ok' => '✅', 'warn' => '💡', 'bad' => '❌'];
$v = @filemtime(__DIR__ . '/assets/css/style.css') ?: 1;
?><!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ตรวจระบบ</title>
<link rel="stylesheet" href="assets/css/style.css?v=<?= $v ?>">
</head>
<body>
<div class="app">
  <?= nav_html('setup') ?>
  <h1>ตรวจระบบ</h1>
  <p class="sub">ถ้าเมนูขึ้น 404 / 500 หรือบันทึกไม่ได้ หน้านี้จะบอกสาเหตุและวิธีแก้</p>
  <div class="panel">
    <?php foreach ($report as $r): ?>
      <div class="chk"><span class="ic"><?= $ic[$r['level']] ?></span><div>
        <div><b><?= htmlspecialchars($r['title']) ?></b><?= $r['link'] ? ' <a href="' . htmlspecialchars($r['link'][0]) . '">' . htmlspecialchars($r['link'][1]) . ' →</a>' : '' ?></div>
        <?php if ($r['detail'] !== ''): ?><small><?= htmlspecialchars($r['detail']) ?></small><?php endif; ?>
        <?php if ($r['cmd']): ?><code class="cmd"><?= htmlspecialchars($r['cmd']) ?></code><?php endif; ?>
      </div></div>
    <?php endforeach; ?>
  </div>
  <div class="panel" style="font-size:14px">
    <strong>รายละเอียด</strong>
    <div style="margin-top:6px;line-height:1.8">
      PHP/Apache รันเป็นผู้ใช้: <b><?= htmlspecialchars((string) $user) ?></b> · PHP <?= htmlspecialchars(PHP_VERSION) ?><br>
      โฟลเดอร์โปรแกรม: <code><?= htmlspecialchars(__DIR__) ?></code><br>
      ที่เก็บข้อมูล:
      <?php foreach ($w as $sub => $ok): ?><span class="chip <?= $ok ? 'green' : 'amber' ?>">data/<?= $sub ?> <?= $ok ? 'เขียนได้' : 'เขียนไม่ได้' ?></span><?php endforeach; ?>
    </div>
    <?php if ($files['missing']): ?><div style="margin-top:8px"><b>ไฟล์ที่ไม่พบ:</b><br><?= htmlspecialchars(implode("\n", $files['missing'])) ?></div><?php endif; ?>
    <?php if ($files['unreadable']): ?><div style="margin-top:8px"><b>ไฟล์ที่อ่านไม่ได้:</b><br><?= nl2br(htmlspecialchars(implode("\n", $files['unreadable']))) ?></div><?php endif; ?>
  </div>
</div>
</body>
</html>
