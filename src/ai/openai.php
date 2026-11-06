<?php
declare(strict_types=1);

require_once __DIR__ . '/../core/core.php';
require_once __DIR__ . '/../core/settings.php';
require_once __DIR__ . '/gemini.php'; // ใช้ gem_with_retry / IMAGE_STYLE ร่วมกัน

/* ------------------------------------------------------------------ */
/*  ตัวเรียก OpenAI (Chat Completions + Images API) ด้วย cURL           */
/* ------------------------------------------------------------------ */

function openai_model(string $which): string
{
    return ai_profile_model('openai', $which) ?: (string) (cfg()['openai_models'][$which] ?? '');
}

function openai_key(): string
{
    $k = trim((string) cfg()['openai_api_key']);
    if ($k === '' || str_contains($k, 'ใส่_')) {
        throw new ApiException('ยังไม่ได้ใส่ OpenAI API key ในไฟล์ config.php (openai_api_key)', 500, 'NO_KEY');
    }
    return $k;
}

function openai_has_key(): bool
{
    $k = trim((string) cfg()['openai_api_key']);
    return $k !== '' && !str_contains($k, 'ใส่_');
}

/** OpenAI โหมด strict ต้องการ additionalProperties:false ในทุก object (ใส่เพิ่มเฉพาะตอนส่งให้ OpenAI) */
function openai_strict_schema(array $s): array
{
    $t = $s['type'] ?? '';
    if ($t === 'object' && isset($s['properties'])) {
        $s['additionalProperties'] = false;
        foreach ($s['properties'] as $k => $v) {
            $s['properties'][$k] = openai_strict_schema($v);
        }
    }
    if ($t === 'array' && isset($s['items'])) {
        $s['items'] = openai_strict_schema($s['items']);
    }
    return $s;
}

/** ส่ง POST 1 ครั้ง คืน [status, array, retryAfterHeader] */
function openai_post_raw(string $path, array $body): array
{
    $url = rtrim((string) cfg()['openai_base_url'], '/') . $path;
    $ch  = curl_init($url);
    $retryHeader = 0.0;
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . openai_key(), 'Content-Type: application/json'],
        CURLOPT_POSTFIELDS     => gem_json($body),
        CURLOPT_TIMEOUT        => 150,
        CURLOPT_CONNECTTIMEOUT => 15,
        CURLOPT_HEADERFUNCTION => function ($ch, $line) use (&$retryHeader) {
            if (stripos($line, 'retry-after:') === 0) {
                $retryHeader = (float) trim(substr($line, 12));
            }
            return strlen($line);
        },
    ]);
    $raw    = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $err    = curl_error($ch);
    curl_close($ch);
    if ($raw === false) {
        throw new ApiException('เชื่อมต่อ OpenAI ไม่ได้: ' . $err, 502, 'NETWORK');
    }
    $data = json_decode((string) $raw, true);
    return [$status, is_array($data) ? $data : [], $retryHeader, (string) $raw];
}

/**
 * ส่งคำขอพร้อมจัดการพารามิเตอร์ที่โมเดลไม่รองรับ: ถ้า OpenAI ตอบ 400 ว่า parameter ใดไม่รองรับ
 * จะตัด parameter นั้นออกแล้วลองใหม่ (ได้ไม่เกิน 4 ครั้ง) ทำให้ใช้ได้กับโมเดลรุ่นใหม่ที่รับค่าไม่เหมือนกัน
 */
function openai_request(string $path, array $body): array
{
    for ($i = 0; $i < 4; $i++) {
        [$status, $data, $retryHeader, $raw] = openai_post_raw($path, $body);
        if ($status >= 200 && $status < 300 && $data) {
            return $data;
        }
        $msg = (string) ($data['error']['message'] ?? '');
        if ($status === 400
            && preg_match("/(?:unsupported|unknown|unrecognized)\\s+(?:parameter|value|request argument)[^']*'([a-z_]+)'/i", $msg, $m)
            && array_key_exists($m[1], $body)
            && !in_array($m[1], ['model', 'messages', 'prompt', 'response_format'], true)) {
            error_log("OpenAI: ตัด parameter ที่ไม่รองรับ '{$m[1]}' แล้วลองใหม่ ({$msg})");
            unset($body[$m[1]]);
            continue;
        }
        throw openai_error($status, $msg ?: mb_substr($raw, 0, 200), $data, $retryHeader);
    }
    throw new ApiException('OpenAI ปฏิเสธพารามิเตอร์หลายตัวติดกัน: ' . mb_substr($msg ?? '', 0, 200), 400, 'OPENAI_400');
}

