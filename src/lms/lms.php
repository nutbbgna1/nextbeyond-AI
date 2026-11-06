<?php
declare(strict_types=1);

require_once __DIR__ . '/../core/core.php';
require_once __DIR__ . '/../core/store.php';

/* ------------------------------------------------------------------ */
/*  เชื่อมกับ LMS ของ nextbeyond (ใช้เฉพาะตอนฝังใน nextbeyond/admin/teacher-ai)   */
/*   - แปลงใบงานของ teacher-ai → worksheets / worksheet_questions            */
/*   - "ยิง" เข้าคอร์ส / กลุ่มเรียน / นักเรียนรายคน ด้วยระบบมอบหมายเดิม         */
/*     (Phase3MasteryService::createAssignment → worksheet_assignments)       */
/*  ข้อมูลต้นฉบับยังอยู่ในคลังของ teacher-ai เสมอ (ta_files) LMS ได้สำเนา      */
/* ------------------------------------------------------------------ */

const LMS_DIFF = [1 => 'easy', 2 => 'medium', 3 => 'hard', 4 => 'expert'];

function lms_ready(): bool
{
    return defined('HOST_EMBEDDED') && isset($GLOBALS['pdo']) && $GLOBALS['pdo'] instanceof PDO;
}

function lms_pdo(): PDO
{
    if (!lms_ready()) {
        throw new ApiException('ฟังก์ชันนี้ใช้ได้เมื่อฝังอยู่ใน nextbeyond เท่านั้น', 400, 'NOT_EMBEDDED');
    }
    return $GLOBALS['pdo'];
}

/** รากของ nextbeyond บนดิสก์ (…/nextbeyond) จาก …/nextbeyond/admin/teacher-ai/src/lms */
function lms_root(): string
{
    return dirname(__DIR__, 4);
}

/** path เว็บของ nextbeyond เช่น /nextbeyond (หาจาก URL ปัจจุบัน …/admin/teacher-ai/api/x.php) */
function lms_web_root(): string
{
    $p = (string) ($_SERVER['SCRIPT_NAME'] ?? '');
    $i = strpos($p, '/admin/teacher-ai/');
    return $i === false ? '' : substr($p, 0, $i);
}

function lms_table_exists(PDO $pdo, string $t): bool
{
    try {
        $pdo->query('SELECT 1 FROM `' . str_replace('`', '', $t) . '` LIMIT 1');
        return true;
    } catch (Throwable $e) {
        return false;
    }
}

function lms_user(): array
{
    $u = (array) ($GLOBALS['consoleUser'] ?? []);
    $name = trim(((string) ($u['first_name'] ?? '')) . ' ' . ((string) ($u['last_name'] ?? '')));
    return ['id' => (int) ($u['id'] ?? TA_OWNER_ID), 'name' => $name !== '' ? $name : 'ครูผู้สอน'];
}

/* ---------------- เป้าหมาย: คอร์ส / กลุ่มเรียน / นักเรียน ---------------- */

function lms_courses(): array
{
    $pdo = lms_pdo();
    $u = lms_user();
    $admin = defined('TA_IS_ADMIN') && TA_IS_ADMIN;
    $sql = "SELECT c.id, c.title, c.subject, c.level, c.teacher_id FROM courses c WHERE c.status = 'active'";
    $params = [];
    if (!$admin) { // ครูเห็นเฉพาะคอร์สของตัวเอง
        $sql .= ' AND c.teacher_id = :t';
        $params[':t'] = $u['id'];
    }
    $sql .= ' ORDER BY c.title';
    $st = $pdo->prepare($sql);
    $st->execute($params);
    $courses = $st->fetchAll(PDO::FETCH_ASSOC);
    $groups = [];
    if ($courses && lms_table_exists($pdo, 'class_groups')) {
        $g = $pdo->query("SELECT id, name, course_id FROM class_groups WHERE status = 'active' ORDER BY name")->fetchAll(PDO::FETCH_ASSOC);
        foreach ($g as $r) {
            $groups[(int) $r['course_id']][] = ['id' => (int) $r['id'], 'name' => (string) $r['name']];
        }
    }
    return array_map(fn($c) => [
        'id'      => (int) $c['id'],
        'title'   => (string) $c['title'],
        'subject' => (string) ($c['subject'] ?? ''),
        'level'   => (string) ($c['level'] ?? ''),
        'groups'  => $groups[(int) $c['id']] ?? [],
    ], $courses);
}

