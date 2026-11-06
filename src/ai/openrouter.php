<?php
declare(strict_types=1);

require_once __DIR__ . '/../core/core.php';
require_once __DIR__ . '/../core/settings.php';
require_once __DIR__ . '/gemini.php';  // gem_with_retry / gem_json / IMAGE_STYLE
require_once __DIR__ . '/openai.php';  // openai_strict_schema

/* ------------------------------------------------------------------ */
/*  OpenRouter: ประตูเดียวเรียกได้หลายร้อยโมเดล (รูปแบบเดียวกับ OpenAI)   */
/*  - ข้อความ: /chat/completions   - ภาพ: /images   - รายชื่อ: /models     */
/* ------------------------------------------------------------------ */

function or_has_key(): bool
{
    $k = trim((string) cfg()['openrouter_api_key']);
    return $k !== '' && !str_contains($k, 'ใส่_');
}

function or_key(): string
{
    if (!or_has_key()) {
        throw new ApiException('ยังไม่ได้ใส่ OpenRouter API key ในไฟล์ config.php (openrouter_api_key)', 500, 'NO_KEY');
    }
    return trim((string) cfg()['openrouter_api_key']);
}

/** ตรวจรูปแบบรหัสโมเดล เช่น google/gemini-3.8-flash หรือ meta-llama/x:free */
function or_valid_model(string $m): bool
{
    return $m !== '' && strlen($m) <= 120 && preg_match('#^[A-Za-z0-9._:~\-]+(/[A-Za-z0-9._:~\-]+)*$#', $m) === 1;
}

/**
 * โมเดลที่ใช้จริง: ค่าที่เลือกจากหน้าเว็บ (orModels) มาก่อน ถัดไปคือ config.php
 * ตรวจทาน (review) ถ้าไม่ได้เลือกจะใช้โมเดลเดียวกับสร้างเนื้อหา
 */
function or_model(string $which): string
{
    $req = $GLOBALS['REQ_BODY']['orModels'] ?? [];
    $cands = [
        ai_profile_model('openrouter', $which),
        is_array($req) ? (string) ($req[$which] ?? '') : '',
        (string) (cfg()['openrouter_models'][$which] ?? ''),
    ];
    if ($which === 'review') {
        $cands[] = is_array($req) ? (string) ($req['text'] ?? '') : '';
        $cands[] = (string) (cfg()['openrouter_models']['text'] ?? '');
    }
    foreach ($cands as $c) {
        $c = trim($c);
        if ($c !== '' && or_valid_model($c)) {
            return $c;
        }
    }
    $what = $which === 'image' ? 'สร้างภาพ' : 'สร้างเนื้อหา';
    throw new ApiException("ยังไม่ได้เลือกโมเดล OpenRouter สำหรับ{$what} กดปุ่ม “นำเข้ารายชื่อโมเดล” แล้วเลือก/พิมพ์ชื่อโมเดล (หรือตั้งใน config.php → openrouter_models)", 400, 'NO_MODEL');
}

/** ส่งคำขอ 1 ครั้ง คืน [status, data, retryAfterHeader, raw] */
function or_http(string $method, string $path, ?array $body = null, bool $auth = true, int $timeout = 150): array
{
    $c  = cfg();
    $ch = curl_init(rtrim((string) $c['openrouter_base_url'], '/') . $path);
    $retryHeader = 0.0;
    $headers = ['Content-Type: application/json', 'X-Title: ' . (string) $c['openrouter_app_name']];
    if (trim((string) $c['openrouter_site_url']) !== '') {
        $headers[] = 'HTTP-Referer: ' . trim((string) $c['openrouter_site_url']);
    }
    if ($auth && or_has_key()) {
        $headers[] = 'Authorization: Bearer ' . or_key();
    }
    $opts = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => $headers,
        CURLOPT_TIMEOUT        => $timeout,
        CURLOPT_CONNECTTIMEOUT => 15,
        CURLOPT_HEADERFUNCTION => function ($ch, $line) use (&$retryHeader) {
            if (stripos($line, 'retry-after:') === 0) {
                $retryHeader = (float) trim(substr($line, 12));
            }
            return strlen($line);
        },
    ];
    if ($method === 'POST') {
        $opts[CURLOPT_POST]       = true;
        $opts[CURLOPT_POSTFIELDS] = gem_json($body ?? []);
    }
    curl_setopt_array($ch, $opts);
    $raw    = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $err    = curl_error($ch);
    curl_close($ch);
    if ($raw === false) {
        throw new ApiException('เชื่อมต่อ OpenRouter ไม่ได้: ' . $err, 502, 'NETWORK');
    }
    $data = json_decode((string) $raw, true);
    return [$status, is_array($data) ? $data : [], $retryHeader, (string) $raw];
}

