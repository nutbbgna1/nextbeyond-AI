<?php
declare(strict_types=1);

require_once __DIR__ . '/src/core/core.php';
require_once __DIR__ . '/src/ai/ai.php';
require_once __DIR__ . '/src/core/nav.php';
require_once __DIR__ . '/src/worksheet/difficulty.php';

$loginError = '';
if (password_required()) {
    session_boot();
    if (($_GET['logout'] ?? '') === '1') {
        $_SESSION = [];
        session_destroy();
        header('Location: index.php');
        exit;
    }
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['password'])) {
        if (hash_equals((string) cfg()['app_password'], (string) $_POST['password'])) {
            session_regenerate_id(true);
            $_SESSION['ok'] = true;
            header('Location: index.php');
            exit;
        }
        sleep(1); // หน่วงเล็กน้อยกันการเดารหัสรัวๆ
        $loginError = 'รหัสผ่านไม่ถูกต้อง';
    }
    $authed = !empty($_SESSION['ok']);
    session_write_close();
} else {
    $authed = true;
}

$types = [];
foreach (SHEET_TYPES as $t) {
    $types[] = ['id' => $t, 'label' => SHEET_TYPE_LABEL[$t]];
}
$provOpts = [];
foreach (PROVIDERS as $p) {
    $provOpts[] = ['id' => $p, 'label' => PROVIDER_LABEL[$p], 'ready' => provider_has_key($p)];
}
$defText  = resolve_provider('text', null);
$defImage = resolve_provider('image', null);
$v = max(@filemtime(__DIR__ . '/assets/js/pages/app.js') ?: 1, @filemtime(__DIR__ . '/assets/js/shared/render.js') ?: 1, @filemtime(__DIR__ . '/assets/css/style.css') ?: 1);
?><!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ตัวสร้างใบงานด้วย AI</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Mali:wght@400;600;700&family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/css/style.css?v=<?= $v ?>">
<link rel="stylesheet" href="assets/vendor/katex/katex.min.css">
</head>
<body>
<?php if (!$authed): ?>
  <div class="login">
    <div class="panel">
      <h1 style="margin-top:0">ผู้ช่วยครู AI</h1>
      <p class="sub">กรุณาใส่รหัสผ่านเพื่อเข้าใช้งาน</p>
      <?php if ($loginError): ?><div class="error"><?= htmlspecialchars($loginError) ?></div><?php endif; ?>
      <form method="post">
        <input type="password" name="password" placeholder="รหัสผ่าน" autofocus required>
        <button type="submit">เข้าสู่ระบบ</button>
      </form>
    </div>
  </div>
