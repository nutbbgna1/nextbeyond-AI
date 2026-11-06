<?php
declare(strict_types=1);

require_once __DIR__ . '/src/core/core.php';
require_once __DIR__ . '/src/reference/library.php';
require_once __DIR__ . '/src/core/nav.php';

if (!is_authed()) {
    header('Location: index.php');
    exit;
}
$v = max(@filemtime(__DIR__ . '/assets/js/pages/library.js') ?: 1, @filemtime(__DIR__ . '/assets/js/shared/common.js') ?: 1, @filemtime(__DIR__ . '/assets/js/shared/extract.js') ?: 1, @filemtime(__DIR__ . '/assets/js/shared/gdrive.js') ?: 1, @filemtime(__DIR__ . '/assets/css/style.css') ?: 1);
?><!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>คลังเอกสารอ้างอิง</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Mali:wght@400;600;700&family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/css/style.css?v=<?= $v ?>">
<style>
#bookView{border:1px solid var(--line,#e5e7eb);border-radius:12px;overflow:hidden;background:#f1f3f7;outline:none}
.book-bar{display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding:8px 10px;background:#fff;border-bottom:1px solid var(--line,#e5e7eb)}
.book-bar input{width:64px;padding:4px 6px;text-align:center}
.book-bar .btnlink{white-space:nowrap}
.book-sp{flex:1}
.book-frame{display:block;width:100%;height:75vh;border:0;background:#fff}
.book-scroll{max-height:75vh;overflow:auto;padding:8px;text-align:center}
.drive-box{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.drive-dot{width:10px;height:10px;border-radius:50%;background:#c4c9d4;flex:none}
.drive-dot.on{background:#1e8e3e}
.book-scroll canvas{box-shadow:0 1px 6px rgba(0,0,0,.2);background:#fff;max-width:none}
</style>
</head>
<body>
<div class="app">
  <div id="jserr" class="error hidden"></div>
  <?= nav_html('library') ?>
  <h1>คลังเอกสารอ้างอิง</h1>
  <p class="sub">อัปโหลดหนังสือเรียน แผนการสอน คลังคำศัพท์ หรือใบงานตัวอย่าง แยกตามชั้นและวิชา เก็บไฟล์ต้นฉบับได้ทั้งบนเว็บนี้และใน Google Drive (เลือกได้ตอนอัปโหลด) ระบบอ่านไฟล์ในเครื่องของคุณ (ถอดข้อความ หรือ OCR ถ้าเป็น PDF สแกน) แล้วเก็บข้อความไว้ให้ AI ใช้เป็นแนวทางตอนสร้างใบงาน/ใบความรู้ และเลือกข้อความยาวไปใส่ในใบงานตรงตามต้นฉบับได้</p>

  <div class="panel" id="driveBox">
    <div class="drive-box">
      <span class="drive-dot" id="driveDot"></span>
      <strong>Google Drive</strong>
      <span id="driveText" class="sub" style="margin:0;flex:1;min-width:200px">กำลังตรวจ…</span>
      <a class="btnlink small hidden" id="driveFolder" target="_blank" rel="noopener">เปิดโฟลเดอร์ใน Drive ↗</a>
      <button class="ghost small hidden" id="drivePing">ทดสอบการเชื่อมต่อ</button>
      <a class="btnlink small" id="driveSetupBtn" href="settings.php#gdrive">ตั้งค่า Google Drive (ที่ ตั้งค่า AI)</a>
    </div>
  </div>

  <div class="panel" id="upBox">
    <strong id="upTitle">เพิ่มเอกสาร</strong>
    <div class="grid" style="margin-top:10px">
      <label class="f" style="grid-column:span 2">ไฟล์ (PDF / DOCX / TXT / MD) เลือกได้หลายไฟล์ · ไฟล์ไม่ถูกอัปโหลดเก็บบน Server ระบบอ่านในเครื่องคุณแล้วเก็บเฉพาะข้อความ
        <input type="file" id="files" multiple accept=".pdf,.docx,.txt,.md,.csv,text/plain,application/pdf">
      </label>
      <label class="f" style="grid-column:span 2">ไฟล์เฉลย (ไม่บังคับ) · จะเก็บรวมกับใบงานเป็นเอกสารเดียว
        <input type="file" id="keyFiles" multiple accept=".pdf,.docx,.txt,.md,.csv,text/plain,application/pdf">
        <span style="font-size:12px;color:var(--muted);font-weight:400" id="keyHint">อัปโหลดใบงานหลายไฟล์พร้อมกันได้ ระบบจับคู่เฉลยจากชื่อไฟล์ (เช่น “เศษส่วน.pdf” คู่กับ “เศษส่วน-เฉลย.pdf”) ถ้ามีใบงานไฟล์เดียวกับเฉลยไฟล์เดียวจะจับคู่ให้เลย</span>
        <label class="check hidden" id="keyRemoveRow" style="margin-top:4px"><input type="checkbox" id="keyRemove"> ลบเฉลยที่เก็บไว้กับเอกสารนี้</label>
      </label>
      <details id="linkBox" style="grid-column:1/-1"><summary style="cursor:pointer;font-size:14px;font-weight:600">วางลิงก์ Google Drive เอง (ขั้นสูง · ใช้เมื่อมีไฟล์ใน Drive อยู่แล้ว)</summary>
        <div class="grid" style="margin-top:8px">
      <label class="f" style="grid-column:span 2">ลิงก์ Google Drive ของใบงาน
        <input type="url" id="driveUrl" placeholder="https://drive.google.com/file/d/…/view" maxlength="500"></label>
      <label class="f" style="grid-column:span 2">ลิงก์ Google Drive ของเฉลย
        <input type="url" id="keyDriveUrl" placeholder="https://drive.google.com/file/d/…/view" maxlength="500"></label>
        </div>
      </details>
      <label class="f">ประเภทเอกสาร<select id="kind"></select></label>
      <label class="f">ลิขสิทธิ์/ที่มา<select id="rights"></select></label>
      <label class="f">วิชา<input type="text" id="subject" list="subjList" placeholder="เช่น คณิตศาสตร์ (เว้นว่าง = ใช้ได้ทุกวิชา)"><datalist id="subjList"></datalist></label>
      <label class="f">เทอม<select id="term"><option value="">ทุกเทอม</option><option value="1">เทอม 1</option><option value="2">เทอม 2</option></select></label>
      <label class="f">หน่วย/บท (ไม่บังคับ)<input type="text" id="unit" placeholder="เช่น เศษส่วน"></label>
      <label class="f" style="grid-column:span 2">หมายเหตุ (ไม่บังคับ)<input type="text" id="note" maxlength="300"></label>
    </div>
    <div style="margin-top:10px"><span style="font-size:14px;font-weight:600">ชั้นที่ใช้ได้</span> <span style="font-size:12px;color:var(--muted)">(ไม่ติ๊ก = ใช้ได้ทุกชั้น)</span>
      <div class="row" id="grades" style="margin-top:6px"></div>
    </div>
    <div style="margin-top:12px;font-size:14px;font-weight:600">เก็บไฟล์ต้นฉบับ (ใบงาน + เฉลย) ไว้ที่</div>
    <label class="check" style="margin-top:6px"><input type="checkbox" id="toServer" checked> เว็บนี้ (Server) <span style="font-size:12px;color:var(--muted);font-weight:400">· เปิดดูเป็นเล่มและ OCR ได้ทันที ไม่ต้องพึ่ง Google · ใช้พื้นที่ดิสก์ของเว็บ</span></label>
    <label class="check" id="toDriveRow" style="margin-top:4px"><input type="checkbox" id="toDrive" checked> Google Drive <span style="font-size:12px;color:var(--muted);font-weight:400" id="toDriveHint">· สำรองไว้นอกเว็บ จัดโฟลเดอร์ ชั้น / วิชา / เทอม ตามที่เลือกไว้ด้านบน</span></label>
    <div id="storeNote" class="sub" style="margin:4px 0 0;font-size:12px"></div>
    <label class="check" style="margin-top:12px"><input type="checkbox" id="autoText" checked> ถอดข้อความจาก PDF ทันทีถ้ามีตัวอักษรในไฟล์ <span style="font-size:12px;color:var(--muted);font-weight:400">(PDF สแกนจะสร้างรายการไว้ก่อน แล้วค่อยกด “ถอดข้อความ / OCR” ทีหลัง · อย่ารีเฟรชหน้าก่อน ไม่งั้นต้องเลือกไฟล์ใหม่)</span></label>
    <details style="margin-top:10px"><summary style="cursor:pointer;font-weight:600;font-size:14px">หรือวาง/พิมพ์ข้อความเอง</summary>
      <label class="f" style="margin-top:8px">ชื่อเอกสาร<input type="text" id="pasteTitle" maxlength="150"></label>
      <textarea id="pasteText" rows="6" style="width:100%;margin-top:8px" placeholder="วางข้อความที่ต้องการเก็บไว้ในคลัง"></textarea>
      <textarea id="pasteKey" rows="4" style="width:100%;margin-top:8px" placeholder="วางเฉลยของข้อความด้านบน (ไม่บังคับ)"></textarea>
    </details>
    <div class="row" style="margin-top:12px">
      <button id="upBtn">อัปโหลด</button>
      <button class="ghost hidden" id="upCancel">ยกเลิกการแก้ไข</button>
      <span id="upNote" class="sub" style="margin:0"></span>
    </div>
    <div id="upErr" class="error hidden" style="margin-top:10px;white-space:pre-wrap" role="alert"></div>
  </div>

  <div class="panel row" id="usageBox" style="justify-content:space-between;gap:10px">
    <span id="usageText" class="sub" style="margin:0">กำลังตรวจพื้นที่…</span>
    <button class="ghost small hidden" id="compactBtn" title="บีบอัดข้อความของเอกสารที่อัปโหลดไว้ก่อนหน้านี้ ข้อมูลเหมือนเดิมทุกอย่าง">🗜 บีบอัดเอกสารเดิม</button>
  </div>

  <div class="libgrid">
    <div class="panel">
      <div class="row" style="justify-content:space-between"><strong>หมวดหมู่</strong></div>
      <div class="tree" id="tree" style="margin-top:8px"></div>
    </div>
    <div>
      <div class="panel">
        <div class="row" style="justify-content:space-between">
          <strong>เอกสารในคลัง <span id="docCount" style="font-weight:400;color:var(--muted)"></span></strong>
          <button class="small hidden" id="ocrAll" title="อ่านตัวอักษรจากภาพ PDF สแกนที่เก็บไว้ ทีละไฟล์ ห้ามปิดหน้านี้ระหว่างอ่าน"></button>
          <input type="search" id="q" placeholder="ค้นหาชื่อเอกสาร" style="max-width:220px">
        </div>
        <div id="docs" style="margin-top:8px;font-size:14px">กำลังโหลด…</div>
      </div>

      <div class="panel hidden" id="viewBox">
        <div class="row" style="justify-content:space-between">
          <strong id="viewTitle"></strong>
          <button class="ghost small" id="viewClose">ปิด</button>
        </div>
        <div id="viewMeta" style="margin:6px 0"></div>
        <div class="row hidden" id="viewTabs" style="margin-bottom:6px"></div>
        <div class="row hidden" id="textTools" style="margin-bottom:6px;gap:8px"></div>
        <div id="bookView" class="hidden" tabindex="0"></div>
        <div class="viewer" id="viewer"></div>
        <div class="selbar hidden" id="selbar">
          <span id="selInfo"></span>
          <input type="text" id="selTitle" placeholder="ชื่อบทอ่าน" style="max-width:240px">
          <button id="selSave">➕ เก็บเป็นบทอ่าน (ยกไปใส่ใบงานตรงตัว)</button>
        </div>
        <div style="font-size:12px;color:var(--muted);margin-top:6px">ลากเลือกข้อความในกรอบด้านบน แล้วกดปุ่มเพื่อเก็บเป็นบทอ่าน ข้อความจะถูกใส่ในใบงานตรงตามต้นฉบับทุกตัวอักษรพร้อมบรรทัดที่มา</div>
        <details style="margin-top:10px"><summary style="cursor:pointer;font-weight:600;font-size:14px">ทดลองค้นว่าระบบจะดึงท่อนไหนไปให้ AI</summary>
          <div class="row" style="margin-top:8px"><input type="text" id="trySearch" placeholder="เช่น การบวกเศษส่วน" style="flex:1"><button class="ghost small" id="tryBtn">ค้น</button></div>
          <div id="tryOut" style="font-size:13px;margin-top:8px"></div>
        </details>
      </div>

      <div class="panel">
        <strong>บทอ่านที่เก็บไว้ <span id="pasCount" style="font-weight:400;color:var(--muted)"></span></strong>
        <div id="passages" style="margin-top:8px;font-size:14px"></div>
      </div>
    </div>
  </div>
</div>
<script src="assets/js/data/curriculum.js"></script>
<script src="assets/vendor/pdf.min.js"></script>
<script src="assets/vendor/jszip.min.js"></script>
<script src="assets/js/shared/extract.js?v=<?= $v ?>"></script>
<script src="assets/js/shared/common.js?v=<?= $v ?>"></script>
<script src="assets/js/shared/gdrive.js?v=<?= $v ?>"></script>
<script>
window.LIB_KINDS = <?= json_encode(LIB_KINDS, JSON_UNESCAPED_UNICODE) ?>;
window.LIB_RIGHTS = <?= json_encode(LIB_RIGHTS, JSON_UNESCAPED_UNICODE) ?>;
</script>
<script src="assets/js/pages/library.js?v=<?= $v ?>"></script>
</body>
</html>
