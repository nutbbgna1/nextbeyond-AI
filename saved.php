<?php
declare(strict_types=1);

require_once __DIR__ . '/src/core/core.php';
require_once __DIR__ . '/src/worksheet/saved.php';
require_once __DIR__ . '/src/core/nav.php';

if (!is_authed()) {
    header('Location: index.php');
    exit;
}
$types = [];
foreach (SHEET_TYPES as $t) {
    $types[$t] = SHEET_TYPE_LABEL[$t];
}
$v = max(@filemtime(__DIR__ . '/assets/js/pages/saved.js') ?: 1, @filemtime(__DIR__ . '/assets/js/shared/common.js') ?: 1, @filemtime(__DIR__ . '/assets/js/pages/lms-send.js') ?: 1, @filemtime(__DIR__ . '/assets/css/style.css') ?: 1);
?><!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>คลังใบงาน</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Mali:wght@400;600;700&family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/css/style.css?v=<?= $v ?>">
</head>
<body>
<div class="app">
  <div id="jserr" class="error hidden"></div>
  <?= nav_html('saved') ?>
  <h1>คลังใบงาน</h1>
  <p class="sub">ชุดใบงานที่สร้างไว้ทั้งหมด จัดหมวดอัตโนมัติตามชั้น/วิชา และจัดเป็นโฟลเดอร์ของคุณเองได้ ใบที่ลบจะอยู่ในถังขยะ 30 วันก่อนหายถาวร</p>

  <div class="libgrid">
    <div class="panel">
      <strong>หมวดหมู่</strong>
      <div class="tree" id="tree" style="margin-top:8px"></div>
      <div class="row" style="justify-content:space-between;margin-top:14px"><strong>โฟลเดอร์ของฉัน</strong><button class="ghost small" id="newFolder">＋ ใหม่</button></div>
      <div class="tree" id="folders" style="margin-top:6px"></div>
      <div class="row" style="margin-top:14px"><button class="ghost small" id="zipImport">⬆ นำเข้า zip/json</button><input type="file" id="zipFile" accept=".zip,.json" multiple class="hidden"></div>
      <div class="row" style="justify-content:space-between;margin-top:14px"><strong>สถานะ</strong></div>
      <div class="tree" id="statuses" style="margin-top:6px"></div>
      <div class="tree" style="margin-top:14px"><button id="trashBtn">🗑 ถังขยะ <span id="trashCount"></span></button></div>
    </div>

    <div>
      <div class="panel">
        <div class="row">
          <input type="search" id="q" placeholder="ค้นหาจากชื่อ หัวข้อ หรือข้อความในโจทย์" style="flex:1;min-width:200px">
          <select id="fType"><option value="">ทุกชนิดใบงาน</option><?php foreach ($types as $k => $l): ?><option value="<?= $k ?>"><?= htmlspecialchars($l) ?></option><?php endforeach; ?></select>
          <select id="fDiff"><option value="">ทุกระดับความยาก</option></select>
          <select id="fYear"><option value="">ทุกปีการศึกษา</option></select>
          <select id="fTerm"><option value="">ทุกภาคเรียน</option><option value="1">ภาคเรียนที่ 1</option><option value="2">ภาคเรียนที่ 2</option></select>
          <select id="fLesson"><option value="">ใบความรู้: ทั้งหมด</option><option value="yes">มีใบความรู้</option><option value="no">ไม่มีใบความรู้</option></select>
          <input type="text" id="fInd" placeholder="รหัสตัวชี้วัด" style="max-width:130px">
          <select id="view"><option value="cards">การ์ด</option><option value="table">ตาราง</option></select>
        </div>
        <div class="row" style="justify-content:space-between;margin-top:10px">
          <strong id="listTitle">ชุดใบงาน <span id="count" style="font-weight:400;color:var(--muted)"></span></strong>
          <label style="font-size:13px;font-weight:400;display:flex;gap:6px;align-items:center"><input type="checkbox" id="selAll"> เลือกทั้งหมดที่แสดง</label>
        </div>
        <div class="selbar hidden" id="bulk" style="position:static">
          <span id="bulkInfo"></span>
          <select id="bulkFolder"><option value="">ใส่ในโฟลเดอร์…</option></select>
          <select id="bulkStatus"><option value="">ตั้งสถานะ…</option></select>
          <button id="bulkBook">📖 เพิ่มลงเล่ม</button>
          <button id="bulkBank" class="ghost">🧩 เก็บเข้าคลังข้อสอบ</button>
          <button id="bulkZip" class="ghost">⬇ ส่งออก zip</button>
          <button id="bulkTrash" style="background:#c0392b">🗑 ย้ายไปถังขยะ</button>
          <button class="ghost small hidden" id="bulkRestore">กู้คืน</button>
          <button class="ghost small hidden" id="bulkPurge">ลบถาวร</button>
        </div>
        <div id="list" style="margin-top:8px;font-size:14px">กำลังโหลด…</div>
      </div>

      <div class="panel hidden" id="editBox">
        <strong>แก้ข้อมูลชุดใบงาน</strong>
        <div class="grid" style="margin-top:10px">
          <label class="f" style="grid-column:span 2">ชื่อชุด<input type="text" id="eTitle" maxlength="150"></label>
          <label class="f">ชั้น<select id="eGrade"><option value="">—</option></select></label>
          <label class="f">วิชา<input type="text" id="eSubject" list="subjList"><datalist id="subjList"></datalist></label>
          <label class="f">ปีการศึกษา (พ.ศ.)<input type="text" id="eYear" maxlength="4" placeholder="เช่น 2569"></label>
          <label class="f">ภาคเรียน<select id="eTerm"><option value="">—</option><option value="1">1</option><option value="2">2</option><option value="3">ฤดูร้อน</option></select></label>
          <label class="f">สถานะ<select id="eStatus"></select></label>
        </div>
        <div style="margin-top:10px"><span style="font-size:14px;font-weight:600">โฟลเดอร์</span><div class="row" id="eFolders" style="margin-top:6px"></div></div>
        <div class="row" style="margin-top:12px"><button id="eSave">บันทึก</button><button class="ghost" id="eCancel">ยกเลิก</button></div>
      </div>
    </div>
  </div>
</div>
<script src="assets/js/data/curriculum.js"></script>
<script src="assets/js/shared/common.js?v=<?= $v ?>"></script>
<script>
window.SHEET_TYPE_LABELS = <?= json_encode($types, JSON_UNESCAPED_UNICODE) ?>;
</script>
<?php if (defined('HOST_EMBEDDED')): ?>
<script>window.TA_EMBEDDED = true;</script>
<script src="assets/js/pages/lms-send.js?v=<?= $v ?>"></script>
<?php endif; ?>
<script src="assets/js/pages/saved.js?v=<?= $v ?>"></script>
</body>
</html>