function or_error(int $status, string $msg, array $data, float $retryHeader): ApiException
{
    $msg = trim($msg);
    $low = strtolower($msg);
    if ($status === 402) {
        return new ApiException('เครดิต OpenRouter ไม่พอ (402) เติมเครดิตที่ openrouter.ai/credits หรือเลือกโมเดลที่ลงท้าย :free — ' . mb_substr($msg, 0, 160), 402, 'NO_CREDIT');
    }
    if ($status === 401) {
        return new ApiException('OpenRouter API key ไม่ถูกต้อง ตรวจ openrouter_api_key ใน config.php', 401, 'BAD_KEY');
    }
    if ($status === 403) {
        return new ApiException('OpenRouter ปฏิเสธการเข้าถึง (403): ' . mb_substr($msg, 0, 200), 403, 'FORBIDDEN');
    }
    if ($status === 429) {
        error_log('OpenRouter 429: ' . mb_substr($msg, 0, 400));
        return new ApiException('OpenRouter จำกัดอัตราการเรียก (429): ' . mb_substr($msg, 0, 240)
            . ($retryHeader > 0 ? ' — ให้รอประมาณ ' . (int) ceil($retryHeader) . ' วินาที' : ''), 429, 'RATE_LIMIT', $retryHeader);
    }
    if (($status === 404 || $status === 400) && (str_contains($low, 'no endpoints found') || str_contains($low, 'not a valid model') || str_contains($low, 'no allowed providers'))) {
        $sup = str_contains($low, 'support') || str_contains($low, 'parameter');
        return new ApiException($sup
            ? 'โมเดลนี้ไม่รองรับรูปแบบคำขอที่ใช้ (' . mb_substr($msg, 0, 160) . ') ลองเลือกโมเดลอื่น'
            : 'ไม่พบโมเดลนี้บน OpenRouter หรือยังไม่มีผู้ให้บริการ: ' . mb_substr($msg, 0, 160) . ' กดนำเข้ารายชื่อโมเดลแล้วเลือกใหม่',
            $sup ? 400 : 404, $sup ? 'MODEL_UNSUPPORTED' : 'MODEL_NOT_FOUND');
    }
    if ($status === 408 || $status === 500 || $status === 502 || $status === 503 || $status === 504) {
        return new ApiException('OpenRouter/ผู้ให้บริการโมเดลตอบข้อผิดพลาดชั่วคราว (' . $status . ') ' . mb_substr($msg, 0, 120) . ' ลองกดสร้างอีกครั้ง หรือเลือกโมเดลอื่น', 503, 'OVERLOADED');
    }
    return new ApiException("OpenRouter ตอบข้อผิดพลาด ($status): " . mb_substr($msg, 0, 240), $status >= 400 && $status < 600 ? $status : 500, 'OPENROUTER_' . $status);
}

/** POST พร้อมตรวจ error (รวมกรณีตอบ 200 แต่มี error อยู่ใน body ซึ่ง OpenRouter ทำได้) */
function or_post(string $path, array $body): array
{
    [$status, $data, $retry, $raw] = or_http('POST', $path, $body);
    if ($status >= 200 && $status < 300 && !isset($data['error']) && $data) {
        return $data;
    }
    $e = $data['error'] ?? [];
    $code = is_array($e) ? (int) ($e['code'] ?? 0) : 0;
    $msg = is_array($e) ? (string) ($e['message'] ?? '') : (string) $e;
    if (is_array($e) && isset($e['metadata']['raw']) && is_string($e['metadata']['raw'])) {
        $msg .= ' | ' . mb_substr($e['metadata']['raw'], 0, 160); // ข้อความจากผู้ให้บริการต้นทาง
    }
    $eff = $status >= 400 ? $status : ($code >= 400 ? $code : 502);
    throw or_error($eff, $msg !== '' ? $msg : mb_substr($raw, 0, 200), $data, $retry);
}

/** ดึง JSON ออกจากข้อความ (รองรับโมเดลที่ห่อด้วย ```json ... ```) */
function or_extract_json(string $text): ?array
{
    $t = trim($text);
    $t = preg_replace('/^```(?:json)?\s*|\s*```$/i', '', $t) ?? $t;
    $out = json_decode($t, true);
    if (is_array($out)) {
        return $out;
    }
    $a = strpos($t, '{');
    $z = strrpos($t, '}');
    if ($a !== false && $z !== false && $z > $a) {
        $out = json_decode(substr($t, $a, $z - $a + 1), true);
        return is_array($out) ? $out : null;
    }
    return null;
}