<?php else: ?>
<div class="app">
  <div id="jserr" class="error hidden"></div>
  <div class="no-print">
    <?= nav_html('index') ?>
    <div class="row" style="justify-content:space-between">
      <h1>สร้างใบงาน</h1>
      <?php if (password_required()): ?><a href="?logout=1" class="sub" style="text-decoration:none">ออกจากระบบ</a><?php endif; ?>
    </div>
    <p class="sub">บอกเรื่องที่จะสอน เลือกจำนวนใบและรูปแบบโจทย์ แล้วกดสร้าง จะได้ใบงาน เฉลย และภาพประกอบพร้อมพิมพ์เป็น PDF</p>

    <div class="panel form">
      <section class="sec">
        <h2 class="sec-h"><span class="no">1</span>เรื่องที่จะสอน</h2>
        <div class="grid">
        <label class="f">ชั้น
          <select id="grade">
            <?php foreach (['ป.1','ป.2','ป.3','ป.4','ป.5','ป.6','ม.1','ม.2','ม.3','ม.4','ม.5','ม.6'] as $g): ?>
              <option<?= $g === 'ป.2' ? ' selected' : '' ?>><?= $g ?></option>
            <?php endforeach; ?>
          </select>
        </label>
        <label class="f">วิชา
          <select id="subject"><option selected>วิทยาศาสตร์และเทคโนโลยี</option></select>
        </label>
        <label class="f">ภาคเรียน
          <select id="termSel"><option value="">ทุกภาคเรียน</option><option value="1">ภาคเรียนที่ 1</option><option value="2">ภาคเรียนที่ 2</option></select>
        </label>
        </div>
        <div class="grid" style="margin-top:16px">
        <label class="f">หน่วยการเรียนรู้
          <select id="unit"><option value="">— เลือกหน่วยการเรียนรู้ —</option></select>
        </label>
        <label class="f">หัวข้อของใบงาน
          <input type="text" id="topic" value="วัฏจักรของพืช">
        </label>
        <div id="lpBar" class="hidden lpbar" style="grid-column:1/-1">📝 สร้างตามแผนการจัดการเรียนรู้: <b id="lpTitle"></b> <a id="lpOpen" href="#" style="color:var(--pink)">เปิดแผน</a> <button type="button" class="ghost small" id="lpClear">เลิกใช้แผนนี้</button><div style="font-size:12px;color:var(--muted)">ใบงานและใบความรู้จะยึดสาระสำคัญ จุดประสงค์ และสาระการเรียนรู้ของแผนนี้</div></div>
        </div>
        <p class="help">เลือกหน่วยการเรียนรู้แล้วระบบเติมหัวข้อให้ แก้ไขหรือพิมพ์หัวข้อเองได้</p>
      </section>

      <section class="sec">
        <h2 class="sec-h"><span class="no">2</span>ชุดใบงาน</h2>
        <div class="grid">
        <label class="f">จำนวนใบงาน (1–20)
          <input type="number" id="count" min="1" max="20" value="4">
        </label>
        <label class="f">ข้อต่อใบ (3–20)
          <input type="number" id="itemCount" min="3" max="20" value="5">
        </label>
        <label class="f">ระดับความยาก
          <select id="difficulty">
            <optgroup label="ระดับเดียวทั้งใบ">
              <option value="easy">ง่าย</option>
              <option value="medium" selected>ปานกลาง</option>
              <option value="hard">ยาก</option>
              <option value="expert">ยากมาก</option>
            </optgroup>
            <optgroup label="ผสมหลายระดับ (แบ่งจำนวนข้อตามสัดส่วน)">
              <option value="mix:review">ทบทวน (ง่าย 50 / กลาง 40 / ยาก 10)</option>
              <option value="mix:std">มาตรฐาน (ง่าย 20 / กลาง 50 / ยาก 30)</option>
              <option value="mix:exam">เตรียมสอบ (ง่าย 10 / กลาง 30 / ยาก 40 / ยากมาก 20)</option>
              <option value="mix:contest">แข่งขัน (กลาง 20 / ยาก 40 / ยากมาก 40)</option>
              <option value="mix:custom">กำหนดสัดส่วนเอง…</option>
            </optgroup>
          </select>
        </label>
        </div>
        <div id="mixBox" class="hidden" style="margin-top:10px">
        <div class="row">
          <span style="font-size:14px;font-weight:600">สัดส่วนข้อ (%)</span>
          <label style="font-size:13px;font-weight:400">ง่าย <input type="number" id="mixEasy" min="0" max="100" value="20" style="width:70px"></label>
          <label style="font-size:13px;font-weight:400">ปานกลาง <input type="number" id="mixMedium" min="0" max="100" value="40" style="width:70px"></label>
          <label style="font-size:13px;font-weight:400">ยาก <input type="number" id="mixHard" min="0" max="100" value="30" style="width:70px"></label>
          <label style="font-size:13px;font-weight:400">ยากมาก <input type="number" id="mixExpert" min="0" max="100" value="10" style="width:70px"></label>
          <span id="mixSum" style="font-size:12px;color:var(--muted)"></span>
        </div>
      </div>
        <label id="beyondRow" class="hidden" style="display:flex;gap:8px;align-items:center;font-weight:400;font-size:13px;margin-top:8px"><input type="checkbox" id="beyond"> ให้ข้อระดับ “ยากมาก” เกินขอบเขตเนื้อหาของชั้นได้ (เทียบข้อสอบแข่งขัน) ไม่ติ๊ก = ยากด้วยการคิด แต่อยู่ในเนื้อหาของชั้นนี้</label>
        <div style="margin-top:18px;font-weight:600;font-size:14px">รูปแบบโจทย์ <span class="help" style="display:inline;margin:0">เลือกได้หลายแบบ ระบบสลับให้แต่ละใบ เปลี่ยนชั้นประถม/มัธยมแล้วระบบเลือกแบบที่เหมาะให้ใหม่</span></div>
        <div class="types" id="types"><?php foreach ($types as $t): ?><label class="chip on"><input type="checkbox" value="<?= htmlspecialchars($t['id']) ?>" checked> <?= htmlspecialchars($t['label']) ?></label><?php endforeach; ?></div>
      </section>

      <details class="sec" id="indBox" open>
        <summary><h2 class="sec-h"><span class="no">3</span>ตัวชี้วัดที่ต้องการวัด <small id="indCount"></small></h2></summary>
        <div id="indList" style="margin-top:8px;font-size:14px"></div>
        <div class="row" style="margin-top:6px;font-size:13px">
          <button type="button" class="ghost small" id="indAll">เลือกทั้งหมด</button>
          <button type="button" class="ghost small" id="indNone">ไม่เลือก</button>
          <label style="font-weight:400;display:flex;gap:6px;align-items:center"><input type="checkbox" id="showInd" checked> พิมพ์รหัสตัวชี้วัดในใบงาน</label>
          <a href="curriculum.php" style="color:var(--pink)">จัดการตัวชี้วัด</a>
        </div>
      
      </details>

      <details class="sec">
        <summary><h2 class="sec-h"><span class="no">4</span>ตัวเลือกเพิ่มเติม <small>รูปแบบเอกสาร รูปประกอบ ใบความรู้ บทอ่าน หัวกระดาษ</small></h2></summary>
        <div class="grid">
        <label class="f">รูปแบบเอกสาร
          <select id="docStyle">
            <option value="auto" selected>อัตโนมัติตามชั้น (ป. = น่ารัก, ม. = ทางการ)</option>
            <option value="kid">น่ารัก (ประถม)</option>
            <option value="formal">ทางการ (มัธยม)</option>
          </select>
        </label>
        <label class="f">รูปประกอบ (กราฟ แผนภาพ ตาราง)
          <select id="figureMode">
            <option value="code" selected>ระบบวาดกราฟ/แผนภาพเอง (แม่นยำ) + AI วาดภาพทั่วไป</option>
            <option value="ai">ให้ AI สร้างภาพทั้งหมด</option>
            <option value="none">ไม่ใช้รูปประกอบ</option>
          </select>
        </label>
        <label class="f">บทอ่านจากคลังเอกสาร (ใส่ตรงตามต้นฉบับ)
          <select id="passage"><option value="">— ไม่ใช้บทอ่าน —</option></select>
        </label>
        <label class="f">เอกสารอ้างอิงจากคลัง
          <select id="refMode">
            <option value="auto" selected>ใช้ท่อนที่เกี่ยวข้องอัตโนมัติ (ตามชั้น/วิชา)</option>
            <option value="off">ไม่ใช้</option>
          </select>
        </label>
        </div>
        <div id="passNote" class="help">บทอ่านที่เลือกจะใช้กับทุกใบในชุดนี้ AI สร้างเฉพาะคำถามจากบทอ่าน (เพิ่มบทอ่านได้ที่ <a href="library.php">คลังเอกสาร</a>)</div>
        <label class="check" style="margin-top:14px"><input type="checkbox" id="withLesson"> สร้างใบความรู้ (บทเรียน) คู่กับใบงานทุกใบ</label>
        <div id="hdrBox" style="margin-top:18px">
          <div style="font-weight:600;font-size:14px;margin-bottom:8px">หัวกระดาษ <span class="help" style="display:inline">ใช้กับสไตล์ทางการและแบบทดสอบ</span></div>
          <div class="grid" >
          <label class="f">ชื่อโรงเรียน<input type="text" id="hSchool" maxlength="120" placeholder="เช่น โรงเรียน…วิทยา"></label>
          <label class="f">รหัสวิชา<input type="text" id="hCourse" maxlength="30" placeholder="เช่น ว30201"></label>
          <label class="f">ชื่อครูผู้สอน<input type="text" id="hTeacher" maxlength="80" placeholder="เช่น นาย…"></label>
          <label class="f">เวลาสอบ (นาที)<input type="number" id="hMinutes" min="0" max="300" placeholder="สำหรับแบบทดสอบ"></label>
        </div>
      
        </div>
      </details>

      <details class="sec" id="aiBox">
        <summary><h2 class="sec-h"><span class="no">5</span>AI ที่ใช้ <small id="aiSummary">ตั้งค่าถาวรได้ที่หน้า ตั้งค่า AI</small></h2></summary>
        <div class="grid">
        <label class="f">AI สร้างเนื้อหา + ตรวจทาน
          <select id="textProvider">
            <?php foreach ($provOpts as $o): ?>
              <option value="<?= $o['id'] ?>"<?= $o['id'] === $defText ? ' selected' : '' ?><?= $o['ready'] ? '' : ' disabled' ?>><?= htmlspecialchars($o['label']) ?><?= $o['ready'] ? '' : ' (ยังไม่ได้ใส่ API key)' ?></option>
            <?php endforeach; ?>
          </select>
        </label>
        <label class="f">AI สร้างภาพ
          <select id="imageProvider">
            <?php foreach ($provOpts as $o): ?>
              <option value="<?= $o['id'] ?>"<?= $o['id'] === $defImage ? ' selected' : '' ?><?= $o['ready'] ? '' : ' disabled' ?>><?= htmlspecialchars($o['label']) ?><?= $o['ready'] ? '' : ' (ยังไม่ได้ใส่ API key)' ?></option>
            <?php endforeach; ?>
          </select>
        </label>
        </div>
        <label class="check" style="margin-top:14px"><input type="checkbox" id="doReview" checked> ให้ AI ตรวจทานเฉลยอีกรอบ (ใช้โควตาเพิ่ม 1 คำขอต่อใบ)</label>
        <p class="help">ถ้าตั้งผู้ให้บริการ/โมเดลไว้ที่ <a href="settings.php">ตั้งค่า AI</a> ระบบใช้ค่านั้นก่อนตัวเลือกในหน้านี้</p>
        <div id="orBox" class="orbox hidden">
        <div class="row" style="justify-content:space-between;align-items:flex-start">
          <strong style="font-size:14px">โมเดลจาก OpenRouter</strong>
          <div class="row">
            <label style="font-size:13px;font-weight:400;display:flex;gap:6px;align-items:center"><input type="checkbox" id="orFree"> เฉพาะโมเดลฟรี</label>
            <button type="button" id="orImport" class="ghost">นำเข้ารายชื่อโมเดล</button>
          </div>
        </div>
        <div class="grid" style="margin-top:8px">
          <label class="f">โมเดลสร้างเนื้อหา
            <input type="text" id="orText" list="orTextList" placeholder="พิมพ์ค้นหา เช่น gemini, gpt, claude" autocomplete="off" value="<?= htmlspecialchars((string) (cfg()['openrouter_models']['text'] ?? '')) ?>">
          </label>
          <label class="f">โมเดลตรวจทาน (ว่าง = ใช้ตัวเดียวกับสร้างเนื้อหา)
            <input type="text" id="orReview" list="orTextList" placeholder="เว้นว่างได้" autocomplete="off" value="<?= htmlspecialchars((string) (cfg()['openrouter_models']['review'] ?? '')) ?>">
          </label>
          <label class="f">โมเดลสร้างภาพ
            <input type="text" id="orImage" list="orImageList" placeholder="พิมพ์ค้นหา เช่น flux, seedream, imagen" autocomplete="off" value="<?= htmlspecialchars((string) (cfg()['openrouter_models']['image'] ?? '')) ?>">
          </label>
        </div>
        <datalist id="orTextList"></datalist>
        <datalist id="orImageList"></datalist>
        <div id="orNote"<div id="orNote" style="font-size:13px;color:var(--muted);margin-top:6px">กด “นำเข้ารายชื่อโมเดล” เพื่อดึงรายการล่าสุดจาก OpenRouter แล้วเลือกจากช่อง (พิมพ์เพื่อค้นหาได้) ใช้ข้อมูลเดิมที่เก็บไว้ได้ 1 ชั่วโมง</div>
      </details>

      <div class="actionbar">
        <button id="startBtn" class="big">สร้างใบงาน</button>
        <button id="stopBtn" type="button" class="stopBtn big ghost hidden" title="หยุดการสร้างทันที ใบที่ค้างอยู่ลบหรือสร้างใหม่ได้">⏹ หยุด</button>
        <p class="help">สร้างทีละใบ เห็นผลทันทีด้านล่าง ระบบบันทึกชุดให้อัตโนมัติ</p>
      </div>
    </div>

    <details class="panel" id="savedBox" style="margin-top:14px">
      <summary style="cursor:pointer;font-weight:600">ชุดใบงานที่บันทึกไว้ล่าสุด <span id="savedCount" style="font-weight:400;color:var(--muted)"></span></summary>
      <div id="savedList" style="margin-top:10px;font-size:14px">กำลังโหลด…</div>
      <div style="font-size:12px;color:var(--muted);margin-top:6px">ระบบบันทึกชุดใบงานให้อัตโนมัติเมื่อสร้างเสร็จ (เก็บเนื้อหา เฉลย และอ้างอิงภาพ) เปิดกลับมาแก้/พิมพ์ได้ภายหลัง</div>
    </details>

    <div id="error" class="error hidden"></div>

    <div id="toolbar" class="panel hidden">
      <div class="row" style="justify-content:space-between">
        <strong id="progressText"></strong>
        <div class="row">
          <button type="button" class="stopBtn ghost hidden">⏹ หยุด</button>
          <button id="viewBoth" title="พิมพ์/บันทึก PDF เป็นไฟล์เดียว ใบงานแต่ละใบตามด้วยเฉลยของใบนั้น">ใบงาน + เฉลย</button>
          <button id="viewWs" class="ghost">ใบงาน</button>
          <button id="viewAns" class="ghost">เฉลย</button>
          <button id="retryImgs" class="ghost hidden">ลองสร้างภาพที่ขาดใหม่</button>
          <button id="printBtn">พิมพ์ / บันทึกเป็น PDF</button>
        </div>
      </div>
      <div class="row" style="margin-top:8px">
        <button id="appendBtn" class="ghost small" title="ใช้ชั้น วิชา หัวข้อ จำนวนใบ และรูปแบบโจทย์ตามที่ตั้งไว้ด้านบน สร้างต่อท้ายชุดนี้">＋ สร้างเพิ่มต่อท้าย (ตามค่าด้านบน)</button>
        <button id="regenAllBtn" class="ghost small" title="สร้างเนื้อหาใหม่ทุกใบด้วยแผนเดิม (เก็บชุดเดิมเป็นสำเนาให้ก่อน)">↻ สร้างทั้งชุดใหม่</button>
        <button id="copyBtn" class="ghost small" title="บันทึกชุดปัจจุบันเป็นรายการใหม่ แล้วแก้ไขต่อที่สำเนานั้น">⧉ บันทึกเป็นสำเนาใหม่</button>
        <button id="onlineWsBtn" type="button" class="ghost small" style="background:#eff6ff;color:#1d4ed8;border-color:#93c5fd;font-weight:700">🌐 แปลงเป็นข้อสอบออนไลน์</button>
        <a href="book.php" class="small" style="font-size:13px;font-weight:600;color:var(--pink)" title="รวมใบงานที่บันทึกไว้เป็นเล่ม พร้อมปกและสารบัญ">📖 รวมเป็นเล่ม</a>
        <span style="font-size:12px;color:var(--muted)">ย้ายลำดับ/ลบแต่ละใบได้ที่แถบเหนือใบงาน</span>
      </div>
      <div id="onlineWsBox" class="hidden" style="margin-top:10px;padding:10px 12px;background:#eff6ff;border:1px solid #93c5fd;border-radius:10px;font-size:13px"></div>
      <div class="progress"><div id="progressBar" style="width:0"></div></div>
      <div id="waitNote" style="font-size:13px;color:#7a5b00;min-height:1.2em"></div>
      <div id="imgErr" style="font-size:13px;color:#b00020"></div>
      <div id="saveNote" style="font-size:13px;color:var(--muted)"></div>
      <div style="font-size:13px;color:var(--muted)">ในหน้าต่างพิมพ์ให้เลือก “บันทึกเป็น PDF” ขนาด A4 ขอบ “ไม่มี” และติ๊ก “กราฟิกพื้นหลัง”</div>
    </div>
  </div>

  <div class="pages" id="pages"></div>
