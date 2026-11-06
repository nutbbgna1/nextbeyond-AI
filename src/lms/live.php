<?php
declare(strict_types=1);

require_once __DIR__ . '/lms.php';
require_once __DIR__ . '/../worksheet/bank.php';
require_once __DIR__ . '/../planning/exam.php';

/* ------------------------------------------------------------------ */
/*  เชื่อม teacher-ai กับห้องสด (live-sessions) ของ nextbeyond            */
/*  Pulse = คำถามสั้นที่ยิงเข้าห้องสดกลางคาบ (ตาราง session_pulse_questions)  */
/* ------------------------------------------------------------------ */

const LIVE_KEYS = ['A', 'B', 'C', 'D', 'E', 'F'];

function live_ensure(PDO $pdo): void
{
    $f = lms_root() . '/includes/live-sessions-helper.php';
    if (!is_file($f)) {
        throw new ApiException('ไม่พบ includes/live-sessions-helper.php ของ nextbeyond', 500, 'NO_LIVE');
    }
    require_once $f;
    ensureLiveSessionSchema($pdo);
}

/** ห้องสดที่กำลังเปิดอยู่ของครูคนนี้ (แอดมินเห็นทุกห้อง) */
function live_sessions(): array
{
    $pdo = lms_pdo();
    live_ensure($pdo);
    $admin = defined('TA_IS_ADMIN') && TA_IS_ADMIN;
    $sql = "SELECT s.id, s.title, s.session_pin, s.started_at, s.teacher_id,
                   (SELECT COUNT(*) FROM session_participants p WHERE p.session_id = s.id) AS students
            FROM classroom_sessions s WHERE s.status = 'active'" . ($admin ? '' : ' AND s.teacher_id = ?') . ' ORDER BY s.started_at DESC LIMIT 50';
    $st = $pdo->prepare($sql);
    $st->execute($admin ? [] : [lms_user()['id']]);
    return array_map(fn($r) => [
        'id' => (string) $r['id'], 'title' => (string) $r['title'], 'pin' => (string) $r['session_pin'],
        'students' => (int) $r['students'], 'startedAt' => (string) $r['started_at'],
    ], $st->fetchAll(PDO::FETCH_ASSOC));
}

function live_session_allowed(string $sessionId): bool
{
    foreach (live_sessions() as $s) {
        if ($s['id'] === $sessionId) {
            return true;
        }
    }
    return false;
}

/**
 * ข้อในคลังข้อสอบ → Pulse {text, options:[{key,text}], correctKey, notes[]}  คืน null ถ้ายิงเป็น Pulse ไม่ได้
 * @return array{0: ?array, 1: string[]}
 */
function live_pulse_from_bank(string $bankId): array
{
    $e = bank_read()[$bankId] ?? null;
    if (!is_array($e)) {
        throw new ApiException('ไม่พบข้อนี้ในคลังข้อสอบ', 404, 'NOT_FOUND');
    }
    $type = (string) ($e['type'] ?? '');
    if ($type === 'exam') {
        $type = ($e['part'] ?? '') === 'mc' ? 'multiple_choice' : '';
    }
    if (!in_array($type, ['multiple_choice', 'true_false', 'matching', 'multi_statement', 'data_set'], true)) {
        return [null, ['โจทย์ชนิดนี้ยิงเป็น Pulse ไม่ได้ (Pulse รองรับเฉพาะข้อเลือกตอบ ถูก/ผิด จับคู่)']];
    }
    $item = (array) ($e['item'] ?? []);
    [$qs, $notes] = lms_sheet_to_questions(['type' => $type, 'topic' => (string) ($e['topic'] ?? ''), 'items' => [$item]], [], (string) ($e['subject'] ?? ''), true);
    $q = $qs[0] ?? null;
    $opts = $q ? (json_decode((string) ($q['options'] ?? ''), true) ?: []) : [];
    if (!$q || ($q['question_type'] ?? '') !== 'multipleChoice' || count($opts) < 2 || count($opts) > count(LIVE_KEYS)) {
        return [null, $notes ?: ['ข้อนี้แปลงเป็นข้อเลือกตอบไม่ได้']];
    }
    $correct = array_search((string) $q['correct_answer'], array_map('strval', $opts), true);
    $options = [];
    foreach (array_values($opts) as $i => $t) {
        $options[] = ['key' => LIVE_KEYS[$i], 'text' => (string) $t];
    }
    return [[
        'text' => (string) $q['question_text'],
        'options' => $options,
        'correctKey' => $correct === false ? null : LIVE_KEYS[(int) $correct],
        'explanation' => (string) ($q['explanation'] ?? ''),
    ], $notes];
}