/** สร้างข้อความเป็น JSON ตาม schema ($which = 'text' | 'review') */
function or_generate_json(string $which, string $system, string $prompt, array $schema, int $maxTokens = 8192): array
{
    $model = or_model($which);
    $base = [
        'model'      => $model,
        'messages'   => [['role' => 'system', 'content' => $system], ['role' => 'user', 'content' => $prompt]],
        'max_tokens' => $maxTokens * 2, // โมเดลแบบคิดจะนับ token ที่คิดรวมด้วย จึงเผื่อ
    ];
    $strict = $base + [
        'response_format' => ['type' => 'json_schema', 'json_schema' => ['name' => 'worksheet', 'strict' => true, 'schema' => openai_strict_schema($schema)]],
        'provider'        => ['require_parameters' => true], // ใช้เฉพาะผู้ให้บริการที่รองรับ schema จริง
    ];
    set_time_limit(240);
    try {
        $res = gem_with_retry(fn() => or_post('/chat/completions', $strict));
    } catch (ApiException $e) {
        if ($e->errCode !== 'MODEL_UNSUPPORTED') {
            throw $e;
        }
        // โมเดลไม่รองรับ structured output → ฝัง schema ไว้ในคำสั่งแทน แล้วขอเป็น JSON ล้วน
        error_log("OpenRouter: {$model} ไม่รองรับ json_schema ใช้โหมดสำรอง (schema ในพรอมต์)");
        $fb = $base;
        $fb['messages'][0]['content'] = $system . "\n\nตอบเป็น JSON ล้วนเพียงออบเจ็กต์เดียว (ห้ามมีข้อความอื่นหรือ ```) ให้ตรงตาม JSON Schema นี้:\n"
            . json_encode($schema, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $fb['response_format'] = ['type' => 'json_object'];
        try {
            $res = gem_with_retry(fn() => or_post('/chat/completions', $fb));
        } catch (ApiException $e2) {
            if ($e2->errCode !== 'MODEL_UNSUPPORTED') {
                throw $e2;
            }
            unset($fb['response_format']); // บางโมเดลไม่รับแม้แต่ json_object
            $res = gem_with_retry(fn() => or_post('/chat/completions', $fb));
        }
    }

    $choice = $res['choices'][0] ?? [];
    if (!empty($choice['message']['refusal'])) {
        throw new ApiException('โมเดลปฏิเสธการตอบ: ' . mb_substr((string) $choice['message']['refusal'], 0, 160), 502, 'REFUSED');
    }
    if (($choice['finish_reason'] ?? '') === 'length') {
        throw new ApiException('คำตอบของ AI ถูกตัดกลางทางเพราะ token เต็ม (length) ลองโมเดลที่ตอบยาวได้มากขึ้น', 502, 'TRUNCATED');
    }
    $content = $choice['message']['content'] ?? '';
    if (is_array($content)) { // บางโมเดลส่งเป็นชิ้นๆ
        $content = implode('', array_map(fn($p) => (string) ($p['text'] ?? ''), $content));
    }
    $text = (string) $content;
    if (trim($text) === '') {
        throw new ApiException('AI ไม่ตอบข้อความกลับมา', 502, 'EMPTY');
    }
    $out = or_extract_json($text);
    if ($out === null) {
        throw new ApiException('AI ตอบกลับมาไม่ใช่ JSON ที่ถูกต้อง (โมเดล ' . $model . ' อาจไม่เก่งเรื่องรูปแบบ JSON ลองเลือกรุ่นอื่น)', 502, 'BAD_JSON');
    }
    return $out;
}

/** แปลง data URI / URL ของภาพเป็น binary */
function or_image_from_ref(string $ref): ?string
{
    if (preg_match('#^data:image/[a-z0-9.+-]+;base64,(.+)$#is', $ref, $m)) {
        $bin = base64_decode($m[1], true);
        return $bin === false ? null : $bin;
    }
    return null;
}

/** สร้างภาพลายเส้น คืน [binary, ext] — ลอง /images ก่อน ถ้าโมเดลไม่ได้อยู่ในกลุ่มนี้ใช้ chat + modalities แทน */
function or_generate_image(string $subject): array
{
    $model  = or_model('image');
    $prompt = image_full_prompt($subject);
    set_time_limit(240);
    $bin = null;
    try {
        $res = gem_with_retry(fn() => or_post('/images', ['model' => $model, 'prompt' => $prompt, 'n' => 1]));
        $b64 = $res['data'][0]['b64_json'] ?? '';
        $bin = $b64 !== '' ? base64_decode((string) $b64, true) : false;
        if (!$bin && !empty($res['data'][0]['url'])) {
            $bin = or_image_from_ref((string) $res['data'][0]['url']);
        }
    } catch (ApiException $e) {
        if (!in_array($e->errCode, ['MODEL_NOT_FOUND', 'MODEL_UNSUPPORTED', 'OPENROUTER_400', 'OPENROUTER_404', 'OPENROUTER_405'], true)) {
            throw $e;
        }
        error_log("OpenRouter: /images ใช้กับ {$model} ไม่ได้ ({$e->getMessage()}) ลองทางแชต");
        $res = gem_with_retry(fn() => or_post('/chat/completions', [
            'model'      => $model,
            'messages'   => [['role' => 'user', 'content' => $prompt]],
            'modalities' => ['image', 'text'],
        ]));
        foreach ((array) ($res['choices'][0]['message']['images'] ?? []) as $img) {
            $bin = or_image_from_ref((string) ($img['image_url']['url'] ?? ''));
            if ($bin) {
                break;
            }
        }
    }
    if (!$bin) {
        throw new ApiException('OpenRouter ไม่ส่งภาพกลับมา (โมเดลนี้อาจไม่ใช่โมเดลสร้างภาพ หรือถูกตัวกรองบล็อก) ลองเลือกโมเดลภาพอื่น', 502, 'NO_IMAGE');
    }
    return [$bin, str_starts_with($bin, "\xFF\xD8") ? 'jpg' : 'png'];
}

/** แปลงราคา "ต่อ token" (สตริง) เป็น "ต่อ 1 ล้าน token" */
function or_per_million($v): ?float
{
    return is_numeric($v) && (float) $v >= 0 ? round((float) $v * 1000000, 3) : null; // ติดลบ = ราคาแปรผัน (เช่น auto router)
}

/**
 * นำเข้ารายชื่อโมเดลจาก OpenRouter ($kind = 'text' | 'image') เก็บแคช 1 ชั่วโมงใน data/
 * คืน [{id,name,ctx,in,out,free,structured}] เรียงตามชื่อ
 */
function or_list_models(string $kind, bool $refresh = false): array
{
    $kind  = $kind === 'image' ? 'image' : 'text';
    $cache = 'or_models_' . $kind . '.json';
    $age = store_list('settings', $cache)[$cache]['mtime'] ?? 0;
    if (!$refresh && $age && time() - $age < 3600) {
        $c = store_json_get('settings', $cache);
        if (is_array($c) && $c) {
            return $c;
        }
    }
    [$status, $data, $retry, $raw] = or_http('GET', $kind === 'image' ? '/images/models' : '/models', null, true, 40);
    if ($status !== 200 || !isset($data['data']) || !is_array($data['data'])) {
        $m = is_array($data['error'] ?? null) ? (string) ($data['error']['message'] ?? '') : '';
        throw or_error($status ?: 502, $m !== '' ? $m : 'ดึงรายชื่อโมเดลไม่สำเร็จ: ' . mb_substr($raw, 0, 160), $data, $retry);
    }
    $rows = $data['data'];
    if ($kind === 'image') { // รวมโมเดลแชตที่ "ตอบเป็นภาพ" ได้ (ใช้ผ่าน chat + modalities) ด้วย
        try {
            [$st2, $d2] = or_http('GET', '/models', null, true, 40);
            foreach (($st2 === 200 ? (array) ($d2['data'] ?? []) : []) as $m) {
                if (in_array('image', (array) ($m['architecture']['output_modalities'] ?? []), true)) {
                    $rows[] = $m;
                }
            }
        } catch (ApiException $e) {
            // ไม่เป็นไร ใช้รายการจาก /images/models อย่างเดียว
        }
    }
    $out = [];
    $seen = [];
    foreach ($rows as $m) {
        $id = (string) ($m['id'] ?? '');
        if ($id === '' || !or_valid_model($id) || isset($seen[$id])) {
            continue;
        }
        $seen[$id] = true;
        $arch = (array) ($m['architecture'] ?? []);
        $outMods = (array) ($arch['output_modalities'] ?? []);
        $sup  = (array) ($m['supported_parameters'] ?? []);
        if ($kind === 'text' && (!in_array('text', $outMods, true) || in_array('image', $outMods, true))) {
            continue; // โมเดลข้อความเท่านั้น (ภาพไปอยู่อีกรายการ)
        }
        $pin  = or_per_million($m['pricing']['prompt'] ?? null);
        $pout = or_per_million($m['pricing']['completion'] ?? null);
        $out[] = [
            'id'         => $id,
            'name'       => (string) ($m['name'] ?? $id),
            'ctx'        => (int) ($m['context_length'] ?? 0),
            'in'         => $pin,
            'out'        => $pout,
            'free'       => str_ends_with($id, ':free') || ($pin === 0.0 && $pout === 0.0),
            'structured' => in_array('structured_outputs', $sup, true) || in_array('response_format', $sup, true),
        ];
    }
    usort($out, fn($a, $b) => strcasecmp($a['name'], $b['name']));
    if ($out) {
        try {
            store_json_put('settings', $cache, $out);
        } catch (ApiException $e) { // แคชเขียนไม่ได้ก็ไม่เป็นไร
        }
    }
    return $out;
}
