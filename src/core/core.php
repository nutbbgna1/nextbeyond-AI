<?php
declare(strict_types=1);

/* ------------------------------------------------------------------ */
/*  ค่าตั้งต้น / ข้อผิดพลาด / ตอบ JSON / ล็อกอิน / โควตา                 */
/* ------------------------------------------------------------------ */

/* ถ้ามีไฟล์ host.php ในโฟลเดอร์หลัก = ถูกฝังในระบบอื่น (เช่น nextbeyond/admin)
   host.php ต้องตรวจสิทธิ์ผู้ใช้เอง และ define('HOST_EMBEDDED', true) */
if (PHP_SAPI !== 'cli' && is_file(dirname(__DIR__, 2) . '/host.php')) {
    require_once dirname(__DIR__, 2) . '/host.php';
}

require_once __DIR__ . '/store.php';

const SHEET_TYPES = ['fill_blank', 'multiple_choice', 'matching', 'true_false', 'ordering', 'short_answer', 'calculation', 'multi_statement', 'data_set', 'exam'];

const SHEET_TYPE_LABEL = [
    'fill_blank'      => 'เติมคำ',
    'multiple_choice' => 'ปรนัย 4 ตัวเลือก',
    'matching'        => 'จับคู่',
    'true_false'      => 'ถูก / ผิด',
    'ordering'        => 'เรียงลำดับ',
    'short_answer'    => 'เติมคำตอบ/ตอบสั้น',
    'calculation'     => 'คำนวณ แสดงวิธีทำ',
    'multi_statement' => 'ปรนัยเลือกข้อความถูก (1, 2, 3)',
    'data_set'        => 'ชุดคำถามจากข้อมูล/กราฟ',
    'exam'            => 'แบบทดสอบ (ตอนที่ 1 ปรนัย + ตอนที่ 2 อัตนัย)',
];

/** รูปแบบที่ใช้ได้ดีกับระดับมัธยม (ใช้เลือกค่าเริ่มต้นของหน้าเว็บ) */
const SECONDARY_DEFAULT_TYPES = ['multiple_choice', 'short_answer', 'calculation', 'multi_statement', 'data_set'];
const PRIMARY_DEFAULT_TYPES = ['fill_blank', 'multiple_choice', 'matching', 'true_false', 'ordering'];

/** ค่าตั้งต้นของตัวเลือกใหม่ๆ: ถ้า config.php ของคุณไม่มีคีย์เหล่านี้ ระบบใช้ค่านี้แทน */
const CFG_DEFAULTS = [
    'text_provider'  => 'gemini',   // gemini | openai | openrouter  (ผู้ให้บริการเริ่มต้นสำหรับเนื้อหา/ตรวจทาน)
    'image_provider' => 'gemini',   // gemini | openai | openrouter  (ผู้ให้บริการเริ่มต้นสำหรับภาพ)
    'image_max_px'   => 900,        // ย่อภาพที่ AI สร้างให้ด้านยาวไม่เกินค่านี้ก่อนเก็บ (ประหยัดที่ในฐานข้อมูล) 0 = ไม่ย่อ
    'image_quality'  => 78,         // คุณภาพ JPEG ตอนเก็บ 1-100
    'openai_api_key' => '',
    'openai_base_url' => 'https://api.openai.com',
    'openai_models' => [
        'text'   => 'gpt-6-luna',          // ถูกและเร็ว เหมาะกับงานวนทีละใบ
        'review' => 'gpt-6.1-sol',         // เก่งกว่า ใช้ตรวจความถูกต้อง
        'image'  => 'gpt-image-2.5-flare', // รุ่นสร้างภาพที่เร็ว/ประหยัด (รุ่นละเอียด: gpt-image-2.5-sunburst)
    ],
    'openai_image_size'      => '1024x1024',
    'openai_image_quality'   => 'low',  // low | medium | high (ภาพลายเส้นใช้ low ก็พอ ถูกที่สุด)
    'openai_reasoning_effort' => '',    // ว่าง = ไม่ส่งค่านี้ (ใช้ค่าเริ่มต้นของโมเดล)
    'openrouter_api_key'  => '',
    'openrouter_base_url' => 'https://openrouter.ai/api/v1',
    'openrouter_models'   => ['text' => '', 'review' => '', 'image' => ''], // ว่าง = เลือกจากหน้าเว็บ (ปุ่มนำเข้ารายชื่อโมเดล)
    'openrouter_site_url' => 'http://localhost', // ส่งเป็น HTTP-Referer (ไม่บังคับ)
    'openrouter_app_name' => 'AI Worksheet',     // ส่งเป็น X-Title (ไม่บังคับ)
];

function cfg(): array
{
    static $c = null;
    if ($c === null) {
        $c = array_replace_recursive(CFG_DEFAULTS, (array) require __DIR__ . '/../../config.php');
        require_once __DIR__ . '/settings.php';
        $c = array_replace($c, settings_keys()); // คีย์ที่ตั้งจากหน้า Settings มาก่อน config.php
    }
    return $c;
}

