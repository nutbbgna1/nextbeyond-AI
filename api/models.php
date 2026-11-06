<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/ai/ai.php';

/** POST { provider:'openrouter', kind:'text'|'image', refresh? } → { models:[...], count } (นำเข้ารายชื่อโมเดล) */
try {
    $b = api_guard();
    if (($b['provider'] ?? 'openrouter') !== 'openrouter') {
        json_out(['error' => 'รองรับการนำเข้ารายชื่อเฉพาะ OpenRouter'], 400);
    }
    $kind   = ($b['kind'] ?? 'text') === 'image' ? 'image' : 'text';
    $models = or_list_models($kind, !empty($b['refresh']));
    json_out(['models' => $models, 'count' => count($models), 'kind' => $kind]);
} catch (Throwable $e) {
    json_error($e);
}