/** ยิง Pulse เข้าห้องสด (ปิดข้อที่เปิดอยู่ก่อน เหมือนปุ่มยิงเดิมของห้องสด) คืน [questionId, expiresAt] */
function live_push(string $sessionId, array $pulse, ?int $seconds): array
{
    $pdo = lms_pdo();
    if (!live_session_allowed($sessionId)) {
        throw new ApiException('ไม่พบห้องสดนี้ หรือห้องปิดไปแล้ว หรือคุณไม่ใช่เจ้าของห้อง', 403, 'FORBIDDEN');
    }
    $dur = $seconds !== null && $seconds > 0 ? max(10, min(600, $seconds)) : null;
    $exp = $dur ? date('Y-m-d H:i:s', time() + $dur) : null;
    $pdo->prepare('UPDATE session_pulse_questions SET is_active = 0, closed_at = NOW() WHERE session_id = ? AND is_active = 1')->execute([$sessionId]);
    $id = 'pq-' . time() . '-' . random_int(1000, 9999);
    $pdo->prepare('INSERT INTO session_pulse_questions (id, session_id, question_text, options, correct_key, is_active, expires_at) VALUES (?, ?, ?, ?, ?, 1, ?)')
        ->execute([$id, $sessionId, $pulse['text'], json_encode($pulse['options'], JSON_UNESCAPED_UNICODE), $pulse['correctKey'], $exp]);
    $pdo->prepare('UPDATE classroom_sessions SET updated_at = NOW() WHERE id = ?')->execute([$sessionId]);
    return [$id, $exp];
}

/* ---------------- เปิดห้องสดจากข้อสอบของ teacher-ai ---------------- */

/** เตรียมตาราง exams / exam_questions ให้มีคอลัมน์ที่ใช้ (เหมือน ensureExamSchema ของ ai-exam-app) */
function live_ensure_exam_schema(PDO $pdo): void
{
    foreach (['exams', 'exam_questions'] as $t) {
        if (!lms_table_exists($pdo, $t)) {
            throw new ApiException("ยังไม่มีตาราง {$t} ในฐานข้อมูลของ LMS", 400, 'NO_TABLE');
        }
    }
    $cols = function (string $t) use ($pdo): array {
        $o = [];
        foreach ($pdo->query("SHOW COLUMNS FROM `{$t}`")->fetchAll(PDO::FETCH_ASSOC) as $c) {
            $o[(string) $c['Field']] = (string) $c['Type'];
        }
        return $o;
    };
    $e = $cols('exams');
    foreach ([
        'is_published'    => "ADD COLUMN `is_published` TINYINT(1) NOT NULL DEFAULT 0",
        'requires_login'  => "ADD COLUMN `requires_login` TINYINT(1) NOT NULL DEFAULT 1",
    ] as $n => $def) {
        if (!isset($e[$n])) {
            $pdo->exec("ALTER TABLE `exams` {$def}");
        }
    }
    if (!str_contains(strtolower($e['type'] ?? ''), "'quiz'")) {
        $pdo->exec("ALTER TABLE `exams` MODIFY COLUMN `type` ENUM('pretest','posttest','quiz','placement') NOT NULL DEFAULT 'quiz'");
    }
    if (!str_contains(strtolower($e['status'] ?? ''), "'archived'")) {
        $pdo->exec("ALTER TABLE `exams` MODIFY COLUMN `status` ENUM('draft','active','closed','archived') NOT NULL DEFAULT 'draft'");
    }
    $q = $cols('exam_questions');
    foreach ([
        'passage'    => "ADD COLUMN `passage` MEDIUMTEXT NULL AFTER `question_text`",
        'difficulty' => "ADD COLUMN `difficulty` VARCHAR(50) NULL AFTER `skill`",
        'created_at' => "ADD COLUMN `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP",
    ] as $n => $def) {
        if (!isset($q[$n])) {
            $pdo->exec("ALTER TABLE `exam_questions` {$def}");
        }
    }
}