class ApiException extends RuntimeException
{
    public function __construct(string $message, public int $httpStatus = 500, public string $errCode = 'ERROR', public float $retryAfter = 0.0)
    {
        parent::__construct($message);
    }
}

function json_out(array $data, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function json_error(Throwable $e): void
{
    if ($e instanceof ApiException) {
        json_out(['error' => $e->getMessage(), 'code' => $e->errCode, 'retryAfter' => $e->retryAfter], $e->httpStatus);
    }
    json_out(['error' => $e->getMessage() ?: 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ', 'code' => 'ERROR'], 500);
}

/* ------------------------------ ล็อกอิน ------------------------------ */

function session_boot(): void
{
    if (session_status() === PHP_SESSION_NONE) {
        session_set_cookie_params([
            'httponly' => true,
            'samesite' => 'Lax',
            'secure'   => !empty($_SERVER['HTTPS']),
        ]);
        session_start();
    }
}

function password_required(): bool
{
    if (defined('HOST_EMBEDDED')) {
        return false; // ใช้ล็อกอินของระบบหลักแทน
    }
    return (string) cfg()['app_password'] !== '';
}

function is_authed(): bool
{
    if (defined('HOST_EMBEDDED')) {
        return true; // host.php ตรวจสิทธิ์ไปแล้ว
    }
    if (!password_required()) {
        return true;
    }
    session_boot();
    $ok = !empty($_SESSION['ok']);
    session_write_close(); // ปล่อย lock เพื่อให้คำขอพร้อมกันไม่ต้องรอกัน
    return $ok;
}

/** เรียกต้นไฟล์ API ทุกตัว: ต้องล็อกอิน + เป็น POST JSON จากหน้าเว็บของเราเอง */
function api_guard(bool $post = true): array
{
    if (!is_authed()) {
        json_out(['error' => 'กรุณาเข้าสู่ระบบก่อน', 'code' => 'AUTH'], 401);
    }
    if (!$post) {
        return [];
    }
    if ($_SERVER['REQUEST_METHOD'] !== 'POST' || ($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') !== 'worksheet') {
        json_out(['error' => 'คำขอไม่ถูกต้อง', 'code' => 'BAD_REQUEST'], 400);
    }
    $body = json_decode(file_get_contents('php://input') ?: '', true);
    $body = is_array($body) ? $body : [];
    $GLOBALS['REQ_BODY'] = $body; // ให้ตัวเรียก AI อ่านค่าที่เลือกจากหน้าเว็บ (เช่นโมเดลของ OpenRouter)
    return $body;
}

/* ------------------------------- โควตา ------------------------------- */

/** จำกัดจำนวนคำขอ AI ต่อ IP ต่อวัน เก็บในไฟล์ data/quota.json (ใช้ flock กันเขียนชนกัน) */
function check_quota(int $cost = 1): void
{
    $limit = (int) cfg()['daily_limit_per_ip'];
    $ip    = $_SERVER['REMOTE_ADDR'] ?? 'local';
    $day   = date('Y-m-d');
    if (store_backend() === 'db') { // โหมดฐานข้อมูล: นับโควตาต่อครูแต่ละคน
        $qn = 'q-' . (defined('TA_OWNER_ID') ? (int) TA_OWNER_ID : 0) . '.json';
        $data = store_json_get('quota', $qn);
        if (!is_array($data) || ($data['day'] ?? '') !== $day) {
            $data = ['day' => $day, 'used' => 0];
        }
        if ((int) $data['used'] + $cost > $limit) {
            throw new ApiException("ใช้โควตาวันนี้ครบ {$limit} คำขอแล้ว ลองใหม่พรุ่งนี้", 429, 'QUOTA');
        }
        $data['used'] = (int) $data['used'] + $cost;
        try {
            store_json_put('quota', $qn, $data);
        } catch (ApiException $e) {
        }
        return;
    }
    $file  = __DIR__ . '/../../data/quota.json';

    $fh = fopen($file, 'c+');
    if (!$fh) {
        return; // เขียนไฟล์ไม่ได้ = ข้ามโควตา ดีกว่าทำให้ระบบใช้ไม่ได้
    }
    flock($fh, LOCK_EX);
    $raw  = stream_get_contents($fh);
    $data = $raw ? json_decode($raw, true) : null;
    if (!is_array($data) || ($data['day'] ?? '') !== $day) {
        $data = ['day' => $day, 'counts' => []];
    }
    $used = (int) ($data['counts'][$ip] ?? 0);
    if ($used + $cost > $limit) {
        flock($fh, LOCK_UN);
        fclose($fh);
        throw new ApiException("ใช้โควตาวันนี้ครบ {$limit} คำขอแล้ว ลองใหม่พรุ่งนี้", 429, 'QUOTA');
    }
    $data['counts'][$ip] = $used + $cost;
    ftruncate($fh, 0);
    rewind($fh);
    fwrite($fh, json_encode($data));
    fflush($fh);
    flock($fh, LOCK_UN);
    fclose($fh);
}

/* --------------------------- ฟังก์ชันช่วยเล็กๆ -------------------------- */

function norm(string $s): string
{
    return trim((string) preg_replace('/\s+/u', ' ', $s));
}