/** ครูต้องมีสิทธิ์กับคอร์สนั้น (แอดมินได้ทุกคอร์ส) */
function lms_course_allowed(int $courseId): bool
{
    if (defined('TA_IS_ADMIN') && TA_IS_ADMIN) {
        return true;
    }
    $st = lms_pdo()->prepare('SELECT teacher_id FROM courses WHERE id = ?');
    $st->execute([$courseId]);
    $t = $st->fetchColumn();
    return $t !== false && (int) $t === lms_user()['id'];
}

function lms_students(int $courseId, int $groupId = 0): array
{
    $pdo = lms_pdo();
    $sql = "SELECT u.id, u.first_name, u.last_name, u.nickname, u.grade
            FROM enrollments e
            JOIN users u ON u.id = e.user_id AND u.role = 'student' AND (u.is_active IS NULL OR u.is_active = 1)
            WHERE e.status IN ('active','trial') AND (e.end_date IS NULL OR e.end_date >= CURDATE())";
    $params = [];
    if ($groupId > 0) {
        $sql .= ' AND e.class_group_id = :g';
        $params[':g'] = $groupId;
    } else {
        $sql .= ' AND e.course_id = :c';
        $params[':c'] = $courseId;
    }
    $sql .= ' GROUP BY u.id ORDER BY u.first_name, u.last_name';
    $st = $pdo->prepare($sql);
    $st->execute($params);
    return array_map(fn($r) => [
        'id'    => (int) $r['id'],
        'name'  => trim($r['first_name'] . ' ' . $r['last_name']) . ($r['nickname'] ? " ({$r['nickname']})" : ''),
        'grade' => (string) ($r['grade'] ?? ''),
    ], $st->fetchAll(PDO::FETCH_ASSOC));
}

/* ---------------- แปลงใบงาน → โจทย์ของ LMS ---------------- */

function lms_num_str(float $v): string
{
    return rtrim(rtrim(number_format($v, 6, '.', ''), '0'), '.');
}

/** ตัวเลือกของข้อ "เลือกข้อความที่ถูก": คำตอบจริง + ตัวลวง 3 แบบ (เรียงตามลำดับเลข) */
function lms_multi_options(int $n, array $correct): array
{
    sort($correct);
    $label = fn(array $s) => count($s) === 1 ? 'ข้อ ' . $s[0] . ' เท่านั้น' : 'ข้อ ' . implode(' และ ', $s) . (count($s) === $n ? ' (ถูกทุกข้อ)' : '');
    $cands = [];
    $all = range(1, $n);
    for ($mask = 1; $mask < (1 << $n); $mask++) {
        $s = [];
        foreach ($all as $i) {
            if ($mask & (1 << ($i - 1))) {
                $s[] = $i;
            }
        }
        $cands[] = $s;
    }
    $dist = function (array $a, array $b): int { // จำนวนข้อที่ต่างกัน (ยิ่งน้อยยิ่งใกล้เคียง = ตัวลวงดี)
        return count(array_merge(array_diff($a, $b), array_diff($b, $a)));
    };
    $others = array_values(array_filter($cands, fn($s) => $s !== $correct));
    usort($others, fn($x, $y) => [$dist($x, $correct), count($x), $x] <=> [$dist($y, $correct), count($y), $y]);
    $pick = array_slice($others, 0, 3);
    $opts = array_merge([$correct], $pick);
    usort($opts, fn($x, $y) => [count($x), $x] <=> [count($y), $y]);
    $texts = array_map($label, $opts);
    return [$texts, $label($correct)];
}

