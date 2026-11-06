<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/core/core.php';
require_once __DIR__ . '/../src/lms/live.php';

/**
 * ให้หน้า "แบบทดสอบ" (tests.php) ของ nextbeyond ดึงข้อสอบจาก teacher-ai (ใช้ได้เมื่อฝังใน nextbeyond เท่านั้น)
 *   list   {}          → { items:[{id,title,grade,subject,items,questions,imported:examId|null}] }
 *   import { id }      → { examId, questions, notes[], reused }   สร้างเป็นข้อสอบฉบับร่างใน exams (ยังไม่เผยแพร่ เผยแพร่ได้ที่หน้า tests.php)
 */
try {
    $b = api_guard();
    $action = (string) ($b['action'] ?? '');
    if (!lms_ready()) {
        json_out(['error' => 'ฟังก์ชันนี้ใช้ได้เมื่อเปิดผ่าน nextbeyond เท่านั้น', 'code' => 'NOT_EMBEDDED'], 400);
    }
    if ($action === 'list') {
        $out = [];
        foreach (exam_list() as $e) {
            $doc = exam_read($e['id']);
            if (!$doc) {
                continue;
            }
            [$qs] = lms_exam_questions($doc, true);
            $mc = count(array_filter($qs, fn($q) => ($q['question_type'] ?? '') === 'multipleChoice'));
            $out[] = $e + ['questions' => $mc, 'imported' => !empty($doc['lms']['testsExam']['examId']) ? (int) $doc['lms']['testsExam']['examId'] : null];
        }
        json_out(['items' => $out]);
    }
    if ($action === 'import') {
        $id = (string) ($b['id'] ?? '');
        $doc = exam_id_ok($id) ? exam_read($id) : null;
        if (!$doc) {
            json_out(['error' => 'ไม่พบข้อสอบนี้ใน teacher-ai'], 404);
        }
        [$eid, $count, $notes, $reused] = live_publish_exam_row($doc, (int) ($doc['minutes'] ?? 0), 'testsExam', '', 'draft');
        if (!$reused) {
            exam_write($id, $doc);
        }
        json_out(['examId' => $eid, 'questions' => $count, 'notes' => $notes, 'reused' => $reused]);
    }
    json_out(['error' => 'action ไม่ถูกต้อง'], 400);
} catch (Throwable $e) {
    json_error($e);
}