/**
 * ข้อสอบ teacher-ai → แถวในตาราง exams (ข้อสอบแบบเลขลำดับที่ห้องสดใช้) ไม่เผยแพร่ในคลังนักเรียน
 * ใช้ของเดิมถ้าเนื้อหาไม่เปลี่ยน คืน [examId, questionCount, notes[], reused]
 */
function live_publish_exam_row(array &$doc, int $minutes, string $key = 'liveExam', string $prefix = '[ห้องสด] ', string $status = 'active'): array
{
    $pdo = lms_pdo();
    live_ensure_exam_schema($pdo);
    lms_ensure_schema($pdo);
    [$qs, $notes] = lms_exam_questions($doc);
    $rows = [];
    foreach ($qs as $q) {
        $opts = json_decode((string) ($q['options'] ?? ''), true);
        if (($q['question_type'] ?? '') !== 'multipleChoice' || !is_array($opts) || count($opts) < 2) {
            continue;
        }
        $idx = array_search((string) $q['correct_answer'], array_map('strval', $opts), true);
        if ($idx === false) {
            continue;
        }
        $rows[] = ['text' => (string) $q['question_text'], 'options' => array_values($opts), 'correct' => (int) $idx, 'explain' => (string) ($q['explanation'] ?? ''), 'skill' => (string) ($q['skill'] ?? ''), 'difficulty' => (string) ($q['difficulty'] ?? '')];
    }
    if (!$rows) {
        throw new ApiException('ไม่มีข้อที่เปิดในห้องสดได้ (ต้องมีส่วนปรนัย ถูก/ผิด หรือจับคู่)', 422, 'NO_QUESTIONS');
    }
    $hash = sha1(json_encode([$rows, $minutes], JSON_UNESCAPED_UNICODE));
    $prev = (array) ($doc['lms'][$key] ?? []);
    if (!empty($prev['examId']) && ($prev['hash'] ?? '') === $hash) {
        $chk = $pdo->prepare("SELECT id FROM exams WHERE id = ? AND status <> 'archived'");
        $chk->execute([(int) $prev['examId']]);
        if ($chk->fetchColumn()) {
            return [(int) $prev['examId'], count($rows), $notes, true];
        }
    }
    $u = lms_user();
    $pdo->beginTransaction();
    try {
        $pdo->prepare("INSERT INTO exams (title, subject, grade, topic, difficulty, type, time_limit_minutes, is_ai_generated, created_by, status, is_published, requires_login)
            VALUES (?, ?, ?, ?, ?, 'quiz', ?, 1, ?, ?, 0, 1)")
            ->execute([
                mb_substr($prefix . trim((string) ($doc['title'] ?? 'ข้อสอบ')), 0, 250), mb_substr(trim((string) ($doc['subject'] ?? '')) ?: 'ทั่วไป', 0, 100),
                mb_substr(trim((string) ($doc['grade'] ?? '')) ?: 'ทุกระดับ', 0, 50), mb_substr((string) ($doc['title'] ?? ''), 0, 150), null,
                $minutes > 0 ? $minutes : null, $u['id'], $status,
            ]);
        $eid = (int) $pdo->lastInsertId();
        $qi = $pdo->prepare('INSERT INTO exam_questions (exam_id, sort_order, question_text, passage, options, correct_answer, explanation, skill, difficulty) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?)');
        foreach ($rows as $n => $r) {
            $qi->execute([$eid, $n + 1, $r['text'], json_encode($r['options'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), $r['correct'], $r['explain'] ?: null, $r['skill'] ?: null, $r['difficulty'] ?: null]);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
    try {
        lms_add_canonical_columns($pdo);
        $f = lms_root() . '/includes/phase4-adaptive-service.php';
        if (is_file($f)) {
            require_once $f;
            (new \NextBeyond\Adaptive\CanonicalQuestionRepository($pdo))->syncExam($eid);
        }
    } catch (Throwable $e) {
        error_log('teacher-ai sync exam bank: ' . $e->getMessage());
    }
    $lmsRec = (array) ($doc['lms'] ?? []);
    $lmsRec[$key] = ['examId' => $eid, 'hash' => $hash, 'at' => date('c')];
    $doc['lms'] = $lmsRec;
    return [$eid, count($rows), $notes, false];
}

/** เปิดห้องสดใหม่ผูกกับข้อสอบ (ทำเหมือนปุ่มสร้างห้องเดิม: ปิดห้องที่เปิดค้างของครูคนนี้ก่อน) คืน [sessionId, pin] */
function live_open_room(int $examId, string $title, int $minutes): array
{
    $pdo = lms_pdo();
    live_ensure($pdo);
    $u = lms_user();
    $title = mb_substr(trim($title) !== '' ? trim($title) : 'ห้องเรียนสด', 0, 300);
    $pin = generateSessionPin($pdo);
    closeOtherActiveSessions($pdo, $u['id']);
    $sid = 'ses-' . time() . '-' . random_int(1000, 9999);
    $arch = getBossArchetype('dragon');
    $pdo->prepare("INSERT INTO classroom_sessions (id, teacher_id, title, session_pin, exam_id, status, allow_late_join, has_time_limit, time_limit_minutes, education_stage, boss_name, boss_theme, boss_current_hp, boss_max_hp, boss_reward_points)
        VALUES (?, ?, ?, ?, ?, 'active', 1, ?, ?, 'university', ?, ?, 100, 100, 50)")
        ->execute([$sid, $u['id'], $title, $pin, $examId, $minutes > 0 ? 1 : 0, $minutes > 0 ? $minutes : null, $arch['name'], $arch['id']]);
    return [$sid, $pin];
}

/* ---------------- ให้ AI ร่างโจทย์สด (Pulse) ---------------- */

/**
 * ใช้ตัวสร้างข้อสอบของ teacher-ai (exam_ai_part พร้อมตัวตรวจ) สร้าง 1 ข้อเลือกตอบ
 * @return array{question:string, options:string[], correctIndex:int, explain:string, level:int}
 */
function live_ai_pulse_draft(string $topic, int $level, string $grade, string $subject, string $hint, string $kind = 'tf', ?string $textProvider = null): array
{
    $topic = mb_substr(trim($topic), 0, 300);
    if ($topic === '') {
        throw new ApiException('กรุณาระบุหัวข้อหรือเรื่องที่จะถาม', 400, 'NO_TOPIC');
    }
    $part = $kind === 'tf' ? 'tf' : 'mc';
    $level = max(1, min(4, $level));
    $ctx = [
        'grade' => mb_substr(trim($grade) ?: 'ทุกระดับ', 0, 20), 'subject' => mb_substr(trim($subject) ?: 'ทั่วไป', 0, 80),
        'kind' => 'ถามสั้นกลางคาบเรียน', 'scope' => $topic, 'hint' => mb_substr(trim($hint), 0, 300), 'indText' => [], 'avoid' => [],
    ];
    $provider = resolve_provider('text', $textProvider);
    require_provider($provider);
    check_quota(1);
    [$items, $w] = exam_ai_part($provider, $part, [['indicator' => '', 'level' => $level]], $ctx);
    $it = $items[0] ?? null;
    if (!$it) {
        throw new ApiException('AI สร้างโจทย์ไม่สำเร็จ ลองอีกครั้ง' . ($w ? ' (' . $w[0] . ')' : ''), 502, 'EMPTY_ITEM');
    }
    if ($part === 'tf') {
        return ['question' => (string) $it['statement'], 'options' => ['ถูก', 'ผิด'], 'correctIndex' => $it['answer'] ? 0 : 1, 'explain' => '', 'level' => $level, 'warnings' => $w];
    }
    return ['question' => (string) $it['question'], 'options' => array_values(array_map('strval', $it['choices'])), 'correctIndex' => (int) $it['answerIndex'], 'explain' => (string) ($it['explain'] ?? ''), 'level' => $level, 'warnings' => $w];
}