function lms_image_for(string $prompt, array $images, array &$notes): ?string
{
    $key = mb_strtolower(trim($prompt));
    $id = (string) ($images[$key] ?? '');
    if ($id === '' || !preg_match('/^[a-f0-9]{40}$/', $id)) {
        return null;
    }
    foreach (['jpg', 'png'] as $ext) {
        $bin = store_get('images', "{$id}.{$ext}");
        if ($bin === null) {
            continue;
        }
        $dir = lms_root() . '/assets/uploads/teacher-ai';
        if (!is_dir($dir) && !@mkdir($dir, 0755, true) && !is_dir($dir)) {
            $notes[] = 'สร้างโฟลเดอร์ assets/uploads/teacher-ai ไม่ได้ ข้อที่มีรูปจะไม่แสดงรูปในฝั่งนักเรียน';
            return null;
        }
        $file = "{$dir}/{$id}.{$ext}";
        if (!is_file($file) && @file_put_contents($file, $bin) === false) {
            $notes[] = 'เขียนไฟล์รูปไม่ได้ ตรวจสิทธิ์โฟลเดอร์ assets/uploads/teacher-ai';
            return null;
        }
        @chmod($file, 0644);
        return lms_web_root() . "/assets/uploads/teacher-ai/{$id}.{$ext}";
    }
    return null;
}

/**
 * แปลง 1 ใบงาน (sheet) เป็นรายการโจทย์ของ worksheet_questions
 * คืน [questions[], notes[]]  ข้อที่ LMS แสดงไม่ได้ (ต้องมีกราฟ/รูปวาดด้วยโค้ด, เรียงลำดับ ฯลฯ) จะถูกข้ามและบอกใน notes
 */
