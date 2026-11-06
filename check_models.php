<?php
declare(strict_types=1);

/**
 * ตรวจว่าชื่อโมเดลใน config.php ใช้ได้กับ API key ของคุณ (Gemini, OpenAI และ OpenRouter)
 * เปิดในเบราว์เซอร์:  http://localhost/AI/check_models.php
 */
require_once __DIR__ . '/src/ai/ai.php';

header('Content-Type: text/plain; charset=utf-8');
if (!is_authed()) {
    http_response_code(401);
    exit("กรุณาเข้าสู่ระบบที่หน้าแรกก่อน\n");
}

function check_section(string $title, bool $hasKey, callable $list, array $wanted, array $fallback, callable $hint): void
{
    echo "=== {$title}\n";
    if (!$hasKey) {
        echo "(ยังไม่ได้ใส่ API key ข้ามส่วนนี้)\n\n";
        return;
    }
    try {
        $available = $list();
    } catch (Throwable $e) {
        echo '❌ ' . $e->getMessage() . "\n\n";
        return;
    }
    $bad = false;
    foreach ($wanted as $label => $id) {
        $ok = in_array($id, $available, true);
        echo ($ok ? '✅' : '❌') . " {$label}: {$id}\n";
        $bad = $bad || !$ok;
    }
    foreach ($fallback as $label => $id) {
        $ok = in_array($id, $available, true);
        echo ($ok ? '✅' : '⚠️') . " {$label}: {$id}" . ($ok ? '' : '  (ไม่พบ: ถ้าโมเดลหลักหนาแน่นจะไม่มีตัวสำรอง ตั้งค่า fallback_models ใน config.php)') . "\n";
    }
    if ($bad) {
        $names = array_values(array_filter($available, $hint));
        sort($names);
        echo "\nโมเดลที่คีย์ของคุณใช้ได้ (ที่เกี่ยวข้อง):\n  " . implode("\n  ", $names) . "\n";
        echo "แก้ชื่อใน config.php ให้ตรงกับรายการข้างบน\n";
    } else {
        echo "ทุกโมเดลพร้อมใช้งาน\n";
    }
    echo "\n";
}

check_section(
    'Google Gemini' . (resolve_provider('text', null) === 'gemini' ? ' (ค่าเริ่มต้นสำหรับข้อความ)' : ''),
    provider_has_key('gemini'),
    function () {
        $available = [];
        $token = null;
        do {
            $res = gem_request('GET', '/v1beta/models?pageSize=200' . ($token ? '&pageToken=' . urlencode($token) : ''));
            foreach ($res['models'] ?? [] as $m) {
                $available[] = preg_replace('#^models/#', '', (string) $m['name']);
            }
            $token = $res['nextPageToken'] ?? null;
        } while ($token);
        return $available;
    },
    ['สร้างเนื้อหา' => gem_model('text'), 'ตรวจทาน' => gem_model('review'), 'สร้างภาพ' => gem_model('image')],
    ['สำรอง-เนื้อหา' => gem_fallback('text'), 'สำรอง-ตรวจทาน' => gem_fallback('review'), 'สำรอง-ภาพ' => gem_fallback('image')],
    fn($n) => str_starts_with($n, 'gemini-3')
);

check_section(
    'OpenAI' . (resolve_provider('text', null) === 'openai' ? ' (ค่าเริ่มต้นสำหรับข้อความ)' : ''),
    provider_has_key('openai'),
    fn() => openai_list_models(),
    ['สร้างเนื้อหา' => openai_model('text'), 'ตรวจทาน' => openai_model('review'), 'สร้างภาพ' => openai_model('image')],
    [],
    fn($n) => str_starts_with($n, 'gpt-')
);

echo "=== OpenRouter" . (resolve_provider('text', null) === 'openrouter' ? ' (ค่าเริ่มต้นสำหรับข้อความ)' : '') . "\n";
if (!provider_has_key('openrouter')) {
    echo "(ยังไม่ได้ใส่ API key ข้ามส่วนนี้)\n\n";
} else {
    try {
        $txt = array_column(or_list_models('text', true), 'id');
        $img = array_column(or_list_models('image', true), 'id');
        echo '✅ เชื่อมต่อได้ — โมเดลข้อความ ' . count($txt) . ' รายการ, โมเดลภาพ ' . count($img) . " รายการ\n";
        foreach (['text' => ['สร้างเนื้อหา', $txt], 'review' => ['ตรวจทาน', $txt], 'image' => ['สร้างภาพ', $img]] as $k => [$label, $list]) {
            $id = trim((string) (cfg()['openrouter_models'][$k] ?? ''));
            if ($id === '') {
                echo "ℹ️ {$label}: (ไม่ได้ตั้งใน config.php เลือกจากหน้าเว็บได้)\n";
            } else {
                echo (in_array($id, $list, true) ? '✅' : '❌') . " {$label}: {$id}\n";
            }
        }
        echo "(คีย์ถูกตรวจจริงตอนสร้างครั้งแรก เพราะรายชื่อโมเดลของ OpenRouter เปิดดูได้โดยไม่ต้องใช้คีย์)\n\n";
    } catch (Throwable $e) {
        echo '❌ ' . $e->getMessage() . "\n\n";
    }
}

echo 'ค่าเริ่มต้นตอนนี้: เนื้อหา/ตรวจ = ' . PROVIDER_LABEL[resolve_provider('text', null)]
   . ', ภาพ = ' . PROVIDER_LABEL[resolve_provider('image', null)] . "\n";
