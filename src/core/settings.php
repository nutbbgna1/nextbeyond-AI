<?php
declare(strict_types=1);

require_once __DIR__ . '/core.php';
require_once __DIR__ . '/store.php';

/* ------------------------------------------------------------------ */
/*  ตั้งค่า AI จากหน้าเว็บ: คีย์ + ผู้ให้บริการ/โมเดล แยกตามเมนู                */
/*  เก็บใน data/settings/_settings.json (data/ ถูกปิดไม่ให้เปิดผ่านเว็บ)         */
/*  ลำดับความสำคัญ: ตั้งเฉพาะเมนู > ค่าเริ่มต้นของ Settings > ที่เลือกในหน้าสร้างใบงาน > config.php */
/* ------------------------------------------------------------------ */

/** เมนูที่ตั้งค่าแยกได้: id => [ชื่อ, คำอธิบาย, ใช้ภาพ?] */
const AI_FEATURES = [
    'sheet'      => ['สร้างใบงาน', 'ใบงาน เฉลย ใบความรู้ และการวางแผนชุดใบงาน (หน้า ③)', false],
    'image'      => ['ภาพประกอบ', 'ภาพลายเส้นในใบงาน/ปกรวมเล่ม (ใช้โมเดลภาพ)', true],
    'lplan'      => ['แผนการสอน', 'ร่างแผนการจัดการเรียนรู้ (หน้า ②)', false],
    'term'       => ['แผนภาคเรียน', 'ร่างแผนรายสัปดาห์ (หน้า ①)', false],
    'exam'       => ['ข้อสอบ', 'สร้างข้อสอบกลางภาค/ปลายภาค (หน้า ⑤)', false],
    'book'       => ['รวมเล่ม', 'ให้ AI จัดบท ตั้งชื่อเล่ม เขียนคำนำ (หน้า ④)', false],
    'schedule'   => ['จัดตารางสอน', 'ให้ AI เสนอตารางสอนรายสัปดาห์ (หน้าปฏิทิน)', false],
    'curriculum' => ['ตัวชี้วัด', 'ถอดตัวชี้วัดจากไฟล์ และเทียบตัวชี้วัดต่างฉบับ', false],
];

/** สคริปต์ api/*.php → เมนู */
const AI_SCRIPT_FEATURE = [
    'sheet.php' => 'sheet', 'plan.php' => 'sheet', 'image.php' => 'image', 'lplan.php' => 'lplan', 'term.php' => 'term',
    'exam.php' => 'exam', 'schedule.php' => 'schedule', 'book_ai.php' => 'book', 'curriculum.php' => 'curriculum',
];

const AI_PROFILE_FIELDS = ['textProvider', 'textModel', 'reviewModel', 'imageProvider', 'imageModel'];
const AI_KEY_FIELD = ['gemini' => 'api_key', 'openai' => 'openai_api_key', 'openrouter' => 'openrouter_api_key'];

function settings_read(bool $fresh = false): array
{
    static $c = null;
    if ($c !== null && !$fresh) {
        return $c;
    }
    return $c = (store_json_get('settings', '_settings.json') ?? []);
}

function settings_write(array $s): void
{
    store_json_put('settings', '_settings.json', $s, 0, 'บันทึกการตั้งค่าไม่ได้ (ที่เก็บข้อมูลเขียนไม่ได้)');
    if (store_backend() === 'file') {
        @chmod(store_primary('settings') . '/_settings.json', 0640);
    }
    settings_read(true);
}

/** คีย์ที่ตั้งจากหน้า Settings (ว่าง = ใช้ของ config.php) */
function settings_keys(): array
{
    $k = (array) (settings_read()['keys'] ?? []);
    $out = [];
    foreach (AI_KEY_FIELD as $prov => $field) {
        $v = trim((string) ($k[$prov] ?? ''));
        if ($v !== '') {
            $out[$field] = $v;
        }
    }
    return $out;
}

function ai_clean_profile($p): array
{
    $p = is_array($p) ? $p : [];
    $out = [];
    foreach (AI_PROFILE_FIELDS as $f) {
        $v = trim((string) ($p[$f] ?? ''));
        if (str_ends_with($f, 'Provider')) {
            $v = in_array($v, ['gemini', 'openai', 'openrouter'], true) ? $v : '';
        } else {
            $v = preg_match('#^[A-Za-z0-9._:~\-/ ]{1,120}$#', $v) === 1 ? trim($v) : '';
        }
        $out[$f] = $v;
    }
    return $out;
}