function lms_sheet_to_questions(array $sheet, array $images, string $subjectHint = '', bool $dry = false): array
{
    $type = (string) ($sheet['type'] ?? '');
    $items = array_values(array_filter((array) ($sheet['items'] ?? []), 'is_array'));
    $notes = [];
    $skipped = 0;
    $q = [];
    $topic = trim((string) ($sheet['topic'] ?? ''));
    $base = function (array $it, string $text, string $qtype, ?array $opts, string $correct, string $explain = '', string $hint = '') use ($images, &$notes, $topic, $dry): array {
        $lv = (int) ($it['level'] ?? 0);
        $img = !$dry && !empty($it['imagePrompt']) ? lms_image_for((string) $it['imagePrompt'], $images, $notes) : null;
        $skill = trim((string) ($it['indicator'] ?? '')) ?: $topic;
        return [
            'question_type'      => $qtype,
            'question_text'      => $text,
            'options'            => $opts === null ? null : json_encode(array_values($opts), JSON_UNESCAPED_UNICODE),
            'correct_answer'     => $correct,
            'explanation'        => $explain,
            'hint'               => $hint,
            'skill'              => mb_substr($skill, 0, 100),
            'difficulty'         => LMS_DIFF[$lv] ?? 'medium',
            'learning_objective' => '',
            'image_url'          => $img,
            'points'             => 1,
        ];
    };
    $mc = function (array $it, string $prefix = '') use ($base): ?array {
        $ch = array_values(array_map('strval', (array) ($it['choices'] ?? [])));
        $a = $it['answerIndex'] ?? null;
        if (count($ch) < 2 || !is_int($a) || !isset($ch[$a])) {
            return null;
        }
        return $base($it, $prefix . (string) ($it['question'] ?? ''), 'multipleChoice', $ch, $ch[$a], (string) ($it['explain'] ?? ''));
    };
    $calc = function (array $it) use ($base): ?array {
        $text = trim((string) ($it['question'] ?? ''));
        $ans = trim((string) ($it['answer'] ?? ''));
        if ($text === '' || $ans === '') {
            return null;
        }
        $val = $it['answerValue'] ?? null;
        $correct = $ans;
        if (is_numeric($val) && (float) $val != 0.0 && trim((string) ($it['checkExpr'] ?? '')) !== '') {
            $correct = lms_num_str((float) $val);
            $text .= "\n(ตอบเป็นตัวเลขเท่านั้น ไม่ต้องใส่หน่วย)";
        }
        $sol = array_filter(array_map('strval', (array) ($it['solution'] ?? [])), fn($s) => trim($s) !== '');
        return $base($it, $text, 'shortAnswer', null, $correct, $sol ? implode("\n", $sol) : '');
    };

    switch ($type) {
        case 'multiple_choice':
            foreach ($items as $it) {
                if (!empty($it['figure'])) { $skipped++; continue; }
                ($r = $mc($it)) ? $q[] = $r : $skipped++;
            }
            break;
        case 'data_set':
            $stim = trim((string) ($sheet['stimulus'] ?? ''));
            if (!empty($sheet['stimulusFigure'])) {
                $notes[] = 'ใบนี้อ้างอิงกราฟ/ตารางที่วาดด้วยโค้ด ซึ่ง LMS ยังแสดงไม่ได้ ข้อมูลที่เป็นข้อความถูกใส่ไว้ในโจทย์แล้ว กรุณาตรวจก่อนมอบหมาย';
            }
            foreach ($items as $it) {
                ($r = $mc($it, $stim !== '' ? $stim . "\n\n" : '')) ? $q[] = $r : $skipped++;
            }
            break;
        case 'true_false':
            foreach ($items as $it) {
                $s = trim((string) ($it['statement'] ?? ''));
                if ($s === '' || !is_bool($it['answer'] ?? null)) { $skipped++; continue; }
                $q[] = $base($it, $s, 'multipleChoice', ['ถูก', 'ผิด'], $it['answer'] ? 'ถูก' : 'ผิด');
            }
            break;
        case 'multi_statement':
            foreach ($items as $it) {
                $st = array_values(array_map('strval', (array) ($it['statements'] ?? [])));
                $c = array_values(array_unique(array_map('intval', (array) ($it['correct'] ?? []))));
                if (count($st) < 3 || !$c || !empty($it['figure'])) { $skipped++; continue; }
                $text = trim((string) ($it['question'] ?? ''));
                foreach ($st as $i => $s) {
                    $text .= "\n" . ($i + 1) . '. ' . $s;
                }
                [$opts, $right] = lms_multi_options(count($st), $c);
                $q[] = $base($it, $text, 'multipleChoice', $opts, $right, (string) ($it['explain'] ?? ''));
            }
            break;
        case 'fill_blank':
            foreach ($items as $it) {
                $t = trim((string) ($it['text'] ?? ''));
                $a = trim((string) ($it['answer'] ?? ''));
                if ($t === '' || $a === '') { $skipped++; continue; }
                $q[] = $base($it, $t, 'shortAnswer', null, $a);
            }
            break;
        case 'short_answer':
            foreach ($items as $it) {
                $t = trim((string) ($it['question'] ?? ''));
                $a = trim((string) ($it['answer'] ?? ''));
                if ($t === '' || $a === '' || !empty($it['figure'])) { $skipped++; continue; }
                $q[] = $base($it, $t, 'shortAnswer', null, $a);
            }
            break;
        case 'calculation':
            foreach ($items as $it) {
                if (!empty($it['figure'])) { $skipped++; continue; }
                ($r = $calc($it)) ? $q[] = $r : $skipped++;
            }
            break;
        case 'matching':
            $rights = array_values(array_unique(array_map(fn($i) => trim((string) ($i['right'] ?? '')), $items)));
            foreach ($items as $it) {
                $l = trim((string) ($it['left'] ?? ''));
                $r = trim((string) ($it['right'] ?? ''));
                if ($l === '' || $r === '') { $skipped++; continue; }
                $q[] = $base($it, 'จับคู่: ' . $l, 'multipleChoice', $rights, $r);
            }
            break;
        case 'ordering':
            $n = count($items);
            $sorted = $items;
            usort($sorted, fn($a, $b) => ((int) ($a['order'] ?? 0)) <=> ((int) ($b['order'] ?? 0)));
            $seq = implode(' → ', array_map(fn($i) => trim((string) ($i['label'] ?? '')), $sorted));
            $opts = array_map('strval', range(1, max(2, $n)));
            foreach ($items as $it) {
                $o = $it['order'] ?? null;
                if (!is_int($o) || $o < 1 || $o > $n) { $skipped++; continue; }
                $q[] = $base($it, 'ขั้นตอน "' . trim((string) ($it['label'] ?? '')) . '" อยู่ลำดับที่เท่าใด (จากทั้งหมด ' . $n . ' ขั้นตอน)', 'multipleChoice', $opts, (string) $o, 'ลำดับที่ถูกต้อง: ' . $seq);
            }
            break;
        case 'exam':
            foreach ((array) ($sheet['mcItems'] ?? []) as $it) {
                if (is_array($it) && empty($it['figure']) && ($r = $mc($it))) { $q[] = $r; } else { $skipped++; }
            }
            foreach ((array) ($sheet['writtenItems'] ?? []) as $it) {
                if (is_array($it) && empty($it['figure']) && ($r = $calc($it))) { $q[] = $r; } else { $skipped++; }
            }
            break;
        default:
            $notes[] = 'ไม่รู้จักรูปแบบใบงาน: ' . $type;
    }
    if ($skipped > 0) {
        $notes[] = "ข้าม {$skipped} ข้อที่ LMS แสดงไม่ได้ (มีกราฟ/รูปวาดด้วยโค้ด หรือข้อมูลไม่ครบ)";
    }
    return [$q, array_values(array_unique($notes))];
}

