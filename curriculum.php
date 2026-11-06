<?php
declare(strict_types=1);

require_once __DIR__ . '/src/core/core.php';
require_once __DIR__ . '/src/core/nav.php';

if (!is_authed()) {
    header('Location: index.php');
    exit;
}
$v = max(@filemtime(__DIR__ . '/assets/js/pages/curriculum-admin.js') ?: 1, @filemtime(__DIR__ . '/assets/js/shared/common.js') ?: 1, @filemtime(__DIR__ . '/assets/css/style.css') ?: 1);
?><!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>หลักสูตรและตัวชี้วัด</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Mali:wght@400;600;700&family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/css/style.css?v=<?= $v ?>">
</head>
<body>
<div class="app">
  <div id="jserr" class="error hidden"></div>
  <?= nav_html('curriculum') ?>
  <h1>หลักสูตรและตัวชี้วัด</h1>
  <p class="sub">เก็บตัวชี้วัดของหลักสูตรได้หลายฉบับ (เช่น แกนกลาง 2560 และฉบับใหม่ในอนาคต) เลือกฉบับที่ใช้ต่อชั้นได้ ตอนสร้างใบงานจะเลือกตัวชี้วัดที่ต้องการวัด และระบบจะพิมพ์รหัสกำกับในใบงาน</p>

  <div class="row" id="tabs" style="margin-bottom:10px">
    <button data-tab="ed" class="small">1) ฉบับหลักสูตร</button>
    <button data-tab="ind" class="ghost small">2) ตัวชี้วัด</button>
    <button data-tab="imp" class="ghost small">3) นำเข้าจากไฟล์</button>
    <button data-tab="xw" class="ghost small">4) เทียบต่างฉบับ</button>
  </div>

  <!-- 1) ฉบับ -->
  <div id="tab-ed">
    <div class="panel">
      <strong>ฉบับหลักสูตรที่มี</strong>
      <div id="edList" style="margin-top:8px;font-size:14px"></div>
      <div class="grid" style="margin-top:12px">
        <label class="f" style="grid-column:span 2">ชื่อหลักสูตรฉบับใหม่<input type="text" id="edName" maxlength="120" placeholder="เช่น หลักสูตรฐานสมรรถนะ พ.ศ. 2568 (ป.1–3)"></label>
        <label class="f">ปี พ.ศ.<input type="text" id="edYear" maxlength="4" placeholder="2568"></label>
        <label class="f" style="grid-column:span 3">หมายเหตุ<input type="text" id="edNote" maxlength="300"></label>
      </div>
      <div class="row" style="margin-top:10px"><button id="edAdd">＋ เพิ่มหลักสูตรฉบับนี้</button></div>
    </div>
    <div class="panel">
      <strong>ฉบับที่ใช้ในแต่ละชั้น</strong>
      <div style="font-size:12px;color:var(--muted);margin:4px 0 8px">ตอนสร้างใบงาน ระบบจะดึงตัวชี้วัดจากฉบับที่ตั้งไว้ของชั้นนั้น เช่น ป.1–3 ใช้ฉบับใหม่ ส่วน ป.4–ม.6 ใช้ฉบับ 2560</div>
      <div class="row"><label style="font-weight:600;font-size:14px">ฉบับตั้งต้น <select id="edDefault"></select></label></div>
      <div class="grid" id="edByGrade" style="margin-top:10px"></div>
      <div class="row" style="margin-top:10px"><button id="edActiveSave">บันทึกการใช้งาน</button><span id="edActiveNote" class="sub" style="margin:0"></span></div>
    </div>
  </div>

  <!-- 2) ตัวชี้วัด -->
  <div id="tab-ind" class="hidden">
    <div class="panel">
      <div class="row">
        <label class="f">ฉบับ<select id="indEd"></select></label>
        <label class="f">วิชา<input type="text" id="indSubject" list="indSubjList" placeholder="เลือกหรือพิมพ์ชื่อวิชา"><datalist id="indSubjList"></datalist></label>
        <label class="f">ชั้น<select id="indGrade"><option value="">ทุกชั้น</option></select></label>
        <button class="ghost small" id="indLoad" style="align-self:flex-end">เปิด</button>
      </div>
      <div id="indSubjects" style="margin-top:8px;font-size:13px"></div>
    </div>
    <div class="panel hidden" id="indBox">
      <div class="row" style="justify-content:space-between"><strong id="indTitle"></strong>
        <span class="row"><button class="ghost small" id="indAdd">＋ เพิ่มตัวชี้วัด</button><button id="indSave">บันทึก</button><button class="ghost small" id="indDelSubject">ลบวิชานี้ออกจากฉบับ</button></span></div>
      <div id="indTable" style="margin-top:8px;overflow:auto"></div>
      <div id="indNote" class="sub" style="margin:6px 0 0"></div>
    </div>
  </div>

  <!-- 4) เทียบต่างฉบับ -->
  <div id="tab-xw" class="hidden">
    <div class="panel">
      <strong>เทียบตัวชี้วัดข้ามฉบับ</strong>
      <p class="sub" style="margin:4px 0 10px;font-size:13px">เมื่อมีหลักสูตรฉบับใหม่ ให้นำเข้าตัวชี้วัดวิชานั้นทั้งสองฉบับ แล้วให้ AI เสนอว่าตัวชี้วัดเดิมตรงกับข้อใดของฉบับใหม่ ผลจาก AI เป็นร่างเพื่อให้ครูตรวจแก้ก่อนบันทึก ใช้ช่วยย้ายใบงานเดิมไปฉบับใหม่ได้เร็วขึ้น ไม่ใช่ตารางเทียบทางการ</p>
      <div class="row">
        <label class="f">ฉบับเดิม<select id="xwFrom"></select></label>
        <label class="f">ฉบับใหม่<select id="xwTo"></select></label>
        <label class="f">วิชา<input type="text" id="xwSubject" list="indSubjList" placeholder="เลือกหรือพิมพ์ชื่อวิชา"></label>
        <label class="f">ชั้น (ฉบับเดิม)<select id="xwGrade"><option value="">ทุกชั้น</option></select></label>
      </div>
      <div class="row" style="margin-top:10px"><button class="ghost" id="xwLoad">เปิดตารางที่บันทึกไว้</button><button id="xwSuggest">ให้ AI เสนอการจับคู่</button><button class="ghost" id="xwSave">บันทึก</button><span id="xwNote" class="sub" style="margin:0"></span></div>
    </div>
    <div class="panel hidden" id="xwBox"><div id="xwTable" style="overflow:auto"></div></div>
  </div>

  <!-- 3) นำเข้า -->
  <div id="tab-imp" class="hidden">
    <div class="panel">
      <strong>นำเข้าตัวชี้วัดจากเอกสารหลักสูตร</strong>
      <p class="sub" style="margin:4px 0 10px;font-size:13px">ดาวน์โหลดเอกสารตัวชี้วัดของวิชาที่ต้องการจากเว็บทางการ (สพฐ. หรือ สสวท.) แล้วอัปโหลดที่นี่ ระบบถอดข้อความในเครื่องของคุณ แล้วคัดเฉพาะบรรทัดที่เป็นตัวชี้วัดตรงตามต้นฉบับ จากนั้นตรวจทานก่อนบันทึก</p>
      <div class="grid">
        <label class="f" style="grid-column:span 2">ไฟล์ (PDF ที่เลือกข้อความได้ / DOCX / TXT)<input type="file" id="impFile" accept=".pdf,.docx,.txt,.md"></label>
        <label class="f">ฉบับหลักสูตร<select id="impEd"></select></label>
        <label class="f">วิชา (ที่ไฟล์นี้เป็นของ)<input type="text" id="impSubject" list="indSubjList" placeholder="เช่น คณิตศาสตร์"></label>
        <label class="f">หน้าที่ใช้ (เว้นว่าง = ทั้งหมด)<input type="text" id="impRange" placeholder="เช่น 10-45"></label>
      </div>
      <details style="margin-top:8px"><summary style="cursor:pointer;font-size:14px;font-weight:600">หรือวางข้อความเอง</summary><textarea id="impPaste" rows="6" style="width:100%;margin-top:6px"></textarea></details>
      <div class="row" style="margin-top:10px">
        <button id="impParse">ถอดตัวชี้วัด (ไม่ใช้ AI)</button>
        <button class="ghost" id="impAi" disabled>ให้ AI ช่วยถอด (เมื่อถอดเองได้ไม่ครบ)</button>
        <span id="impNote" class="sub" style="margin:0"></span>
      </div>
    </div>
    <div class="panel hidden" id="impBox">
      <div class="row" style="justify-content:space-between"><strong>ตรวจทานก่อนบันทึก <span id="impCount" style="font-weight:400;color:var(--muted)"></span></strong>
        <span class="row"><label style="font-size:13px;font-weight:400">บันทึกแบบ <select id="impMode"><option value="merge">เพิ่ม/อัปเดตรวมกับของเดิม</option><option value="replace">แทนที่ทั้งวิชา</option></select></label><button id="impSave">บันทึกเข้าฉบับ</button></span></div>
      <div style="font-size:12px;color:var(--muted);margin:4px 0">✔ = ข้อความตรงกับเอกสารต้นฉบับ · ⚠ = AI เรียบเรียงข้อความไม่ตรงต้นฉบับ ควรแก้ให้ตรงหรือเอาออก · แก้ข้อความ/เอาออกได้ก่อนบันทึก</div>
      <div id="impTable" style="overflow:auto"></div>
    </div>
  </div>
</div>
<script src="assets/js/data/curriculum.js"></script>
<script src="assets/vendor/pdf.min.js"></script>
<script src="assets/vendor/jszip.min.js"></script>
<script src="assets/js/shared/extract.js"></script>
<script src="assets/js/shared/common.js?v=<?= $v ?>"></script>
<script src="assets/js/pages/curriculum-admin.js?v=<?= $v ?>"></script>
</body>
</html>
