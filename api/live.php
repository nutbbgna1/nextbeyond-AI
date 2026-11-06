<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/core/core.php';
require_once __DIR__ . '/../src/lms/live.php';
require_once __DIR__ . '/../src/planning/exam.php';

/**
 * เชื่อมห้องสด (ใช้ได้เมื่อฝังใน nextbeyond เท่านั้น)
 *   sessions {}                                   → { sessions:[{id,title,pin,students}] }  ห้องสดที่เปิดอยู่ของครู
 *   pulse_preview { bankId }                      → { ok, pulse?, notes[] }
 *   room_preview { examId }                       → { title, questions, total, notes[], active:[ห้องที่เปิดอยู่ (จะถูกปิดเมื่อเปิดห้องใหม่)] }
 *   room_open { examId, title?, minutes? }        → { sessionId, pin, questions, notes[] }
 *   pulse_draft { topic, level?, grade?, subject?, hint?, kind?:mc|tf } → { draft:{question,options[],correctIndex,explain,level} }  ให้ AI ร่างโจทย์สด 1 ข้อ (ยังไม่ยิง ครูตรวจก่อน)
 *   pulse_push { bankId, sessionId, seconds? }    → { ok, questionId, expiresAt }
 */
try {
    $b = api_guard();
    $action = (string) ($b['action'] ?? '');
    if (!lms_ready()) {
        json_out(['error' => 'ฟังก์ชันนี้ใช้ได้เมื่อเปิดผ่าน nextbeyond เท่านั้น', 'code' => 'NOT_EMBEDDED'], 400);
    }
    if ($action === 'sessions') {
        json_out(['sessions' => live_sessions()]);
    }
    if ($action === 'room_preview' || $action === 'room_open') {
        $eid = (string) ($b['examId'] ?? '');
        $exam = exam_id_ok($eid) ? exam_read($eid) : null;
        if (!$exam) {
            json_out(['error' => 'ไม่พบข้อสอบนี้ในคลัง'], 404);
        }
        if ($action === 'room_preview') {
            [$qs, $notes, $total] = lms_exam_questions($exam, true);
            $mc = count(array_filter($qs, fn($q) => ($q['question_type'] ?? '') === 'multipleChoice'));
            json_out(['title' => (string) ($exam['title'] ?? ''), 'questions' => $mc, 'total' => $total, 'minutes' => (int) ($exam['minutes'] ?? 0), 'notes' => $notes, 'active' => live_sessions()]);
        }
        $minutes = max(0, min(300, (int) ($b['minutes'] ?? ($exam['minutes'] ?? 0))));
        [$examRowId, $count, $notes] = live_publish_exam_row($exam, $minutes);
        exam_write($eid, $exam);
        [$sid, $pin] = live_open_room($examRowId, trim((string) ($b['title'] ?? '')) ?: (string) ($exam['title'] ?? ''), $minutes);
        json_out(['sessionId' => $sid, 'pin' => $pin, 'questions' => $count, 'notes' => $notes]);
    }
    if ($action === 'pulse_draft') {
        json_out(['draft' => live_ai_pulse_draft((string) ($b['topic'] ?? ''), (int) ($b['level'] ?? 2), (string) ($b['grade'] ?? ''), (string) ($b['subject'] ?? ''), (string) ($b['hint'] ?? ''), (string) ($b['kind'] ?? 'mc'), isset($b['textProvider']) ? (string) $b['textProvider'] : null)]);
    }
    if ($action === 'pulse_preview' || $action === 'pulse_push') {
        [$pulse, $notes] = live_pulse_from_bank((string) ($b['bankId'] ?? ''));
        if ($action === 'pulse_preview') {
            json_out(['ok' => $pulse !== null, 'pulse' => $pulse, 'notes' => $notes]);
        }
        if (!$pulse) {
            json_out(['error' => $notes[0] ?? 'ยิงข้อนี้ไม่ได้'], 422);
        }
        [$qid, $exp] = live_push((string) ($b['sessionId'] ?? ''), $pulse, isset($b['seconds']) ? (int) $b['seconds'] : null);
        json_out(['ok' => true, 'questionId' => $qid, 'expiresAt' => $exp]);
    }
    json_out(['error' => 'action ไม่ถูกต้อง'], 400);
} catch (Throwable $e) {
    json_error($e);
}
