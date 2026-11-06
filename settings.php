<?php
declare(strict_types=1);

require_once __DIR__ . '/src/core/core.php';
require_once __DIR__ . '/src/core/nav.php';

if (!is_authed()) {
    header('Location: index.php');
    exit;
}
$v = max(@filemtime(__DIR__ . '/assets/js/pages/settings.js') ?: 1, @filemtime(__DIR__ . '/assets/js/shared/common.js') ?: 1, @filemtime(__DIR__ . '/assets/js/shared/gdrive.js') ?: 1, @filemtime(__DIR__ . '/assets/css/style.css') ?: 1);
?><!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ตั้งค่า AI</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Mali:wght@400;600;700&family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/css/style.css?v=<?= $v ?>">
<style>
.skey{display:grid;grid-template-columns:150px 1fr 1fr;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid var(--line)}
.skey:last-child{border-bottom:0}
.sfeat{border:1px solid var(--line);border-radius:12px;padding:10px 12px;margin:10px 0;background:#fff}
.sfeat h4{margin:0 0 2px;font-size:15px}
.sfeat .d{font-size:12px;color:var(--muted);margin-bottom:8px}
.sgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px}
.sgrid label{font-size:12px;color:#555;display:flex;flex-direction:column;gap:3px}
.sgrid input,.sgrid select{font-size:13px;padding:6px 8px;width:100%;box-sizing:border-box}
.seff{font-size:12px;margin-top:6px;color:#444}
.seff b{color:#222}
.gdot{width:10px;height:10px;border-radius:50%;background:#c4c9d4;flex:none}.gdot.on{background:#1e8e3e}
.gsetup{margin-top:10px;border-top:1px solid var(--line);padding-top:10px}.gsetup ol{margin:0 0 8px 18px;padding:0;font-size:13px;line-height:1.7}
.sok{color:#1b7f3a}.sbad{color:#c0392b}
@media(max-width:700px){.skey{grid-template-columns:1fr}}
</style>
<?php if (($_GET['embed'] ?? '') === 'gdrive'): ?>
<style>body{background:#fff}.app{margin:0!important;padding:16px!important;max-width:none!important}.app>*{display:none!important}.app>#gdrive,.app>#jserr{display:block!important}#gdrive{border:0!important;box-shadow:none!important;padding:0!important}</style>
<?php endif; ?>
</head>
<body>
<div class="app">
  <div id="jserr" class="error hidden"></div>
  <?= nav_html('settings') ?>
  <h1>ตั้งค่า AI</h1>
  <p class="sub">ใส่คีย์ และเลือกผู้ให้บริการ/โมเดลของแต่ละเมนูได้ที่นี่ ไม่ต้องแก้ไฟล์ config.php ค่าที่ตั้งที่นี่จะถูกใช้ก่อนค่าใน config.php และก่อนตัวเลือกในหน้าสร้างใบงาน เมนูที่ไม่ได้ตั้งเอง ใช้ “ค่าเริ่มต้น” ด้านล่าง</p>

  <div class="panel">
    <strong>1. API key</strong>
    <p class="sub" style="margin:4px 0 8px">คีย์เก็บไว้ในโฟลเดอร์ data ของเครื่องนี้ (เว็บเปิดอ่านไม่ได้) หน้านี้ไม่แสดงคีย์เต็มอีก เว้นช่องว่างไว้ = ไม่เปลี่ยน</p>
    <div id="keys">กำลังโหลด…</div>
  </div>

  <div class="panel">
    <strong>2. ค่าเริ่มต้น (ใช้กับทุกเมนูที่ไม่ได้ตั้งเอง)</strong>
    <div class="sfeat" id="defBox"></div>
    <div class="row" style="gap:6px;flex-wrap:wrap;margin-top:6px">
      <span class="sub" style="margin:0">นำเข้ารายชื่อโมเดลจากบริการ (ไว้เลือกในช่องโมเดล พิมพ์เองได้เสมอ):</span>
      <button class="ghost small" data-load="gemini">Gemini</button>
      <button class="ghost small" data-load="openai">OpenAI</button>
      <button class="ghost small" data-load="openrouter">OpenRouter</button>
      <span id="loadNote" class="sub" style="margin:0"></span>
    </div>
  </div>

  <div class="panel">
    <strong>3. ตั้งแยกตามเมนู</strong>
    <p class="sub" style="margin:4px 0 0">เว้น “ผู้ให้บริการ” เป็น “ตามค่าเริ่มต้น” ได้ ถ้าอยากเปลี่ยนแค่โมเดล เช่น งานข้อสอบใช้โมเดลที่เก่งกว่า งานแผนภาคเรียนใช้โมเดลถูกๆ</p>
    <div id="feats"></div>
  </div>

  <div class="panel" id="gdrive">
    <strong>4. Google Drive (เก็บไฟล์ต้นฉบับของคลังเอกสารอ้างอิง)</strong>
    <p class="sub" style="margin:4px 0 8px">ไฟล์ PDF ใบงาน/เฉลยที่ครูอัปโหลดในคลังเอกสาร จะถูกส่งไปเก็บใน Google Drive ของบัญชีโรงเรียน แทนการเก็บบน Server ครูไม่ต้องล็อกอิน Google ตั้งค่าครั้งเดียวตามขั้นตอนนี้ (ไม่ต้องเข้า Google Cloud Console)</p>
    <div class="row" style="gap:10px;flex-wrap:wrap;align-items:center">
      <span class="gdot" id="driveDot"></span>
      <span id="driveText" style="flex:1;min-width:200px;font-size:13px">กำลังตรวจ…</span>
      <a class="btnlink small hidden" id="driveFolder" target="_blank" rel="noopener">เปิดโฟลเดอร์ใน Drive ↗</a>
      <button class="ghost small hidden" id="drivePing">ทดสอบการเชื่อมต่อ</button>
      <button class="small hidden" id="driveTest" title="อัปโหลดไฟล์เล็กๆ เข้า Drive จริง แล้วแสดงผลทีละขั้น">ทดสอบอัปโหลดจริง</button>
    </div>
    <div id="driveTestRes" class="gsetup hidden" style="font-size:13px"></div>
    <div id="driveSetup" class="gsetup hidden">
      <ol>
        <li>เปิด <a href="https://script.google.com/home/projects/create" target="_blank" rel="noopener">script.google.com → โปรเจกต์ใหม่</a> (ล็อกอินบัญชีที่จะเก็บไฟล์ของทุกคน)</li>
        <li>ลบโค้ดเดิมในหน้านั้นทั้งหมด แล้ววางโค้ดนี้ <button class="small" id="driveCopy" type="button">คัดลอกโค้ด</button> แล้วกดไอคอนบันทึก 💾</li>
        <li>เลือกฟังก์ชัน <b>authorize</b> ในแถบด้านบน แล้วกด <b>Run</b> → อนุญาตสิทธิ์ Drive และ Calendar (ทำทุกครั้งที่ได้โค้ดรุ่นใหม่)</li>
        <li>กด <b>Deploy</b> (มุมขวาบน) → <b>New deployment</b> → กดรูปเฟือง ⚙ เลือก <b>Web app</b> → ตั้ง <b>Execute as: Me</b> และ <b>Who has access: Anyone</b> → กด <b>Deploy</b></li>
        <li>กด <b>Authorize access</b> → เลือกบัญชี → ถ้าขึ้น “Google hasn’t verified this app” ให้กด <b>Advanced</b> → <b>Go to … (unsafe)</b> → <b>Allow</b> (เป็นสคริปต์ของคุณเอง)</li>
        <li>คัดลอก <b>Web app URL</b> (ลงท้ายด้วย /exec) มาวางด้านล่าง แล้วกดบันทึก ระบบจะทดสอบให้ทันที</li>
      </ol>
      <textarea id="driveCode" rows="3" readonly style="width:100%;font-family:monospace;font-size:11px" aria-label="โค้ด Apps Script"></textarea>
      <div class="row" style="margin-top:6px"><input type="url" id="driveUrlCfg" placeholder="https://script.google.com/macros/s/…/exec" style="flex:1;min-width:260px"><button class="small" id="driveCfgSave">บันทึกและทดสอบ</button></div>
      <div class="sub" style="font-size:12px;margin-top:6px">ไฟล์ทั้งหมดเก็บใน Drive ของบัญชีนี้ จัดโฟลเดอร์ให้เองเป็น <b>คลังเอกสาร / ชั้น / วิชา / เทอม</b> (เช่น ป.1 / ภาษาอังกฤษ / เทอม 1) ตั้งเป็น “ทุกคนที่มีลิงก์ดูได้” เพื่อเปิดดูเป็นเล่ม · ไฟล์ส่งจากเครื่องครูไป Google ตรง ไม่ผ่าน Server · ย้ายเว็บแล้วใช้ลิงก์เดิมได้เลย · ถ้าแก้โค้ดสคริปต์ภายหลัง ต้อง Deploy → Manage deployments → New version</div>
      <div style="margin-top:12px;padding-top:10px;border-top:1px solid #eee">
        <strong style="font-size:13px">Google Calendar (ปฏิทินและตารางสอนของ LMS)</strong>
        <p class="sub" style="font-size:12px;margin:4px 0 6px">วิดีโอบันทึกคาบจาก Google Meet (ต้องเป็น Google Workspace ที่อัดได้ และคาบต้องสร้างด้วยบัญชีเดียวกับที่ติดตั้งสคริปต์) ระบบดึงมาผูกกับคาบให้เอง · จัดตารางสอนใน Google Calendar แล้วระบบดึงเข้า LMS เอง ใช้สคริปต์ตัวเดียวกับข้างบน (ต้องเป็นรุ่น 6 ขึ้นไป) · ตั้งชื่อกิจกรรมขึ้นต้นด้วยชื่อคอร์ส · เชิญอีเมลครูเป็นผู้เข้าร่วม หรือใส่ชื่อเล่นครูในชื่อกิจกรรม</p>
        <div class="row"><input type="text" id="calId" placeholder="Calendar ID เช่น xxxx@group.calendar.google.com (เว้นว่าง = primary)" style="flex:1;min-width:260px"><button class="small" id="calSave">บันทึก</button></div>
        <div class="sub" style="font-size:12px;margin-top:6px" id="calNote"></div>
      </div>
    </div>
    <div class="row" style="margin-top:8px"><button class="ghost small hidden" id="driveEdit">เปลี่ยนลิงก์ / ตั้งค่าใหม่</button><button class="ghost small hidden" id="driveClear">ยกเลิกการเชื่อมต่อ</button></div>
  </div>

  <div class="row" style="position:sticky;bottom:0;background:#fff;padding:10px 0;border-top:1px solid #eee">
    <button id="save">บันทึกการตั้งค่า</button><span id="saveNote" class="sub" style="margin:0"></span>
  </div>
</div>
<datalist id="dl-gemini-text"></datalist><datalist id="dl-gemini-image"></datalist>
<datalist id="dl-openai-text"></datalist><datalist id="dl-openai-image"></datalist>
<datalist id="dl-openrouter-text"></datalist><datalist id="dl-openrouter-image"></datalist>
<script src="assets/js/shared/common.js?v=<?= $v ?>"></script>
<script src="assets/js/shared/gdrive.js?v=<?= $v ?>"></script>
<script src="assets/js/pages/settings.js?v=<?= $v ?>"></script>
</body>
</html>