</div>
<script>window.SHEET_TYPES = <?= json_encode($types, JSON_UNESCAPED_UNICODE) ?>; window.TYPE_DEFAULTS = <?= json_encode(['primary' => PRIMARY_DEFAULT_TYPES, 'secondary' => SECONDARY_DEFAULT_TYPES]) ?>; window.LEVEL_PRESETS = <?= json_encode(LEVEL_PRESETS) ?>;</script>
<script>
window.addEventListener('error', function (e) {
  var b = document.getElementById('jserr');
  if (!b) return;
  var t = e.target || {};
  var u = t.src || t.href || '';
  if (u && u.indexOf(location.origin) !== 0) return; // ไม่เตือนเรื่องไฟล์จากเว็บอื่น (เช่นฟอนต์)
  b.classList.remove('hidden');
  b.textContent = (t.src || t.href)
    ? 'โหลดไฟล์ไม่สำเร็จ: ' + (t.src || t.href) + ' (ตรวจสิทธิ์อ่านไฟล์/ชื่อโฟลเดอร์ใน htdocs)'
    : 'เกิดข้อผิดพลาดของหน้าเว็บ: ' + e.message + ' (' + String(e.filename || '').split('/').pop() + ':' + (e.lineno || '') + ')';
}, true);
</script>
<script src="assets/js/data/curriculum.js?v=<?= $v ?>"></script>
<script src="assets/vendor/katex/katex.min.js"></script>
<script src="assets/vendor/katex/auto-render.min.js"></script>
<script src="assets/js/shared/render.js?v=<?= $v ?>"></script>
<script src="assets/js/pages/app.js?v=<?= $v ?>"></script>
<script>
/* สรุปผู้ให้บริการ AI ที่หัวข้อ "AI ที่ใช้" และเปิดส่วนนี้เองถ้าเลือก OpenRouter (ต้องเลือกโมเดล) */
(function () {
  var t = document.getElementById('textProvider'), i = document.getElementById('imageProvider'), box = document.getElementById('aiBox'), sum = document.getElementById('aiSummary');
  if (!t || !i || !box || !sum) return;
  function upd() {
    var name = function (s) { return s.options[s.selectedIndex] ? s.options[s.selectedIndex].text.replace(/\s*\(.*\)$/, '') : ''; };
    sum.textContent = 'เนื้อหา: ' + name(t) + ' / ภาพ: ' + name(i);
    if (t.value === 'openrouter' || i.value === 'openrouter') box.open = true;
  }
  t.addEventListener('change', upd); i.addEventListener('change', upd); setTimeout(upd, 300);
})();
</script>
<?php endif; ?>
</body>
</html>
