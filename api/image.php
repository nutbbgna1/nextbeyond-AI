<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/ai/ai.php';
require_once __DIR__ . '/../src/core/store.php';

function image_key(string $provider, string $prompt): string
{
    // รวมผู้ให้บริการ โมเดล และสไตล์ไว้ใน key: เปลี่ยนเมื่อไหร่ ภาพเก่าจะไม่ถูกใช้ซ้ำ
    return sha1($provider . '|' . ai_image_model($provider) . '|' . IMAGE_STYLE . '|' . mb_strtolower(trim($prompt)));
}

function image_file(string $id): ?string
{
    foreach (['png', 'jpg'] as $ext) {
        if (store_has('images', "{$id}.{$ext}")) {
            return "{$id}.{$ext}";
        }
    }
    return null;
}

/** POST { prompt, force? } → { id, url, cached } */
try {
    $b = api_guard();
    $prompt = mb_substr(trim((string) ($b['prompt'] ?? '')), 0, 300);
    if ($prompt === '') {
        json_out(['error' => 'ไม่มีคำบรรยายภาพ'], 400);
    }
    $provider = resolve_provider('image', $b['imageProvider'] ?? null);
    $id  = image_key($provider, $prompt);
    $url = "api/img.php?id={$id}";

    // ใช้ซ้ำจากคลังภาพ (ประหยัดค่า API) เว้นแต่ครูกด "สร้างภาพใหม่"
    if (empty($b['force']) && image_file($id)) {
        json_out(['id' => $id, 'url' => $url, 'cached' => true]);
    }

    require_provider($provider);
    check_quota(1); // นับโควตาเฉพาะตอนที่สร้างภาพใหม่จริงๆ
    [$data, $ext] = ai_generate_image($provider, $prompt);
    [$data, $ext] = image_shrink($data, $ext); // ย่อ + บีบเป็น JPEG ก่อนเก็บ (ภาพละหลายร้อย KB → ราว 50-120 KB)
    $saved = false;
    try {
        foreach (['png', 'jpg'] as $e) { // ลบไฟล์เก่าของ key เดียวกัน (กรณีสร้างใหม่แล้วนามสกุลเปลี่ยน)
            store_del('images', "{$id}.{$e}");
        }
        store_put('images', "{$id}.{$ext}", $data);
        $saved = true;
    } catch (ApiException $e) {
        $saved = false;
    }
    if (!$saved) {
        // เก็บไฟล์ไม่ได้เลย: ส่งภาพกลับไปให้หน้าเว็บแสดงโดยตรง (ภาพที่จ่ายเงินสร้างแล้วจะไม่เสียเปล่า)
        error_log('บันทึกภาพไม่ได้ (สิทธิ์โฟลเดอร์ data/images) ส่งภาพกลับแบบ inline แทน');
        json_out(['id' => $id, 'url' => 'data:' . ($ext === 'jpg' ? 'image/jpeg' : 'image/png') . ';base64,' . base64_encode($data), 'cached' => false, 'inline' => true]);
    }
    json_out(['id' => $id, 'url' => $url . '&v=' . time(), 'cached' => false]);
} catch (Throwable $e) {
    json_error($e);
}
