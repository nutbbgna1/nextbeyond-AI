<?php
declare(strict_types=1);

require_once __DIR__ . '/src/core/core.php';
require_once __DIR__ . '/src/core/nav.php';
require_once __DIR__ . '/src/ai/schemas.php';
require_once __DIR__ . '/src/planning/lplan.php';

if (!is_authed()) {
    header('Location: index.php');
    exit;
}
$types = [];
foreach (SHEET_TYPES as $t) {
    $types[$t] = SHEET_TYPE_LABEL[$t];
}
$v = max(@filemtime(__DIR__ . '/assets/js/pages/lplan.js') ?: 1, @filemtime(__DIR__ . '/assets/js/shared/common.js') ?: 1, @filemtime(__DIR__ . '/assets/css/style.css') ?: 1, @filemtime(__FILE__) ?: 1);
?><!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>แผนการจัดการเรียนรู้</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Mali:wght@400;600;700&family=Sarabun:ital,wght@0,400;0,600;0,700;1,400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/css/style.css?v=<?= $v ?>">
<style>
  .lp-doc{background:#fff;width:210mm;max-width:100%;margin:0 auto;padding:18mm 18mm 20mm;border:1px solid var(--line);box-shadow:0 2px 10px rgba(0,0,0,.05);font-family:"Sarabun",sans-serif;font-size:15px;line-height:1.6;color:#111}
  .lp-doc h2{text-align:center;font-size:20px;margin:0 0 6px}
  .lp-doc .hd{text-align:center;margin-bottom:12px}
  .lp-doc .hd div{margin:1px 0}
  .lp-doc h3{font-size:16px;margin:14px 0 4px}
  .lp-doc h4{font-size:15px;margin:6px 0 2px 14px}
  .lp-doc ol,.lp-doc ul{margin:2px 0 2px 34px;padding:0}
  .lp-doc p{margin:2px 0 2px 18px;text-indent:24px}
  .lp-doc table{width:100%;border-collapse:collapse;margin:6px 0;font-size:14px;page-break-inside:auto}
  .lp-doc th,.lp-doc td{border:1px solid #555;padding:5px 7px;vertical-align:top;text-align:left}
  .lp-doc th{background:#f2f2f2;text-align:center}
  .lp-doc tr{page-break-inside:avoid}
  .lp-doc .dots{border-bottom:1px dotted #555;height:26px}
  .lp-doc .sign{margin:18px 0 0 50%;text-align:center}
  .lp-doc .muted{color:#666}
  .lp-ed textarea{width:100%;min-height:70px;font-size:14px}
  .lp-ed input[type=text],.lp-ed input[type=number]{width:100%}
  .lp-ed .sec{border-top:1px solid #eee;padding-top:10px;margin-top:12px}
  .lp-ed .sec > b{display:block;margin-bottom:6px}
  .lp-ed .g2{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px}
  .lp-ed .stage{border:1px solid #eee;border-radius:10px;padding:10px;margin-bottom:8px}
  .ideas .idea{display:flex;gap:10px;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f0e6ea}
  @media print{
    body{background:#fff}
    .app{max-width:none;padding:0}
    .app > *:not(#docWrap){display:none!important}
    #docWrap > *:not(#doc){display:none!important}
    .lp-doc{border:0;box-shadow:none;width:auto;padding:0;font-size:15px}
    @page{size:A4;margin:18mm 18mm 18mm 22mm}
  }
</style>
</head>
<body>
<div class="app">
  <div id="jserr" class="error hidden"></div>
  <?= nav_html('lplan') ?>
  <h1>แผนการจัดการเรียนรู้</h1>
  <p class="sub">เริ่มจากแผนการสอน: ให้ AI ร่างแผนตามหลักสูตร (จุดประสงค์ สาระการเรียนรู้ กิจกรรม การวัดผล) ครูตรวจแก้ แล้วกด “สร้างใบงานตามแผน” ใบงานและใบความรู้จะยึดเนื้อหาของแผนนี้ ร่างจาก AI เป็นจุดเริ่มต้นให้ครูปรับ ไม่ใช่แผนที่ผ่านการรับรอง</p>

  <div class="panel" id="formBox">
    <div class="grid">
      <label class="f">ชั้น<select id="grade"></select></label>
      <label class="f">วิชา<select id="subject"></select></label>
      <label class="f">ภาคเรียน<select id="term"><option value="">—</option><option value="1">1</option><option value="2">2</option></select></label>
      <label class="f">ปีการศึกษา<input type="text" id="year" maxlength="4" placeholder="เช่น 2569"></label>
      <label class="f" style="grid-column:span 2">หน่วยการเรียนรู้<select id="unit"></select></label>
      <label class="f">หน่วยที่<input type="text" id="unitNo" maxlength="5" placeholder="เช่น 1"></label>
      <label class="f">แผนที่<input type="text" id="planNo" maxlength="5" placeholder="เช่น 1"></label>
      <label class="f" style="grid-column:span 2">เรื่องที่สอน<input type="text" id="topic" maxlength="200" placeholder="เช่น การบวกเศษส่วนที่ตัวส่วนเท่ากัน"></label>
      <label class="f">จำนวนชั่วโมง<input type="number" id="hours" min="1" max="10" value="1"></label>
      <label class="f">นาทีต่อคาบ<input type="number" id="periodMinutes" min="30" max="120" value="50"></label>
      <label class="f" style="grid-column:span 2">รูปแบบการจัดกิจกรรม<select id="model"><?php foreach (LP_MODELS as $k => $m): ?><option value="<?= $k ?>"><?= htmlspecialchars($m['label']) ?></option><?php endforeach; ?></select></label>
      <label class="f">โรงเรียน<input type="text" id="school" maxlength="150"></label>
      <label class="f">ครูผู้สอน<input type="text" id="teacher" maxlength="120"></label>
      <label class="f">เอกสารอ้างอิงจากคลัง<select id="refMode"><option value="auto">ใช้ท่อนที่เกี่ยวข้อง</option><option value="off">ไม่ใช้</option></select></label>
      <label class="f" style="grid-column:1/-1">ข้อเสนอแนะเพิ่มเติม (ไม่บังคับ)<input type="text" id="hint" maxlength="500" placeholder="เช่น นักเรียนอ่อนเรื่องการหาร เน้นสื่อของจริง / ห้องเรียนมี 40 คน"></label>
    </div>
    <details id="indBox" style="margin-top:12px" open>
      <summary style="cursor:pointer;font-weight:600;font-size:14px">🎯 ตัวชี้วัด <span id="indCount" style="font-weight:400;color:var(--muted)"></span></summary>
      <div id="indList" style="margin-top:8px;font-size:14px"></div>
    </details>
    <div class="row" style="margin-top:14px"><button id="gen">ให้ AI ร่างแผนการจัดการเรียนรู้</button><button type="button" class="ghost hidden" id="stopGen" title="หยุดการร่างทันที">⏹ หยุด</button><button class="ghost" id="blank">เริ่มจากแผนว่าง</button><span id="genNote" class="sub" style="margin:0"></span></div>
  </div>

  <div id="docWrap" class="hidden">
    <div class="panel no-print">
      <div class="row" style="justify-content:space-between">
        <span class="row">
          <button id="save">💾 บันทึก</button>
          <button class="ghost" id="modeBtn">✎ แก้ไข</button>
          <button class="ghost" id="printBtn">🖨 พิมพ์ / PDF</button>
          <button class="ghost" id="wordBtn">⬇ Word</button>
          <button class="ghost" id="regen" title="ร่างใหม่ทั้งแผนด้วยค่าด้านบน">↻ ร่างใหม่</button>
        </span>
        <span id="saveNote" class="sub" style="margin:0"></span>
      </div>
      <div class="ideas" style="margin-top:12px">
        <div class="row" style="justify-content:space-between"><strong>ใบงานตามแผนนี้</strong><button id="makeAll">➡ สร้างใบงานทั้งหมดตามแผน</button></div>
        <div id="ideas" style="font-size:14px;margin-top:4px"></div>
        <div style="font-size:12px;color:var(--muted);margin-top:4px">ต้องบันทึกแผนก่อน ใบงาน/ใบความรู้ที่สร้างจะยึดสาระสำคัญ จุดประสงค์ และสาระการเรียนรู้ของแผน</div>
      </div>
    </div>
    <div id="editor" class="panel lp-ed hidden no-print"></div>
    <div id="doc" class="lp-doc"></div>
  </div>

  <div class="panel no-print" style="margin-top:20px">
    <div class="row" style="justify-content:space-between"><strong>แผนที่บันทึกไว้</strong>
      <span class="row"><select id="fGrade"><option value="">ทุกชั้น</option></select><select id="fSubject"><option value="">ทุกวิชา</option></select><select id="fTerm"><option value="">ทุกภาคเรียน</option><option value="1">ภาคเรียนที่ 1</option><option value="2">ภาคเรียนที่ 2</option></select><input type="search" id="fQ" placeholder="ค้นหา"></span></div>
    <div id="saved" style="margin-top:8px;font-size:14px">กำลังโหลด…</div>
  </div>
</div>
<script src="assets/js/data/curriculum.js"></script>
<script src="assets/js/shared/common.js?v=<?= $v ?>"></script>
<script>
window.SHEET_TYPE_LABELS = <?= json_encode($types, JSON_UNESCAPED_UNICODE) ?>;
window.LP_MODELS = <?= json_encode(LP_MODELS, JSON_UNESCAPED_UNICODE) ?>;
window.LP_COMPETENCIES = <?= json_encode(LP_COMPETENCIES, JSON_UNESCAPED_UNICODE) ?>;
window.LP_TRAITS = <?= json_encode(LP_TRAITS, JSON_UNESCAPED_UNICODE) ?>;
</script>
<script src="assets/js/pages/lplan.js?v=<?= $v ?>"></script>
</body>
</html>