/* ---------------- เผยแพร่ใบงานเข้า LMS ---------------- */

function lms_level_name(string $grade): string
{
    return mb_substr(trim($grade) !== '' ? trim($grade) : 'ทุกระดับ', 0, 50);
}

/**
 * สร้าง (หรือใช้ของเดิมถ้าเนื้อหาเหมือนเดิม) worksheets 1 แถวต่อ 1 ใบงาน คืนข้อมูลที่เผยแพร่
 * @param array $doc ชุดจากคลังของ teacher-ai (saved doc)
 * @param array $pick ลำดับใบ (index ใน $doc['sheets']) ที่จะเผยแพร่
 */
function lms_publish_worksheets(array &$doc, array $pick): array
{
    $pdo = lms_pdo();
    foreach (['worksheets', 'worksheet_questions'] as $t) {
        if (!lms_table_exists($pdo, $t)) {
            throw new ApiException("ยังไม่มีตาราง {$t} ในฐานข้อมูล เปิดหน้าคลังใบงานของ nextbeyond หนึ่งครั้งก่อนเพื่อสร้างตาราง", 400, 'NO_TABLE');
        }
    }
    lms_ensure_schema($pdo); // เตรียมคอลัมน์ของ LMS (phase 3/4) ก่อนเขียนข้อมูล เหมือนที่หน้าคลังใบงานเดิมทำ
    $u = lms_user();
    $meta = (array) ($doc['meta'] ?? []);
    $images = (array) ($doc['images'] ?? []);
    $grade = (string) ($meta['grade'] ?? '');
    $subject = (string) ($meta['subject'] ?? '');
    $sheets = array_values((array) ($doc['sheets'] ?? []));
    $lms = (array) ($doc['lms'] ?? []);
    $out = [];

    foreach ($pick as $i) {
        $i = (int) $i;
        $s = $sheets[$i] ?? null;
        if (!is_array($s) || ($s['status'] ?? '') !== 'done' || !is_array($s['sheet'] ?? null)) {
            continue;
        }
        $sheet = $s['sheet'];
        [$qs, $notes] = lms_sheet_to_questions($sheet, $images, $subject);
        if (!$qs) {
            $out[] = ['index' => $i, 'ok' => false, 'error' => 'ไม่มีข้อที่ส่งเข้า LMS ได้', 'notes' => $notes];
            continue;
        }
        $hash = sha1(json_encode($qs, JSON_UNESCAPED_UNICODE));
        $prev = (array) ($lms['sheets'][(string) $i] ?? []);
        $title = mb_substr(trim((string) ($doc['title'] ?? 'ชุดใบงาน')) . ' — ใบที่ ' . ($i + 1) . ': ' . trim((string) ($sheet['topic'] ?? '')), 0, 250);

        $wid = 0;
        $reused = false;
        if (!empty($prev['worksheetId']) && ($prev['hash'] ?? '') === $hash) {
            $chk = $pdo->prepare('SELECT id FROM worksheets WHERE id = ? AND status <> ?');
            $chk->execute([(int) $prev['worksheetId'], 'archived']);
            if ($chk->fetchColumn()) {
                $wid = (int) $prev['worksheetId'];
                $reused = true;
            }
        }
        if (!$wid) {
            $wid = lms_insert_worksheet($pdo, $u, $title, (string) ($sheet['instruction'] ?? ''), $subject, $grade, (string) ($sheet['topic'] ?? ''), $qs, ['teacher-ai']);
        }
        $lms['sheets'][(string) $i] = ['worksheetId' => $wid, 'hash' => $hash, 'at' => date('c'), 'count' => count($qs)];
        $out[] = ['index' => $i, 'ok' => true, 'worksheetId' => $wid, 'title' => $title, 'count' => count($qs), 'reused' => $reused, 'notes' => $notes];
    }
    $doc['lms'] = $lms;
    return $out;
}

