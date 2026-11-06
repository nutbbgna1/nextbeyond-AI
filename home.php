<?php
declare(strict_types=1);

require_once __DIR__ . '/src/core/core.php';
require_once __DIR__ . '/src/core/nav.php';
require_once __DIR__ . '/src/core/health.php';

if (!is_authed()) {
    header('Location: index.php');
    exit;
}
$report = health_report();
$counts = health_counts();
$blocking = array_filter($report, fn($r) => $r['level'] === 'bad');
$v = @filemtime(__DIR__ . '/assets/css/style.css') ?: 1;
$ic = ['ok' => '✅', 'warn' => '💡', 'bad' => '❌'];
?><!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>เริ่มต้นใช้งาน</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Mali:wght@400;600;700&family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/css/style.css?v=<?= $v ?>">
</head>
<body>
<div class="app">
  <?= nav_html('home') ?>
  <h1>เริ่มต้นใช้งาน</h1>
  <p class="sub">เครื่องมือช่วยครูวางแผนการสอนและสร้างใบงานตามหลักสูตรแกนกลางฯ โดยให้ <b>แผนการจัดการเรียนรู้</b> เป็นแกนหลัก แล้วสร้างใบงาน ใบความรู้ และเฉลยให้สอดคล้องกับแผนนั้น</p>

  <?php if ($blocking): ?>
  <div class="error"><b>ต้องแก้ก่อนใช้งาน:</b> <?= htmlspecialchars(implode(' · ', array_column($blocking, 'title'))) ?> — ดูวิธีแก้ที่ “เช็กความพร้อม” ด้านล่าง</div>
  <?php endif; ?>

  <div class="panel">
    <strong>ขั้นตอนที่แนะนำ</strong>
    <div class="steps">
      <a class="stepcard" href="term.php"><span class="no">1</span><b>แผนภาคเรียน</b><span>ให้ AI ร่างหัวข้อรายสัปดาห์ทั้งภาคเรียน ผูกตัวชี้วัด (ข้ามได้ถ้าวางแผนเองแล้ว)</span><em>บันทึกแล้ว <?= $counts['terms'] ?> แผน</em></a>
      <a class="stepcard" href="lplan.php"><span class="no">2</span><b>แผนการสอน</b><span>เลือกเรื่องที่จะสอน ให้ AI ร่างแผนการจัดการเรียนรู้ ครูตรวจแก้ พิมพ์/Word ได้</span><em>บันทึกแล้ว <?= $counts['lplans'] ?> แผน</em></a>
      <a class="stepcard" href="index.php"><span class="no">3</span><b>สร้างใบงาน</b><span>กด “สร้างใบงานตามแผน” จากข้อ 2 หรือสร้างเองจากหัวข้อก็ได้ ได้ใบงาน เฉลย ใบความรู้ พิมพ์เป็น PDF</span><em>เปิดหน้าสร้างใบงาน</em></a>
      <a class="stepcard" href="book.php"><span class="no">4</span><b>รวมเล่ม</b><span>รวมใบงานหลายชุดเป็นเล่มเดียว มีปก คำนำ สารบัญ และเฉลยท้ายเล่ม</span><em>รวมเล่ม</em></a>
      <a class="stepcard" href="exam.php"><span class="no">5</span><b>ข้อสอบ</b><span>สร้างข้อสอบกลางภาค/ปลายภาค มีตารางวิเคราะห์ สลับข้อหลายชุด กระดาษคำตอบ และเฉลย</span><em>บันทึกแล้ว <?= $counts['exams'] ?> ฉบับ</em></a>
    </div>
    <p style="font-size:13px;color:var(--muted);margin:10px 0 0">ไม่ต้องทำครบทุกขั้น เริ่มจากขั้นไหนก็ได้ เช่น ถ้ามีแผนการสอนของตัวเองแล้ว ข้ามไปขั้น 3 ได้เลย</p>
  </div>

  <div class="panel">
    <strong>คลังของคุณ</strong>
    <div class="steps" style="margin-top:8px">
      <a class="stepcard" href="saved.php"><b>🗂 คลังใบงาน</b><span>ชุดใบงานที่สร้างไว้ จัดหมวด ค้นหา ส่งออก zip</span><em><?= $counts['saved'] ?> ชุด</em></a>
      <a class="stepcard" href="bank.php"><b>🧩 คลังข้อสอบ</b><span>เก็บโจทย์รายข้อ แล้วเลือกมาประกอบเป็นชุดใหม่</span><em><?= $counts['bank'] ?> ข้อ</em></a>
      <a class="stepcard" href="library.php"><b>📚 คลังเอกสาร</b><span>อัปโหลดหนังสือเรียน/บทอ่านให้ AI ใช้อ้างอิง</span><em><?= $counts['library'] ?> เอกสาร</em></a>
      <a class="stepcard" href="settings.php"><b>⚙️ ตั้งค่า AI</b><span>ใส่คีย์ และเลือกผู้ให้บริการ/โมเดลของแต่ละเมนู</span><em>ตั้งค่า</em></a>
      <a class="stepcard" href="curriculum.php"><b>🎯 ตัวชี้วัด</b><span>นำเข้าตัวชี้วัดจากไฟล์หลักสูตรทางการ</span><em>จัดการตัวชี้วัด</em></a>
    </div>
  </div>

  <div class="panel">
    <strong>เช็กความพร้อมของระบบ</strong>
    <div style="margin-top:6px">
      <?php foreach ($report as $r): ?>
        <div class="chk"><span class="ic"><?= $ic[$r['level']] ?></span><div>
          <div><b><?= htmlspecialchars($r['title']) ?></b><?= $r['link'] ? ' <a href="' . htmlspecialchars($r['link'][0]) . '">' . htmlspecialchars($r['link'][1]) . ' →</a>' : '' ?></div>
          <?php if ($r['detail'] !== ''): ?><small><?= htmlspecialchars($r['detail']) ?></small><?php endif; ?>
          <?php if ($r['cmd']): ?><code class="cmd"><?= htmlspecialchars($r['cmd']) ?></code><?php endif; ?>
        </div></div>
      <?php endforeach; ?>
    </div>
    <p style="font-size:13px;color:var(--muted);margin:8px 0 0">รายละเอียดเพิ่มเติม: <a href="check_setup.php" style="color:var(--pink)">🩺 ตรวจระบบ</a></p>
  </div>

  <div class="panel" style="font-size:14px">
    <strong>ข้อควรรู้</strong>
    <ul style="margin:6px 0 0;padding-left:20px;line-height:1.7">
      <li>เนื้อหาที่ AI สร้างเป็นร่างช่วยครู ควรตรวจทานทุกครั้งก่อนใช้สอน (เฉลย ตัวเลข ข้อเท็จจริง)</li>
      <li>ระบบอ้างอิงหลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน ไม่ใช่เอกสารที่ผ่านการรับรองจากหน่วยงานใด</li>
      <li>ข้อมูลทั้งหมดเก็บในเครื่องของคุณ (โฟลเดอร์ data) สำรองได้ด้วยปุ่มส่งออก zip ในคลังใบงาน</li>
    </ul>
  </div>
</div>
</body>
</html>
