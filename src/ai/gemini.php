<?php
declare(strict_types=1);

require_once __DIR__ . '/../core/core.php';
require_once __DIR__ . '/../core/settings.php';

/* ------------------------------------------------------------------ */
/*  ตัวเรียก Gemini REST API (ใช้ cURL) พร้อม retry แบบ exponential    */
/* ------------------------------------------------------------------ */

const IMAGE_STYLE = 'Black and white line art coloring page for young children, thick clean outlines, '
    . 'simple cute cartoon style, no shading, no grey fill, no text, no letters, no numbers, '
    . 'single subject centered, plain white background.';

/** สไตล์ภาพประกอบแบบหนังสือเรียนมัธยม (คำบรรยายที่ขึ้นต้นด้วย "tb:") */
const IMAGE_STYLE_TEXTBOOK = 'Clean black and white textbook illustration, precise thin line drawing like a school science textbook diagram, '
    . 'no shading, no color, no text, no letters, no numbers, no labels, plain white background.';

/** ต่อคำบรรยายภาพกับสไตล์ที่เหมาะ: "tb:..." = แบบหนังสือเรียน, นอกนั้น = ลายเส้นสำหรับเด็ก */
function image_full_prompt(string $subject): string
{
    if (str_starts_with($subject, 'tb:')) {
        return trim(substr($subject, 3)) . '. ' . IMAGE_STYLE_TEXTBOOK;
    }
    return $subject . '. ' . IMAGE_STYLE;
}

function gem_model(string $which): string
{
    return ai_profile_model('gemini', $which) ?: (string) (cfg()['models'][$which] ?? '');
}

function gem_key(): string
{
    $k = trim((string) cfg()['api_key']);
    if ($k === '' || str_contains($k, 'ใส่_API_KEY')) {
        throw new ApiException('ยังไม่ได้ใส่ API key ในไฟล์ config.php', 500, 'NO_KEY');
    }
    return $k;
}

function gem_json(array $data): string
{
    return json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
}

/** ส่งคำขอ 1 ครั้งไปยัง Gemini คืน array ที่ decode แล้ว ถ้าผิดพลาดโยน ApiException */
function gem_request(string $method, string $path, ?array $body = null): array
{
    $url = rtrim((string) cfg()['base_url'], '/') . $path;
    $ch  = curl_init($url);
    $headers = ['x-goog-api-key: ' . gem_key(), 'Content-Type: application/json'];
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST  => $method,
        CURLOPT_HTTPHEADER     => $headers,
        CURLOPT_TIMEOUT        => 100,
        CURLOPT_CONNECTTIMEOUT => 15,
    ]);
    if ($body !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, gem_json($body));
    }
    $raw    = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $err    = curl_error($ch);
    curl_close($ch);

    if ($raw === false) {
        throw new ApiException('เชื่อมต่อ Gemini ไม่ได้: ' . $err, 502, 'NETWORK');
    }
    $data = json_decode((string) $raw, true);
    if ($status >= 200 && $status < 300 && is_array($data)) {
        return $data;
    }
    $msg = is_array($data) ? (string) ($data['error']['message'] ?? '') : '';
    throw gem_error($status, $msg ?: mb_substr((string) $raw, 0, 200), is_array($data) ? $data : []);
}

/** อ่านเวลาที่ Google สั่งให้รอ (วินาที) จาก RetryInfo หรือจากข้อความ "retry in 23.4s" */
function gem_retry_after(string $msg, array $data): float
{
    foreach ($data['error']['details'] ?? [] as $d) {
        if (is_array($d) && isset($d['retryDelay']) && preg_match('/^([\d.]+)s$/', (string) $d['retryDelay'], $m)) {
            return (float) $m[1];
        }
    }
    return preg_match('/retry in ([\d.]+)\s*s/i', $msg, $m) ? (float) $m[1] : 0.0;
}

