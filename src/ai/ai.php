<?php
declare(strict_types=1);

require_once __DIR__ . '/../core/core.php';
require_once __DIR__ . '/../core/settings.php';
require_once __DIR__ . '/gemini.php';
require_once __DIR__ . '/openai.php';
require_once __DIR__ . '/openrouter.php';

/* ------------------------------------------------------------------ */
/*  ตัวกลางเลือกผู้ให้บริการ: gemini | openai | openrouter                           */
/* ------------------------------------------------------------------ */

const PROVIDERS = ['gemini', 'openai', 'openrouter'];
const PROVIDER_LABEL = ['gemini' => 'Google Gemini', 'openai' => 'OpenAI', 'openrouter' => 'OpenRouter'];

function provider_has_key(string $p): bool
{
    if ($p === 'openai') {
        return openai_has_key();
    }
    if ($p === 'openrouter') {
        return or_has_key();
    }
    $k = trim((string) cfg()['api_key']);
    return $k !== '' && !str_contains($k, 'ใส่_');
}

/** $kind = 'text' | 'image'; ค่าจากหน้าเว็บ (ถ้าถูกต้อง) มาก่อนค่าใน config.php */
function resolve_provider(string $kind, $requested): string
{
    $set = ai_profile()[$kind . 'Provider']; // ตั้งจากหน้า Settings มาก่อน
    $p = $set !== '' ? $set : (is_string($requested) && in_array($requested, PROVIDERS, true)
        ? $requested
        : (string) cfg()[$kind . '_provider']);
    return in_array($p, PROVIDERS, true) ? $p : 'gemini';
}

/** ตรวจว่าผู้ให้บริการที่เลือกมี API key แล้ว ถ้าไม่มีให้แจ้งชัดเจนก่อนเสียโควตา */
function require_provider(string $p): void
{
    if (!provider_has_key($p)) {
        $field = ['openai' => 'openai_api_key', 'openrouter' => 'openrouter_api_key'][$p] ?? 'api_key';
        throw new ApiException('ยังไม่ได้ใส่ API key ของ ' . PROVIDER_LABEL[$p] . ' ในไฟล์ config.php (' . $field . ') หรือเลือกผู้ให้บริการอื่นในหน้าเว็บ', 500, 'NO_KEY');
    }
}

function ai_generate_json(string $provider, string $which, string $system, string $prompt, array $schema, int $maxTokens = 8192, ?string $thinking = null): array
{
    if ($provider === 'openai') {
        return openai_generate_json($which, $system, $prompt, $schema, $maxTokens);
    }
    if ($provider === 'openrouter') {
        return or_generate_json($which, $system, $prompt, $schema, $maxTokens);
    }
    return gem_generate_json($which, $system, $prompt, $schema, $maxTokens, $thinking);
}

function ai_generate_image(string $provider, string $subject): array
{
    if ($provider === 'openai') {
        return openai_generate_image($subject);
    }
    return $provider === 'openrouter' ? or_generate_image($subject) : gem_generate_image($subject);
}

/** ชื่อโมเดลภาพที่ใช้จริง (ใช้เป็นส่วนหนึ่งของคีย์คลังภาพ) */
function ai_image_model(string $provider): string
{
    if ($provider === 'openrouter') {
        return 'or:' . or_model('image');
    }
    return $provider === 'openai' ? openai_model('image') : gem_model('image');
}