/** เมนูของคำขอ API ปัจจุบัน ('' = ไม่ใช่ API ของเมนูใด) */
function ai_current_feature(): string
{
    $script = (string) ($_SERVER['SCRIPT_NAME'] ?? '');
    if (!str_contains($script, '/api/')) {
        return '';
    }
    return AI_SCRIPT_FEATURE[basename($script)] ?? '';
}

/** รวมค่าเริ่มต้น + ค่าของเมนู คืน [textProvider,textModel,reviewModel,imageProvider,imageModel] (ว่าง = ไม่กำหนด) */
function ai_profile_for(string $feature, array $s): array
{
    $d = ai_clean_profile($s['default'] ?? []);
    $f = $feature !== '' ? ai_clean_profile($s['features'][$feature] ?? []) : array_fill_keys(AI_PROFILE_FIELDS, '');
    $r = $d;
    if ($f['textProvider'] !== '') { // เมนูเลือกผู้ให้บริการเอง = โมเดลต้องเป็นของผู้ให้บริการนั้น
        $r['textProvider'] = $f['textProvider'];
        $r['textModel'] = $f['textModel'];
        $r['reviewModel'] = $f['reviewModel'];
    } elseif ($f['textModel'] !== '' || $f['reviewModel'] !== '') { // ใช้ผู้ให้บริการเริ่มต้น แต่เปลี่ยนโมเดล
        $r['textModel'] = $f['textModel'] !== '' ? $f['textModel'] : $r['textModel'];
        $r['reviewModel'] = $f['reviewModel'] !== '' ? $f['reviewModel'] : $r['reviewModel'];
    }
    if ($f['imageProvider'] !== '') {
        $r['imageProvider'] = $f['imageProvider'];
        $r['imageModel'] = $f['imageModel'];
    } elseif ($f['imageModel'] !== '') {
        $r['imageModel'] = $f['imageModel'];
    }
    return $r;
}

function ai_profile(): array
{
    if (!empty($GLOBALS['AI_FORCE']) && is_array($GLOBALS['AI_FORCE'])) { // ปุ่มทดสอบในหน้า Settings
        return ['textProvider' => (string) $GLOBALS['AI_FORCE']['provider'], 'textModel' => (string) $GLOBALS['AI_FORCE']['model'], 'reviewModel' => '', 'imageProvider' => '', 'imageModel' => ''];
    }
    return ai_profile_for(ai_current_feature(), settings_read());
}

/** โมเดลที่ Settings กำหนดให้ผู้ให้บริการนี้ ($which = text|review|image) ว่าง = ไม่ได้กำหนด */
function ai_profile_model(string $provider, string $which): string
{
    $pf = ai_profile();
    if ($which === 'image') {
        return $pf['imageProvider'] === $provider ? $pf['imageModel'] : '';
    }
    if ($pf['textProvider'] !== $provider) {
        return '';
    }
    return $which === 'review' ? $pf['reviewModel'] : $pf['textModel'];
}

/** สถานะคีย์ของแต่ละผู้ให้บริการ (ไม่ส่งคีย์เต็มออกไป) */
function settings_key_status(): array
{
    $over = settings_keys();
    $out = [];
    foreach (AI_KEY_FIELD as $prov => $field) {
        $cfgKey = trim((string) ((array) require __DIR__ . '/../../config.php')[$field] ?? '');
        $cfgOk = $cfgKey !== '' && !str_contains($cfgKey, 'ใส่_');
        if (isset($over[$field])) {
            $out[$prov] = ['has' => true, 'source' => 'settings', 'hint' => '…' . substr($over[$field], -4), 'configAlso' => $cfgOk];
        } else {
            $out[$prov] = ['has' => $cfgOk, 'source' => $cfgOk ? 'config' : 'none', 'hint' => $cfgOk ? '…' . substr($cfgKey, -4) : '', 'configAlso' => $cfgOk];
        }
    }
    return $out;
}