function gem_error(int $status, string $msg, array $data = []): ApiException
{
    if ($status === 429) {
        $wait = gem_retry_after($msg, $data);
        error_log('Gemini 429: ' . mb_substr($msg, 0, 600));
        $text = 'Google จำกัดโควตา (429): ' . mb_substr(trim($msg), 0, 260)
            . ($wait > 0 ? ' — Google ให้รอประมาณ ' . (int) ceil($wait) . ' วินาที' : '');
        return new ApiException($text, 429, 'RATE_LIMIT', $wait);
    }
    if ($status === 404) {
        return new ApiException('ไม่พบโมเดลที่ตั้งไว้ใน config.php — เปิด check_models.php เพื่อดูชื่อที่ใช้ได้ (' . mb_substr($msg, 0, 150) . ')', 404, 'MODEL_NOT_FOUND');
    }
    if ($status === 400 && stripos($msg, 'API key') !== false) {
        return new ApiException('API key ไม่ถูกต้อง ตรวจค่า api_key ใน config.php', 401, 'BAD_KEY');
    }
    if ($status === 403) {
        return new ApiException('Google ปฏิเสธการเข้าถึง (403) ตรวจสิทธิ์ของ API key: ' . mb_substr($msg, 0, 150), 403, 'FORBIDDEN');
    }
    if ($status === 503) {
        return new ApiException('Google แจ้งว่าโมเดลมีผู้ใช้หนาแน่นชั่วคราว (503) ระบบลองใหม่และสลับโมเดลสำรองแล้วแต่ยังไม่สำเร็จ กรุณากดสร้างอีกครั้งในอีกสักครู่', 503, 'OVERLOADED');
    }
    return new ApiException("Gemini ตอบข้อผิดพลาด ($status): " . mb_substr($msg, 0, 200), $status >= 500 ? 502 : 500, 'GEMINI_' . $status);
}

/** retry เมื่อเจอ 429 / 5xx / เครือข่ายหลุด (หน่วงเวลาเพิ่มเป็นเท่าตัว) */
function gem_with_retry(callable $fn, int $tries = 4): array
{
    $last = null;
    for ($i = 0; $i < $tries; $i++) {
        try {
            return $fn();
        } catch (ApiException $e) {
            $last = $e;
            $retryable = in_array($e->errCode, ['RATE_LIMIT', 'NETWORK', 'OVERLOADED'], true) || $e->httpStatus >= 502;
            // 429: ลองซ้ำที่ฝั่งเซิร์ฟเวอร์แค่ 1 ครั้ง และไม่รอถ้า Google สั่งให้รอนาน (เช่นโควตารายวัน)
            // ที่เหลือให้ตัวเลือกโมเดลสำรอง/หน้าเว็บจัดการต่อ จะได้ไม่ค้างเกินเวลาของ PHP
            $max = $e->errCode === 'RATE_LIMIT' ? 2 : $tries;
            if (!$retryable || $i >= $max - 1 || $e->retryAfter > 30) {
                break;
            }
            $wait = $e->retryAfter > 0 ? min($e->retryAfter + 1, 30) : 1.5 * 2 ** $i + random_int(0, 500) / 1000;
            usleep((int) ($wait * 1000000));
        }
    }
    throw $last;
}

/** โมเดลสำรอง ใช้เมื่อโมเดลหลักหนาแน่น/ล่มต่อเนื่อง (แก้ได้ด้วยคีย์ 'fallback_models' ใน config.php) */
function gem_fallback(string $which): string
{
    $defaults = ['text' => 'gemini-3.5-flash', 'review' => 'gemini-3.8-flash', 'image' => 'gemini-3-pro-image'];
    return (string) (cfg()['fallback_models'][$which] ?? $defaults[$which] ?? '');
}

function gem_is_overload(ApiException $e): bool
{
    return in_array($e->errCode, ['RATE_LIMIT', 'NETWORK', 'OVERLOADED'], true) || $e->httpStatus >= 502;
}

