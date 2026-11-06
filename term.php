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
$v = max(@filemtime(__DIR__ . '/assets/js/pages/term.js') ?: 1, @filemtime(__DIR__ . '/assets/js/shared/common.js') ?: 1, @filemtime(__DIR__ . '/assets/css/style.css') ?: 1);
?><!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>แผนทั้งภาคเรียน</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Mali:wght@400;600;700&family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/css/style.css?v=<?= $v ?>">
<style>#tbl td,#tbl th{padding:4px 5px}#tbl input[type=text],#tbl select{width:100%;min-width:0;padding:6px 7px;font-size:13px}#tbl select{max-width:130px}#tbl th:nth-child(1){width:64px}#tbl th:nth-child(6){width:140px}#tbl th:nth-child(7){width:110px}@media print{.topnav,.no-print{display:none!important}.panel{box-shadow:none;border:0}select,input{border:0!important;background:none!important;appearance:none}}</style>
</head>
<body>
<div class="app">
  <div id="jserr" class="error hidden"></div>
  <?= nav_html('term') ?>
  <h1>แผนทั้งภาคเรียน</h1>
  <p class="sub">ให้ AI ช่วยร่างแผนรายสัปดาห์จากหน่วยการเรียนรู้และตัวชี้วัดของชั้น/วิชานั้น (ครูแก้ไขได้ทุกช่อง) แล้วกด “สร้างใบงาน” ของแต่ละสัปดาห์ ระบบจะเปิดหน้าสร้างใบงานพร้อมหัวข้อ รูปแบบ และตัวชี้วัดที่เลือกให้ ร่างจาก AI ใช้เป็นจุดเริ่มต้น ไม่ใช่แผนที่ผ่านการรับรอง</p>

  <div class="panel no-print">
    <div class="grid">
      <label class="f">ชั้น<select id="grade"></select></label>
      <label class="f">วิชา<select id="subject"></select></label>
      <label class="f">ภาคเรียน<select id="term"><option value="">ทุกหน่วย</option><option value="1">ภาคเรียนที่ 1</option><option value="2">ภาคเรียนที่ 2</option></select></label>
      <label class="f">จำนวนสัปดาห์ (1-24)<input type="number" id="weeks" min="1" max="24" value="18"></label>
      <label class="f">สัปดาห์ทบทวน<input type="number" id="review" min="0" max="4" value="1"></label>
      <label class="f">สัปดาห์สอบ<input type="number" id="exam" min="0" max="4" value="2"></label>
      <label class="f" style="grid-column:span 3">ข้อเสนอแนะเพิ่มเติม (ไม่บังคับ)<input type="text" id="hint" maxlength="300" placeholder="เช่น เน้นกิจกรรมปฏิบัติ / ช่วงสัปดาห์ที่ 5 มีวันหยุดยาว"></label>
    </div>
    <div id="unitNote" style="font-size:12px;color:var(--muted);margin-top:6px"></div>
    <div class="row" style="margin-top:12px"><button id="gen">ให้ AI ร่างแผน</button><button type="button" class="ghost hidden" id="stopGen" title="หยุดการร่างทันที">⏹ หยุด</button><span id="genNote" class="sub" style="margin:0"></span></div>
  </div>

  <div class="panel hidden" id="planBox">
    <div class="row" style="justify-content:space-between" >
      <label class="f" style="flex:1;min-width:220px">ชื่อแผน<input type="text" id="title" maxlength="120"></label>
      <span class="row no-print"><button id="save">บันทึกแผน</button><button class="ghost" id="print">พิมพ์</button><span id="saveNote" class="sub" style="margin:0"></span></span>
    </div>
    <div id="cov" style="font-size:13px;margin:8px 0"></div>
    <div style="overflow-x:auto"><table class="tbl" id="tbl"><thead><tr><th>สัปดาห์</th><th>หน่วย</th><th>หัวข้อ</th><th>ประเภท</th><th>ชนิดใบงาน</th><th>ตัวชี้วัด</th><th>หมายเหตุ</th><th class="no-print"></th></tr></thead><tbody></tbody></table></div>
    <div class="row no-print" style="margin-top:8px"><button class="ghost small" id="addRow">＋ เพิ่มแถว</button></div>
  </div>

  <div class="panel no-print"><strong>แผนที่บันทึกไว้</strong><div id="saved" style="margin-top:8px;font-size:14px">กำลังโหลด…</div></div>
</div>
<script src="assets/js/data/curriculum.js"></script>
<script src="assets/js/shared/common.js?v=<?= $v ?>"></script>
<script>window.SHEET_TYPE_LABELS = <?= json_encode($types, JSON_UNESCAPED_UNICODE) ?>;</script>
<script src="assets/js/pages/term.js?v=<?= $v ?>"></script>
</body>
</html>
