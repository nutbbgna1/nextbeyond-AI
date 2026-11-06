<?php
declare(strict_types=1);

require_once __DIR__ . '/src/core/core.php';
require_once __DIR__ . '/src/ai/ai.php';
require_once __DIR__ . '/src/core/nav.php';

if (!is_authed()) { // ยังไม่ได้ล็อกอิน: ไปหน้าแรกเพื่อใส่รหัสผ่านก่อน
    header('Location: index.php');
    exit;
}
$provOpts = [];
foreach (PROVIDERS as $p) {
    $provOpts[] = ['id' => $p, 'label' => PROVIDER_LABEL[$p], 'ready' => provider_has_key($p)];
}
$defText  = resolve_provider('text', null);
$defImage = resolve_provider('image', null);
$types = [];
foreach (SHEET_TYPES as $t) {
    $types[] = ['id' => $t, 'label' => SHEET_TYPE_LABEL[$t]];
}
$v = max(@filemtime(__DIR__ . '/assets/js/pages/book.js') ?: 1, @filemtime(__DIR__ . '/assets/js/shared/render.js') ?: 1, @filemtime(__DIR__ . '/assets/css/style.css') ?: 1);
$orm = cfg()['openrouter_models'] ?? [];
?><!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>รวมใบงานเป็นเล่ม</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Mali:wght@400;600;700&family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/css/style.css?v=<?= $v ?>">
<link rel="stylesheet" href="assets/css/book.css?v=<?= $v ?>">
<link rel="stylesheet" href="assets/vendor/katex/katex.min.css">
</head>
<body>
<div class="app">
  <div id="jserr" class="error hidden"></div>
  <div class="no-print">
    <?= nav_html('book') ?>
    <div class="row" style="justify-content:space-between">
      <h1>รวมใบงานเป็นเล่ม</h1>
    </div>
    <p class="sub">เลือกใบงานจากชุดที่บันทึกไว้ จัดลำดับ แล้วให้ AI ช่วยทำหน้าปก คำนำ และสารบัญ พร้อมเลขหน้า</p>

    <div class="panel">
      <strong>1) เลือกใบงานจากคลังใบงาน</strong>
      <div class="row" style="margin-top:8px">
        <input type="search" id="srcQ" placeholder="ค้นหาชื่อ/หัวข้อ" style="flex:1;min-width:160px">
        <select id="srcGrade"><option value="">ทุกชั้น</option></select>
        <select id="srcSubject"><option value="">ทุกวิชา</option></select>
        <select id="srcTerm"><option value="">ทุกภาคเรียน</option><option value="1">ภาคเรียนที่ 1</option><option value="2">ภาคเรียนที่ 2</option></select>
        <select id="srcStatus"><option value="">ทุกสถานะ</option></select>
      </div>
      <div id="srcList" style="margin-top:10px;font-size:14px">กำลังโหลด…</div>
      <div style="font-size:12px;color:var(--muted);margin-top:6px">กด “เลือกใบ” เพื่อติ๊กเฉพาะบางใบ หรือกด “เพิ่มทั้งชุด” ใบงานจะถูกคัดลอกเข้าเล่ม (ชุดต้นทางไม่ถูกแก้ไข)</div>
    </div>

    <div class="panel">
      <div class="row" style="justify-content:space-between">
        <strong>2) ใบงานในเล่ม <span id="entryCount" style="font-weight:400;color:var(--muted)"></span></strong>
        <span class="row">
          <label style="font-size:13px;font-weight:400;display:flex;gap:6px;align-items:center"><input type="checkbox" id="incLes" checked> ใส่ใบความรู้ก่อนใบงาน (ถ้ามี)</label>
          <label style="font-size:13px;font-weight:400;display:flex;gap:6px;align-items:center"><input type="checkbox" id="incAns" checked> ใส่ส่วนเฉลยท้ายเล่ม</label>
        </span>
      </div>
      <div id="entries" style="margin-top:8px"></div>
      <div id="covBox" class="hidden" style="margin-top:10px;font-size:13px"></div>
      <datalist id="chapterList"></datalist>
      <div style="font-size:12px;color:var(--muted);margin-top:6px">ช่อง “หมวด” ใช้จัดกลุ่มในสารบัญ (ใบที่ติดกันและมีชื่อหมวดเดียวกันจะรวมเป็นหมวดเดียว) ปล่อยว่างได้</div>
    </div>

    <div class="panel">
      <strong>3) ปก คำนำ และสารบัญ</strong>
      <div class="grid" style="margin-top:10px">
        <label class="f">AI สร้างข้อความ
          <select id="textProvider">
            <?php foreach ($provOpts as $o): ?>
              <option value="<?= $o['id'] ?>"<?= $o['id'] === $defText ? ' selected' : '' ?><?= $o['ready'] ? '' : ' disabled' ?>><?= htmlspecialchars($o['label']) ?><?= $o['ready'] ? '' : ' (ยังไม่ได้ใส่ API key)' ?></option>
            <?php endforeach; ?>
          </select>
        </label>
        <label class="f">AI สร้างภาพปก
          <select id="imageProvider">
            <?php foreach ($provOpts as $o): ?>
              <option value="<?= $o['id'] ?>"<?= $o['id'] === $defImage ? ' selected' : '' ?><?= $o['ready'] ? '' : ' disabled' ?>><?= htmlspecialchars($o['label']) ?><?= $o['ready'] ? '' : ' (ยังไม่ได้ใส่ API key)' ?></option>
            <?php endforeach; ?>
          </select>
        </label>
      </div>
      <div id="orBox" class="orbox hidden">
        <div class="grid">
          <label class="f">โมเดล OpenRouter สร้างข้อความ
            <input type="text" id="orText" autocomplete="off" value="<?= htmlspecialchars((string) ($orm['text'] ?? '')) ?>">
          </label>
          <label class="f">โมเดล OpenRouter สร้างภาพ
            <input type="text" id="orImage" autocomplete="off" value="<?= htmlspecialchars((string) ($orm['image'] ?? '')) ?>">
          </label>
        </div>
        <div style="font-size:12px;color:var(--muted);margin-top:6px">นำเข้า/ค้นหารายชื่อโมเดลได้ที่หน้าสร้างใบงาน ที่นี่พิมพ์ชื่อโมเดล (เช่น google/gemini-2.5-flash) ได้โดยตรง</div>
      </div>

      <div class="row" style="margin-top:14px">
        <input type="text" id="aiHint" placeholder="ข้อเสนอแนะให้ AI (ไม่บังคับ) เช่น ภาษาสนุกสนาน ธีมสัตว์" style="flex:1;min-width:240px">
        <button id="aiBtn">✨ ให้ AI ทำปก คำนำ สารบัญ</button>
      </div>
      <div id="aiNote" style="font-size:13px;min-height:1.2em;margin-top:6px"></div>

      <div class="grid" style="margin-top:12px">
        <label class="f">ชื่อเล่ม<input type="text" id="cTitle" maxlength="80"></label>
        <label class="f">ชื่อรอง<input type="text" id="cSub" maxlength="120"></label>
        <label class="f">คำขวัญบนปก<input type="text" id="cTag" maxlength="160"></label>
        <label class="f">ชั้น / วิชา (แสดงบนปก)<input type="text" id="cClass" maxlength="120"></label>
        <label class="f">โรงเรียน / ผู้จัดทำ (ไม่บังคับ)<input type="text" id="cAuthor" maxlength="120"></label>
      </div>
      <label class="f" style="margin-top:12px">คำนำ (ขึ้นย่อหน้าใหม่ด้วยการกด Enter)
        <textarea id="cPreface" rows="5" maxlength="1800"></textarea>
      </label>
      <div class="row" style="margin-top:12px;align-items:flex-end">
        <label class="f" style="flex:1;min-width:240px">คำบรรยายภาพปก (ภาษาอังกฤษ)
          <input type="text" id="cImgPrompt" maxlength="250" placeholder="เช่น a happy child planting a seed">
        </label>
        <button id="coverImgBtn" class="ghost">สร้างภาพปก</button>
        <button id="coverImgClear" class="ghost">ไม่ใช้ภาพปก</button>
      </div>
    </div>

    <div class="panel" id="booksBox">
      <details>
        <summary style="cursor:pointer;font-weight:600">เล่มที่บันทึกไว้ <span id="bookCount" style="font-weight:400;color:var(--muted)"></span></summary>
        <div id="bookList" style="margin-top:10px;font-size:14px">กำลังโหลด…</div>
      </details>
    </div>

    <div id="error" class="error hidden"></div>

    <div id="toolbar" class="panel hidden">
      <div class="row" style="justify-content:space-between">
        <strong id="pageInfo"></strong>
        <div class="row">
          <button id="newBook" class="ghost small">เริ่มเล่มใหม่</button>
          <button id="saveBtn" class="ghost">บันทึกเล่ม</button>
          <button id="printBtn">พิมพ์ / บันทึกเป็น PDF</button>
        </div>
      </div>
      <div id="saveNote" style="font-size:13px;color:var(--muted);margin-top:6px"></div>
      <div style="font-size:13px;color:var(--muted)">ในหน้าต่างพิมพ์ให้เลือก “บันทึกเป็น PDF” ขนาด A4 ขอบ “ไม่มี” และติ๊ก “กราฟิกพื้นหลัง”</div>
    </div>
  </div>

  <div class="pages" id="pages"></div>
</div>
<script>window.SHEET_TYPES = <?= json_encode($types, JSON_UNESCAPED_UNICODE) ?>;</script>
<script>
window.addEventListener('error', function (e) {
  var b = document.getElementById('jserr');
  if (!b) return;
  var t = e.target || {};
  var u = t.src || t.href || '';
  if (u && u.indexOf(location.origin) !== 0) return;
  b.classList.remove('hidden');
  b.textContent = (t.src || t.href)
    ? 'โหลดไฟล์ไม่สำเร็จ: ' + (t.src || t.href) + ' (ตรวจสิทธิ์อ่านไฟล์ใน htdocs)'
    : 'เกิดข้อผิดพลาดของหน้าเว็บ: ' + e.message + ' (' + String(e.filename || '').split('/').pop() + ':' + (e.lineno || '') + ')';
}, true);
</script>
<script src="assets/vendor/katex/katex.min.js"></script>
<script src="assets/vendor/katex/auto-render.min.js"></script>
<script src="assets/js/shared/render.js?v=<?= $v ?>"></script>
<script src="assets/js/pages/book.js?v=<?= $v ?>"></script>
</body>
</html>
