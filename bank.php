<?php
declare(strict_types=1);

require_once __DIR__ . '/src/core/core.php';
require_once __DIR__ . '/src/core/nav.php';

if (!is_authed()) {
    header('Location: index.php');
    exit;
}
$types = [];
foreach (SHEET_TYPES as $t) {
    $types[$t] = SHEET_TYPE_LABEL[$t];
}
$v = max(@filemtime(__DIR__ . '/assets/js/pages/bank.js') ?: 1, @filemtime(__DIR__ . '/assets/js/pages/live-send.js') ?: 1, @filemtime(__DIR__ . '/assets/js/shared/common.js') ?: 1, @filemtime(__DIR__ . '/assets/css/style.css') ?: 1);
?><!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>คลังข้อสอบ</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Mali:wght@400;600;700&family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/css/style.css?v=<?= $v ?>">
</head>
<body>
<div class="app">
  <div id="jserr" class="error hidden"></div>
  <?= nav_html('bank') ?>
  <h1>คลังข้อสอบ</h1>
  <p class="sub">เก็บโจทย์รายข้อจากชุดใบงานที่บันทึกไว้ (เพิ่มได้จากหน้า “คลังใบงาน” → เลือกชุด → “เก็บเข้าคลังข้อสอบ”) แล้วเลือกข้อมาประกอบเป็นชุดใหม่ ข้อที่ใช้รูปประกอบ บทอ่าน หรือสื่อร่วมกับข้ออื่นจะไม่ถูกเก็บ เพราะแยกออกมาแล้วจะไม่ครบ</p>
  <div class="panel">
    <div class="row">
      <input type="search" id="q" placeholder="ค้นหาข้อความในโจทย์/หัวข้อ" style="flex:1;min-width:200px">
      <select id="fGrade"><option value="">ทุกชั้น</option></select>
      <select id="fSubject"><option value="">ทุกวิชา</option></select>
      <select id="fType"><option value="">ทุกชนิด</option><?php foreach ($types as $k => $l): ?><option value="<?= $k ?>"><?= htmlspecialchars($l) ?></option><?php endforeach; ?></select>
      <select id="fTerm"><option value="">ทุกภาคเรียน</option><option value="1">ภาคเรียนที่ 1</option><option value="2">ภาคเรียนที่ 2</option></select>
      <select id="fLevel"><option value="">ทุกระดับ</option><option value="1">ง่าย</option><option value="2">ปานกลาง</option><option value="3">ยาก</option><option value="4">ยากมาก</option></select>
      <input type="text" id="fInd" placeholder="รหัสตัวชี้วัด" style="max-width:130px">
    </div>
    <div class="row" style="justify-content:space-between;margin-top:10px">
      <strong>โจทย์ <span id="count" style="font-weight:400;color:var(--muted)"></span></strong>
      <label style="font-size:13px;font-weight:400;display:flex;gap:6px;align-items:center"><input type="checkbox" id="selAll"> เลือกทั้งหมดที่แสดง</label>
    </div>
    <div class="selbar hidden" id="bulk" style="position:static">
      <span id="bulkInfo"></span>
      <input type="text" id="cTitle" placeholder="ชื่อชุดใหม่" maxlength="100" style="min-width:180px">
      <button id="compose">➕ ประกอบเป็นชุดใหม่</button>
      <button id="del" style="background:#c0392b">🗑 ลบออกจากคลัง</button>
    </div>
    <div id="list" style="margin-top:8px;font-size:14px">กำลังโหลด…</div>
    <div class="row" style="margin-top:8px"><button class="ghost small hidden" id="more">แสดงเพิ่ม</button></div>
  </div>
</div>
<script src="assets/js/shared/common.js?v=<?= $v ?>"></script>
<script>window.SHEET_TYPE_LABELS = <?= json_encode($types, JSON_UNESCAPED_UNICODE) ?>;</script>
<?php if (defined('HOST_EMBEDDED')): ?><script>window.TA_EMBEDDED = true;</script><script src="assets/js/pages/live-send.js?v=<?= $v ?>"></script><?php endif; ?>
<script src="assets/js/pages/bank.js?v=<?= $v ?>"></script>
</body>
</html>