/** เรียกโมเดลหลักพร้อม retry ถ้ายังหนาแน่นอยู่ให้สลับไปโมเดลสำรอง */
function gem_call(string $which, array $body): array
{
    $primary = gem_model($which);
    try {
        return gem_with_retry(fn() => gem_request('POST', "/v1beta/models/{$primary}:generateContent", $body));
    } catch (ApiException $e) {
        $fb = gem_fallback($which);
        if ($fb === '' || $fb === $primary || !gem_is_overload($e)) {
            throw $e;
        }
        try {
            return gem_with_retry(fn() => gem_request('POST', "/v1beta/models/{$fb}:generateContent", $body));
        } catch (ApiException) {
            throw $e; // รายงานสาเหตุจากโมเดลหลัก
        }
    }
}

/** สร้างข้อความเป็น JSON ตาม schema ($which = 'text' | 'review') */
function gem_generate_json(string $which, string $system, string $prompt, array $schema, int $maxTokens = 8192, ?string $thinking = null): array
{
    $body = [
        'systemInstruction' => ['parts' => [['text' => $system]]],
        'contents'          => [['role' => 'user', 'parts' => [['text' => $prompt]]]],
        'generationConfig'  => [
            'responseMimeType'   => 'application/json',
            'responseJsonSchema' => $schema,
            'maxOutputTokens'    => $maxTokens,
            'thinkingConfig'     => ['thinkingLevel' => strtoupper($thinking ?? (string) cfg()['thinking_level'])],
        ],
    ];
    set_time_limit(240);
    $res = gem_call($which, $body);

    $cand = $res['candidates'][0] ?? null;
    // ถ้าถูกตัดกลางทาง JSON จะเสีย: ไม่พยายามต่อ ให้ผู้เรียกลองใหม่
    if (($cand['finishReason'] ?? '') === 'MAX_TOKENS') {
        throw new ApiException('คำตอบของ AI ถูกตัดกลางทางเพราะ token เต็ม (MAX_TOKENS)', 502, 'TRUNCATED');
    }
    $text = '';
    foreach ($cand['content']['parts'] ?? [] as $p) {
        if (isset($p['text']) && empty($p['thought'])) {
            $text .= $p['text'];
        }
    }
    if ($text === '') {
        throw new ApiException('AI ไม่ตอบข้อความกลับมา (อาจถูกบล็อกด้วยตัวกรองความปลอดภัย)', 502, 'EMPTY');
    }
    $out = json_decode($text, true);
    if (!is_array($out)) {
        throw new ApiException('AI ตอบกลับมาไม่ใช่ JSON ที่ถูกต้อง', 502, 'BAD_JSON');
    }
    return $out;
}

/** สร้างภาพลายเส้น คืน [binary, ext] */
function gem_generate_image(string $subject): array
{
    $body  = [
        'contents'         => [['role' => 'user', 'parts' => [['text' => image_full_prompt($subject)]]]],
        'generationConfig' => [
            'responseModalities' => ['TEXT', 'IMAGE'],
            'imageConfig'        => ['aspectRatio' => '1:1'],
        ],
    ];
    set_time_limit(240);
    $res = gem_call('image', $body);
    foreach ($res['candidates'][0]['content']['parts'] ?? [] as $p) {
        $inline = $p['inlineData'] ?? $p['inline_data'] ?? null;
        if (!empty($inline['data'])) {
            $mime = (string) ($inline['mimeType'] ?? $inline['mime_type'] ?? 'image/png');
            return [base64_decode((string) $inline['data']), str_contains($mime, 'jpeg') ? 'jpg' : 'png'];
        }
    }
    throw new ApiException('โมเดลไม่ส่งภาพกลับมา (อาจถูกตัวกรองความปลอดภัยบล็อก ลองเปลี่ยนคำบรรยาย)', 502, 'NO_IMAGE');
}
