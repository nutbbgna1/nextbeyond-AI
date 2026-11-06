<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/ai/ai.php';

/**
 * ตั้งค่า AI
 *   get                                  → { keys, default, features, meta, configModels }
 *   save { default, features, keys:{gemini?,openai?,openrouter?}, clearKeys:[...] }
 *   models { provider, kind:'text'|'image', refresh? } → { models:[{id,name?...}] }
 *   test { provider, model }             → { ok, ms, reply }  (ยิงคำขอเล็กๆ 1 ครั้งด้วยคีย์/โมเดลที่ระบุ)
 */
try {
    $b = api_guard();
    $action = (string) ($b['action'] ?? '');
    if (defined('TA_IS_ADMIN') && !TA_IS_ADMIN) { // ฝังใน nextbeyond: คีย์ AI เป็นของส่วนกลาง ให้แอดมินแก้เท่านั้น
        json_out(['error' => 'เฉพาะผู้ดูแลระบบ (Admin) ที่ตั้งค่า AI ได้'], 403);
    }

    if ($action === 'get') {
        $s = settings_read(true);
        $meta = [];
        foreach (AI_FEATURES as $id => $m) {
            $meta[] = ['id' => $id, 'name' => $m[0], 'desc' => $m[1], 'image' => $m[2]];
        }
        $feat = [];
        foreach (AI_FEATURES as $id => $_) {
            $feat[$id] = ai_clean_profile($s['features'][$id] ?? []);
        }
        json_out([
            'keys' => settings_key_status(),
            'default' => ai_clean_profile($s['default'] ?? []),
            'features' => $feat,
            'meta' => $meta,
            'configModels' => [
                'gemini' => (array) (cfg()['models'] ?? []),
                'openai' => (array) (cfg()['openai_models'] ?? []),
                'openrouter' => (array) (cfg()['openrouter_models'] ?? []),
            ],
            'configProviders' => ['text' => (string) cfg()['text_provider'], 'image' => (string) cfg()['image_provider']],
        ]);
    }

    if ($action === 'save') {
        $s = settings_read(true);
        $keys = (array) ($s['keys'] ?? []);
        foreach (['gemini', 'openai', 'openrouter'] as $prov) {
            $v = trim((string) (($b['keys'] ?? [])[$prov] ?? ''));
            if ($v !== '') {
                if (!preg_match('/^[\x21-\x7E]{8,300}$/', $v)) {
                    json_out(['error' => 'คีย์ ' . PROVIDER_LABEL[$prov] . ' ไม่ถูกต้อง (ต้องเป็นอักขระ ASCII ไม่มีช่องว่าง ยาว 8 ตัวขึ้นไป)'], 400);
                }
                $keys[$prov] = $v;
            }
        }
        foreach ((array) ($b['clearKeys'] ?? []) as $prov) {
            unset($keys[(string) $prov]);
        }
        $features = [];
        foreach (AI_FEATURES as $id => $_) {
            $p = ai_clean_profile(($b['features'] ?? [])[$id] ?? []);
            if (array_filter($p, fn($x) => $x !== '')) {
                $features[$id] = $p;
            }
        }
        settings_write(['keys' => $keys, 'default' => ai_clean_profile($b['default'] ?? []), 'features' => $features, 'savedAt' => date('c')]);
        json_out(['ok' => true, 'keys' => settings_key_status()]);
    }

    if ($action === 'models') {
        $prov = (string) ($b['provider'] ?? '');
        $kind = ($b['kind'] ?? 'text') === 'image' ? 'image' : 'text';
        if (!in_array($prov, PROVIDERS, true)) {
            json_out(['error' => 'ผู้ให้บริการไม่ถูกต้อง'], 400);
        }
        require_provider($prov);
        if ($prov === 'openrouter') {
            $rows = or_list_models($kind, !empty($b['refresh']));
        } elseif ($prov === 'openai') {
            $rows = [];
            foreach (array_unique(openai_list_models()) as $id) {
                $isImg = (bool) preg_match('/image|dall/i', $id);
                $skip = (bool) preg_match('/embed|whisper|tts|audio|moderation|realtime|transcribe|search|computer|davinci|babbage/i', $id);
                if ($id !== '' && !$skip && $isImg === ($kind === 'image')) {
                    $rows[] = ['id' => $id];
                }
            }
            usort($rows, fn($a, $c) => strcmp($a['id'], $c['id']));
        } else {
            $rows = [];
            $token = null;
            do {
                $res = gem_request('GET', '/v1beta/models?pageSize=200' . ($token ? '&pageToken=' . urlencode($token) : ''));
                foreach ((array) ($res['models'] ?? []) as $m) {
                    $id = preg_replace('#^models/#', '', (string) ($m['name'] ?? ''));
                    $methods = (array) ($m['supportedGenerationMethods'] ?? []);
                    $isImg = (bool) preg_match('/image|imagen/i', $id);
                    if ($id !== '' && in_array('generateContent', $methods, true) && $isImg === ($kind === 'image') && !preg_match('/embed|tts|audio|live|robotics|computer-use/i', $id)) {
                        $rows[] = ['id' => $id, 'name' => (string) ($m['displayName'] ?? '')];
                    }
                }
                $token = $res['nextPageToken'] ?? null;
            } while ($token);
            usort($rows, fn($a, $c) => strcmp($a['id'], $c['id']));
        }
        json_out(['models' => $rows, 'count' => count($rows)]);
    }

    if ($action === 'test') {
        $prov = (string) ($b['provider'] ?? '');
        if (!in_array($prov, PROVIDERS, true)) {
            json_out(['error' => 'ผู้ให้บริการไม่ถูกต้อง'], 400);
        }
        $model = trim((string) ($b['model'] ?? ''));
        $GLOBALS['AI_FORCE'] = ['provider' => $prov, 'model' => preg_match('#^[A-Za-z0-9._:~\-/ ]{0,120}$#', $model) ? $model : ''];
        require_provider($prov);
        check_quota(1);
        $t = microtime(true);
        $r = ai_generate_json($prov, 'text', 'ตอบเป็น JSON ตามที่กำหนดเท่านั้น', 'ทดสอบการเชื่อมต่อ: ใส่ ok เป็น true และ word เป็นคำว่า สวัสดี', ['type' => 'object', 'properties' => ['ok' => ['type' => 'boolean'], 'word' => ['type' => 'string']], 'required' => ['ok', 'word'], 'additionalProperties' => false], 256);
        json_out(['ok' => true, 'ms' => (int) round((microtime(true) - $t) * 1000), 'reply' => mb_substr((string) ($r['word'] ?? ''), 0, 40)]);
    }

    json_out(['error' => 'action ไม่ถูกต้อง'], 400);
} catch (Throwable $e) {
    json_error($e);
}
