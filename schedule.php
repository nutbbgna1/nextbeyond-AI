<?php
declare(strict_types=1);

require_once __DIR__ . '/src/core/core.php';
require_once __DIR__ . '/src/core/nav.php';

if (!is_authed()) {
    header('Location: index.php');
    exit;
}
$v = max(@filemtime(__DIR__ . '/assets/js/pages/schedule.js') ?: 1, @filemtime(__DIR__ . '/assets/js/shared/common.js') ?: 1, @filemtime(__DIR__ . '/assets/css/style.css') ?: 1);
?><!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>จัดตารางสอนด้วย AI</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Mali:wght@400;600;700&family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/css/style.css?v=<?= $v ?>">
<style>
.stbl{width:100%;border-collapse:collapse;font-size:14px}.stbl th,.stbl td{padding:6px 8px;border-bottom:1px solid var(--line);text-align:left;vertical-align:middle}
.stbl input[type=number],.stbl select,.stbl input[type=time]{padding:5px 7px;font-size:13px;width:auto}
.dchips{display:flex;flex-wrap:wrap;gap:6px}.dchips label{display:flex;align-items:center;gap:5px;font-size:14px;border:1px solid var(--line);border-radius:99px;padding:4px 12px;background:#fff;cursor:pointer}
.tav{border:1px solid var(--line);border-radius:12px;padding:10px 12px;margin:8px 0;background:#fff}.tav h4{margin:0 0 6px;font-size:14px}
.tav .d{display:flex;align-items:center;gap:8px;margin:4px 0;font-size:13px}.tav .d input[type=time]{padding:4px 6px;font-size:13px}
.iss{font-size:13px;color:#8a5a00;background:#fff8e6;border:1px solid #f0d9a0;border-radius:8px;padding:6px 10px;margin:4px 0}
.iss.bad{color:#8f2a24;background:#fdf0ef;border-color:#efc1bd}
.ok{color:#1b7f3a;background:#effaf2;border:1px solid #bfe5c9;border-radius:8px;padding:8px 12px;margin:8px 0;font-size:14px}
</style>
</head>
<body>
<div class="app">
  <div id="jserr" class="error hidden"></div>
  <?= nav_html('settings') ?>
  <h1>จัดตารางสอนด้วย AI</h1>
  <p class="sub">เลือกคอร์สและเงื่อนไข ให้ AI เสนอตารางรายสัปดาห์ โค้ดตรวจไม่ให้ครูสอนซ้อนหรือชนกับคาบที่มีอยู่ แล้วค่อยกดยืนยันเพื่อสร้างลง Google Calendar พร้อมห้อง Meet และเชิญครู <a href="../calendar">← กลับหน้าปฏิทิน</a></p>

  <div id="notReady" class="error hidden"></div>

  <div class="panel">
    <strong>1. คอร์สที่ต้องจัด</strong>
    <p class="sub" style="margin:4px 0 8px">ครูผู้สอนดึงจากคอร์ส (ตั้งครูที่หน้าคอร์สก่อน)</p>
    <table class="stbl"><thead><tr><th></th><th>คอร์ส</th><th>ครู</th><th>คาบ/สัปดาห์</th><th>นาที/คาบ</th></tr></thead><tbody id="courses"><tr><td colspan="5">กำลังโหลด…</td></tr></tbody></table>
  </div>

  <div class="panel">
    <strong>2. เงื่อนไข</strong>
    <div class="grid" style="margin-top:8px">
      <label class="f">เริ่มตั้งแต่วันที่<input type="date" id="startDate"></label>
      <label class="f">ถึงวันที่<input type="date" id="endDate"></label>
      <label class="f">เปิดสอนตั้งแต่<input type="time" id="dayStart" value="09:00"></label>
      <label class="f">ถึง<input type="time" id="dayEnd" value="17:00"></label>
    </div>
    <div style="margin-top:10px;font-size:14px">วันที่เปิดสอน</div>
    <div class="dchips" id="days"></div>
    <div style="margin-top:12px;font-size:14px">อีเมลครู และเวลาที่ครูว่าง <span class="sub" style="font-size:12px">(ใส่อีเมล Google ของครูเพื่อเชิญเข้า Calendar/Meet · ติ๊กวัน+ปรับเวลาที่ว่าง ถ้าไม่ติ๊กวันไหน = ไม่ว่างวันนั้น)</span></div>
    <div id="avail"></div>
    <label class="f" style="margin-top:10px">ข้อกำหนดเพิ่มเติม (ไม่บังคับ) เช่น “คณิตอยู่ช่วงเช้า” “ครูมายด์ไม่สอนติดกันเกิน 2 คาบ”
      <input type="text" id="note" maxlength="500"></label>
    <div class="row" style="margin-top:12px">
      <label style="display:flex;gap:6px;align-items:center;font-size:14px"><input type="checkbox" id="useAi" checked> ใช้ AI (Gemini) ช่วยจัด</label>
      <button id="draft">ร่างตาราง</button><span id="draftNote" class="sub" style="margin:0"></span>
    </div>
  </div>

  <div class="panel hidden" id="resBox">
    <strong>3. ตารางที่เสนอ (ใช้ซ้ำทุกสัปดาห์)</strong>
    <div id="summary" class="sub" style="margin:4px 0"></div>
    <div id="issues"></div>
    <table class="stbl"><thead><tr><th>คอร์ส</th><th>ครู</th><th>วัน</th><th>เริ่ม</th><th>จบ</th><th></th></tr></thead><tbody id="slots"></tbody></table>
    <div class="row" style="margin-top:12px">
      <button class="ghost" id="check">ตรวจอีกครั้ง (หลังแก้เอง)</button>
      <button class="ghost" id="redo">จัดใหม่</button>
      <label style="display:flex;gap:6px;align-items:center;font-size:14px"><input type="checkbox" id="invite" checked> ส่งอีเมลเชิญครูจาก Google</label>
      <button id="commit">✓ ยืนยัน สร้างใน Google Calendar</button>
    </div>
    <div id="done"></div>
  </div>
</div>
<script src="assets/js/shared/common.js?v=<?= $v ?>"></script>
<script src="assets/js/pages/schedule.js?v=<?= $v ?>"></script>
</body>
</html>