function openai_error(int $status, string $msg, array $data, float $retryHeader): ApiException
{
    $code = (string) ($data['error']['code'] ?? '');
    if ($status === 429 && ($code === 'insufficient_quota' || stripos($msg, 'exceeded your current quota') !== false)) {
        return new ApiException('เครดิต OpenAI หมดหรือยังไม่ได้ผูกบัตร (insufficient_quota) ตรวจที่ platform.openai.com → Billing: ' . mb_substr($msg, 0, 200), 402, 'NO_CREDIT');
    }
    if ($status === 429) {
        $wait = $retryHeader;
        if ($wait <= 0 && preg_match('/try again in ([\d.]+)\s*(ms|s)/i', $msg, $m)) {
            $wait = strtolower($m[2]) === 'ms' ? (float) $m[1] / 1000 : (float) $m[1];
        }
        error_log('OpenAI 429: ' . mb_substr($msg, 0, 600));
        return new ApiException('OpenAI จำกัดอัตราการเรียก (429): ' . mb_substr($msg, 0, 260)
            . ($wait > 0 ? ' — ให้รอประมาณ ' . (int) ceil($wait) . ' วินาที' : ''), 429, 'RATE_LIMIT', $wait);
    }
    if ($status === 401) {
        return new ApiException('OpenAI API key ไม่ถูกต้อง ตรวจ openai_api_key ใน config.php', 401, 'BAD_KEY');
    }
    if ($status === 403) {
        return new ApiException('OpenAI ปฏิเสธการเข้าถึง (403) อาจต้องยืนยันองค์กร/สิทธิ์ใช้โมเดลนี้: ' . mb_substr($msg, 0, 200), 403, 'FORBIDDEN');
    }
    if ($status === 404) {
        return new ApiException('ไม่พบโมเดล OpenAI ที่ตั้งไว้ (openai_models ใน config.php) เปิด check_models.php เพื่อดูชื่อที่ใช้ได้: ' . mb_substr($msg, 0, 160), 404, 'MODEL_NOT_FOUND');
    }
    if ($status === 503 || $status === 502 || $status === 500) {
        return new ApiException('OpenAI ตอบข้อผิดพลาดชั่วคราว (' . $status . ') ระบบลองใหม่แล้วแต่ยังไม่สำเร็จ กรุณากดสร้างอีกครั้ง', 503, 'OVERLOADED');
    }
    return new ApiException("OpenAI ตอบข้อผิดพลาด ($status): " . mb_substr($msg, 0, 240), 500, 'OPENAI_' . $status);
}

/** สร้างข้อความเป็น JSON ตาม schema ($which = 'text' | 'review') */
function openai_generate_json(string $which, string $system, string $prompt, array $schema, int $maxTokens = 8192): array
{
    $body = [
        'model'    => openai_model($which),
        'messages' => [
            ['role' => 'system', 'content' => $system],
            ['role' => 'user', 'content' => $prompt],
        ],
        'response_format' => [
            'type'        => 'json_schema',
            'json_schema' => ['name' => 'worksheet', 'strict' => true, 'schema' => openai_strict_schema($schema)],
        ],
        // token ที่ใช้ "คิด" ของโมเดลแบบ reasoning ถูกนับรวมในเพดานนี้ด้วย จึงเผื่อเป็นสองเท่า
        'max_completion_tokens' => $maxTokens * 2,
    ];
    $effort = trim((string) cfg()['openai_reasoning_effort']);
    if ($effort !== '') {
        $body['reasoning_effort'] = $effort;
    }
    set_time_limit(240);
    $res = gem_with_retry(fn() => openai_request('/v1/chat/completions', $body));

    $choice = $res['choices'][0] ?? [];
    if (!empty($choice['message']['refusal'])) {
        throw new ApiException('OpenAI ปฏิเสธการตอบ: ' . mb_substr((string) $choice['message']['refusal'], 0, 160), 502, 'REFUSED');
    }
    if (($choice['finish_reason'] ?? '') === 'length') {
        throw new ApiException('คำตอบของ AI ถูกตัดกลางทางเพราะ token เต็ม (length)', 502, 'TRUNCATED');
    }
    $text = (string) ($choice['message']['content'] ?? '');
    if ($text === '') {
        throw new ApiException('AI ไม่ตอบข้อความกลับมา', 502, 'EMPTY');
    }
    $out = json_decode($text, true);
    if (!is_array($out)) {
        throw new ApiException('AI ตอบกลับมาไม่ใช่ JSON ที่ถูกต้อง', 502, 'BAD_JSON');
    }
    return $out;
}

/** สร้างภาพลายเส้น คืน [binary, ext] */
function openai_generate_image(string $subject): array
{
    $body = [
        'model'   => openai_model('image'),
        'prompt'  => image_full_prompt($subject),
        'n'       => 1,
        'size'    => (string) cfg()['openai_image_size'],
        'quality' => (string) cfg()['openai_image_quality'],
    ];
    set_time_limit(240);
    $res = gem_with_retry(fn() => openai_request('/v1/images/generations', $body));
    $b64 = $res['data'][0]['b64_json'] ?? '';
    if ($b64 === '') {
        throw new ApiException('OpenAI ไม่ส่งภาพกลับมา (อาจถูกตัวกรองความปลอดภัยบล็อก ลองเปลี่ยนคำบรรยาย)', 502, 'NO_IMAGE');
    }
    $bin = base64_decode((string) $b64, true);
    if ($bin === false) {
        throw new ApiException('ถอดรหัสภาพจาก OpenAI ไม่ได้', 502, 'NO_IMAGE');
    }
    $ext = (str_starts_with($bin, "\xFF\xD8")) ? 'jpg' : 'png';
    return [$bin, $ext];
}

/** รายชื่อโมเดลที่คีย์ OpenAI ของคุณใช้ได้ (ใช้ใน check_models.php) */
function openai_list_models(): array
{
    $ch = curl_init(rtrim((string) cfg()['openai_base_url'], '/') . '/v1/models');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . openai_key()],
        CURLOPT_TIMEOUT        => 30,
    ]);
    $raw    = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $err    = curl_error($ch);
    curl_close($ch);
    if ($raw === false) {
        throw new ApiException('เชื่อมต่อ OpenAI ไม่ได้: ' . $err, 502, 'NETWORK');
    }
    $data = json_decode((string) $raw, true);
    if ($status !== 200 || !is_array($data)) {
        throw openai_error($status, (string) ($data['error']['message'] ?? mb_substr((string) $raw, 0, 200)), is_array($data) ? $data : [], 0.0);
    }
    return array_map(fn($m) => (string) ($m['id'] ?? ''), $data['data'] ?? []);
}