/** เขียน worksheets 1 แถว + worksheet_questions แล้วส่งโจทย์เข้า Question Bank คืนรหัสใบงาน */
function lms_insert_worksheet(PDO $pdo, array $u, string $title, string $desc, string $subject, string $grade, string $topic, array $qs, array $tags): int
{
    $pdo->beginTransaction();
    try {
        $ins = $pdo->prepare('INSERT INTO worksheets (title, description, subject, level, chapter, topic, subtopic, worksheet_type, difficulty, question_count, generation_source, creator_id, creator_name, tags, folder_id, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)');
        $ins->execute([
            mb_substr($title, 0, 250), mb_substr($desc, 0, 1000), mb_substr($subject !== '' ? $subject : 'ทั่วไป', 0, 100), lms_level_name($grade),
            null, mb_substr($topic, 0, 150), null, 'Worksheet', 'medium', count($qs), 'ai',
            $u['id'], mb_substr($u['name'], 0, 150), json_encode($tags, JSON_UNESCAPED_UNICODE), 'published',
        ]);
        $wid = (int) $pdo->lastInsertId();
        $qi = $pdo->prepare('INSERT INTO worksheet_questions (worksheet_id, sort_order, question_type, question_text, options, correct_answer, explanation, hint, skill, difficulty, learning_objective, image_url, points)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        foreach ($qs as $n => $q) {
            $qi->execute([$wid, $n + 1, $q['question_type'], $q['question_text'], $q['options'], $q['correct_answer'], $q['explanation'] ?: null, $q['hint'] ?: null,
                $q['skill'] ?: null, $q['difficulty'], $q['learning_objective'] ?: null, $q['image_url'], $q['points']]);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
    lms_sync_bank($pdo, $wid);
    return $wid;
}

/** ข้อสอบ (exam doc) → โจทย์ LMS: ปรนัย ถูก/ผิด จับคู่ ส่งได้ ส่วนอัตนัยตรวจอัตโนมัติไม่ได้จึงข้าม */
function lms_exam_questions(array $doc, bool $dry = false): array
{
    $map = ['mc' => 'multiple_choice', 'tf' => 'true_false', 'match' => 'matching'];
    $q = [];
    $notes = [];
    $total = 0;
    foreach ($map as $part => $type) {
        $items = array_values(array_filter((array) ($doc['parts'][$part]['items'] ?? []), 'is_array'));
        $total += count($items);
        if (!$items) {
            continue;
        }
        [$qs, $n] = lms_sheet_to_questions(['type' => $type, 'topic' => (string) ($doc['title'] ?? ''), 'items' => $items], [], (string) ($doc['subject'] ?? ''), true);
        $q = array_merge($q, $qs);
        $notes = array_merge($notes, $n);
    }
    $written = count((array) ($doc['parts']['written']['items'] ?? []));
    if ($written > 0) {
        $notes[] = "ข้ามส่วนอัตนัย {$written} ข้อ (ระบบออนไลน์ตรวจอัตโนมัติไม่ได้ ใช้พิมพ์สอบตามปกติ)";
    }
    if ((int) ($doc['versions'] ?? 1) > 1) {
        $notes[] = 'ส่งเฉพาะชุดต้นฉบับ (ไม่สลับข้อ) ระบบ LMS ไม่มีชุดสลับข้อ';
    }
    return [$q, array_values(array_unique($notes)), $total + $written];
}

/** เผยแพร่ข้อสอบเป็นชุดข้อสอบใน LMS (worksheets 1 แถว) ใช้ของเดิมถ้าเนื้อหาไม่เปลี่ยน */
function lms_publish_exam(array &$doc): array
{
    $pdo = lms_pdo();
    foreach (['worksheets', 'worksheet_questions'] as $t) {
        if (!lms_table_exists($pdo, $t)) {
            throw new ApiException("ยังไม่มีตาราง {$t} ในฐานข้อมูล เปิดหน้าคลังใบงานของ nextbeyond หนึ่งครั้งก่อนเพื่อสร้างตาราง", 400, 'NO_TABLE');
        }
    }
    lms_ensure_schema($pdo);
    [$qs, $notes] = lms_exam_questions($doc);
    if (!$qs) {
        return ['ok' => false, 'error' => 'ไม่มีข้อที่ส่งเข้า LMS ได้ (ต้องมีส่วนปรนัย ถูก/ผิด หรือจับคู่)', 'notes' => $notes];
    }
    $hash = sha1(json_encode($qs, JSON_UNESCAPED_UNICODE));
    $prev = (array) ($doc['lms']['exam'] ?? []);
    $title = mb_substr('ข้อสอบ: ' . trim((string) ($doc['title'] ?? 'ข้อสอบ')), 0, 250);
    if (!empty($prev['worksheetId']) && ($prev['hash'] ?? '') === $hash) {
        $chk = $pdo->prepare('SELECT id FROM worksheets WHERE id = ? AND status <> ?');
        $chk->execute([(int) $prev['worksheetId'], 'archived']);
        if ($chk->fetchColumn()) {
            return ['ok' => true, 'worksheetId' => (int) $prev['worksheetId'], 'title' => $title, 'count' => count($qs), 'reused' => true, 'notes' => $notes];
        }
    }
    $wid = lms_insert_worksheet($pdo, lms_user(), $title, trim((string) ($doc['kind'] ?? '')), (string) ($doc['subject'] ?? ''), (string) ($doc['grade'] ?? ''), (string) ($doc['title'] ?? ''), $qs, ['teacher-ai', 'exam']);
    $doc['lms'] = ['exam' => ['worksheetId' => $wid, 'hash' => $hash, 'at' => date('c'), 'count' => count($qs)]] + (array) ($doc['lms'] ?? []);
    return ['ok' => true, 'worksheetId' => $wid, 'title' => $title, 'count' => count($qs), 'reused' => false, 'notes' => $notes];
}

function lms_ensure_schema(PDO $pdo): void
{
    $f = lms_root() . '/includes/phase3-mastery-service.php';
    if (is_file($f)) {
        require_once $f;
        new Phase3MasteryService($pdo); // ensurePhase3Schema + ตาราง/คอลัมน์ที่เกี่ยวข้อง
    }
}

/** คอลัมน์ที่ Question Bank (phase 4) ใช้ผูกโจทย์ ถ้ายังไม่มีให้เพิ่ม */
function lms_add_canonical_columns(PDO $pdo): void
{
    foreach (['worksheet_questions', 'exam_questions'] as $tb) {
        if (lms_table_exists($pdo, $tb)
            && !$pdo->query("SHOW COLUMNS FROM `$tb` LIKE 'canonical_question_id'")->fetch()) {
            $pdo->exec("ALTER TABLE `$tb` ADD COLUMN canonical_question_id BIGINT UNSIGNED NULL");
        }
    }
}

/** ส่งโจทย์เข้า Question Bank ตามที่ LMS ทำกับใบงานทุกใบ (ไม่ให้ล้มทั้งงานถ้าส่วนนี้พัง) */
function lms_sync_bank(PDO $pdo, int $worksheetId): void
{
    try {
        lms_add_canonical_columns($pdo);
        $f = lms_root() . '/includes/phase4-adaptive-service.php';
        if (is_file($f)) {
            require_once $f;
            if (class_exists('\NextBeyond\Adaptive\CanonicalQuestionRepository')) {
                (new \NextBeyond\Adaptive\CanonicalQuestionRepository($pdo))->syncWorksheet($worksheetId);
            }
        }
    } catch (Throwable $e) {
        error_log('teacher-ai sync bank: ' . $e->getMessage());
    }
}

/* ---------------- มอบหมาย (ยิง) ---------------- */

/**
 * @param array $t [course_id, class_group_id, target_type all|selected, student_ids[], due_date, max_attempts, pass_score, activity_type]
 * @return array [assignmentId|null, message, duplicate(bool), skipped(int)]
 */
function lms_assign_worksheet(int $worksheetId, array $t): array
{
    $pdo = lms_pdo();
    $f = lms_root() . '/includes/phase3-mastery-service.php';
    if (!is_file($f)) {
        throw new ApiException('ไม่พบ includes/phase3-mastery-service.php ของ nextbeyond', 500, 'NO_P3');
    }
    require_once $f;
    $p3 = new Phase3MasteryService($pdo);
    $u = lms_user();

    $courseId = (int) ($t['course_id'] ?? 0) ?: null;
    $groupId = (int) ($t['class_group_id'] ?? 0) ?: null;
    $type = ($t['target_type'] ?? 'all') === 'selected' ? 'selected' : 'all';
    $ids = $type === 'selected' ? array_values(array_unique(array_filter(array_map('intval', (array) ($t['student_ids'] ?? []))))) : null;
    if (!$courseId && !$groupId) {
        throw new ApiException('กรุณาเลือกคอร์ส', 400, 'NO_COURSE');
    }
    if ($courseId && !lms_course_allowed($courseId)) {
        throw new ApiException('คุณไม่มีสิทธิ์มอบหมายงานให้คอร์สนี้', 403, 'FORBIDDEN');
    }
    if ($type === 'selected' && !$ids) {
        throw new ApiException('กรุณาเลือกนักเรียนอย่างน้อย 1 คน', 400, 'NO_STUDENT');
    }

    $skipped = 0;
    $st = $pdo->prepare("SELECT target_type, student_ids, course_id, class_group_id FROM worksheet_assignments WHERE worksheet_id = ? AND status = 'active'");
    $st->execute([$worksheetId]);
    $existing = $st->fetchAll(PDO::FETCH_ASSOC);
    if ($type === 'all') {
        foreach ($existing as $e) {
            if ($e['target_type'] === 'all' && (int) $e['course_id'] === (int) $courseId && (int) ($e['class_group_id'] ?? 0) === (int) $groupId) {
                return [null, 'คอร์ส/กลุ่มนี้ได้รับมอบหมายใบงานนี้อยู่แล้ว', true, 0];
            }
        }
    } else {
        $have = [];
        foreach ($existing as $e) {
            if ($e['target_type'] === 'selected') {
                $have = array_merge($have, array_map('intval', json_decode((string) $e['student_ids'], true) ?: []));
            }
        }
        $new = array_values(array_diff($ids, $have));
        $skipped = count($ids) - count($new);
        if (!$new) {
            return [null, 'นักเรียนที่เลือกทั้งหมดได้รับมอบหมายใบงานนี้แล้ว', true, $skipped];
        }
        $ids = $new;
    }

    $due = !empty($t['due_date']) ? date('Y-m-d H:i:s', strtotime((string) $t['due_date'])) : null;
    $aid = $p3->createAssignment([
        'worksheet_id'     => $worksheetId,
        'course_id'        => $courseId,
        'class_group_id'   => $groupId,
        'target_type'      => $type,
        'student_ids'      => $ids,
        'due_date'         => $due,
        'activity_type'    => in_array($t['activity_type'] ?? '', ['worksheet', 'practice', 'homework', 'posttest', 'mastery_check'], true) ? $t['activity_type'] : 'worksheet',
        'max_attempts'     => max(1, min(20, (int) ($t['max_attempts'] ?? 1))),
        'pass_score'       => isset($t['pass_score']) && $t['pass_score'] !== '' ? max(0, min(100, (float) $t['pass_score'])) : 60.0,
        'assigned_by'      => $u['id'],
        'assigned_by_name' => $u['name'],
    ]);
    $pdo->prepare('UPDATE worksheets SET usage_count = usage_count + 1 WHERE id = ?')->execute([$worksheetId]);
    $msg = $type === 'selected' ? 'มอบหมายแล้ว ' . count($ids) . ' คน' . ($skipped ? " (ข้าม {$skipped} คนที่ได้รับไปก่อนแล้ว)" : '') : 'มอบหมายให้ทั้งคอร์ส/กลุ่มแล้ว';
    return [$aid, $msg, false, $skipped];
}
